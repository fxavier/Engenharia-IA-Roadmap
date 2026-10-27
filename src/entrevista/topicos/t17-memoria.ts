import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'memoria',
  numero: 17,
  bloco: 'agentes',
  titulo: 'Memória de conversa e de longo prazo',
  resumo:
    'Como um sistema sem estado parece lembrar-se: janela, trim e resumo no curto prazo; memória semântica, episódica e procedimental no longo prazo; quando escrever, como recuperar, como esquecer por obrigação legal. Pergunta-se porque é onde custo, qualidade e privacidade colidem na mesma decisão.',
  icon: '🧠',
  modulos: ['memoria', 'langgraph-persistencia'],
  essencial: [
    'O modelo não tem estado entre pedidos: a «memória» é o que a aplicação volta a meter no contexto em cada turno.',
    'Custo de entrada de uma conversa com histórico completo: T·S + m·T(T+1)/2 tokens — cresce com o quadrado do número de turnos T.',
    'Curto prazo = estado da thread (checkpointer); longo prazo = store entre threads, com namespace por utilizador ou tenant.',
    'Três tipos de longo prazo: semântica (factos), episódica (experiências e exemplos passados), procedimental (regras e prompts).',
    'Trim por tokens nunca parte um par tool call/resultado nem começa a janela numa resposta do assistente.',
    'Escrever no caminho quente dá frescura e latência; em background dá latência zero e atraso na consolidação.',
    'Um facto que muda pede chave estável e upsert com data, não mais um vector «parecido» ao lado do antigo.',
    'Embeddings e resumos de dados pessoais são dados pessoais: o direito ao apagamento (art. 17.º RGPD) chega à base vectorial, aos backups e aos traços.',
    'O namespace vem da identidade autenticada, nunca de um argumento que o modelo escreve.',
    'Avalia-se com conversas longas anotadas: recall de factos, actualizações, abstenção, perguntas repetidas e tokens por turno.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-memoria-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Que tipos de memória tem um assistente e onde vive cada um',
      enunciado:
        'Quando dizes que o teu assistente «tem memória», o que é que isso quer dizer em concreto? Distingue os tipos e diz-me onde guardavas cada um.',
      minutos: 4,
      dica: 'Começa pelo que o modelo NÃO faz entre dois pedidos.',
      resposta: [
        {
          type: 'p',
          text: 'Quer dizer que **a aplicação volta a pôr no contexto** aquilo que importa — o modelo não guarda nada entre pedidos. Divido em memória de **curto prazo**, que é o estado de uma conversa (thread), e de **longo prazo**, que sobrevive entre conversas e se divide em semântica, episódica e procedimental.',
        },
        {
          type: 'table',
          head: ['Tipo', 'O que guarda', 'Exemplo (seguradora)', 'Onde vive'],
          rows: [
            ['Curto prazo', 'Mensagens e estado da conversa actual', 'O sinistro de que se está a falar, o que já foi pedido ao cliente', 'Checkpointer por `thread_id` (Postgres, Redis)'],
            ['Semântica', 'Factos estáveis sobre o utilizador ou o domínio', '«Prefere contacto por e-mail», «tem apólice automóvel e habitação»', 'Store com namespace por utilizador, perfil ou colecção'],
            ['Episódica', 'Experiências passadas e como correram', 'Uma conversa anterior em que a participação foi resolvida em 3 passos', 'Store ou índice de exemplos, usados como few-shot'],
            ['Procedimental', 'Como fazer: regras, instruções, prompts', '«Nunca prometer prazo de peritagem sem consultar o sistema»', 'Prompt versionado; às vezes editável por reflexão, com revisão'],
          ],
        },
        {
          type: 'p',
          text: 'A taxonomia vem da psicologia cognitiva e foi adaptada a agentes no CoALA; a documentação do LangGraph usa os mesmos três nomes. O que importa em entrevista é a consequência prática: cada tipo tem um **ciclo de escrita e um risco** diferentes. A semântica precisa de tratamento de conflitos (o cliente muda de morada); a episódica precisa de selecção (que exemplo se parece com este caso); a procedimental mexe no comportamento de todos os utilizadores e por isso passa por revisão como código.',
        },
        {
          type: 'p',
          text: 'Na prática, muita informação que parece memória **não deve ser memória**: o estado de uma apólice ou de um pedido lê-se por ferramenta, da fonte de verdade, no momento. Guardar uma cópia num store de memória é criar uma cache sem invalidação.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Confundir memória com base de conhecimento',
          text: 'O corpus do RAG (políticas, manuais) é igual para todos e é mantido pela empresa. A memória é por utilizador ou por tenant e é escrita pelo próprio sistema. Misturá-los num só índice é o caminho mais curto para mostrar a um cliente o que pertence a outro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — conceito de memória (semântica, episódica, procedimental)', url: 'https://docs.langchain.com/oss/python/concepts/memory' },
            { label: 'Sumers et al. (2023) — Cognitive Architectures for Language Agents (CoALA)', url: 'https://arxiv.org/abs/2309.02427' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz explicitamente que o modelo não tem estado e que a memória é contexto reenviado pela aplicação.',
          'Distingue curto prazo (thread) de longo prazo (entre threads).',
          'Nomeia e exemplifica semântica, episódica e procedimental.',
          'Diz onde guardava cada tipo (checkpointer, store com namespace, prompt versionado).',
          'Separa memória de dados operacionais que se lêem por ferramenta da fonte de verdade.',
        ],
        fraco: '«O modelo lembra-se da conversa» ou «guardo tudo numa base vectorial», sem distinguir tipos nem armazenamento.',
        solido: 'Explica que o modelo é sem estado, separa curto e longo prazo, dá os três tipos com exemplos e onde vivem.',
        excelente: 'Acrescenta o ciclo de escrita e o risco de cada tipo, recusa guardar dados operacionais como memória e separa memória do corpus de RAG por isolamento.',
      },
      seguimento: [
        'Onde termina a memória de curto prazo e começa a de longo prazo numa conversa que dura três dias?',
        'Deixavas o agente reescrever a sua própria memória procedimental? Com que controlo?',
        'Perfil único ou colecção de factos para a memória semântica?',
      ],
      sinaisAlarme: [
        'Dizer que o modelo «aprende» com cada conversa.',
        'Pôr memórias de utilizadores no mesmo índice do corpus partilhado.',
        'Guardar o estado de um pedido como memória em vez de o ler da fonte.',
      ],
      modulos: ['memoria'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-memoria-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quanto custa um histórico que cresce e porque não usar 1M tokens',
      enunciado:
        'O modelo que usamos aceita uma janela enorme. Porque não mandar simplesmente a conversa inteira em cada turno e esquecer o problema da memória?',
      minutos: 5,
      dica: 'Escreve a soma dos tokens de entrada ao longo de T turnos.',
      resposta: [
        {
          type: 'p',
          text: 'Porque o custo de entrada **cresce com o quadrado** do número de turnos, a latência cresce com ele, e a qualidade não melhora — tende a piorar quando a informação relevante fica a meio de um contexto longo. A janela grande é um tecto, não uma estratégia.',
        },
        {
          type: 'p',
          text: 'Se cada turno tem uma parte fixa `S` (system prompt, esquemas de ferramentas, contexto de RAG) e cada par pergunta-resposta acrescenta `m` tokens, o turno `t` envia `S + m·t`. Ao fim de `T` turnos a entrada total é `T·S + m·T(T+1)/2`. Com `S = 2 500`, `m = 350` e `T = 30`: 75 000 + 162 750 = **237 750 tokens**. Com uma janela dos últimos 6 turnos, o termo variável deixa de crescer depois do 6.º turno e o total cai para **132 750** — 44% menos, e a diferença aumenta com T.',
        },
        {
          type: 'list',
          items: [
            '**Custo**: o termo quadrático domina a partir de poucas dezenas de turnos; em agentes, cada iteração do ciclo é um «turno» e os resultados de ferramentas são grandes.',
            '**Latência**: o tempo até ao primeiro token cresce com a entrada; um turno ao fim de uma conversa longa pode demorar várias vezes mais do que o primeiro.',
            '**Qualidade**: o estudo *Lost in the Middle* mostrou que a exactidão cai quando a informação relevante está a meio de contextos longos; histórico velho também arrasta instruções e decisões já ultrapassadas.',
            '**Privacidade**: tudo o que reenvias é processado outra vez, incluindo dados pessoais que já não eram necessários.',
          ],
        },
        {
          type: 'p',
          text: 'O prompt caching muda a conta mas não a forma: o prefixo estável (system, ferramentas, histórico antigo inalterado) é cobrado a uma fracção do preço normal enquanto a cache estiver quente, mas os tokens continuam a ocupar janela e atenção. Por isso combino as duas coisas: janela por orçamento de tokens com prefixo estável para a cache, mais resumo ou estado estruturado para o que sai da janela.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que meço',
          text: 'Tokens de entrada por turno em função do número do turno (deve estabilizar, não subir em rampa), taxa de cache hit, p95 do tempo até ao primeiro token por percentil de comprimento da conversa e, como métrica de qualidade, perguntas repetidas ao cliente.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Anthropic — prompt caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve ou descreve a soma T·S + m·T(T+1)/2 e conclui que o custo é quadrático no número de turnos.',
          'Dá um exemplo numérico com e sem janela.',
          'Menciona o efeito na latência (tempo até ao primeiro token).',
          'Cita a degradação de qualidade em contextos longos (lost in the middle) ou instruções obsoletas.',
          'Explica o que o prompt caching resolve e o que não resolve.',
        ],
        fraco: '«Porque é caro», sem dizer como cresce, ou «porque não cabe», quando cabe.',
        solido: 'Mostra o crescimento quadrático com números, junta latência e lost in the middle e propõe janela mais resumo.',
        excelente: 'Acrescenta o papel do prompt caching e do prefixo estável, a dimensão de privacidade e as métricas de produção que provam que o custo por turno estabilizou.',
      },
      seguimento: [
        'Se o fornecedor der 90% de desconto em tokens em cache, a conclusão muda?',
        'Num agente com 15 chamadas a ferramentas por tarefa, o que é T e o que é m?',
        'Como escolhes o tamanho da janela?',
      ],
      sinaisAlarme: [
        '«Com 1M tokens já não é preciso gerir memória.»',
        'Dizer que o custo cresce linearmente com os turnos.',
        'Não saber o que é o prompt caching nem que exige prefixo estável.',
      ],
      modulos: ['memoria', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-memoria-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Janela por mensagens, trim por tokens ou resumo incremental',
      enunciado:
        'Para a memória de curto prazo tens três opções: últimas N mensagens, corte por orçamento de tokens, ou resumo incremental do que sai. Quando escolhes cada uma e o que perdes em cada caso?',
      minutos: 8,
      dica: 'Pensa no que acontece a um facto dito no turno 2 numa conversa de 40 turnos.',
      resposta: [
        {
          type: 'p',
          text: 'Por omissão uso **trim por tokens** com um **estado estruturado** para os factos que não se podem perder, e só acrescento **resumo incremental** quando as conversas são longas e o contexto antigo tem valor. Últimas N mensagens é a opção mais simples e a menos previsível em custo, porque uma mensagem pode ter 20 tokens ou 8 000.',
        },
        {
          type: 'table',
          head: ['Estratégia', 'Ganha', 'Perde', 'Quando'],
          rows: [
            ['Últimas N mensagens', 'Trivial, determinística, sem chamadas extra', 'Custo imprevisível (resultados de ferramentas grandes); corta pares tool call/resultado se for ingénua', 'Protótipos, chats curtos sem ferramentas'],
            ['Trim por orçamento de tokens', 'Custo e latência limitados por construção; prefixo estável ajuda a cache', 'Tudo o que sai é esquecido de vez', 'Por omissão em produção, com estado estruturado ao lado'],
            ['Resumo incremental', 'Preserva o fio da conversa longa com custo quase constante', 'Uma chamada extra (latência ou trabalho em background); perde o que o resumidor não achou importante; pode alucinar', 'Conversas de dezenas de turnos ou retomadas dias depois'],
            ['Estado estruturado (campos tipados)', 'Factos críticos nunca saem; legível por ferramentas e router', 'Só guarda o que previste no esquema', 'Sempre que há entidades do caso: n.º de apólice, pedido, valor contestado'],
          ],
        },
        {
          type: 'p',
          text: 'O trim tem regras que se esquecem: o system prompt fica sempre; um `assistant` com `tool_calls` e os `tool` que lhe respondem entram ou saem juntos, porque as APIs rejeitam um resultado de ferramenta sem a chamada correspondente; e a janela começa numa mensagem do utilizador. Conto tokens com uma estimativa barata no caminho quente e calibro-a periodicamente contra a contagem do fornecedor.',
        },
        {
          type: 'p',
          text: 'O resumo incremental tem um custo escondido: cada resumo é gerado a partir do anterior, e um erro entra e fica. Por isso o prompt de resumo é avaliado como qualquer outro — num conjunto de conversas longas com os factos anotados, medindo quantos sobrevivem a três ou quatro rondas de resumo — e corre no escalão pequeno, de preferência depois de enviar a resposta, para não pagar latência ao utilizador.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O resumo que apaga a excepção',
          text: 'Um resumo tende a guardar o tema («cliente com reclamação de factura») e a perder o detalhe que muda a decisão («já foi reembolsado 200 MZN no dia 3»). Valores, identificadores e compromissos assumidos vão para campos do estado, não para prosa.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — memória de curto prazo (trim, delete, summarize)', url: 'https://docs.langchain.com/oss/python/langchain/short-term-memory' },
            { label: 'LangGraph — persistência e checkpointers', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Compara pelo menos as três estratégias com o que cada uma ganha e perde.',
          'Diz que N mensagens não limita o custo porque as mensagens têm tamanhos muito diferentes.',
          'Menciona as regras do trim: system fixo, pares tool call/resultado intactos, início no utilizador.',
          'Identifica a perda cumulativa do resumo e propõe avaliá-lo com factos anotados.',
          'Propõe estado estruturado para factos críticos.',
        ],
        fraco: 'Escolhe «resumo» porque «guarda tudo», sem custo, latência nem risco de perda.',
        solido: 'Compara as três com custo e perda, escolhe trim por tokens por omissão e conhece a regra dos pares de ferramentas.',
        excelente: 'Combina trim com estado tipado, põe o resumo fora do caminho crítico no escalão pequeno e mede a sobrevivência de factos ao longo de várias rondas de resumo.',
      },
      seguimento: [
        'Como contas tokens sem chamar a API de contagem em cada turno?',
        'O resumo corre antes ou depois de responder ao utilizador?',
        'O que fazes quando o resultado de uma única ferramenta é maior do que o orçamento?',
      ],
      sinaisAlarme: [
        'Cortar mensagens a meio ou separar um tool call do seu resultado.',
        'Confiar no resumo sem nunca o avaliar.',
        'Não saber dizer quanto custa o turno 30 com a estratégia escolhida.',
      ],
      modulos: ['memoria'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-memoria-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Escrever memórias no caminho quente ou em background',
      enunciado:
        'O teu assistente vai passar a guardar factos sobre o utilizador entre conversas. Extrais e gravas as memórias durante o turno, antes de responder, ou num processo à parte? Defende a escolha.',
      minutos: 7,
      dica: 'Quem precisa da memória, e quando? Na mesma conversa ou na próxima?',
      resposta: [
        {
          type: 'p',
          text: 'Por omissão escrevo **em background**, depois da resposta ou no fim da conversa: não acrescento latência ao utilizador, posso usar um prompt de extracção mais cuidadoso e consolidar com o que já existe. Escrevo **no caminho quente** só quando a memória tem de valer já nesta conversa ou o utilizador pede explicitamente «lembra-te disto».',
        },
        {
          type: 'compare',
          left: {
            title: 'Caminho quente (durante o turno)',
            items: [
              'Memória disponível imediatamente, até noutra thread aberta em paralelo.',
              'Transparente: o assistente pode dizer «guardei a sua preferência».',
              'Acrescenta uma chamada ao modelo ou uma ferramenta `guardar_memoria` ao turno: mais latência e mais tokens.',
              'O agente divide atenção entre a tarefa e a gestão de memória; tende a guardar demais ou de menos.',
            ],
          },
          right: {
            title: 'Background (depois do turno ou da conversa)',
            items: [
              'Latência zero no caminho do utilizador.',
              'Pode ver a conversa inteira e decidir com contexto: o facto foi confirmado ou corrigido depois?',
              'Pode consolidar: deduplicar, actualizar factos antigos, aplicar a política de PII com calma.',
              'Atraso: uma segunda conversa que começa logo a seguir pode não ver a memória nova.',
            ],
          },
        },
        {
          type: 'p',
          text: 'O desenho que uso em produção é um evento «conversa terminada» (ou inactividade de N minutos) numa fila, consumido por um worker que corre a extracção no escalão pequeno, valida a saída contra um esquema (`tipo`, `chave`, `valor`, `origem`, `confiança`), passa o filtro de PII e faz upsert no store com namespace do utilizador autenticado. O worker é idempotente por `thread_id` e versão do checkpoint, para que um reprocessamento não duplique memórias.',
        },
        {
          type: 'p',
          text: 'Números para decidir: se a extracção custa uma chamada de ~1 000 tokens no modelo pequeno e 30% das conversas geram alguma memória útil, fazê-la em todos os turnos no caminho quente multiplica o custo pelo número de turnos e soma algumas centenas de ms ao p95. Em background é uma chamada por conversa e zero ms visíveis.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Memória escrita a partir de texto não confiável',
          text: 'Se a extracção lê documentos, e-mails ou resultados de ferramentas, um atacante pode plantar uma «memória» que volta em todas as conversas futuras. Extraio só do que o utilizador disse, marco a origem e nunca guardo instruções — só factos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — escrever memórias no hot path vs em background', url: 'https://docs.langchain.com/oss/python/concepts/memory' },
            { label: 'OWASP — Top 10 para aplicações LLM', url: 'https://genai.owasp.org/llm-top-10/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe um lado por omissão e diz quando muda de lado.',
          'Quantifica o custo do caminho quente (chamada extra por turno, latência no p95).',
          'Identifica o atraso de consolidação como o custo do background.',
          'Descreve o worker: fila, extracção com esquema, filtro de PII, upsert idempotente.',
          'Menciona o risco de envenenamento de memória a partir de conteúdo não confiável.',
        ],
        fraco: '«Gravo tudo o que o utilizador diz numa base vectorial no fim de cada mensagem.»',
        solido: 'Compara os dois caminhos com latência e frescura, escolhe background por omissão e descreve a extracção estruturada.',
        excelente: 'Acrescenta idempotência, consolidação com memórias existentes, a origem como campo e a defesa contra memórias plantadas por prompt injection indirecta.',
      },
      seguimento: [
        'Como evitas que o mesmo facto seja gravado dez vezes?',
        'O utilizador diz «esquece o que te disse sobre a minha morada». Como tratas isso nos dois modelos?',
        'Que esquema de saída dás ao extractor?',
      ],
      sinaisAlarme: [
        'Não considerar a latência acrescentada ao utilizador.',
        'Guardar instruções ou texto de documentos como memória do utilizador.',
        'Ignorar duplicação e consolidação.',
      ],
      modulos: ['memoria', 'langgraph-persistencia'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-memoria-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Recuperar memórias relevantes sem poluir o contexto',
      enunciado:
        'O teu store tem 400 memórias sobre um cliente frequente. Num turno novo, quais metes no contexto, quantas, e como evitas que memórias irrelevantes piorem a resposta?',
      minutos: 5,
      dica: 'Semelhança semântica é só um dos sinais.',
      resposta: [
        {
          type: 'p',
          text: 'Meto **poucas e filtradas**: primeiro restrinjo por namespace e tipo, depois ordeno por uma combinação de relevância, recência e importância, corto por limiar e por orçamento de tokens, e apresento-as como dados com data e origem — não como instruções.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Filtrar antes de procurar', text: 'Namespace do utilizador autenticado, tipo de memória que faz sentido para a intenção (preferências para uma recomendação, episódios para um caso parecido), só memórias activas (não substituídas nem expiradas).' },
            { title: 'Pontuar com mais do que o cosseno', text: 'O padrão dos Generative Agents soma relevância (similaridade com a consulta), recência (decai com o tempo) e importância (atribuída na escrita). Uma preferência de há dois anos e uma de ontem não valem o mesmo.' },
            { title: 'Cortar por limiar e por orçamento', text: 'Top-k pequeno (3 a 8) com limiar mínimo de score; se nada passa o limiar, não meto nada. Um orçamento fixo de tokens para memória (por exemplo 300 a 500) impede que o bloco cresça com o tempo.' },
            { title: 'Formatar como dados', text: 'Bloco separado, cada linha com data e origem: «[2026-03-02, dito pelo cliente] prefere entrega depois das 18h». O modelo vê que é contexto datado, e o prompt diz que memórias não são instruções.' },
          ],
        },
        {
          type: 'p',
          text: 'Uma memória irrelevante não é neutra: o modelo tende a usá-la. O sintoma clássico é personalização forçada — o cliente pergunta pelo horário da farmácia e a resposta menciona a alergia que ele referiu há meses. Também há memórias que nem deviam ser recuperadas sem pedido: saúde, finanças, conflitos passados.',
        },
        {
          type: 'p',
          text: 'Em alternativa à recuperação automática em cada turno, posso dar ao agente uma ferramenta `procurar_memoria(consulta)` e deixá-lo decidir quando precisa. Ganho contexto mais limpo e perco determinismo: o agente pode não procurar quando devia. Com volumes pequenos por utilizador, um **perfil** compacto sempre presente (meia dúzia de campos) mais pesquisa só para episódios é muitas vezes o melhor compromisso.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Medir a poluição',
          text: 'Corro o conjunto de avaliação com memória ligada e desligada e comparo a qualidade por intenção. Se uma intenção piora com memória, a recuperação para essa intenção fica desligada até ser corrigida.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Park et al. (2023) — Generative Agents: Interactive Simulacra of Human Behavior', url: 'https://arxiv.org/abs/2304.03442' },
            { label: 'LangGraph — memória de longo prazo com store', url: 'https://docs.langchain.com/oss/python/langgraph/add-memory' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Filtra por namespace, tipo e estado antes da pesquisa semântica.',
          'Usa sinais além da similaridade: recência e importância.',
          'Aplica limiar e orçamento de tokens, aceitando devolver zero memórias.',
          'Formata memórias como dados datados com origem, não como instruções.',
          'Propõe medir o efeito da memória por intenção (ligada vs desligada).',
        ],
        fraco: '«Faço top-10 por cosseno e meto no system prompt.»',
        solido: 'Filtra, pontua com recência e relevância, limita o top-k e o orçamento, e formata como dados.',
        excelente: 'Discute recuperação automática vs ferramenta, perfil compacto vs colecção, memórias sensíveis que só se usam a pedido, e mede a poluição por intenção.',
      },
      seguimento: [
        'Como atribuis importância a uma memória no momento da escrita?',
        'Que meia-vida darias à recência num banco móvel e num assistente de programação?',
        'E se o agente nunca chamar a ferramenta de procurar memória?',
      ],
      sinaisAlarme: [
        'Meter todas as memórias do utilizador no contexto.',
        'Pôr memórias no system prompt como se fossem regras.',
        'Não considerar que memória irrelevante degrada a resposta.',
      ],
      modulos: ['memoria', 'embeddings'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-memoria-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Factos que mudam: conflitos e actualizações na memória',
      enunciado:
        'Em Março o cliente disse que morava na Matola. Em Setembro diz que mudou para a Baixa de Maputo. O teu store tem as duas memórias. Como é que o sistema sabe qual vale, e como devia ter sido escrito para isto não acontecer?',
      minutos: 5,
      dica: 'Um facto tem identidade. Dois vectores parecidos não.',
      resposta: [
        {
          type: 'p',
          text: 'Do jeito em que está, **não sabe**: duas memórias semanticamente parecidas vão ambas para o contexto e o modelo escolhe uma, às vezes a errada. A correcção é tratar factos com **identidade e tempo**: chave estável (`utilizador, morada_principal`), upsert que substitui o valor e guarda o anterior com data de fim.',
        },
        {
          type: 'p',
          text: 'Separo dois tipos de memória semântica. Num **perfil**, cada facto tem um campo fixo e a escrita é um upsert — não há conflito possível, só versões. Numa **colecção** de factos livres, a escrita tem de reconciliar: procura memórias próximas da nova e decide se acrescenta, actualiza, apaga ou ignora. É o padrão que o Mem0 descreve (ADD, UPDATE, DELETE, NOOP decididos por um modelo sobre as memórias candidatas), e o seu custo é uma chamada extra por escrita e um ponto de erro: o modelo pode fundir factos que não deviam ser fundidos.',
        },
        {
          type: 'table',
          head: ['Campo', 'Para quê'],
          rows: [
            ['`chave` e `valor`', 'Identidade do facto; permite upsert determinístico'],
            ['`valido_desde` / `valido_ate`', 'Histórico: «onde morava em Março?» continua respondível'],
            ['`origem`', 'Dito pelo cliente, inferido, vindo de sistema — decide a confiança e o desempate'],
            ['`registado_em`', 'Desempate por recência quando a origem é igual'],
          ],
        },
        {
          type: 'p',
          text: 'Regras de desempate que costumo usar: fonte de verdade ganha a memória (a morada de facturação vem da API de clientes, não da conversa); dito explicitamente ganha a inferido; mais recente ganha a mais antigo dentro da mesma origem. E há factos que **não deviam ser memória**: a morada actual de entrega é estado operacional, lê-se por ferramenta.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Apagar o antigo sem rasto',
          text: 'Substituir sem guardar o intervalo de validade parte perguntas temporais e auditorias («porque é que a entrega de Junho foi para a Matola?»). O LongMemEval inclui exactamente actualizações de conhecimento e raciocínio temporal entre as capacidades que avalia.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Chhikara et al. (2025) — Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory', url: 'https://arxiv.org/abs/2504.19413' },
            { label: 'Wu et al. (2024) — LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory', url: 'https://arxiv.org/abs/2410.10813' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que pesquisa semântica sozinha devolve as duas versões e não resolve o conflito.',
          'Propõe chave estável com upsert e validade temporal.',
          'Distingue perfil (campos fixos) de colecção (reconciliação na escrita).',
          'Dá regras de desempate por origem e recência.',
          'Reconhece que parte destes factos deve ser lida da fonte de verdade.',
        ],
        fraco: '«Uso a memória mais recente», sem dizer como se sabe que duas memórias são o mesmo facto.',
        solido: 'Propõe chave e upsert com datas, e reconciliação na escrita para factos livres.',
        excelente: 'Acrescenta validade temporal para perguntas históricas, desempate por origem, o custo e o risco da reconciliação por modelo, e retira da memória o que é estado operacional.',
      },
      seguimento: [
        'Como testavas a reconciliação ADD/UPDATE/DELETE?',
        'O cliente diz «afinal ainda estou na Matola». O que acontece aos teus registos?',
        'Quem decide a chave de um facto livre como «gosta de piri-piri»?',
      ],
      sinaisAlarme: [
        'Achar que o modelo «percebe» qual é o facto actual.',
        'Acrescentar memórias sem nunca actualizar nem apagar.',
        'Guardar estado operacional mutável como memória.',
      ],
      modulos: ['memoria'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-memoria-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'O que nunca guardar e como cumprir o direito ao apagamento',
      enunciado:
        'Um cliente do banco móvel invoca o direito ao apagamento. O teu assistente tem checkpoints de conversa, um store de memórias com embeddings, resumos e traços de observabilidade. O que apagas, como provas que apagaste, e o que devias ter decidido antes para isto ser fácil?',
      minutos: 9,
      dica: 'Um embedding de uma frase com dados pessoais é um dado pessoal?',
      resposta: [
        {
          type: 'p',
          text: 'Apago **todas as cópias derivadas**, não só a mensagem original: checkpoints, memórias, os seus vectores, resumos que as mencionam, traços e logs com conteúdo, e conjuntos de avaliação que tenham sido feitos com essas conversas. A decisão que torna isto exequível é anterior: **chave do titular em todo o lado** e **minimização** — o que nunca se guardou não se apaga.',
        },
        {
          type: 'h',
          text: 'O que nunca entra em memória',
        },
        {
          type: 'list',
          items: [
            '**Segredos e credenciais**: PIN, palavra-passe, códigos OTP, números completos de cartão. Detectados e mascarados antes de qualquer persistência, incluindo traços.',
            '**Categorias especiais** (art. 9.º RGPD — saúde, religião, orientação sexual, etc.) sem base legal específica e necessidade clara.',
            '**Dados de terceiros** mencionados pelo utilizador («o meu irmão deve-me 5 000 MZN»).',
            '**Dados operacionais** que têm fonte de verdade (saldo, estado de transferências): lêem-se por ferramenta.',
          ],
        },
        {
          type: 'h',
          text: 'Como apagar de facto',
        },
        {
          type: 'steps',
          items: [
            { title: 'Inventário por titular', text: 'Cada registo, em cada sistema, tem `titular_id` (ou o namespace é derivado dele). Sem isto, apagar é procurar texto livre em toda a parte.' },
            { title: 'Apagar por filtro, não por semelhança', text: 'Na base vectorial, delete por metadado `titular_id` ou por namespace inteiro — nunca «procurar vectores parecidos com o nome». Em índices HNSW, um delete pode ser lógico até à compactação; confirmo na documentação do motor quando o dado deixa fisicamente de existir.' },
            { title: 'Derivados', text: 'Resumos e memórias consolidadas que misturam o titular com outros conteúdos são regenerados ou apagados. Conjuntos de avaliação usam dados anonimizados desde a origem para não entrarem aqui.' },
            { title: 'Backups e traços', text: 'Retenção curta e conhecida para traços com conteúdo (dias, não meses); backups com prazo de expiração documentado, e o pedido de apagamento é reaplicado se houver restauro.' },
            { title: 'Prova', text: 'Um job de apagamento com registo auditável (o que foi apagado, onde, quando, contagens), e um teste periódico que cria um titular sintético, o apaga e verifica que nenhuma pesquisa o devolve.' },
          ],
        },
        {
          type: 'p',
          text: 'O trade-off real é **utilidade contra superfície de risco**. Cada memória a mais melhora a personalização num ponto e aumenta o custo de um incidente, o trabalho de cada pedido de titular e a pressão de base legal. Num banco, a minha posição por omissão é memória de longo prazo mínima (preferências de comunicação, idioma), com consentimento e retenção definida, e tudo o resto lido em tempo real dos sistemas.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Embeddings não anonimizam',
          text: 'Há trabalhos que reconstroem grande parte do texto original a partir do embedding. Trato o vector com a mesma classificação do texto de onde veio.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Regulamento (UE) 2016/679 (RGPD) — art. 5.º, 9.º e 17.º', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
            { label: 'Morris et al. (2023) — Text Embeddings Reveal (Almost) As Much As Text', url: 'https://arxiv.org/abs/2310.06816' },
            { label: 'CNPD — Comissão Nacional de Protecção de Dados', url: 'https://www.cnpd.pt/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Lista as cópias derivadas: checkpoints, memórias, vectores, resumos, traços, backups, conjuntos de avaliação.',
          'Diz que embeddings de dados pessoais são dados pessoais.',
          'Propõe identificador do titular em todos os registos e apagamento por filtro ou namespace.',
          'Nomeia o que nunca se guarda (segredos, categorias especiais, terceiros, dados com fonte de verdade).',
          'Propõe prova do apagamento: registo auditável e teste com titular sintético.',
          'Enquadra a decisão como utilidade contra superfície de risco, com uma posição por omissão.',
        ],
        fraco: '«Apago a conversa da base de dados.»',
        solido: 'Apaga em todos os armazenamentos com filtro por titular, inclui vectores e traços, e lista o que não se guarda.',
        excelente: 'Desenha para o apagamento desde o início (chave do titular, retenções, avaliação anonimizada), conhece deletes lógicos em índices vectoriais e backups, e prova o apagamento com um teste automatizado.',
      },
      seguimento: [
        'O teu fornecedor de modelo retém prompts? Como entra isso na resposta ao titular?',
        'Como lidas com um resumo que mistura dois titulares?',
        'Que prazo de retenção davas aos traços com conteúdo, e porquê?',
      ],
      sinaisAlarme: [
        '«Os embeddings são anónimos, não é preciso apagá-los.»',
        'Não saber onde estão as cópias dos dados de um utilizador.',
        'Guardar PIN ou OTP em logs «só para debug».',
      ],
      modulos: ['memoria', 'guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-memoria-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Como avalias se a memória ajuda ou atrapalha',
      enunciado:
        'Ligaste memória de longo prazo ao assistente. O produto quer saber se valeu a pena. Que métricas e que conjunto de avaliação usas?',
      minutos: 5,
      dica: 'Uma memória que não é recuperada e uma memória recuperada quando não devia são falhas diferentes.',
      resposta: [
        {
          type: 'p',
          text: 'Avalio a memória **como um sistema de recuperação mais um efeito no resultado**: um conjunto de conversas longas, multi-sessão, com os factos anotados e perguntas de sonda; métricas de recall, actualização e abstenção; e uma comparação A/B de qualidade e custo com memória ligada e desligada.',
        },
        {
          type: 'list',
          items: [
            '**Recall de factos**: a pergunta de sonda («qual é a minha operadora?») é respondida com o facto certo dito sessões antes.',
            '**Actualização**: depois de um facto mudar, a resposta usa o valor novo e responde bem a perguntas temporais.',
            '**Abstenção**: quando o facto nunca foi dito, o sistema não inventa. É a falha mais grave em produção.',
            '**Precisão da recuperação**: fracção das memórias injectadas que eram relevantes para o turno; mede a poluição.',
            '**Isolamento**: zero memórias de outro utilizador recuperadas, verificado com utilizadores sintéticos com factos contraditórios.',
            '**Efeito no produto**: perguntas repetidas ao cliente, taxa de resolução, tokens por turno e latência.',
          ],
        },
        {
          type: 'p',
          text: 'O LongMemEval é um bom molde para o conjunto: avalia extracção de informação, raciocínio entre sessões, raciocínio temporal, actualizações de conhecimento e abstenção. Construo o meu com conversas reais anonimizadas do domínio — 50 a 100 bastam para começar — e acrescento casos adversariais: o utilizador corrige-se, contradiz-se, ou menciona dados de terceiros.',
        },
        {
          type: 'p',
          text: 'Separo as falhas por componente, porque a correcção é diferente: a memória **não foi escrita** (extractor), foi escrita **errada** (extractor ou reconciliação), **não foi recuperada** (pesquisa, filtros, limiar) ou foi recuperada e **o modelo não a usou** (prompt). Os traços guardam o que foi escrito e o que foi injectado em cada turno para isto ser possível.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Avaliar só com conversas curtas',
          text: 'Uma suite de três turnos nunca exercita a memória: tudo está na janela. As conversas de avaliação têm de ser mais longas do que a janela configurada e repartidas por sessões.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Wu et al. (2024) — LongMemEval', url: 'https://arxiv.org/abs/2410.10813' },
            { label: 'Maharana et al. (2024) — Evaluating Very Long-Term Conversational Memory of LLM Agents (LoCoMo)', url: 'https://arxiv.org/abs/2402.17753' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe um conjunto multi-sessão com factos anotados e perguntas de sonda mais longo do que a janela.',
          'Inclui actualização e abstenção como métricas, não só recall.',
          'Mede poluição (precisão das memórias injectadas) e isolamento entre utilizadores.',
          'Compara com memória ligada e desligada em qualidade e custo.',
          'Atribui falhas ao componente certo (escrita, reconciliação, recuperação, uso).',
        ],
        fraco: '«Pergunto ao assistente se se lembra de mim e vejo se acerta.»',
        solido: 'Conjunto multi-sessão com recall, actualização e abstenção, e comparação ligada/desligada.',
        excelente: 'Acrescenta isolamento com utilizadores sintéticos, precisão da recuperação, decomposição das falhas por componente com traços e métricas de produto como perguntas repetidas.',
      },
      seguimento: [
        'Como geras perguntas de sonda sem as escrever todas à mão?',
        'Que métrica punha como gate de CI?',
        'Como medes «perguntas repetidas» em produção?',
      ],
      sinaisAlarme: [
        'Medir só se o facto aparece, ignorando invenções quando não existe.',
        'Avaliar memória com conversas que cabem inteiras na janela.',
        'Não considerar fuga entre utilizadores como métrica.',
      ],
      modulos: ['memoria', 'avaliar-agentes'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-memoria-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Gestor de janela por orçamento de tokens',
      enunciado:
        'Escreve uma função que recebe o histórico de mensagens e um orçamento de tokens e devolve o que vai para o modelo. O system prompt fica sempre, e um pedido de ferramenta nunca pode ficar separado do seu resultado.',
      contexto:
        'Assinatura: `ajustar_janela(msgs: list[dict], orcamento: int, contar=contar_aprox) -> list[dict]`. Mensagens no formato `{"role": "system" | "user" | "assistant" | "tool", "content": str}`; um `assistant` pode ter `tool_calls: [{"id", "name", "arguments"}]` e cada `tool` tem `tool_call_id`. O histórico tem até umas centenas de mensagens. A função corre em cada turno, antes da chamada ao modelo.',
      minutos: 25,
      dica: 'Agrupa primeiro em unidades que não se podem partir; depois percorre de trás para a frente.',
      resposta: [
        {
          type: 'p',
          text: 'Agrupo o histórico em **unidades atómicas** — uma mensagem simples, ou um `assistant` com `tool_calls` mais todos os `tool` que lhe respondem — e percorro de trás para a frente, acumulando enquanto cabe no orçamento que sobra depois do system prompt. No fim avanço o início até à primeira mensagem do utilizador. É O(n) no número de mensagens.',
        },
        {
          type: 'code',
          lang: 'python',
          code: `from collections.abc import Callable

Mensagem = dict  # {"role": ..., "content": str, "tool_calls"?: [...], "tool_call_id"?: str}


def contar_aprox(m: Mensagem) -> int:
    """Estimativa barata: ~4 caracteres por token + 4 de overhead por mensagem."""
    texto = m.get("content") or ""
    for c in m.get("tool_calls", []):
        texto += c["name"] + c.get("arguments", "")
    return len(texto) // 4 + 4


def _unidades(msgs: list[Mensagem]) -> list[list[Mensagem]]:
    """Agrupa um assistant com tool_calls e os tool que lhe respondem numa unidade atómica."""
    unidades: list[list[Mensagem]] = []
    i = 0
    while i < len(msgs):
        m = msgs[i]
        if m["role"] == "tool":
            raise ValueError(f"resultado de ferramenta órfão na posição {i}")
        if m["role"] == "assistant" and m.get("tool_calls"):
            ids = {c["id"] for c in m["tool_calls"]}
            j = i + 1
            while j < len(msgs) and msgs[j]["role"] == "tool":
                ids.discard(msgs[j]["tool_call_id"])
                j += 1
            if ids:
                raise ValueError(f"tool_calls sem resultado: {sorted(ids)}")
            unidades.append(msgs[i:j])
            i = j
        else:
            unidades.append([m])
            i += 1
    return unidades


def ajustar_janela(
    msgs: list[Mensagem],
    orcamento: int,
    contar: Callable[[Mensagem], int] = contar_aprox,
) -> list[Mensagem]:
    """Mantém o system prompt e o sufixo mais recente que cabe no orçamento.

    Garantias: pares tool call/resultado nunca se partem; a janela começa
    numa mensagem do utilizador; a última mensagem do utilizador entra sempre
    (ou levanta ValueError, em vez de mandar ao modelo um pedido sem pergunta).
    """
    sistema = [m for m in msgs if m["role"] == "system"]
    resto = [m for m in msgs if m["role"] != "system"]
    disponivel = orcamento - sum(contar(m) for m in sistema)
    if disponivel < 0:
        raise ValueError("o system prompt sozinho excede o orçamento")

    unidades = _unidades(resto)
    custos = [sum(contar(m) for m in u) for u in unidades]

    inicio = len(unidades)          # índice da primeira unidade mantida
    usado = 0
    for k in range(len(unidades) - 1, -1, -1):
        if usado + custos[k] > disponivel:
            break
        usado += custos[k]
        inicio = k

    # A janela tem de começar num turno do utilizador: avança até ao próximo.
    while inicio < len(unidades) and unidades[inicio][0]["role"] != "user":
        inicio += 1

    ultima_user = max((k for k, u in enumerate(unidades) if u[0]["role"] == "user"), default=None)
    if ultima_user is not None and inicio > ultima_user:
        raise ValueError("a última mensagem do utilizador não cabe no orçamento")

    return sistema + [m for u in unidades[inicio:] for m in u]


if __name__ == "__main__":
    palavras = lambda m: len((m.get("content") or "").split()) + 3 * len(m.get("tool_calls", []))
    conversa = [
        {"role": "system", "content": "És o assistente de suporte."},              # 5
        {"role": "user", "content": "O meu pedido PD-8842507 está atrasado"},       # 6
        {"role": "assistant", "content": "", "tool_calls": [{"id": "c1", "name": "ler_pedido"}]},  # 3
        {"role": "tool", "tool_call_id": "c1", "content": "estado: em_preparacao, eta 25 min"},    # 5
        {"role": "assistant", "content": "Está em preparação, chega em cerca de 25 minutos."},     # 8
        {"role": "user", "content": "E se passar da hora?"},                        # 5
        {"role": "assistant", "content": "Pode pedir cupão pela política de atrasos."},             # 7
        {"role": "user", "content": "Quero o cupão então"},                          # 4
    ]
    for orc in (50, 40, 12, 8):
        try:
            janela = ajustar_janela(conversa, orc, palavras)
            print(orc, [m["role"][0] for m in janela], sum(map(palavras, janela)))
        except ValueError as e:
            print(orc, "ValueError:", e)

# 50 ['s', 'u', 'a', 't', 'a', 'u', 'a', 'u'] 44
# 40 ['s', 'u', 'a', 'u'] 21
# 12 ['s', 'u'] 9
# 8 ValueError: a última mensagem do utilizador não cabe no orçamento`,
          caption: 'Com orçamento 40, a unidade [assistant + tool] não cabe e sai inteira; a resposta do assistente que vinha a seguir também sai, porque a janela tem de começar no utilizador.',
        },
        {
          type: 'p',
          text: 'Casos-limite tratados: system prompt maior do que o orçamento (erro explícito), histórico com `tool` órfão ou `tool_calls` sem resposta (erro — é um bug a montante, não algo a esconder), última pergunta que não cabe (erro em vez de enviar uma janela sem pergunta), histórico vazio (devolve só o system). A contagem é injectada para os testes serem determinísticos e para trocar a estimativa pelo tokenizer real.',
        },
        {
          type: 'p',
          text: 'Testes que escrevia: propriedade «nenhum `tool` na saída sem o seu `assistant`» com históricos gerados aleatoriamente (Hypothesis); soma de tokens da saída nunca acima do orçamento; a saída é sempre um sufixo do histórico (mais o system); e o exemplo acima como teste de regressão.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Extensões que o entrevistador costuma pedir',
          text: 'Um resultado de ferramenta enorme sozinho maior que o orçamento: truncar o conteúdo do `tool` com uma marca explícita, mantendo o par. Passar o que saiu a um resumidor em background. Manter fronteiras estáveis (cortar em blocos de vários turnos) para não invalidar o prompt caching em cada turno.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — memória de curto prazo e trim_messages', url: 'https://docs.langchain.com/oss/python/langchain/short-term-memory' },
            { label: 'OpenAI — function calling', url: 'https://platform.openai.com/docs/guides/function-calling' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Agrupa assistant com tool_calls e os respectivos resultados numa unidade indivisível.',
          'Reserva primeiro o orçamento do system prompt e percorre do fim para o início.',
          'Garante que a janela começa numa mensagem do utilizador.',
          'Trata casos-limite com erros explícitos (system demasiado grande, órfãos, última pergunta que não cabe).',
          'O exemplo de uso tem resultados correctos e propõe testes de propriedade.',
        ],
        fraco: 'Corta as primeiras N mensagens ou parte pares de ferramenta; ignora o system prompt.',
        solido: 'Solução correcta com unidades atómicas, orçamento após o system e início no utilizador, com exemplo verificado.',
        excelente: 'Acrescenta contagem injectável, testes de propriedade, tratamento de um resultado de ferramenta maior do que o orçamento e preocupação com estabilidade de prefixo para o prompt caching.',
      },
      seguimento: [
        'Como adaptavas isto para cortar só em fronteiras de 5 turnos, a pensar no prompt caching?',
        'O que mudava se as mensagens tivessem imagens?',
        'Como validavas a estimativa de 4 caracteres por token para português?',
      ],
      sinaisAlarme: [
        'Separar um tool call do seu resultado.',
        'Esquecer o system prompt na contagem ou cortá-lo.',
        'Escrever o resultado esperado sem o ter corrido.',
      ],
      modulos: ['memoria', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-memoria-10',
      tipo: 'debug',
      nivel: 'staff',
      titulo: 'O assistente mostrou a um cliente dados de outro',
      enunciado:
        'Uma cliente da farmácia online queixa-se: o assistente sugeriu-lhe «repetir a encomenda de insulina do mês passado», e ela nunca comprou insulina. Dois dias depois aparece um caso semelhante. Como investigas e o que corriges?',
      contexto:
        'Assistente com LangGraph: checkpointer em Postgres por `thread_id`, store de memórias de longo prazo com pesquisa vectorial, cache de respostas semântica à frente do modelo. 12 000 conversas por dia. O `thread_id` é gerado no frontend; o namespace do store é `("memorias", user_id)`. Duas semanas antes entrou uma alteração: a ferramenta `guardar_preferencia` passou a receber `user_id` como argumento «para permitir que o suporte humano guarde preferências em nome do cliente».',
      minutos: 14,
      dica: 'Há pelo menos três sítios por onde os dados de um utilizador podem chegar ao contexto de outro.',
      resposta: [
        {
          type: 'p',
          text: 'É um **incidente de privacidade com dados de saúde**, antes de ser um bug: contenção primeiro, depois diagnóstico. A causa mais provável, dado o histórico de alterações, é a ferramenta que aceita `user_id` como argumento — o modelo escreveu memória no namespace errado. Mas há outras duas vias a excluir: colisão de `thread_id` e a cache semântica partilhada.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Conter', text: 'Desligar a recuperação de memórias de longo prazo e a cache semântica (feature flags), reverter a ferramenta para derivar o utilizador do contexto autenticado. Activar o processo de incidente de dados pessoais: o art. 33.º do RGPD exige notificar a autoridade de controlo (a CNPD, em Portugal) em 72 horas, salvo se a violação não for susceptível de resultar em risco — e dados de saúde dificilmente estão nesse caso.' },
            { title: 'Hipótese 1 — namespace vindo do modelo', text: 'Nos traços, procuro chamadas a `guardar_preferencia` em que o `user_id` do argumento difere do utilizador autenticado da conversa. Um modelo que vê vários identificadores no contexto (um operador humano, uma conversa encaminhada, um nome parecido) escolhe o errado. É barato de verificar e encaixa na data.' },
            { title: 'Hipótese 2 — colisão de thread_id', text: 'Procuro `thread_id` com mais de um `user_id` associado nos checkpoints. Um id gerado no frontend com pouca entropia, reaproveitado entre sessões ou partilhado num dispositivo comum, junta duas conversas no mesmo estado.' },
            { title: 'Hipótese 3 — cache semântica partilhada', text: 'Se a chave da cache não inclui o utilizador, uma resposta personalizada («repetir a encomenda de insulina») é servida a outra pessoa com uma pergunta parecida. Verifico se as respostas das queixas foram cache hits.' },
            { title: 'Medir o alcance', text: 'Query sobre o store: memórias cujo conteúdo ou origem aponta para outra conversa que não a do namespace; contagem de utilizadores afectados desde o deploy. Este número decide a notificação.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcção estrutural: **identidade nunca é argumento de ferramenta**. O `user_id` vem do contexto de execução autenticado (no LangGraph, da configuração do run ou do runtime), e a ferramenta do suporte humano é outra, com outra autorização, fora do alcance do modelo. O `thread_id` é gerado no servidor e associado ao utilizador; o checkpointer recusa carregar uma thread de outro dono. A cache semântica, se existir, só guarda respostas não personalizadas ou inclui o utilizador na chave.',
        },
        {
          type: 'p',
          text: 'Limpeza: as memórias escritas no namespace errado desde o deploy são apagadas ou postas em quarentena para revisão, e os utilizadores afectados são tratados como titulares cujos dados foram expostos.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Teste que falha se algum esquema de ferramenta tiver um campo de identidade (`user_id`, `cliente_id`, `conta`). Teste de isolamento com dois utilizadores sintéticos com factos contraditórios a correr em paralelo em cada release. Alarme em produção quando um `thread_id` aparece com dois utilizadores.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OWASP — Top 10 para aplicações LLM (divulgação de informação sensível)', url: 'https://genai.owasp.org/llm-top-10/' },
            { label: 'LangGraph — persistência, threads e store', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
            { label: 'Regulamento (UE) 2016/679 (RGPD) — art. 33.º', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Trata como incidente de dados pessoais e começa por conter (flags, reverter) antes de investigar.',
          'Liga a alteração recente (user_id como argumento) à hipótese mais provável.',
          'Considera pelo menos duas outras vias: colisão de thread_id e cache semântica partilhada.',
          'Diz como verificar cada hipótese nos traços ou no store.',
          'Corrige pela regra estrutural: identidade vem do contexto autenticado, nunca do modelo.',
          'Propõe testes e alarmes que impedem a regressão e mede o alcance para a notificação.',
        ],
        fraco: '«O modelo alucinou a insulina; melhoro o prompt.»',
        solido: 'Identifica o namespace vindo do argumento como causa, verifica nos traços e corrige derivando a identidade do contexto autenticado.',
        excelente: 'Contém primeiro, considera as três vias, mede o alcance, cumpre as obrigações de notificação, separa a ferramenta do suporte humano e acrescenta testes de esquema e de isolamento ao CI.',
      },
      seguimento: [
        'Como saberias que as memórias erradas estão todas apagadas?',
        'O suporte humano precisa mesmo de guardar preferências em nome do cliente. Como desenhas isso?',
        'Que chave davas a uma cache semântica num assistente com personalização?',
      ],
      sinaisAlarme: [
        'Tratar como alucinação sem olhar para os dados.',
        'Começar a investigar sem conter a fuga.',
        'Aceitar que o modelo escolha a identidade «se o prompt disser para não errar».',
      ],
      modulos: ['memoria', 'guardrails-seguranca', 'observabilidade-llmops'],
    },
  ],
};
