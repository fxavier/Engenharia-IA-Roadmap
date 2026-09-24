import type { Section } from '../types';

/* Secções 4 a 6 do módulo 16: streaming, Send e Command, ToolNode, limites e subgrafos. */

export const seccoesB: Section[] = [
  /* ================================================================= 4 */
  {
    id: 'stream',
    title: 'Modos de `stream`: `values`, `updates`, `messages`, `custom`',
    blocks: [
      {
        type: 'p',
        text:
          'Um grafo compilado é um `Runnable`, por isso tem `invoke` e `stream`. O `stream` do LangGraph recebe `stream_mode`, que diz **o que** queres ver a cada passo. Em `langgraph` 1.2 os valores são `values`, `updates`, `checkpoints`, `tasks`, `debug`, `messages` e `custom`, e podes pedir vários de uma vez com uma lista; nesse caso cada item chega como tuplo `(modo, dados)`.',
      },
      {
        type: 'table',
        head: ['`stream_mode`', 'O que emite', 'Uso no «Balcão»'],
        rows: [
          ['`"values"`', 'o estado completo depois de cada superstep', 'depuração; testes que olham para o estado intermédio'],
          ['`"updates"`', '`{nó: actualização}` de cada nó que correu', 'traço de trajectória (que nós, por que ordem); avaliação de agentes'],
          ['`"messages"`', 'tuplos `(pedaço_de_mensagem, metadados)` dos modelos chamados dentro dos nós, token a token; `metadados["langgraph_node"]` diz de que nó veio', 'tokens para o SSE, filtrando só os nós que falam com o cliente'],
          ['`"custom"`', 'o que os nós escreverem com `get_stream_writer()`', 'eventos de progresso: «a consultar o pedido…»'],
          ['`"checkpoints"`, `"tasks"`, `"debug"`', 'checkpoints gravados, tarefas iniciadas e terminadas, tudo', 'ferramentas de depuração; nunca para o cliente'],
        ],
        caption: 'Os modos de `stream` do LangGraph 1.2. O `invoke` usa `values` por baixo e devolve só o último.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'A rota de mensagens combina `updates` (para saber em que nó está) com `messages` (para os tokens). Os tokens do classificador não interessam ao cliente: filtra-se pelo nó.',
        code: `NOS_QUE_FALAM = {"responder_rag", "agente", "escalar", "preparar_aprovacao"}

async def eventos_do_turno(grafo, entrada, config):
    async for modo, dados in grafo.astream(entrada, config, stream_mode=["updates", "messages"]):
        if modo == "messages":
            pedaco, meta = dados
            if meta.get("langgraph_node") in NOS_QUE_FALAM and pedaco.text:
                yield {"tipo": "token", "texto": pedaco.text}
        elif modo == "updates":
            for no, act in dados.items():
                if no == "__interrupt__":
                    yield {"tipo": "aprovacao_pendente"}
                else:
                    yield {"tipo": "no", "no": no}`,
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Eventos próprios a partir de dentro de um nó. O `get_stream_writer` só emite quando `"custom"` está nos modos pedidos; noutros casos, a escrita é ignorada.',
        code: `from langgraph.config import get_stream_writer

def pesquisar(estado: dict) -> dict:
    escrever = get_stream_writer()
    escrever({"a_pesquisar": estado["consulta"]})          # -> ("custom", {...})
    res = recuperador.invoke(estado["consulta"])
    return {"excertos": [d.metadata["documento_id"] for d in res]}`,
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-langgraph-01',
          title: 'Um turno com ferramenta em streaming: o que sai do grafo e o que chega ao cliente',
          intro: '«O meu pedido PD-8842507 ainda vai demorar muito?», com `stream_mode=["updates", "messages"]`. O grafo emite muito mais do que o cliente vê.',
          lanes: [
            { id: 'cliente', label: 'App do cliente', kind: 'client' },
            { id: 'api', label: 'API', sub: 'SSE', kind: 'service' },
            { id: 'grafo', label: 'Grafo', sub: 'astream', kind: 'agent' },
            { id: 'pg', label: 'PostgresSaver', kind: 'store' },
          ],
          steps: [
            { from: 'api', to: 'grafo', label: 'astream({messages, cliente_id}, config)', detail: '`thread_id` = id da conversa, `recursion_limit` = 25.', kind: 'req', ms: 5 },
            { from: 'grafo', to: 'api', label: 'updates: guarda_entrada, classificar', detail: 'A API não os mostra; ficam no traço.', kind: 'async', ms: 375 },
            { from: 'grafo', to: 'pg', label: 'checkpoint por superstep', detail: '≈ 6 por turno, fora do caminho do primeiro token.', kind: 'async', ms: 25 },
            { from: 'grafo', to: 'api', label: 'updates: agente (tool_calls), ferramentas', kind: 'async', ms: 1120, tokens: 5200 },
            { from: 'api', to: 'cliente', label: 'evento «a consultar o pedido»', detail: 'Derivado do update do nó `ferramentas`: o cliente sabe que algo está a acontecer.', kind: 'res', ms: 5 },
            { from: 'grafo', to: 'api', label: 'messages: tokens do nó agente', detail: 'Só os pedaços com `langgraph_node == "agente"` passam.', kind: 'async', ms: 1500, tokens: 30 },
            { from: 'api', to: 'cliente', label: 'tokens: «O pedido está em preparação…»', kind: 'res', ms: 5 },
            { from: 'grafo', to: 'api', label: 'updates: guarda_saida', detail: 'Se a guarda alterou o texto, a API envia o texto final para substituir.', kind: 'async', ms: 30 },
          ],
          outro: 'O `stream` não muda o que o grafo faz: muda o que observas. A mesma execução dá o SSE para o cliente e a trajectória para o traço.',
        },
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Streaming e guardas de saída',
        text:
          'Com `stream_mode="messages"`, os tokens do nó `agente` saem antes de a `guarda_saida` correr. É o mesmo compromisso da cadeia RAG (módulo 13): o protocolo SSE do «Balcão» tem um evento final com o texto validado que substitui o que foi mostrado. Um nó que produz texto que **nunca** pode ser mostrado sem validação (por exemplo, com dados de outro cliente) não entra em `NOS_QUE_FALAM`.',
      },
      {
        type: 'p',
        text:
          'Uma nota de versões: `CompiledStateGraph.stream` em `langgraph` 1.2 aceita também `version="v2"`, que muda a forma dos itens emitidos. O código deste tutorial usa o formato por omissão (`v1`); se mudares, muda em todos os consumidores ao mesmo tempo e cobre-o com o teste de streaming.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — streaming', url: 'https://docs.langchain.com/oss/python/langgraph/streaming' },
          { label: 'LangGraph — event streaming', url: 'https://docs.langchain.com/oss/python/langgraph/event-streaming' },
        ],
      },
    ],
  },

  /* ================================================================= 5 */
  {
    id: 'send-command',
    title: '`Send` para fan-out e `Command` para decidir e actualizar num só passo',
    blocks: [
      {
        type: 'p',
        text:
          'Arestas condicionais escolhem **um** caminho (ou uma lista fixa de nós). Às vezes o número de tarefas só se sabe em execução: uma pergunta com três aspectos dá três pesquisas; um pedido com cinco artigos em falta dá cinco verificações. `Send(nó, argumento)` resolve isso: o router devolve uma lista de `Send`, e cada um cria uma tarefa desse nó, com o seu próprio estado de entrada, no mesmo superstep. É o *map* do map-reduce; o *reduce* é o reducer do canal onde as tarefas escrevem.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Multi-query com `Send` (corre com o runtime do laboratório). O canal `excertos` tem `operator.add`: sem reducer, duas tarefas a escrever no mesmo superstep dão `InvalidUpdateError`.',
        code: `import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

class Estado(TypedDict):
    pergunta: str
    consultas: list[str]
    excertos: Annotated[list[str], operator.add]

def planear(e: Estado) -> dict:
    return {"consultas": ["reembolso m-pesa prazo", "cupão validade"]}

def espalhar(e: Estado) -> list[Send]:
    return [Send("pesquisar", {"consulta": q}) for q in e["consultas"]]

def pesquisar(e: dict) -> dict:                 # recebe o argumento do Send, não o estado
    c, _ = d.recuperar(e["consulta"], 1, "rerank", {"vigente": True})[0]
    return {"excertos": [c.doc]}

g = StateGraph(Estado)
g.add_node("planear", planear)
g.add_node("pesquisar", pesquisar)
g.add_node("juntar", lambda e: {})
g.add_edge(START, "planear")
g.add_conditional_edges("planear", espalhar, ["pesquisar"])
g.add_edge("pesquisar", "juntar")
g.add_edge("juntar", END)
g.compile().invoke({"pergunta": "...", "excertos": []})["excertos"]
# ['pol-reembolso-prazos', 'pol-cupoes']   -> pela ordem dos Send, não de chegada`,
      },
      {
        type: 'run',
        run: {
          id: 'run-langgraph-03',
          title: 'Fan-out com `Send`, em Python puro',
          brief:
            'Didáctico: um superstep com três tarefas e um reducer de concatenação. No LangGraph as tarefas correm em paralelo; o resultado do reducer segue a ordem das tarefas, por isso é determinista mesmo que a segunda termine primeiro.',
          code: `# Fan-out com Send, em Python puro: um superstep com N tarefas e um reducer.
import balcao as b


def planear(estado):
    # multi-query: uma consulta por aspecto da pergunta (módulo 12)
    return ["prazo do reembolso no M-Pesa", "reembolso no cartão Visa", "cobrança duplicada"]


def pesquisar(tarefa):
    c, s = b.recuperar(tarefa["consulta"], 1, "rerank", {"vigente": True, "publico": "cliente"})[0]
    return {"excertos": [(tarefa["consulta"], c.doc, round(s, 3))]}


estado = {"pergunta": "Fui cobrado duas vezes e quero o dinheiro no cartão", "excertos": []}
envios = [{"consulta": q} for q in planear(estado)]         # [Send("pesquisar", {...}), ...]

# no LangGraph as tarefas do superstep correm em paralelo; aqui, uma a uma
actualizacoes = [pesquisar(t) for t in envios]              # resultados por ordem das tarefas

for a in actualizacoes:                                     # reducer operator.add
    estado["excertos"] = estado["excertos"] + a["excertos"]

for consulta, doc, score in estado["excertos"]:
    print(f"{consulta:<32} -> {doc:<24} {score}")
print("documentos distintos:", sorted({d for _, d, _ in estado["excertos"]}))`,
          expected: `prazo do reembolso no M-Pesa     -> pol-reembolso-prazos     0.523
reembolso no cartão Visa         -> pol-reembolso-prazos     0.634
cobrança duplicada               -> pol-cobranca-duplicada   0.404
documentos distintos: ['pol-cobranca-duplicada', 'pol-reembolso-prazos']`,
        },
      },
      {
        type: 'p',
        text:
          '`Command` resolve outro problema: um nó que quer **actualizar o estado e escolher o próximo nó** no mesmo passo, sem uma aresta condicional à parte. O nó devolve `Command(update={...}, goto="nó")`; a anotação de retorno `Command[Literal["a", "b"]]` diz ao `compile` e ao desenho do grafo para onde pode ir. `Command(resume=...)` é outra utilização da mesma classe: é o valor com que se retoma um grafo parado num `interrupt` (módulo 17).',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Classificar e encaminhar num só nó com `Command`. Útil quando a decisão e a actualização são inseparáveis; o «Balcão» prefere router separado, para testar a regra sem o nó.',
        code: `from typing import Literal
from langgraph.types import Command

def classificar(estado: EstadoBalcao) -> Command[Literal["escalar", "agente", "responder_rag"]]:
    c = classificar_heuristica(ultima_humana(estado).text)
    if c.intencao == "seguranca":
        return Command(update={"intencao": c.intencao}, goto="escalar")
    destino = "agente" if c.pedido_id else "responder_rag"
    return Command(update={"intencao": c.intencao, "pedido_id": c.pedido_id or None}, goto=destino)

g.add_node("classificar", classificar)       # sem add_conditional_edges: o Command decide`,
      },
      {
        type: 'compare',
        left: {
          title: 'Router separado (`add_conditional_edges`)',
          items: [
            'A regra é uma função pura do estado, testável sozinha.',
            'O nó só calcula; a decisão fica visível na topologia.',
            'Duas peças para manter em vez de uma.',
          ],
        },
        right: {
          title: '`Command(update=..., goto=...)`',
          items: [
            'Decisão e actualização juntas, sem estado intermédio.',
            'Necessário para handoffs entre agentes (módulo 19) e para ir para um nó de um grafo pai (`graph=Command.PARENT`).',
            'A regra fica dentro do nó: testa-se chamando o nó.',
          ],
        },
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Actualizações concorrentes sem reducer',
        text:
          'Duas tarefas do mesmo superstep (dois `Send`, ou dois nós em paralelo) a escrever no mesmo canal sem reducer fazem o LangGraph levantar `InvalidUpdateError` (erro `INVALID_CONCURRENT_GRAPH_UPDATE`): não há forma certa de escolher qual ganha. A correcção é declarar o reducer do canal, não serializar os nós.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — Graph API: Send e Command', url: 'https://docs.langchain.com/oss/python/langgraph/graph-api' },
          { label: 'LangGraph — INVALID_CONCURRENT_GRAPH_UPDATE', url: 'https://docs.langchain.com/oss/python/langgraph/errors/INVALID_CONCURRENT_GRAPH_UPDATE' },
        ],
      },
    ],
  },

  /* ================================================================= 6 */
  {
    id: 'toolnode-subgrafos',
    title: '`ToolNode`, `tools_condition`, `recursion_limit`, `RetryPolicy` e subgrafos',
    blocks: [
      {
        type: 'p',
        text:
          '`langgraph.prebuilt` traz duas peças para o ciclo de ferramentas. `ToolNode(ferramentas)` é um nó que lê a última `AIMessage`, executa as `tool_calls` (em paralelo) e devolve as `ToolMessage`s; aceita `handle_tool_errors` (converte excepções em mensagens de erro) e `wrap_tool_call` (um interceptor à volta de cada chamada). `tools_condition` é o router padrão: vai para `"tools"` se a última mensagem tem chamadas, senão para `END`.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O ciclo agente/ferramentas mínimo em LangGraph, com as peças prontas. O «Balcão» substitui `tools_condition` por routers próprios porque tem mais saídas (escalar, aprovação).',
        code: `from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

def agente(estado: MessagesState) -> dict:
    return {"messages": [modelo.bind_tools(ferramentas).invoke(estado["messages"])]}

g = StateGraph(MessagesState)                       # só o canal messages, com add_messages
g.add_node("agente", agente)
g.add_node("tools", ToolNode(ferramentas, handle_tool_errors=True))
g.add_edge(START, "agente")
g.add_conditional_edges("agente", tools_condition)  # -> "tools" ou END
g.add_edge("tools", "agente")
app = g.compile()
app.invoke({"messages": [("user", "Onde está o PD-8842507?")]}, {"recursion_limit": 10})`,
      },
      {
        type: 'table',
        head: ['Mecanismo', 'Onde se declara', 'O que protege', 'Nota'],
        rows: [
          ['`recursion_limit`', 'config de cada execução', 'ciclos sem saída', '10 007 por omissão no LangGraph 1.2; o «Balcão» passa 25. Levanta `GraphRecursionError`.'],
          ['`RetryPolicy`', '`add_node(..., retry_policy=RetryPolicy(max_attempts=3))`', 'falhas transitórias de um nó', '`initial_interval`, `backoff_factor`, `max_interval`, `jitter`, `retry_on`. Só em nós idempotentes.'],
          ['`timeout`', '`add_node(..., timeout=...)`', 'nós que ficam pendurados', 'Disponível em `add_node` no LangGraph 1.2; confirma na tua versão.'],
          ['orçamento no nó', 'código do nó `agente`', 'custo por turno', 'Degrada com elegância: escala com resumo em vez de rebentar.'],
        ],
        caption: 'Limites e retentativas ao nível do grafo. O orçamento de negócio fica no nó; o `recursion_limit` é para bugs.',
      },
      {
        type: 'p',
        text:
          'Um **subgrafo** é um grafo compilado usado como nó de outro: `g.add_node("rag", grafo_rag_compilado)`. Se os dois partilham chaves de estado (por exemplo, `messages`), o subgrafo lê e escreve nelas directamente; se não partilham, embrulhas a chamada numa função que traduz o estado de um para o outro. Serve para equipas diferentes manterem partes diferentes, para reutilizar o mesmo fluxo em dois grafos, ou para isolar um estado privado (as consultas intermédias de um RAG agêntico não precisam de ir para o checkpoint da conversa).',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Quando um subgrafo não compensa',
        text:
          'No «Balcão», a cadeia RAG é um `Runnable` LCEL chamado de dentro do nó `responder_rag`, não um subgrafo. Não tem estado próprio a persistir, não tem interrupts, e o seu traço já aparece dentro do nó. Um subgrafo acrescenta checkpoints por cada superstep interno; só compensa quando precisas de retomar ou inspeccionar a meio do fluxo interno.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O teste que prova que o `recursion_limit` pára um modelo que pede sempre mais uma ferramenta (de `tests/test_grafo.py`), com o orçamento de chamadas desligado de propósito.',
        code: `def test_recursion_limit_e_a_ultima_rede(sistema, cfg) -> None:
    c = cfg.model_copy(update={"max_chamadas_ferramentas": 1000, "recursion_limit": 8})
    s = dataclasses.replace(sistema, cfg=c, modelo=ModeloGuloso())
    with pytest.raises(GraphRecursionError):
        s.compilar().invoke(
            {"messages": [HumanMessage("Onde está o PD-8841273?")], "cliente_id": "CL-77120"},
            config_de_execucao("c-rec-lim", "CL-77120", c),
        )`,
      },
      { type: 'adr', ref: 'adr-0013' },
      {
        type: 'p',
        text:
          'O que ficou de fora de propósito: persistência entre turnos, `interrupt` e retoma, `get_state_history` e *time travel* são o módulo 17; a janela de histórico e o resumo (o nó `resumir`) são o módulo 18; grafos com vários agentes que se passam o controlo com `Command` são o módulo 19; avaliar trajectórias do grafo é o módulo 23.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — usar subgrafos', url: 'https://docs.langchain.com/oss/python/langgraph/use-subgraphs' },
          { label: 'LangGraph — tolerância a falhas (RetryPolicy)', url: 'https://docs.langchain.com/oss/python/langgraph/fault-tolerance' },
          { label: 'Referência — langgraph.prebuilt (ToolNode)', url: 'https://reference.langchain.com/python/langgraph/' },
        ],
      },
    ],
  },
];
