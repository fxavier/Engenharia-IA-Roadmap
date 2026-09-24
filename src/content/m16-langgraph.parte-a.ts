import type { Section } from '../types';

/* Secções 1 a 3 do módulo 16: estado e reducers, nós e arestas, o grafo do «Balcão». */

export const seccoesA: Section[] = [
  /* ================================================================= 1 */
  {
    id: 'estado',
    title: 'Estado com `TypedDict` e reducers: `add_messages` e `operator.add`',
    blocks: [
      {
        type: 'p',
        text:
          'O LangGraph modela um fluxo como uma **máquina de estados com memória partilhada**. O estado é um `TypedDict` (ou um dataclass, ou um modelo Pydantic); cada chave é um **canal**. Um nó é uma função que recebe o estado e devolve um `dict` parcial com as chaves que quer mudar. Quem decide como a actualização se junta ao valor anterior é o **reducer** do canal: sem reducer, o valor novo substitui o antigo; com reducer, os dois são combinados pela função que declaraste.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O estado de uma conversa do «Balcão» (de `grafo.py`). Só `messages` tem reducer; todos os outros canais substituem.',
        code: `from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages

class EstadoBalcao(TypedDict, total=False):
    messages: Annotated[list[AnyMessage], add_messages]   # junta (e substitui por id)
    cliente_id: str
    intencao: Literal["onde-esta", "compensacao", "politica", "pagamentos",
                      "conta", "seguranca", "humano", "outros"]
    pedido_id: str | None
    pedido_na_mensagem: bool
    injeccao: dict[str, Any]
    contexto: list[dict[str, Any]]
    citacoes: list[str]
    aprovacao: dict[str, Any] | None
    resumo: str
    chamadas_ferramentas: int
    origem: Literal["rag", "agente", "escalar", "aprovacao"]
    recusa: bool`,
      },
      {
        type: 'table',
        head: ['Reducer', 'Assinatura', 'Comportamento', 'Uso no «Balcão»'],
        rows: [
          ['nenhum', '—', 'o último valor escrito ganha', '`intencao`, `pedido_id`, `citacoes`, `aprovacao`: são do turno, não acumulam'],
          ['`add_messages`', '`(esquerda, direita) -> list`', 'junta listas de mensagens; uma mensagem com o mesmo `id` de uma existente **substitui-a**; `RemoveMessage(id=...)` apaga', '`messages`: histórico, com a mensagem do cliente substituída pela versão mascarada'],
          ['`operator.add`', '`(a, b) -> a + b`', 'concatena listas (ou soma números), sem ids', 'excertos de um fan-out com `Send` (secção 5)'],
          ['função tua', '`(antigo, novo) -> valor`', 'qualquer combinação determinista', 'ex. `max` para a prioridade mais alta vista no turno'],
        ],
        caption: 'Os reducers que interessam. Um reducer tem de ser determinista e associativo o suficiente para a ordem das actualizações de um superstep não mudar o resultado de forma imprevisível.',
      },
      {
        type: 'p',
        text:
          'O detalhe do `add_messages` que o «Balcão» usa de propósito: o nó `guarda_entrada` devolve `HumanMessage(content=texto_mascarado, id=humana.id)`. Como o id é o mesmo, o reducer **substitui** a mensagem original em vez de acrescentar outra. O número de telefone que o cliente escreveu nunca fica no checkpoint (há um teste para isso, `test_dados_pessoais_mascarados_no_checkpoint`), e os nós seguintes só vêem a versão mascarada.',
      },
      {
        type: 'run',
        run: {
          id: 'run-langgraph-01',
          title: 'Com e sem reducer, e o limite de passos num ciclo',
          brief:
            'Didáctico: `GrafoEstado` do `balcao` tem a forma do `StateGraph` (`add_node`, `add_edge`, `add_conditional_edges`, `compile`, `invoke`). Um ciclo agente/ferramentas com e sem reducer em `mensagens`, e um ciclo sem saída parado pelo limite de passos.',
          code: `# Reducers e ciclos: com e sem reducer, e o limite de passos como última rede.
import balcao as b
from balcao import START, END, GrafoEstado, adicionar


def construir(reducers, max_chamadas):
    def agente(e):
        if e["chamadas"] >= max_chamadas:
            return {"mensagens": ["resposta final"]}
        return {"mensagens": [f"tool_call #{e['chamadas'] + 1}"]}

    def ferramentas(e):
        return {"mensagens": ["resultado"], "chamadas": e["chamadas"] + 1}

    def depois_agente(e):
        return "ferramentas" if e["mensagens"][-1].startswith("tool_call") else END

    g = GrafoEstado(reducers=reducers)
    g.add_node("agente", agente).add_node("ferramentas", ferramentas)
    g.add_edge(START, "agente")
    g.add_conditional_edges("agente", depois_agente, {"ferramentas": "ferramentas", END: END})
    g.add_edge("ferramentas", "agente")
    return g


entrada = {"mensagens": ["Onde está o PD-8841273?"], "chamadas": 0}
com = construir({"mensagens": adicionar}, 2).compile().invoke(entrada)
print("com reducer:", com["mensagens"])
sem = construir({}, 2).compile().invoke(entrada)
print("sem reducer:", sem["mensagens"])

try:
    construir({"mensagens": adicionar}, 100).compile(max_passos=8).invoke(entrada)
except RuntimeError as e:
    print("RuntimeError:", e)`,
          expected: `com reducer: ['Onde está o PD-8841273?', 'tool_call #1', 'resultado', 'tool_call #2', 'resultado', 'resposta final']
sem reducer: ['resposta final']
RuntimeError: limite de 8 passos atingido (ciclo sem saída?)`,
        },
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O erro clássico: uma lista sem reducer',
        text:
          'Declarar `messages: list[AnyMessage]` sem `Annotated[..., add_messages]` compila, corre e parece funcionar no primeiro teste. Cada nó que devolve `{"messages": [resposta]}` **apaga** o histórico e deixa só a resposta, como na linha «sem reducer» acima. No ciclo do agente, o modelo deixa de ver a chamada que fez e o resultado que recebeu, e pede a mesma ferramenta outra vez. O erro inverso também existe: acumular com `operator.add` um canal que devia ser do turno (`citacoes`) faz citações do turno anterior passarem pela guarda de saída.',
      },
      {
        type: 'p',
        text:
          'Repara ainda em `total=False`: nenhum canal é obrigatório na entrada. O grafo do «Balcão» é invocado com `{"messages": [HumanMessage(texto)], "cliente_id": ...}` e os outros canais aparecem à medida que os nós os escrevem. Isto obriga os nós a ler com `estado.get("chave", omissão)`, o que é o preço de um estado que atravessa turnos com um checkpointer (módulo 17): um canal escrito no turno 1 ainda lá está no turno 3, e o `guarda_entrada` repõe explicitamente os canais que valem só para um turno.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — Graph API (estado, reducers)', url: 'https://docs.langchain.com/oss/python/langgraph/graph-api' },
          { label: 'Python — typing.TypedDict e Annotated', url: 'https://docs.python.org/3/library/typing.html#typing.TypedDict' },
        ],
      },
    ],
  },

  /* ================================================================= 2 */
  {
    id: 'nos-arestas',
    title: 'Nós, arestas, arestas condicionais, `START`/`END` e `compile`',
    blocks: [
      {
        type: 'p',
        text:
          'Um nó é qualquer callable `(estado) -> dict` ou `(estado, config) -> dict`; também pode ser um `Runnable` ou outro grafo compilado. Uma aresta normal (`add_edge("a", "b")`) diz que depois de `a` corre `b`. Uma aresta condicional (`add_conditional_edges("a", router, destinos)`) chama `router(estado)` depois de `a` e segue para o nó que ele devolver. `START` e `END` são os nós virtuais de entrada e de saída. `compile()` valida a topologia e devolve um `CompiledStateGraph`, que é um `Runnable`: tem `invoke`, `stream`, `ainvoke`, `astream`, `batch`.',
      },
      {
        type: 'run',
        run: {
          id: 'run-langgraph-02',
          title: 'Um mini-«Balcão» com router por intenção',
          brief:
            'Didáctico: classificar por regras, router com três destinos, reducer `adicionar` nas mensagens. `stream` devolve `{nó: actualização}` a cada passo, como o `stream_mode="updates"` do LangGraph.',
          code: `# Um mini-«Balcão» com GrafoEstado (didáctico, com a forma do StateGraph).
import re
import balcao as b
from balcao import START, END, GrafoEstado, adicionar


def classificar(e):
    t = b.normalizar(e["mensagens"][-1])
    pedido = re.search(r"PD-\\d{7}", e["mensagens"][-1])
    if re.search(r"alergic|inchad|hospital", t):
        return {"intencao": "seguranca"}
    if pedido:
        return {"intencao": "pedido", "pedido_id": pedido.group(0)}
    return {"intencao": "politica"}


def router(e):
    return {"seguranca": "escalar", "pedido": "agente"}.get(e["intencao"], "rag")


def rag(e):
    c, _ = b.recuperar(e["mensagens"][-1], 1, "rerank", {"vigente": True, "publico": "cliente"})[0]
    return {"mensagens": [f"(RAG) ver [{c.doc}]"]}


def agente(e):
    p = b.ler_pedido(e["pedido_id"])
    return {"mensagens": [f"(agente) {p['pedido']} está {p['estado']}"]}


def escalar(e):
    return {"mensagens": ["(humano) prioridade urgente"]}


g = GrafoEstado(reducers={"mensagens": adicionar})
for nome, fn in [("classificar", classificar), ("rag", rag), ("agente", agente), ("escalar", escalar)]:
    g.add_node(nome, fn)
g.add_edge(START, "classificar")
g.add_conditional_edges("classificar", router, {"rag": "rag", "agente": "agente", "escalar": "escalar"})
for n in ("rag", "agente", "escalar"):
    g.add_edge(n, END)
app = g.compile()

for msg in ["Posso juntar dois cupões?", "Onde está o PD-8842507?",
            "O meu filho é alérgico e está com a cara inchada"]:
    passos = [list(p)[0] for p in app.stream({"mensagens": [msg]})]
    fim = app.invoke({"mensagens": [msg]})
    print(" -> ".join(passos), "|", len(fim["mensagens"]), "mensagens |", fim["mensagens"][-1])`,
          expected: `classificar -> rag | 2 mensagens | (RAG) ver [pol-cupoes]
classificar -> agente | 2 mensagens | (agente) PD-8842507 está em_preparacao
classificar -> escalar | 2 mensagens | (humano) prioridade urgente`,
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O equivalente real. O terceiro argumento de `add_conditional_edges` pode ser uma lista de destinos: serve para o `compile` validar e para desenhar o grafo, e o router devolve o nome do nó.',
        code: `from typing import Literal

from langgraph.graph import END, START, StateGraph

def router(estado: EstadoBalcao) -> Literal["responder_rag", "agente", "escalar"]:
    intencao = estado.get("intencao")
    if intencao in ("seguranca", "humano"):
        return "escalar"
    if intencao in ("onde-esta", "compensacao", "pagamentos") and estado.get("pedido_na_mensagem"):
        return "agente"
    if intencao in ("onde-esta", "compensacao") and estado.get("pedido_id"):
        return "agente"                       # o pedido de que se falou no turno anterior
    return "responder_rag"

g = StateGraph(EstadoBalcao)
g.add_node("guarda_entrada", guarda_entrada)
g.add_node("classificar", classificar)
g.add_node("responder_rag", responder_rag)
g.add_node("agente", agente)
g.add_node("escalar", escalar)
g.add_node("guarda_saida", guarda_saida)
g.add_edge(START, "guarda_entrada")
g.add_edge("guarda_entrada", "classificar")
g.add_conditional_edges("classificar", router, ["responder_rag", "agente", "escalar"])
# ... (o grafo completo está em grafo.py)
app = g.compile(checkpointer=InMemorySaver(), name="balcao")`,
      },
      {
        type: 'p',
        text:
          'Um router é código puro e testa-se com uma chamada: `assert router({"intencao": "seguranca"}) == "escalar"`. É a propriedade mais valiosa do grafo explícito. O comportamento do sistema em cada intenção não está escondido num prompt; está numa função de dez linhas que um revisor de Pagamentos consegue ler num pull request.',
      },
      {
        type: 'terms',
        items: [
          { term: 'Superstep', def: 'Uma ronda de execução: todos os nós activos correm (em paralelo, se houver mais do que um), as actualizações são aplicadas pelos reducers, e as arestas decidem os nós da ronda seguinte. O modelo de execução é o Pregel/BSP.' },
          { term: 'Nó com `config`', def: 'Se a função aceitar um segundo parâmetro `config: RunnableConfig`, recebe a config da execução: `thread_id`, `cliente_id`, callbacks. É assim que as ferramentas sabem quem é o cliente.' },
          { term: '`compile()`', def: 'Valida (nó sem saída, destino inexistente) e devolve o grafo executável. Recebe `checkpointer`, `store`, `interrupt_before`/`interrupt_after`, `name`, `cache`.' },
          { term: '`get_graph()`', def: 'A topologia como dados; `draw_mermaid()` gera um diagrama Mermaid para documentação e revisão.' },
        ],
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Nomes de nós são contrato',
        text:
          'Os nomes dos nós aparecem nos traços, nos eventos de `stream`, nos checkpoints (`get_state(config).next == ("aguardar_aprovacao",)`) e nos painéis. Mudar `agente` para `decidir` parte alarmes, testes e a retoma de conversas que ficaram paradas com o nome antigo. Trata-os como nomes de colunas de uma tabela em produção.',
      },
      { type: 'diagram', diagram: {
        title: 'Superstep a superstep: o que acontece entre dois nós',
        caption: 'O nó devolve um parcial; os reducers aplicam-no; o checkpointer grava; as arestas escolhem o próximo nó. O nó nunca muta o estado directamente.',
        cols: 5,
        rows: 1,
        zones: [
          { id: 'zm', label: 'motor (Pregel)', col: 1, row: 0, colSpan: 3, rowSpan: 1, tone: 'cluster' },
        ],
        nodes: [
          { id: 'no', label: 'nó', sub: 'estado -> parcial', col: 0, row: 0, kind: 'service' },
          { id: 'red', label: 'reducers', sub: 'add_messages, substituir', col: 1, row: 0, kind: 'service' },
          { id: 'cp', label: 'checkpointer', sub: 'um por superstep', col: 2, row: 0, kind: 'data' },
          { id: 'ar', label: 'arestas / routers', sub: 'próximo(s) nó(s)', col: 3, row: 0, kind: 'decision' },
          { id: 'prox', label: 'próximo superstep', col: 4, row: 0, kind: 'service' },
        ],
        edges: [
          { from: 'no', to: 'red', label: '{"messages": [...]}' },
          { from: 'red', to: 'cp', label: 'estado novo' },
          { from: 'cp', to: 'ar' },
          { from: 'ar', to: 'prox' },
        ],
      } },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — usar a Graph API', url: 'https://docs.langchain.com/oss/python/langgraph/use-graph-api' },
          { label: 'LangGraph — Pregel (modelo de execução)', url: 'https://docs.langchain.com/oss/python/langgraph/pregel' },
        ],
      },
    ],
  },

  /* ================================================================= 3 */
  {
    id: 'grafo-balcao',
    title: 'O grafo do «Balcão»',
    blocks: [
      {
        type: 'p',
        text:
          'Com as peças no lugar, o grafo do laboratório lê-se de uma vez. Guardas de entrada (PII e injecção, sem modelo), classificação (regras primeiro, modelo pequeno depois), router com três destinos, o subciclo `agente`/`ferramentas` com orçamento de chamadas, o desvio para aprovação humana quando `calcular_reembolso` diz `precisa_aprovacao`, a guarda de saída que valida citações, e o resumo de memória quando a conversa cresce. Dez nós, onze ligações, cada decisão num sítio com nome.',
      },
      {
        type: 'graph',
        graph: {
          id: 'gr-langgraph-01',
          title: 'O `StateGraph` do «Balcão» (`grafo.py`)',
          brief: 'Os nós e as arestas de `construir_grafo`. As corridas abaixo são as trajectórias reais do grafo do laboratório com o modelo simulado (`stream_mode="updates"`).',
          entry: 'start',
          nodes: [
            { id: 'start', label: 'START', kind: 'inicio', col: 0, row: 2 },
            { id: 'guarda_entrada', label: 'guarda_entrada', kind: 'guarda', sub: 'mascarar PII, pontuar injecção', col: 1, row: 2, ms: 25 },
            { id: 'classificar', label: 'classificar', kind: 'router', sub: 'regras + modelo pequeno', col: 2, row: 2, ms: 350, tokens: 340 },
            { id: 'responder_rag', label: 'responder_rag', kind: 'retriever', sub: 'cadeia RAG (LCEL)', col: 3, row: 0, ms: 3985, tokens: 3100 },
            { id: 'agente', label: 'agente', kind: 'llm', sub: 'modelo médio + tools filtradas', col: 3, row: 2, ms: 1000, tokens: 5200 },
            { id: 'ferramentas', label: 'ferramentas', kind: 'ferramenta', sub: 'ToolNode + interceptor', col: 4, row: 2, ms: 120 },
            { id: 'preparar_aprovacao', label: 'preparar_aprovacao', kind: 'ferramenta', sub: 'regista pedido, avisa o cliente', col: 5, row: 3, ms: 40 },
            { id: 'aguardar_aprovacao', label: 'aguardar_aprovacao', kind: 'humano', sub: 'interrupt() até decisão', col: 6, row: 3 },
            { id: 'escalar', label: 'escalar', kind: 'humano', sub: 'transferir_humano com resumo', col: 3, row: 4, ms: 180 },
            { id: 'guarda_saida', label: 'guarda_saida', kind: 'guarda', sub: 'citações públicas e vigentes', col: 6, row: 1, ms: 30 },
            { id: 'resumir', label: 'resumir', kind: 'reducer', sub: 'RemoveMessage + resumo', col: 7, row: 0, ms: 350 },
            { id: 'end', label: 'END', kind: 'fim', col: 7, row: 2 },
          ],
          edges: [
            { from: 'start', to: 'guarda_entrada' },
            { from: 'guarda_entrada', to: 'classificar' },
            { from: 'classificar', to: 'responder_rag', cond: 'politica, outros, conta' },
            { from: 'classificar', to: 'agente', cond: 'pedido e intenção com pedido' },
            { from: 'classificar', to: 'escalar', cond: 'seguranca, humano' },
            { from: 'responder_rag', to: 'guarda_saida' },
            { from: 'agente', to: 'ferramentas', cond: 'tool_calls' },
            { from: 'agente', to: 'escalar', cond: 'orçamento de chamadas esgotado' },
            { from: 'agente', to: 'guarda_saida', cond: 'resposta final' },
            { from: 'ferramentas', to: 'agente', cond: 'por omissão' },
            { from: 'ferramentas', to: 'preparar_aprovacao', cond: 'precisa_aprovacao' },
            { from: 'preparar_aprovacao', to: 'aguardar_aprovacao' },
            { from: 'aguardar_aprovacao', to: 'guarda_saida', label: 'Command(resume=...)' },
            { from: 'escalar', to: 'guarda_saida' },
            { from: 'guarda_saida', to: 'resumir', cond: 'mais de 12 mensagens' },
            { from: 'guarda_saida', to: 'end', cond: 'por omissão' },
            { from: 'resumir', to: 'end' },
          ],
          channels: [
            { canal: 'messages', tipo: 'list[AnyMessage]', reducer: 'add_messages', nota: 'Histórico; substitui por id (PII mascarada) e apaga com RemoveMessage (resumo).' },
            { canal: 'intencao', tipo: 'Literal[...]', reducer: 'substitui', nota: 'Escrita por classificar; lida pelo router e por escalar.' },
            { canal: 'pedido_id', tipo: 'str | None', reducer: 'substitui', nota: 'Mantém-se entre turnos: «E quando chega?» ainda fala do mesmo pedido.' },
            { canal: 'chamadas_ferramentas', tipo: 'int', reducer: 'substitui', nota: 'Posto a 0 por guarda_entrada; o agente soma e compara com o limite de 6.' },
            { canal: 'aprovacao', tipo: 'dict | None', reducer: 'substitui', nota: 'Pedido de aprovação e decisão; é o que o interrupt mostra ao supervisor.' },
            { canal: 'citacoes', tipo: 'list[str]', reducer: 'substitui', nota: 'Do turno: com operator.add, citações antigas passariam pela guarda.' },
          ],
          runs: [
            {
              label: '«Durante quanto tempo posso usar um cupão?»',
              path: [['start'], ['guarda_entrada'], ['classificar'], ['responder_rag'], ['guarda_saida'], ['end']],
              note: 'Intenção `politica`: nenhuma ferramenta, nenhum esquema pago.',
              outcome: 'Resposta com `[pol-cupoes]`.',
            },
            {
              label: '«O meu pedido PD-8842507 ainda vai demorar muito?»',
              path: [['start'], ['guarda_entrada'], ['classificar'], ['agente'], ['ferramentas'], ['agente'], ['guarda_saida'], ['end']],
              note: 'Uma ronda de `ler_pedido`; o agente responde sem RAG (`contexto` vazio).',
              outcome: 'ETA de 38 minutos, dentro do prometido.',
            },
            {
              label: '«O PD-8842507 não chegou, quero o reembolso do dinheiro»',
              path: [['start'], ['guarda_entrada'], ['classificar'], ['agente'], ['ferramentas'], ['preparar_aprovacao'], ['aguardar_aprovacao']],
              note: '`calcular_reembolso` devolve 2 910 MZN com `precisa_aprovacao`; o router de ferramentas desvia para a aprovação.',
              outcome: 'O grafo pára num `interrupt`; o cliente já recebeu o aviso das 4 horas úteis. Retoma no módulo 17.',
            },
            {
              label: '«O meu filho é alérgico e está com a cara inchada» (PD-8843115)',
              path: [['start'], ['guarda_entrada'], ['classificar'], ['escalar'], ['guarda_saida'], ['end']],
              note: 'A regra de saúde decide antes do modelo; o agente nunca corre.',
              outcome: 'Transferência urgente e «procure assistência médica de imediato».',
            },
          ],
          note: 'Os `ms` dos nós são os do orçamento de latência; o nó `responder_rag` inclui a pesquisa, o re-ranking, o primeiro token e a geração.',
        },
      },
      { type: 'widget', id: 'grafo-editor' },
      {
        type: 'p',
        text:
          'Duas decisões do grafo que só se percebem com o resto do tutorial. A aprovação humana é um **desvio no router das ferramentas**, não uma instrução ao modelo: quando `calcular_reembolso` devolve `precisa_aprovacao`, o grafo vai para `preparar_aprovacao` sem voltar a perguntar nada ao modelo (adr-0015). E o `escalar` passa pela `guarda_saida` como todos os outros: nenhum texto chega ao cliente sem essa última camada.',
      },
      { type: 'tool', ref: 'calcular-reembolso' },
      { type: 'adr', ref: 'adr-0012' },
      { type: 'file', ref: 'src/balcao/grafo.py' },
      { type: 'file', ref: 'tests/test_grafo.py' },
      {
        type: 'callout',
        tone: 'key',
        title: 'O grafo é a especificação',
        text:
          'Cada aresta condicional do grafo do «Balcão» corresponde a uma linha da política de autonomia ou a um requisito: saúde para humano (RF-04), aprovação acima de 500 MZN (RF-03), orçamento de chamadas (RI-06), citações validadas (RF-01). Quando Produto pergunta «o que faz o assistente quando…», a resposta é um caminho no grafo e um teste em `test_grafo.py`, não um parágrafo do prompt.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — visão geral', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
          { label: 'LangGraph — pensar em LangGraph', url: 'https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph' },
        ],
      },
    ],
  },
];
