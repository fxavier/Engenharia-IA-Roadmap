import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'custo-latencia',
  numero: 27,
  bloco: 'producao',
  titulo: 'Custo, latência e escala',
  resumo:
    'Quanto custa uma conversa e porquê, as alavancas que o baixam (prompt caching, cache semântica, routing, contexto e saída mais curtos) e o que custam em qualidade, onde vão os milissegundos de um turno, e como aguentar rate limits, picos e falhas do fornecedor sem cair. É o tópico onde se vê se o candidato já pagou uma factura.',
  icon: '💸',
  modulos: ['custo-escala', 'observabilidade-llmops', 'escolher-modelo'],
  essencial: [
    'Custo por conversa = Σ chamadas × (tokens de entrada × preço de entrada + tokens de saída × preço de saída), com a entrada partida em lida da cache, escrita na cache e não cacheada.',
    'Optimiza tokens × chamadas antes de optimizar o preço: o histórico que cresce a cada turno e as chamadas extra do agente pesam mais do que trocar de fornecedor.',
    'Prompt caching é por prefixo exacto: estável primeiro (ferramentas, sistema, documentos fixos), variável no fim. Um timestamp no sistema deita a cache fora.',
    'Ordem de grandeza (out. 2026, Anthropic): leitura da cache ≈ 0,1× do preço de entrada, escrita ≈ 1,25× (TTL de 5 min, renovado em cada acerto); varia por modelo.',
    'Na API da Anthropic, `input_tokens` é só o que vem depois do último breakpoint; o total é `cache_read_input_tokens + cache_creation_input_tokens + input_tokens`.',
    'A saída custa tipicamente 4–5× a entrada por token e domina a latência: o tempo de um turno ≈ TTFT + tokens de saída ÷ velocidade de geração.',
    'Cache semântica troca custo por um novo tipo de erro (resposta certa para a pergunta parecida errada); nunca para respostas que dependem do utilizador ou de estado.',
    'Lei de Little: pedidos em curso = taxa de chegada × duração. 190 conversas/h com turnos de 6 s não é carga; um agente com 8 chamadas de 15 s numa rajada já pode ser.',
    'Um 429 é um sinal para abrandar: respeita `retry-after`, recua com jitter, limita a concorrência do teu lado e põe uma fila com tamanho máximo à frente.',
    'Degradar é planeado por níveis (modelo mais pequeno, sem re-ranker, respostas de template, fila honesta) e anunciado; nunca é responder pior em silêncio.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-custo-latencia-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quanto custa uma conversa e quanto custa por mês',
      enunciado:
        'Um operador de telecomunicações quer um assistente de suporte com 20 000 conversas por dia. Antes de escolher o modelo, o director pede-te uma estimativa do custo mensal. Como fazes a conta no quadro?',
      minutos: 6,
      dica: 'Uma conversa não é uma chamada, e a entrada da quarta chamada não é igual à da primeira.',
      resposta: [
        {
          type: 'p',
          text: 'Escrevo a fórmula por chamada e somo sobre as chamadas da conversa: **custo = Σ (entrada × preço de entrada + saída × preço de saída)**, com a entrada partida em prefixo cacheado e parte variável. Depois multiplico por conversas/dia × 30. O resultado é uma ordem de grandeza com os pressupostos à vista, não um número.',
        },
        {
          type: 'p',
          text: 'Os factores que mudam o resultado: **turnos por conversa** (3–6 em suporte), **chamadas por turno** (classificar e responder são 2; um agente com ferramentas chega a 4–8), o **prefixo fixo** (sistema e esquemas de ferramentas, 2–5 mil tokens), a **parte variável** (chunks recuperados mais o histórico, que cresce a cada turno) e a **saída**, que custa 4–5× mais por token. Com cache de prompt, o prefixo paga cerca de 0,1× quando acerta e cerca de 1,25× quando é escrito.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Preços hipotéticos do escalão médio (1 USD/M entrada, 5 USD/M saída); só servem para a ordem de grandeza',
          code: `def custo_conversa(turnos, chamadas_por_turno, prefixo, dinamico, hist_por_turno,
                   saida, p_in, p_out, acerto_cache):
    """Custo em USD de uma conversa; preços em USD por milhão de tokens."""
    # prefixo em cache: leitura a 0,1x; escrita (falha) a 1,25x do preço de entrada
    fator_prefixo = acerto_cache * 0.10 + (1 - acerto_cache) * 1.25
    total = 0.0
    for t in range(turnos):
        variavel = dinamico + t * hist_por_turno   # o histórico cresce a cada turno
        for _ in range(chamadas_por_turno):
            entrada = prefixo * fator_prefixo + variavel
            total += entrada * p_in + saida * p_out
    return total / 1_000_000

args = dict(turnos=4, chamadas_por_turno=2, prefixo=3000, dinamico=1500,
            hist_por_turno=400, saida=250, p_in=1.0, p_out=5.0)
sem = custo_conversa(**args, acerto_cache=0.0)
com = custo_conversa(**args, acerto_cache=0.8)
print(f"sem cache: {sem:.4f} USD   com 80% de acertos: {com:.4f} USD")
print(f"por mês, 20 000 conversas/dia: {sem*20_000*30:,.0f} vs {com*20_000*30:,.0f} USD")
# sem cache: 0.0568 USD   com 80% de acertos: 0.0347 USD
# por mês, 20 000 conversas/dia: 34,080 vs 20,832 USD`,
        },
        {
          type: 'p',
          text: 'Leio o resultado em voz alta: ~5 cêntimos por conversa, **dezenas de milhares de USD por mês**, e a cache tira quase 40%. Repara que a saída (8 × 250 tokens) é perto de um quinto do custo apesar de ser um décimo dos tokens. Dou também a sensibilidade: duplicar as chamadas por turno duplica a conta; trocar para o escalão grande multiplica por ~3. Por isso pergunto logo quantas chamadas faz o fluxo.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Uma chamada vezes conversas',
          text: 'Multiplicar o custo de uma chamada pelo número de conversas subestima 5–10×: esquece os turnos, as chamadas de classificação e de ferramentas, os retries e o histórico. Em produção a conta faz-se a partir de `usage` real por conversa, não da fórmula.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — preços e unidades de facturação', url: 'https://www.anthropic.com/pricing' },
            { label: 'Anthropic — contagem de tokens', url: 'https://docs.anthropic.com/en/docs/build-with-claude/token-counting' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve a fórmula por chamada e soma sobre turnos e chamadas por turno, não multiplica uma chamada por conversas.',
          'Separa entrada de saída e diz que a saída custa várias vezes mais por token.',
          'Inclui o crescimento do histórico e o efeito da cache de prompt no prefixo.',
          'Apresenta o resultado como ordem de grandeza com pressupostos e sensibilidade.',
        ],
        fraco: 'Dá um número mensal a partir de «uma chamada de 1000 tokens» sem turnos, sem histórico e sem separar entrada de saída.',
        solido: 'Monta a fórmula com turnos, chamadas por turno, prefixo e histórico, chega à ordem de grandeza e mostra o efeito da cache.',
        excelente: 'Acrescenta a análise de sensibilidade (que variável mexe mais na conta), propõe medir `usage` real numa semana de piloto e liga o número a um orçamento por conversa com alarme.',
      },
      seguimento: [
        'Que variável da fórmula pedirias ao produto para fixar primeiro?',
        'Como mudaria a conta se o fluxo passasse a ser um agente com quatro ferramentas?',
        'Como confirmas a estimativa depois do lançamento?',
      ],
      sinaisAlarme: [
        'Ignorar a saída ou tratá-la ao mesmo preço da entrada.',
        'Dar um preço exacto de memória como se fosse estável.',
        'Não perguntar quantas chamadas ao modelo há por turno.',
      ],
      modulos: ['custo-escala', 'apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-custo-latencia-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Estruturar o prompt para a cache acertar',
      enunciado:
        'Ligaste o prompt caching e a taxa de acerto está nos 15%. Explica como funciona a cache de prompt e como reorganizas o pedido para a subir.',
      minutos: 5,
      dica: 'A cache é de prefixo. O que é que muda de pedido para pedido, e onde está?',
      resposta: [
        {
          type: 'p',
          text: 'A cache de prompt guarda o estado calculado de um **prefixo exacto** do pedido; o pedido seguinte só acerta se começar pelos mesmos bytes. Uma taxa de 15% quase sempre quer dizer que há algo variável cedo no prompt. A regra é: **estável primeiro, variável no fim**.',
        },
        {
          type: 'p',
          text: 'Na API da Anthropic a ordem é ferramentas, depois sistema, depois mensagens, e uma alteração num nível invalida esse nível e todos os seguintes. Marco até 4 breakpoints com `cache_control`; a escrita custa cerca de 1,25× a entrada normal (TTL de 5 minutos, renovado a cada acerto, com opção de 1 hora mais cara) e a leitura cerca de 0,1×. Há um mínimo de tokens cacheáveis que depende do modelo (centenas a alguns milhares). Noutros fornecedores a cache é automática acima de um limiar, mas o princípio do prefixo é o mesmo.',
        },
        {
          type: 'table',
          head: ['Camada', 'Conteúdo', 'Muda quando'],
          rows: [
            ['1 · Ferramentas', 'Esquemas em ordem fixa e serialização determinística', 'Deploy'],
            ['2 · Sistema', 'Instruções, políticas fixas, exemplos', 'Deploy ou nova versão de prompt'],
            ['3 · Contexto partilhado', 'Documentos comuns a muitos pedidos (catálogo, FAQ)', 'Ingestão'],
            ['4 · Conversa', 'Histórico até ao turno anterior (breakpoint móvel)', 'Cada turno'],
            ['5 · Fim', 'Data, nome do cliente, chunks desta pergunta, mensagem nova', 'Cada pedido'],
          ],
        },
        {
          type: 'p',
          text: 'O que procuro quando a taxa está baixa: a data/hora ou o nome do utilizador no sistema; esquemas de ferramentas gerados a partir de um dicionário ou conjunto com ordem não garantida; feature flags que mudam o texto do sistema por utilizador; chunks recuperados metidos *antes* das instruções; e tráfego tão espaçado que a entrada expira entre pedidos. Verifico com os campos `cache_read_input_tokens` e `cache_creation_input_tokens` de cada resposta, agregados por versão de prompt.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Pagar a escrita sem colher a leitura',
          text: 'Um prefixo que nunca se repete dentro do TTL só custa mais (1,25× em vez de 1×). Em tráfego baixo ou com muitas variantes de prompt, medir antes de ligar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
            { label: 'OpenAI — prompt caching', url: 'https://platform.openai.com/docs/guides/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que a cache é por prefixo exacto e que qualquer byte diferente invalida o resto.',
          'Propõe a ordem estável primeiro, variável no fim, com exemplos concretos do que é variável.',
          'Dá a ordem de grandeza do custo de escrita e de leitura e o efeito do TTL.',
          'Diz como mede o acerto (campos de usage por versão de prompt).',
        ],
        fraco: '«Liga-se a cache e fica mais barato», sem saber que é de prefixo nem porque é que acerta pouco.',
        solido: 'Reordena o prompt, remove o timestamp do sistema, fixa a ordem das ferramentas e mede o acerto com os campos de usage.',
        excelente: 'Acrescenta o breakpoint móvel no histórico, o custo de escrever sem ler em tráfego baixo, o mínimo cacheável por modelo, e liga versões de prompt a quedas de acerto no painel.',
      },
      seguimento: [
        'Onde pões a data de hoje se o modelo precisa dela?',
        'Vale a pena o TTL de 1 hora? Que tráfego o justifica?',
        'A cache muda a latência ou só o custo?',
      ],
      sinaisAlarme: [
        'Achar que a cache guarda respostas e não prefixos calculados.',
        'Personalizar o prompt de sistema por utilizador e esperar acertos.',
        'Não saber onde ver se a cache acertou.',
      ],
      modulos: ['custo-escala', 'prompt-engineering'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-custo-latencia-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Cache semântica: quanto poupa e o que parte',
      enunciado:
        'O teu colega propõe uma cache semântica: se a pergunta nova tiver cosseno acima de 0,92 com uma já respondida, devolve-se a resposta guardada. Defendes ou não? Em que condições?',
      minutos: 7,
      dica: '«Qual é o saldo da minha conta?» feita por dois clientes diferentes.',
      resposta: [
        {
          type: 'p',
          text: 'Defendo só para uma fatia estreita: **perguntas cuja resposta não depende de quem pergunta nem do estado do momento**, com limiar validado e invalidação explícita. Fora disso, a cache semântica troca custo por um erro novo — a resposta certa para outra pergunta — e esse erro é silencioso.',
        },
        {
          type: 'p',
          text: 'O mecanismo: embedding da pergunta, pesquisa do vizinho mais próximo numa base de pares pergunta-resposta, e se a similaridade passar o limiar, devolve-se sem modelo. Poupa a chamada inteira e corta a latência para dezenas de ms. Mas o embedding mede proximidade de tema, não equivalência de pergunta: «posso cancelar antes de o restaurante aceitar?» e «posso cancelar depois de o restaurante aceitar?» ficam quase coladas no espaço vectorial e têm respostas opostas.',
        },
        {
          type: 'compare',
          left: {
            title: 'Onde ajuda',
            items: [
              'FAQ e informação geral (horários, como funciona, cobertura)',
              'Picos com uma pergunta dominante (avaria na zona, campanha)',
              'Respostas sem dados pessoais e sem tool calling',
              'Conteúdo que muda pouco e tem dono para invalidar',
            ],
          },
          right: {
            title: 'Onde parte',
            items: [
              'Respostas que dependem do utilizador (saldo, pedido, apólice)',
              'Negações e quantificadores que o embedding quase ignora',
              'Políticas que mudam: a resposta guardada fica obsoleta',
              'Multi-tenant: fuga de uma resposta de um cliente para outro',
            ],
          },
        },
        {
          type: 'p',
          text: 'Se avançar: a chave inclui tenant, idioma e versão da base de conhecimento; a cache só entra depois do classificador de intenção dizer «informativa»; o limiar escolhe-se num conjunto de pares anotados (mesma resposta / resposta diferente) olhando para a taxa de falsos acertos, não para a taxa de acertos; TTL curto e purga quando um documento muda. Meço a poupança real — em suporte a taxa de acerto útil costuma ser modesta, e com prompt caching já ligado a chamada evitada é mais barata do que parece.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Optimizar a taxa de acerto',
          text: 'Baixar o limiar sobe a taxa de acerto e a poupança no painel, e sobe também as respostas erradas, que ninguém vê no painel. A métrica que governa é a precisão dos acertos medida por amostragem.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Redis — RedisVL (inclui cache semântica)', url: 'https://redis.io/docs/latest/develop/ai/redisvl/' },
            { label: 'Anthropic — prompt caching (a alternativa sem risco de resposta errada)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue proximidade semântica de equivalência de resposta, com um exemplo de par próximo com respostas diferentes.',
          'Exclui respostas personalizadas ou dependentes de estado e trata o isolamento entre tenants.',
          'Propõe escolher o limiar por falsos acertos num conjunto anotado.',
          'Fala de invalidação (TTL, versão da base, purga) e compara com prompt caching.',
        ],
        fraco: 'Aceita a cache porque «poupa chamadas» e escolhe o limiar a olho.',
        solido: 'Restringe a perguntas informativas, inclui tenant e versão na chave, valida o limiar e define TTL.',
        excelente: 'Quantifica a poupança contra o custo já reduzido pelo prompt caching, governa por precisão dos acertos com amostragem contínua e define quem invalida quando a política muda.',
      },
      seguimento: [
        'Como montarias o conjunto para escolher o limiar?',
        'O que fazes quando uma política muda e há 3000 respostas em cache que a citam?',
        'Cache exacta (hash da pergunta normalizada) não resolve metade disto?',
      ],
      sinaisAlarme: [
        'Cachear respostas que incluem dados de um cliente.',
        'Escolher 0,92 porque «é alto».',
        'Medir a cache só pela taxa de acerto.',
      ],
      modulos: ['custo-escala', 'embeddings'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-custo-latencia-04',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Routing por custo e cascatas de modelos',
      enunciado:
        'Usas o modelo grande para tudo. Alguém sugere um router que manda as perguntas fáceis para o modelo pequeno, ou uma cascata que tenta o pequeno e sobe se ele não tiver confiança. Como decides entre as duas e como provas que não perdeste qualidade?',
      minutos: 8,
      dica: 'Numa cascata, quem decide que a resposta do pequeno é má, e quanto custa essa decisão?',
      resposta: [
        {
          type: 'p',
          text: 'Router decide **antes** de gerar (uma chamada por pedido, latência previsível); cascata decide **depois** (paga o pequeno sempre e, nos difíceis, paga os dois e o tempo dos dois). Escolho router quando a dificuldade se prevê pela entrada — intenção, comprimento, presença de ferramentas — e cascata quando só se vê pela saída e a taxa de subida é baixa. Em ambos os casos só ligo depois de medir por intenção num conjunto avaliado.',
        },
        {
          type: 'table',
          head: ['', 'Router', 'Cascata'],
          rows: [
            ['Custo por pedido difícil', 'Grande', 'Pequeno + verificação + grande'],
            ['Latência', 'Uma geração', 'Até duas gerações em série'],
            ['Sinal de decisão', 'Entrada (intenção, features)', 'Saída (verificador, auto-avaliação, regras)'],
            ['Modo de falha', 'Pergunta difícil classificada como fácil', 'Verificador confiante numa resposta errada'],
            ['Funciona bem quando', 'Intenções com dificuldade estável', 'Maioria fácil e verificação barata e fiável'],
          ],
        },
        {
          type: 'p',
          text: 'A conta da cascata: custo esperado = C_pequeno + C_verificação + taxa_subida × C_grande. Com o pequeno a ~1/10 do grande e 25% de subidas, fica perto de 0,1 + 0,25 = 0,35 do original mais a verificação. Se a taxa de subida for 60%, já pagas quase o mesmo com mais latência. O verificador é o ponto fraco: a auto-confiança verbalizada do modelo é mal calibrada; prefiro verificações estruturais (JSON válido, citações que existem, chamada de ferramenta com argumentos válidos) ou um classificador treinado com rótulos reais. O FrugalGPT e o RouteLLM mostram reduções grandes em benchmarks públicos; no meu domínio trato isso como hipótese.',
        },
        {
          type: 'p',
          text: 'Como provo: conjunto dourado estratificado por intenção; corro grande, pequeno e o sistema com router; aceito se nenhuma intenção crítica descer mais do que o intervalo de confiança e o custo médio cair o previsto. Em produção, shadow traffic primeiro, depois canary com métricas por rota (taxa de escalamento para humano, repetição da pergunta, satisfação) e um painel com a fracção que vai para cada modelo — se a fracção «fácil» deriva, o router está a errar ou o tráfego mudou.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que um staff acrescenta',
          text: 'Router e cascata não são exclusivos: o router manda o óbvio para o pequeno e o óbvio para o grande, e a cascata só trata a faixa do meio. E o router tem dono, conjunto e alarme, como qualquer modelo em produção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Chen, Zaharia e Zou (2023) — FrugalGPT', url: 'https://arxiv.org/abs/2305.05176' },
            { label: 'Ong et al. (2024) — RouteLLM: Learning to Route LLMs with Preference Data', url: 'https://arxiv.org/abs/2406.18665' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue router (decide pela entrada) de cascata (decide pela saída) e as consequências em custo e latência.',
          'Escreve o custo esperado da cascata em função da taxa de subida.',
          'Desconfia da auto-confiança do modelo como verificador e propõe verificações estruturais ou classificador.',
          'Valida por intenção num conjunto avaliado e lança com shadow e canary.',
          'Monitoriza a distribuição de rotas em produção.',
        ],
        fraco: '«Manda as fáceis para o pequeno», sem dizer quem decide o que é fácil nem como se mede.',
        solido: 'Compara as duas abordagens com custo esperado, escolhe pelo sinal disponível e valida por intenção antes do canary.',
        excelente: 'Combina router e cascata, trata o verificador como o ponto fraco, quantifica o ponto em que a cascata deixa de compensar e põe o router sob governança (dono, alarme de deriva).',
      },
      seguimento: [
        'Como treinavas o router sem rótulos de dificuldade?',
        'Que intenções nunca deixavas ir para o modelo pequeno?',
        'E se o fornecedor do modelo pequeno tiver outro rate limit e cair?',
      ],
      sinaisAlarme: [
        'Usar «tens a certeza? responde de 0 a 10» como único critério de subida.',
        'Avaliar só a média global, sem estratificar por intenção.',
        'Ignorar a latência acrescida da cascata.',
      ],
      modulos: ['custo-escala', 'escolher-modelo', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-custo-latencia-05',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque não pôr tudo numa janela de 1M tokens',
      enunciado:
        'O modelo aceita um milhão de tokens. Porque não metemos a base de conhecimento inteira e o histórico todo em cada pedido e deixamos de nos preocupar com RAG e com resumos? E já agora, porque limitas a saída?',
      minutos: 5,
      dica: 'Faz as contas a três coisas: preço, tempo até ao primeiro token, e onde o modelo presta atenção.',
      resposta: [
        {
          type: 'p',
          text: 'Porque pagas e esperas por cada token em cada chamada, e mais contexto não quer dizer melhor resposta. Contexto e saída são as duas maiores alavancas de custo e latência que controlo directamente, e ambas se limitam por orçamento explícito.',
        },
        {
          type: 'list',
          items: [
            '**Custo:** 500 mil tokens de entrada por chamada é centenas de vezes o custo de 3 mil; mesmo com cache a 0,1× o prefixo continua a ser o termo dominante, e a cache só ajuda enquanto não expirar.',
            '**Latência:** o pré-processamento (prefill) cresce com o contexto; o tempo até ao primeiro token sobe de centenas de ms para vários segundos.',
            '**Qualidade:** a recuperação de informação no meio de contextos longos é pior do que no início e no fim; ruído irrelevante distrai e aumenta respostas que citam a política errada.',
            '**Governação:** sem selecção não sabes que documento sustentou a resposta, e não podes filtrar por permissões do utilizador.',
          ],
        },
        {
          type: 'p',
          text: 'Para comprimir contexto: histórico com janela dos últimos N turnos mais um resumo dos anteriores (gerado pelo modelo pequeno); RAG com k pequeno e re-ranking; resultados de ferramentas reduzidos aos campos que a resposta usa (um JSON de encomenda com 80 campos vira 6). Compressão automática de prompts, como o LLMLingua, existe, mas parte a cache de prefixo e precisa de avaliação.',
        },
        {
          type: 'p',
          text: 'Para a saída: `max_tokens` como tecto de segurança (não como estilo — corta a meio da frase), instruções de formato e comprimento, saída estruturada quando o consumidor é código, e exemplos curtos no prompt. Como a saída custa várias vezes a entrada por token e é gerada em série, 150 tokens a menos por turno valem mais do que 150 de contexto.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '`max_tokens` baixo como forma de poupar',
          text: 'Uma resposta truncada (`stop_reason` = `max_tokens`) é uma resposta errada e muitas vezes gera um novo turno. Mede a fracção de truncadas e controla o comprimento pelo prompt e pelo formato.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Jiang et al. (2023) — LLMLingua: Compressing Prompts for Accelerated Inference', url: 'https://arxiv.org/abs/2310.05736' },
            { label: 'Anthropic — reduzir latência', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Quantifica que o custo e o TTFT crescem com o contexto em cada chamada.',
          'Diz que contextos longos degradam a recuperação de informação (lost in the middle) e trazem ruído.',
          'Propõe técnicas concretas de compressão: janela + resumo, k pequeno com re-ranking, podar resultados de ferramentas.',
          'Explica que a saída é mais cara e mais lenta por token e como a limitar sem truncar.',
        ],
        fraco: '«Funciona, mas é caro», sem números nem qualidade, e baixa o `max_tokens` para poupar.',
        solido: 'Explica custo, latência e degradação no meio do contexto, propõe janela com resumo e poda de ferramentas, e limita a saída pelo formato.',
        excelente: 'Acrescenta o efeito na cache de prefixo das técnicas de compressão, as permissões por documento como razão para selecção, e mede truncagens e comprimento de saída por intenção.',
      },
      seguimento: [
        'Quando é que meter um documento inteiro no contexto é a escolha certa?',
        'Como avalias se o resumo do histórico perdeu informação importante?',
        'Que fracção de truncagens aceitas?',
      ],
      sinaisAlarme: [
        '«Com janelas grandes o RAG morreu.»',
        'Tratar `max_tokens` como forma de controlar o estilo.',
        'Não distinguir preço de entrada de preço de saída.',
      ],
      modulos: ['custo-escala', 'prompt-engineering', 'memoria'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-custo-latencia-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Onde vão os milissegundos de um turno e o que o streaming muda',
      enunciado:
        'O p95 de um turno do teu assistente é 9 segundos e o produto quer 4. Decompõe o tempo de um turno no quadro e diz onde atacavas. O streaming resolve?',
      minutos: 6,
      dica: 'Separa o tempo até ao primeiro token do tempo de geração, e o que corre em série do que podia correr em paralelo.',
      resposta: [
        {
          type: 'p',
          text: 'Um turno é uma soma de etapas em série, e a geração quase sempre domina: **tempo ≈ rede + pré-processamento + Σ (TTFT_i + saída_i ÷ velocidade_i) + ferramentas em série**. O streaming baixa a latência *percebida* (o utilizador vê texto em menos de 1 s) mas não muda o tempo total nem o custo; para os 4 s reais tenho de cortar chamadas em série e tokens de saída.',
        },
        {
          type: 'table',
          head: ['Etapa', 'Ordem de grandeza', 'Alavanca'],
          rows: [
            ['Classificação (modelo pequeno, saída curta)', '0,3–0,8 s', 'Paralelizar com o retrieval; regras para o óbvio'],
            ['Embedding + pesquisa vectorial + BM25', '50–200 ms', 'Índice quente, filtros no índice'],
            ['Re-ranking com cross-encoder', '50–300 ms', 'Menos candidatos, só onde paga'],
            ['Chamada de ferramenta (API interna)', '100 ms–2 s', 'Timeouts, cache, paralelo quando independentes'],
            ['TTFT do modelo principal', '0,3–2 s', 'Prompt mais curto, cache de prefixo, região próxima'],
            ['Geração (300 tokens a dezenas de tokens/s)', '3–8 s', 'Menos tokens, modelo mais rápido'],
          ],
        },
        {
          type: 'p',
          text: 'Antes de opinar, abro traços do p95, não da média: o p95 costuma ser um agente que fez três voltas de ferramentas, ou uma ferramenta lenta, ou um retry após 429. Depois ataco por ordem: correr classificação e retrieval em paralelo; reduzir voltas do agente (ferramentas que devolvem o que é preciso de uma vez); cortar a saída (300 → 150 tokens poupa segundos); e só então trocar de modelo.',
        },
        {
          type: 'p',
          text: 'Streaming bem feito: enviar tokens por SSE desde o primeiro, mostrar estado durante as ferramentas («a consultar o pedido…»), e tratar o erro a meio do stream — a API pode mandar um evento `error` (por exemplo sobrecarga) depois de o utilizador já ter lido metade. Guardrails de saída ficam mais difíceis: ou valido por frase, ou aceito que só valido no fim e preparo a retracção.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Medir a média',
          text: 'Uma média de 3 s com p95 de 9 s é um produto lento para um em cada vinte utilizadores. O SLO escreve-se em percentis e separa TTFT de tempo total.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — reduzir latência', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency' },
            { label: 'Anthropic — streaming de mensagens', url: 'https://platform.claude.com/docs/en/build-with-claude/streaming' },
            { label: 'MDN — Server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Decompõe o turno em etapas com ordem de grandeza e identifica a geração como termo dominante.',
          'Distingue TTFT, tempo total e latência percebida, e diz que o streaming só muda a percebida.',
          'Propõe olhar para traços do p95 antes de mudar algo.',
          'Dá alavancas concretas: paralelizar, reduzir voltas do agente, cortar saída.',
          'Menciona erros a meio do stream ou o impacto nos guardrails de saída.',
        ],
        fraco: '«Usa streaming e um modelo mais rápido», sem decompor o tempo.',
        solido: 'Decompõe o turno, olha para o p95 em traços, paraleliza e corta saída, e usa streaming para a percebida.',
        excelente: 'Acrescenta o tratamento de erros e guardrails em streaming, separa SLO de TTFT e de tempo total, e mostra que as voltas do agente são o p95.',
      },
      seguimento: [
        'Como mostras progresso ao utilizador durante uma chamada de ferramenta de 2 s?',
        'Como validas a saída contra PII se ela já está a ser enviada?',
        'Quando é que vale a pena self-hosting por causa da latência?',
      ],
      sinaisAlarme: [
        'Dizer que o streaming torna o modelo mais rápido.',
        'Optimizar o embedding (50 ms) antes da geração (5 s).',
        'Não saber o p95, só a média.',
      ],
      modulos: ['custo-escala', 'fastapi-servico', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-custo-latencia-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Rate limits do fornecedor, filas e backpressure',
      enunciado:
        'Sexta à noite, o tráfego triplica e começas a receber 429 do fornecedor. Os pods escalam, os 429 pioram. Explica porquê e como desenhas o lado cliente.',
      minutos: 6,
      dica: 'Escalar os pods aumenta o quê? E os retries de todos os pods ao mesmo tempo?',
      resposta: [
        {
          type: 'p',
          text: 'O gargalo é a **quota do fornecedor**, não a tua CPU: escalar pods só aumenta quem disputa a mesma quota, e cada pod a fazer retries imediatos multiplica os pedidos. A resposta é limitar do teu lado — concorrência e tokens por minuto — com uma fila de tamanho máximo à frente e rejeição explícita quando enche.',
        },
        {
          type: 'p',
          text: 'Os fornecedores limitam em várias dimensões em simultâneo: pedidos por minuto, tokens de entrada por minuto e tokens de saída por minuto, por modelo, aplicados com balde de tokens (60 por minuto pode valer como 1 por segundo, e uma rajada de 20 em 2 s leva 429). Na Anthropic, os tokens lidos da cache não contam para o limite de entrada na maioria dos modelos — mais uma razão para a cache. O 429 pode trazer `retry-after`; respeito-o, e sem ele recuo exponencialmente com jitter e um tecto de tentativas.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Dimensionar', text: 'Lei de Little: em curso = chegada × duração. 600 turnos/min a 6 s cada são 60 em curso; com 2 chamadas e 5k tokens de entrada, são ~6M tokens/min de entrada — compara com a quota do escalão.' },
            { title: 'Limitar centralmente', text: 'Um limitador partilhado (Redis ou um gateway) com orçamento de pedidos e tokens por modelo, para que 20 pods não façam 20× retries independentes.' },
            { title: 'Fila com fim', text: 'Fila de tamanho máximo e tempo máximo de espera; acima disso, 429 ou 503 para o cliente com `Retry-After` e uma mensagem honesta. Uma fila sem fim só transforma 429 em timeouts.' },
            { title: 'Prioridades', text: 'Conversas em curso antes de novas; tráfego interactivo antes de jobs batch (que vão para a Batch API, mais barata e com quota própria).' },
          ],
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Sinais a vigiar',
          text: 'Taxa de 429 por modelo, profundidade e idade da fila, os cabeçalhos de quota restante que o fornecedor devolve, e o p95 do tempo na fila. Alarme antes de a fila encher, não depois.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — rate limits', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
            { label: 'Google SRE — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/' },
            { label: 'RFC 6585 — 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica a quota do fornecedor como gargalo e explica porque é que escalar pods piora.',
          'Nomeia as dimensões do limite (pedidos, tokens de entrada e de saída) e o balde de tokens.',
          'Respeita `retry-after` e usa backoff exponencial com jitter e tecto.',
          'Propõe limitador central e fila com tamanho máximo e rejeição explícita.',
          'Usa a lei de Little ou outra conta para dimensionar.',
        ],
        fraco: '«Põe retries» ou «pede mais quota», sem limitar do lado do cliente.',
        solido: 'Limitador partilhado, backoff com jitter a respeitar `retry-after`, fila com fim e prioridades.',
        excelente: 'Dimensiona com números (tokens por minuto no pico contra a quota), separa batch de interactivo, usa os cabeçalhos de quota restante para abrandar antes do 429 e liga a fila a degradação graciosa.',
      },
      seguimento: [
        'Como partilhas a quota entre três equipas que usam a mesma organização no fornecedor?',
        'Que mensagem vê o utilizador quando a fila enche?',
        'O que muda se o erro for 529 (sobrecarga) em vez de 429?',
      ],
      sinaisAlarme: [
        'Retries imediatos e infinitos.',
        'Fila sem limite «para não perder pedidos».',
        'Achar que o autoscaler resolve um limite externo.',
      ],
      modulos: ['custo-escala', 'apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-custo-latencia-08',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Degradação graciosa: o que cortas primeiro',
      enunciado:
        'O fornecedor principal está a responder com erros a 30% dos pedidos e não sabes por quanto tempo. Tens um modelo alternativo noutro fornecedor e um modelo local pequeno. O que desligas, por que ordem, e o que dizes ao utilizador?',
      minutos: 7,
      dica: 'Escreve os níveis antes do incidente. Que funcionalidade custa mais e vale menos?',
      resposta: [
        {
          type: 'p',
          text: 'Degrado por **níveis definidos antes do incidente**, cortando primeiro o que custa mais e vale menos, e mantendo sempre o que é seguro e honesto. O fallback de modelo é um desses níveis, não a única resposta — e só é seguro se já tiver passado no mesmo conjunto de avaliação.',
        },
        {
          type: 'table',
          head: ['Nível', 'O que muda', 'Custo para o utilizador'],
          rows: [
            ['0 — normal', 'Modelo principal, re-ranker, ferramentas, respostas longas', 'Nenhum'],
            ['1 — aliviar', 'Desliga re-ranker e sugestões, encurta saída, aperta concorrência', 'Ligeira perda de precisão'],
            ['2 — fallback', 'Modelo alternativo avaliado; acções com efeito (reembolsos) ficam para confirmação humana', 'Respostas um pouco diferentes; acções mais lentas'],
            ['3 — essencial', 'Respostas de template e FAQ por intenção (modelo pequeno ou regras), consulta de estado por ferramenta sem LLM', 'Só perguntas comuns'],
            ['4 — honesto', 'Fila com estimativa de espera ou passagem a humano', 'Espera, mas sabe porquê'],
          ],
        },
        {
          type: 'p',
          text: 'Os trade-offs que discuto: o fallback para outro fornecedor tem prompt afinado para outro modelo e outro comportamento de tool calling, por isso precisa da sua própria versão de prompt e eval — e de passar pela revisão de dados (para onde vão os dados do cliente). O modelo local pequeno é barato e sem dependência externa, mas só serve para classificar e escolher templates. As acções com efeito irreversível são o que congelo primeiro: em modo degradado prefiro «um colega confirma» a um reembolso decidido pelo modelo de recurso.',
        },
        {
          type: 'p',
          text: 'Operação: um circuit breaker por fornecedor decide a passagem de nível automaticamente (taxa de erro e latência numa janela), com histerese para não oscilar; um interruptor manual permite forçar um nível; cada resposta é marcada com o nível em que foi gerada para se poder auditar depois. E ensaio a degradação em dia calmo — um fallback nunca exercitado falha no dia em que é preciso.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Degradar em silêncio',
          text: 'Trocar para um modelo pior sem o dizer e sem o registar faz parecer que a qualidade caiu sem razão. O utilizador vê uma mensagem honesta e as métricas são partidas por nível.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE — Addressing Cascading Failures', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
            { label: 'Anthropic — erros da API (429, 529)', url: 'https://docs.anthropic.com/en/api/errors' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define níveis de degradação ordenados por custo e valor, antes do incidente.',
          'Exige que o modelo de fallback tenha prompt e eval próprios.',
          'Congela ou passa a humano as acções com efeito irreversível em modo degradado.',
          'Usa circuit breaker com histerese e marca as respostas com o nível.',
          'Comunica ao utilizador de forma honesta.',
        ],
        fraco: '«Muda para o outro fornecedor», com o mesmo prompt e sem avaliação.',
        solido: 'Níveis claros, fallback avaliado, circuit breaker automático e mensagem honesta.',
        excelente: 'Acrescenta a revisão de dados do fornecedor alternativo, o congelamento de acções irreversíveis, a marcação por nível para auditoria e os ensaios regulares.',
      },
      seguimento: [
        'Como testas o nível 3 se nunca acontece?',
        'Que métricas te dizem para voltar ao nível 0?',
        'E se o fornecedor alternativo tiver a quota dimensionada para 10% do tráfego?',
      ],
      sinaisAlarme: [
        'Fallback com o mesmo prompt «porque os modelos são parecidos».',
        'Manter acções automáticas com o modelo de recurso.',
        'Não ter decidido os níveis antes.',
      ],
      modulos: ['custo-escala', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-custo-latencia-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Cortar 60% do custo sem perder qualidade',
      enunciado:
        'A direcção quer cortar 60% da factura de modelo do assistente nos próximos dois meses, sem descer a qualidade. Apresenta um plano com números e diz como provas que a qualidade se manteve.',
      contexto:
        'SaaS B2B multi-tenant de faturação, assistente de suporte em produção há 8 meses. 40 000 conversas/dia, média de 5 turnos e 3 chamadas por turno (classificar, recuperar e reescrever a pergunta, responder), tudo no modelo do escalão grande, sem prompt caching. Prefixo de ~4 000 tokens (sistema e 9 ferramentas), RAG com k = 10 chunks de 500 tokens, histórico completo. Há um conjunto dourado de 400 conversas e traços com `usage`.',
      minutos: 18,
      dica: 'Primeiro descobre para onde vai o dinheiro. As poupanças compõem-se multiplicando, não somando.',
      resposta: [
        {
          type: 'p',
          text: 'O plano é: **medir a decomposição do custo, ordenar as alavancas por poupança/risco, ligar uma de cada vez atrás de um gate de avaliação por intenção, e lançar com canary**. Com este perfil, prompt caching, routing por intenção e contexto mais curto chegam aos 60% sem tocar no modelo das conversas difíceis.',
        },
        {
          type: 'h',
          text: 'Fase 1 — Para onde vai o dinheiro',
        },
        {
          type: 'p',
          text: 'Com os traços, parto o custo por tipo de chamada e por componente de tokens. Estimativa a confirmar: entrada por chamada ≈ 4 000 de prefixo + 5 000 de chunks + histórico médio de ~1 500 = 10 500 tokens; saída média de ~250. Por preço relativo (saída 5×), a entrada é ~90% da factura, e o classificador e a reescrita — que não precisam do modelo grande — são dois terços das chamadas.',
        },
        {
          type: 'table',
          head: ['Alavanca', 'Mecanismo', 'Poupança esperada', 'Risco para a qualidade'],
          rows: [
            ['Prompt caching', 'Prefixo estável de 4 000 tokens a ~0,1× quando acerta', '25–35% da entrada', 'Nenhum (mesmos tokens)'],
            ['Routing por tipo de chamada', 'Classificar e reescrever no modelo pequeno', '40–55% das chamadas a ~1/10 do preço', 'Baixo; valida-se com a eval do classificador'],
            ['Contexto mais curto', 'k = 10 para k = 4 com re-ranking; histórico em janela + resumo', '30–40% da entrada variável', 'Médio; exige context recall e faithfulness'],
            ['Saída', 'Formato mais curto por intenção', '10–20% da saída', 'Baixo a médio'],
            ['Batch', 'Resumos e etiquetagem offline na Batch API (≈ metade do preço)', 'Pequena aqui', 'Nenhum'],
          ],
        },
        {
          type: 'p',
          text: 'As poupanças compõem-se: se a cache tira 30%, o routing 35% do que sobra e o contexto 20% do que sobra, fica 0,70 × 0,65 × 0,80 ≈ 0,36 — **64% de corte**. Não conto com a cache semântica: num SaaS multi-tenant com perguntas sobre faturas do próprio cliente, o risco é alto e a fatia elegível pequena.',
        },
        {
          type: 'h',
          text: 'Fase 2 — Provar que a qualidade se manteve',
        },
        {
          type: 'steps',
          items: [
            { title: 'Gate offline por intenção', text: 'Os 400 dourados, estratificados por intenção; para cada alavanca, comparação pareada com a linha de base (mesmos itens), aceito se nenhuma intenção descer além do intervalo de confiança a 95% e as intenções críticas (faturação, dados fiscais) não descerem de todo.' },
            { title: 'Shadow', text: 'Uma semana com a variante a correr em paralelo em 5% do tráfego, sem responder; juiz calibrado compara as duas respostas e eu reviso uma amostra das discordâncias.' },
            { title: 'Canary', text: '5% → 25% → 100% por tenant, com métricas online: taxa de escalamento para humano, pergunta repetida no turno seguinte, avaliação do utilizador, custo por conversa. Rollback por feature flag em minutos.' },
          ],
        },
        {
          type: 'h',
          text: 'Fase 3 — Ordem e o que fica para depois',
        },
        {
          type: 'p',
          text: 'Semana 1–2: instrumentação e caching (sem risco, ganho rápido, e prova o painel). Semana 3–5: routing das chamadas auxiliares. Semana 6–8: contexto mais curto, que é a alavanca com mais risco e exige o conjunto ao nível da passagem. Fica para depois: trocar o modelo das respostas, self-hosting e fine-tuning de um modelo pequeno — cada um precisa de mais do que dois meses para ser feito com segurança. No fim, o custo por conversa passa a ter orçamento, painel diário por tenant e alarme a 120% do alvo.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Começar pelo modelo',
          text: 'Trocar o modelo das respostas para o médio parece a alavanca óbvia e é a que mais mexe na qualidade. Primeiro tira-se o desperdício (cache, chamadas auxiliares, contexto inútil); o modelo das conversas difíceis é a última coisa a tocar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
            { label: 'Anthropic — processamento em lote (Message Batches)', url: 'https://platform.claude.com/docs/en/build-with-claude/batch-processing' },
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Começa por medir a decomposição do custo (por tipo de chamada e componente de tokens) antes de propor alavancas.',
          'Apresenta alavancas com poupança estimada e risco, e compõe as poupanças multiplicando.',
          'Define um gate de qualidade por intenção, pareado com a linha de base, com intervalos de confiança.',
          'Lança com shadow e canary, métricas online e rollback por flag.',
          'Justifica o que não faz (cache semântica, troca do modelo principal) e a ordem das fases.',
        ],
        fraco: '«Muda para um modelo mais barato e liga a cache», sem números nem forma de provar a qualidade.',
        solido: 'Decompõe o custo, aplica caching, routing e contexto mais curto com estimativas, e valida com o conjunto dourado antes do canary.',
        excelente: 'Compõe as poupanças com aritmética explícita, avalia por intenção com comparação pareada e intervalos, usa shadow antes do canary, exclui a cache semântica pelo risco multi-tenant e deixa um orçamento por conversa com alarme.',
      },
      seguimento: [
        'O routing passou no offline e no canary a taxa de escalamento subiu 2 pontos. O que fazes?',
        'Como partilhas o custo pelos tenants para a facturação interna?',
        'E se a direcção pedir 80%?',
      ],
      sinaisAlarme: [
        'Prometer 60% sem saber para onde vai o dinheiro hoje.',
        'Somar percentagens de poupança.',
        'Medir a qualidade só pela média global no fim.',
      ],
      modulos: ['custo-escala', 'avaliacao-fundamentos', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-custo-latencia-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O custo diário triplicou e o tráfego não mexeu',
      enunciado:
        'Segunda de manhã, o painel mostra que o custo de modelo de domingo foi 3× o de um domingo normal. O número de conversas foi o mesmo. Como investigas?',
      contexto:
        'Farmácia online com assistente de encomendas e dúvidas de medicamentos (RAG + 4 ferramentas). ~6 000 conversas/dia, custo habitual na ordem das centenas de USD/dia. Na sexta à tarde houve um deploy («nova ferramenta de verificação de receitas» e «limpeza do prompt de sistema»). Traços com `usage` por chamada e versão de prompt em cada traço.',
      minutos: 12,
      dica: 'Custo = conversas × chamadas por conversa × tokens por chamada × preço. Qual destes factores triplicou?',
      resposta: [
        {
          type: 'p',
          text: 'Decomponho o custo nos seus factores e comparo domingo com o domingo anterior: **conversas × chamadas/conversa × tokens/chamada (lidos da cache, escritos, não cacheados, saída) × preço**. As conversas não mexeram, por isso é um dos outros — e com um deploy na sexta que mexeu no prompt e acrescentou uma ferramenta, as duas primeiras hipóteses são a cache e o ciclo do agente.',
        },
        {
          type: 'steps',
          items: [
            { title: 'H1 — a cache deixou de acertar', text: 'Agrego `cache_read_input_tokens` e `cache_creation_input_tokens` por versão de prompt. Se a leitura caiu para perto de zero e a escrita subiu, a «limpeza do prompt» meteu algo variável no prefixo (data, nome do cliente) ou a nova ferramenta é registada numa ordem não determinística. Com um prefixo grande, passar de ~90% de acertos a zero faz o prefixo custar ~6× mais (de ~0,2× para 1,25×), o que chega para triplicar a factura.' },
            { title: 'H2 — mais chamadas por conversa', text: 'Distribuição de chamadas por conversa antes e depois. Se a nova ferramenta falha (erro, timeout, esquema que o modelo preenche mal), o agente tenta outra vez até ao limite de iterações; cada volta reenvia o contexto inteiro. Procuro conversas com 10+ chamadas e o mesmo tool_use repetido.' },
            { title: 'H3 — saída maior ou outro modelo', text: 'Tokens de saída por chamada e o campo `model` dos traços: um `max_tokens` aumentado, um alias de modelo que passou a apontar para outro, ou o routing a mandar tudo para o grande porque o classificador falha com o novo prompt.' },
            { title: 'H4 — causas fora do assistente', text: 'Um job de avaliação ou de backfill a usar a chave de produção no fim-de-semana; um punhado de utilizadores (bot, abuso) com conversas de centenas de turnos. Ordeno as conversas por custo e vejo a cauda.' },
          ],
        },
        {
          type: 'p',
          text: 'Ordem: H1 e H2 primeiro porque coincidem com o deploy e verificam-se em minutos com uma consulta aos traços; H4 a seguir porque se vê pela chave de API e pela cauda. Neste cenário, o mais provável é a combinação: a ferramenta nova falha em receitas digitalizadas e o agente repete-a, e cada repetição paga um prefixo que deixou de estar em cache.',
        },
        {
          type: 'p',
          text: 'Correcção imediata: reverter a versão de prompt (flag) e desligar a ferramenta nova; a factura de segunda confirma. Depois: corrigir a ordem das ferramentas e tirar o variável do sistema, limitar as tentativas por ferramenta (não só as iterações do agente) e devolver um erro estruturado que o modelo entenda.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Alarme horário de custo por conversa e de taxa de acerto da cache por versão de prompt (não diário); no CI, um teste que serializa o prefixo duas vezes e falha se os bytes diferirem; e no gate de evals, chamadas e tokens por conversa como métricas com limite, ao lado da qualidade.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — prompt caching (campos de usage e o que invalida a cache)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
            { label: 'OpenTelemetry — convenções semânticas para GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Decompõe o custo em factores e elimina o tráfego como causa.',
          'Usa os campos de usage da cache por versão de prompt para testar a hipótese da cache.',
          'Considera o ciclo do agente a repetir uma ferramenta que falha.',
          'Considera causas fora do assistente (chave usada por jobs, utilizadores abusivos).',
          'Propõe reverter primeiro e alarmes e testes que impeçam a regressão.',
        ],
        fraco: '«Pedia a factura detalhada ao fornecedor» ou culpa o fornecedor de ter mudado preços, sem olhar para os traços.',
        solido: 'Decompõe o custo, verifica a cache e as chamadas por conversa nos traços e reverte o deploy.',
        excelente: 'Quantifica quanto a perda de cache explica, liga a ferramenta falhada ao ciclo do agente, procura a cauda de conversas caras e acrescenta alarmes horários e um teste de estabilidade do prefixo no CI.',
      },
      seguimento: [
        'Como escreverias o teste de CI que apanha um prefixo instável?',
        'Que limite de chamadas por conversa defines e o que acontece quando é atingido?',
        'Como atribuis o custo a cada funcionalidade nova antes do deploy?',
      ],
      sinaisAlarme: [
        'Esperar pela factura mensal para perceber.',
        'Não relacionar o pico com o deploy de sexta.',
        'Desligar o assistente inteiro em vez de reverter a alteração.',
      ],
      modulos: ['custo-escala', 'observabilidade-llmops', 'agentes'],
    },
  ],
};
