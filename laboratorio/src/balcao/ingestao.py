"""Ingestão: carregar documentos, partir em chunks, calcular embeddings e indexar.

Idempotente por construção (RF-07): cada documento tem um hash do conteúdo e
dos metadados; se o hash não mudou, não se faz nada; se mudou, os chunks do
documento são substituídos numa só operação. Correr a ingestão duas vezes
seguidas não duplica nada e não gasta uma única chamada de embeddings.

O chunking segue adr-0008: `RecursiveCharacterTextSplitter` que parte primeiro
por parágrafo, depois por linha, frase e palavra, e cada chunk herda os
metadados do documento (categoria, público, vigente, data) — é isso que permite
filtrar na base de dados em vez de pedir ao modelo para ignorar (adr-0010).

Uso: `python -m balcao.ingestao [--pasta documentos/]`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal, Protocol

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from balcao.config import Configuracao, obter_config
from balcao.corpus import DOCUMENTOS

__all__ = [
    "DocumentoFonte",
    "RelatorioIngestao",
    "carregar_corpus",
    "carregar_markdown",
    "ingerir",
    "main",
    "partir",
]

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class DocumentoFonte:
    """Um documento da base de conhecimento, antes de ser partido."""

    id: str
    titulo: str
    categoria: str
    publico: Literal["cliente", "interno"]
    vigente: bool
    actualizado: str
    texto: str
    fonte: str = "corpus"

    @property
    def hash(self) -> str:
        """SHA-256 do conteúdo e dos metadados que afectam a pesquisa.

        Mudar `vigente` de true para false também muda o hash: retirar uma
        política é uma alteração, não um no-op.
        """
        chave = json.dumps(
            [self.titulo, self.categoria, self.publico, self.vigente, self.actualizado, self.texto],
            ensure_ascii=False,
        )
        return hashlib.sha256(chave.encode("utf-8")).hexdigest()

    def metadados(self) -> dict[str, object]:
        return {
            "documento_id": self.id,
            "titulo": self.titulo,
            "categoria": self.categoria,
            "publico": self.publico,
            "vigente": self.vigente,
            "actualizado": self.actualizado,
            "fonte": self.fonte,
        }


@dataclass
class RelatorioIngestao:
    novos: list[str] = field(default_factory=list)
    actualizados: list[str] = field(default_factory=list)
    inalterados: list[str] = field(default_factory=list)
    chunks: int = 0

    def como_dict(self) -> dict[str, object]:
        return asdict(self)


# ------------------------------------------------------------------ carregar


def carregar_corpus() -> list[DocumentoFonte]:
    """Os 40 documentos da amostra (`balcao.corpus`)."""
    return [
        DocumentoFonte(
            id=d["id"],
            titulo=d["titulo"],
            categoria=d["categoria"],
            publico=d["publico"],
            vigente=bool(d["vigente"]),
            actualizado=d["actualizado"],
            texto=d["texto"],
            fonte="corpus",
        )
        for d in DOCUMENTOS
    ]


def _front_matter(texto: str) -> tuple[dict[str, str], str]:
    """Separa um cabeçalho `---\\nchave: valor\\n---` do corpo. Sem YAML completo de propósito."""
    if not texto.startswith("---\n"):
        return {}, texto
    fim = texto.find("\n---", 4)
    if fim < 0:
        return {}, texto
    cabecalho: dict[str, str] = {}
    for linha in texto[4:fim].splitlines():
        if ":" in linha:
            k, v = linha.split(":", 1)
            cabecalho[k.strip()] = v.strip().strip('"')
    return cabecalho, texto[fim + 4 :].lstrip("\n")


def carregar_markdown(pasta: Path) -> list[DocumentoFonte]:
    """Documentos Markdown com cabeçalho (`id`, `titulo`, `categoria`, `publico`, `vigente`, `actualizado`).

    Um ficheiro sem `id` ou sem `publico` é recusado: um documento sem dono nem
    público não entra no índice (RI-02 — ingestão só de fontes com dono).
    """
    docs: list[DocumentoFonte] = []
    for caminho in sorted(pasta.glob("**/*.md")):
        meta, corpo = _front_matter(caminho.read_text(encoding="utf-8"))
        if "id" not in meta or meta.get("publico") not in ("cliente", "interno"):
            log.warning("ignorado %s: falta `id` ou `publico` válido no cabeçalho", caminho)
            continue
        docs.append(
            DocumentoFonte(
                id=meta["id"],
                titulo=meta.get("titulo", meta["id"]),
                categoria=meta.get("categoria", "geral"),
                publico=meta["publico"],  # type: ignore[arg-type]
                vigente=meta.get("vigente", "true").lower() == "true",
                actualizado=meta.get("actualizado", ""),
                texto=corpo.strip(),
                fonte=str(caminho),
            )
        )
    return docs


# --------------------------------------------------------------------- partir


def criar_divisor(cfg: Configuracao) -> RecursiveCharacterTextSplitter:
    """Parágrafo, linha, frase, palavra — por esta ordem (adr-0008)."""
    return RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_caracteres,
        chunk_overlap=cfg.chunk_sobreposicao,
        separators=["\n\n", "\n", ". ", " ", ""],
        keep_separator="end",
        strip_whitespace=True,
    )


def partir(doc: DocumentoFonte, divisor: RecursiveCharacterTextSplitter, modelo_embedding: str) -> list[Document]:
    """Chunks de um documento, cada um com os metadados herdados e um id estável `doc#ordem`."""
    partes = divisor.split_text(doc.texto)
    out: list[Document] = []
    for ordem, texto in enumerate(partes):
        meta = {
            **doc.metadados(),
            "chunk_id": f"{doc.id}#{ordem}",
            "ordem": ordem,
            "hash_documento": doc.hash,
            "modelo_embedding": modelo_embedding,
        }
        out.append(Document(id=f"{doc.id}#{ordem}", page_content=texto, metadata=meta))
    return out


# -------------------------------------------------------------------- ingerir


class IndiceEscrita(Protocol):
    """O que a ingestão precisa de um índice (implementado em `balcao.recuperacao`)."""

    def hash_documento(self, doc_id: str) -> str | None: ...

    def substituir_documento(self, doc: DocumentoFonte, chunks: Sequence[Document]) -> None: ...


def ingerir(
    docs: Iterable[DocumentoFonte],
    indice: IndiceEscrita,
    cfg: Configuracao,
    modelo_embedding: str,
) -> RelatorioIngestao:
    """Indexa `docs` em `indice`, saltando os que não mudaram (hash igual)."""
    divisor = criar_divisor(cfg)
    rel = RelatorioIngestao()
    for doc in docs:
        anterior = indice.hash_documento(doc.id)
        if anterior == doc.hash:
            rel.inalterados.append(doc.id)
            continue
        chunks = partir(doc, divisor, modelo_embedding)
        indice.substituir_documento(doc, chunks)
        rel.chunks += len(chunks)
        (rel.novos if anterior is None else rel.actualizados).append(doc.id)
    log.info(
        "ingestão: %d novos, %d actualizados, %d inalterados, %d chunks",
        len(rel.novos),
        len(rel.actualizados),
        len(rel.inalterados),
        rel.chunks,
    )
    return rel


# ------------------------------------------------------------------------ CLI


def main(argv: Sequence[str] | None = None) -> int:
    """Ingere o corpus (e uma pasta de Markdown, se indicada) no índice configurado."""
    from balcao.modelos import criar_embeddings, nome_embeddings
    from balcao.recuperacao import criar_indice

    ap = argparse.ArgumentParser(prog="balcao-ingerir", description=__doc__.splitlines()[0] if __doc__ else None)
    ap.add_argument("--pasta", type=Path, help="pasta com documentos Markdown adicionais")
    ap.add_argument("--sem-corpus", action="store_true", help="não ingerir o corpus de amostra")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    cfg = obter_config()
    embeddings = criar_embeddings(cfg)
    indice = criar_indice(cfg, embeddings)
    docs: list[DocumentoFonte] = [] if args.sem_corpus else carregar_corpus()
    if args.pasta:
        docs += carregar_markdown(args.pasta)
    try:
        rel = ingerir(docs, indice, cfg, nome_embeddings(cfg))
    finally:
        fechar = getattr(indice, "fechar", None)
        if callable(fechar):
            fechar()
    print(json.dumps(rel.como_dict(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
