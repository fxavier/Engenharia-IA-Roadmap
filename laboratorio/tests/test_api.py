"""A API de ponta a ponta com o `TestClient`: conversas com SSE, aprovação, erros RFC 9457."""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from balcao.api.app import create_app
from balcao.config import Configuracao


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _eventos(corpo: str) -> list[tuple[str, dict[str, Any]]]:
    """Parte um stream SSE em (evento, dados)."""
    out = []
    for bloco in corpo.strip().split("\n\n"):
        linhas = dict(linha.split(": ", 1) for linha in bloco.splitlines() if ": " in linha)
        out.append((linhas["event"], json.loads(linhas["data"])))
    return out


@pytest.fixture
def cliente(cfg: Configuracao) -> Iterator[TestClient]:
    with TestClient(create_app(cfg)) as c:
        yield c


def _nova_conversa(c: TestClient, token: str = "tok-aida") -> str:
    r = c.post("/v1/conversas", json={"canal": "whatsapp"}, headers=_h(token))
    assert r.status_code == 201
    return str(r.json()["id"])


def _enviar(c: TestClient, conversa: str, texto: str, token: str = "tok-aida") -> list[tuple[str, dict[str, Any]]]:
    r = c.post(f"/v1/conversas/{conversa}/mensagens", json={"texto": texto}, headers=_h(token))
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/event-stream")
    return _eventos(r.text)


def test_saude_e_prontidao(cliente: TestClient) -> None:
    assert cliente.get("/healthz").json()["estado"] == "ok"
    pronto = cliente.get("/readyz")
    assert pronto.status_code == 200 and pronto.json()["detalhes"]["chunks"] > 0


def test_criar_conversa_usa_o_cliente_do_token(cliente: TestClient) -> None:
    r = cliente.post("/v1/conversas", json={}, headers=_h("tok-nelson"))
    assert r.json()["cliente_id"] == "CL-40311" and r.json()["estado"] == "aberta"


def test_mensagem_rag_em_sse_com_tokens_citacao_e_fim(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente)
    eventos = _enviar(cliente, cid, "Posso juntar dois cupões no mesmo pedido?")
    tipos = [e for e, _ in eventos]
    assert tipos[0] == "token" and tipos[-1] == "fim"
    assert any(e == "citacao" and d["id"] == "pol-cupoes" and d["titulo"] for e, d in eventos)
    fim = eventos[-1][1]
    texto = "".join(d["texto"] for e, d in eventos if e == "token")
    assert fim["texto"] == texto.strip() and fim["substituir"] is False
    assert "pol-cupoes" in fim["citacoes"]


def test_mensagem_de_pedido_mostra_a_ferramenta(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente, "tok-nelson")
    eventos = _enviar(cliente, cid, "O meu pedido PD-8842507 ainda vai demorar muito?", "tok-nelson")
    ferramentas = [d for e, d in eventos if e == "ferramenta"]
    assert [(f["nome"], f["estado"]) for f in ferramentas] == [("ler_pedido", "chamada"), ("ler_pedido", "resultado")]
    assert "38 minutos" in eventos[-1][1]["texto"]


def test_conversa_guarda_mensagens_mascaradas(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente)
    _enviar(cliente, cid, "Liguem-me para o 84 555 0199, a que horas fecham?")
    conversa = cliente.get(f"/v1/conversas/{cid}", headers=_h("tok-aida")).json()
    assert [m["papel"] for m in conversa["mensagens"]] == ["cliente", "assistente"]
    assert "[TELEFONE]" in conversa["mensagens"][0]["texto"]
    assert "0199" not in json.dumps(conversa)


def test_aprovacao_de_ponta_a_ponta(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente, "tok-nelson")
    eventos = _enviar(cliente, cid, "O PD-8842507 não chegou, quero o reembolso do dinheiro", "tok-nelson")
    [ap] = [d for e, d in eventos if e == "aprovacao"]
    assert ap["valor_mzn"] == 2910 and ap["estado"] == "pendente"
    assert eventos[-1][1]["aprovacao_pendente"] is True

    # Enquanto um humano decide, a conversa não aceita mensagens novas.
    r = cliente.post(f"/v1/conversas/{cid}/mensagens", json={"texto": "Então?"}, headers=_h("tok-nelson"))
    assert r.status_code == 409 and r.headers["content-type"] == "application/problem+json"

    pendentes = cliente.get("/v1/aprovacoes", headers=_h("tok-supervisor")).json()
    assert [p["id"] for p in pendentes] == [ap["id"]]
    assert (
        cliente.post(
            f"/v1/aprovacoes/{ap['id']}/decisao", json={"aprovado": True}, headers=_h("tok-nelson")
        ).status_code
        == 403
    )

    r = cliente.post(
        f"/v1/aprovacoes/{ap['id']}/decisao", json={"aprovado": True, "nota": "ok"}, headers=_h("tok-supervisor")
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["aprovacao"]["estado"] == "aprovada" and corpo["aprovacao"]["revisor"].startswith("supervisor:")
    assert "RB-" in corpo["mensagem"]["texto"]
    assert (
        cliente.post(
            f"/v1/aprovacoes/{ap['id']}/decisao", json={"aprovado": False}, headers=_h("tok-supervisor")
        ).status_code
        == 409
    )
    assert cliente.get(f"/v1/conversas/{cid}", headers=_h("tok-nelson")).json()["estado"] == "aberta"


def test_autenticacao_e_autorizacao(cliente: TestClient) -> None:
    sem = cliente.post("/v1/conversas", json={})
    assert sem.status_code == 401 and sem.headers["content-type"] == "application/problem+json"
    assert sem.json()["title"] == "Não autenticado"
    assert cliente.post("/v1/conversas", json={}, headers=_h("tok-falso")).status_code == 401
    assert cliente.post("/v1/conversas", json={}, headers=_h("tok-operador")).status_code == 403
    cid = _nova_conversa(cliente, "tok-nelson")
    # Conversa de outro cliente: 404, não 403 (não se confirma que existe).
    assert cliente.get(f"/v1/conversas/{cid}", headers=_h("tok-aida")).status_code == 404
    assert cliente.get(f"/v1/conversas/{cid}", headers=_h("tok-supervisor")).status_code == 200


def test_validacao_devolve_problem_details(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente)
    r = cliente.post(f"/v1/conversas/{cid}/mensagens", json={"texto": "x" * 2001}, headers=_h("tok-aida"))
    assert r.status_code == 422
    corpo = r.json()
    assert corpo["status"] == 422 and "texto" in corpo["detail"] and corpo["instance"].endswith("/mensagens")


def test_feedback(cliente: TestClient) -> None:
    cid = _nova_conversa(cliente)
    fim = _enviar(cliente, cid, "Quanto custa o Chega Mais?")[-1][1]
    r = cliente.post(
        f"/v1/conversas/{cid}/feedback", json={"mensagem_id": fim["mensagem_id"], "util": True}, headers=_h("tok-aida")
    )
    assert r.status_code == 201 and r.json()["util"] is True
    assert (
        cliente.post(
            f"/v1/conversas/{cid}/feedback",
            json={"mensagem_id": "MS-nao-existe", "util": False},
            headers=_h("tok-aida"),
        ).status_code
        == 404
    )


def test_pesquisa_e_documentos_internos(cliente: TestClient) -> None:
    corpo = {"consulta": "sinais de fraude em reembolsos", "k": 5, "incluir_internos": True}
    assert cliente.post("/v1/pesquisa", json=corpo, headers=_h("tok-aida")).status_code == 403
    r = cliente.post("/v1/pesquisa", json=corpo, headers=_h("tok-operador")).json()
    assert r[0]["documento_id"] == "int-fraude-sinais"
    publica = cliente.post("/v1/pesquisa", json={"consulta": "sinais de fraude"}, headers=_h("tok-aida")).json()
    assert all(x["publico"] == "cliente" for x in publica)


def test_ingestao_por_api_fica_pesquisavel(cliente: TestClient) -> None:
    doc = {
        "id": "pol-gelados",
        "titulo": "Entrega de gelados",
        "categoria": "entregas",
        "publico": "cliente",
        "actualizado": "2026-09-20",
        "texto": "Os gelados são entregues em caixas térmicas azuis, até 30 minutos.",
    }
    r = cliente.post("/v1/ingestao", json={"documentos": [doc]}, headers=_h("tok-operador"))
    assert r.status_code == 202
    estado = cliente.get(f"/v1/ingestao/{r.json()['id']}", headers=_h("tok-operador")).json()
    assert estado["estado"] == "concluida" and estado["relatorio"]["novos"] == ["pol-gelados"]
    achados = cliente.post(
        "/v1/pesquisa", json={"consulta": "gelados em caixas térmicas"}, headers=_h("tok-aida")
    ).json()
    assert achados[0]["documento_id"] == "pol-gelados"


def test_avaliacao_por_api(cliente: TestClient) -> None:
    r = cliente.post("/v1/avaliacoes", json={"conjunto": "dourado", "limite": 9}, headers=_h("tok-operador"))
    assert r.status_code == 202
    av = cliente.get(f"/v1/avaliacoes/{r.json()['id']}", headers=_h("tok-operador")).json()
    assert av["estado"] == "concluida" and av["metricas"]["n_casos"] >= 6


def test_metricas_prometheus(cliente: TestClient) -> None:
    _enviar(cliente, _nova_conversa(cliente), "A que horas fecham?")
    texto = cliente.get("/metrics").text
    assert "balcao_ttft_segundos_bucket" in texto
    assert "balcao_tokens_total" in texto and "balcao_resposta_duracao_segundos" in texto
