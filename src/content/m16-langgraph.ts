import type { Module } from '../types';
import { seccoesA } from './m16-langgraph.parte-a';
import { seccoesB } from './m16-langgraph.parte-b';

export const m16: Module = {
  id: 'langgraph',
  number: 16,
  part: 'orquestracao',
  title: 'LangGraph: grafos de estado',
  subtitle: 'Estado com reducers, nós que devolvem parciais, routers testáveis, streaming e fan-out: o fluxo do «Balcão» como grafo explícito',
  icon: '🕸️',
  minutes: 100,
  tags: ['LangGraph', 'StateGraph', 'reducers', 'streaming', 'Send'],
  goals: [
    'Declarar o estado de um grafo com `TypedDict` e escolher, canal a canal, entre substituir, `add_messages` e `operator.add`.',
    'Construir um `StateGraph` com nós, arestas, arestas condicionais, `START`/`END` e `compile`, e testar routers como funções puras.',
    'Ler o grafo do «Balcão» nó a nó e relacionar cada aresta condicional com um requisito ou uma regra de autonomia.',
    'Escolher o modo de `stream` certo para o SSE, para o traço e para a depuração.',
    'Usar `Send` para fan-out com reducer e `Command` para decidir e actualizar num só passo.',
    'Montar o ciclo de ferramentas com `ToolNode`, pôr `recursion_limit` e `RetryPolicy` no sítio certo, e saber quando um subgrafo compensa.',
  ],

  sections: [...seccoesA, ...seccoesB],

  quiz: [
    {
      id: 'q-langgraph-01',
      topic: 'reducers',
      prompt: 'O canal `messages` foi declarado como `list[AnyMessage]`, sem `Annotated`. O nó `agente` devolve `{"messages": [resposta]}`. O que acontece?',
      options: [
        'A resposta é acrescentada ao histórico, como sempre.',
        'O histórico é substituído pela lista com a resposta: o modelo deixa de ver a conversa e as chamadas anteriores.',
        'O `compile` falha porque falta o reducer.',
        'O LangGraph aplica `add_messages` automaticamente a canais chamados `messages`.',
      ],
      answer: [1],
      explain:
        'Sem reducer, o valor novo substitui o antigo. Não há erro nem aviso; o sintoma é um agente que repete chamadas porque perdeu o resultado da anterior. `MessagesState` já traz o canal com `add_messages`; num `TypedDict` teu, és tu que o declaras.',
    },
    {
      id: 'q-langgraph-02',
      topic: 'reducers',
      prompt: 'A guarda de entrada devolve `HumanMessage(content=texto_mascarado, id=humana.id)`. Que duas consequências tem, com `add_messages`?',
      options: [
        'A mensagem original é substituída pela mascarada, porque tem o mesmo id.',
        'O número de telefone original não fica gravado no checkpoint seguinte.',
        'O histórico passa a ter duas mensagens do cliente, a original e a mascarada.',
        'O `add_messages` recusa a actualização por id duplicado.',
      ],
      answer: [0, 1],
      explain:
        '`add_messages` junta por id: um id novo acrescenta, um id existente substitui. É o mecanismo que o «Balcão» usa para mascarar PII antes de qualquer outro nó e de o checkpoint ser gravado (RNF-04), e o mesmo que permite apagar com `RemoveMessage` no resumo.',
    },
    {
      id: 'q-langgraph-03',
      topic: 'routers',
      prompt: 'Porque é que o «Balcão» tem o router como função separada do nó `classificar`, em vez de um `Command(goto=...)` dentro do nó?',
      options: [
        'Porque `Command` não funciona com checkpointers.',
        'Porque a regra de encaminhamento fica numa função pura, testável com uma chamada, e visível na topologia do grafo.',
        'Porque `add_conditional_edges` é mais rápido.',
        'Porque `Command` só pode ir para `END`.',
      ],
      answer: [1],
      explain:
        'As duas formas funcionam. A escolha é de manutenção e revisão: um router de dez linhas lê-se num pull request e testa-se sem modelo. `Command` compensa quando decisão e actualização são inseparáveis, e é obrigatório em handoffs para um grafo pai.',
    },
    {
      id: 'q-langgraph-04',
      topic: 'send',
      prompt: 'Três tarefas criadas por `Send` escrevem no canal `excertos` no mesmo superstep. O canal não tem reducer. O que acontece?',
      options: [
        'Fica o valor da tarefa que terminou por último.',
        'Fica o valor da primeira tarefa.',
        '`InvalidUpdateError`: um canal sem reducer só aceita um valor por superstep.',
        'As três listas são concatenadas.',
      ],
      answer: [2],
      explain:
        'Não há forma certa de escolher, por isso o LangGraph recusa. Com `Annotated[list, operator.add]`, as actualizações são combinadas pela ordem das tarefas, o que torna o resultado determinista mesmo com tempos de execução diferentes.',
    },
    {
      id: 'q-langgraph-05',
      topic: 'stream',
      prompt: 'A API precisa de enviar ao cliente os tokens da resposta e de saber quando o grafo parou à espera de aprovação. Que modos de `stream` pede? (duas respostas)',
      options: [
        '`"messages"`, filtrando pelo `langgraph_node` dos metadados.',
        '`"updates"`, para ver cada nó e o `__interrupt__`.',
        '`"debug"`, porque tem tudo.',
        '`"values"`, porque o estado completo inclui os tokens.',
      ],
      answer: [0, 1],
      explain:
        '`messages` dá os tokens dos modelos chamados dentro dos nós, com o nó de origem; `updates` dá as actualizações por nó e o `__interrupt__`. `values` só tem mensagens completas por superstep; `debug` é para depuração.',
    },
    {
      id: 'q-langgraph-06',
      topic: 'limites',
      prompt: 'O teste `test_recursion_limit_e_a_ultima_rede` desliga o orçamento de chamadas (`max_chamadas_ferramentas=1000`). Porquê?',
      options: [
        'Porque o orçamento e o `recursion_limit` são o mesmo mecanismo.',
        'Para provar que, mesmo que o limite de negócio falhe, o `recursion_limit` pára um ciclo sem saída.',
        'Para medir o custo de 1 000 chamadas.',
        'Porque o `recursion_limit` só funciona sem orçamento.',
      ],
      answer: [1],
      explain:
        'São camadas diferentes: o orçamento degrada com elegância (escala com resumo), o `recursion_limit` é a rede de último recurso. Testar cada camada isolada garante que a segunda existe quando a primeira tem um bug.',
    },
    {
      id: 'q-langgraph-07',
      topic: 'grafo',
      prompt: 'No grafo do «Balcão», o que leva o fluxo para `preparar_aprovacao`?',
      options: [
        'Uma instrução no prompt de sistema a pedir aprovação acima de 500 MZN.',
        'O router depois de `ferramentas`, quando o resultado de `calcular_reembolso` tem `precisa_aprovacao`.',
        'O modelo, ao chamar `emitir_reembolso` com valor alto.',
        'O `recursion_limit`, quando o agente demora.',
      ],
      answer: [1],
      explain:
        'A decisão lê um valor calculado pela ferramenta a partir da política, não uma opinião do modelo. O modelo nem chega a tentar emitir; se tentasse, a ferramenta recusaria com `APROVACAO_NECESSARIA` (segunda camada).',
    },
    {
      id: 'q-langgraph-08',
      topic: 'subgrafos',
      prompt: 'Quando compensa transformar a cadeia RAG num subgrafo em vez de a chamar de dentro de um nó? (duas respostas)',
      options: [
        'Quando o fluxo interno tem estado próprio que precisa de ser retomado ou inspeccionado a meio.',
        'Quando o fluxo interno tem um `interrupt` (por exemplo, confirmar a consulta com um humano).',
        'Sempre: subgrafos são mais rápidos.',
        'Quando se quer que o traço mostre a cadeia.',
      ],
      answer: [0, 1],
      explain:
        'Um subgrafo acrescenta checkpoints por superstep interno e um estado a manter. Compensa quando isso é necessário (retoma, interrupts, inspecção). O traço de uma cadeia LCEL já aparece dentro do nó pelos callbacks.',
    },
    {
      id: 'q-langgraph-09',
      topic: 'estado',
      prompt: 'Porque é que o nó `guarda_entrada` repõe `citacoes`, `contexto` e `chamadas_ferramentas` no início de cada turno?',
      options: [
        'Porque o checkpointer guarda o estado entre turnos, e estes canais valem só para um turno.',
        'Porque os reducers os apagam automaticamente.',
        'Para poupar memória.',
        'Porque o `TypedDict` exige valores em todos os canais.',
      ],
      answer: [0],
      explain:
        'Com persistência (módulo 17), o estado do turno anterior ainda lá está. Sem a reposição, o orçamento de chamadas seria por conversa e as citações do turno anterior passariam pela guarda de saída do turno seguinte.',
    },
  ],

  exercises: [
    {
      id: 'e-langgraph-01',
      title: 'Quantas mensagens depois do turno?',
      kind: 'input',
      statement:
        'O estado começa com `{"messages": [HumanMessage("Onde está o PD-8842507?")]}` e `messages` tem `add_messages`. O grafo corre `guarda_entrada` (sem PII, não escreve mensagens), `classificar` (não escreve mensagens), `agente` (uma `AIMessage` com uma chamada), `ferramentas` (uma `ToolMessage`), `agente` (a resposta final) e `guarda_saida` (não altera o texto). Quantas mensagens tem o estado no fim?',
      accept: ['4', 'quatro'],
      hint: 'Conta a mensagem do cliente e cada mensagem acrescentada.',
      solution:
        '4: a mensagem do cliente, a `AIMessage` com a chamada, a `ToolMessage` com o resultado, e a `AIMessage` final. É a trajectória real do grafo do laboratório para esta pergunta.',
      difficulty: 1,
    },
    {
      id: 'e-langgraph-02',
      title: 'Escolher o reducer de cada canal',
      kind: 'open',
      statement:
        'Vais acrescentar três canais ao `EstadoBalcao`: `avisos_operacionais` (avisos lidos por ferramenta durante o turno, por exemplo «chuva forte em KaMpfumo»), `prioridade` (`normal` ou `urgente`, que vários nós podem subir mas nunca descer) e `ferramentas_usadas` (nomes das ferramentas chamadas na conversa inteira, para o resumo de escalamento). Para cada um, escolhe o reducer e diz o que o `guarda_entrada` faz com ele no início do turno.',
      hint: 'Um é do turno, um é monótono, um é da conversa.',
      solution:
        '`avisos_operacionais`: `operator.add` (várias leituras no turno juntam-se), e o `guarda_entrada` repõe-no a `[]` porque os avisos caducam em horas e têm de ser lidos de novo. `prioridade`: reducer próprio `lambda a, b: "urgente" if "urgente" in (a, b) else "normal"`, e o `guarda_entrada` repõe `normal` se a prioridade é do turno (ou não mexe, se a política for manter a urgência na conversa: decisão de Produto, registada num ADR). `ferramentas_usadas`: `operator.add` sem reposição, porque é da conversa; atenção ao crescimento, e o nó `resumir` pode condensá-lo.',
      difficulty: 2,
    },
    {
      id: 'e-langgraph-03',
      title: 'Um nó de avisos em paralelo com a classificação',
      kind: 'code',
      statement:
        'Acrescenta ao grafo do «Balcão» um nó `ler_avisos` que corre em paralelo com `classificar` (os dois depois de `guarda_entrada`) e escreve em `avisos_operacionais`. O router só pode correr quando os dois terminarem. Escreve as arestas e a declaração do canal.',
      hint: 'Duas arestas a sair de `guarda_entrada` criam um superstep com dois nós. Para esperar pelos dois antes do router, junta-os num nó.',
      solution:
        '```python\nclass EstadoBalcao(TypedDict, total=False):\n    ...\n    avisos_operacionais: Annotated[list[str], operator.add]\n\ng.add_node("ler_avisos", ler_avisos)\ng.add_node("juntar", lambda e: {})\ng.add_edge("guarda_entrada", "classificar")\ng.add_edge("guarda_entrada", "ler_avisos")      # mesmo superstep que classificar\ng.add_edge(["classificar", "ler_avisos"], "juntar")  # espera pelos dois\ng.add_conditional_edges("juntar", router, ["responder_rag", "agente", "escalar"])\n```\n\n`add_edge` com uma lista de origens só dispara o destino quando todas terminaram. O canal com reducer evita `InvalidUpdateError` se outro nó também escrever avisos no mesmo superstep. O ganho é o tempo da leitura de avisos sair do caminho crítico (corre durante os ≈ 350 ms do classificador).',
      difficulty: 3,
    },
    {
      id: 'e-langgraph-04',
      title: 'Uma intenção nova: alteração de morada',
      kind: 'design',
      statement:
        'Produto quer que o «Balcão» trate «quero mudar a morada do PD-8841273» de ponta a ponta (hoje cai em RAG). A política: alterar antes da recolha, até 2 km da original, com confirmação do cliente. Desenha a mudança no grafo: nós, arestas, canais, testes, e o que fica fora do modelo.',
      hint: 'Onde vive o limite de 2 km? O que acontece se o cliente disser «sim» dois turnos depois?',
      solution:
        'Classificação: nova intenção `morada` (regra por expressão regular e exemplo no prompt do classificador), com recall medido. Router: `morada` com pedido vai para o `agente` com ferramentas filtradas (`ler_pedido`, `alterar_morada`, `transferir_humano`). O limite de 2 km e o estado «antes da recolha» vivem em `alterar_morada` (erro com código `NAO_PERMITIDO` acima disso), não no prompt. Confirmação: um canal `proposta_pendente` (substitui) escrito quando o agente propõe; no turno seguinte, «sim» com proposta pendente vai directamente para a execução, com chave de idempotência (conversa, operação, pedido, morada). Testes: router isolado, ferramenta com 1,9 km e 2,1 km, trajectória de dois turnos com checkpointer em memória, e injecção a pedir 10 km. ADR a registar a decisão e a política.',
      difficulty: 3,
    },
  ],

  labs: [
    {
      id: 'lab-langgraph-01',
      moduleId: 'langgraph',
      title: 'O ciclo agente/ferramentas em `StateGraph`',
      brief:
        'Completa o grafo: estado com `messages` e `add_messages`, contador de chamadas, `ToolNode` com `handle_tool_errors`, router que vai para as ferramentas quando há `tool_calls` e escala quando o orçamento acaba, e compilação com um checkpointer em memória.',
      lang: 'python',
      starter: `from typing import TypedDict

from langgraph.graph import StateGraph


class Estado(TypedDict):
    messages: list
    chamadas: int


def construir(modelo, ferramentas, limite=6):
    def agente(e: Estado) -> dict:
        resp = modelo.bind_tools(ferramentas).invoke(e["messages"])
        return {"messages": [resp]}

    g = StateGraph(Estado)
    g.add_node("agente", agente)
    # TODO: ferramentas, escalar, arestas, router, compile
    return g`,
      checks: [
        { id: 'c1', label: '`messages` com `add_messages`', re: 'messages\\s*:\\s*Annotated\\[\\s*list[^\\]]*\\]?\\s*,\\s*add_messages\\s*\\]', why: 'Sem reducer, cada nó apaga o histórico.' },
        { id: 'c2', label: 'Usa `ToolNode` com tratamento de erros', re: 'ToolNode\\([^)]*handle_tool_errors\\s*=\\s*True', why: 'Uma excepção numa ferramenta vira `ToolMessage` de erro em vez de rebentar o grafo.' },
        { id: 'c3', label: 'Router condicional depois do agente', re: 'add_conditional_edges\\(\\s*["\']agente["\']', why: 'A decisão ferramentas/escalar/fim é do router, lida do estado.' },
        { id: 'c4', label: 'Lê `tool_calls` da última mensagem', re: '\\.tool_calls', why: 'É o sinal de que o modelo pediu acções.' },
        { id: 'c5', label: 'Orçamento de chamadas', re: 'chamadas["\']?\\]?\\s*\\+\\s*len\\(|>=?\\s*limite', why: 'O limite de negócio degrada para humano antes do `recursion_limit`.' },
        { id: 'c6', label: 'Aresta de volta ao agente', re: 'add_edge\\(\\s*["\']ferramentas["\']\\s*,\\s*["\']agente["\']\\s*\\)', why: 'É o ciclo: o resultado volta ao modelo.' },
        { id: 'c7', label: 'Compila com checkpointer', re: '\\.compile\\(\\s*checkpointer\\s*=\\s*InMemorySaver\\(\\)', why: 'Nos testes, `InMemorySaver`; em produção, `PostgresSaver` (módulo 17).' },
      ],
      hints: [
        '`from typing import Annotated` e `from langgraph.graph import END, START, StateGraph, add_messages`.',
        'O router: sem `tool_calls`, `END`; com o contador acima do limite, `"escalar"`; senão `"ferramentas"`.',
        'Conta as chamadas no próprio nó `agente`, ao lado da resposta; o router só lê o contador.',
      ],
      solution: `from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph, add_messages
from langgraph.prebuilt import ToolNode


class Estado(TypedDict):
    messages: Annotated[list, add_messages]
    chamadas: int


def construir(modelo, ferramentas, limite=6):
    def agente(e: Estado) -> dict:
        resp = modelo.bind_tools(ferramentas).invoke(e["messages"])
        return {"messages": [resp], "chamadas": e.get("chamadas", 0) + len(resp.tool_calls)}

    def escalar(e: Estado) -> dict:
        return {"messages": [AIMessage("Vou passar a conversa a um colega, já com o resumo do caso.")]}

    def depois_agente(e: Estado) -> str:
        ultima = e["messages"][-1]
        if not ultima.tool_calls:
            return END
        if e["chamadas"] > limite:          # orçamento esgotado: não executa, escala
            return "escalar"
        return "ferramentas"

    g = StateGraph(Estado)
    g.add_node("agente", agente)
    g.add_node("ferramentas", ToolNode(ferramentas, handle_tool_errors=True))
    g.add_node("escalar", escalar)
    g.add_edge(START, "agente")
    g.add_conditional_edges("agente", depois_agente, ["ferramentas", "escalar", END])
    g.add_edge("ferramentas", "agente")
    g.add_edge("escalar", END)
    return g.compile(checkpointer=InMemorySaver())`,
      difficulty: 3,
    },
    {
      id: 'lab-langgraph-02',
      moduleId: 'langgraph',
      title: 'Router e reducer no `GrafoEstado` didáctico',
      brief:
        'Corre no browser. Completa o grafo: reducer `adicionar` em `mensagens`, um router que manda saúde para `escalar`, mensagens com número de pedido para `agente` e o resto para `rag`, e um `max_passos` explícito no `compile`.',
      lang: 'python',
      executavel: true,
      starter: `import re
import balcao as b
from balcao import START, END, GrafoEstado, adicionar


def rag(e):
    return {"mensagens": ["(rag)"]}


def agente(e):
    return {"mensagens": ["(agente)"]}


def escalar(e):
    return {"mensagens": ["(humano)"]}


g = GrafoEstado()
for nome, fn in [("rag", rag), ("agente", agente), ("escalar", escalar)]:
    g.add_node(nome, fn)
g.add_edge(START, "rag")
for n in ("rag", "agente", "escalar"):
    g.add_edge(n, END)
app = g.compile()
print(app.invoke({"mensagens": ["Onde está o PD-8842507?"]})["mensagens"])`,
      checks: [
        { id: 'c1', label: 'Reducer em `mensagens`', re: 'GrafoEstado\\(\\s*reducers\\s*=\\s*\\{\\s*["\']mensagens["\']\\s*:\\s*adicionar', why: 'Sem reducer, cada nó substitui o histórico.' },
        { id: 'c2', label: 'Aresta condicional a partir de START', re: 'add_conditional_edges\\(\\s*START', why: 'A primeira decisão é o encaminhamento por intenção.' },
        { id: 'c3', label: 'Saúde antes de tudo', re: 'alergic[\\s\\S]{0,120}return\\s+["\']escalar["\'][\\s\\S]*PD-', why: 'A regra de saúde vem primeiro: uma mensagem com pedido e alergia vai para humano.' },
        { id: 'c4', label: 'Limite de passos explícito', re: 'compile\\(\\s*max_passos\\s*=\\s*\\d+', why: 'Nenhum grafo corre sem limite.' },
        { id: 'c5', label: 'Sem aresta fixa START -> rag', re: 'add_edge\\(\\s*START\\s*,\\s*["\']rag["\']', forbid: true, why: 'O RAG passa a ser um destino do router, não o caminho de todas as mensagens.' },
      ],
      hints: [
        'O router recebe o estado: `t = b.normalizar(e["mensagens"][-1])`, depois `re.search(r"alergic|inchad", t)`, depois `re.search(r"PD-\\\\d{7}", e["mensagens"][-1])`.',
        '`g.add_conditional_edges(START, router, {"rag": "rag", "agente": "agente", "escalar": "escalar"})`.',
      ],
      solution: `import re
import balcao as b
from balcao import START, END, GrafoEstado, adicionar


def rag(e):
    return {"mensagens": ["(rag)"]}


def agente(e):
    return {"mensagens": ["(agente)"]}


def escalar(e):
    return {"mensagens": ["(humano)"]}


def router(e):
    t = b.normalizar(e["mensagens"][-1])
    if re.search(r"alergic|inchad|hospital", t):
        return "escalar"
    if re.search(r"PD-\\d{7}", e["mensagens"][-1]):
        return "agente"
    return "rag"


g = GrafoEstado(reducers={"mensagens": adicionar})
for nome, fn in [("rag", rag), ("agente", agente), ("escalar", escalar)]:
    g.add_node(nome, fn)
g.add_conditional_edges(START, router, {"rag": "rag", "agente": "agente", "escalar": "escalar"})
for n in ("rag", "agente", "escalar"):
    g.add_edge(n, END)
app = g.compile(max_passos=10)
for m in ["Onde está o PD-8842507?", "O PD-8843115 tinha amendoim e o meu filho é alérgico", "Posso juntar cupões?"]:
    print(app.invoke({"mensagens": [m]})["mensagens"])`,
      difficulty: 1,
    },
  ],

  useCases: [
    {
      id: 'uc-langgraph-01',
      title: 'Encomendas com receita numa farmácia online: um grafo com validação humana e fan-out',
      area: 'Fluxo com estado, humanos e paralelismo',
      level: 3,
      scenario:
        'Uma farmácia online em Maputo recebe ≈ 600 encomendas por dia pela aplicação; 22% incluem medicamentos sujeitos a receita. Cada encomenda precisa de verificar stock por artigo em 3 armazéns, validar a receita (fotografia) com um farmacêutico, e responder ao cliente com prazos. Hoje é feito à mão por telefone, com 40 minutos de espera média.',
      requirements: [
        'Nenhum medicamento sujeito a receita confirmado sem validação de um farmacêutico registada.',
        'Resposta ao cliente sobre stock em menos de 1 minuto, mesmo com a receita ainda por validar.',
        'Retomar a encomenda horas depois, quando o farmacêutico decide, noutra réplica do serviço.',
        'Explicar a qualquer auditor o caminho de cada encomenda.',
      ],
      constraints: ['APIs de stock lentas (p95 de 800 ms por armazém).', 'Dois farmacêuticos por turno.'],
      approach: [
        { title: 'Fan-out de stock com `Send`', text: 'Um `Send("verificar_stock", {"artigo", "armazem"})` por par artigo/armazém; o canal `disponibilidade` com `operator.add` junta os resultados; o tempo do passo é o do armazém mais lento, não a soma.' },
        { title: 'Router por tipo de artigo', text: 'Sem receita: confirma e segue para pagamento. Com receita: responde já com o stock e o prazo de validação, e segue para o nó de validação.' },
        { title: 'Validação humana', text: 'O nó de validação pára num `interrupt` (módulo 17) com a receita e os artigos; o farmacêutico decide numa fila e o grafo retoma com `Command(resume=...)`.' },
        { title: 'Streaming para a aplicação', text: '`stream_mode=["updates", "custom"]`: o cliente vê «a verificar stock no armazém da Matola» e depois «a aguardar farmacêutico».' },
      ],
      diagram: {
        title: 'O grafo de uma encomenda com receita',
        caption: 'Fan-out por artigo e armazém, router por tipo de artigo, e uma pausa humana só para os medicamentos com receita.',
        cols: 6,
        rows: 3,
        zones: [
          { id: 'zf', label: 'fan-out (Send)', col: 1, row: 0, colSpan: 1, rowSpan: 3, tone: 'async' },
        ],
        nodes: [
          { id: 'enc', label: 'encomenda', col: 0, row: 1, kind: 'user' },
          { id: 's1', label: 'stock: Baixa', col: 1, row: 0, kind: 'tool' },
          { id: 's2', label: 'stock: Matola', col: 1, row: 1, kind: 'tool' },
          { id: 's3', label: 'stock: Machava', col: 1, row: 2, kind: 'tool' },
          { id: 'juntar', label: 'juntar', sub: 'operator.add', col: 2, row: 1, kind: 'service' },
          { id: 'router', label: 'tem receita?', col: 3, row: 1, kind: 'decision' },
          { id: 'farm', label: 'farmacêutico', sub: 'interrupt', col: 4, row: 2, kind: 'user' },
          { id: 'pag', label: 'pagamento', col: 5, row: 1, kind: 'external' },
        ],
        edges: [
          { from: 'enc', to: 's1' },
          { from: 'enc', to: 's2' },
          { from: 'enc', to: 's3' },
          { from: 's1', to: 'juntar' },
          { from: 's2', to: 'juntar' },
          { from: 's3', to: 'juntar' },
          { from: 'juntar', to: 'router' },
          { from: 'router', to: 'pag', label: 'não' },
          { from: 'router', to: 'farm', label: 'sim' },
          { from: 'farm', to: 'pag', label: 'aprovada' },
        ],
      },
      solution:
        'Um `StateGraph` sem agente: o caminho é determinado pelos dados (tipo de artigo, stock), o paralelismo vem do `Send`, e a única pausa é humana. O modelo entra, quando entra, só para redigir a mensagem ao cliente a partir do estado; nenhuma decisão de negócio depende dele.',
      tools: [
        { name: '`Send` + `operator.add`', role: 'Verificação de stock em paralelo por artigo e armazém.' },
        { name: '`add_conditional_edges`', role: 'Router por tipo de artigo, testável sem modelo.' },
        { name: '`interrupt` + checkpointer', role: 'Validação do farmacêutico, retomada horas depois (módulo 17).' },
        { name: '`stream_mode=["updates", "custom"]`', role: 'Progresso visível na aplicação.' },
      ],
      rejected: [
        { option: 'Agente com ferramentas de stock e de receitas', why: 'O caminho não varia de forma que justifique um modelo a decidir; e a validação de receita não pode depender de um modelo a lembrar-se de a pedir.' },
        { option: 'Fila de mensagens com consumidores por etapa', why: 'Funciona, mas o estado da encomenda, a retoma e o traço teriam de ser construídos à mão; o checkpointer dá-os.' },
        { option: 'Verificar stock em sequência', why: '3 armazéns × vários artigos × 800 ms passa o minuto prometido.' },
      ],
      costNote:
        'Quase sem custo de modelo: só a mensagem final ao cliente (≈ 800 tokens no escalão pequeno). O custo relevante são as chamadas de stock (paralelas) e ≈ 8 checkpoints por encomenda no PostgreSQL existente.',
      takeaways: [
        'LangGraph não é só para agentes: um fluxo determinista com estado, paralelismo e humanos é o caso mais frequente.',
        '`Send` com reducer transforma N chamadas lentas num passo com o tempo da mais lenta.',
        'Quando a decisão é dos dados, o router é código; o modelo fica para a linguagem.',
      ],
      refs: [
        { label: 'LangGraph — workflows e agentes', url: 'https://docs.langchain.com/oss/python/langgraph/workflows-agents' },
        { label: 'LangGraph — interrupts', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
      ],
    },
  ],
};
