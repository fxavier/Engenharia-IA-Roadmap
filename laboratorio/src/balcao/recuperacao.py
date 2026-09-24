"""Recuperação híbrida: vectores + texto, fundidos com RRF e re-ordenados (adr-0009).

Dois índices com a mesma interface:

* `IndicePostgres` — produção e `docker compose`: HNSW do pgvector e `tsvector`
  do PostgreSQL, fundidos com Reciprocal Rank Fusion numa só consulta SQL
  (a função `pesquisa_hibrida` de `sql/001_esquema.sql`).
* `IndiceMemoria` — testes, CI e laboratório sem base de dados:
  `InMemoryVectorStore` do LangChain mais o BM25 do runtime didáctico, fundidos
  com o mesmo RRF.

Em ambos, os filtros `vigente = true` e `publico = ANY(...)` são aplicados
**antes** do ranking, dentro do índice (adr-0010): uma política substituída ou um
procedimento interno nunca chega ao contexto do modelo, por isso nunca pode ser
citado — não depende de o modelo obedecer a uma instrução.

O `RecuperadorHibrido` é um `BaseRetriever` do LangChain: entra numa cadeia LCEL
como qualquer outro, e faz o re-ranking dos candidatos no fim.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Sequence
from typing import Any, Protocol

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever
from langchain_core.vectorstores import InMemoryVectorStore
from pydantic import ConfigDict

from balcao import didactico
from balcao.config import Configuracao
from balcao.ingestao import DocumentoFonte

__all__ = [
    "SQL_PESQUISA_HIBRIDA",
    "Indice",
    "IndiceMemoria",
    "IndicePostgres",
    "RecuperadorHibrido",
    "criar_indice",
    "criar_recuperador",
]

log = logging.getLogger(__name__)

PUBLICO_CLIENTE: tuple[str, ...] = ("cliente",)


class Indice(Protocol):
    """Interface comum aos dois índices: escrita (ingestão) e pesquisa híbrida."""

    def hash_documento(self, doc_id: str) -> str | None: ...

    def substituir_documento(self, doc: DocumentoFonte, chunks: Sequence[Document]) -> None: ...

    def pesquisar(
        self, consulta: str, vector: list[float], k: int, publicos: Sequence[str]
    ) -> list[tuple[Document, float]]: ...

    def contar_chunks(self) -> int: ...


# ================================================================== memória


class IndiceMemoria:
    """Índice em memória: `InMemoryVectorStore` (denso) + BM25 didáctico (lexical) + RRF.

    Serve para testes e para correr sem PostgreSQL. Não persiste: o arranque da
    API reingere o corpus (40 documentos, menos de um segundo com o simulado).
    """

    def __init__(self, embeddings: Embeddings, k_rrf: int = 60) -> None:
        self.vs = InMemoryVectorStore(embeddings)
        self.k_rrf = k_rrf
        self._hashes: dict[str, str] = {}
        self._ids_por_doc: dict[str, list[str]] = {}
        self._chunks: dict[str, didactico.Chunk] = {}
        self._bm25: didactico.BM25 | None = None
        self._trinco = threading.Lock()

    def hash_documento(self, doc_id: str) -> str | None:
        return self._hashes.get(doc_id)

    def substituir_documento(self, doc: DocumentoFonte, chunks: Sequence[Document]) -> None:
        with self._trinco:
            antigos = self._ids_por_doc.pop(doc.id, [])
            if antigos:
                self.vs.delete(antigos)
                for i in antigos:
                    self._chunks.pop(i, None)
            ids = [str(c.id) for c in chunks]
            # Texto a vectorizar com o título à frente: o chunk «Até 24 horas.»
            # sozinho não diz de que política é (contextual header).
            para_vector = [
                Document(id=c.id, page_content=f"{doc.titulo}\n{c.page_content}", metadata=c.metadata) for c in chunks
            ]
            self.vs.add_documents(para_vector, ids=ids)
            for c in chunks:
                self._chunks[str(c.id)] = didactico.Chunk(
                    id=str(c.id),
                    doc=doc.id,
                    texto=c.page_content,
                    ordem=int(c.metadata["ordem"]),
                    meta=dict(c.metadata),
                )
            self._ids_por_doc[doc.id] = ids
            self._hashes[doc.id] = doc.hash
            self._bm25 = None  # reconstruído na próxima pesquisa

    def contar_chunks(self) -> int:
        return len(self._chunks)

    def _lexical(self) -> didactico.BM25:
        if self._bm25 is None:
            with self._trinco:
                self._bm25 = didactico.BM25(sorted(self._chunks.values(), key=lambda c: c.id))
        return self._bm25

    def pesquisar(
        self, consulta: str, vector: list[float], k: int, publicos: Sequence[str]
    ) -> list[tuple[Document, float]]:
        def aceita_meta(meta: dict[str, Any]) -> bool:
            return bool(meta.get("vigente")) and meta.get("publico") in publicos

        # Denso: o filtro é aplicado dentro da pesquisa, antes do top-k.
        densos = self.vs.similarity_search_with_score_by_vector(vector, k=k, filter=lambda d: aceita_meta(d.metadata))
        rank_denso = [(self._chunks[str(d.id)], s) for d, s in densos if str(d.id) in self._chunks]
        # Lexical: BM25 sobre todos os chunks, filtrado antes de cortar em k.
        lexicos = [(c, s) for c, s in self._lexical().procurar(consulta, len(self._chunks)) if aceita_meta(c.meta)]
        fundido = didactico.rrf(rank_denso, lexicos[:k], k=self.k_rrf)[:k]
        return [(_chunk_para_documento(c), s) for c, s in fundido]


def _chunk_para_documento(c: didactico.Chunk) -> Document:
    return Document(id=c.id, page_content=c.texto, metadata=dict(c.meta))


def _documento_para_chunk(d: Document) -> didactico.Chunk:
    m = d.metadata
    return didactico.Chunk(
        id=str(m.get("chunk_id", d.id)),
        doc=str(m["documento_id"]),
        texto=d.page_content,
        ordem=int(m.get("ordem", 0)),
        meta=dict(m),
    )


# ================================================================ PostgreSQL

# A consulta chama a função `pesquisa_hibrida` de `sql/001_esquema.sql`: um CTE
# denso (HNSW, `<=>`), um CTE lexical (`tsvector` com `ts_rank_cd`) e a fusão
# RRF, com os filtros de metadados dentro de cada CTE. O `SET LOCAL` liga os
# iterative index scans do pgvector 0.8: sem eles, um filtro selectivo depois
# do HNSW pode devolver menos de k linhas.
SQL_PESQUISA_HIBRIDA = """
SELECT chunk_id, documento_id, ordem, texto, titulo, categoria, publico, vigente,
       actualizado, modelo_embedding, rank_denso, rank_lexical, score
FROM pesquisa_hibrida(
    %(consulta)s, %(vector)s::vector, %(publicos)s::text[], %(modelo)s,
    %(k)s, %(k_rrf)s
)
"""

SQL_SUBSTITUIR_DOCUMENTO = """
INSERT INTO documentos (id, titulo, categoria, publico, vigente, actualizado, hash, fonte)
VALUES (%(id)s, %(titulo)s, %(categoria)s, %(publico)s, %(vigente)s, %(actualizado)s, %(hash)s, %(fonte)s)
ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo, categoria = EXCLUDED.categoria, publico = EXCLUDED.publico,
    vigente = EXCLUDED.vigente, actualizado = EXCLUDED.actualizado, hash = EXCLUDED.hash,
    fonte = EXCLUDED.fonte, indexado_em = now()
"""


class IndicePostgres:
    """Índice sobre as tabelas `documentos` e `chunks` do esquema do «Balcão».

    Porque não o `PGVector` do `langchain-postgres`? Porque o esquema dele
    (`langchain_pg_embedding`) guarda os metadados num JSONB genérico e não tem
    coluna `tsvector`: a pesquisa lexical e os filtros por coluna indexada, que
    são metade da pesquisa híbrida, teriam de ser feitos fora da base de dados.
    """

    def __init__(self, cfg: Configuracao, embeddings: Embeddings, modelo_embedding: str) -> None:
        from psycopg_pool import ConnectionPool

        self.cfg = cfg
        self.embeddings = embeddings
        self.modelo_embedding = modelo_embedding
        self.pool = ConnectionPool(
            cfg.conninfo, min_size=cfg.pool_min, max_size=cfg.pool_max, open=True, name="balcao-indice"
        )

    def fechar(self) -> None:
        self.pool.close()

    def hash_documento(self, doc_id: str) -> str | None:
        """O hash guardado, mas só se os chunks forem do modelo de embeddings actual.

        Trocar de modelo (adr-0007) não muda o texto nem o hash; sem esta condição,
        a ingestão saltaria tudo e a pesquisa, que filtra por `modelo_embedding`,
        ficaria vazia. Assim, trocar de modelo e ingerir é reindexar.
        """
        with self.pool.connection() as con:
            linha = con.execute(
                "SELECT d.hash FROM documentos d WHERE d.id = %s AND EXISTS "
                "(SELECT 1 FROM chunks c WHERE c.documento_id = d.id AND c.modelo_embedding = %s)",
                (doc_id, self.modelo_embedding),
            ).fetchone()
        return str(linha[0]) if linha else None

    def substituir_documento(self, doc: DocumentoFonte, chunks: Sequence[Document]) -> None:
        """Numa transacção: actualiza o documento, apaga os chunks antigos e insere os novos.

        Quem pesquisa durante a ingestão vê a versão antiga ou a nova, nunca metade.
        """
        from psycopg.types.json import Jsonb

        vectores = self.embeddings.embed_documents([f"{doc.titulo}\n{c.page_content}" for c in chunks])
        with self.pool.connection() as con, con.transaction():
            con.execute(
                SQL_SUBSTITUIR_DOCUMENTO,
                {
                    "id": doc.id,
                    "titulo": doc.titulo,
                    "categoria": doc.categoria,
                    "publico": doc.publico,
                    "vigente": doc.vigente,
                    "actualizado": doc.actualizado or None,
                    "hash": doc.hash,
                    "fonte": doc.fonte,
                },
            )
            con.execute("DELETE FROM chunks WHERE documento_id = %s", (doc.id,))
            with con.cursor() as cur:
                cur.executemany(
                    "INSERT INTO chunks (id, documento_id, ordem, texto, embedding, modelo_embedding, metadados) "
                    "VALUES (%s, %s, %s, %s, %s::vector, %s, %s)",
                    [
                        (
                            c.id,
                            doc.id,
                            c.metadata["ordem"],
                            c.page_content,
                            _vector_literal(v),
                            self.modelo_embedding,
                            Jsonb({k: v for k, v in c.metadata.items() if k in ("titulo", "categoria", "fonte")}),
                        )
                        for c, v in zip(chunks, vectores, strict=True)
                    ],
                )

    def contar_chunks(self) -> int:
        with self.pool.connection() as con:
            linha = con.execute("SELECT count(*) FROM chunks").fetchone()
        return int(linha[0]) if linha else 0

    def pesquisar(
        self, consulta: str, vector: list[float], k: int, publicos: Sequence[str]
    ) -> list[tuple[Document, float]]:
        with self.pool.connection() as con, con.transaction():
            # `SET LOCAL` vale só dentro desta transacção. O pgvector < 0.8 não
            # conhece `iterative_scan`: desliga-se com BALCAO_ITERATIVE_SCAN=false.
            if self.cfg.iterative_scan:
                con.execute("SET LOCAL hnsw.iterative_scan = relaxed_order")
            con.execute(f"SET LOCAL hnsw.ef_search = {int(self.cfg.ef_search)}")
            linhas = con.execute(
                SQL_PESQUISA_HIBRIDA,
                {
                    "consulta": consulta,
                    "vector": _vector_literal(vector),
                    "publicos": list(publicos),
                    "modelo": self.modelo_embedding,
                    "k": k,
                    "k_rrf": self.cfg.k_rrf,
                },
            ).fetchall()
        out: list[tuple[Document, float]] = []
        for ln in linhas:
            (
                chunk_id,
                doc_id,
                ordem,
                texto,
                titulo,
                categoria,
                publico,
                vigente,
                actualizado,
                modelo,
                rd,
                rl,
                score,
            ) = ln
            meta = {
                "chunk_id": chunk_id,
                "documento_id": doc_id,
                "ordem": ordem,
                "titulo": titulo,
                "categoria": categoria,
                "publico": publico,
                "vigente": vigente,
                "actualizado": str(actualizado) if actualizado else "",
                "modelo_embedding": modelo,
                "rank_denso": rd,
                "rank_lexical": rl,
            }
            out.append((Document(id=chunk_id, page_content=texto, metadata=meta), float(score)))
        return out


def _vector_literal(v: Sequence[float]) -> str:
    """Formato de texto do tipo `vector` (`[0.1,0.2,...]`), sem depender do adaptador `pgvector`."""
    return "[" + ",".join(f"{x:.7g}" for x in v) + "]"


# =============================================================== recuperador


class RecuperadorHibrido(BaseRetriever):
    """Retriever LangChain: embedding da consulta → pesquisa híbrida no índice → re-ranking.

    Devolve até `k` documentos com `metadata["score"]` (re-ranking, 0 a 1) e
    `metadata["score_rrf"]`. O re-ranker é o didáctico (cobertura de termos,
    bigramas, números e cosseno); em produção troca-se por um cross-encoder
    pequeno sobre os mesmos 20 candidatos (adr-0009).
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    indice: Any
    embeddings: Embeddings
    k: int = 4
    k_candidatos: int = 20
    publicos: tuple[str, ...] = PUBLICO_CLIENTE
    reordenar: bool = True

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:
        return [d for d, _ in self.pesquisar_com_scores(query)]

    def pesquisar_com_scores(self, consulta: str, k: int | None = None) -> list[tuple[Document, float]]:
        k = k or self.k
        vector = self.embeddings.embed_query(consulta)
        candidatos = self.indice.pesquisar(consulta, vector, self.k_candidatos, self.publicos)
        if not self.reordenar:
            fim = candidatos[:k]
            for d, s in fim:
                d.metadata["score_rrf"] = s
                d.metadata["score"] = s
            return fim
        rrf_por_id = {str(d.metadata.get("chunk_id", d.id)): s for d, s in candidatos}
        ordenados = didactico.rerank(consulta, [(_documento_para_chunk(d), s) for d, s in candidatos], k)
        out: list[tuple[Document, float]] = []
        for c, s in ordenados:
            d = _chunk_para_documento(c)
            d.metadata["score"] = s
            d.metadata["score_rrf"] = rrf_por_id.get(c.id, 0.0)
            out.append((d, s))
        return out


# ================================================================== fábricas


def criar_indice(cfg: Configuracao, embeddings: Embeddings) -> Indice:
    """PostgreSQL quando há `DATABASE_URL`; memória nos outros casos."""
    if cfg.usa_postgres:
        from balcao.modelos import nome_embeddings

        return IndicePostgres(cfg, embeddings, nome_embeddings(cfg))
    return IndiceMemoria(embeddings, k_rrf=cfg.k_rrf)


def criar_recuperador(
    cfg: Configuracao, indice: Indice, embeddings: Embeddings, publicos: Sequence[str] = PUBLICO_CLIENTE
) -> RecuperadorHibrido:
    return RecuperadorHibrido(
        indice=indice,
        embeddings=embeddings,
        k=cfg.k_contexto,
        k_candidatos=cfg.k_candidatos,
        publicos=tuple(publicos),
    )
