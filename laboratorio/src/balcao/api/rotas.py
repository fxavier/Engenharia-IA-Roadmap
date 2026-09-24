"""Os endpoints do «Balcão».

A rota que importa é `POST /v1/conversas/{id}/mensagens`: corre um turno do
grafo e devolve-o por Server-Sent Events (adr-0021), com os eventos

* `token` — um pedaço do texto, à medida que o modelo gera (TTFT, RNF-01);
* `ferramenta` — uma chamada de ferramenta e o seu resultado (sem os dados);
* `citacao` — cada fonte validada pela guarda de saída;
* `aprovacao` — o grafo parou num `interrupt` à espera de um humano;
* `fim` — o texto final validado (que substitui o que foi mostrado, se a guarda
  o alterou), a intenção e as citações;
* `erro` — um Problem Details (RFC 9457); o stream fecha a seguir.

Autenticação por bearer token com três papéis (cliente, supervisor, operador).
No laboratório, os tokens vêm de `BALCAO_TOKENS_API`; em produção seria um JWT
validado localmente contra o IdP. O `cliente_id` sai do token e segue no
`RunnableConfig` até às ferramentas — nunca do corpo do pedido.
"""

from __future__ import annotations

import hashlib
import json
import logging
import secrets
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.concurrency import run_in_threadpool

from balcao import observabilidade
from balcao.api.esquemas import (
    Aprovacao,
    Conversa,
    ConversaDetalhe,
    CriarConversa,
    Decisao,
    EnviarMensagem,
    EstadoAvaliacao,
    EstadoIngestao,
    Feedback,
    FeedbackRegistado,
    PedidoAvaliacao,
    PedidoIngestao,
    PedidoPesquisa,
    ResultadoDecisao,
    ResultadoPesquisa,
    Saude,
)
from balcao.api.repositorio import novo_id
from balcao.config import Papel
from balcao.grafo import config_de_execucao
from balcao.guardas import mascarar
from balcao.ingestao import DocumentoFonte, carregar_corpus, ingerir
from balcao.modelos import nome_embeddings
from balcao.recuperacao import criar_recuperador

__all__ = ["ErroProblema", "Utilizador", "router"]

log = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer(auto_error=False)

# Nós cujas mensagens chegam ao cliente. As da guarda de saída não: essas
# substituem uma mensagem já mostrada e chegam no evento `fim`.
_NOS_VISIVEIS = {"responder_rag", "agente", "escalar", "preparar_aprovacao", "aguardar_aprovacao"}


class ErroProblema(Exception):
    """Erro que a API devolve como `application/problem+json` (RFC 9457)."""

    def __init__(self, status_code: int, title: str, detail: str | None = None, tipo: str = "about:blank") -> None:
        super().__init__(detail or title)
        self.status_code, self.title, self.detail, self.tipo = status_code, title, detail, tipo


# ================================================================ dependências


def servicos(request: Request) -> Any:
    return request.app.state.servicos


@dataclass(frozen=True)
class Utilizador:
    papel: Papel
    cliente_id: str | None
    sujeito: str


def utilizador(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    s: Annotated[Any, Depends(servicos)],
) -> Utilizador:
    if cred is None:
        raise ErroProblema(401, "Não autenticado", "Falta o cabeçalho Authorization: Bearer <token>.")
    # Comparação em tempo constante contra todos os tokens: não se revela qual quase acertou.
    encontrado: str | None = None
    for token, valor in s.cfg.tokens_api.items():
        if secrets.compare_digest(token.encode(), cred.credentials.encode()):
            encontrado = valor
    if encontrado is None:
        raise ErroProblema(401, "Token inválido")
    papel, _, cliente = encontrado.partition(":")
    if papel not in ("cliente", "supervisor", "operador"):
        raise ErroProblema(500, "Configuração de tokens inválida")
    if papel == "cliente" and not cliente:
        raise ErroProblema(500, "Token de cliente sem cliente_id")
    # O sujeito identifica quem decidiu (auditoria) sem guardar o token.
    sujeito = cliente or hashlib.sha256(cred.credentials.encode()).hexdigest()[:8]
    return Utilizador(papel=papel, cliente_id=cliente or None, sujeito=f"{papel}:{sujeito}")  # type: ignore[arg-type]


def exigir(*papeis: Papel) -> Any:
    def _verificar(u: Annotated[Utilizador, Depends(utilizador)]) -> Utilizador:
        if u.papel not in papeis:
            raise ErroProblema(403, "Sem permissão", f"Esta operação exige o papel {' ou '.join(papeis)}.")
        return u

    return _verificar


def _conversa_acessivel(s: Any, conversa_id: str, u: Utilizador, so_dono: bool = False) -> Conversa:
    c = s.repo.obter_conversa(conversa_id)
    # 404 também para conversas alheias: não se confirma que existem.
    if c is None or (u.papel == "cliente" and c.cliente_id != u.cliente_id) or (so_dono and u.papel != "cliente"):
        raise ErroProblema(404, "Conversa não encontrada")
    return c


def _sse(evento: str, dados: dict[str, Any]) -> str:
    return f"event: {evento}\ndata: {json.dumps(dados, ensure_ascii=False, default=str)}\n\n"


# =================================================================== conversas


@router.post("/v1/conversas", status_code=status.HTTP_201_CREATED, response_model=Conversa, tags=["conversas"])
def criar_conversa(
    corpo: CriarConversa,
    u: Annotated[Utilizador, Depends(exigir("cliente"))],
    s: Annotated[Any, Depends(servicos)],
) -> Conversa:
    """Abre uma conversa para o cliente autenticado. O id é também o `thread_id` do grafo."""
    return s.repo.criar_conversa(str(u.cliente_id), corpo.canal)


@router.post(
    "/v1/conversas/{conversa_id}/mensagens", tags=["conversas"], responses={200: {"content": {"text/event-stream": {}}}}
)
async def enviar_mensagem(
    conversa_id: str,
    corpo: EnviarMensagem,
    u: Annotated[Utilizador, Depends(exigir("cliente"))],
    s: Annotated[Any, Depends(servicos)],
) -> StreamingResponse:
    """Um turno da conversa, devolvido por Server-Sent Events."""
    conversa = _conversa_acessivel(s, conversa_id, u, so_dono=True)
    if conversa.estado == "a_aguardar_aprovacao":
        raise ErroProblema(
            409,
            "Conversa à espera de aprovação",
            "Um colega está a rever um reembolso desta conversa; a resposta chega aqui.",
        )
    texto_mascarado = mascarar(corpo.texto)
    await run_in_threadpool(s.repo.adicionar_mensagem, conversa_id, "cliente", texto_mascarado)
    cliente_id = str(u.cliente_id)
    config = config_de_execucao(conversa_id, cliente_id, s.cfg, canal=conversa.canal)
    config["callbacks"] = s.callbacks
    entrada = {"messages": [HumanMessage(corpo.texto)], "cliente_id": cliente_id}
    return StreamingResponse(
        _turno(s, conversa_id, entrada, config),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _turno(s: Any, conversa_id: str, entrada: dict[str, Any], config: RunnableConfig) -> AsyncIterator[str]:
    """Corre o grafo e traduz os seus eventos em SSE."""
    t0 = time.perf_counter()
    mostrado: list[str] = []
    nos_com_tokens: set[str] = set()
    rota = "?"
    try:
        async for modo, dados in s.grafo.astream(entrada, config, stream_mode=["messages", "updates"]):
            if modo == "messages":
                msg, meta = dados
                no = meta.get("langgraph_node", "")
                if no not in _NOS_VISIVEIS or not isinstance(msg, AIMessage | AIMessageChunk):
                    continue
                if isinstance(msg, AIMessageChunk):
                    nos_com_tokens.add(no)
                elif no in nos_com_tokens:
                    continue  # a mensagem completa de um nó que já foi transmitido aos pedaços
                if msg.text and not getattr(msg, "tool_call_chunks", None) and not getattr(msg, "tool_calls", None):
                    if not mostrado:
                        observabilidade.TTFT.labels(rota=no).observe(time.perf_counter() - t0)
                    mostrado.append(msg.text)
                    yield _sse("token", {"texto": msg.text})
            elif modo == "updates":
                for no, act in dados.items():
                    if no == "__interrupt__":
                        for intr in act:
                            ap = await _registar_aprovacao(s, conversa_id, intr.value)
                            yield _sse("aprovacao", ap.model_dump(mode="json"))
                    elif no == "classificar" and act:
                        rota = str(act.get("intencao", rota))
                    elif no == "agente" and act:
                        for m in act.get("messages", []):
                            for tc in getattr(m, "tool_calls", []) or []:
                                yield _sse("ferramenta", {"nome": tc["name"], "estado": "chamada", "id": tc["id"]})
                    elif no == "ferramentas" and act:
                        for m in act.get("messages", []):
                            if isinstance(m, ToolMessage):
                                yield _sse(
                                    "ferramenta",
                                    {
                                        "nome": m.name,
                                        "estado": "resultado",
                                        "id": m.tool_call_id,
                                        "erro": m.status == "error" or '"erro"' in m.text,
                                    },
                                )

        estado = (await s.grafo.aget_state(config)).values
        final = next((m for m in reversed(estado.get("messages", [])) if isinstance(m, AIMessage)), None)
        texto = final.text if final else ""
        if not mostrado and texto:
            yield _sse("token", {"texto": texto})
        titulos = {c["id"]: c.get("titulo", "") for c in estado.get("contexto", [])}
        for cid in estado.get("citacoes", []):
            yield _sse("citacao", {"id": cid, "titulo": titulos.get(cid, "")})
        meta = {
            "rota": estado.get("origem"),
            "recusa": estado.get("recusa", False),
            "versao": s.cfg.versao,
            "modelo": s.nome_modelo,
        }
        msg = await run_in_threadpool(
            s.repo.adicionar_mensagem,
            conversa_id,
            "assistente",
            texto,
            list(estado.get("citacoes", [])),
            estado.get("intencao"),
            meta,
        )
        if estado.get("origem") == "escalar":
            await run_in_threadpool(s.repo.mudar_estado_conversa, conversa_id, "escalada")
        observabilidade.DURACAO.labels(rota=rota).observe(time.perf_counter() - t0)
        yield _sse(
            "fim",
            {
                "mensagem_id": msg.id,
                "texto": texto,
                "substituir": "".join(mostrado).strip() != texto.strip(),
                "intencao": estado.get("intencao"),
                "citacoes": estado.get("citacoes", []),
                "aprovacao_pendente": (estado.get("aprovacao") or {}).get("estado") == "pendente",
            },
        )
    except Exception as e:
        log.exception("turno falhou na conversa %s", conversa_id)
        yield _sse(
            "erro",
            {
                "type": "about:blank",
                "title": "Erro ao processar a mensagem",
                "status": 500,
                "detail": type(e).__name__,
                "instance": f"/v1/conversas/{conversa_id}/mensagens",
            },
        )


async def _registar_aprovacao(s: Any, conversa_id: str, valor: dict[str, Any]) -> Aprovacao:
    ap = Aprovacao(
        id=valor["id"],
        conversa_id=conversa_id,
        cliente_id=valor["cliente_id"],
        pedido_id=valor["pedido_id"],
        valor_mzn=int(valor["valor_mzn"]),
        motivo=valor["motivo"],
        estado="pendente",
        criada_em=datetime.now(UTC),
    )
    ap = await run_in_threadpool(s.repo.registar_aprovacao, ap)
    await run_in_threadpool(s.repo.mudar_estado_conversa, conversa_id, "a_aguardar_aprovacao")
    return ap


@router.get("/v1/conversas/{conversa_id}", response_model=ConversaDetalhe, tags=["conversas"])
def ler_conversa(
    conversa_id: str,
    u: Annotated[Utilizador, Depends(utilizador)],
    s: Annotated[Any, Depends(servicos)],
) -> ConversaDetalhe:
    c = _conversa_acessivel(s, conversa_id, u)
    pendente = next((a.id for a in s.repo.listar_aprovacoes("pendente") if a.conversa_id == conversa_id), None)
    return ConversaDetalhe(
        **c.model_dump(), mensagens=s.repo.listar_mensagens(conversa_id), aprovacao_pendente=pendente
    )


@router.post(
    "/v1/conversas/{conversa_id}/feedback", status_code=201, response_model=FeedbackRegistado, tags=["conversas"]
)
def enviar_feedback(
    conversa_id: str,
    corpo: Feedback,
    u: Annotated[Utilizador, Depends(exigir("cliente"))],
    s: Annotated[Any, Depends(servicos)],
) -> FeedbackRegistado:
    _conversa_acessivel(s, conversa_id, u, so_dono=True)
    try:
        return s.repo.registar_feedback(
            conversa_id, corpo.mensagem_id, corpo.util, mascarar(corpo.comentario) if corpo.comentario else None
        )
    except KeyError:
        raise ErroProblema(404, "Mensagem não encontrada nesta conversa") from None


# ==================================================================== pesquisa


@router.post("/v1/pesquisa", response_model=list[ResultadoPesquisa], tags=["conhecimento"])
def pesquisar(
    corpo: PedidoPesquisa,
    u: Annotated[Utilizador, Depends(utilizador)],
    s: Annotated[Any, Depends(servicos)],
) -> list[ResultadoPesquisa]:
    """A mesma pesquisa híbrida que a cadeia usa. Documentos internos só para operadores."""
    if corpo.incluir_internos and u.papel != "operador":
        raise ErroProblema(403, "Sem permissão", "Só operadores pesquisam documentos internos.")
    publicos = ("cliente", "interno") if corpo.incluir_internos else ("cliente",)
    rec = criar_recuperador(s.cfg, s.sistema.indice, s.sistema.embeddings, publicos)
    return [
        ResultadoPesquisa(
            documento_id=d.metadata["documento_id"],
            chunk_id=str(d.metadata.get("chunk_id", d.id)),
            titulo=d.metadata.get("titulo", ""),
            texto=d.page_content,
            publico=d.metadata.get("publico", ""),
            score=float(d.metadata.get("score", sc)),
            score_rrf=float(d.metadata.get("score_rrf", 0.0)),
        )
        for d, sc in rec.pesquisar_com_scores(corpo.consulta, corpo.k)
    ]


# ==================================================================== ingestão


@router.post("/v1/ingestao", status_code=202, response_model=EstadoIngestao, tags=["conhecimento"])
def criar_ingestao(
    corpo: PedidoIngestao,
    tarefas: BackgroundTasks,
    _u: Annotated[Utilizador, Depends(exigir("operador"))],
    s: Annotated[Any, Depends(servicos)],
) -> EstadoIngestao:
    """Aceita documentos e indexa-os em segundo plano, sem parar o serviço (RF-07)."""
    if not corpo.documentos and not corpo.incluir_corpus:
        raise ErroProblema(422, "Nada para ingerir", "Envie documentos ou incluir_corpus=true.")
    est = EstadoIngestao(id=novo_id("IG"), estado="pendente", criada_em=datetime.now(UTC))
    s.ingestoes[est.id] = est
    docs = [DocumentoFonte(**d.model_dump(), fonte="api") for d in corpo.documentos]
    if corpo.incluir_corpus:
        docs = carregar_corpus() + docs

    def correr() -> None:
        s.ingestoes[est.id] = est.model_copy(update={"estado": "a_correr"})
        try:
            rel = ingerir(docs, s.sistema.indice, s.cfg, nome_embeddings(s.cfg))
            s.ingestoes[est.id] = est.model_copy(update={"estado": "concluida", "relatorio": rel.como_dict()})
        except Exception as e:
            log.exception("ingestão %s falhou", est.id)
            s.ingestoes[est.id] = est.model_copy(update={"estado": "falhou", "erro": type(e).__name__})

    tarefas.add_task(correr)
    return est


@router.get("/v1/ingestao/{ingestao_id}", response_model=EstadoIngestao, tags=["conhecimento"])
def estado_ingestao(
    ingestao_id: str,
    _u: Annotated[Utilizador, Depends(exigir("operador"))],
    s: Annotated[Any, Depends(servicos)],
) -> EstadoIngestao:
    est = s.ingestoes.get(ingestao_id)
    if est is None:
        raise ErroProblema(404, "Ingestão não encontrada")
    return est


# ================================================================== aprovações


@router.get("/v1/aprovacoes", response_model=list[Aprovacao], tags=["aprovacoes"])
def listar_aprovacoes(
    _u: Annotated[Utilizador, Depends(exigir("supervisor"))],
    s: Annotated[Any, Depends(servicos)],
    estado: Annotated[str | None, Query(pattern="^(pendente|aprovada|recusada)$")] = "pendente",
) -> list[Aprovacao]:
    return s.repo.listar_aprovacoes(estado)


@router.post("/v1/aprovacoes/{aprovacao_id}/decisao", response_model=ResultadoDecisao, tags=["aprovacoes"])
async def decidir_aprovacao(
    aprovacao_id: str,
    corpo: Decisao,
    u: Annotated[Utilizador, Depends(exigir("supervisor"))],
    s: Annotated[Any, Depends(servicos)],
) -> ResultadoDecisao:
    """Regista a decisão e retoma o grafo interrompido com `Command(resume=...)`."""
    ap = await run_in_threadpool(s.repo.obter_aprovacao, aprovacao_id)
    if ap is None:
        raise ErroProblema(404, "Aprovação não encontrada")
    if ap.estado != "pendente":
        raise ErroProblema(409, "Aprovação já decidida", f"Estado actual: {ap.estado}.")
    config = config_de_execucao(ap.conversa_id, ap.cliente_id, s.cfg, revisor=u.sujeito)
    config["callbacks"] = s.callbacks
    estado = await s.grafo.ainvoke(
        Command(resume={"aprovado": corpo.aprovado, "revisor": u.sujeito, "nota": corpo.nota}), config
    )
    ap = await run_in_threadpool(s.repo.decidir_aprovacao, aprovacao_id, corpo.aprovado, u.sujeito, corpo.nota)
    final = next(m for m in reversed(estado["messages"]) if isinstance(m, AIMessage))
    msg = await run_in_threadpool(
        s.repo.adicionar_mensagem,
        ap.conversa_id,
        "assistente",
        final.text,
        [],
        estado.get("intencao"),
        {"rota": "aprovacao", "revisor": u.sujeito},
    )
    await run_in_threadpool(s.repo.mudar_estado_conversa, ap.conversa_id, "aberta")
    return ResultadoDecisao(aprovacao=ap, mensagem=msg)


# =================================================================== avaliação


@router.post("/v1/avaliacoes", status_code=202, response_model=EstadoAvaliacao, tags=["avaliacao"])
def correr_avaliacao(
    corpo: PedidoAvaliacao,
    tarefas: BackgroundTasks,
    _u: Annotated[Utilizador, Depends(exigir("operador"))],
    s: Annotated[Any, Depends(servicos)],
) -> EstadoAvaliacao:
    """Corre o conjunto dourado (e/ou o red team) contra um sistema isolado, com os limiares do gate."""
    from balcao.avaliacao.correr import avaliar

    est = EstadoAvaliacao(id=novo_id("AV"), estado="pendente", conjunto=corpo.conjunto, criada_em=datetime.now(UTC))
    s.repo.guardar_avaliacao(est)

    def correr() -> None:
        s.repo.guardar_avaliacao(est.model_copy(update={"estado": "a_correr"}))
        try:
            rel = avaliar(s.cfg, conjunto=corpo.conjunto, limite=corpo.limite, indice=s.sistema.indice)
            s.repo.guardar_avaliacao(
                est.model_copy(update={"estado": "concluida", "metricas": rel.metricas, "gate_ok": rel.gate_ok}),
                versao_prompt=rel.versao_prompt,
                modelo=rel.modelo,
            )
        except Exception as e:
            log.exception("avaliação %s falhou", est.id)
            s.repo.guardar_avaliacao(est.model_copy(update={"estado": "falhou", "erro": type(e).__name__}))

    tarefas.add_task(correr)
    return est


@router.get("/v1/avaliacoes/{avaliacao_id}", response_model=EstadoAvaliacao, tags=["avaliacao"])
def ler_avaliacao(
    avaliacao_id: str,
    _u: Annotated[Utilizador, Depends(exigir("operador"))],
    s: Annotated[Any, Depends(servicos)],
) -> EstadoAvaliacao:
    av = s.repo.obter_avaliacao(avaliacao_id)
    if av is None:
        raise ErroProblema(404, "Avaliação não encontrada")
    return av


# ================================================================ operação


@router.get("/healthz", response_model=Saude, tags=["operacao"])
def saude(s: Annotated[Any, Depends(servicos)]) -> Saude:
    """Vivo: o processo responde. Não toca em dependências (senão o orquestrador mata-o por culpa da BD)."""
    return Saude(estado="ok", versao=s.cfg.versao, fornecedor=s.cfg.modelo_fornecedor)


@router.get(
    "/readyz",
    response_model=Saude,
    tags=["operacao"],
    responses={503: {"description": "Não está pronto para receber tráfego"}},
)
def prontidao(s: Annotated[Any, Depends(servicos)], resposta: Response) -> Saude:
    """Pronto: a base de dados responde e o índice tem chunks."""
    try:
        chunks = s.sistema.indice.contar_chunks()
    except Exception:
        chunks = -1
    detalhes = {"chunks": chunks, "repositorio": s.repo.pronto()}
    ok = chunks > 0 and detalhes["repositorio"]
    if not ok:
        resposta.status_code = 503
    return Saude(
        estado="ok" if ok else "degradado", versao=s.cfg.versao, fornecedor=s.cfg.modelo_fornecedor, detalhes=detalhes
    )


@router.get("/metrics", tags=["operacao"], include_in_schema=False)
def metricas() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
