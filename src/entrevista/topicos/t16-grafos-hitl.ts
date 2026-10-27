import type { TopicoEntrevista } from '../../types';

const CODIGO_GRAFO = `from typing import Annotated, Literal, TypedDict
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages


class Estado(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]  # reducer: acrescenta
    intencao: str                                        # sem reducer: substitui


def classificar(estado: Estado) -> dict:
    texto = estado["messages"][-1].content.lower()
    return {"intencao": "reembolso" if "reembolso" in texto else "estado"}


def rota(estado: Estado) -> Literal["reembolso", "estado"]:
    return estado["intencao"]


def reembolso(estado: Estado) -> dict:
    return {"messages": [AIMessage("Vou calcular o reembolso.")]}


def estado_pedido(estado: Estado) -> dict:
    return {"messages": [AIMessage("O pedido está a caminho.")]}


g = StateGraph(Estado)
g.add_node("classificar", classificar)
g.add_node("reembolso", reembolso)
g.add_node("estado", estado_pedido)
g.add_edge(START, "classificar")
g.add_conditional_edges("classificar", rota)
g.add_edge("reembolso", END)
g.add_edge("estado", END)
app = g.compile()

out = app.invoke({"messages": [HumanMessage("Quero reembolso do PD-1001")]})
print(out["intencao"], [m.content for m in out["messages"]])
# reembolso ['Quero reembolso do PD-1001', 'Vou calcular o reembolso.']`;

const CODIGO_INTERRUPT = `from langgraph.types import Command, interrupt

def aprovar(estado: Estado) -> dict:
    if estado["valor_mzn"] <= 500:
        return {"decisao": {"aprovado": True, "revisor": "auto"}}
    # Tudo o que estiver antes desta linha volta a correr ao retomar.
    decisao = interrupt({"pedido_id": estado["pedido_id"], "valor_mzn": estado["valor_mzn"]})
    if not isinstance(decisao, dict) or not isinstance(decisao.get("aprovado"), bool):
        raise ValueError("decisão inválida")  # o valor de resume é entrada externa
    return {"decisao": decisao}

grafo = builder.compile(checkpointer=checkpointer)    # sem checkpointer não há interrupt
cfg = {"configurable": {"thread_id": "reembolso:PD-8841273"}}

out = grafo.invoke(estado_inicial, cfg)
out["__interrupt__"][0].value   # {'pedido_id': 'PD-8841273', 'valor_mzn': 2910}
grafo.get_state(cfg).next       # ('aprovar',)

# Horas depois, noutro processo, com o mesmo thread_id:
grafo.invoke(Command(resume={"aprovado": True, "revisor": "supervisor:ana"}), cfg)`;

export const topico: TopicoEntrevista = {
  id: 'grafos-hitl',
  numero: 16,
  bloco: 'agentes',
  titulo: 'Grafos de estado, persistência e humano no circuito',
  resumo:
    'StateGraph, reducers e arestas condicionais; checkpoints por super-step e retomar depois de uma falha; interrupts com aprovação humana; efeitos secundários que correm duas vezes; time travel; durable execution comparada com Temporal e Step Functions. É aqui que se vê quem já operou um fluxo com dinheiro e humanos no meio.',
  icon: '🕸️',
  modulos: ['langgraph', 'langgraph-persistencia'],
  essencial: [
    'StateGraph: estado tipado, nós que devolvem actualizações parciais, arestas fixas e condicionais, START e END. Uma chave sem reducer é substituída; com reducer é combinada.',
    '`add_messages` acrescenta mensagens e substitui as que têm o mesmo id; `operator.add` só concatena.',
    'Checkpoint = snapshot do estado no fim de cada super-step, por `thread_id`. Em produção `PostgresSaver` (pacote `langgraph-checkpoint-postgres`, chamar `setup()` uma vez); `InMemorySaver` só em testes.',
    'Retomar depois de falha: invocar com `None` e o mesmo `thread_id`. Nós que terminaram no super-step falhado não voltam a correr; o nó que falhou corre outra vez do início.',
    'Durability: `"exit"`, `"async"` (por omissão) e `"sync"`. Nenhum modo torna um efeito externo exactamente-uma-vez.',
    '`interrupt(valor)` pára o grafo e devolve `__interrupt__`; retoma-se com `Command(resume=...)` no mesmo thread. O nó recomeça do início: o que está antes do interrupt corre outra vez.',
    'Um nó pode correr mais de uma vez: resume de interrupt, retry, recuperação de falha, replay. Efeitos externos levam chave de idempotência ou vão para um nó próprio depois da decisão.',
    '`get_state_history` lista checkpoints; invocar com um `checkpoint_id` antigo salta os nós anteriores e re-executa os seguintes; `update_state(config, valores, as_node=...)` cria um checkpoint novo (fork), passando pelos reducers.',
    '`Send(nó, estado)` devolvido por uma aresta condicional faz fan-out paralelo no mesmo super-step; a chave onde os ramos escrevem precisa de reducer, senão `InvalidUpdateError`.',
    'LangGraph é durable execution dentro da aplicação Python; Temporal e Step Functions são motores de workflow genéricos, com mais garantias operacionais e menos ergonomia para LLMs.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-grafos-hitl-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'StateGraph: estado, nós, arestas condicionais e reducers',
      enunciado:
        'Explica-me como se monta um StateGraph no LangGraph. O que é o estado, o que devolve um nó, e para que serve um reducer como o `add_messages`?',
      minutos: 5,
      dica: 'O que acontece quando dois nós escrevem na mesma chave?',
      resposta: [
        {
          type: 'p',
          text: 'Um StateGraph é um **grafo de nós que lêem e actualizam um estado partilhado e tipado**. Cada nó é uma função que recebe o estado e devolve só as chaves que quer mudar; as arestas dizem qual corre a seguir, fixas ou decididas por uma função de routing; e um **reducer** define como uma actualização se combina com o valor que já lá estava.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Router com aresta condicional; resultado verificado com langgraph 1.2',
          code: CODIGO_GRAFO,
        },
        {
          type: 'p',
          text: 'Sem reducer, a chave é substituída. Com `Annotated[list, add_messages]`, as mensagens novas são acrescentadas, e uma mensagem com o mesmo id de uma existente substitui-a, o que serve para editar. Com `operator.add` é só concatenação. O reducer importa sobretudo quando há ramos em paralelo: dois nós no mesmo super-step a escrever numa chave sem reducer dá `InvalidUpdateError`.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Super-step', def: 'Uma iteração do grafo: os nós activos correm (em paralelo, se forem vários) e as actualizações aplicam-se no fim.' },
            { term: 'Aresta condicional', def: '`add_conditional_edges(origem, função)`: a função lê o estado e devolve o nome do próximo nó (ou uma lista de `Send`).' },
            { term: '`Command`', def: 'Um nó pode devolver `Command(update=..., goto=...)` para actualizar e encaminhar de uma vez.' },
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Devolver o estado inteiro',
          text: 'Um nó que devolve o estado todo, em vez de só o que mudou, passa as mensagens outra vez pelo `add_messages`. Como têm os mesmos ids não duplicam, mas com `operator.add` duplicavam. Devolve só o delta.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Graph API (estado, reducers, arestas, Send, Command)', url: 'https://docs.langchain.com/oss/python/langgraph/graph-api' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Descreve o estado tipado e nós que devolvem actualizações parciais.',
          'Explica arestas fixas e condicionais, com START e END.',
          'Explica o reducer e a diferença entre substituir e combinar.',
          'Sabe que `add_messages` acrescenta e substitui por id.',
          'Liga reducers a escritas paralelas no mesmo super-step.',
        ],
        fraco: 'Descreve o grafo como «um fluxograma de prompts», sem estado nem reducers.',
        solido: 'Monta o grafo com estado, nós, aresta condicional e explica `add_messages`.',
        excelente: 'Acrescenta super-steps, o erro de escritas paralelas sem reducer e a regra de devolver só o delta.',
      },
      seguimento: [
        'Como apagavas uma mensagem do estado com `add_messages`?',
        'Quando usavas `Command(goto=...)` em vez de uma aresta condicional?',
        'Que tipo usavas para o estado: TypedDict, dataclass ou Pydantic? Porquê?',
      ],
      sinaisAlarme: [
        'Achar que cada nó recebe só a saída do nó anterior, como numa cadeia.',
        'Não saber o que acontece quando dois ramos escrevem na mesma chave.',
      ],
      modulos: ['langgraph'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-grafos-hitl-02',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Grafo explícito ou agente livre com ferramentas',
      enunciado:
        'Para o fluxo de reembolsos de um marketplace, um colega quer dar todas as ferramentas a um agente ReAct e deixá-lo decidir. Tu propões um grafo explícito. Defende a tua posição e diz o que perdes.',
      minutos: 7,
      dica: 'Onde é que ficam as regras que não podem falhar?',
      resposta: [
        {
          type: 'p',
          text: 'Num fluxo com dinheiro, **as regras que não podem falhar têm de estar em arestas e código, não na probabilidade de o modelo as seguir**. O grafo explícito põe o limite de valor, a confirmação do cliente e a aprovação humana em sítios fixos e testáveis; o modelo continua a decidir onde a decisão varia (interpretar o pedido, explicar ao cliente), mas não decide se o dinheiro sai.',
        },
        {
          type: 'compare',
          left: {
            title: 'Grafo explícito',
            items: [
              'Garantias estruturais: não há caminho de `calcular` para `emitir` que não passe por `aprovar`',
              'Testes por aresta, deterministas',
              'Checkpoints em pontos com significado de negócio',
              'Menos chamadas ao modelo, latência previsível',
              'Cada caso novo exige mudar o grafo',
            ],
          },
          right: {
            title: 'Agente livre',
            items: [
              'Lida com casos que ninguém previu',
              'Menos código de orquestração no início',
              'As regras vivem no prompt e na descrição das ferramentas',
              'Variância de passos e custo maior',
              'Uma prompt injection pode tentar saltar passos',
            ],
          },
        },
        {
          type: 'p',
          text: 'O que perco é flexibilidade: um caso estranho, como um pedido com metade dos artigos trocados e um cupão aplicado, pode não caber nos ramos. Respondo a isso com um nó de agente **dentro** do grafo, com ferramentas de leitura, que propõe uma compensação; o resto do grafo (limites, confirmação, aprovação, emissão idempotente) não muda. E um ramo de escalamento para humano para o que nem esse nó resolve.',
        },
        {
          type: 'p',
          text: 'Mesmo com agente livre, as regras críticas tinham de estar na ferramenta (`emitir_reembolso` recusa acima de 500 MZN sem aprovação registada). Mas aí o modelo descobre a regra por tentativa e erro, gastando passos, e a experiência do cliente fica imprevisível. O grafo torna o caminho legível para auditoria, que num fluxo financeiro é requisito, não luxo.',
        },
        {
          type: 'adr',
          ref: 'adr-0013',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
            { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Argumenta que regras críticas vivem na estrutura e no código, não no prompt.',
          'Reconhece o que se perde (flexibilidade para casos imprevistos).',
          'Propõe um nó de agente dentro do grafo para a parte variável.',
          'Menciona que a ferramenta valida limites mesmo assim (defesa em profundidade).',
          'Liga a escolha a auditoria, testes e custo.',
        ],
        fraco: 'Prefere o grafo «porque é mais controlado», sem dizer o que se perde nem onde fica a flexibilidade.',
        solido: 'Compara as duas opções com garantias estruturais versus flexibilidade e propõe um nó de agente dentro do grafo.',
        excelente: 'Acrescenta defesa em profundidade na ferramenta, prompt injection como ameaça concreta ao agente livre e auditoria como requisito do domínio.',
      },
      seguimento: [
        'Como testavas que não existe nenhum caminho que salte a aprovação?',
        'Que métricas te diriam que o grafo está a deixar demasiados casos para humanos?',
        'Onde punhas a confirmação do cliente: no grafo ou na ferramenta?',
      ],
      sinaisAlarme: [
        'Confiar no prompt de sistema para impor o limite de valor.',
        'Recusar qualquer autonomia do modelo sem dizer como se lida com casos imprevistos.',
      ],
      modulos: ['langgraph', 'agentes'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-grafos-hitl-03',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que guarda um checkpointer e como retomas depois de um crash',
      enunciado:
        'O pod que corre o grafo morre a meio de um turno. O que é que o checkpointer guardou, de onde é que a execução recomeça e quem é que a recomeça?',
      minutos: 5,
      dica: 'Em que momento exacto é escrito um checkpoint?',
      resposta: [
        {
          type: 'p',
          text: 'O checkpointer guarda um **snapshot do estado no fim de cada super-step**, agrupado por `thread_id`: os valores das chaves, os próximos nós a correr e metadados. Depois de um crash, volto a invocar o grafo com `None` como entrada e o mesmo `thread_id`, e a execução recomeça no super-step que não terminou. Quem o faz sou eu (um worker de recuperação) ou a plataforma onde o grafo corre; a biblioteca sozinha não tem um processo que retome por iniciativa própria.',
        },
        {
          type: 'p',
          text: 'Um grafo `START → a → b → END` produz quatro checkpoints: o inicial vazio, a entrada, depois de `a` e depois de `b`. Se `b` rebentar, `get_state(cfg).next` devolve `("b",)`, e `invoke(None, cfg)` corre só `b`; `a` não volta a correr. Se vários nós corriam em paralelo nesse super-step, os que terminaram têm as escritas guardadas como pending writes e também não repetem.',
        },
        {
          type: 'table',
          head: ['Durability', 'Quando grava', 'Risco'],
          rows: [
            ['`"exit"`', 'Só quando a execução termina ou pára', 'Um crash a meio perde o progresso todo do turno'],
            ['`"async"` (por omissão)', 'Em paralelo com o super-step seguinte', 'Janela pequena em que um checkpoint se perde num crash'],
            ['`"sync"`', 'Antes de começar o super-step seguinte', 'Latência extra por passo, em troca da garantia'],
          ],
        },
        {
          type: 'p',
          text: 'Em produção uso `PostgresSaver` (pacote `langgraph-checkpoint-postgres`, com `setup()` uma vez para criar as tabelas) ou a versão assíncrona; `InMemorySaver` só em testes. E penso no crescimento: cada super-step escreve um checkpoint, por isso preciso de uma política de retenção por thread.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O nó que falhou recomeça do início',
          text: 'A granularidade é o nó, não a linha. Se o nó chamou uma API de pagamentos e o processo morreu antes de o nó terminar, ao retomar a chamada repete-se. O checkpointer dá-te retomar, não exactamente-uma-vez.',
        },
        {
          type: 'adr',
          ref: 'adr-0014',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Checkpointers (super-steps, pending writes, durability)', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
            { label: 'LangGraph — Persistence', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o checkpoint é escrito no fim de cada super-step e indexado por `thread_id`.',
          'Sabe retomar com entrada `None` e o mesmo `thread_id`.',
          'Explica que nós já terminados não repetem e que o nó interrompido recomeça do início.',
          'Conhece os modos de durability e o seu custo.',
          'Diz quem dispara a recuperação e menciona retenção de checkpoints.',
        ],
        fraco: '«O LangGraph guarda tudo e continua sozinho de onde parou», sem super-steps nem granularidade de nó.',
        solido: 'Explica checkpoints por super-step, retomar com `None`, `PostgresSaver` e que o nó falhado repete.',
        excelente: 'Acrescenta pending writes em paralelo, modos de durability, quem retoma em produção e a consequência para efeitos externos.',
      },
      seguimento: [
        'Como é que o teu worker de recuperação descobre que threads ficaram a meio?',
        'Que política de retenção punhas nos checkpoints e porquê?',
        'Quando escolherias `durability="sync"`?',
      ],
      sinaisAlarme: [
        'Usar `InMemorySaver` em produção.',
        'Achar que o checkpointer garante que uma chamada externa acontece uma só vez.',
      ],
      modulos: ['langgraph-persistencia'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-grafos-hitl-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Aprovação humana com interrupt e Command(resume)',
      enunciado:
        'Reembolsos acima de um limite precisam de aprovação de um supervisor, que pode demorar horas. Como implementas isso no LangGraph, e o que acontece exactamente quando o supervisor responde?',
      minutos: 6,
      dica: 'O processo que pausou e o que retoma não são o mesmo, e o nó não continua da linha onde parou.',
      resposta: [
        {
          type: 'p',
          text: 'Dentro do nó de aprovação chamo `interrupt(payload)` com os dados que o supervisor precisa de ver; o grafo pára, o estado fica no checkpoint e o chamador recebe o payload em `__interrupt__`. Quando o supervisor decide, qualquer processo invoca o grafo com `Command(resume=decisão)` e o **mesmo `thread_id`**; o nó **recomeça do início** e, desta vez, `interrupt` devolve a decisão em vez de parar.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Nó de aprovação; comportamento verificado com langgraph 1.2 e InMemorySaver',
          code: CODIGO_INTERRUPT,
        },
        {
          type: 'list',
          items: [
            '**Precisa de checkpointer** e de `thread_id`: sem isso não há onde guardar a pausa. Em produção, durável, porque a espera é de horas e atravessa deploys.',
            '**O nó volta a correr do início**: o código antes do `interrupt` executa outra vez. Nada de efeitos não idempotentes antes dele.',
            '**Vários interrupts no mesmo nó** são emparelhados com os valores de resume por ordem; não os ponhas atrás de condições que mudam entre execuções.',
            '**O valor de resume é entrada externa**: valido o formato e registo quem decidiu, em vez de confiar no que chega.',
          ],
        },
        {
          type: 'p',
          text: 'Desenho o payload para o humano decidir sem abrir outra ferramenta: valor, política citada, histórico de reembolsos do cliente, sinais de fraude. E dou-lhe as três decisões possíveis (aprovar, recusar, aprovar com outro valor), mapeadas para ramos do grafo. Num agente feito com `create_agent`, o `HumanInTheLoopMiddleware` faz o mesmo à volta das chamadas de ferramenta.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Thread próprio para a aprovação',
          text: 'Se o fluxo de reembolso vive no mesmo thread da conversa, uma nova mensagem do cliente encontra o grafo parado num interrupt. Prefiro um thread por reembolso, com a conversa a consultar o estado dele, para as duas coisas não colidirem.',
        },
        {
          type: 'adr',
          ref: 'adr-0015',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Interrupts', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
            { label: 'LangChain — HumanInTheLoopMiddleware', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa `interrupt(payload)` dentro do nó e retoma com `Command(resume=...)` no mesmo `thread_id`.',
          'Sabe que o nó recomeça do início e o que isso implica para o código antes do interrupt.',
          'Exige checkpointer durável porque a espera atravessa processos e deploys.',
          'Valida o valor de resume e regista quem decidiu.',
          'Pensa no payload e nas decisões do ponto de vista do supervisor.',
        ],
        fraco: 'Diz que o grafo «fica à espera» num processo bloqueado, ou que continua da linha onde parou.',
        solido: 'Descreve interrupt e Command(resume) com checkpointer e thread_id, e avisa sobre o código antes do interrupt.',
        excelente: 'Acrescenta validação do resume, emparelhamento por ordem de vários interrupts, thread separado da conversa e um payload desenhado para decisão rápida.',
      },
      seguimento: [
        'O que acontece se dois supervisores aprovarem ao mesmo tempo?',
        'Como mostras ao cliente que o pedido está à espera de aprovação?',
        'Que diferença há entre `interrupt()` e `interrupt_before` no `compile`?',
      ],
      sinaisAlarme: [
        'Manter um processo ou uma ligação HTTP aberta durante horas à espera do humano.',
        'Pôr a notificação ao supervisor antes do `interrupt` sem idempotência.',
        'Aceitar o valor de resume sem validação.',
      ],
      modulos: ['langgraph-persistencia', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-grafos-hitl-05',
      tipo: 'conceito',
      nivel: 'staff',
      titulo: 'Um nó pode correr duas vezes: como desenhas os efeitos secundários',
      enunciado:
        'Em que situações é que um nó de um grafo do LangGraph corre mais do que uma vez para o mesmo thread, e que regras impões à equipa para os efeitos externos (pagamentos, emails, SMS)?',
      minutos: 6,
      dica: 'Conta quantos mecanismos diferentes fazem um nó recomeçar.',
      resposta: [
        {
          type: 'p',
          text: 'Um nó corre outra vez em pelo menos quatro situações: **ao retomar depois de um `interrupt`**, **num retry** configurado com `RetryPolicy`, **ao recuperar de um crash** que o apanhou a meio, e **no replay** a partir de um checkpoint antigo. A garantia do grafo é pelo menos uma vez, por isso todos os efeitos externos têm de ser idempotentes ou isolados.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Decidir e executar em nós separados', text: 'O nó que decide (calcular, aprovar) não tem efeitos externos. O nó que executa faz uma só coisa: o efeito. Assim, o que se repete numa retoma é pequeno e conhecido.' },
            { title: 'Chave de idempotência determinista', text: 'Derivada de dados de negócio estáveis, por exemplo `reembolso:{pedido_id}:{versão_da_decisão}`, nunca de um uuid gerado dentro do nó (seria diferente a cada execução). A API de pagamentos, ou uma tabela minha com restrição UNIQUE, rejeita a segunda.' },
            { title: 'Nada não idempotente antes de um interrupt', text: 'Notificações e registos antes do `interrupt` passam a upserts, ou mudam-se para depois dele ou para um nó anterior.' },
            { title: 'Outbox para efeitos críticos', text: 'O nó grava a intenção (linha numa tabela, na mesma base de dados) e um worker executa com a chave e marca como feito. O grafo fica rápido e o efeito tem a sua própria máquina de estados e reconciliação.' },
            { title: 'Replay em modo seguro', text: 'Quando faço time travel para depurar, as ferramentas de escrita estão em modo simulado ou a chave garante que nada repete.' },
          ],
        },
        {
          type: 'p',
          text: 'Na Functional API do LangGraph, os resultados de funções `@task` ficam no checkpoint e não voltam a correr ao retomar, o que ajuda; mas uma task interrompida a meio repete na mesma. Nenhum modo de durability transforma uma chamada HTTP externa em exactamente-uma-vez; isso só se obtém com idempotência do lado de quem recebe.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Ler antes de escrever não chega',
          text: '«Verifico se já existe reembolso e só emito se não existir» tem uma corrida entre a leitura e a escrita, e falha se o crash for entre a chamada à API e o registo local. A protecção tem de estar numa restrição atómica ou na chave enviada ao fornecedor.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Interrupts (efeitos secundários antes do interrupt)', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
            { label: 'LangGraph — Checkpointers e durability', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
            { label: 'Martin Fowler — Patterns of Distributed Systems', url: 'https://martinfowler.com/articles/patterns-of-distributed-systems/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Enumera pelo menos três mecanismos de re-execução (interrupt, retry, recuperação, replay).',
          'Conclui que a garantia é pelo menos uma vez e que efeitos têm de ser idempotentes.',
          'Propõe chave de idempotência determinista a partir de dados de negócio.',
          'Separa decisão de execução e evita efeitos antes de interrupts.',
          'Aponta a corrida do «verificar e depois escrever» e propõe restrição atómica ou outbox.',
        ],
        fraco: 'Diz que o checkpointer garante que cada nó só corre uma vez.',
        solido: 'Conhece a re-execução no resume e em falhas, e usa chaves de idempotência nas chamadas externas.',
        excelente: 'Enumera os quatro mecanismos, separa decidir de executar, usa outbox com reconciliação e transforma isto em regra de revisão de código da equipa.',
      },
      seguimento: [
        'Que chave de idempotência usavas para um reembolso que o supervisor aprova com outro valor?',
        'Como reconciliavas os reembolsos emitidos com o que o grafo julga ter feito?',
        'Que teste automático apanharia um efeito antes de um interrupt?',
      ],
      sinaisAlarme: [
        'Gerar a chave de idempotência com `uuid4()` dentro do nó.',
        'Confiar num modo de durability para evitar duplicados.',
      ],
      modulos: ['langgraph-persistencia', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-grafos-hitl-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Time travel e update_state para corrigir um thread',
      enunciado:
        'O modelo extraiu o valor errado de uma reclamação e o grafo está parado à espera de aprovação com esse valor. Como corriges o estado sem recomeçar a conversa, e como usarias o histórico de checkpoints para depurar?',
      minutos: 5,
      dica: 'Corrigir um checkpoint não é editá-lo.',
      resposta: [
        {
          type: 'p',
          text: 'Uso `update_state(config, {"valor_mzn": 450})`: cria **um checkpoint novo** com o valor corrigido, sem tocar no antigo, e o thread continua a partir daí. Para depurar uso `get_state_history(config)`, que lista os checkpoints do mais recente para o mais antigo, e posso retomar a partir de um `checkpoint_id` anterior: os nós antes dele não correm, os seguintes correm outra vez.',
        },
        {
          type: 'list',
          items: [
            '**`update_state` passa pelos reducers**: actualizar `messages` com `add_messages` acrescenta, não substitui. Para corrigir uma mensagem envio-a com o mesmo id; para a remover, uso `RemoveMessage`.',
            '**`as_node`** diz como se a actualização viesse de um nó, e isso decide o que corre a seguir. Sem ele, o próximo nó continua a ser o que estava pendente.',
            '**Replay re-executa** tudo depois do checkpoint escolhido: chamadas ao modelo, ferramentas e interrupts. Com escritas reais, isso é um efeito repetido.',
            '**Auditoria**: cada correcção é um checkpoint novo; guardo nos metadados quem corrigiu e porquê.',
          ],
        },
        {
          type: 'p',
          text: 'No caso concreto: o nó de aprovação está pendente; depois do `update_state` com o valor certo, quando retomo, o nó recomeça do início e lê o valor novo. Se ficou abaixo do limite, segue o caminho autónomo e o interrupt nem chega a acontecer. É o comportamento que quero, mas tenho de o saber, porque o supervisor que tinha o pedido na fila vai vê-lo desaparecer.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Depurar um incidente com um fork',
          text: 'Copio o checkpoint do thread de produção para um ambiente de depuração, faço fork antes do passo que correu mal, mudo o prompt ou o modelo e re-executo. É a forma mais barata de transformar um incidente num caso do golden set com o estado real.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Checkpointers (get_state_history, replay, update_state)', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa `update_state` e sabe que cria um checkpoint novo em vez de editar.',
          'Sabe que a actualização passa pelos reducers (o caso de `add_messages`).',
          'Explica o replay a partir de um `checkpoint_id`: anteriores saltados, seguintes re-executados.',
          'Aponta o risco de efeitos repetidos no replay.',
          'Explica o efeito de `as_node` no próximo nó.',
        ],
        fraco: 'Propõe fazer UPDATE directo na tabela de checkpoints.',
        solido: 'Usa `update_state` e `get_state_history`, e sabe que o replay re-executa os nós seguintes.',
        excelente: 'Acrescenta reducers e `RemoveMessage`, `as_node`, a consequência na fila do supervisor e o fork para transformar incidentes em casos de teste.',
      },
      seguimento: [
        'Quem pode chamar `update_state` em produção e como fica registado?',
        'O que acontece às chaves de idempotência num fork?',
        'Como removerias uma mensagem com dados pessoais do histórico?',
      ],
      sinaisAlarme: [
        'Editar a base de dados de checkpoints à mão.',
        'Fazer replay em produção com ferramentas de escrita reais sem pensar nisso.',
      ],
      modulos: ['langgraph-persistencia'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-grafos-hitl-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'LangGraph, Temporal ou Step Functions para execução durável',
      enunciado:
        'A tua empresa já usa Temporal para workflows de negócio, e a equipa de IA quer LangGraph para os agentes. Outro grupo usa AWS Step Functions. Que trade-offs pões na mesa para decidir o que orquestra um fluxo com LLM, aprovação humana e pagamentos?',
      minutos: 9,
      dica: 'Pensa no que cada motor garante, em quem o opera, e em onde o LLM entra.',
      resposta: [
        {
          type: 'p',
          text: 'LangGraph dá-me **ergonomia para LLMs** (estado com mensagens, streaming de tokens, interrupts, integração com ferramentas) e persistência suficiente para conversas e aprovações. Temporal e Step Functions dão **garantias operacionais mais fortes e maduras** para processos longos de negócio. Para um fluxo com pagamentos e horas de espera, a separação que costumo propor é: o motor de workflow da empresa orquestra o processo de negócio; o LangGraph corre os passos com LLM dentro dele, como actividades.',
        },
        {
          type: 'table',
          head: ['', 'LangGraph', 'Temporal', 'Step Functions (Standard)'],
          rows: [
            ['Modelo de durabilidade', 'Checkpoint por super-step; nó repete ao retomar', 'Histórico de eventos; o código do workflow é re-executado de forma determinista; actividades com retries', 'Estado gerido pelo serviço; execução de workflow exactamente-uma-vez, tarefas com retries'],
            ['Espera por humano', '`interrupt` + `Command(resume)`', 'Signals e timers duráveis', 'Callback com task token'],
            ['Timeouts e expiração', 'Tens de construir (job externo)', 'Timers nativos', 'Timeouts por estado nativos'],
            ['Ergonomia para LLM', 'Nativa', 'Genérica; o LLM entra como actividade', 'Genérica; o LLM entra como Lambda ou serviço'],
            ['Operação', 'Biblioteca na tua app, ou plataforma da LangChain', 'Cluster próprio ou cloud gerida', 'Serviço gerido na AWS'],
            ['Restrições', 'Efeitos externos idempotentes', 'Código de workflow determinista (nada de IO, relógio ou aleatório directo)', 'Definição em JSON (ASL), limites de payload por estado'],
          ],
        },
        {
          type: 'p',
          text: 'Os critérios que uso: o fluxo dura minutos ou dias? Há prazos legais ou de SLA que precisam de timers fiáveis? Quem está de prevenção e o que já sabe operar? Quanto do fluxo é raciocínio do modelo e quanto é processo fixo? Se é sobretudo conversa com algumas pausas, LangGraph chega. Se é um processo de negócio com prazos, compensações (sagas) e auditoria, o motor de workflow manda e o LLM é um passo.',
        },
        {
          type: 'p',
          text: 'Em qualquer combinação, a idempotência dos efeitos continua a ser minha: Temporal re-tenta actividades e Step Functions re-tenta tarefas, tal como o LangGraph repete nós. O que muda é quem guarda o progresso e quem acorda o fluxo quando um prazo vence.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Dois motores de estado para o mesmo processo',
          text: 'Pôr aprovação no LangGraph e o pagamento no Temporal, cada um com o seu estado, cria duas verdades que divergem num incidente. Um processo de negócio tem um dono do estado; o outro motor guarda só estado interno de um passo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Checkpointers e durability', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
            { label: 'AWS Step Functions — Developer Guide', url: 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html' },
            { label: 'Temporal — repositório e documentação', url: 'https://github.com/temporalio/temporal' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Compara o modelo de durabilidade dos três (checkpoint por passo, histórico de eventos com replay determinista, estado gerido).',
          'Nomeia o mecanismo de espera por humano de cada um.',
          'Aponta que timeouts e expiração são nativos em Temporal e Step Functions e não no LangGraph.',
          'Propõe uma divisão de responsabilidades (motor de negócio orquestra, LangGraph corre passos com LLM).',
          'Mantém que a idempotência dos efeitos é responsabilidade da equipa em qualquer motor.',
        ],
        fraco: 'Escolhe pela popularidade, ou acha que qualquer um dos três elimina duplicados.',
        solido: 'Compara durabilidade, espera humana e operação, e decide pelo tipo de fluxo.',
        excelente: 'Propõe um dono único do estado do processo, LangGraph como actividade, critérios de decisão ligados a SLA e operação, e a idempotência como invariante transversal.',
      },
      seguimento: [
        'Como chamavas um grafo LangGraph de dentro de uma actividade Temporal e o que fazias aos checkpoints?',
        'Porque é que o código de um workflow Temporal não pode chamar o LLM directamente?',
        'Que custo operacional tem introduzir Temporal numa equipa que não o conhece?',
      ],
      sinaisAlarme: [
        'Dizer que Temporal garante exactamente-uma-vez para chamadas externas.',
        'Ignorar quem opera o sistema às três da manhã.',
        'Não saber que o LangGraph não tem timers nativos para expiração.',
      ],
      modulos: ['langgraph-persistencia', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-grafos-hitl-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Fan-out com Send: processar N itens em paralelo',
      enunciado:
        'Uma seguradora recebe participações de sinistro com 3 a 15 documentos anexos. Queres extrair dados de cada documento em paralelo e depois juntar. Como fazes isto num grafo, e o que acontece se um dos documentos falhar?',
      minutos: 5,
      dica: 'Quantos nós desenhas no grafo para N documentos que só conheces em tempo de execução?',
      resposta: [
        {
          type: 'p',
          text: 'Uso **`Send`**: a função de uma aresta condicional devolve uma lista `[Send("extrair", {"doc": d}) for d in docs]`, e o LangGraph corre o nó `extrair` uma vez por documento, cada um com o seu próprio estado de entrada, em paralelo no mesmo super-step. Os resultados juntam-se numa chave com reducer (`Annotated[list, operator.add]`) e um nó `agregar` corre a seguir.',
        },
        {
          type: 'p',
          text: 'O reducer é obrigatório: se os ramos escreverem numa chave sem reducer, o grafo levanta `InvalidUpdateError`, porque recebe vários valores para a mesma chave no mesmo passo. E como a ordem de conclusão não é garantida, cada resultado leva o id do documento; o `agregar` não pode depender da posição na lista.',
        },
        {
          type: 'list',
          items: [
            '**Falha de um ramo**: o super-step falha. Os ramos que terminaram ficam guardados como pending writes no checkpoint; ao retomar, só o que falhou volta a correr. Isto só funciona com checkpointer.',
            '**Falha esperada** (documento ilegível): melhor apanhá-la no nó e devolver `{"doc": id, "erro": "ilegivel"}`, para o agregador decidir (pedir novo documento, seguir sem ele) em vez de bloquear tudo.',
            '**Retries**: `RetryPolicy` no nó `extrair` para erros transitórios do fornecedor do modelo.',
            '**Concorrência**: 15 chamadas paralelas por participação, vezes as participações em curso, batem no rate limit do fornecedor. Limito a concorrência do lado do cliente do modelo, não confio no grafo para isso.',
          ],
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Quando não usar Send',
          text: 'Se o número de ramos é fixo e conhecido (sempre três verificações), arestas estáticas a partir do mesmo nó também correm em paralelo e são mais legíveis. Send serve para N decidido em tempo de execução.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Graph API (Send e map-reduce)', url: 'https://docs.langchain.com/oss/python/langgraph/graph-api' },
            { label: 'LangGraph — Checkpointers (pending writes)', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa `Send` numa aresta condicional com um estado próprio por item.',
          'Junta os resultados numa chave com reducer e sabe o erro que dá sem ele.',
          'Não depende da ordem de conclusão dos ramos.',
          'Explica a falha de um ramo: pending writes e re-execução só do que falhou.',
          'Pensa em rate limits do fornecedor com fan-out alto.',
        ],
        fraco: 'Faz um ciclo sequencial dentro de um nó, ou cria um nó por documento à mão.',
        solido: 'Usa Send com reducer e um nó agregador, e trata erros por documento.',
        excelente: 'Acrescenta pending writes na recuperação, erros esperados como dados, limite de concorrência contra rate limits e quando arestas estáticas chegam.',
      },
      seguimento: [
        'Como juntavas os resultados se dois documentos se contradisserem?',
        'Que diferença há entre isto e um `asyncio.gather` dentro de um só nó?',
        'Como observavas a latência de cada ramo?',
      ],
      sinaisAlarme: [
        'Não saber que escritas paralelas precisam de reducer.',
        'Assumir que os resultados chegam pela ordem dos documentos.',
      ],
      modulos: ['langgraph'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-grafos-hitl-09',
      tipo: 'design',
      nivel: 'senior',
      titulo: 'Fluxo de aprovação de reembolsos com SLA humano e expiração',
      enunciado:
        'Desenha o fluxo de aprovação de reembolsos do assistente de suporte de um marketplace de entregas. Abaixo de 500 MZN o assistente emite sozinho depois de o cliente confirmar; acima, um supervisor tem de aprovar. Quero ver SLA, lembretes, expiração e o que acontece em cada falha.',
      contexto:
        'Cerca de 1 500 pedidos de compensação por dia, dos quais 6% acima de 500 MZN (cerca de 90 aprovações por dia, pico de 15 por hora ao jantar). 4 supervisores por turno, das 8h às 22h. SLA comunicado ao cliente: resposta em menos de 4 horas úteis. Pagamentos via API de carteira móvel que aceita chave de idempotência. O assistente já corre em LangGraph com checkpoints em PostgreSQL.',
      minutos: 18,
      dica: 'O LangGraph não acorda sozinho quando um prazo vence. Quem acorda?',
      resposta: [
        {
          type: 'p',
          text: 'Um grafo de reembolso por pedido, num **thread próprio** (`reembolso:{pedido_id}`), com o limite de 500 MZN numa aresta condicional, aprovação por `interrupt`, emissão num nó separado com chave de idempotência, e uma **tabela de aprovações** que é a fonte de verdade da fila humana. Um job agendado trata lembretes, escalamento e expiração, retomando o grafo com uma decisão de sistema.',
        },
        {
          type: 'h',
          text: 'Clarificações e números',
        },
        {
          type: 'p',
          text: 'Pergunto: o supervisor pode aprovar outro valor? O cliente pode cancelar enquanto espera? «4 horas úteis» conta só entre as 8h e as 22h? Assumo que sim às três. Com 90 aprovações por dia e 4 supervisores, são cerca de 22 por supervisor por turno; a 3 minutos cada, é cerca de uma hora de trabalho: a capacidade chega, o risco é o pico de 15 por hora e os pedidos que entram às 21h50.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Fluxo de aprovação de reembolsos',
            cols: 5,
            rows: 3,
            nodes: [
              { id: 'cliente', label: 'Cliente', sub: 'chat', col: 0, row: 0, kind: 'user' },
              { id: 'conversa', label: 'Grafo da conversa', sub: 'thread da conversa', col: 1, row: 0, kind: 'agent' },
              { id: 'reemb', label: 'Grafo de reembolso', sub: 'calcular, aprovar, emitir', col: 2, row: 0, kind: 'service' },
              { id: 'pag', label: 'API de pagamentos', sub: 'chave de idempotência', col: 3, row: 0, kind: 'external' },
              { id: 'sup', label: 'Supervisor', sub: 'backoffice', col: 4, row: 0, kind: 'user' },
              { id: 'ckpt', label: 'Checkpoints', sub: 'PostgresSaver', col: 2, row: 1, kind: 'data' },
              { id: 'aprov', label: 'Tabela de aprovações', sub: 'estado, prazo, decisor', col: 3, row: 1, kind: 'data' },
              { id: 'api', label: 'API de decisão', sub: 'UPDATE condicional e resume', col: 4, row: 1, kind: 'service' },
              { id: 'job', label: 'Job de SLA', sub: 'a cada 5 minutos', col: 3, row: 2, kind: 'queue' },
            ],
            edges: [
              { from: 'cliente', to: 'conversa' },
              { from: 'conversa', to: 'reemb', label: 'inicia thread' },
              { from: 'reemb', to: 'ckpt', style: 'dashed' },
              { from: 'reemb', to: 'aprov', label: 'pendente' },
              { from: 'reemb', to: 'pag', label: 'emitir' },
              { from: 'sup', to: 'api' },
              { from: 'api', to: 'aprov' },
              { from: 'api', to: 'reemb', label: 'Command(resume)' },
              { from: 'job', to: 'aprov', label: 'vencidas' },
              { from: 'job', to: 'reemb', label: 'resume expirado' },
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Calcular e encaminhar', text: 'O valor vem da ferramenta de cálculo, não do modelo. Até 500 MZN: confirmação do cliente e emissão. Acima: nó `pedir_aprovacao` faz upsert na tabela de aprovações (chave `pedido_id`) com prazo calculado em horas úteis, e chama `interrupt` com valor, política, histórico do cliente e sinais de fraude.' },
            { title: 'Decisão humana', text: 'O backoffice lê a fila da tabela, não dos checkpoints. A API de decisão faz `UPDATE aprovacoes SET estado = \'aprovado\' ... WHERE id = $1 AND estado = \'pendente\'`; só quem altera uma linha chama `Command(resume=...)`. Dois supervisores a clicar ao mesmo tempo dão uma decisão e um aviso, não dois resumes.' },
            { title: 'SLA e expiração', text: 'O job lê pendentes por prazo: a 50% do prazo, lembrete à fila; a 100%, escala para o coordenador de turno e avisa o cliente de que demora mais; a 24 horas, marca `expirado` com o mesmo UPDATE condicional e retoma o grafo com `{"decisao": "expirado"}`. Expirado nunca aprova sozinho: abre um ticket manual e responde ao cliente com um prazo novo.' },
            { title: 'Emissão', text: 'Nó `emitir` sozinho, com chave `reembolso:{pedido_id}:{versão da decisão}` enviada à API de pagamentos. Timeout ou erro ambíguo não re-tenta às cegas: consulta o estado do pagamento pela chave antes.' },
          ],
        },
        {
          type: 'h',
          text: 'Avaliação, falhas e o que fica para depois',
        },
        {
          type: 'list',
          items: [
            '**Métricas**: tempo até decisão (p50, p95) por faixa horária, taxa de expirados, taxa de aprovação por supervisor, reembolsos emitidos sem aprovação registada (tem de ser zero), duplicados detectados pela chave.',
            '**Falhas**: crash depois de `pedir_aprovacao` é inofensivo (upsert); deploy durante a espera não importa (estado em Postgres); API de pagamentos em baixo deixa o thread em `emitir` para o worker de recuperação retomar.',
            '**Segurança**: o limite vive na aresta e também na ferramenta de emissão, que recusa acima de 500 MZN sem aprovação válida na tabela; a decisão regista quem e quando.',
            '**Para depois**: priorizar a fila por valor e risco de fraude, e aprovação em lote para casos repetidos do mesmo incidente (um restaurante que falhou 30 pedidos).',
          ],
        },
        {
          type: 'adr',
          ref: 'adr-0015',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Interrupts', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
            { label: 'LangGraph — Checkpointers', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Põe o limite de valor numa aresta e na ferramenta, e a aprovação num `interrupt` com checkpointer durável.',
          'Tem uma fonte de verdade para a fila humana e evita resumes concorrentes com uma actualização condicional.',
          'Resolve expiração e lembretes com um mecanismo externo, porque o grafo não acorda sozinho.',
          'Define o que acontece ao expirar sem aprovar automaticamente.',
          'Emite num nó separado com chave de idempotência e trata timeouts ambíguos consultando o estado.',
          'Faz contas de capacidade com os números dados e define métricas de SLA.',
        ],
        fraco: 'Um interrupt e um botão de aprovar, sem prazo, sem concorrência, sem idempotência.',
        solido: 'Interrupt com Postgres, thread por reembolso, job de SLA e emissão idempotente.',
        excelente: 'Acrescenta a tabela como fonte de verdade com UPDATE condicional, expiração que nunca aprova, consulta pela chave antes de re-tentar, defesa em profundidade na ferramenta e métricas de operação da fila.',
      },
      seguimento: [
        'E se o cliente cancelar o pedido de reembolso enquanto está na fila?',
        'Como testavas o fluxo de expiração sem esperar 24 horas?',
        'O que mudava se o volume acima de 500 MZN triplicasse?',
      ],
      sinaisAlarme: [
        'Aprovar automaticamente quando o prazo expira.',
        'Ler a fila de aprovações directamente das tabelas de checkpoints.',
        'Não pensar em dois supervisores a decidir o mesmo pedido.',
      ],
      modulos: ['langgraph-persistencia', 'langgraph', 'balcao-ponta-a-ponta'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-grafos-hitl-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O reembolso foi emitido duas vezes depois de um restart',
      enunciado:
        'Ontem à noite houve um deploy com restart dos pods. Hoje a contabilidade encontrou 7 reembolsos pagos em duplicado, todos de pedidos que estavam a ser processados durante o deploy. O grafo usa checkpoints em PostgreSQL. O que aconteceu e como corriges?',
      contexto:
        'Nó `processar_reembolso`: lê o pedido, chama `emitir_reembolso` na API de carteira móvel (sem chave de idempotência), grava o id da transacção no estado. Os pods recebem SIGTERM com 30 s de graça; o deploy demorou 4 minutos. Um worker de recuperação corre `invoke(None, cfg)` para threads com `next` não vazio. Durability por omissão. Nos traços, os pares de chamadas à API têm o mesmo `thread_id` e estão separados por 40 a 90 segundos.',
      minutos: 12,
      dica: 'Em que momento é escrito o checkpoint de um nó, e onde estava o processo quando morreu?',
      resposta: [
        {
          type: 'p',
          text: 'Causa mais provável: o processo morreu **depois de a API de pagamentos executar e antes de o nó terminar**, por isso o checkpoint desse super-step nunca foi escrito. O worker de recuperação viu `next = ("processar_reembolso",)` e retomou; o nó recomeçou do início e chamou a API outra vez, sem chave de idempotência. O checkpointer fez exactamente o que promete: retomar, não exactamente-uma-vez.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Confirmar a sequência nos traços', text: 'Para cada um dos 7 pares: primeira chamada à API com resposta de sucesso (ou sem resposta registada), span do nó sem fim, fim do pod, e segunda chamada vinda do worker de recuperação. Os 40 a 90 segundos batem com o tempo até um pod novo e o worker passar.' },
            { title: 'Excluir outras causas', text: 'Há `RetryPolicy` no nó que re-tenta depois de um timeout em que o pagamento passou? Há um `interrupt` no mesmo nó depois da chamada? O resume teria o mesmo efeito. Houve duas instâncias do worker a retomar o mesmo thread em paralelo?' },
            { title: 'Medir a exposição', text: 'Cruzar todas as transacções da API com os threads da janela do deploy, não só as 7 que a contabilidade viu. E verificar se o SIGTERM espera que os nós em curso terminem ou mata a meio.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcção: o nó passa a enviar uma **chave de idempotência determinista** (`reembolso:{pedido_id}:{versão_da_decisão}`), e a API devolve a mesma transacção na segunda chamada. Do meu lado, uma tabela de reembolsos com restrição UNIQUE nessa chave, em que gravo a intenção antes da chamada e o resultado depois. Separo também o nó: ler e decidir num, emitir noutro, para a repetição ficar limitada ao efeito.',
        },
        {
          type: 'list',
          items: [
            '**Shutdown gracioso**: ao receber SIGTERM, deixar de aceitar threads novos e esperar que os nós em curso terminem dentro dos 30 s.',
            '**Worker de recuperação com lock por thread** (por exemplo, advisory lock no Postgres), para dois workers não retomarem o mesmo thread.',
            '**`durability="sync"`** reduz a janela em que um passo concluído se perde, mas não resolve este caso: o nó não tinha terminado.',
            '**Reconciliação diária** entre transacções na API e reembolsos registados, com alerta em qualquer duplicado.',
          ],
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Teste de integração que mata o processo dentro do nó de emissão depois da chamada à API simulada, retoma o thread e verifica que a API recebeu duas chamadas com a mesma chave e devolveu uma transacção. E uma regra de revisão: nenhum nó com efeito externo entra sem chave de idempotência.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — Checkpointers (falhas e pending writes)', url: 'https://docs.langchain.com/oss/python/langgraph/checkpointers' },
            { label: 'LangGraph — Interrupts (efeitos antes do interrupt)', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
            { label: 'Kubernetes — Pod lifecycle (terminação e período de graça)', url: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que o checkpoint só é escrito quando o nó termina e que o nó recomeça do início ao retomar.',
          'Confirma com traços a sequência chamada, morte do pod, retoma.',
          'Considera causas concorrentes (RetryPolicy, interrupt no mesmo nó, dois workers).',
          'Corrige com chave de idempotência determinista e registo com restrição UNIQUE.',
          'Acrescenta shutdown gracioso, lock no worker de recuperação e reconciliação.',
          'Sabe que `durability="sync"` não resolve este caso.',
        ],
        fraco: 'Culpa o checkpointer ou propõe mudar para `durability="sync"` e dar o caso por resolvido.',
        solido: 'Identifica a re-execução do nó ao retomar, confirma com traços e acrescenta chave de idempotência.',
        excelente: 'Explica porque nenhum modo de durability resolve, mede a exposição real além dos 7 casos, separa decidir de executar, trata o shutdown e a concorrência do worker, e cria o teste de falha injectada.',
      },
      seguimento: [
        'O que fazias com os 7 clientes que receberam em duplicado?',
        'E se a API de pagamentos não aceitar chave de idempotência?',
        'Como escreverias o teste que mata o processo a meio do nó?',
      ],
      sinaisAlarme: [
        'Concluir que o LangGraph tem um bug sem ler o que o checkpointer garante.',
        'Propor desligar o worker de recuperação.',
        'Gerar a chave de idempotência com um uuid aleatório dentro do nó.',
      ],
      modulos: ['langgraph-persistencia', 'observabilidade-llmops'],
    },
  ],
};
