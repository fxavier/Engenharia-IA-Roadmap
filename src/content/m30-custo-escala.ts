import type { Module } from '../types';

export const m30: Module = {
  id: 'custo-escala',
  number: 30,
  part: 'producao',
  title: 'Custo, latência e escala',
  subtitle: 'O custo de um sistema LLM é tokens × preço × chamadas; cada alavanca mexe num destes factores e tem um preço em qualidade ou em risco',
  icon: '💸',
  minutes: 100,
  tags: ['custo', 'prompt caching', 'cache semântica', 'rate limits', 'backpressure', 'fallback'],
  goals: [
    'Calcular o custo por conversa do «Balcão» a partir de tokens, preços e turnos, e explicar porque é que o histórico faz o custo crescer mais do que linearmente.',
    'Usar prompt caching do fornecedor com um prefixo estável, e saber o que o parte.',
    'Decidir onde uma cache semântica é segura e onde serve respostas erradas, e usar routing de modelos, limites de saída e compressão de contexto como alavancas de custo.',
    'Dimensionar contra os rate limits do fornecedor (RPM, ITPM, OTPM) com a lei de Little, e tratar 429 com Retry-After, backoff com jitter e filas com limite.',
    'Escalar o serviço horizontalmente sabendo que o gargalo é o fornecedor e não a CPU.',
    'Desenhar a degradação graciosa: o que o «Balcão» faz quando o fornecedor falha, fica lento ou recusa pedidos.',
  ],

  sections: [
    /* ================================================================== 1 */
    {
      id: 'custo-conversa',
      title: 'Quanto custa uma conversa',
      blocks: [
        {
          type: 'p',
          text:
            'Uma conversa humana no suporte do «Chega» custa 42 MZN. O alvo do «Balcão» é menos de 1,00 MZN de modelo por conversa (RNF-02). Parece uma margem enorme, e é — até um agente entrar em ciclo, um cliente mandar 200 mensagens ou alguém pôr a data e a hora no início do prompt de sistema. O custo de um sistema LLM não se gere no fim do mês com a factura; gere-se no desenho, com uma fórmula que se consegue ler em cada traço.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-custo-escala-01',
            title: 'Custo de modelo de uma conversa',
            expr: 'C = Σ_{t=0}^{T−1} [ (E_t − K_t)·p_e + K_t·p_k + S·p_s ] · câmbio / 10⁶\n\nE_t = E_0 + t·(S + 120)        K_t = f · E_t',
            where: [
              { sym: 'T', means: 'turnos da conversa (3,4 em média no «Balcão»)' },
              { sym: 'E_0', means: 'tokens de entrada do primeiro turno: 900 de sistema, 1 100 de esquemas, ≈ 2 000 de contexto RAG e o resto de histórico — 5 200 no desenho' },
              { sym: 'E_t', means: 'entrada do turno t: cresce porque a resposta anterior (S) e a mensagem do cliente (≈ 120) voltam a ir para o modelo' },
              { sym: 'S', means: 'tokens de saída por turno (180; a política de tom pede respostas curtas)' },
              { sym: 'K_t, f', means: 'tokens lidos da cache de prompt e a fracção que isso representa (60% no desenho)' },
              { sym: 'p_e, p_k, p_s', means: 'preço por milhão de tokens de entrada, de leitura de cache e de saída do escalão (médio: 1,00; 0,10; 5,00 USD)' },
              { sym: 'câmbio', means: '63,9 MZN por USD, o câmbio de referência do módulo `balcao`' },
            ],
            reading: 'O custo é a soma, turno a turno, da entrada não cacheada, da entrada cacheada e da saída, cada uma ao seu preço; a entrada cresce a cada turno porque o histórico vai sempre inteiro.',
            note: 'É exactamente o que `custo_conversa(turnos, entrada_por_turno, saida_por_turno, modelo, fraccao_cache)` calcula.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-custo-escala-01',
            title: 'O custo de referência, e porque há dois números',
            brief: 'Os preços são os escalões de referência de `balcao.MODELOS` (Setembro de 2026). Confirma sempre na página de preços do fornecedor: os preços e os nomes mudam.',
            code: `import balcao as b

# Referência do desenho: 3 turnos, 5 200 tokens de entrada, 180 de saída, modelo médio
ref = b.custo_conversa(3, 5200, 180, "medio", 0.6)
sem_cache = b.custo_conversa(3, 5200, 180, "medio", 0.0)
print(f"referência (3 turnos, 60% cache): {ref:.4f} MZN")
print(f"sem cache de prompt:              {sem_cache:.4f} MZN")
# Mais realista: 3,4 turnos em média (60% das conversas com 3, 40% com 4) e classificação no pequeno
media = 0.6 * b.custo_conversa(3, 5200, 180, "medio", 0.6) + 0.4 * b.custo_conversa(4, 5200, 180, "medio", 0.6)
classif = 3.4 * b.custo_mzn(900, 20, "pequeno")
print(f"3,4 turnos:                       {media:.4f} MZN")
print(f"+ classificação (pequeno):        {media + classif:.4f} MZN")
for m in ["pequeno", "medio", "grande"]:
    print(f"{m:8s} 3 turnos, 60% cache: {b.custo_conversa(3, 5200, 180, m, 0.6):.4f} MZN")
print(f"mês (1 150 × 30): {(media + classif) * 1150 * 30:,.0f} MZN")`,
            expected: `referência (3 turnos, 60% cache): 0.6576 MZN
sem cache de prompt:              1.2269 MZN
3,4 turnos:                       0.7523 MZN
+ classificação (pequeno):        0.8067 MZN
pequeno  3 turnos, 60% cache: 0.1675 MZN
medio    3 turnos, 60% cache: 0.6576 MZN
grande   3 turnos, 60% cache: 1.9726 MZN
mês (1 150 × 30): 27,832 MZN`,
          },
        },
        {
          type: 'p',
          text:
            'O número de referência do desenho, **≈ 0,66 MZN**, é `custo_conversa(3, 5200, 180, "medio", 0.6)`: três turnos inteiros, só o modelo médio. É o número que aparece em adr-0004 e na tabela de capacidade (≈ 760 MZN por dia). Com a média real de 3,4 turnos e a classificação no modelo pequeno em cada turno, a conta sobe para ≈ 0,81 MZN (as estimativas de ≈ 0,79 que aparecem noutros sítios arredondam a fracção de turno linearmente e ignoram os 20 tokens de saída da classificação). Qualquer das duas cabe no alvo de 1,00; o que importa é que a diferença se explica, linha a linha, em vez de ser «o modelo ficou mais caro».',
        },
        {
          type: 'table',
          head: ['Componente do turno', 'Tokens', 'Muda com', 'Alavanca'],
          rows: [
            ['Prompt de sistema', '900', 'versão do prompt', 'cache de prompt; rever instruções redundantes'],
            ['Esquemas das 12 ferramentas', '1 100', 'número e descrição das ferramentas', 'só as ferramentas da intenção (adr-0013); cache'],
            ['Contexto RAG', '≈ 2 000', '`k_contexto` e tamanho do chunk', 'k = 4 em vez de 8; re-ranking corta ruído'],
            ['Histórico', '≈ 1 200 e a crescer', 'turnos', 'janela + resumo (adr-0016); cache incremental'],
            ['Saída', '180', 'política de tom, `max_tokens`', '`max_tokens_resposta = 400` como tecto, não como alvo'],
          ],
          caption: 'Os 5 200 tokens de entrada do turno típico. A saída custa 5× por token mas é 3% dos tokens: numa aplicação de suporte, o custo está na entrada.',
        },
        { type: 'widget', id: 'custo-escala' },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: optimizar o preço em vez dos tokens',
          text:
            'A primeira reacção a uma factura alta é trocar para um modelo mais barato. Antes disso, abre dez traços caros: quase sempre há um agente a chamar a mesma ferramenta quatro vezes, um histórico de 20 turnos sem resumo, ou 8 chunks quando 4 chegavam. Cortar tokens não mexe na qualidade da resposta; trocar de modelo mexe sempre, e obriga a correr as evals todas.',
        },
        { type: 'adr', ref: 'adr-0004' },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — preços', url: 'https://www.anthropic.com/pricing' },
            { label: 'OpenAI — preços da API', url: 'https://openai.com/api/pricing/' },
            { label: 'Anthropic — contar tokens', url: 'https://docs.anthropic.com/en/docs/build-with-claude/token-counting' },
          ],
        },
      ],
    },

    /* ================================================================== 2 */
    {
      id: 'prompt-caching',
      title: 'Prompt caching: pagar uma vez pelo prefixo',
      blocks: [
        {
          type: 'p',
          text:
            'Os fornecedores guardam o estado de atenção (o KV cache) de um prefixo do prompt durante alguns minutos. Se o pedido seguinte começar exactamente com os mesmos tokens, esse prefixo não é recalculado: é cobrado a uma fracção do preço de entrada e o primeiro token chega mais cedo. A condição é literal — o mesmo prefixo, byte a byte, pela mesma ordem.',
        },
        {
          type: 'table',
          head: ['', 'Anthropic', 'OpenAI'],
          rows: [
            ['Como se activa', 'explícito: `cache_control: {"type": "ephemeral"}` no último bloco do prefixo', 'automático em prompts a partir de 1 024 tokens'],
            ['Tamanho mínimo', '1 024 tokens na maioria dos modelos (mais nos pequenos); confirmar por modelo', '1 024 tokens, em incrementos de 128'],
            ['Duração', '5 minutos por omissão, renovados a cada acerto; opção de 1 hora', 'minutos, sem garantia; mais tempo fora de pico'],
            ['Preço de leitura', '≈ 10% do preço de entrada', 'desconto sobre a entrada, varia por modelo'],
            ['Preço de escrita', '≈ 1,25× a entrada (5 min) ou 2× (1 h)', 'sem sobretaxa'],
            ['Onde se lê no `usage`', '`cache_read_input_tokens`, `cache_creation_input_tokens`', '`prompt_tokens_details.cached_tokens`'],
          ],
          caption: 'Valores das páginas oficiais em Setembro de 2026; mudam por modelo e com o tempo. Os preços do módulo `balcao` usam leitura a 10%.',
        },
        {
          type: 'run',
          run: {
            id: 'run-custo-escala-02',
            title: 'O que vale a ordem do prompt',
            brief: 'O mesmo turno de 5 200 tokens com três prefixos em cache diferentes. A última linha mostra quando é que a sobretaxa de escrita se paga.',
            code: `import balcao as b

entrada, saida = 5200, 180
print("tokens da cache  custo/turno  vs sem cache")
base = b.custo_mzn(entrada, saida, "medio")
for cache, nome in [(0, "nada (timestamp no topo)"), (2000, "sistema + esquemas"), (3120, "+ histórico anterior")]:
    c = b.custo_mzn(entrada, saida, "medio", cache)
    print(f"{cache:5d} {nome:26s} {c:.4f} MZN  {c / base - 1:+.0%}")
# Escrever na cache custa 1,25× o preço de entrada (TTL de 5 min); ler custa 0,1×.
p = b.MODELOS["medio"]
prefixo = 2000
extra_escrita = prefixo * p["entrada"] * 0.25
poupanca_leitura = prefixo * (p["entrada"] - p["cache_leitura"])
print(f"a escrita paga-se ao fim de {extra_escrita / poupanca_leitura:.2f} leituras")`,
            expected: `tokens da cache  custo/turno  vs sem cache
    0 nada (timestamp no topo)   0.3898 MZN  +0%
 2000 sistema + esquemas         0.2748 MZN  -30%
 3120 + histórico anterior       0.2104 MZN  -46%
a escrita paga-se ao fim de 0.28 leituras`,
          },
        },
        {
          type: 'p',
          text:
            'Os 60% do desenho vêm de duas camadas: o prefixo comum a todas as conversas (sistema e esquemas, 2 000 tokens) e o histórico da própria conversa, que no turno seguinte já é prefixo. Por isso a ordem do prompt do «Balcão» é fixa: sistema → esquemas → resumo → histórico → contexto RAG → pergunta. O que muda a cada turno (contexto recuperado, pergunta) vai no fim. Com 190 conversas por hora no pico, o prefixo comum raramente expira; de madrugada, com poucas conversas, expira entre pedidos e a taxa de acerto cai — a métrica certa é a fracção cacheada por hora do dia, não uma média diária.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'SDK da Anthropic: o breakpoint de cache no último esquema de ferramenta cobre ferramentas e sistema (a ordem de processamento é tools → system → messages). O `usage` diz o que foi lido e escrito.',
          code: `import anthropic

cliente = anthropic.Anthropic()  # ANTHROPIC_API_KEY do ambiente

ferramentas = [esquema_ler_pedido, esquema_calcular_reembolso, esquema_pesquisar]
ferramentas[-1] = {**ferramentas[-1], "cache_control": {"type": "ephemeral"}}

resposta = cliente.messages.create(
    model=MODELO_MEDIO,               # identificador com data, nunca um alias (RI-07)
    max_tokens=400,                   # tecto, não alvo
    system=[{"type": "text", "text": SISTEMA}],   # estável: sem data, sem nome do cliente
    tools=ferramentas,
    messages=historico + [{"role": "user", "content": pergunta_com_contexto}],
)
u = resposta.usage
print(u.input_tokens, u.cache_read_input_tokens, u.cache_creation_input_tokens, u.output_tokens)`,
        },
        {
          type: 'code',
          lang: 'json',
          caption: 'O `usage` de dois pedidos seguidos da mesma conversa (valores ilustrativos). No primeiro escreve-se a cache; no segundo lê-se. `input_tokens` é só a parte fora da cache.',
          code: `{"input_tokens": 3200, "cache_creation_input_tokens": 2000, "cache_read_input_tokens": 0,    "output_tokens": 180}
{"input_tokens": 2080, "cache_creation_input_tokens": 0,    "cache_read_input_tokens": 3120, "output_tokens": 175}`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O que parte a cache sem ninguém reparar',
          text:
            'Uma linha «Hoje é 24/09/2026, 20:14» no topo do prompt de sistema; o nome do cliente na primeira frase; os esquemas de ferramentas gerados a partir de um `dict` com ordem diferente entre processos; um A/B de prompt que muda uma vírgula em metade dos pedidos. Cada um põe a taxa de acerto em zero e o custo por turno sobe 46%. O alarme é `gen_ai.usage.cache_read.input_tokens` por turno a cair — é por isso que o traço tem de o registar.',
        },
        { type: 'adr', ref: 'adr-0026' },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — prompt caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching' },
            { label: 'OpenAI — prompt caching', url: 'https://platform.openai.com/docs/guides/prompt-caching' },
            { label: 'LangChain — ChatAnthropic', url: 'https://docs.langchain.com/oss/python/integrations/chat/anthropic' },
          ],
        },
      ],
    },

    /* ================================================================== 3 */
    {
      id: 'alavancas',
      title: 'Cache semântica, routing e contexto mais curto',
      blocks: [
        {
          type: 'p',
          text:
            'A cache de prompt nunca muda a resposta: o modelo continua a gerar tudo. Uma **cache semântica** guarda respostas e devolve-as a perguntas «parecidas», poupando a chamada inteira — e é precisamente por isso que é perigosa. «Parecida» é uma similaridade de embeddings acima de um limiar, e duas perguntas com uma palavra de diferença podem ter respostas opostas.',
        },
        {
          type: 'run',
          run: {
            id: 'run-custo-escala-03',
            title: 'O limiar da cache semântica decide que erro preferes',
            brief: 'O embedding do `balcao` é por hashing (didáctico): as similaridades absolutas não são as de um modelo real, mas o dilema do limiar é o mesmo.',
            code: `import balcao as b

guardadas = {
    "Posso juntar dois cupões no mesmo pedido?": "Não: um cupão por pedido [pol-cupoes].",
    "Quanto tempo demora o reembolso no cartão?": "5 a 10 dias úteis [pol-reembolso-prazos].",
}
novas = [
    "Dá para usar dois cupões no mesmo pedido?",
    "Posso juntar dois cupões numa encomenda?",
    "Quanto tempo demora o reembolso no M-Pesa?",
]
for q in novas:
    sim = max(b.cosseno(b.embed(q), b.embed(p)) for p in guardadas)
    print(f"{sim:.3f}  {q}")
for limiar in (0.7, 0.8, 0.9):
    c = b.CacheSemantico(limiar)
    for p, r in guardadas.items():
        c.guardar(p, r)
    respostas = [c.obter(q) for q in novas]
    print(f"limiar {limiar}: " + " | ".join(r[0] if r else "modelo" for r in respostas))`,
            expected: `0.823  Dá para usar dois cupões no mesmo pedido?
0.589  Posso juntar dois cupões numa encomenda?
0.755  Quanto tempo demora o reembolso no M-Pesa?
limiar 0.7: Não: um cupão por pedido [pol-cupoes]. | modelo | 5 a 10 dias úteis [pol-reembolso-prazos].
limiar 0.8: Não: um cupão por pedido [pol-cupoes]. | modelo | modelo
limiar 0.9: modelo | modelo | modelo`,
          },
        },
        {
          type: 'p',
          text:
            'Com limiar 0,7, a pergunta sobre o M-Pesa recebe a resposta do cartão: «5 a 10 dias úteis», quando a política diz 24 horas. Um falso acerto é pior do que uma alucinação do modelo, porque vem de uma resposta que já passou todas as guardas e parece certa. Com 0,9, a cache quase nunca acerta e não poupa nada. Por isso adr-0026 confina a cache semântica à intenção `politica` (18% dos turnos, respostas que não dependem do cliente), com limiar alto, e invalida as entradas quando um documento citado é reingerido.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Onde a cache semântica nunca entra',
          text:
            'Em nada que dependa do pedido ou do cliente («onde está o meu pedido?» tem uma resposta diferente para cada pessoa e a cada minuto), em nada com dinheiro calculado, e em nada que cite um documento cuja versão pode mudar sem a cache saber. Na prática, é uma FAQ dinâmica: poupa nas 20 perguntas mais frequentes e em mais nada.',
        },
        {
          type: 'p',
          text:
            '**Routing de modelos** é a alavanca com mais impacto depois da cache. O «Balcão» já a usa por papel (adr-0004): o pequeno classifica (0,25 USD por milhão de entrada), o médio responde, o grande só entra nos ≈ 4% de conversas que o router marca como difíceis. Mandar tudo para o grande custaria ≈ 1,97 MZN por conversa, acima do alvo; mandar tudo para o pequeno ≈ 0,17 MZN, mas abaixo dos 85% de respostas correctas de RF-01. O routing só compensa se o router for barato e avaliado: um erro que manda um caso difícil para o modelo errado custa uma resposta má, não uns cêntimos.',
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-custo-escala-01',
            title: 'O custo por conversa passou o alvo: que alavanca',
            start: 'onde',
            nodes: [
              {
                id: 'onde',
                question: 'Nos traços caros, onde estão os tokens?',
                options: [
                  { label: 'Entrada não cacheada alta', next: 'cache' },
                  { label: 'Muitas chamadas por turno', next: 'chamadas' },
                  { label: 'Histórico longo', next: 'historico' },
                  { label: 'Tudo normal, só volume', next: 'modelo' },
                ],
              },
              { id: 'cache', answer: 'Repor o prefixo estável.', detail: 'Ver a fracção cacheada por versão do prompt; procurar o que mudou no início (data, nome, ordem dos esquemas).' },
              { id: 'chamadas', answer: 'Limitar ferramentas e passos.', detail: 'Ferramentas filtradas por intenção, `max_chamadas_ferramentas`, `recursion_limit`; olhar para o p99 de passos por turno.' },
              { id: 'historico', answer: 'Janela e resumo mais cedo.', detail: '`janela_tokens_historico` e `mensagens_antes_de_resumir`; medir nas 60 conversas multi-turno que nada se perde (adr-0016).' },
              {
                id: 'modelo',
                question: 'Há uma intenção onde um escalão abaixo passa as evals?',
                options: [
                  { label: 'Sim, com IC acima do limiar', next: 'routing' },
                  { label: 'Não', next: 'aceitar' },
                ],
              },
              { id: 'routing', answer: 'Routing por intenção para o escalão abaixo.', detail: 'Canário de 10% durante 24 h; comparar feedback e escaladas por intenção.' },
              { id: 'aceitar', answer: 'Rever o alvo com o negócio.', detail: 'A 42 MZN por conversa humana, 1,20 MZN pode ser um bom negócio. A decisão é de produto, com números.' },
            ],
          },
        },
        {
          type: 'p',
          text:
            'Duas alavancas pequenas completam o quadro. **Limitar a saída**: `max_tokens` é um tecto de segurança (400 no laboratório), não um pedido de brevidade — a brevidade vem do prompt e mede-se na média de `output_tokens`. **Comprimir o contexto**: menos chunks e mais relevantes (o re-ranking deixa usar k = 4 sem perder recall), histórico em janela com resumo, e esquemas de ferramentas só da intenção. Cada 1 000 tokens de entrada a menos por turno poupa ≈ 0,025 MZN com a cache a 60% — ≈ 100 MZN por dia no volume do «Balcão».',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Histórico cortado a um orçamento de tokens antes de chamar o modelo, com a API do LangChain 1.x. O resumo das mensagens cortadas vem de `memoria.py`.',
          code: `from langchain_core.messages import trim_messages

historico = trim_messages(
    estado["messages"],
    max_tokens=cfg.janela_tokens_historico,   # 1 500 no laboratório
    token_counter="approximate",              # contagem barata; o fornecedor factura a exacta
    strategy="last",                          # fica o mais recente
    start_on="human",                         # nunca começar numa resposta ou num resultado de ferramenta
    include_system=False,                     # o sistema vai à parte, sempre igual (cache)
)`,
        },
        { type: 'file', ref: 'src/balcao/memoria.py' },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — trim_messages', url: 'https://python.langchain.com/docs/how_to/trim_messages/' },
            { label: 'Redis — cache semântica para LLM', url: 'https://redis.io/docs/latest/develop/ai/redisvl/' },
            { label: 'Anthropic — reduzir latência', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency' },
          ],
        },
      ],
    },

    /* ================================================================== 4 */
    {
      id: 'rate-limits',
      title: 'Rate limits do fornecedor e o que fazer com um 429',
      blocks: [
        {
          type: 'p',
          text:
            'O fornecedor limita cada organização por modelo em pedidos por minuto (RPM) e em tokens por minuto — na Anthropic, separados em entrada (ITPM) e saída (OTPM). Os limites crescem com o escalão de conta e implementam-se como baldes de tokens que se repõem continuamente, não como janelas fixas de 60 segundos: uma rajada pode ser recusada mesmo com a média abaixo do limite. Passado o limite, a resposta é HTTP 429 com um cabeçalho `retry-after`.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-custo-escala-02',
            title: 'Lei de Little: quantos pedidos estão em curso',
            expr: 'L = λ · W',
            where: [
              { sym: 'L', means: 'turnos em curso ao mesmo tempo (conexões SSE abertas, chamadas ao modelo pendentes)' },
              { sym: 'λ', means: 'taxa de chegada de turnos por segundo (11 por minuto no pico, 35 no teste de carga)' },
              { sym: 'W', means: 'duração média de um turno em segundos (4,415 s pelo orçamento de latência)' },
            ],
            reading: 'O número médio de pedidos dentro do sistema é a taxa de chegada vezes o tempo que cada um lá passa.',
            note: 'Vale para qualquer sistema estável, sem hipóteses sobre a distribuição. É a primeira conta de dimensionamento.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-custo-escala-04',
            title: 'O que o «Balcão» pede ao fornecedor no pico',
            brief: 'Contas de capacidade a partir de `CAPACIDADE` e do orçamento de latência. Não há limites inventados aqui: é o que o sistema consome, para comparar com o escalão contratado.',
            code: `# Capacidade no pico e no teste de carga (RNF-03), por escalão de modelo
turno_s = 4.415          # TURNO_TOTAL_MS do orçamento
for nome, msg_min in [("pico real", 11), ("teste de carga", 35)]:
    lam = msg_min / 60                       # turnos por segundo
    concorrencia = lam * turno_s             # lei de Little: L = λ·W
    rpm_medio = msg_min * 1.3                # 1 resposta + 0,3 chamadas extra com ferramentas
    itpm_medio = msg_min * 5200              # entrada total por minuto
    itpm_sem_cache = int(itpm_medio * 0.4)   # só 40% não vem da cache
    otpm = msg_min * 180
    rpm_pequeno = msg_min                    # 1 classificação por turno
    print(f"{nome}: {concorrencia:.1f} turnos em curso · médio {rpm_medio:.0f} RPM, "
          f"{itpm_medio:,} ITPM ({itpm_sem_cache:,} sem cache), {otpm:,} OTPM · pequeno {rpm_pequeno} RPM")`,
            expected: `pico real: 0.8 turnos em curso · médio 14 RPM, 57,200 ITPM (22,880 sem cache), 1,980 OTPM · pequeno 11 RPM
teste de carga: 2.6 turnos em curso · médio 46 RPM, 182,000 ITPM (72,800 sem cache), 6,300 OTPM · pequeno 35 RPM`,
          },
        },
        {
          type: 'p',
          text:
            'Menos de três turnos em curso no teste de carga: o «Balcão» não é um problema de escala de computação, e um único processo uvicorn chega com folga. O número que decide é o ITPM do modelo médio — 182 000 tokens de entrada por minuto a 35 mensagens por minuto. Na Anthropic, para a maioria dos modelos actuais, os tokens lidos da cache não contam para o ITPM (confirma por modelo na página de rate limits), o que baixa a conta para ≈ 73 000: a cache de prompt também é uma alavanca de capacidade, não só de custo.',
        },
        {
          type: 'run',
          run: {
            id: 'run-custo-escala-05',
            title: 'Balde de tokens do lado do cliente, e recuos com jitter',
            brief: 'Um limitador local (30 pedidos por minuto, rajada até 10) absorve a rajada de sexta às 20h em fila em vez de receber 429. O `random` tem semente: a saída é determinista.',
            code: `import random

def atraso(tentativa, retry_after=None, base=0.5, teto=20.0, rng=random.Random(7)):
    """Exponencial com full jitter; o Retry-After do fornecedor manda quando existe."""
    if retry_after is not None:
        return retry_after
    return rng.uniform(0, min(teto, base * 2 ** tentativa))

# 1) Balde de tokens do lado do cliente: 30 pedidos/min, rajada até 10
capacidade, reposicao = 10.0, 30 / 60           # fichas, fichas por segundo
chegadas = [0.0] * 20 + [2.0 * i for i in range(1, 11)]   # rajada de 20 às 20h00 + 1 a cada 2 s
fichas, t_ant, esperas = capacidade, 0.0, []
livre = 0.0
for t in sorted(chegadas):
    inicio = max(t, livre)
    fichas = min(capacidade, fichas + (inicio - t_ant) * reposicao)
    if fichas < 1:
        inicio += (1 - fichas) / reposicao
        fichas = 1.0
    fichas -= 1
    t_ant = livre = inicio
    esperas.append(inicio - t)
print(f"30 pedidos: {sum(e == 0 for e in esperas)} sem espera, espera máxima {max(esperas):.1f} s, 0 respostas 429")
# 2) Sem balde: o fornecedor devolve 429 e o cliente recua
print("recuos sem Retry-After:", [round(atraso(i), 2) for i in range(5)])
print("recuo com Retry-After: 7 ->", atraso(0, retry_after=7))`,
            expected: `30 pedidos: 10 sem espera, espera máxima 20.0 s, 0 respostas 429
recuos sem Retry-After: [0.16, 0.15, 1.3, 0.29, 4.29]
recuo com Retry-After: 7 -> 7`,
          },
        },
        {
          type: 'p',
          text:
            'Zero 429, mas um cliente esperou 20 segundos antes de o pedido sair: o limitador trocou erros por latência, e 20 s violam RNF-01 por uma ordem de grandeza. O limitador é necessário (sem ele, 20 processos em rajada esgotam a quota e todos recuam ao mesmo tempo), mas não chega: acima de uma espera máxima o pedido deixa de esperar e degrada (secção 6). O jitter existe pela mesma razão: sem ele, os clientes que receberam 429 ao mesmo tempo voltam todos ao mesmo tempo.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'As três peças no LangChain 1.x: limitador partilhado no processo, retentativas com jitter só para erros transitórios, e fallback para outro fornecedor. O SDK da Anthropic já respeita `retry-after` nas suas próprias retentativas (`max_retries`).',
          code: `import anthropic
import openai
from langchain_anthropic import ChatAnthropic
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_openai import ChatOpenAI

# 80% do limite contratado, em pedidos por segundo; rajada curta.
limitador = InMemoryRateLimiter(requests_per_second=0.8 * RPM_CONTRATADO / 60, max_bucket_size=10)

primario = ChatAnthropic(
    model=MODELO_MEDIO_ANTHROPIC, max_tokens=400, timeout=30, max_retries=2, rate_limiter=limitador,
)
alternativo = ChatOpenAI(model=MODELO_MEDIO_OPENAI, max_tokens=400, timeout=30, max_retries=1)

transitorios = (anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.InternalServerError)
modelo = primario.with_fallbacks([alternativo], exceptions_to_handle=transitorios)
# Nada de with_retry à volta disto: as retentativas já estão no SDK. Retentar em duas camadas
# multiplica as tentativas (2 × 3 = 6) e o tempo até desistir.`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Rate limit do lado do «Balcão», por cliente',
          text:
            'Os limites do fornecedor protegem o fornecedor. adr-0027 acrescenta limites que protegem o «Balcão» de um cliente: 429 com `Retry-After` quando um cliente passa, por exemplo, 20 mensagens em 10 minutos, e um orçamento de tokens por conversa verificado antes de cada chamada ao modelo. O laboratório tem o limite de ferramentas por turno e o `recursion_limit`, mas ainda não tem o rate limit por cliente nem o orçamento por conversa: são o segundo e o terceiro laboratórios deste módulo.',
        },
        { type: 'adr', ref: 'adr-0027' },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — rate limits', url: 'https://docs.anthropic.com/en/api/rate-limits' },
            { label: 'OpenAI — rate limits', url: 'https://platform.openai.com/docs/guides/rate-limits' },
            { label: 'RFC 6585 — 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585' },
            { label: 'LangChain — rate limiters', url: 'https://python.langchain.com/docs/how_to/chat_model_rate_limiting/' },
          ],
        },
      ],
    },

    /* ================================================================== 5 */
    {
      id: 'filas-escala',
      title: 'Filas, backpressure e escalar horizontalmente',
      blocks: [
        {
          type: 'p',
          text:
            'Um serviço LLM passa quase todo o tempo à espera: da base de dados, do re-ranker, sobretudo do fornecedor, que demora segundos a gerar. Com `async` e SSE, um processo uvicorn mantém centenas de turnos em curso com pouca CPU. O que se esgota primeiro não é a CPU nem a memória do pod: é a quota do fornecedor, as ligações ao PostgreSQL (`pool_max = 10`) e, no pico, a paciência do cliente.',
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-custo-escala-01',
            title: 'Backpressure: da rajada de sexta à fila com limite',
            intro: 'Sexta-feira, 20h00: chegam 20 mensagens no mesmo segundo. A fila tem limite de concorrência e tempo máximo de espera.',
            lanes: [
              { id: 'cliente', label: 'Clientes', kind: 'client' },
              { id: 'api', label: 'API', sub: 'rate limit por cliente', kind: 'service' },
              { id: 'fila', label: 'Semáforo do fornecedor', sub: 'concorrência ≤ 8', kind: 'broker' },
              { id: 'llm', label: 'Fornecedor', sub: 'modelo médio', kind: 'model' },
            ],
            steps: [
              { from: 'cliente', to: 'api', label: '20 mensagens em 1 s', kind: 'req', ms: 0 },
              { from: 'api', to: 'api', label: 'rate limit por cliente: todos dentro do limite', kind: 'self', detail: 'O limite por cliente trava abuso individual; não ajuda numa rajada legítima de clientes diferentes.' },
              { from: 'api', to: 'fila', label: 'adquirir semáforo (espera máx. 2 s)', kind: 'req', detail: 'Os 8 primeiros entram; os outros 12 esperam em fila FIFO. O SSE já enviou o evento de abertura, por isso o cliente não vê uma página em branco.', code: 'async with asyncio.timeout(2.0):\n    await semaforo.acquire()', lang: 'python' },
              { from: 'fila', to: 'llm', label: '8 chamadas em curso', kind: 'req', ms: 700 },
              { from: 'llm', to: 'fila', label: 'primeiros tokens; semáforo libertado ao fim do stream', kind: 'res', ms: 3000 },
              { from: 'fila', to: 'api', label: '2 pedidos passam os 2 s de espera', kind: 'err', detail: 'Em vez de esperar mais, degradam: resposta da cache semântica se for `politica`, ou mensagem de espera e nova tentativa no cliente.' },
              { from: 'api', to: 'cliente', label: 'SSE: tokens para 18, espera explicada para 2', kind: 'res' },
            ],
            outro: 'Backpressure é recusar cedo e explicitamente. A alternativa — aceitar tudo e deixar o fornecedor recusar — dá 429 em cascata e retentativas que pioram o pico.',
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Um semáforo por processo à volta das chamadas ao modelo médio, com espera máxima. Com N réplicas, a concorrência global é N × o limite local: dimensiona-se a partir da quota do fornecedor.',
          code: `import asyncio

SEMAFORO_MEDIO = asyncio.Semaphore(8)   # por processo


class Sobrecarga(Exception):
    """O turno esperou demais pela vez: degradar em vez de esperar mais."""


async def chamar_medio(modelo, mensagens, config, espera_max_s: float = 2.0):
    try:
        async with asyncio.timeout(espera_max_s):
            await SEMAFORO_MEDIO.acquire()
    except TimeoutError:
        raise Sobrecarga("fila do modelo médio cheia") from None
    try:
        async for pedaco in modelo.astream(mensagens, config):
            yield pedaco
    finally:
        SEMAFORO_MEDIO.release()   # também quando o cliente desliga a meio do stream`,
        },
        {
          type: 'p',
          text:
            'Escalar horizontalmente um serviço destes resolve disponibilidade (uma réplica cai, a outra continua) e ligações abertas (cada SSE é uma ligação longa), não throughput do modelo. Duas réplicas com `Semaphore(8)` cada fazem 16 chamadas concorrentes ao fornecedor: se a quota não comportar 16, escalar piora as coisas. Por isso o sinal de autoscaling certo é o número de turnos em curso por pod, não a CPU, que fica perto de zero enquanto o pod espera pelo fornecedor.',
        },
        {
          type: 'code',
          lang: 'yaml',
          caption: 'HorizontalPodAutoscaler v2 com uma métrica de pods (turnos em curso), exposta por um adaptador de métricas Prometheus. Mínimo 2 réplicas por disponibilidade; máximo limitado pela quota do fornecedor.',
          code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: balcao-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: balcao-api
  minReplicas: 2          # disponibilidade, não carga
  maxReplicas: 4          # 4 × Semaphore(8) = 32 chamadas: o que a quota do fornecedor aguenta
  metrics:
    - type: Pods
      pods:
        metric:
          name: balcao_turnos_em_curso     # gauge exposto em /metrics
        target:
          type: AverageValue
          averageValue: "6"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600      # SSE longos: não matar pods a meio de conversas`,
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Onde estão os limites de um turno',
            caption: 'Cada caixa tem um limite próprio. O primeiro a esgotar define a capacidade.',
            cols: 5,
            rows: 2,
            zones: [
              { id: 'z-nos', label: 'O que controlamos', col: 0, row: 0, colSpan: 3, rowSpan: 2, tone: 'service' },
              { id: 'z-fora', label: 'Fornecedor', col: 3, row: 0, colSpan: 2, rowSpan: 2, tone: 'external' },
            ],
            nodes: [
              { id: 'lb', label: 'Balanceador', sub: 'SSE: timeouts longos', col: 0, row: 0, kind: 'service' },
              { id: 'pods', label: 'Réplicas da API', sub: '2 a 4, async', col: 1, row: 0, kind: 'service' },
              { id: 'sem', label: 'Semáforo', sub: '8 por réplica', col: 2, row: 0, kind: 'queue' },
              { id: 'pg', label: 'PostgreSQL', sub: 'pool_max = 10 por réplica', col: 1, row: 1, kind: 'data' },
              { id: 'medio', label: 'Modelo médio', sub: 'RPM, ITPM, OTPM', col: 3, row: 0, kind: 'model' },
              { id: 'peq', label: 'Modelo pequeno', sub: 'quota própria', col: 4, row: 1, kind: 'model' },
            ],
            edges: [
              { from: 'lb', to: 'pods' },
              { from: 'pods', to: 'sem' },
              { from: 'sem', to: 'medio' },
              { from: 'pods', to: 'pg' },
              { from: 'pods', to: 'peq', style: 'dashed' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'O PostgreSQL também é uma quota',
          text:
            '`pool_max = 10` por réplica, mais o pool do checkpointer: com 4 réplicas são dezenas de ligações ao PostgreSQL gerido que a plataforma partilha com outros serviços. Um HPA que sobe para 10 réplicas pode esgotar `max_connections` antes de esgotar o fornecedor. PgBouncer à frente, e o `prepare_threshold: 0` que o laboratório já usa no checkpointer, tornam isso gerível.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kubernetes — HorizontalPodAutoscaler', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/' },
            { label: 'Python — asyncio.Semaphore', url: 'https://docs.python.org/3/library/asyncio-sync.html' },
            { label: 'Uvicorn — deployment', url: 'https://uvicorn.org/deployment/' },
          ],
        },
      ],
    },

    /* ================================================================== 6 */
    {
      id: 'degradacao',
      title: 'Degradação graciosa e fallback',
      blocks: [
        {
          type: 'p',
          text:
            'O fornecedor vai falhar: 529 por sobrecarga, 5xx, latência a triplicar numa sexta à noite, uma versão de modelo descontinuada. A pergunta de desenho não é «como evito que falhe», é **o que o cliente vê quando falha**. O «Balcão» tem uma vantagem que muitos sistemas não têm: um humano do outro lado. Passar a conversa ao suporte é sempre uma saída segura — cara, mas segura.',
        },
        {
          type: 'table',
          head: ['Nível', 'Sinal', 'O que o «Balcão» faz', 'O que se perde'],
          rows: [
            ['0 — normal', '—', 'Grafo completo, modelo médio, re-ranking', '—'],
            ['1 — lento', 'TTFT do fornecedor p95 > 1,2 s durante 5 min', 'Desliga o re-ranking (−180 ms), k = 3', '≈ 1 ponto de recall@3 (0,950 → 0,933 no `balcao`)'],
            ['2 — quota', '429 frequentes ou fila > 2 s', 'Política: cache semântica primeiro; resto: fallback para o outro fornecedor', 'Variação de tom; custo diferente'],
            ['3 — fornecedor em baixo', 'erros > 20% durante 2 min (circuito aberto)', 'Fallback; se também falhar, `onde-esta` responde por template a partir de `ler_pedido`', 'Respostas menos naturais; nada de RAG'],
            ['4 — sem modelo', 'os dois fornecedores em baixo', 'Mensagem honesta e escalamento para humano com resumo', 'Resolução autónoma; o suporte sente a carga'],
          ],
          caption: 'Cada nível é uma decisão tomada com calma, antes do incidente, e testada. Os números de recall são do runtime didáctico (híbrido vs híbrido + re-rank).',
        },
        {
          type: 'trace',
          trace: {
            id: 'tr-custo-escala-01',
            title: 'Um turno no nível 2: 429 do primário e fallback',
            brief: 'O fornecedor primário devolve 429 com `retry-after: 7`. Sete segundos rebentam o orçamento de TTFT: o turno não espera, vai para o alternativo.',
            spans: [
              { id: 'r', name: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ms: 5020, attrs: [['http.response.status_code', '200'], ['balcao.ttft_ms', '1960'], ['balcao.degradacao', '2']] },
              { id: 'w', parent: 'r', name: 'invoke_workflow balcao', kind: 'no', ms: 4950, attrs: [['gen_ai.operation.name', 'invoke_workflow'], ['balcao.intencao', 'compensacao']] },
              { id: 'c', parent: 'w', name: 'chat modelo-pequeno', kind: 'llm', ms: 350, tokensIn: 900, tokensOut: 20, attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.provider.name', 'anthropic'], ['gen_ai.usage.input_tokens', '900'], ['gen_ai.usage.output_tokens', '20']] },
              { id: 'm1', parent: 'w', name: 'chat modelo-medio', kind: 'llm', ms: 180, status: 'erro', attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.provider.name', 'anthropic'], ['error.type', '429'], ['balcao.retry_after_s', '7']], detail: 'Quota de ITPM esgotada. O SDK não retenta: retry-after acima do orçamento do turno.' },
              { id: 'f', parent: 'w', name: 'fallback fornecedor alternativo', kind: 'retry', ms: 10, attrs: [['balcao.motivo', 'rate_limit'], ['balcao.circuito', 'fechado']], detail: 'Decisão em código: retry-after > 2 s → fallback imediato.' },
              { id: 'm2', parent: 'w', name: 'chat modelo-medio-alternativo', kind: 'llm', ms: 3900, tokensIn: 5200, tokensOut: 175, attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.provider.name', 'openai'], ['gen_ai.usage.input_tokens', '5200'], ['gen_ai.usage.output_tokens', '175']], detail: 'Sem cache: o prefixo nunca foi escrito neste fornecedor. Este turno custa ≈ 0,39 MZN em vez de 0,21.' },
              { id: 'e', parent: 'm2', name: 'execute_tool ler_pedido', kind: 'ferramenta', ms: 120, attrs: [['gen_ai.operation.name', 'execute_tool'], ['gen_ai.tool.name', 'ler_pedido']] },
              { id: 'g', parent: 'w', name: 'guarda_saida', kind: 'guarda', ms: 30, attrs: [['balcao.citacoes', 'pol-atraso-compensacao']] },
            ],
            note: 'O fallback mantém o cliente servido a 1,96 s de TTFT, acima do SLO mas longe dos 9 s que custaria esperar. O custo do turno quase duplica porque a cache é por fornecedor.',
          },
        },
        {
          type: 'p',
          text:
            'Um fallback entre fornecedores só é seguro se tiver sido avaliado: o modelo alternativo passa as mesmas evals (RI-07 pede um teste mensal), os esquemas de ferramentas funcionam nos dois formatos, e o prompt não depende de particularidades de um só fornecedor. É a razão de ser da interface própria sobre o fornecedor (adr-0003): trocar de fornecedor é mudar configuração, não reescrever o grafo.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Um circuit breaker mínimo à volta do fornecedor primário. Aberto, nem se tenta: vai-se directo ao alternativo, e a cada 30 s um pedido de sonda testa se o primário voltou.',
          code: `import time
from dataclasses import dataclass, field


@dataclass
class Circuito:
    limiar_erros: float = 0.2      # 20% de erros...
    janela: int = 50               # ...nos últimos 50 pedidos
    pausa_s: float = 30.0
    resultados: list[bool] = field(default_factory=list)
    aberto_desde: float | None = None

    def permite(self) -> bool:
        if self.aberto_desde is None:
            return True
        return time.monotonic() - self.aberto_desde >= self.pausa_s   # meio-aberto: deixa passar uma sonda

    def registar(self, ok: bool) -> None:
        self.resultados = (self.resultados + [ok])[-self.janela:]
        if ok and self.aberto_desde is not None:
            self.aberto_desde, self.resultados = None, []            # a sonda passou: fecha
        elif len(self.resultados) >= 10 and self.resultados.count(False) / len(self.resultados) > self.limiar_erros:
            self.aberto_desde = time.monotonic()`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Ensaia a degradação antes de precisares dela',
          text:
            'Um fallback que nunca correu em produção não funciona no dia em que é preciso: a chave do alternativo expirou, a quota dele é a mínima, o formato de uma ferramenta mudou. Uma vez por mês, força o circuito aberto em staging (e 1% do tráfego em produção durante uma hora) e confirma que os níveis 1 a 4 fazem o que a tabela diz. Mede o custo e a qualidade desses turnos à parte.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Degradar não é esconder',
          text:
            'Quando o «Balcão» está no nível 4, a mensagem ao cliente diz que o assistente está indisponível e que um colega vai responder — nada de respostas genéricas que parecem úteis e não são. Um cliente que recebe «não sei» honesto volta; um que recebe uma resposta errada confiante liga a reclamar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — erros da API (429, 529)', url: 'https://docs.anthropic.com/en/api/errors' },
            { label: 'LangChain — fallbacks', url: 'https://python.langchain.com/docs/how_to/fallbacks/' },
            { label: 'Google SRE Book — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/' },
            { label: 'Google SRE Book — Addressing Cascading Failures', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
          ],
        },
      ],
    },
  ],

  /* ======================================================================= quiz */
  quiz: [
    {
      id: 'q-custo-escala-01',
      topic: 'custo',
      prompt: 'Porque é que o custo de uma conversa de 6 turnos é mais do dobro do de uma de 3, com a mesma entrada inicial?',
      options: [
        'Porque o fornecedor cobra mais a partir do terceiro turno.',
        'Porque cada turno reenvia o histórico: a entrada cresce a cada turno e o custo total cresce mais do que linearmente.',
        'Porque a cache de prompt expira ao terceiro turno.',
        'Porque a saída fica mais longa.',
      ],
      answer: [1],
      explain: 'E_t = E_0 + t·(S + 120): somar T turnos dá um termo quadrático em T. A cache e a janela com resumo são o que trava esse crescimento.',
    },
    {
      id: 'q-custo-escala-02',
      topic: 'prompt caching',
      prompt: 'Quais destas alterações partem a cache de prompt do «Balcão»?',
      options: [
        'Pôr a data e a hora na primeira linha do prompt de sistema.',
        'Mudar a pergunta do cliente.',
        'Gerar os esquemas de ferramentas com uma ordem diferente em cada processo.',
        'Mudar o contexto RAG, que vai no fim do prompt.',
      ],
      answer: [0, 2],
      explain: 'A cache é por prefixo exacto. O que muda no início invalida tudo o que vem depois; o que muda no fim (pergunta, contexto) já estava fora do prefixo cacheado.',
    },
    {
      id: 'q-custo-escala-03',
      topic: 'cache semântica',
      prompt: 'Com limiar 0,7, a cache semântica respondeu à pergunta sobre o M-Pesa com o prazo do cartão. Qual é a correcção certa?',
      options: [
        'Baixar o limiar para 0,6.',
        'Subir o limiar, confinar a cache às perguntas de política frequentes, e invalidar entradas quando os documentos citados mudam.',
        'Desligar a cache de prompt.',
        'Pedir ao modelo que verifique a resposta da cache.',
      ],
      answer: [1],
      explain: 'O limiar decide o compromisso entre falsos acertos e poupança; a confinação limita o dano de um falso acerto; a invalidação evita servir políticas antigas. Pedir ao modelo para verificar anula a poupança.',
    },
    {
      id: 'q-custo-escala-04',
      topic: 'capacidade',
      prompt: 'Com 35 mensagens por minuto e 4,4 s por turno, quantos turnos estão em curso em média?',
      options: ['≈ 0,6', '≈ 2,6', '≈ 35', '≈ 154'],
      answer: [1],
      explain: 'Lei de Little: λ = 35/60 ≈ 0,58 por segundo; L = 0,58 × 4,415 ≈ 2,6. O serviço está longe de ser um problema de CPU.',
    },
    {
      id: 'q-custo-escala-05',
      topic: 'rate limits',
      prompt: 'O fornecedor devolve 429 com `retry-after: 7` num turno cujo TTFT alvo é 1,5 s. O que deve o «Balcão» fazer?',
      options: [
        'Esperar 7 s e tentar de novo.',
        'Tentar imediatamente, ignorando o cabeçalho.',
        'Não esperar: ir para o fornecedor alternativo (ou degradar), e registar o 429 no traço.',
        'Devolver 429 ao cliente.',
      ],
      answer: [2],
      explain: 'Ignorar o retry-after agrava o problema do fornecedor; esperar 7 s rebenta o SLO. A decisão é em código, com um limiar de espera aceitável.',
    },
    {
      id: 'q-custo-escala-06',
      topic: 'escala',
      prompt: 'Qual é o melhor sinal para o autoscaling das réplicas do «Balcão»?',
      options: [
        'Utilização de CPU acima de 70%.',
        'Turnos em curso por pod.',
        'Memória do pod.',
        'Número de documentos no índice.',
      ],
      answer: [1],
      explain: 'O pod passa o tempo à espera de I/O; a CPU fica perto de zero mesmo com o fornecedor saturado. Turnos em curso medem a carga real — e o máximo de réplicas limita-se pela quota do fornecedor.',
    },
    {
      id: 'q-custo-escala-07',
      topic: 'fallback',
      prompt: 'O que tem de ser verdade para um fallback entre fornecedores ser seguro?',
      options: [
        'O modelo alternativo passou as mesmas evals que o primário.',
        'O alternativo é mais barato.',
        'O fallback foi ensaiado recentemente com a chave e a quota de produção.',
        'O alternativo tem a mesma janela de contexto exacta.',
      ],
      answer: [0, 2],
      explain: 'Um alternativo não avaliado troca uma indisponibilidade por respostas de qualidade desconhecida; um fallback nunca ensaiado falha no dia em que é preciso. Preço e janela idêntica não são condições.',
    },
    {
      id: 'q-custo-escala-08',
      topic: 'retentativas',
      prompt: 'Porque é que não se põe `with_retry(stop_after_attempt=3)` à volta de um modelo que já tem `max_retries=2` no SDK?',
      options: [
        'Porque o LangChain não permite.',
        'Porque as retentativas multiplicam-se: até 9 chamadas e muito mais tempo até desistir, a agravar a sobrecarga do fornecedor.',
        'Porque `with_retry` não tem jitter.',
        'Porque o SDK ignora 429.',
      ],
      answer: [1],
      explain: 'Retentativas em camadas multiplicam-se (3 × 3). Uma camada, com jitter e respeito pelo retry-after, e um tempo máximo total.',
    },
    {
      id: 'q-custo-escala-09',
      topic: 'degradação',
      prompt: 'Os dois fornecedores estão em baixo. O que é aceitável o «Balcão» fazer?',
      options: [
        'Responder «onde está o meu pedido» por template a partir de `ler_pedido`, sem modelo.',
        'Responder a perguntas de política com uma resposta genérica.',
        'Dizer que o assistente está indisponível e passar a conversa a um humano com resumo.',
        'Pôr as mensagens numa fila e responder quando o fornecedor voltar, sem avisar.',
      ],
      answer: [0, 2],
      explain: 'O template usa dados reais e não inventa; o escalamento é honesto. Respostas genéricas parecem úteis e não são; filas silenciosas deixam o cliente sem saber o que se passa.',
    },
  ],

  /* ================================================================== exercícios */
  exercises: [
    {
      id: 'e-custo-escala-01',
      title: 'Poupança de 1 000 tokens',
      kind: 'input',
      statement: 'Cortar 1 000 tokens de entrada por turno (com 60% de cache, modelo médio) poupa quanto por turno, em MZN, com 3 casas decimais? Usa 0,4 × 1 000 ao preço de entrada e 0,6 × 1 000 ao de leitura de cache.',
      accept: ['0,029', '0.029'],
      hint: '(400 × 1,00 + 600 × 0,10) / 10⁶ USD × 63,9.',
      solution: '(400 + 60) / 1 000 000 = 0,00046 USD × 63,9 = 0,0294 MZN por turno; × 3 900 turnos ≈ 115 MZN por dia.',
      difficulty: 1,
    },
    {
      id: 'e-custo-escala-02',
      title: 'Explicar a factura',
      kind: 'open',
      statement: 'O custo médio por conversa passou de 0,81 para 1,35 MZN numa semana, sem mudança de modelo. Descreve a investigação, por ordem, e as três causas mais prováveis com o sinal que confirma cada uma.',
      solution:
        'Começar pelos traços mais caros da semana e pela decomposição tokens/turnos. Causas: (1) cache partida — `cache_read.input_tokens` por turno cai, coincide com uma versão do prompt; (2) ciclo de ferramentas ou agente mais usado — p99 de chamadas por turno e `balcao_limite_ferramentas_total` sobem, ou uma intenção passou a ir para o agente; (3) conversas mais longas — turnos por conversa sobem, muitas vezes porque as respostas pioraram e os clientes reformulam, o que é um problema de qualidade (ver feedback e escaladas por versão). Só depois considerar preços ou volume.',
      difficulty: 2,
    },
    {
      id: 'e-custo-escala-03',
      title: 'Dimensionar a quota para a Black Friday',
      kind: 'design',
      statement: 'O marketing prevê 4× o pico normal numa promoção (44 mensagens por minuto durante 3 horas). Calcula o que é preciso pedir ao fornecedor (RPM e ITPM do modelo médio, com e sem cache), a concorrência, e desenha o plano de degradação se a quota não chegar a tempo.',
      solution:
        '44 × 1,3 ≈ 57 RPM; 44 × 5 200 = 228 800 ITPM (≈ 91 500 sem a parte cacheada, se o fornecedor não contar a cache no limite); OTPM 44 × 180 = 7 920; concorrência 44/60 × 4,4 ≈ 3,2 turnos. Pedir o aumento de escalão com semanas de antecedência, com margem de 1,5×. Plano B: limitador local a 80% da quota, cache semântica activa para `politica` com limiar alto, re-ranking desligado acima de 70% da quota, fallback para o fornecedor alternativo já avaliado, e aviso ao suporte humano para reforçar a equipa nas 3 horas.',
      difficulty: 3,
    },
    {
      id: 'e-custo-escala-04',
      title: 'Grande para tudo',
      kind: 'input',
      statement: 'Pelo `custo_conversa` de referência (3 turnos, 5 200 de entrada, 180 de saída, 60% de cache), quantas vezes é mais cara uma conversa no modelo grande do que no médio? Uma casa decimal.',
      accept: ['3,0', '3.0', '3'],
      solution: '1,9726 / 0,6576 = 3,0. Para 3 pontos de qualidade (adr-0004), fora do orçamento de RNF-02.',
      difficulty: 1,
    },
    {
      id: 'e-custo-escala-05',
      title: 'Onde pôr a cache semântica',
      kind: 'open',
      statement: 'Para cada intenção do «Balcão» (onde-está, compensação, política, pagamentos, conta, segurança, outros), diz se a cache semântica é aceitável e porquê.',
      solution:
        'Só `politica`, e parcialmente `outros` (recusas frequentes como «vendem bilhetes de avião?» são estáveis). Onde-está depende do pedido e do minuto; compensação envolve dinheiro calculado por ferramenta; pagamentos misturam política e estado do pedido; conta exige verificação humana; segurança vai sempre para humano. Em todas estas, uma resposta reutilizada é errada por construção.',
      difficulty: 2,
    },
  ],

  /* ================================================================ laboratórios */
  labs: [
    {
      id: 'lab-custo-escala-01',
      moduleId: 'custo-escala',
      title: 'Montar o prompt com prefixo estável',
      brief:
        'A função monta as mensagens de um turno, mas põe a data e o nome do cliente no prompt de sistema e o contexto RAG antes do histórico. Reordena para sistema → histórico → contexto → pergunta, marca o fim do prefixo estável com `cache_control`, e tira do sistema tudo o que muda por pedido.',
      lang: 'python',
      starter: `from datetime import datetime


def montar(sistema: str, historico: list[dict], contexto: str, pergunta: str, cliente: str) -> dict:
    sis = f"Hoje é {datetime.now():%d/%m/%Y %H:%M}. Cliente: {cliente}.\\n" + sistema
    return {
        "system": [{"type": "text", "text": sis}],
        "messages": [{"role": "user", "content": f"<contexto>{contexto}</contexto>"}]
        + historico
        + [{"role": "user", "content": pergunta}],
    }`,
      checks: [
        { id: 'cache', label: 'Marca o prefixo com cache_control ephemeral', re: '["\']cache_control["\']\\s*:\\s*\\{\\s*["\']type["\']\\s*:\\s*["\']ephemeral["\']' },
        { id: 'data', label: 'Não põe a data/hora no prompt de sistema', re: 'datetime\\.now\\(', forbid: true, why: 'Muda a cada pedido e invalida a cache inteira.' },
        { id: 'cliente', label: 'Não põe o nome do cliente no sistema', re: 'Cliente:\\s*\\{cliente\\}', forbid: true },
        { id: 'ordem', label: 'O histórico vem antes do contexto e da pergunta', re: 'historico[\\s\\S]*<contexto>' },
      ],
      hints: [
        'O sistema deve ser `[{"type": "text", "text": sistema, "cache_control": {"type": "ephemeral"}}]`.',
        'Junta contexto e pergunta numa só mensagem do utilizador, no fim.',
      ],
      solution: `def montar(sistema: str, historico: list[dict], contexto: str, pergunta: str, cliente: str) -> dict:
    # O cliente não entra no prompt: as ferramentas recebem o cliente_id do contexto do servidor.
    return {
        "system": [{"type": "text", "text": sistema, "cache_control": {"type": "ephemeral"}}],
        "messages": historico
        + [{"role": "user", "content": f"<contexto>{contexto}</contexto>\\n\\nPergunta: {pergunta}"}],
    }`,
      difficulty: 1,
    },
    {
      id: 'lab-custo-escala-02',
      moduleId: 'custo-escala',
      title: 'Rate limit por cliente com Retry-After',
      brief:
        'Implementa um limitador de janela deslizante por cliente (20 mensagens em 10 minutos) e uma dependência FastAPI que devolve 429 com o cabeçalho `Retry-After` em segundos inteiros. O relógio é injectado para se poder testar.',
      lang: 'python',
      starter: `import time
from collections import defaultdict, deque

from fastapi import HTTPException


class Limitador:
    def __init__(self, maximo: int = 20, janela_s: float = 600.0, relogio=time.monotonic):
        self.maximo, self.janela_s, self.relogio = maximo, janela_s, relogio
        self.eventos = defaultdict(deque)

    def verificar(self, cliente_id: str) -> None:
        # TODO
        pass`,
      checks: [
        { id: 'deque', label: 'Remove eventos fora da janela', re: 'popleft\\(\\)' },
        { id: '429', label: 'Levanta HTTPException 429', re: 'HTTPException\\(\\s*(status_code\\s*=\\s*)?429' },
        { id: 'retry', label: 'Envia o cabeçalho Retry-After', re: '["\']Retry-After["\']' },
        { id: 'ceil', label: 'Arredonda o Retry-After para cima', re: 'math\\.ceil\\(' },
        { id: 'pass', label: 'Não deixa o método vazio', re: 'def verificar[^\\n]*\\n\\s*#\\s*TODO\\s*\\n\\s*pass', forbid: true },
      ],
      hints: [
        'Enquanto o evento mais antigo for anterior a `agora - janela_s`, faz `popleft()`.',
        'O Retry-After é o tempo até o evento mais antigo sair da janela: `eventos[0] + janela_s - agora`.',
      ],
      solution: `import math
import time
from collections import defaultdict, deque

from fastapi import HTTPException


class Limitador:
    def __init__(self, maximo: int = 20, janela_s: float = 600.0, relogio=time.monotonic):
        self.maximo, self.janela_s, self.relogio = maximo, janela_s, relogio
        self.eventos: dict[str, deque[float]] = defaultdict(deque)

    def verificar(self, cliente_id: str) -> None:
        agora = self.relogio()
        ev = self.eventos[cliente_id]
        while ev and ev[0] <= agora - self.janela_s:
            ev.popleft()
        if len(ev) >= self.maximo:
            espera = math.ceil(ev[0] + self.janela_s - agora)
            raise HTTPException(
                status_code=429,
                detail="Demasiadas mensagens seguidas. Um colega pode ajudar se for urgente.",
                headers={"Retry-After": str(max(1, espera))},
            )
        ev.append(agora)`,
      difficulty: 2,
    },
    {
      id: 'lab-custo-escala-03',
      moduleId: 'custo-escala',
      title: 'Orçamento de tokens por conversa',
      brief:
        'Antes de cada chamada ao modelo, verifica se a conversa ainda cabe no orçamento (40 000 tokens de entrada acumulados, ≈ 7 turnos típicos). Se não couber, a conversa é escalada em vez de chamar o modelo. Usa `balcao.estimar_tokens` para estimar a entrada.',
      lang: 'python',
      executavel: true,
      starter: `import balcao as b

ORCAMENTO = 40_000


def pode_chamar(gasto: int, mensagens: list[str]) -> bool:
    return True


print(pode_chamar(0, ["Olá"]))`,
      checks: [
        { id: 'estimar', label: 'Estima os tokens com b.estimar_tokens', re: 'estimar_tokens\\(' },
        { id: 'compara', label: 'Compara o acumulado com o ORCAMENTO', re: '<=?\\s*ORCAMENTO|ORCAMENTO\\s*>=?' },
        { id: 'escala', label: 'Decide escalar quando passa', re: 'escalar' },
        { id: 'sempre', label: 'Não devolve sempre True', re: 'return True\\s*$', forbid: true, flags: 'm' },
      ],
      hints: [
        'Soma `b.estimar_tokens(m)` de todas as mensagens que vão no pedido.',
        'Devolve um par (decisão, gasto novo) para o chamador guardar no estado.',
      ],
      solution: `import balcao as b

ORCAMENTO = 40_000


def decidir(gasto: int, mensagens: list[str]) -> tuple[str, int]:
    pedido = sum(b.estimar_tokens(m) for m in mensagens)
    if gasto + pedido <= ORCAMENTO:
        return "chamar", gasto + pedido
    return "escalar", gasto


gasto = 0
historico = ["És o assistente do Chega. " * 200]
for turno in range(1, 16):
    historico.append("O meu pedido PD-8841990 chegou atrasado, a que tenho direito? " * 20)
    decisao, gasto = decidir(gasto, historico)
    if decisao == "escalar":
        print(f"turno {turno}: escalar para humano (gasto {gasto} tokens)")
        break
else:
    print(f"coube no orçamento: {gasto} tokens")`,
      difficulty: 2,
    },
  ],

  /* ================================================================ casos de uso */
  useCases: [
    {
      id: 'uc-custo-escala-01',
      title: 'Assistente de uma operadora de telecomunicações em dia de avaria',
      area: 'Telecomunicações',
      level: 3,
      scenario:
        'Uma operadora móvel em Moçambique tem um assistente de texto (app e WhatsApp) para saldo, pacotes de dados e avarias: ≈ 40 000 conversas por dia, mas numa avaria de rede sobem para 15× numa hora, todas a perguntar o mesmo. O orçamento de modelo é fixo por mês e o fornecedor tem uma quota contratada.',
      requirements: [
        'Custo médio abaixo de 0,50 MZN por conversa no mês.',
        'Em dia de avaria, nenhuma conversa sem resposta durante mais de 10 s.',
        'Informação de avaria sempre actual (os avisos mudam de 15 em 15 minutos).',
      ],
      constraints: [
        'Quota do fornecedor não aumenta a tempo de uma avaria.',
        'Saldo e pacotes são dados pessoais: nunca em cache partilhada.',
      ],
      approach: [
        { title: 'Separar o que se repete do que é pessoal', text: 'Perguntas sobre a avaria têm a mesma resposta para toda a zona: uma cache semântica curta (TTL de 15 minutos, invalidada a cada aviso novo) serve-as sem modelo. Saldo e pacotes vão sempre por ferramenta e template, sem modelo quando a intenção é clara.' },
        { title: 'Routing por intenção', text: 'Modelo pequeno para classificar e para respostas de template; médio só para conversas abertas. Em dia normal, ≈ 70% dos turnos não chegam ao médio.' },
        { title: 'Modo avaria', text: 'Quando os avisos de avaria disparam, a API activa o nível 2: banner com a mensagem oficial, cache semântica ligada, limite de concorrência apertado e respostas de espera honestas acima de 10 s.' },
        { title: 'Prompt caching', text: 'Prefixo estável de sistema e esquemas; a taxa de acerto é alta precisamente nos picos, quando mais importa.' },
      ],
      diagram: {
        title: 'O caminho de uma pergunta em dia de avaria',
        cols: 5,
        rows: 2,
        nodes: [
          { id: 'cli', label: 'Cliente', col: 0, row: 0, kind: 'user' },
          { id: 'cls', label: 'Classificar', sub: 'modelo pequeno', col: 1, row: 0, kind: 'model' },
          { id: 'cache', label: 'Cache semântica', sub: 'TTL 15 min', col: 2, row: 0, kind: 'data' },
          { id: 'avisos', label: 'API de avisos', col: 2, row: 1, kind: 'external' },
          { id: 'tpl', label: 'Template + ferramenta', sub: 'saldo, pacotes', col: 3, row: 1, kind: 'tool' },
          { id: 'medio', label: 'Modelo médio', sub: 'semáforo', col: 3, row: 0, kind: 'model' },
          { id: 'hum', label: 'Humano', col: 4, row: 0, kind: 'user' },
        ],
        edges: [
          { from: 'cli', to: 'cls' },
          { from: 'cls', to: 'cache', label: 'avaria' },
          { from: 'avisos', to: 'cache', label: 'invalida', style: 'dashed' },
          { from: 'cls', to: 'tpl', label: 'saldo' },
          { from: 'cache', to: 'medio', label: 'falha' },
          { from: 'medio', to: 'hum', label: 'fila cheia', style: 'dashed' },
        ],
      },
      solution:
        'O pico de avaria é quase todo a mesma pergunta: uma cache curta invalidada por evento absorve-o sem tocar na quota. O que é pessoal nunca passa pela cache; o que é aberto passa pelo médio com backpressure.',
      tools: [
        { name: 'Cache semântica (Redis)', role: 'Respostas de avaria por zona, TTL e invalidação por evento' },
        { name: 'Modelo pequeno', role: 'Classificação e respostas de template' },
        { name: 'Semáforo + limitador local', role: 'Concorrência dentro da quota' },
        { name: 'Prometheus', role: 'Custo por conversa, taxa de acerto das caches, fila' },
      ],
      rejected: [
        { option: 'Pedir quota 15× maior permanentemente', why: 'Paga-se o ano inteiro por uma hora por mês.' },
        { option: 'Cache semântica para tudo', why: 'Saldo e pacotes são pessoais: um falso acerto é uma fuga de dados.' },
        { option: 'Fila sem limite', why: 'Clientes à espera 5 minutos sem saber porquê voltam a escrever e duplicam a carga.' },
      ],
      costNote: 'Com ≈ 70% dos turnos resolvidos por template ou pelo pequeno e 60% de cache no médio, o custo médio fica bem abaixo de 0,50 MZN; em dia de avaria, a cache semântica faz o custo por conversa descer, não subir.',
      takeaways: [
        'Picos em sistemas de suporte costumam ser a mesma pergunta repetida: é aí que a cache semântica compensa.',
        'Dados pessoais e dinheiro nunca passam por caches partilhadas.',
        'A degradação decide-se antes do incidente, com níveis e sinais.',
      ],
      refs: [
        { label: 'Redis — RedisVL', url: 'https://redis.io/docs/latest/develop/ai/redisvl/' },
        { label: 'Google SRE Book — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/' },
      ],
    },
  ],
};
