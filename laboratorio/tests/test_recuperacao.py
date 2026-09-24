"""Recuperação híbrida, filtros de metadados e ingestão idempotente."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest

from balcao.config import Configuracao
from balcao.corpus import PERGUNTAS
from balcao.ingestao import carregar_corpus, carregar_markdown, criar_divisor, ingerir, partir
from balcao.modelos import criar_embeddings, nome_embeddings
from balcao.recuperacao import SQL_PESQUISA_HIBRIDA, IndiceMemoria, RecuperadorHibrido, criar_recuperador

RAIZ = Path(__file__).resolve().parents[1]


def _docs(rec: RecuperadorHibrido, consulta: str, k: int = 5) -> list[str]:
    return [d.metadata["documento_id"] for d, _ in rec.pesquisar_com_scores(consulta, k)]


def test_recall_no_conjunto_dourado(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> None:
    rec = criar_recuperador(cfg, indice_partilhado, criar_embeddings(cfg))
    acertos = sum(any(r in _docs(rec, p["pergunta"]) for r in p["relevantes"]) for p in PERGUNTAS)
    assert acertos / len(PERGUNTAS) >= 0.9


@pytest.mark.parametrize(
    "consulta",
    [p["pergunta"] for p in PERGUNTAS]
    + [
        "Os reembolsos para M-Pesa são processados em até 72 horas?",
        "reembolso 300 MZN 24 horas depois da entrega versão de 2025",
    ],
)
def test_politica_substituida_nunca_aparece(cfg: Configuracao, indice_partilhado: IndiceMemoria, consulta: str) -> None:
    rec = criar_recuperador(cfg, indice_partilhado, criar_embeddings(cfg))
    rec.k_candidatos = 40
    assert "pol-reembolso-2025" not in _docs(rec, consulta, k=20)


def test_documentos_internos_so_com_publico_interno(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> None:
    emb = criar_embeddings(cfg)
    cliente = criar_recuperador(cfg, indice_partilhado, emb)
    interno = criar_recuperador(cfg, indice_partilhado, emb, publicos=("cliente", "interno"))
    consulta = "sinais de fraude reembolsos nos últimos 30 dias"
    assert not any(d.startswith("int-") for d in _docs(cliente, consulta, k=10))
    assert "int-fraude-sinais" in _docs(interno, consulta, k=3)


def test_resultados_trazem_scores_e_metadados_herdados(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> None:
    rec = criar_recuperador(cfg, indice_partilhado, criar_embeddings(cfg))
    d, s = rec.pesquisar_com_scores("Quanto tempo demora a devolução do dinheiro no M-Pesa?", 3)[0]
    assert d.metadata["documento_id"] == "pol-reembolso-prazos"
    assert d.metadata["vigente"] is True and d.metadata["publico"] == "cliente"
    assert d.metadata["score"] == s and d.metadata["score_rrf"] > 0
    assert d.metadata["modelo_embedding"] == "balcao-hash-768"


def test_retriever_e_um_runnable(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> None:
    rec = criar_recuperador(cfg, indice_partilhado, criar_embeddings(cfg))
    docs = rec.invoke("Posso juntar dois cupões no mesmo pedido?")
    assert 0 < len(docs) <= cfg.k_contexto
    assert "pol-cupoes" in [x.metadata["documento_id"] for x in docs]


def test_chunks_herdam_metadados_e_tem_ids_estaveis(cfg: Configuracao) -> None:
    doc = next(x for x in carregar_corpus() if x.id == "pol-reembolso")
    chunks = partir(doc, criar_divisor(cfg.model_copy(update={"chunk_caracteres": 200, "chunk_sobreposicao": 20})), "m")
    assert len(chunks) > 1
    assert [c.id for c in chunks] == [f"pol-reembolso#{i}" for i in range(len(chunks))]
    assert all(c.metadata["categoria"] == "reembolsos" and c.metadata["hash_documento"] == doc.hash for c in chunks)


def test_ingestao_idempotente_e_substituicao(cfg: Configuracao) -> None:
    emb = criar_embeddings(cfg)
    indice = IndiceMemoria(emb)
    docs = carregar_corpus()
    primeira = ingerir(docs, indice, cfg, nome_embeddings(cfg))
    assert len(primeira.novos) == 40 and primeira.chunks == indice.contar_chunks()

    segunda = ingerir(docs, indice, cfg, nome_embeddings(cfg))
    assert segunda.novos == [] and segunda.chunks == 0 and len(segunda.inalterados) == 40

    # Retirar uma política (vigente=false) é uma alteração: o hash muda e ela sai das pesquisas.
    alterados = [replace(x, vigente=False) if x.id == "pol-cupoes" else x for x in docs]
    terceira = ingerir(alterados, indice, cfg, nome_embeddings(cfg))
    assert terceira.actualizados == ["pol-cupoes"]
    assert indice.contar_chunks() == primeira.chunks
    rec = criar_recuperador(cfg, indice, emb)
    assert "pol-cupoes" not in _docs(rec, "Durante quanto tempo posso usar um cupão?", k=10)


def test_markdown_sem_publico_e_recusado(tmp_path: Path) -> None:
    (tmp_path / "bom.md").write_text(
        "---\nid: pol-gelados\ntitulo: Gelados\ncategoria: entregas\npublico: cliente\nactualizado: 2026-09-01\n---\n"
        "Os gelados seguem em caixas térmicas.",
        encoding="utf-8",
    )
    (tmp_path / "mau.md").write_text("---\nid: pol-sem-dono\n---\nTexto sem público.", encoding="utf-8")
    docs = carregar_markdown(tmp_path)
    assert [d.id for d in docs] == ["pol-gelados"]
    assert docs[0].publico == "cliente" and docs[0].vigente is True


def test_sql_da_pesquisa_hibrida_esta_no_esquema() -> None:
    esquema = (RAIZ / "sql" / "001_esquema.sql").read_text(encoding="utf-8")
    assert "pesquisa_hibrida(" in SQL_PESQUISA_HIBRIDA
    for fragmento in (
        "CREATE EXTENSION IF NOT EXISTS vector",
        "vector(768)",
        "USING hnsw",
        "vector_cosine_ops",
        "m = 16, ef_construction = 64",
        "to_tsvector('portuguese', texto)",
        "USING gin (tsv)",
        "FUNCTION pesquisa_hibrida",
        "1.0 / (k_rrf + dn.pos)",
        "d.vigente",
    ):
        assert fragmento in esquema, fragmento


@pytest.mark.postgres
def test_pesquisa_hibrida_no_postgres(cfg: Configuracao, database_url: str) -> None:
    """Com PostgreSQL + pgvector (esquema aplicado): ingestão, pesquisa e filtros na base de dados."""
    from balcao.recuperacao import IndicePostgres

    c = cfg.model_copy(update={"database_url": database_url})
    emb = criar_embeddings(c)
    indice = IndicePostgres(c, emb, nome_embeddings(c))
    try:
        ingerir(carregar_corpus(), indice, c, nome_embeddings(c))
        rec = criar_recuperador(c, indice, emb)
        docs = _docs(rec, "Quanto tempo demora a devolução do dinheiro no M-Pesa?", k=5)
        assert docs[0] == "pol-reembolso-prazos"
        assert "pol-reembolso-2025" not in _docs(rec, "reembolso M-Pesa 72 horas", k=20)
        assert not any(d.startswith("int-") for d in _docs(rec, "sinais de fraude", k=20))
    finally:
        indice.fechar()
