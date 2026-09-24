"""O grafo do «Balcão» em LangGraph: router explícito, agente com limite e aprovação humana.

```
START ─► guarda_entrada ─► classificar ─┬─► responder_rag ─────────────────────────────┐
                                        ├─► agente ◄──► ferramentas ─► preparar_aprovacao │
                                        │     │                         └─► aguardar_aprovacao (interrupt)
                                        └─► escalar ──────────────────────────────────────┤
                                                                           guarda_saida ◄─┘ ─► [resumir] ─► END
```

Porque um grafo com router e não um agente ReAct livre (adr-0013): 49% das
mensagens (política e fora de âmbito) não precisam de ferramentas nenhumas, e
os casos de saúde têm de ir para um humano *antes* de qualquer modelo decidir.
O agente só entra quando há um pedido concreto, e com um orçamento de chamadas
de ferramentas por turno (RI-06).

Reembolsos acima de 500 MZN param num `interrupt()` (adr-0015). O estado fica
no checkpointer (memória nos testes, PostgreSQL em produção, adr-0014) e a
conversa é retomada com `Command(resume={"aprovado": ..., "revisor": ...})`,
horas depois, noutro processo.
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph, add_messages
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode
from langgraph.prebuilt.tool_node import ToolCallRequest
from langgraph.types import Command, interrupt
from pydantic import BaseModel, Field

from balcao import didactico, memoria, observabilidade
from balcao.cadeias import Prompt, carregar_prompt, criar_cadeia_rag
from balcao.config import Configuracao
from balcao.ferramentas import LEITURA, Mundo, cliente_do_contexto, criar_ferramentas
from balcao.guardas import avaliar_entrada, validar_saida
from balcao.ingestao import carregar_corpus, ingerir
from balcao.modelos import criar_embeddings, criar_modelo, nome_embeddings
from balcao.recuperacao import Indice, IndiceMemoria, RecuperadorHibrido, criar_indice, criar_recuperador

__all__ = [
    "Classificacao",
    "Dependencias",
    "EstadoBalcao",
    "Intencao",
    "Sistema",
    "classificar_heuristica",
    "compilar",
    "config_de_execucao",
    "construir_grafo",
    "montar_sistema",
]

log = logging.getLogger(__name__)

Intencao = Literal["onde-esta", "compensacao", "politica", "pagamentos", "conta", "seguranca", "humano", "outros"]

_RE_PEDIDO = re.compile(r"\bPD-\d{7}\b")


# ===================================================================== estado


class EstadoBalcao(TypedDict, total=False):
    """O estado de uma conversa. `messages` tem reducer (junta); os outros canais substituem."""

    messages: Annotated[list[AnyMessage], add_messages]
    cliente_id: str
    intencao: Intencao
    pedido_id: str | None
    pedido_na_mensagem: bool
    injeccao: dict[str, Any]
    contexto: list[dict[str, Any]]
    citacoes: list[str]
    aprovacao: dict[str, Any] | None
    resumo: str
    chamadas_ferramentas: int
    origem: Literal["rag", "agente", "escalar", "aprovacao"]
    recusa: bool


class Classificacao(BaseModel):
    """Saída estruturada do classificador (escalão pequeno)."""

    intencao: Intencao
    pedido_id: str = Field(default="", description="Número PD-NNNNNNN referido, ou vazio.")
    confianca: float = Field(ge=0, le=1)


@dataclass
class Dependencias:
    """Tudo o que os nós usam. Construído uma vez no arranque (`api/app.py`)."""

    cfg: Configuracao
    modelo: BaseChatModel
    modelo_classificar: BaseChatModel
    cadeia_rag: Runnable[dict[str, Any], dict[str, Any]]
    ferramentas: Sequence[BaseTool]
    mundo: Mundo
    sistema: Prompt | None = None
    classificar_prompt: Prompt | None = None


# ============================================================ classificação

# Regras deterministas antes de qualquer modelo: saúde e segurança nunca
# dependem de um classificador probabilístico acertar (RF-04).
_SAUDE = re.compile(
    r"alergic|reac?cao alergica|inchad|intoxic|vomit|hospital|sintoma|ambulanc|respirar|desmai|passou mal|envenen"
)
_SEGURANCA = re.compile(r"ameac|assalt|agred|arma\b|assedi|violen")
_HUMANO = re.compile(r"\b(falar|quero|passa\w*|chama\w*)\b.{0,30}\b(humano|pessoa|agente|colega|operador|gerente)")
_COMPENSACAO = re.compile(
    r"reembols|devol|dinheiro|compens|estorno|cupao|atras|nao chegou|nao recebi|falt|errad|fria|frio"
)
_PAGAMENTOS = re.compile(r"cobrad|cobranc|m-pesa|mpesa|e-mola|emola|cartao|pagamento|pagar|\bpin\b|numerario|troco")
_CONTA = re.compile(r"\bconta\b|telefone|numero novo|mudei de numero|dados pessoais|apagar|palavra-passe|password")


def classificar_heuristica(texto: str) -> Classificacao:
    """Classificador por regras: exacto nos casos óbvios, grosseiro nos outros.

    É o classificador do modo simulado e a rede de segurança do modo real.
    """
    # `[TELEFONE]`, `[EMAIL]`: marcas da guarda de entrada, não palavras do cliente.
    t = didactico.normalizar(re.sub(r"\[[A-Z_]+\]", " ", texto))
    m = _RE_PEDIDO.search(texto)
    pedido = m.group(0) if m else ""
    if _SAUDE.search(t) or _SEGURANCA.search(t):
        return Classificacao(intencao="seguranca", pedido_id=pedido, confianca=0.95)
    if _HUMANO.search(t):
        return Classificacao(intencao="humano", pedido_id=pedido, confianca=0.9)
    if pedido:
        if _COMPENSACAO.search(t):
            return Classificacao(intencao="compensacao", pedido_id=pedido, confianca=0.8)
        if _PAGAMENTOS.search(t):
            return Classificacao(intencao="pagamentos", pedido_id=pedido, confianca=0.7)
        return Classificacao(intencao="onde-esta", pedido_id=pedido, confianca=0.8)
    if _PAGAMENTOS.search(t):
        return Classificacao(intencao="pagamentos", confianca=0.6)
    if _CONTA.search(t):
        return Classificacao(intencao="conta", confianca=0.6)
    return Classificacao(intencao="politica", confianca=0.5)


# ======================================================================= grafo


def _ultima_humana(estado: EstadoBalcao) -> HumanMessage:
    for m in reversed(estado.get("messages", [])):
        if isinstance(m, HumanMessage):
            return m
    raise ValueError("estado sem mensagem do cliente")


def _mensagens_do_turno(estado: EstadoBalcao) -> list[AnyMessage]:
    """As mensagens depois da última mensagem do cliente."""
    msgs = estado.get("messages", [])
    for i in range(len(msgs) - 1, -1, -1):
        if isinstance(msgs[i], HumanMessage):
            return list(msgs[i + 1 :])
    return []


def _resultado(m: ToolMessage) -> dict[str, Any]:
    try:
        dados = json.loads(m.text)
    except json.JSONDecodeError:
        return {}
    return dados if isinstance(dados, dict) else {}


def construir_grafo(dep: Dependencias) -> StateGraph[EstadoBalcao]:
    """Monta o `StateGraph` (sem compilar). Os nós fecham sobre `dep`."""
    cfg = dep.cfg
    sistema = dep.sistema or carregar_prompt("sistema", cfg.dir_prompts)
    prompt_classificar = dep.classificar_prompt or carregar_prompt("classificar", cfg.dir_prompts)
    por_nome = {t.name: t for t in dep.ferramentas}
    simulado = getattr(dep.modelo, "_llm_type", "") == "balcao-simulado"

    # ------------------------------------------------------------------ nós

    def guarda_entrada(estado: EstadoBalcao) -> dict[str, Any]:
        """Mascara PII e pontua injecção. Repõe os canais que valem só para um turno."""
        humana = _ultima_humana(estado)
        av = avaliar_entrada(humana.text, cfg.limiar_injeccao)
        act: dict[str, Any] = {
            "injeccao": {"score": av.injeccao, "sinais": list(av.sinais), "suspeita": av.suspeita, "pii": list(av.pii)},
            "contexto": [],
            "citacoes": [],
            "chamadas_ferramentas": 0,
            "recusa": False,
        }
        if av.texto != humana.text:
            # Mesmo id: o reducer `add_messages` substitui a mensagem em vez de juntar.
            act["messages"] = [HumanMessage(content=av.texto, id=humana.id)]
        if av.suspeita:
            observabilidade.INJECCOES.inc()
            log.warning("suspeita de injecção (score=%.2f): %s", av.injeccao, av.sinais)
        return act

    def classificar(estado: EstadoBalcao, config: RunnableConfig) -> dict[str, Any]:
        texto = _ultima_humana(estado).text
        regra = classificar_heuristica(texto)
        c = regra
        if not simulado and regra.intencao not in ("seguranca", "humano"):
            try:
                estruturado = dep.modelo_classificar.with_structured_output(Classificacao)
                pedido = prompt_classificar.texto.replace("{mensagem}", texto)
                saida = estruturado.invoke([SystemMessage(pedido)], config)
                if isinstance(saida, Classificacao):
                    c = saida
            except Exception:  # o classificador falhar não pode parar a conversa
                log.exception("classificador falhou; fica a heurística")
        na_mensagem = c.pedido_id or regra.pedido_id
        # O pedido de que se fala mantém-se entre turnos («E quando chega?»).
        return {
            "intencao": c.intencao,
            "pedido_id": na_mensagem or estado.get("pedido_id"),
            "pedido_na_mensagem": bool(na_mensagem),
        }

    def responder_rag(estado: EstadoBalcao, config: RunnableConfig) -> dict[str, Any]:
        msgs = estado.get("messages", [])
        historico = memoria.janela(msgs[:-1], cfg.janela_tokens_historico)
        r = dep.cadeia_rag.invoke({"pergunta": _ultima_humana(estado).text, "historico": historico}, config)
        contexto = [
            {
                "id": d.metadata["documento_id"],
                "titulo": d.metadata.get("titulo", ""),
                "publico": d.metadata.get("publico"),
                "vigente": d.metadata.get("vigente"),
                "score": d.metadata.get("score"),
            }
            for d in r["documentos"]
        ]
        return {
            "messages": [AIMessage(content=r["resposta"])],
            "contexto": contexto,
            "citacoes": r["citacoes"],
            "recusa": r["recusa"],
            "origem": "rag",
        }

    def agente(estado: EstadoBalcao, config: RunnableConfig) -> dict[str, Any]:
        """O modelo decide a próxima ferramenta. Com suspeita de injecção, só vê as de leitura."""
        permitidas = [t for t in dep.ferramentas if not estado.get("injeccao", {}).get("suspeita") or t.name in LEITURA]
        modelo = dep.modelo.bind_tools(permitidas)
        resumo = estado.get("resumo", "")
        prefixo = SystemMessage(sistema.texto + (f"\n\nResumo da conversa até aqui: {resumo}" if resumo else ""))
        # O turno actual (pergunta, chamadas e resultados) vai sempre inteiro; só o
        # histórico anterior é cortado à janela.
        msgs = estado.get("messages", [])
        turno = _mensagens_do_turno(estado)
        inicio = len(msgs) - len(turno) - 1
        historico = memoria.janela(msgs[:inicio], cfg.janela_tokens_historico) + msgs[inicio:]
        resp = modelo.invoke([prefixo, *historico], config)
        usadas = estado.get("chamadas_ferramentas", 0)
        pedidas = len(getattr(resp, "tool_calls", []) or [])
        if pedidas and usadas + pedidas > cfg.max_chamadas_ferramentas:
            # Orçamento esgotado: descarta as chamadas (uma chamada sem resultado
            # parte o histórico nos fornecedores reais) e escala.
            log.warning("limite de %d chamadas de ferramentas no turno", cfg.max_chamadas_ferramentas)
            observabilidade.LIMITES.inc()
            return {"origem": "agente", "intencao": "humano"}
        return {"messages": [resp], "chamadas_ferramentas": usadas + pedidas, "origem": "agente"}

    def politica_ferramentas(request: ToolCallRequest, executar: Any) -> ToolMessage | Command[Any]:
        """Interceptor do `ToolNode`: a última palavra sobre o que corre, e a métrica de cada chamada."""
        nome = request.tool_call["name"]
        suspeita = (
            (request.state or {}).get("injeccao", {}).get("suspeita") if isinstance(request.state, dict) else False
        )
        if suspeita and nome not in LEITURA:
            observabilidade.FERRAMENTAS.labels(ferramenta=nome, resultado="recusada").inc()
            return ToolMessage(
                content=json.dumps({"erro": "acção não permitida neste turno", "codigo": "POLITICA"}),
                name=nome,
                tool_call_id=request.tool_call["id"],
                status="error",
            )
        with observabilidade.span_ferramenta(nome, request.tool_call.get("id")):
            r = executar(request)
        erro = isinstance(r, ToolMessage) and ('"erro"' in r.text or r.status == "error")
        observabilidade.FERRAMENTAS.labels(ferramenta=nome, resultado="erro" if erro else "ok").inc()
        return r

    ferramentas = ToolNode(dep.ferramentas, wrap_tool_call=politica_ferramentas, handle_tool_errors=True)

    def preparar_aprovacao(estado: EstadoBalcao, config: RunnableConfig) -> dict[str, Any]:
        """Regista o pedido de aprovação (idempotente) e diz ao cliente o que vai acontecer."""
        pedido: dict[str, Any] = {}
        for m in _mensagens_do_turno(estado):
            if isinstance(m, ToolMessage):
                d = _resultado(m)
                if m.name == "pedir_aprovacao" and d.get("aprovacao_id"):
                    pedido["aprovacao_id"] = d["aprovacao_id"]
                if m.name == "calcular_reembolso" and d.get("precisa_aprovacao"):
                    pedido.update(pedido_id=d["pedido"], valor_mzn=d["valor_mzn"], motivo=d["motivo"], regra=d["regra"])
        if "aprovacao_id" in pedido:
            ap = dep.mundo.aprovacoes[pedido["aprovacao_id"]]
        else:
            ap = dep.mundo.registar_aprovacao(
                str((config.get("configurable") or {}).get("thread_id", "sem-fio")),
                cliente_do_contexto(config),
                pedido["pedido_id"],
                int(pedido["valor_mzn"]),
                pedido["motivo"],
                pedido.get("regra", ""),
            )
        valor = f"{ap['valor_mzn']:,}".replace(",", " ")
        texto = (
            f"O pedido {ap['pedido_id']} tem direito a um reembolso de {valor} MZN. Como o valor passa o limite que "
            "posso aprovar sozinho, um colega vai confirmar; a resposta chega em menos de 4 horas úteis."
        )
        aprovacao = {k: ap[k] for k in ("id", "fio", "pedido_id", "valor_mzn", "motivo", "cliente_id", "estado")}
        return {"messages": [AIMessage(content=texto)], "aprovacao": aprovacao, "origem": "aprovacao"}

    def aguardar_aprovacao(estado: EstadoBalcao) -> dict[str, Any]:
        """Pára o grafo até um humano decidir. Nada antes do `interrupt()` tem efeitos:
        na retoma, o nó corre outra vez desde o início."""
        ap = estado["aprovacao"] or {}
        decisao = interrupt({"tipo": "aprovacao_reembolso", **ap})
        if not isinstance(decisao, dict) or "aprovado" not in decisao:
            raise ValueError("a retoma tem de trazer {'aprovado': bool, 'revisor': str}")
        revisor = str(decisao.get("revisor", "desconhecido"))
        if decisao["aprovado"]:
            r = dep.mundo.emitir_reembolso_aprovado(ap, revisor)
            texto = (
                f"Boas notícias: o reembolso de {ap['valor_mzn']} MZN do pedido {ap['pedido_id']} foi aprovado. "
                f"Referência {r.get('referencia', '—')}; vai para o meio de pagamento original."
            )
            novo = {**ap, "estado": "aprovada", "revisor": revisor, "referencia": r.get("referencia")}
        else:
            dep.mundo.recusar_aprovacao(ap, revisor)
            nota = str(decisao.get("nota") or "")
            texto = "Um colega reviu o seu pedido e não foi possível aprovar o reembolso." + (
                f" {nota}" if nota else ""
            )
            novo = {**ap, "estado": "recusada", "revisor": revisor}
        return {"messages": [AIMessage(content=texto)], "aprovacao": novo, "origem": "aprovacao"}

    def escalar(estado: EstadoBalcao, config: RunnableConfig) -> dict[str, Any]:
        """Passa a um humano com resumo; em saúde e segurança, prioridade urgente e a saúde primeiro."""
        humana = _ultima_humana(estado)
        urgente = estado.get("intencao") == "seguranca"
        partes = [f"Intenção: {estado.get('intencao')}."]
        if estado.get("pedido_id"):
            partes.append(f"Pedido: {estado['pedido_id']}.")
        partes.append(f"Mensagem do cliente: «{humana.text[:400]}».")
        if estado.get("resumo"):
            partes.append(f"Antes: {estado['resumo']}")
        r = por_nome["transferir_humano"].invoke(
            {"resumo": " ".join(partes), "prioridade": "urgente" if urgente else "normal"}, config
        )
        espera = r.get("espera_estimada_min", "alguns") if isinstance(r, dict) else "alguns"
        if urgente and _SAUDE.search(didactico.normalizar(humana.text)):
            texto = (
                "A prioridade é a saúde: procure assistência médica de imediato. "
                "Estou a passar o caso a um colega com urgência."
            )
        elif urgente:
            texto = "Estou a passar o seu caso a um colega com urgência."
        else:
            texto = (
                f"Vou passar a conversa a um colega, já com o resumo do caso. Tempo de espera estimado: {espera} min."
            )
        return {"messages": [AIMessage(content=texto)], "origem": "escalar"}

    def guarda_saida(estado: EstadoBalcao) -> dict[str, Any]:
        """Última camada: citações só de documentos vistos neste turno, públicos e em vigor; PII mascarada."""
        ultima = estado["messages"][-1]
        if not isinstance(ultima, AIMessage):
            return {}
        permitidas: dict[str, dict[str, Any]] = {c["id"]: c for c in estado.get("contexto", [])}
        for m in _mensagens_do_turno(estado):
            if isinstance(m, ToolMessage) and m.name == "pesquisar_conhecimento":
                for ex in _resultado(m).get("resultados", []):
                    permitidas[ex["fonte"]] = ex
        r = validar_saida(ultima.text, permitidas, exigir_citacao=estado.get("origem") == "rag")
        if r.sem_suporte:
            observabilidade.RECUSAS.labels(motivo="sem_citacao").inc()
        elif estado.get("recusa"):
            observabilidade.RECUSAS.labels(motivo="sem_relevancia").inc()
        act: dict[str, Any] = {"citacoes": r.citacoes, "recusa": estado.get("recusa", False) or r.sem_suporte}
        if r.alterado:
            act["messages"] = [AIMessage(content=r.texto, id=ultima.id)]
        return act

    def resumir(estado: EstadoBalcao) -> dict[str, Any]:
        antigas = memoria.mensagens_a_resumir(estado["messages"], manter=cfg.mensagens_antes_de_resumir // 2)
        if not antigas:
            return {}
        novo = memoria.resumir(estado.get("resumo", ""), antigas, None if simulado else dep.modelo_classificar)
        return {"resumo": novo, "messages": memoria.remover(antigas)}

    # --------------------------------------------------------------- routers

    def router(estado: EstadoBalcao) -> Literal["responder_rag", "agente", "escalar"]:
        intencao = estado.get("intencao")
        if intencao in ("seguranca", "humano"):
            return "escalar"
        # O agente só entra com um pedido concreto: referido nesta mensagem, ou
        # num turno anterior quando a intenção é claramente sobre esse pedido.
        if intencao in ("onde-esta", "compensacao", "pagamentos") and estado.get("pedido_na_mensagem"):
            return "agente"
        if intencao in ("onde-esta", "compensacao") and estado.get("pedido_id"):
            return "agente"
        return "responder_rag"

    def depois_agente(estado: EstadoBalcao) -> Literal["ferramentas", "escalar", "guarda_saida"]:
        ultima = estado["messages"][-1]
        if isinstance(ultima, AIMessage) and ultima.tool_calls:
            return "ferramentas"
        if estado.get("intencao") == "humano":
            return "escalar"
        return "guarda_saida"

    def depois_ferramentas(estado: EstadoBalcao) -> Literal["preparar_aprovacao", "agente"]:
        for m in _mensagens_do_turno(estado):
            if not isinstance(m, ToolMessage):
                continue
            d = _resultado(m)
            if (m.name == "pedir_aprovacao" and d.get("aprovacao_id")) or (
                m.name == "calcular_reembolso" and d.get("precisa_aprovacao")
            ):
                return "preparar_aprovacao"
        return "agente"

    def precisa_resumo(estado: EstadoBalcao) -> str:
        return "resumir" if len(estado.get("messages", [])) > cfg.mensagens_antes_de_resumir else END

    # ---------------------------------------------------------------- arestas

    g = StateGraph(EstadoBalcao)
    g.add_node("guarda_entrada", guarda_entrada)
    g.add_node("classificar", classificar)
    g.add_node("responder_rag", responder_rag)
    g.add_node("agente", agente)
    g.add_node("ferramentas", ferramentas)
    g.add_node("preparar_aprovacao", preparar_aprovacao)
    g.add_node("aguardar_aprovacao", aguardar_aprovacao)
    g.add_node("escalar", escalar)
    g.add_node("guarda_saida", guarda_saida)
    g.add_node("resumir", resumir)

    g.add_edge(START, "guarda_entrada")
    g.add_edge("guarda_entrada", "classificar")
    g.add_conditional_edges("classificar", router, ["responder_rag", "agente", "escalar"])
    g.add_edge("responder_rag", "guarda_saida")
    g.add_conditional_edges("agente", depois_agente, ["ferramentas", "escalar", "guarda_saida"])
    g.add_conditional_edges("ferramentas", depois_ferramentas, ["preparar_aprovacao", "agente"])
    g.add_edge("preparar_aprovacao", "aguardar_aprovacao")
    g.add_edge("aguardar_aprovacao", "guarda_saida")
    g.add_edge("escalar", "guarda_saida")
    g.add_conditional_edges("guarda_saida", precisa_resumo, ["resumir", END])
    g.add_edge("resumir", END)
    return g


def compilar(
    dep: Dependencias, checkpointer: BaseCheckpointSaver[Any] | None = None
) -> CompiledStateGraph[EstadoBalcao, None, EstadoBalcao, EstadoBalcao]:
    """Compila com o checkpointer dado; sem nenhum, `InMemorySaver` (testes e laboratório)."""
    return construir_grafo(dep).compile(checkpointer=checkpointer or InMemorySaver(), name="balcao")


def config_de_execucao(conversa_id: str, cliente_id: str, cfg: Configuracao, **extra: Any) -> RunnableConfig:
    """A config de cada turno: o fio da conversa, o cliente autenticado e o limite de passos."""
    return {
        "configurable": {"thread_id": conversa_id, "cliente_id": cliente_id},
        "recursion_limit": cfg.recursion_limit,
        "metadata": {"conversa_id": conversa_id, **extra},
        "tags": ["balcao"],
    }


# ==================================================================== sistema


@dataclass
class Sistema:
    """As peças montadas a partir da configuração: índice, recuperador, modelos, cadeia, ferramentas.

    A API, a avaliação e o servidor MCP montam o sistema da mesma maneira; só
    o checkpointer (e o ciclo de vida das ligações) muda entre eles.
    """

    cfg: Configuracao
    embeddings: Embeddings
    indice: Indice
    recuperador: RecuperadorHibrido
    modelo: BaseChatModel
    modelo_classificar: BaseChatModel
    cadeia_rag: Runnable[dict[str, Any], dict[str, Any]]
    mundo: Mundo
    ferramentas: list[BaseTool] = field(default_factory=list)

    @property
    def dependencias(self) -> Dependencias:
        return Dependencias(
            self.cfg, self.modelo, self.modelo_classificar, self.cadeia_rag, self.ferramentas, self.mundo
        )

    def compilar(
        self, checkpointer: BaseCheckpointSaver[Any] | None = None
    ) -> CompiledStateGraph[EstadoBalcao, None, EstadoBalcao, EstadoBalcao]:
        return compilar(self.dependencias, checkpointer)


def montar_sistema(cfg: Configuracao, indice: Indice | None = None, ingerir_corpus: bool = True) -> Sistema:
    """Constrói tudo o que o grafo precisa. Com o índice em memória vazio, ingere o corpus de amostra."""
    embeddings = criar_embeddings(cfg)
    indice = indice or criar_indice(cfg, embeddings)
    em_memoria = isinstance(indice, IndiceMemoria)
    if ingerir_corpus and (em_memoria or cfg.ingerir_no_arranque) and indice.contar_chunks() == 0:
        ingerir(carregar_corpus(), indice, cfg, nome_embeddings(cfg))
    recuperador = criar_recuperador(cfg, indice, embeddings)
    modelo = criar_modelo(cfg, "responder")
    modelo_classificar = criar_modelo(cfg, "classificar")
    cadeia = criar_cadeia_rag(modelo, recuperador, cfg, modelo_reformular=modelo_classificar)
    mundo = Mundo(cfg.limite_reembolso_mzn)

    def pesquisar(consulta: str, k: int) -> list[dict[str, Any]]:
        return [
            {
                "fonte": d.metadata["documento_id"],
                "titulo": d.metadata.get("titulo", ""),
                "texto": d.page_content,
                "publico": d.metadata.get("publico"),
                "vigente": d.metadata.get("vigente"),
            }
            for d, _ in recuperador.pesquisar_com_scores(consulta, k)
        ]

    return Sistema(
        cfg,
        embeddings,
        indice,
        recuperador,
        modelo,
        modelo_classificar,
        cadeia,
        mundo,
        criar_ferramentas(mundo, pesquisar),
    )
