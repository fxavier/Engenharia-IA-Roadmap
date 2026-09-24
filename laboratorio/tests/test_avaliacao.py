"""Métricas, juiz heurístico, corredor da avaliação e o gate de CI."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from balcao.avaliacao import correr
from balcao.avaliacao.juiz import JuizHeuristico
from balcao.avaliacao.metricas import acerto_ferramentas, bootstrap_ic, docs_unicos, verificar_gate
from balcao.config import Configuracao
from balcao.guardas import RECUSA
from balcao.recuperacao import IndiceMemoria


def test_acerto_ferramentas() -> None:
    assert acerto_ferramentas(["ler_pedido"], ["ler_pedido", "ler_pedido"])
    assert acerto_ferramentas(["calcular_reembolso"], ["ler_pedido", "calcular_reembolso"])
    assert not acerto_ferramentas(["calcular_reembolso"], ["ler_pedido"])
    assert not acerto_ferramentas([], ["emitir_reembolso"], proibidas=["emitir_reembolso"])


def test_docs_unicos_mantem_a_ordem() -> None:
    assert docs_unicos(["a", "b", "a", "c", "b"]) == ["a", "b", "c"]


def test_gate_falha_abaixo_do_limiar_e_com_metrica_em_falta() -> None:
    falhas = verificar_gate(
        {"recall_at_5": 0.95, "fidelidade": 0.7}, {"recall_at_5": 0.8, "fidelidade": 0.85, "acerto_ferramentas": 0.9}
    )
    assert sorted(f.metrica for f in falhas) == ["acerto_ferramentas", "fidelidade"]
    assert verificar_gate({"recall_at_5": 0.95}, {"recall_at_5": 0.8}) == []


def test_gate_estrito_usa_o_limite_inferior_do_ic() -> None:
    ic = {"recall_at_5": (0.86, 0.78, 0.93)}
    assert verificar_gate({"recall_at_5": 0.86}, {"recall_at_5": 0.8}, ic) == []
    assert verificar_gate({"recall_at_5": 0.86}, {"recall_at_5": 0.8}, ic, estrito=True)


def test_bootstrap_ic_casos_limite() -> None:
    assert bootstrap_ic([]) == (0.0, 0.0, 0.0)
    assert bootstrap_ic([1.0]) == (1.0, 1.0, 1.0)
    m, lo, hi = bootstrap_ic([1, 1, 1, 0] * 8)
    assert lo <= m <= hi and m == pytest.approx(0.75)


def test_juiz_heuristico() -> None:
    juiz = JuizHeuristico()
    contexto = "[pol-reembolso-prazos] M-Pesa e e-Mola: até 24 horas. Cartão: 5 a 10 dias úteis."
    certo = juiz.julgar(
        "Prazo M-Pesa?",
        "M-Pesa e e-Mola: até 24 horas. [pol-reembolso-prazos]",
        contexto,
        "Até 24 horas depois de aprovado.",
    )
    assert certo.fiel and certo.correcta and certo.cita_fonte
    errado = juiz.julgar(
        "Prazo M-Pesa?", "M-Pesa: até 72 horas. [pol-reembolso-prazos]", contexto, "Até 24 horas depois de aprovado."
    )
    assert not errado.correcta  # os números da referência têm de aparecer
    recusa = juiz.julgar("Prazo M-Pesa?", RECUSA, contexto, "Até 24 horas.")
    assert recusa.fiel and not recusa.correcta


def test_casos_do_conjunto_dourado(cfg: Configuracao) -> None:
    casos = correr.carregar_casos(cfg, "todos")
    tipos = {c.tipo for c in casos}
    assert tipos == {"rag", "fora_de_ambito", "ferramenta", "redteam"}
    assert sum(c.tipo == "rag" for c in casos) == 30
    assert sum(c.tipo == "fora_de_ambito" for c in casos) >= 10
    assert sum(c.tipo == "redteam" for c in casos) >= 20
    ids = [c.id for c in casos]
    assert len(ids) == len(set(ids))


def test_avaliacao_completa_passa_o_gate_no_simulado(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> None:
    rel = correr.avaliar(cfg, "todos", indice=indice_partilhado)
    assert rel.gate_ok, rel.falhas
    assert rel.metricas["recall_at_5"] >= cfg.gate_recall
    assert rel.metricas["redteam_inofensivo"] == 1.0
    assert rel.versao_prompt.startswith("sistema@")
    assert {"onde-esta", "compensacao", "reembolso"} <= set(rel.por_intencao)


def test_relatorio_escrito_em_markdown_e_json(
    cfg: Configuracao, indice_partilhado: IndiceMemoria, tmp_path: Path
) -> None:
    rel = correr.avaliar(cfg, "dourado", limite=6, indice=indice_partilhado)
    md, js = correr.escrever_relatorio(rel, tmp_path)
    assert "| recall_at_5 |" in md.read_text(encoding="utf-8")
    dados = json.loads(js.read_text(encoding="utf-8"))
    assert dados["gate_ok"] == rel.gate_ok and dados["limiares"]["recall_at_5"] == cfg.gate_recall


def test_cli_gate_sai_com_1_abaixo_do_limiar(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    for nome in ("DATABASE_URL", "BALCAO_DATABASE_URL"):
        monkeypatch.delenv(nome, raising=False)
    monkeypatch.setenv("BALCAO_MODELO_FORNECEDOR", "simulado")
    monkeypatch.setenv("BALCAO_EMBEDDINGS_FORNECEDOR", "simulado")
    correr.obter_config.cache_clear()
    try:
        assert correr.main(["--conjunto", "dourado", "--limite", "6", "--gate", "--saida", str(tmp_path)]) == 0
        assert (
            correr.main(
                ["--conjunto", "dourado", "--limite", "6", "--gate", "--min-recall", "1.01", "--saida", str(tmp_path)]
            )
            == 1
        )
    finally:
        correr.obter_config.cache_clear()
