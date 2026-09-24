import type { Module } from '../types';

export const m18: Module = {
  id: 'memoria',
  number: 18,
  part: 'orquestracao',
  title: 'Memória de conversa',
  subtitle:
    'O modelo não se lembra de nada: tudo o que «lembra» é o que reenvias em cada chamada. Janela recente, resumo incremental, campos estruturados e uma Store que o «Balcão» decidiu não usar para dados pessoais',
  icon: '🧠',
  minutes: 85,
  tags: ['memória', 'trim_messages', 'resumo', 'Store', 'PII', 'contexto'],
  goals: [
    'Explicar porque um modelo de chat não tem memória entre chamadas e decompor a «memória» de um agente em curto prazo (estado do thread) e longo prazo (Store entre threads).',
    'Medir o custo e a latência de um histórico que cresce e reconhecer que, com 3,4 turnos por conversa, a política de memória protege sobretudo a cauda.',
    'Usar `trim_messages` com `strategy="last"`, `start_on="human"` e um contador de tokens, sem partir pares chamada de ferramenta e resultado.',
    'Implementar resumo incremental com `RemoveMessage` e campos estruturados no estado, e saber quando um resumo perde o detalhe que importa.',
    'Distinguir memória semântica, episódica e procedimental e usar `InMemoryStore`/`PostgresStore` com namespaces, sabendo o que nunca se guarda (PII) e porquê.',
  ],

  sections: [
    /* ================================================================ 1 */
    {
      id: 'porque-memoria',
      title: 'O modelo não se lembra: a memória é o que reenvias',
      blocks: [
        {
          type: 'p',
          text:
            'Uma API de chat é sem estado. O modelo que responde ao segundo turno do Nelson não guardou nada do primeiro: recebe outra vez o prompt de sistema, os esquemas das ferramentas, o contexto RAG e as mensagens anteriores, e gera tokens condicionados nesse texto. «Memória», num sistema LLM, é portanto uma decisão de engenharia sobre **o que volta a entrar na janela de contexto** e **onde isso fica guardado entre chamadas**.',
        },
        {
          type: 'p',
          text:
            'No «Balcão» há duas respostas a «onde fica guardado». Dentro de uma conversa, no estado do grafo, persistido pelo checkpointer do módulo 17 (`thread_id` igual ao `conversa_id`). Entre conversas, numa **Store** do LangGraph, indexada por namespaces. A primeira é obrigatória (RF-06: não voltar a perguntar o que o cliente já disse). A segunda é opcional, e o adr-0016 decidiu não a usar para nada que seja pessoal.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'De onde vem cada token da entrada de um turno',
            caption:
              '≈ 5 200 tokens de entrada por turno (design.ts): 900 de sistema, 1 100 de esquemas, ≈ 2 000 de contexto RAG, e o resto histórico. Só a última faixa é «memória»; é a única que cresce com a conversa.',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'z-fixo', label: 'Fixo por turno (cacheável)', col: 0, row: 0, colSpan: 2, rowSpan: 3, tone: 'neutral' },
              { id: 'z-mem', label: 'Memória de curto prazo', col: 2, row: 0, colSpan: 2, rowSpan: 3, tone: 'agente' },
            ],
            nodes: [
              { id: 'sis', label: 'Prompt de sistema', sub: '≈ 900 tokens', col: 0, row: 0, kind: 'note' },
              { id: 'esq', label: 'Esquemas de ferramentas', sub: '≈ 1 100 tokens', col: 1, row: 0, kind: 'tool' },
              { id: 'rag', label: 'Contexto RAG', sub: '≈ 2 000 tokens', col: 0, row: 2, kind: 'vector' },
              { id: 'resumo', label: 'Resumo', sub: '≤ 80 palavras', col: 2, row: 0, kind: 'note' },
              { id: 'campos', label: 'Campos do estado', sub: 'pedido_id, aprovacao', col: 3, row: 0, kind: 'data' },
              { id: 'janela', label: 'Janela recente', sub: '≤ 1 500 tokens', col: 2, row: 2, kind: 'data' },
              { id: 'turno', label: 'Turno actual', sub: 'sempre inteiro', col: 3, row: 2, kind: 'user' },
              { id: 'modelo', label: 'Modelo médio', sub: 'janela de 200 k', col: 4, row: 1, kind: 'model' },
            ],
            edges: [
              { from: 'sis', to: 'modelo', style: 'dashed' },
              { from: 'resumo', to: 'modelo' },
              { from: 'campos', to: 'modelo', label: 'via router e prompt' },
              { from: 'janela', to: 'modelo' },
              { from: 'turno', to: 'modelo' },
            ],
          },
        },
        {
          type: 'table',
          head: ['Tipo', 'Pergunta a que responde', 'Onde vive no LangGraph', 'No «Balcão»'],
          rows: [
            ['Curto prazo (conversa)', 'O que já foi dito e feito nesta conversa?', 'Estado do thread (`messages`, outros canais), no checkpointer', 'Janela recente + resumo + `pedido_id`, `aprovacao`'],
            ['Semântica (longo prazo)', 'Que factos sei sobre o utilizador ou o domínio?', 'Store, namespace por utilizador ou por domínio', 'Não para clientes; o domínio está no RAG'],
            ['Episódica (longo prazo)', 'Como correu uma interacção passada?', 'Store com exemplos de conversas', 'Só como casos do conjunto dourado, fora do caminho do cliente'],
            ['Procedimental', 'Como devo fazer esta tarefa?', 'Prompt de sistema ou Store de instruções', 'Prompts versionados no repositório (`prompts/`)'],
          ],
          caption: 'Os três tipos de longo prazo seguem a taxonomia do CoALA (Sumers et al., 2023), adoptada pela documentação do LangGraph.',
        },
        {
          type: 'terms',
          items: [
            { term: 'janela de contexto', def: 'O número máximo de tokens que um pedido pode ter (200 k no escalão médio). É um limite, não um orçamento: encher a janela custa dinheiro e latência e degrada a atenção ao que está no meio.' },
            { term: 'memória de curto prazo', def: 'O estado de um thread: mensagens e canais que o grafo lê e escreve durante uma conversa. Morre com a conversa (retenção de 30 dias).' },
            { term: 'Store', def: 'Armazenamento chave-valor do LangGraph, partilhado entre threads, com namespaces em tuplo, `put`/`get`/`search` e pesquisa semântica opcional.' },
            { term: 'resumo incremental', def: 'Texto que substitui mensagens antigas: o resumo anterior mais o que acabou de sair da janela, condensado por um modelo pequeno ou por extracção.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que se lembra num suporte é o caso, não a pessoa',
          text:
            'Para não repetir perguntas, o «Balcão» precisa de saber de que pedido se fala, o que já foi proposto e o que o cliente aceitou. Isso cabe em campos estruturados e num resumo curto. Preferências pessoais entre conversas trariam dados pessoais para um armazenamento novo, com retenção e revisão jurídica próprias, sem um ganho medido na taxa de resolução.',
        },
        { type: 'adr', ref: 'adr-0016' },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — memória de curto prazo', url: 'https://docs.langchain.com/oss/python/langchain/short-term-memory' },
            { label: 'LangGraph — adicionar memória', url: 'https://docs.langchain.com/oss/python/langgraph/add-memory' },
            { label: 'Sumers et al. — Cognitive Architectures for Language Agents (CoALA)', url: 'https://arxiv.org/abs/2309.02427' },
          ],
        },
      ],
    },

    /* ================================================================ 2 */
    {
      id: 'custo-historico',
      title: 'O custo de um histórico que cresce',
      blocks: [
        {
          type: 'p',
          text:
            'Cada turno reenvia o histórico inteiro, por isso a entrada do turno t cresce linearmente com t e o custo acumulado da conversa cresce com t². A pergunta de engenharia não é «cabe na janela?» (cabe quase sempre, com 200 k tokens) mas «quanto custa, quanto demora e quão bem o modelo usa o que lá está?».',
        },
        {
          type: 'run',
          run: {
            id: 'run-memoria-01',
            title: 'Histórico completo contra janela mais resumo, turno a turno',
            brief:
              'Usa os números de `design.ts` (4 000 tokens fixos por turno) e da configuração do laboratório (janela de 1 500 tokens de histórico, resumo de ≈ 120 tokens). Cada turno acrescenta a mensagem do cliente, um resultado de ferramenta e a resposta. Preços do escalão médio, sem cache de prompt.',
            code: String.raw`import balcao as b

FIXO = 900 + 1100 + 2000          # sistema + esquemas + contexto RAG (design.ts)
POR_TURNO = 30 + 150 + 180        # cliente + resultado de ferramenta + resposta
JANELA, RESUMO = 1500, 120        # config.py: janela_tokens_historico; resumo ~80 palavras

def entrada(t, com_janela):
    hist = t * POR_TURNO
    if com_janela and hist > JANELA:
        hist = JANELA + RESUMO
    return FIXO + hist + 30

acum = {False: 0.0, True: 0.0}
print("turno  tokens(completo)  tokens(janela)  acumulado MZN (completo / janela)")
for t in range(40):
    for modo in (False, True):
        acum[modo] += b.custo_mzn(entrada(t, modo), 180, "medio")
    if t + 1 in (1, 3, 5, 10, 20, 40):
        print(f"{t+1:>5} {entrada(t, False):>17} {entrada(t, True):>15}   {acum[False]:>6.2f} / {acum[True]:.2f}")`,
            expected: String.raw`turno  tokens(completo)  tokens(janela)  acumulado MZN (completo / janela)
    1              4030            4030     0.32 / 0.32
    3              4750            4750     1.01 / 1.01
    5              5470            5470     1.81 / 1.81
   10              7270            5650     4.19 / 3.90
   20             10870            5650    10.67 / 8.08
   40             18070            5650    30.54 / 16.45`,
          },
        },
        {
          type: 'p',
          text:
            'Lê a tabela com honestidade. Com a média de 3,4 turnos por conversa, a janela nunca chega a cortar nada: a diferença é zero, e o que pesa é a parte fixa de 4 000 tokens (é aí que a cache de prompt do módulo 30 rende). A política de memória serve para a **cauda**: a conversa de 20 turnos de um cliente irritado e o cliente que manda 200 mensagens (RI-06), cujo custo acumulado sem janela cresce quadraticamente. Com janela, cada turno fica em ≈ 5 650 tokens por mais longa que seja a conversa.',
        },
        {
          type: 'table',
          head: ['Efeito de um histórico longo', 'Como se mede', 'Ordem de grandeza no «Balcão»'],
          rows: [
            ['Custo por turno', '`gen_ai.usage.input_tokens` × preço', '+ 360 tokens por turno com ferramenta; ≈ 0,02 MZN a mais por turno no escalão médio'],
            ['Latência até ao primeiro token', 'TTFT por número de tokens de entrada', 'O prefill cresce com a entrada; com a cache de prompt só a parte nova paga'],
            ['Qualidade', 'Perguntas repetidas nas 60 conversas multi-turno', 'Informação no meio de contextos longos é usada pior (Liu et al., 2023)'],
            ['Tamanho do checkpoint', 'Bytes de `checkpoint_blobs` por thread', 'As mensagens são o canal maior do estado'],
            ['Superfície de injecção', 'Ataques de red team em conversas longas', 'Cada mensagem antiga é texto não confiável que volta a entrar'],
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: «a janela é de 200 k, cabe tudo»',
          text:
            'Caber na janela não é o critério. Um histórico que cresce sem limite paga-se em cada turno, aumenta o TTFT, dilui a atenção do modelo no que interessa (o turno actual e o pedido em causa) e transforma cada mensagem antiga num ponto de entrada para prompt injection. O limite de memória é um orçamento definido em tokens, medido e alarmado — não o tamanho máximo que o fornecedor aceita.',
        },
        {
          type: 'p',
          text:
            'Há um segundo custo, menos visível: o **resumo** também é uma chamada ao modelo. O «Balcão» resume só quando o histórico passa 12 mensagens e usa o escalão pequeno (0,25 USD por milhão de tokens de entrada contra 1,00 do médio). Numa conversa típica, nunca acontece; numa longa, acontece uma vez a cada ≈ 3 turnos com ferramentas e custa uma fracção do que poupa.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'O que o runtime didáctico está a medir',
          text:
            'O `balcao` estima tokens a 3,6 caracteres por token (`estimar_tokens`) e aplica os preços de referência dos escalões. Os números servem para comparar políticas entre si; a contagem exacta é a que o fornecedor devolve em `usage`, e é essa que o painel de custo usa em produção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. — Lost in the Middle (2023)', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Anthropic — prompt caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching' },
          ],
        },
      ],
    },

    /* ================================================================ 3 */
    {
      id: 'janela-trim',
      title: 'Janela recente com trim_messages',
      blocks: [
        {
          type: 'p',
          text:
            '`trim_messages` (em `langchain_core.messages`) recebe uma lista de mensagens e devolve a sub-lista que cabe num orçamento. Não altera o estado: é uma vista para o pedido ao modelo. As mensagens antigas continuam no checkpoint até alguém as remover (secção seguinte). Os parâmetros que decidem se a janela é segura são quatro.',
        },
        {
          type: 'table',
          head: ['Parâmetro', 'Valor no «Balcão»', 'Porquê'],
          rows: [
            ['`max_tokens` + `token_counter`', '1 500, `memoria.contar_tokens`', 'Orçamento em tokens, não em mensagens: uma resposta de ferramenta vale 10 mensagens curtas. O contador pode ser uma função, um modelo ou `"approximate"`.'],
            ['`strategy`', '`"last"`', 'Guarda as mais recentes. `"first"` só faz sentido para instruções no início.'],
            ['`start_on`', '`"human"`', 'A janela começa numa mensagem do cliente: nunca num `ToolMessage` órfão nem num `AIMessage` com `tool_calls` sem o pedido que o motivou.'],
            ['`include_system`', '`True`', 'Se houver `SystemMessage` no início da lista, fica sempre (e conta para o orçamento).'],
            ['`allow_partial`', '`False`', 'Cortar uma mensagem a meio produz frases truncadas que o modelo completa com invenção.'],
          ],
        },
        {
          type: 'code',
          lang: 'python',
          caption: '`src/balcao/memoria.py`: a janela do «Balcão». O contador soma 4 tokens de envelope por mensagem à estimativa de 3,6 caracteres por token.',
          code: String.raw`from langchain_core.messages import BaseMessage, trim_messages
from balcao import didactico

def contar_tokens(mensagens: Sequence[BaseMessage]) -> int:
    """Estimativa de 3,6 caracteres por token (português). Serve para orçamentos, não para facturas."""
    return sum(didactico.estimar_tokens(m.text or " ") + 4 for m in mensagens)

def janela(mensagens: Sequence[BaseMessage], max_tokens: int) -> list[BaseMessage]:
    """As mensagens mais recentes que cabem em max_tokens, a começar num turno do cliente."""
    return trim_messages(
        list(mensagens),
        max_tokens=max_tokens,
        token_counter=contar_tokens,
        strategy="last",
        start_on="human",
        include_system=True,
        allow_partial=False,
    )`,
        },
        {
          type: 'p',
          text:
            'O que acontece sem `start_on` é fácil de reproduzir. Numa conversa de sete mensagens com uma chamada a `ler_pedido`, um orçamento de 80 tokens (com o contador acima) devolve com `langchain-core` 1.6 a lista a partir do `ToolMessage` — o resultado de uma chamada cujo pedido ficou de fora. Os fornecedores reais rejeitam esse histórico (um `tool_result` sem o `tool_use` correspondente) ou, pior, o modelo lê um JSON solto sem saber a que pergunta responde.',
        },
        {
          type: 'run',
          run: {
            id: 'run-memoria-02',
            title: 'Janela sem regra de início, com regra, e o resumo do que saiu',
            brief:
              'Reimplementação didáctica de `strategy="last"` e `start_on="human"` sobre tuplos `(papel, texto)`, com a mesma estimativa de tokens do laboratório. O que sai da janela vira resumo — e o resumo passa pela máscara de PII antes de ser gravado.',
            code: String.raw`import re
import balcao as b

conversa = [
    ("cliente", "Onde está o PD-8841273? O meu número é 84 123 4567."),
    ("assistente", "[chamada ler_pedido PD-8841273]"),
    ("ferramenta", '{"estado": "a_caminho", "eta_min": 12, "taxa_entrega": 95}'),
    ("assistente", "O pedido está a caminho e chega em cerca de 12 minutos."),
    ("cliente", "Chegou frio. Tenho direito a alguma coisa?"),
    ("assistente", "Pode pedir reembolso parcial de até 50% dos artigos afectados [pol-qualidade-comida]."),
    ("cliente", "Quero, sim."),
]

def tokens(m):
    return b.estimar_tokens(m[1]) + 4          # a mesma estimativa de memoria.py

def janela(msgs, maximo, comecar_no_cliente=True):
    escolhidas, total = [], 0
    for m in reversed(msgs):                   # strategy="last": das mais recentes para trás
        if total + tokens(m) > maximo:
            break
        escolhidas.insert(0, m)
        total += tokens(m)
    while comecar_no_cliente and escolhidas and escolhidas[0][0] != "cliente":
        escolhidas.pop(0)                      # start_on="human"
    return escolhidas

for regra in (False, True):
    w = janela(conversa, 95, comecar_no_cliente=regra)
    print("start_on cliente:" if regra else "sem regra       :", [p for p, _ in w])

fora = conversa[: len(conversa) - len(janela(conversa, 95))]
texto = " ".join(t for p, t in fora if p != "ferramenta")
pedidos = sorted(set(re.findall(r"PD-[0-9]{7}", texto)))
resumo = f"Pedidos: {', '.join(pedidos)}. Cliente disse: «{fora[0][1]}»"
print("resumo cru      :", resumo)
print("resumo gravado  :", b.mascarar_pii(resumo))`,
            expected: String.raw`sem regra       : ['ferramenta', 'assistente', 'cliente', 'assistente', 'cliente']
start_on cliente: ['cliente', 'assistente', 'cliente']
resumo cru      : Pedidos: PD-8841273. Cliente disse: «Onde está o PD-8841273? O meu número é 84 123 4567.»
resumo gravado  : Pedidos: PD-8841273. Cliente disse: «Onde está o PD-8841273? O meu número é [TELEFONE].»`,
          },
        },
        {
          type: 'p',
          text:
            'Há um pormenor no nó `agente` do grafo real: a janela aplica-se só ao histórico **anterior** ao turno actual. A pergunta do cliente, as chamadas de ferramentas e os resultados deste turno vão sempre inteiros, porque cortar um resultado de ferramenta a meio de um ciclo ReAct faz o agente chamar a mesma ferramenta outra vez.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Extracto do nó `agente` em `src/balcao/grafo.py`: histórico cortado à janela, turno actual intacto, resumo no prompt de sistema.',
          code: String.raw`resumo = estado.get("resumo", "")
prefixo = SystemMessage(sistema.texto + (f"\n\nResumo da conversa até aqui: {resumo}" if resumo else ""))
msgs = estado.get("messages", [])
turno = _mensagens_do_turno(estado)                  # depois da última HumanMessage
inicio = len(msgs) - len(turno) - 1                  # índice da HumanMessage do turno
historico = memoria.janela(msgs[:inicio], cfg.janela_tokens_historico) + msgs[inicio:]
resp = modelo.invoke([prefixo, *historico], config)`,
        },
        { type: 'file', ref: 'src/balcao/memoria.py' },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Contar tokens: estimativa no caminho quente, contagem exacta no painel',
          text:
            'Passar o modelo como `token_counter` faz `trim_messages` contar com o tokenizador do fornecedor, o que em algumas integrações é um pedido HTTP por chamada. Para decidir uma janela, uma estimativa com margem chega; o custo real vem de `usage` na resposta e alimenta as métricas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — mensagens (trim_messages e utilitários)', url: 'https://docs.langchain.com/oss/python/langchain/messages' },
            { label: 'LangChain — short-term memory: trim e delete', url: 'https://docs.langchain.com/oss/python/langchain/short-term-memory' },
          ],
        },
      ],
    },

    /* ================================================================ 4 */
    {
      id: 'resumo-incremental',
      title: 'Resumo incremental, RemoveMessage e campos estruturados',
      blocks: [
        {
          type: 'p',
          text:
            'A janela resolve o custo do pedido ao modelo, mas não resolve dois problemas: o que saiu da janela deixa de existir para o modelo, e as mensagens continuam a crescer no checkpoint. O resumo incremental trata os dois. Quando o histórico passa um limite, as mensagens mais antigas são condensadas num texto curto que vai no prompt de sistema, e removidas do estado com `RemoveMessage`.',
        },
        {
          type: 'graph',
          graph: {
            id: 'gr-memoria-01',
            title: 'Onde a memória entra no grafo do «Balcão»',
            brief:
              'O nó `resumir` só corre quando o router `precisa_resumo` vê mais de 12 mensagens no estado depois da guarda de saída. Os números das corridas vêm de uma execução real do laboratório com o modelo simulado.',
            entry: 'inicio',
            nodes: [
              { id: 'inicio', label: 'START', kind: 'inicio', col: 0, row: 1 },
              { id: 'carregar', label: 'checkpoint do thread', sub: 'messages, resumo, pedido_id', kind: 'reducer', col: 1, row: 1 },
              { id: 'guarda_entrada', label: 'guarda_entrada', sub: 'mascara PII antes de gravar', kind: 'guarda', col: 2, row: 1, ms: 25 },
              { id: 'classificar', label: 'classificar', sub: 'pedido_id persiste entre turnos', kind: 'router', col: 3, row: 1, ms: 350 },
              { id: 'agente', label: 'agente / responder_rag', sub: 'janela 1 500 + resumo', kind: 'llm', col: 4, row: 1, ms: 900, tokens: 5200 },
              { id: 'guarda_saida', label: 'guarda_saida', kind: 'guarda', col: 5, row: 1, ms: 30 },
              { id: 'precisa_resumo', label: 'precisa_resumo', sub: 'len(messages) > 12?', kind: 'router', col: 6, row: 1 },
              { id: 'resumir', label: 'resumir', sub: 'pequeno ou extractivo; RemoveMessage', kind: 'llm', col: 6, row: 0, ms: 350, tokens: 700 },
              { id: 'fim', label: 'END', kind: 'fim', col: 6, row: 2 },
            ],
            edges: [
              { from: 'inicio', to: 'carregar' },
              { from: 'carregar', to: 'guarda_entrada' },
              { from: 'guarda_entrada', to: 'classificar' },
              { from: 'classificar', to: 'agente' },
              { from: 'agente', to: 'guarda_saida' },
              { from: 'guarda_saida', to: 'precisa_resumo' },
              { from: 'precisa_resumo', to: 'resumir', cond: 'mais de 12 mensagens' },
              { from: 'precisa_resumo', to: 'fim', cond: 'até 12' },
              { from: 'resumir', to: 'fim' },
            ],
            channels: [
              { canal: 'messages', tipo: 'list[AnyMessage]', reducer: 'add_messages', nota: 'Junta por id; `RemoveMessage(id=...)` apaga; `RemoveMessage(id=REMOVE_ALL_MESSAGES)` apaga todas.' },
              { canal: 'resumo', tipo: 'str', reducer: 'substitui', nota: 'Resumo anterior mais o que saiu; vai no prompt de sistema do agente.' },
              { canal: 'pedido_id', tipo: 'str | None', reducer: 'substitui', nota: 'Memória estruturada: «E quando chega?» no turno 3 ainda sabe qual é o pedido.' },
              { canal: 'aprovacao', tipo: 'dict | None', reducer: 'substitui', nota: 'O que foi proposto e em que estado está; nunca depende do resumo.' },
            ],
            runs: [
              {
                label: 'Turno 3 de 7 — «A que horas fecham?»',
                path: [['inicio'], ['carregar'], ['guarda_entrada'], ['classificar'], ['agente'], ['guarda_saida'], ['precisa_resumo'], ['fim']],
                note: '6 mensagens antes, 8 depois; ≈ 304 tokens de histórico pela estimativa do laboratório.',
                outcome: 'Sem resumo. O histórico inteiro ainda cabe na janela de 1 500 tokens.',
              },
              {
                label: 'Turno 6 de 7 — «Posso juntar dois cupões?»',
                path: [['inicio'], ['carregar'], ['guarda_entrada'], ['classificar'], ['agente'], ['guarda_saida'], ['precisa_resumo'], ['resumir'], ['fim']],
                note: '12 mensagens antes, 14 depois da resposta: passa o limite. `mensagens_a_resumir` guarda as 6 últimas, recuando o corte até uma mensagem do cliente.',
                outcome: 'Estado com 6 mensagens (≈ 173 tokens) e resumo «Pedidos referidos: PD-8841273. Valores já falados: 60 MZN, 95 MZN, 150 MZN. Último pedido do cliente antes desta janela: «A que horas fecham?».»',
              },
              {
                label: 'Turno 7 de 7 — «Quanto é a taxa de serviço?»',
                path: [['inicio'], ['carregar'], ['guarda_entrada'], ['classificar'], ['agente'], ['guarda_saida'], ['precisa_resumo'], ['fim']],
                note: '6 mensagens antes, 8 depois. O resumo vai no prompt do agente se a rota for `agente`.',
                outcome: 'Sem resumo novo; o próximo acontece quando voltar a passar 12 mensagens.',
              },
            ],
            note: 'Execução real: 7 perguntas seguidas no thread `c-longa` com `mensagens_antes_de_resumir = 12`. Com o modelo simulado, o resumo é extractivo; com um modelo real, é o escalão pequeno.',
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O nó `resumir` e o corte seguro de `memoria.py`. As mensagens saem do estado com `RemoveMessage`, que o reducer `add_messages` interpreta como apagar por id.',
          code: String.raw`from langchain_core.messages import HumanMessage, RemoveMessage

def mensagens_a_resumir(mensagens, manter: int):
    """As antigas que saem; recua o corte até uma HumanMessage para não partir pares ferramenta/resultado."""
    if len(mensagens) <= manter:
        return []
    corte = len(mensagens) - manter
    while corte > 0 and not isinstance(mensagens[corte], HumanMessage):
        corte -= 1
    return list(mensagens[:corte])

def resumir(estado):                                   # nó do grafo
    antigas = mensagens_a_resumir(estado["messages"], manter=cfg.mensagens_antes_de_resumir // 2)
    if not antigas:
        return {}
    novo = memoria.resumir(estado.get("resumo", ""), antigas, dep.modelo_classificar)
    return {"resumo": novo, "messages": [RemoveMessage(id=m.id) for m in antigas if m.id]}`,
        },
        {
          type: 'prompt',
          prompt: {
            id: 'pr-memoria-01',
            title: 'O pedido de resumo ao escalão pequeno',
            brief: 'Um pedido de uma só mensagem de sistema, com o resumo anterior e as mensagens que saíram. O prompt é o de `memoria.py`; a saída é ilustrativa.',
            messages: [
              {
                role: 'sistema',
                text:
                  'Actualiza o resumo de uma conversa de suporte do Chega. Mantém só factos úteis para continuar: números de pedido, o que o cliente pediu, o que já foi proposto ou feito, valores e decisões. Nada de dados pessoais. No máximo 80 palavras.\n\nResumo anterior:\n(vazio)\n\nMensagens novas:\ncliente: Onde está o PD-8841273?\nassistente: O pedido está a caminho e chega em cerca de 12 minutos.\ncliente: Chegou frio. Tenho direito a alguma coisa?\nassistente: Pode pedir reembolso parcial de até 50% dos artigos afectados [pol-qualidade-comida].',
                note: 'Os `ToolMessage` ficam de fora do texto a resumir: o que interessa do resultado já está na resposta do assistente.',
                tokens: 150,
              },
              {
                role: 'assistente',
                text: 'Pedido PD-8841273, entregue frio. Foi explicado o reembolso parcial até 50% dos artigos afectados; o cliente ainda não confirmou nem enviou fotografia.',
                note: 'O que a política exige a seguir (fotografia até 2 horas) é memória de caso, não de pessoa.',
                tokens: 40,
              },
            ],
            note: 'As mensagens chegam aqui já mascaradas pela guarda de entrada. A instrução «nada de dados pessoais» é uma segunda linha, não a defesa.',
          },
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O resumo perde exactamente o que não sabias que ia importar',
          text:
            'Um resumo de 80 palavras escolhe. Se o cliente disse no turno 2 que o estafeta deixou o saco no prédio ao lado, e o resumo não o guardou, o assistente volta a perguntar — é o que RF-06 mede. Tudo o que decide o caminho do grafo (pedido, valor proposto, aprovação, confirmação do cliente) vive em campos estruturados do estado, nunca só no resumo.',
        },
        {
          type: 'compare',
          left: {
            title: 'Campos estruturados no estado',
            items: [
              '`pedido_id`, `aprovacao`, `intencao`: tipados, lidos por routers e ferramentas.',
              'Não dependem do modelo para sobreviver entre turnos.',
              'Testáveis com asserções exactas.',
              'Exigem saber de antemão o que importa.',
            ],
          },
          right: {
            title: 'Resumo em texto',
            items: [
              'Apanha o que não previste (o prédio ao lado, o tom do cliente).',
              'Custa uma chamada ao modelo pequeno por cada ≈ 6 mensagens removidas.',
              'Pode omitir ou deformar um facto; é texto que volta ao modelo.',
              'Avalia-se com as 60 conversas multi-turno, não com asserções.',
            ],
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Com `create_agent` (módulo 15), a mesma política aplica-se por middleware. Os parâmetros são os de `langchain` 1.4: `trigger` e `keep` em tokens, mensagens ou fracção da janela.',
          code: String.raw`from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware

agente = create_agent(
    model=modelo_medio,
    tools=ferramentas_leitura,
    middleware=[
        SummarizationMiddleware(
            model=modelo_pequeno,             # o resumo nunca no modelo que responde
            trigger=("tokens", 1500),         # resume quando o histórico passa 1 500 tokens
            keep=("messages", 6),             # e mantém as 6 mensagens mais recentes
        )
    ],
    checkpointer=checkpointer,
)`,
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — middleware incorporado (SummarizationMiddleware)', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
            { label: 'LangGraph — adicionar memória: resumir e apagar mensagens', url: 'https://docs.langchain.com/oss/python/langgraph/add-memory' },
          ],
        },
      ],
    },

    /* ================================================================ 5 */
    {
      id: 'longo-prazo',
      title: 'Memória de longo prazo: Store, namespaces e os três tipos',
      blocks: [
        {
          type: 'p',
          text:
            'O checkpointer guarda o estado de um thread; nada nele é visível a outro thread. Para partilhar informação entre conversas, o LangGraph tem a **Store**: `put(namespace, chave, valor)`, `get(namespace, chave)`, `search(prefixo, query=..., filter=..., limit=...)` e `delete`. O namespace é um tuplo (`("clientes", "CL-77120")`, `("procedimentos", "balcao")`), o que permite pesquisar por prefixo. Com `index={"embed": ..., "dims": ..., "fields": [...]}`, `search` com `query` faz pesquisa semântica.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Store no grafo: passa-se ao `compile` e chega ao nó pelo `Runtime` (ou por um parâmetro `store: BaseStore`). Verificado com `langgraph` 1.2.12.',
          code: String.raw`from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore
from langgraph.checkpoint.memory import InMemorySaver

store = InMemoryStore()                         # PostgresStore.from_conn_string(DB) em produção
ns = ("procedimentos", "balcao")
store.put(ns, "fraude", {"regra": "Reembolso para número diferente do original: escalar sem acusar."})

def agente(estado: EstadoBalcao, runtime: Runtime) -> dict:
    regras = runtime.store.search(("procedimentos",), query=estado["messages"][-1].text, limit=3)
    ...

grafo = construir(...).compile(checkpointer=InMemorySaver(), store=store)`,
        },
        {
          type: 'table',
          head: ['Tipo', 'Exemplo num suporte', 'Quem escreve', 'Decisão no «Balcão»'],
          rows: [
            ['Semântica sobre o cliente', '«A Aida é subscritora Chega Mais e prefere cupões»', 'O agente, a partir da conversa', 'Rejeitada: dados pessoais fora da conversa, valor não medido. Os factos que interessam (`subscritor_mais`) lêem-se por ferramenta, sempre actuais.'],
            ['Semântica sobre o domínio', '«Atraso acima de 45 min dá cupão de 200 MZN»', 'Suporte ao cliente', 'Já existe: é o RAG, com dono, versão e `vigente`.'],
            ['Episódica', '«Na última conversa, o caso foi resolvido com reembolso»', 'O sistema, no fim da conversa', 'Só como exemplos anotados no conjunto dourado; nunca injectada automaticamente.'],
            ['Procedimental', '«Em suspeita de fraude, escalar sem acusar»', 'Engenharia de IA e suporte, em PR', 'Prompts versionados no repositório; uma Store de instruções editável em runtime foge à revisão (adr-0023).'],
          ],
          caption: 'Uma memória que o agente escreve sozinho é uma memória que um atacante pode escrever através do agente.',
        },
        {
          type: 'run',
          run: {
            id: 'run-memoria-03',
            title: 'Uma Store didáctica com pesquisa por cosseno e política de PII',
            brief:
              'Namespaces em tuplo, pesquisa por prefixo e semelhança com o embedding por hashing do `balcao`. O `put` aplica a política: nada que o detector de PII reconheça sai da conversa. É didáctico: a `InMemoryStore` real não recusa nada, a política é tua.',
            code: String.raw`import balcao as b

class Loja:
    """Store didáctico: (namespace, chave) -> valor, com pesquisa por cosseno."""
    def __init__(self):
        self.itens = {}

    def put(self, ns, chave, texto):
        pii = b.detectar_pii(texto)
        if pii:                                   # política: nada pessoal fora da conversa
            return f"recusado ({', '.join(t for t, _ in pii)})"
        self.itens[(ns, chave)] = (texto, b.embed(texto))
        return "guardado"

    def search(self, prefixo, consulta, k=2):
        q = b.embed(consulta)
        hits = [(round(b.cosseno(q, v), 3), ns, c) for (ns, c), (_, v) in self.itens.items()
                if ns[: len(prefixo)] == prefixo]
        return sorted(hits, reverse=True)[:k]

loja = Loja()
proc = ("procedimentos", "balcao")
print(loja.put(proc, "fraude", "Reembolso pedido para um número M-Pesa diferente do original: escalar sem acusar."))
print(loja.put(proc, "atraso", "Atraso acima de 45 minutos dá cupão de 200 MZN ou reembolso da taxa de entrega."))
print(loja.put(proc, "tom", "Frases curtas, sem prometer horas exactas de chegada."))
print(loja.put(("clientes", "CL-77120"), "contacto", "A Aida prefere ser contactada no 84 123 4567."))
for hit in loja.search(("procedimentos",), "devolvam o dinheiro para outro numero m-pesa"):
    print(hit)`,
            expected: String.raw`guardado
guardado
guardado
recusado (telefone)
(0.465, ('procedimentos', 'balcao'), 'fraude')
(0.203, ('procedimentos', 'balcao'), 'atraso')`,
          },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Um detector de PII não é uma política de privacidade',
          text:
            'O bloco acima recusa um número de telefone. «A Aida prefere ser contactada de manhã» passaria, e continua a ser um dado pessoal sobre uma pessoa identificável pelo namespace. A política que funciona é estrutural: não existe namespace por cliente, logo não há onde escrever. É a mesma lógica das ferramentas sem `cliente_id` vindo do modelo (RI-03).',
        },
        {
          type: 'compare',
          left: {
            title: 'Checkpointer (curto prazo)',
            items: [
              'Chave: `thread_id`; um histórico por conversa.',
              'Escrito pelo motor em cada superstep, sem código teu.',
              'Guarda o estado inteiro, com histórico para replay.',
              'Morre com a conversa (30 dias no «Balcão»).',
            ],
          },
          right: {
            title: 'Store (longo prazo)',
            items: [
              'Chave: namespace em tuplo mais chave; partilhada entre threads.',
              'Escrita explicitamente por um nó ou por um processo externo.',
              'Guarda documentos JSON, com pesquisa semântica opcional.',
              'Vive até alguém a apagar ou até ao `ttl` expirar.',
            ],
          },
        },
        {
          type: 'p',
          text:
            'A `PostgresStore` (`langgraph.store.postgres`) é a versão durável: `from_conn_string` como gestor de contexto, `setup()`, pesquisa semântica com pgvector quando se passa `index`, e `ttl` para expirar itens. Se um dia o «Balcão» guardar memória procedimental em runtime (por exemplo, correcções aprovadas pelo suporte), é aí que vai viver, com TTL e revisão — e com o mesmo processo de PR que os prompts.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — stores', url: 'https://docs.langchain.com/oss/python/langgraph/stores' },
            { label: 'LangChain — memória de longo prazo', url: 'https://docs.langchain.com/oss/python/langchain/long-term-memory' },
            { label: 'OWASP — LLM Top 10 (2025)', url: 'https://genai.owasp.org/llm-top-10/' },
          ],
        },
      ],
    },

    /* ================================================================ 6 */
    {
      id: 'politica-memoria',
      title: 'A política de memória do «Balcão» e o que nunca se guarda',
      blocks: [
        {
          type: 'p',
          text:
            'A política junta tudo o que o módulo mostrou numa regra que o suporte, o jurídico e a engenharia conseguem verificar. Cada linha tem um número e uma forma de o medir, porque «guardamos o necessário» não é auditável.',
        },
        {
          type: 'table',
          head: ['Regra', 'Valor', 'Onde está no código', 'Como se verifica'],
          rows: [
            ['Janela de histórico', '1 500 tokens, a começar numa mensagem do cliente', '`config.janela_tokens_historico`, `memoria.janela`', 'Tokens de histórico por turno em painel'],
            ['Resumo', 'Quando o estado passa 12 mensagens; mantém as 6 últimas', '`config.mensagens_antes_de_resumir`, nó `resumir`', '`test_memoria_resume_e_encurta_conversas_longas`'],
            ['Factos do caso', '`pedido_id`, `aprovacao`, `intencao` como canais tipados', '`EstadoBalcao` em `grafo.py`', 'Zero perguntas repetidas nas 60 conversas multi-turno'],
            ['PII no estado', 'Mascarada antes de entrar no checkpoint', 'Nó `guarda_entrada` (substitui a mensagem pelo mesmo id)', '`test_dados_pessoais_mascarados_no_checkpoint`'],
            ['Memória entre conversas', 'Nenhuma sobre o cliente', 'Não há Store no `compile`', 'Revisão de arquitectura; adr-0016'],
            ['Retenção', '30 dias para conversa, mensagens e checkpoints', 'Job diário (`purgar_conversas_expiradas`, `delete_thread`)', 'Idade da conversa mais antiga em painel'],
          ],
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-memoria-01',
            title: 'Um turno com memória, do checkpoint ao checkpoint',
            intro: 'O turno 6 da conversa longa do laboratório: 12 mensagens no estado, a resposta leva-as a 14, e o resumo corta para 6.',
            lanes: [
              { id: 'cli', label: 'Cliente', kind: 'client' },
              { id: 'api', label: 'API', kind: 'service' },
              { id: 'grafo', label: 'Grafo', kind: 'agent' },
              { id: 'modelo', label: 'Modelos', sub: 'médio e pequeno', kind: 'model' },
              { id: 'pg', label: 'Checkpoints', kind: 'store' },
            ],
            steps: [
              { from: 'cli', to: 'api', label: '«Posso juntar dois cupões no mesmo pedido?»', kind: 'req' },
              { from: 'api', to: 'grafo', label: 'invoke({"messages": [nova]}, thread c-longa)', kind: 'req' },
              { from: 'grafo', to: 'pg', label: 'carrega o último checkpoint: 12 mensagens, sem resumo', kind: 'req', ms: 60 },
              { from: 'grafo', to: 'grafo', label: 'guarda_entrada: mascara PII e substitui a mensagem pelo mesmo id', kind: 'self', ms: 25 },
              { from: 'grafo', to: 'modelo', label: 'responder: fixo + janela (≤ 1 500) + pergunta', kind: 'req', ms: 700, tokens: 4400 },
              { from: 'modelo', to: 'grafo', label: 'resposta com citação [pol-cupoes]', kind: 'res' },
              { from: 'grafo', to: 'grafo', label: 'precisa_resumo: 14 > 12', kind: 'self' },
              { from: 'grafo', to: 'modelo', label: 'resumir as 8 mais antigas (escalão pequeno)', kind: 'req', ms: 350, tokens: 700 },
              { from: 'grafo', to: 'pg', label: 'checkpoint: resumo novo, 8 RemoveMessage, 6 mensagens', kind: 'async', ms: 25 },
              { from: 'api', to: 'cli', label: 'resposta (o resumo corre depois do texto ao cliente)', kind: 'res' },
            ],
            outro: 'O resumo não conta para o TTFT: acontece depois da guarda de saída, quando a resposta já foi transmitida. Conta para o custo e para a capacidade.',
          },
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-memoria-01',
            title: 'Devo guardar isto, e onde?',
            start: 'q1',
            nodes: [
              { id: 'q1', question: 'É preciso para continuar esta conversa?', options: [{ label: 'Sim', next: 'q2' }, { label: 'Não', next: 'q3' }] },
              { id: 'q2', question: 'Um router ou uma ferramenta decide com base nisto?', options: [{ label: 'Sim', next: 'campo' }, { label: 'Não', next: 'msg' }] },
              { id: 'campo', answer: 'Canal tipado no estado (`pedido_id`, `aprovacao`).', detail: 'Sobrevive à janela e ao resumo; testável com asserções.' },
              { id: 'msg', answer: 'Mensagens do thread, sujeitas à janela e ao resumo.', detail: 'Mascaradas pela guarda de entrada antes de chegarem ao checkpoint.' },
              { id: 'q3', question: 'É sobre uma pessoa identificável?', options: [{ label: 'Sim', next: 'nao' }, { label: 'Não', next: 'q4' }] },
              { id: 'nao', answer: 'Não guardes. Se for preciso, lê-o por ferramenta quando for preciso.', detail: 'Dados na fonte (API de clientes) estão sempre actuais e já têm dono, autorização e retenção.' },
              { id: 'q4', question: 'Muda o comportamento do agente para todos?', options: [{ label: 'Sim', next: 'prompt' }, { label: 'Não', next: 'rag' }] },
              { id: 'prompt', answer: 'Memória procedimental: prompt versionado, revisto em PR, avaliado contra o conjunto dourado.', detail: 'Uma Store editável em runtime só com o mesmo processo de revisão.' },
              { id: 'rag', answer: 'Conhecimento do domínio: documento na base de conhecimento, com dono e `vigente`.', detail: 'O RAG já é a memória semântica do domínio.' },
            ],
          },
        },
        {
          type: 'widget',
          id: 'memoria-lab',
          props: { janelaTokens: 1500, limiteMensagens: 12, manter: 6 },
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Alarmes de memória em produção',
          text:
            'Tokens de histórico por turno (p95 abaixo de 1 700 com a janela; acima disso, a janela não está a ser aplicada nalguma rota), chamadas de resumo por conversa, tamanho médio do estado por thread, e a métrica de perguntas repetidas nas revisões semanais. Um resumo que começa a crescer turno após turno é sinal de que o prompt de resumo deixou de condensar.',
        },
        { type: 'file', ref: 'tests/test_grafo.py' },
        { type: 'file', ref: 'src/balcao/guardas.py' },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — persistência (threads e Store)', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
            { label: 'Regulamento Geral sobre a Protecção de Dados (texto oficial)', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
          ],
        },
      ],
    },
  ],

  /* ================================================================== quiz */
  quiz: [
    {
      id: 'q-memoria-01',
      topic: 'memoria',
      prompt:
        'Com 3,4 turnos por conversa em média e uma janela de 1 500 tokens de histórico, em que conversas a janela reduz o custo de modelo?',
      options: ['Em todas, cerca de 30%', 'Quase só nas longas (a cauda); na conversa típica não corta nada', 'Em nenhuma: a cache de prompt já resolve', 'Só nas que usam RAG'],
      answer: [1],
      explain:
        'A 360 tokens por turno com ferramenta, o histórico só passa 1 500 tokens a partir do quinto turno. A conversa típica não é afectada; o que a janela limita é a cauda (20, 40 turnos, ou abuso), onde o custo acumulado sem janela cresce quadraticamente. Na conversa típica, o que pesa é a parte fixa, que a cache de prompt amortece.',
    },
    {
      id: 'q-memoria-02',
      topic: 'langchain',
      prompt: 'O que pode correr mal com `trim_messages(..., strategy="last")` sem `start_on`? (duas respostas)',
      options: [
        'A janela começar num `ToolMessage` cujo `AIMessage` com a chamada ficou de fora',
        'O fornecedor rejeitar o pedido por um resultado de ferramenta sem a chamada correspondente',
        'As mensagens serem apagadas do checkpoint',
        'O prompt de sistema ser duplicado',
      ],
      answer: [0, 1],
      explain:
        '`trim_messages` só escolhe uma sub-lista para o pedido; não mexe no estado. Sem `start_on="human"`, o corte pode cair entre a chamada e o resultado, e os fornecedores exigem que cada resultado tenha a chamada respectiva. O modelo, quando aceita, lê um JSON sem contexto.',
    },
    {
      id: 'q-memoria-03',
      topic: 'langgraph',
      prompt: 'Como remove o nó `resumir` as mensagens antigas do estado?',
      options: [
        'Devolve a lista nova de mensagens sem as antigas; o reducer substitui',
        'Devolve `RemoveMessage(id=...)` para cada antiga; o reducer `add_messages` apaga-as por id',
        'Chama `delete_thread` e recria o thread',
        'Não remove: `trim_messages` faz isso',
      ],
      answer: [1],
      explain:
        'Com `add_messages`, devolver uma lista junta (ou substitui por id); não apaga. Para apagar, devolve-se `RemoveMessage` com o id de cada mensagem, ou `RemoveMessage(id=REMOVE_ALL_MESSAGES)` para apagar todas. `delete_thread` apagaria o histórico de checkpoints inteiro.',
    },
    {
      id: 'q-memoria-04',
      topic: 'memoria',
      prompt: 'O cliente disse no turno 2 que o saco ficou no prédio ao lado. No turno 9 o assistente volta a perguntar onde ficou o saco. Qual é a causa mais provável e a correcção certa?',
      options: [
        'Janela demasiado pequena; aumentar para 20 000 tokens',
        'O resumo não guardou o facto; se ele decide o caminho do caso, passa a campo estruturado, e o prompt de resumo é avaliado nas conversas multi-turno',
        'O modelo alucinou; baixar a temperatura',
        'Falta memória de longo prazo por cliente',
      ],
      answer: [1],
      explain:
        'O facto saiu da janela e o resumo não o apanhou. Aumentar a janela adia o problema e paga-se em cada turno. Factos que decidem o fluxo vão para o estado tipado; o resto depende da qualidade do resumo, que se mede nas 60 conversas multi-turno.',
    },
    {
      id: 'q-memoria-05',
      topic: 'seguranca',
      prompt: 'Porque é que o adr-0016 rejeita memória semântica por cliente na Store? (duas respostas)',
      options: [
        'Traz dados pessoais para um armazenamento novo, com retenção e revisão próprias',
        'A Store do LangGraph não suporta namespaces por utilizador',
        'O valor para a resolução de suporte não foi medido e os factos úteis lêem-se por ferramenta',
        'Custa mais tokens do que o RAG',
      ],
      answer: [0, 2],
      explain:
        'A Store suporta namespaces por utilizador perfeitamente; a rejeição é de produto e de privacidade. O que o suporte precisa sobre o cliente (subscrição, reembolsos recentes) vem da fonte por `ler_cliente`, sempre actual e com autorização.',
    },
    {
      id: 'q-memoria-06',
      topic: 'langgraph',
      prompt: 'Um nó precisa de ler instruções da Store. Qual destas formas funciona em LangGraph 1.x?',
      options: [
        'Importar a Store como variável global dentro do nó',
        'Compilar com `compile(store=store)` e receber `runtime: Runtime` no nó, usando `runtime.store`',
        'Guardar a Store num canal do estado',
        'Passar a Store em `config["configurable"]["store"]`',
      ],
      answer: [1],
      explain:
        'A Store é injectada pelo motor: `compile(store=...)` e o nó declara `runtime: Runtime` (ou um parâmetro `store: BaseStore`). Um canal do estado seria serializado no checkpoint, e uma global prende o grafo a uma instância.',
    },
    {
      id: 'q-memoria-07',
      topic: 'memoria',
      prompt: 'Em que ponto do turno deve a PII ser mascarada para nunca chegar ao checkpoint?',
      options: [
        'No nó que responde, antes de chamar o modelo',
        'Na guarda de entrada, substituindo a mensagem pelo mesmo id',
        'No job de retenção, ao fim de 30 dias',
        'No resumo, com a instrução «nada de dados pessoais»',
      ],
      answer: [1],
      explain:
        'O checkpoint é gravado depois de cada superstep. Se a mensagem crua entra no primeiro superstep, fica gravada nos blobs. A guarda de entrada devolve uma `HumanMessage` com o mesmo id e o texto mascarado; `add_messages` substitui-a. A instrução no prompt de resumo é uma segunda camada, não a defesa.',
    },
    {
      id: 'q-memoria-08',
      topic: 'memoria',
      prompt: 'Que métricas indicam que a política de memória está a falhar? (duas respostas)',
      options: [
        'p95 de tokens de histórico por turno bem acima de 1 500',
        'Perguntas repetidas ao cliente nas conversas multi-turno',
        'Número de documentos no índice',
        'recall@5 da pesquisa híbrida',
      ],
      answer: [0, 1],
      explain:
        'A primeira mostra que alguma rota não aplica a janela; a segunda mostra que a janela e o resumo perdem o que importa. Documentos no índice e recall medem o RAG, não a memória.',
    },
  ],

  /* ============================================================= exercícios */
  exercises: [
    {
      id: 'e-memoria-01',
      title: 'Quando começa a janela a cortar',
      kind: 'input',
      statement:
        'Cada turno com ferramenta acrescenta 360 tokens de histórico (30 do cliente, 150 do resultado, 180 da resposta). Com uma janela de 1 500 tokens, em que turno (contando o primeiro como 1) é que o histórico anterior passa a janela pela primeira vez?',
      accept: ['6', 'sexto', 'turno 6'],
      hint: 'No turno t, o histórico anterior tem (t − 1) × 360 tokens.',
      solution:
        'No turno 6: o histórico anterior tem 5 × 360 = 1 800 > 1 500. No turno 5 tem 4 × 360 = 1 440, ainda cabe. Com 3,4 turnos em média, a maioria das conversas nunca chega lá.',
      difficulty: 1,
    },
    {
      id: 'e-memoria-02',
      title: 'Um contador de tokens para trim_messages',
      kind: 'code',
      statement:
        'Escreve um `token_counter` para `trim_messages` que conte o texto com 3,6 caracteres por token, some 4 tokens por mensagem e, para `AIMessage` com `tool_calls`, conte também o JSON dos argumentos. Explica porque é que a última parte importa.',
      hint: '`json.dumps(tc["args"])` para cada `tc` em `m.tool_calls`.',
      solution:
        '`def contar(msgs): return sum(math.ceil(len(m.text or " ") / 3.6) + 4 + sum(math.ceil(len(json.dumps(tc["args"])) / 3.6) for tc in getattr(m, "tool_calls", []) or []) for m in msgs)`. Uma mensagem com chamada de ferramenta tem muitas vezes `text` vazio: sem contar os argumentos, o contador diz que custa 4 tokens e a janela subestima o que vai no pedido. O fornecedor cobra os argumentos como tokens de entrada no turno seguinte.',
      difficulty: 2,
    },
    {
      id: 'e-memoria-03',
      title: 'Avaliar o prompt de resumo',
      kind: 'design',
      statement:
        'O prompt de resumo vai mudar (de 80 para 50 palavras, para poupar tokens). Desenha a avaliação que decide se a mudança entra: dados, métrica, limiar, e como a correr no CI sem modelo real.',
      solution:
        'Dados: as 60 conversas multi-turno do conjunto dourado, cada uma anotada com os factos que têm de sobreviver (pedido, valor proposto, confirmação, local de entrega). Métrica: fracção de factos anotados presentes no resumo (asserção por substring ou por juiz binário) e perguntas repetidas na conversa simulada. Limiar: nenhuma descida na fracção de factos e zero perguntas repetidas novas; IC por bootstrap (módulo 20). CI: com o modelo simulado corre só o resumo extractivo e as asserções estruturais; a comparação real entre prompts corre nas evals nocturnas com o escalão pequeno e o juiz (módulos 22 e 28).',
      difficulty: 3,
    },
    {
      id: 'e-memoria-04',
      title: 'Memória procedimental editável',
      kind: 'open',
      statement:
        'O suporte pede para poder acrescentar regras do tipo «quando o cliente menciona X, faz Y» sem esperar por um deploy. Propõe uma solução com a Store do LangGraph e diz que riscos introduz e como os mitigas.',
      solution:
        'Uma `PostgresStore` com namespace `("procedimentos", "balcao", versao)`, escrita só por uma interface do suporte (nunca pelo agente), lida pelo nó `agente` com `search` por semelhança e limite de 3 regras. Riscos: regras não revistas (contornam o PR e as evals), conflito com a política, injecção por quem tem acesso à interface, regras que degradam uma intenção. Mitigação: estado `proposta` até correrem as evals contra o conjunto dourado; aprovação de duas pessoas; versão da Store registada no traço de cada turno (RNF-06); rollback por versão; e uma regra nunca altera limites de acção, que vivem no código.',
      difficulty: 3,
    },
    {
      id: 'e-memoria-05',
      title: 'Onde vai cada informação',
      kind: 'open',
      statement:
        'Classifica, com a árvore «Devo guardar isto, e onde?»: (a) o cliente confirmou o cupão de 200 MZN; (b) o cliente tem alergia a amendoim; (c) o prazo de reembolso no M-Pesa passou de 72 para 24 horas; (d) o tom deve ser mais curto no WhatsApp.',
      solution:
        '(a) Campo estruturado do estado (a confirmação decide a emissão). (b) Dado de saúde de uma pessoa: não se guarda fora da conversa; na conversa entra mascarado se for identificável e o caso escala (intenção `seguranca`). (c) Conhecimento de domínio: documento novo com `vigente = true` e o antigo retirado (RAG). (d) Procedimental: prompt versionado por canal, avaliado antes de entrar.',
      difficulty: 1,
    },
  ],

  /* ================================================================== labs */
  labs: [
    {
      id: 'lab-memoria-01',
      moduleId: 'memoria',
      title: 'Janela segura com trim_messages',
      brief:
        'A função `janela` corta o histórico por número de mensagens e pode começar num resultado de ferramenta. Reescreve-a com `trim_messages`, orçamento em tokens, `strategy="last"` e `start_on="human"`.',
      lang: 'python',
      starter: String.raw`from langchain_core.messages import BaseMessage


def janela(mensagens: list[BaseMessage], max_tokens: int) -> list[BaseMessage]:
    # as últimas 6 mensagens, sejam elas quais forem
    return mensagens[-6:]
`,
      checks: [
        { id: 'trim', label: 'Usa trim_messages', re: '\\btrim_messages\\(' },
        { id: 'last', label: 'strategy="last"', re: 'strategy\\s*=\\s*["\']last["\']' },
        { id: 'start', label: 'Começa numa mensagem do cliente', re: 'start_on\\s*=\\s*["\']human["\']', why: 'Sem isto, a janela pode começar num ToolMessage órfão.' },
        { id: 'tokens', label: 'Orçamento em tokens', re: 'max_tokens\\s*=\\s*max_tokens' },
        { id: 'contador', label: 'Com contador de tokens', re: 'token_counter\\s*=' },
        { id: 'fatia', label: 'Sem corte fixo por número de mensagens', re: 'mensagens\\[\\s*-\\s*\\d+\\s*:\\s*\\]', forbid: true },
      ],
      hints: [
        '`from langchain_core.messages import trim_messages`.',
        'Para o contador, `token_counter="approximate"` serve; o laboratório usa uma função própria.',
        'Acrescenta `include_system=True` e `allow_partial=False`.',
      ],
      solution: String.raw`from langchain_core.messages import BaseMessage, trim_messages


def janela(mensagens: list[BaseMessage], max_tokens: int) -> list[BaseMessage]:
    return trim_messages(
        mensagens,
        max_tokens=max_tokens,
        token_counter="approximate",
        strategy="last",
        start_on="human",
        include_system=True,
        allow_partial=False,
    )
`,
      difficulty: 1,
    },
    {
      id: 'lab-memoria-02',
      moduleId: 'memoria',
      title: 'Resumo incremental sem dados pessoais',
      brief:
        'Completa `resumir`: junta ao resumo anterior os números de pedido e os valores em MZN das mensagens que saíram, e grava o resultado mascarado com `b.mascarar_pii`. Corre no runtime didáctico.',
      lang: 'python',
      executavel: true,
      starter: String.raw`import re
import balcao as b

def resumir(anterior, saidas):
    texto = " ".join(saidas)
    return (anterior + " " + texto).strip()      # guarda tudo, incluindo o telefone

saidas = ["Onde está o PD-8841273? Liguem-me para o 84 123 4567.",
          "O pedido tem direito a um cupão de 200 MZN."]
print(resumir("", saidas))
`,
      checks: [
        { id: 'pedidos', label: 'Extrai números de pedido', re: 're\\.findall\\([^\\n]*PD-' },
        { id: 'valores', label: 'Extrai valores em MZN', re: 're\\.findall\\([^\\n]*MZN' },
        { id: 'mascara', label: 'Mascara PII antes de devolver', re: '\\bb\\.mascarar_pii\\(' },
        { id: 'cru', label: 'Não concatena as mensagens cruas ao resumo', re: 'anterior\\s*\\+\\s*["\'] ["\']\\s*\\+\\s*texto', forbid: true },
      ],
      hints: [
        '`re.findall(r"PD-[0-9]{7}", texto)` e `re.findall(r"[0-9][0-9 ]*MZN", texto)`.',
        'Monta a frase nova e passa-a por `b.mascarar_pii` antes de a juntar ao anterior.',
      ],
      solution: String.raw`import re
import balcao as b

def resumir(anterior, saidas):
    texto = " ".join(saidas)
    pedidos = sorted(set(re.findall(r"PD-[0-9]{7}", texto)))
    valores = list(dict.fromkeys(v.strip() for v in re.findall(r"[0-9][0-9 ]*MZN", texto)))
    novo = f"Pedidos: {', '.join(pedidos) or '—'}. Valores falados: {', '.join(valores) or '—'}."
    return b.mascarar_pii(f"{anterior} {novo}".strip())

saidas = ["Onde está o PD-8841273? Liguem-me para o 84 123 4567.",
          "O pedido tem direito a um cupão de 200 MZN."]
print(resumir("", saidas))
`,
      difficulty: 2,
    },
  ],

  /* ============================================================ casos de uso */
  useCases: [
    {
      id: 'uc-memoria-01',
      title: 'Operador de telecomunicações: assistente de facturação com conversas de várias semanas',
      area: 'Telecomunicações',
      level: 2,
      scenario:
        'Um operador móvel em Moçambique tem um assistente no WhatsApp para dúvidas de facturação e pacotes de dados. Ao contrário do «Balcão», as conversas são longas: um cliente abre uma reclamação sobre uma cobrança de roaming e volta ao mesmo fio durante duas ou três semanas, com dezenas de mensagens e várias consultas à facturação. O custo por conversa disparou e o assistente começou a perguntar de novo o número da factura em causa.',
      requirements: [
        'Nunca voltar a pedir a factura, o período ou o valor contestado depois de o cliente os ter dado.',
        'Custo por turno limitado, independentemente da duração da conversa.',
        'Nenhum dado pessoal (número de telefone de terceiros, NUIT) guardado fora da conversa.',
      ],
      constraints: ['Retenção de conversas definida pelo regulador sectorial; a do operador é de 90 dias.', 'Equipa de dois engenheiros; nada de infraestrutura nova além do PostgreSQL.'],
      approach: [
        { title: 'Estado do caso tipado', text: 'Canais `factura_id`, `periodo`, `valor_contestado`, `estado_reclamacao` preenchidos por ferramentas e pelo classificador; o router e as ferramentas lêem daqui, não do histórico.' },
        { title: 'Janela e resumo', text: '`trim_messages` com 2 000 tokens e `start_on="human"`; resumo incremental no escalão pequeno quando o estado passa 20 mensagens, com as mensagens removidas por `RemoveMessage`.' },
        { title: 'Sem Store por cliente', text: 'Preferências e histórico de pacotes lêem-se da API de clientes por ferramenta. A Store existe só para respostas-modelo aprovadas pela equipa de facturação (procedimental), com TTL.' },
        { title: 'Avaliação', text: 'Vinte conversas longas reais (anonimizadas) com os factos anotados; métrica de perguntas repetidas e tokens por turno em cada PR.' },
      ],
      diagram: {
        title: 'Memória de um caso de facturação',
        cols: 4,
        rows: 3,
        nodes: [
          { id: 'cli', label: 'Cliente', sub: 'WhatsApp, semanas', col: 0, row: 1, kind: 'user' },
          { id: 'grafo', label: 'Grafo', sub: 'janela 2 000 + resumo', col: 1, row: 1, kind: 'agent' },
          { id: 'estado', label: 'Estado do caso', sub: 'factura, período, valor', col: 2, row: 0, kind: 'data' },
          { id: 'cp', label: 'Checkpoints', sub: '90 dias', col: 2, row: 2, kind: 'data' },
          { id: 'fact', label: 'API de facturação', sub: 'fonte dos factos', col: 3, row: 0, kind: 'external' },
          { id: 'store', label: 'Store procedimental', sub: 'respostas aprovadas, TTL', col: 3, row: 2, kind: 'data' },
        ],
        edges: [
          { from: 'cli', to: 'grafo' },
          { from: 'grafo', to: 'estado', label: 'lê e escreve' },
          { from: 'grafo', to: 'cp', label: 'persiste' },
          { from: 'grafo', to: 'fact', label: 'ferramentas' },
          { from: 'grafo', to: 'store', label: 'search', style: 'dashed' },
        ],
      },
      solution:
        'Os factos que decidem o caso passam a canais tipados, e as perguntas repetidas desaparecem porque deixam de depender do resumo. A janela fixa o custo por turno; o resumo evita que o estado cresça sem limite. Nada pessoal sai da conversa.',
      tools: [
        { name: 'langchain-core', role: 'trim_messages, RemoveMessage' },
        { name: 'LangGraph', role: 'estado tipado, checkpointer, Store', badge: '1.x' },
        { name: 'PostgreSQL', role: 'checkpoints e Store' },
      ],
      rejected: [
        { option: 'Histórico completo com modelo de janela maior', why: 'O custo cresce com o quadrado da duração e as perguntas repetidas continuam: o facto está lá, mas enterrado a meio de 30 000 tokens.' },
        { option: 'Memória semântica por cliente extraída pelo agente', why: 'Dados pessoais num armazenamento novo, escritos por um modelo que lê texto não confiável; o regulador pediria outra avaliação de impacto.' },
        { option: 'Resumo em cada turno', why: 'Uma chamada extra por turno para um benefício que só aparece a partir de ≈ 20 mensagens.' },
      ],
      costNote:
        'Com janela de 2 000 tokens, o histórico por turno deixa de crescer depois das primeiras mensagens; o resumo custa uma chamada ao escalão pequeno a cada ≈ 10 mensagens removidas.',
      takeaways: [
        'Memória que decide o fluxo é estado tipado; memória que dá contexto é janela e resumo.',
        'A janela limita a cauda; a conversa típica quase não a sente.',
        'O melhor lugar para um dado pessoal é a fonte, lida por ferramenta quando é precisa.',
      ],
      refs: [
        { label: 'LangChain — memória de curto prazo', url: 'https://docs.langchain.com/oss/python/langchain/short-term-memory' },
        { label: 'LangGraph — stores', url: 'https://docs.langchain.com/oss/python/langgraph/stores' },
      ],
    },
  ],
};
