import type { Section } from '../types';

/* Secções 1 a 3 do módulo 15: o que é um agente, ReAct e o ciclo, create_agent. */

export const seccoesA: Section[] = [
  /* ================================================================= 1 */
  {
    id: 'o-que-e',
    title: 'O que é um agente: modelo, ferramentas, ciclo e paragem',
    blocks: [
      {
        type: 'p',
        text:
          'A palavra «agente» é usada para tudo, de um prompt com personalidade a um sistema que corre sozinho durante horas. Neste tutorial tem uma definição operacional, que se pode testar: **um agente é um ciclo em que um modelo escolhe a próxima acção (chamar uma ferramenta ou responder), o sistema executa essa acção, e o resultado volta ao modelo, até uma condição de paragem**. Quatro peças: modelo, ferramentas, ciclo, paragem. Se falta uma, não é um agente, é outra coisa.',
      },
      {
        type: 'terms',
        items: [
          { term: 'Modelo', def: 'Gera, a cada passo, uma mensagem que é texto final ou uma ou mais chamadas de ferramenta (`tool_calls`) com argumentos em JSON. Não executa nada.' },
          { term: 'Ferramentas', def: 'Funções com esquema (nome, descrição, parâmetros). São a única forma de o agente ler ou mudar o mundo. O que não está no catálogo não pode ser feito (módulo 5).' },
          { term: 'Ciclo', def: 'O código que chama o modelo, executa as chamadas, junta os resultados às mensagens e volta a chamar o modelo. Pode ser um `while` de 20 linhas, o grafo de `create_agent` ou um nó de um `StateGraph`.' },
          { term: 'Paragem', def: 'A condição que termina o ciclo: o modelo respondeu sem chamar ferramentas, ou um limite (passos, tokens, tempo, chamadas de uma ferramenta) foi atingido. A primeira é do modelo; as outras são tuas.' },
        ],
      },
      {
        type: 'p',
        text:
          'A distinção que importa para o desenho não é «agente ou não agente», é **quem decide o caminho**. Num workflow, o caminho está no código: classificar, depois pesquisar, depois responder. Num agente, o caminho é decidido pelo modelo em tempo de execução. A Anthropic usa exactamente esta fronteira no texto que é referência na indústria: workflows são sistemas em que modelos e ferramentas são orquestrados por caminhos de código predefinidos; agentes são sistemas em que o modelo dirige dinamicamente o próprio processo.',
      },
      {
        type: 'diagram',
        diagram: {
          title: 'As quatro peças de um agente, e onde vivem os limites',
          caption: 'O modelo só propõe. O ciclo executa, conta e decide parar. As ferramentas aplicam as regras de negócio. Nenhum limite importante vive no prompt.',
          cols: 5,
          rows: 2,
          zones: [
            { id: 'zc', label: 'ciclo (código teu ou da biblioteca)', col: 1, row: 0, colSpan: 3, rowSpan: 2, tone: 'agente' },
          ],
          nodes: [
            { id: 'cli', label: 'cliente', sub: 'mensagem', col: 0, row: 0, kind: 'user' },
            { id: 'modelo', label: 'modelo', sub: 'texto ou tool_calls', col: 1, row: 0, kind: 'model' },
            { id: 'paragem', label: 'paragem?', sub: 'sem chamadas, passos, tokens', col: 2, row: 0, kind: 'decision' },
            { id: 'exec', label: 'executar', sub: 'valida esquema, autoriza', col: 2, row: 1, kind: 'service' },
            { id: 'tools', label: 'ferramentas', sub: 'ler_pedido, calcular_reembolso…', col: 3, row: 1, kind: 'tool' },
            { id: 'resp', label: 'resposta', col: 4, row: 0, kind: 'user' },
          ],
          edges: [
            { from: 'cli', to: 'modelo' },
            { from: 'modelo', to: 'paragem' },
            { from: 'paragem', to: 'exec', label: 'há chamadas' },
            { from: 'exec', to: 'tools' },
            { from: 'tools', to: 'modelo', label: 'resultados (ou erros)', style: 'dashed' },
            { from: 'paragem', to: 'resp', label: 'resposta final ou limite' },
          ],
        },
      },
      {
        type: 'table',
        head: ['Sistema', 'Quem decide o caminho', 'É um agente?', 'Exemplo no «Balcão»'],
        rows: [
          ['Chamada única com prompt', 'ninguém: um passo', 'não', 'resumo de memória (módulo 18)'],
          ['Cadeia fixa', 'o código', 'não', 'a cadeia RAG de `cadeias.py`'],
          ['Router com ramos', 'o código, a partir de uma classificação', 'não (workflow)', 'o `router` do grafo por intenção'],
          ['Ciclo modelo-ferramentas', 'o modelo, a cada passo', 'sim', 'o subciclo `agente`/`ferramentas` nas intenções com pedido'],
          ['Vários agentes que se passam o controlo', 'modelos, entre si', 'sim, multi-agente', 'fora do «Balcão» (módulo 19)'],
        ],
        caption: 'Uma escala, não uma dicotomia. O «Balcão» é um workflow com um subciclo de agente onde a decisão varia de caso para caso (adr-0013).',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O modelo propõe; o código dispõe',
        text:
          'Em todo este módulo, repara em onde vive cada decisão. O modelo escolhe **qual** ferramenta e **com que argumentos**. O código decide se a chamada é válida (esquema), se é permitida (autorização e limites), se o ciclo continua (paragem) e o que acontece a um erro. Um agente seguro é um em que o pior que o modelo pode fazer é propor mal, e a proposta má é recusada por código que não lê prompts.',
      },
      {
        type: 'p',
        text:
          'Porque é que se usa um agente, então? Porque há problemas em que o número de caminhos possíveis é grande demais para um `if`. Uma reclamação de pagamento pode precisar de ler o pedido, depois o cliente, depois a política de cobranças duplicadas, e só então decidir; ou pode resolver-se com a política sozinha. Escrever essa árvore à mão para todas as combinações é caro e frágil. O agente troca essa árvore por **variância**: o mesmo pedido pode seguir caminhos diferentes em corridas diferentes. O resto do módulo é sobre controlar essa variância.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          { label: 'LangChain — agentes', url: 'https://docs.langchain.com/oss/python/langchain/agents' },
          { label: 'LangGraph — workflows e agentes', url: 'https://docs.langchain.com/oss/python/langgraph/workflows-agents' },
        ],
      },
    ],
  },

  /* ================================================================= 2 */
  {
    id: 'react',
    title: 'ReAct e o ciclo com tool calling nativo',
    blocks: [
      {
        type: 'p',
        text:
          'O padrão tem nome e artigo: **ReAct** (Yao et al., 2022), *reasoning and acting*. O modelo alterna texto de raciocínio («preciso de saber o estado do pedido»), uma acção (`ler_pedido[PD-8842507]`) e uma observação (o resultado), até escrever a resposta. Em 2022 isso era feito com um prompt de formato fixo e um parser de texto que procurava `Action:` na saída. Hoje os fornecedores têm **tool calling nativo**: a acção vem num campo estruturado (`tool_calls`), com argumentos em JSON validável, e o resultado volta numa mensagem de papel `tool` ligada pelo id da chamada.',
      },
      {
        type: 'prompt',
        prompt: {
          id: 'pr-agentes-01',
          title: 'Um ciclo completo, mensagem a mensagem: «O meu pedido PD-8842507 ainda vai demorar muito?»',
          brief: 'O que o modelo médio recebe e devolve em cada passo do subciclo do agente. Duas chamadas ao modelo, uma à ferramenta.',
          messages: [
            { role: 'sistema', text: 'És o assistente de suporte do Chega. Usa as ferramentas para consultar pedidos; nunca inventes estados nem tempos. Valores de compensação vêm sempre de calcular_reembolso.', note: 'Mais os esquemas das ferramentas permitidas neste turno: ≈ 1 100 tokens para as 12, pagos em cada chamada ao modelo.', tokens: 2000 },
            { role: 'utilizador', text: 'O meu pedido PD-8842507 ainda vai demorar muito?', untrusted: true, tokens: 14 },
            { role: 'assistente', text: '', call: { tool: 'ler_pedido', args: '{"pedido_id": "PD-8842507"}' }, note: 'Passo 1: o modelo não responde, pede uma acção. `stop_reason` = `tool_use`.', tokens: 18 },
            { role: 'ferramenta', name: 'ler_pedido', text: '{"pedido": "PD-8842507", "estado": "em_preparacao", "restaurante": "Sabores da Machava", "prometido_min": 45, "decorrido_min": 12, "eta_min": 38}', note: 'Observação. Vem de uma API interna, mas entra no contexto como dados: um campo de texto livre aqui (uma nota do restaurante) seria conteúdo não confiável.', tokens: 95 },
            { role: 'assistente', text: 'O pedido está em preparação no restaurante. A chegada estimada é daqui a cerca de 38 minutos, dentro do tempo prometido.', note: 'Passo 2: sem chamadas, é a resposta final. O ciclo pára por decisão do modelo.', tokens: 30 },
          ],
          note: 'Duas chamadas ao modelo médio, cada uma com o prompt de sistema e os esquemas: o custo de um agente cresce com o número de passos, e cada passo reenvia tudo o que veio antes.',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-agentes-01',
          title: 'O ciclo de um agente em 25 linhas',
          brief:
            'Didáctico: `ModeloSimulado` com duas ferramentas, `executar_ferramenta` a validar e executar, e um limite de passos. O mesmo ciclo que `create_agent` implementa como grafo. O simulado decide a ferramenta por regras (número de pedido, palavras de reembolso), não por raciocínio.',
          code: `# O ciclo de um agente: modelo -> chamadas -> ferramentas -> resultados -> modelo.
import json
import balcao as b

modelo = b.ModeloSimulado()
ESQUEMAS = [b.FERRAMENTAS[n]["esquema"] for n in ("ler_pedido", "calcular_reembolso")]


def agente(pergunta, max_passos=5):
    msgs = [{"role": "system", "content": "És o assistente do Chega."},
            {"role": "user", "content": pergunta}]
    tokens = 0
    for passo in range(1, max_passos + 1):
        r = modelo.gerar(msgs, ESQUEMAS)
        tokens += r.uso["entrada"] + r.uso["saida"]
        if not r.chamadas:                         # paragem: o modelo respondeu
            print(f"  passo {passo}: resposta ({tokens} tokens acumulados)")
            return r.texto
        msgs.append({"role": "assistant", "content": "", "tool_calls": r.chamadas})
        for c in r.chamadas:
            res = b.executar_ferramenta(c)
            print(f"  passo {passo}: {c['name']}({c['arguments']}) -> {sorted(res)[:4]}")
            msgs.append({"role": "tool", "name": c["name"],
                         "content": json.dumps(res, ensure_ascii=False)})
    return "limite de passos atingido: passar a um humano"


for p in ["O meu pedido PD-8842507 ainda vai demorar muito?",
          "O PD-8841990 chegou atrasado, quero o dinheiro de volta"]:
    print(p)
    print("  =>", agente(p))`,
          expected: `O meu pedido PD-8842507 ainda vai demorar muito?
  passo 1: ler_pedido({'pedido_id': 'PD-8842507'}) -> ['criado_em', 'decorrido_min', 'estado', 'eta_min']
  passo 2: resposta (571 tokens acumulados)
  => O pedido PD-8842507 está em preparacao. Chegada estimada em 38 minutos.
O PD-8841990 chegou atrasado, quero o dinheiro de volta
  passo 1: calcular_reembolso({'pedido_id': 'PD-8841990', 'motivo': 'atraso'}) -> ['pedido', 'precisa_aprovacao', 'regra', 'tipo']
  passo 2: resposta (526 tokens acumulados)
  => Tem direito a cupão de 200 MZN (atraso de 53 min (> 45)). Posso avançar se confirmar.`,
        },
      },
      {
        type: 'p',
        text:
          'Três detalhes do ciclo que parecem cosméticos e não são. A mensagem do assistente com as `tool_calls` entra no histórico **antes** dos resultados: os fornecedores reais recusam um resultado de ferramenta sem a chamada que o originou (e uma chamada sem resultado). O valor do cupão (200 MZN) vem de `calcular_reembolso`, não do modelo. E o agente parou de propor antes de emitir: «Posso avançar se confirmar» é a regra RF-03, emitir só depois de confirmação explícita.',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Chamadas paralelas no mesmo passo',
        text:
          'Os modelos actuais podem pedir várias ferramentas numa só resposta quando as chamadas são independentes (ler o pedido e calcular a compensação). O `ToolNode` executa-as em paralelo e o passo custa o tempo da mais lenta. O ciclo tem de devolver **todos** os resultados antes de voltar ao modelo, cada um com o `tool_call_id` da chamada respectiva.',
      },
      { type: 'widget', id: 'react-ciclo' },
      {
        type: 'flow',
        flow: {
          id: 'fl-agentes-01',
          title: 'O ciclo no tempo: onde se gastam os segundos de um turno com ferramenta',
          intro: 'A conversa de referência «Atraso com direito a cupão», primeiro turno, com o modelo médio. Tempos do orçamento de latência e do p95 das ferramentas.',
          lanes: [
            { id: 'ciclo', label: 'Ciclo do agente', kind: 'agent' },
            { id: 'modelo', label: 'Modelo médio', kind: 'model' },
            { id: 'tools', label: 'Ferramentas', sub: 'APIs internas', kind: 'service' },
          ],
          steps: [
            { from: 'ciclo', to: 'modelo', label: 'mensagens + 12 esquemas', detail: '≈ 5 200 tokens de entrada, 60% servidos pela cache de prompt.', kind: 'req', ms: 700, tokens: 5200 },
            { from: 'modelo', to: 'ciclo', label: 'tool_calls: ler_pedido, calcular_reembolso', detail: 'Duas chamadas paralelas no mesmo passo: o modelo não precisa do estado para calcular.', kind: 'res', ms: 300, tokens: 40 },
            { from: 'ciclo', to: 'tools', label: 'ler_pedido(PD-8841990)', kind: 'req', ms: 120 },
            { from: 'ciclo', to: 'tools', label: 'calcular_reembolso(PD-8841990, atraso)', detail: 'Em paralelo com a anterior: o tempo do passo é o da mais lenta.', kind: 'req', ms: 90 },
            { from: 'tools', to: 'ciclo', label: 'estado entregue; cupão 200 MZN (53 min > 45)', kind: 'res', ms: 5 },
            { from: 'ciclo', to: 'modelo', label: 'mensagens + resultados', detail: 'Tudo outra vez, mais os resultados. O segundo passo custa mais tokens de entrada do que o primeiro.', kind: 'req', ms: 700, tokens: 5400 },
            { from: 'modelo', to: 'ciclo', label: 'resposta final em streaming', detail: '«Lamento o atraso… tem direito a um cupão de 200 MZN ou ao reembolso da taxa de entrega (60 MZN). Qual prefere?»', kind: 'res', ms: 1800, tokens: 110 },
          ],
          outro: 'O primeiro token visível chega depois de dois primeiros-tokens do modelo e de uma ronda de ferramentas: ≈ 1,8 s mais guardas e classificação. É por isso que os caminhos sem ferramentas não passam pelo agente.',
        },
      },
      {
        type: 'refs',
        items: [
          { label: 'Yao et al. — ReAct (2022)', url: 'https://arxiv.org/abs/2210.03629' },
          { label: 'Anthropic — tool use', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview' },
          { label: 'LangChain — tools', url: 'https://docs.langchain.com/oss/python/langchain/tools' },
        ],
      },
    ],
  },

  /* ================================================================= 3 */
  {
    id: 'create-agent',
    title: '`create_agent` no LangChain 1.x',
    blocks: [
      {
        type: 'p',
        text:
          'No LangChain 1.x, o ciclo pronto chama-se `create_agent` e vive em `langchain.agents`. Substitui o `create_react_agent` de `langgraph.prebuilt`, que ficou marcado como obsoleto com uma mensagem a apontar para o novo nome. A assinatura real: `create_agent(model, tools=None, *, system_prompt=None, middleware=(), response_format=None, state_schema=None, context_schema=None, checkpointer=None, store=None, interrupt_before=None, interrupt_after=None, debug=False, name=None, cache=None)`. O que devolve é um grafo LangGraph compilado, com um nó `model` e um nó `tools`.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Um agente de consulta de pedidos com o modelo simulado do laboratório (corre sem rede). `model` aceita uma instância ou uma string `"fornecedor:modelo"` passada a `init_chat_model`.',
        code: `from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool

from balcao import didactico as d
from balcao.simulado import ChatSimulado

@tool
def ler_pedido(pedido_id: str) -> dict:
    """Consulta o estado, os artigos e os tempos de um pedido."""
    return d.ler_pedido(pedido_id)

@tool
def calcular_reembolso(pedido_id: str, motivo: str) -> dict:
    """Calcula a compensação a que um pedido tem direito. motivo: atraso, nao_entregue, artigo_em_falta."""
    return d.calcular_reembolso(pedido_id, motivo)

agente = create_agent(
    ChatSimulado(),
    [ler_pedido, calcular_reembolso],
    system_prompt="És o assistente de suporte do Chega.",
)
r = agente.invoke({"messages": [HumanMessage("O meu pedido PD-8842507 ainda vai demorar muito?")]},
                  {"recursion_limit": 12})
[type(m).__name__ for m in r["messages"]]
# ['HumanMessage', 'AIMessage', 'ToolMessage', 'AIMessage']
r["messages"][-1].content
# 'O pedido PD-8842507 está em preparacao. Chegada estimada em 38 minutos.'`,
      },
      {
        type: 'graph',
        graph: {
          id: 'gr-agentes-01',
          title: 'O grafo que `create_agent` compila (com dois middlewares de limite)',
          brief: 'Os nós reais de `agente.get_graph()` com `ModelCallLimitMiddleware` e `ToolCallLimitMiddleware`: os middlewares entram como nós antes e depois do modelo.',
          entry: 'inicio',
          nodes: [
            { id: 'inicio', label: '__start__', kind: 'inicio', col: 0, row: 1 },
            { id: 'antes', label: 'ModelCallLimit.before_model', kind: 'guarda', sub: 'já passou run_limit?', col: 1, row: 1, ms: 1 },
            { id: 'model', label: 'model', kind: 'llm', sub: 'modelo + tools ligadas', col: 2, row: 1, ms: 1000, tokens: 5200 },
            { id: 'depois', label: 'after_model (limites)', kind: 'router', sub: 'há tool_calls? limites?', col: 3, row: 1, ms: 1 },
            { id: 'tools', label: 'tools', kind: 'ferramenta', sub: 'ToolNode: executa em paralelo', col: 3, row: 0, ms: 120 },
            { id: 'fim', label: '__end__', kind: 'fim', col: 4, row: 1 },
          ],
          edges: [
            { from: 'inicio', to: 'antes' },
            { from: 'antes', to: 'model', cond: 'dentro do limite' },
            { from: 'antes', to: 'fim', cond: 'limite atingido (exit_behavior="end")' },
            { from: 'model', to: 'depois' },
            { from: 'depois', to: 'tools', cond: 'AIMessage com tool_calls' },
            { from: 'depois', to: 'fim', cond: 'sem tool_calls' },
            { from: 'tools', to: 'antes', label: 'ToolMessage(s)' },
          ],
          runs: [
            {
              label: '«O meu pedido PD-8842507 ainda vai demorar muito?»',
              path: [['inicio'], ['antes'], ['model'], ['depois'], ['tools'], ['antes'], ['model'], ['depois'], ['fim']],
              note: 'Duas chamadas ao modelo, uma ronda de ferramentas.',
              outcome: 'Resposta com o ETA de 38 minutos.',
            },
            {
              label: 'Modelo que pede sempre mais uma leitura, com `run_limit=3`',
              path: [['inicio'], ['antes'], ['model'], ['depois'], ['tools'], ['antes'], ['model'], ['depois'], ['tools'], ['antes'], ['model'], ['depois'], ['tools'], ['antes'], ['fim']],
              note: 'O quarto `before_model` vê três chamadas feitas e salta para o fim.',
              outcome: 'Termina com uma `AIMessage` «Model call limits exceeded: run limit (3/3)»: o chamador trata-a como escalamento e nunca a mostra ao cliente.',
            },
          ],
          note: 'Sem middleware de limite, o único travão é o `recursion_limit` da execução, que no LangGraph 1.2 vale 10 007 por omissão: mais de cinco mil voltas do ciclo.',
        },
      },
      {
        type: 'table',
        head: ['Middleware (`langchain.agents.middleware`)', 'Parâmetros', 'Para quê'],
        rows: [
          ['`ModelCallLimitMiddleware`', '`thread_limit`, `run_limit`, `exit_behavior` (`"end"` ou `"error"`)', 'Máximo de chamadas ao modelo por execução ou por conversa.'],
          ['`ToolCallLimitMiddleware`', '`tool_name`, `thread_limit`, `run_limit`, `exit_behavior` (`"continue"`, `"error"`, `"end"`)', 'Máximo de chamadas no total ou de uma ferramenta (ex. três pesquisas por turno).'],
          ['`ModelFallbackMiddleware`', '`first_model`, `*additional_models`', 'Outro modelo quando o principal falha.'],
          ['`ModelRetryMiddleware`, `ToolRetryMiddleware`', '`max_retries`, `backoff_factor`, `initial_delay`, `jitter`, `retry_on`', 'Retentativas com backoff ao nível do modelo ou da ferramenta.'],
          ['`HumanInTheLoopMiddleware`', '`interrupt_on={"emitir_reembolso": True}`', 'Pára antes de uma ferramenta e espera por decisão humana; precisa de checkpointer (módulo 17).'],
          ['`SummarizationMiddleware`, `PIIMiddleware`', 'vários', 'Resumo de histórico longo (módulo 18) e deteção de dados pessoais (módulo 24).'],
        ],
        caption: 'Middlewares relevantes para o «Balcão», com os parâmetros de `langchain` 1.4. Um middleware é um gancho antes ou depois do modelo, ou à volta de cada chamada de ferramenta.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O mesmo agente com limites explícitos: no máximo 4 chamadas ao modelo e 3 pesquisas por execução, e um `recursion_limit` que é rede de segurança, não mecanismo de controlo.',
        code: `from langchain.agents.middleware import ModelCallLimitMiddleware, ToolCallLimitMiddleware

agente = create_agent(
    modelo,
    ferramentas_da_intencao("compensacao"),        # nunca as 12 quando bastam 5
    system_prompt=sistema.texto,
    middleware=[
        ModelCallLimitMiddleware(run_limit=4, exit_behavior="end"),
        ToolCallLimitMiddleware(tool_name="pesquisar_conhecimento", run_limit=3),
    ],
)
agente.invoke(entrada, {"recursion_limit": 25,
                        "configurable": {"thread_id": conversa_id, "cliente_id": cliente_id}})`,
      },
      {
        type: 'callout',
        tone: 'warn',
        title: '`create_agent` é um ponto de partida, não o fluxo do «Balcão»',
        text:
          'O agente pronto é um ciclo único com todas as decisões dentro do modelo. O «Balcão» precisa de classificar antes de qualquer modelo decidir ferramentas, de levar casos de saúde para um humano sem passar pelo agente, e de parar num `interrupt` quando um reembolso passa os 500 MZN. Por isso o subciclo `agente`/`ferramentas` do laboratório é um par de nós de um `StateGraph` escrito à mão (módulo 16), com `ToolNode` e um interceptor de política, e não um `create_agent`.',
      },
      { type: 'file', ref: 'src/balcao/ferramentas.py' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — agentes (`create_agent`)', url: 'https://docs.langchain.com/oss/python/langchain/agents' },
          { label: 'LangChain — middleware incorporado', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
          { label: 'LangChain — guia de migração para a 1.0', url: 'https://docs.langchain.com/oss/python/migrate/langchain-v1' },
        ],
      },
    ],
  },
];
