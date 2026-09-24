"""Ferramentas: esquemas, autorização pelo contexto, limite de 500 MZN no código e idempotência."""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from balcao.ferramentas import ESCRITA, LEITURA, ErroAutorizacao, Mundo, criar_ferramentas
from balcao.grafo import Sistema

# Os ids de `src/data/ids.ts` (TOOL_IDS) com `_` em vez de `-`.
CATALOGO = {
    "ler_pedido",
    "ler_cliente",
    "rastrear_entrega",
    "pesquisar_conhecimento",
    "calcular_reembolso",
    "emitir_reembolso",
    "emitir_cupao",
    "cancelar_pedido",
    "alterar_morada",
    "abrir_ticket",
    "pedir_aprovacao",
    "transferir_humano",
}


def _cfg(cliente: str, fio: str = "fio-teste") -> dict[str, Any]:
    return {"configurable": {"cliente_id": cliente, "thread_id": fio}}


@pytest.fixture
def ferr(sistema: Sistema) -> dict[str, Any]:
    return {t.name: t for t in sistema.ferramentas}


def test_catalogo_completo_e_classificado(ferr: dict[str, Any]) -> None:
    assert set(ferr) == CATALOGO
    assert LEITURA | ESCRITA == CATALOGO and not LEITURA & ESCRITA


def test_nenhum_esquema_aceita_cliente_id(ferr: dict[str, Any]) -> None:
    """RI-03: a identidade vem do contexto autenticado, nunca de um argumento do modelo."""
    for t in ferr.values():
        propriedades = t.tool_call_schema.model_json_schema().get("properties", {})
        assert "cliente_id" not in propriedades, t.name
        assert "config" not in propriedades, t.name


def test_sem_cliente_no_contexto_nada_corre(ferr: dict[str, Any]) -> None:
    with pytest.raises(ErroAutorizacao):
        ferr["ler_pedido"].invoke({"pedido_id": "PD-8841273"})


def test_pedido_de_outro_cliente_e_nao_encontrado(ferr: dict[str, Any]) -> None:
    r = ferr["ler_pedido"].invoke({"pedido_id": "PD-8842507"}, _cfg("CL-77120"))
    assert r["codigo"] == "NAO_ENCONTRADO"
    assert "Caril" not in str(r)
    proprio = ferr["ler_pedido"].invoke({"pedido_id": "PD-8842507"}, _cfg("CL-40311"))
    assert proprio["estado"] == "em_preparacao" and "cliente" not in proprio


def test_argumentos_fora_do_esquema_sao_rejeitados(ferr: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        ferr["ler_pedido"].invoke({"pedido_id": "8841273"}, _cfg("CL-77120"))
    with pytest.raises(ValidationError):
        ferr["pesquisar_conhecimento"].invoke({"consulta": "cupões", "k": 50}, _cfg("CL-77120"))


def test_reembolso_acima_do_limite_e_recusado_no_codigo(sistema: Sistema, ferr: dict[str, Any]) -> None:
    r = ferr["emitir_reembolso"].invoke(
        {"pedido_id": "PD-8842507", "valor_mzn": 2910, "motivo": "nao_entregue"}, _cfg("CL-40311")
    )
    assert r["codigo"] == "APROVACAO_NECESSARIA"
    assert sistema.mundo.reembolsos == {}


def test_valor_tem_de_ser_o_da_politica(sistema: Sistema, ferr: dict[str, Any]) -> None:
    r = ferr["emitir_reembolso"].invoke(
        {"pedido_id": "PD-8841990", "valor_mzn": 499, "motivo": "artigo_em_falta"}, _cfg("CL-77120")
    )
    assert r["codigo"] == "VALOR_INVALIDO"
    atraso = ferr["emitir_reembolso"].invoke(
        {"pedido_id": "PD-8841990", "valor_mzn": 200, "motivo": "atraso"}, _cfg("CL-77120")
    )
    assert atraso["codigo"] == "NAO_ELEGIVEL"  # atraso dá cupão, não reembolso
    assert sistema.mundo.reembolsos == {}


def test_reembolso_idempotente(sistema: Sistema, ferr: dict[str, Any]) -> None:
    args = {"pedido_id": "PD-8841990", "valor_mzn": 150, "motivo": "artigo_em_falta"}
    primeiro = ferr["emitir_reembolso"].invoke(args, _cfg("CL-77120", "fio-1"))
    segundo = ferr["emitir_reembolso"].invoke(args, _cfg("CL-77120", "fio-1"))
    assert primeiro["estado"] == "aprovado" and primeiro["referencia"].startswith("RB-")
    assert segundo["referencia"] == primeiro["referencia"] and segundo["repetido"] is True
    assert len(sistema.mundo.reembolsos) == 1


def test_sinais_de_fraude_bloqueiam_reembolso(sistema: Sistema, ferr: dict[str, Any]) -> None:
    r = ferr["emitir_reembolso"].invoke(
        {"pedido_id": "PD-8843115", "valor_mzn": 85, "motivo": "artigo_em_falta"}, _cfg("CL-90004")
    )
    assert r["codigo"] == "REVISAO_HUMANA"
    assert "fraude" not in r["erro"]  # sem acusar o cliente
    assert sistema.mundo.reembolsos == {}
    perfil = ferr["ler_cliente"].invoke({}, _cfg("CL-90004"))
    assert "mais de 3 reembolsos em 30 dias" in perfil["sinais_de_fraude"]


def test_cupao_um_por_pedido_e_valor_da_politica(sistema: Sistema, ferr: dict[str, Any]) -> None:
    c1 = ferr["emitir_cupao"].invoke({"pedido_id": "PD-8841990"}, _cfg("CL-77120"))
    c2 = ferr["emitir_cupao"].invoke({"pedido_id": "PD-8841990"}, _cfg("CL-77120"))
    assert c1["valor_mzn"] == 200 and c2.get("repetido") is True
    assert ferr["emitir_cupao"].invoke({"pedido_id": "PD-8841273"}, _cfg("CL-77120"))["codigo"] == "NAO_ELEGIVEL"


def test_cancelar_pedido_aceite_precisa_de_aprovacao(ferr: dict[str, Any]) -> None:
    r = ferr["cancelar_pedido"].invoke({"pedido_id": "PD-8842507"}, _cfg("CL-40311"))
    assert r["codigo"] == "APROVACAO_NECESSARIA"


def test_alterar_morada_respeita_os_2_km(ferr: dict[str, Any]) -> None:
    perto = ferr["alterar_morada"].invoke(
        {"pedido_id": "PD-8842507", "nova_morada": "Rua 5, casa 12, Machava"}, _cfg("CL-40311")
    )
    assert perto["distancia_km"] <= 2
    longe = ferr["alterar_morada"].invoke(
        {"pedido_id": "PD-8842507", "nova_morada": "Av. Julius Nyerere, Polana"}, _cfg("CL-40311")
    )
    assert longe["codigo"] == "RECALCULO_NECESSARIO"


def test_pedir_aprovacao_e_idempotente(sistema: Sistema, ferr: dict[str, Any]) -> None:
    args = {"pedido_id": "PD-8842507", "valor_mzn": 2910, "motivo": "nao_entregue", "justificacao": "não entregue"}
    a = ferr["pedir_aprovacao"].invoke(args, _cfg("CL-40311", "fio-ap"))
    b = ferr["pedir_aprovacao"].invoke(args, _cfg("CL-40311", "fio-ap"))
    assert a["aprovacao_id"] == b["aprovacao_id"] and a["estado"] == "pendente"
    assert len(sistema.mundo.aprovacoes) == 1


def test_so_a_aprovacao_humana_emite_acima_do_limite() -> None:
    mundo = Mundo(limite_reembolso_mzn=500)
    ap = mundo.registar_aprovacao("fio", "CL-40311", "PD-8842507", 2910, "nao_entregue", "teste")
    r = mundo.emitir_reembolso_aprovado(ap, "supervisor:ana")
    assert mundo.emitir_reembolso_aprovado(ap, "supervisor:ana")["repetido"] is True  # retoma repetida
    assert r["valor_mzn"] == 2910 and r["aprovacao"] == ap["id"]
    assert mundo.aprovacoes[ap["id"]]["estado"] == "aprovada"


def test_pesquisa_devolve_so_fontes_publicas(ferr: dict[str, Any]) -> None:
    r = ferr["pesquisar_conhecimento"].invoke({"consulta": "sinais de fraude em reembolsos", "k": 5})
    assert r["resultados"]
    assert all(x["publico"] == "cliente" and x["vigente"] for x in r["resultados"])


def test_ferramentas_novas_por_mundo() -> None:
    """Dois mundos não partilham estado (cada teste e cada avaliação tem o seu)."""
    a, b = Mundo(), Mundo()
    fa = {t.name: t for t in criar_ferramentas(a, lambda q, k: [])}
    fa["emitir_cupao"].invoke({"pedido_id": "PD-8841990"}, _cfg("CL-77120"))
    assert a.cupoes and not b.cupoes
