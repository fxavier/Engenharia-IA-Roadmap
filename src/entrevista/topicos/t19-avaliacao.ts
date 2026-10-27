import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'avaliacao',
  numero: 19,
  bloco: 'avaliacao',
  titulo: 'Avaliação: conjuntos dourados e eval-driven development',
  resumo:
    'Como se prova que um sistema com LLM funciona e que uma mudança o melhorou: tipos de avaliação, conjunto dourado, ruído e tamanho da amostra, análise de erros, offline contra online e evals como gate de CI. É o tema que mais separa quem fez uma demo de quem pôs um sistema em produção.',
  icon: '🎯',
  modulos: ['avaliacao-fundamentos', 'avaliar-rag', 'ci-cd'],
  essencial: [
    'Um sistema com LLM é uma distribuição de saídas, não uma função: avalia-se com uma taxa sobre muitos casos, nunca com cinco exemplos lidos à mão.',
    'Camadas de avaliação, da mais barata à mais cara: asserções em código, conjunto dourado com juiz, revisão humana amostral, sinais online (A/B, reformulações, escalamentos).',
    'Erro padrão de uma taxa: raiz de p(1 − p)/n. Com n = 240 e p = 0,85 o IC a 95% é cerca de ±4,5 pontos; com 30 casos de uma intenção, cerca de ±13 pontos.',
    'Para detectar 5 pontos com potência 80% e α = 0,05: ~1000 casos por sistema se independentes; ~300 se emparelhados e só ~10% dos casos mudarem de resultado.',
    'Compara dois sistemas no MESMO conjunto com a diferença emparelhada por pergunta (bootstrap ou McNemar), não com dois intervalos separados que se sobrepõem.',
    'Análise de erros: lê 50 a 100 traços, anota livremente (open coding), agrupa em categorias de falha, conta-as; a categoria mais frequente decide a próxima eval.',
    'Eval-driven development: hipótese, caso que falha, mudança pequena, corrida completa emparelhada, decisão escrita no PR.',
    'Overfitting ao dourado: separa um conjunto de desenvolvimento de um de teste que não se lê no dia-a-dia, e renova os casos com tráfego real todos os meses.',
    'Gate de CI: asserções determinísticas bloqueiam sempre; métricas com ruído bloqueiam só quando o limite do IC da diferença cai abaixo da tolerância, e por intenção.',
    'Offline estável e online a piorar quase sempre significa que o conjunto deixou de representar o tráfego (deriva de intenções, de corpus ou de canal), não que o modelo mudou.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-avaliacao-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque é que «parece bem» não é uma métrica',
      enunciado:
        'Mudaste o prompt, testaste com meia dúzia de perguntas e as respostas pareciam melhores. O teu colega diz que isso chega para fazer deploy. O que lhe respondes?',
      minutos: 4,
      dica: 'Corre a mesma pergunta cinco vezes e repara no que acontece.',
      resposta: [
        {
          type: 'p',
          text: 'Respondo que um sistema com LLM **não é uma função, é uma distribuição de saídas**, e seis exemplos lidos por quem fez a mudança não estimam essa distribuição — nem antes nem depois. Para dizer «melhor» preciso de uma taxa sobre um conjunto representativo, medida nas duas versões, com uma noção de ruído.',
        },
        {
          type: 'p',
          text: 'Há três fontes de variação. **Amostragem**: com temperatura acima de zero, a mesma entrada dá saídas diferentes; e mesmo com temperatura 0 os fornecedores não garantem saídas idênticas, porque o batching e a aritmética de vírgula flutuante no servidor mudam ligeiramente os logits. **Entradas**: as seis perguntas que me ocorrem são as fáceis e as que pensei ao escrever o prompt; o tráfego real tem erros ortográficos, mistura de línguas, perguntas fora de âmbito. **Observador**: quem fez a mudança quer que ela funcione e lê as respostas com esse enviesamento.',
        },
        {
          type: 'p',
          text: 'E o efeito que me interessa costuma ser pequeno. Se o sistema acerta 80% e a mudança o leva a 85%, em seis perguntas a diferença esperada é 0,3 respostas. Com 5 acertos em 6, o intervalo de confiança exacto a 95% vai de cerca de 36% a quase 100%: não distingue nada.',
        },
        {
          type: 'table',
          head: ['Vibe check', 'Avaliação'],
          rows: [
            ['5–10 perguntas escolhidas por quem mudou', 'Dezenas a centenas de casos, de tráfego real, estratificados'],
            ['Uma corrida', 'Várias corridas, ou pelo menos a variância medida'],
            ['«Parece melhor»', 'Taxa por critério, por intenção, com intervalo de confiança'],
            ['Só olha para o que melhorou', 'Diferença emparelhada: o que ganhou e o que perdeu'],
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O vibe check tem lugar',
          text: 'Ler saídas à mão não é inútil: é como se descobrem os critérios e os modos de falha. O erro é usá-lo como decisão de deploy. Leio para saber *o que* medir; meço para saber *se* melhorou.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'Anthropic — Define success criteria and build evaluations', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que a saída é uma distribuição e que temperatura 0 não garante determinismo.',
          'Aponta o enviesamento de selecção das perguntas e do observador.',
          'Quantifica: com poucos casos o intervalo de confiança é tão largo que não distingue versões.',
          'Propõe a alternativa concreta: conjunto representativo, taxa por critério, comparação entre versões.',
        ],
        fraco: 'Concorda que «se parece bem está bem» ou responde só «falta testar mais», sem dizer o que é testar.',
        solido: 'Explica o não-determinismo e o enviesamento das perguntas e propõe um conjunto dourado com uma taxa medida antes e depois.',
        excelente: 'Faz a conta do intervalo com 6 casos, separa o papel da leitura manual (descobrir critérios) do da medição (decidir), e fala em comparação emparelhada e por intenção.',
      },
      seguimento: [
        'Se fixares temperature = 0 e uma seed, o problema desaparece?',
        'Quantas vezes corres cada caso e porquê?',
        'Como convences o colega sem parecer burocrático?',
      ],
      sinaisAlarme: [
        'Achar que temperatura 0 torna o sistema determinístico e portanto testável com um exemplo.',
        'Não conseguir dizer que número decidiria o deploy.',
      ],
      modulos: ['avaliacao-fundamentos', 'como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-avaliacao-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Asserções, conjunto dourado, humanos e sinais online',
      enunciado:
        'Que tipos de avaliação usas num produto com LLM e o que é que cada um apanha que os outros não apanham?',
      minutos: 5,
      dica: 'Ordena-os por custo por caso e por proximidade ao utilizador real.',
      resposta: [
        {
          type: 'p',
          text: 'Uso quatro camadas, da mais barata à mais cara: **asserções em código**, **conjunto dourado** pontuado automaticamente, **revisão humana** amostral e **sinais online**. Cada uma apanha uma classe de falhas diferente e nenhuma substitui as outras.',
        },
        {
          type: 'table',
          head: ['Camada', 'O que verifica', 'Custo e frequência', 'O que não vê'],
          rows: [
            ['Asserções (código)', 'JSON válido, esquema, ferramenta proibida não chamada, citação aponta para documento existente, sem PII, comprimento', 'Quase grátis; em cada PR e em produção', 'Se a resposta está certa'],
            ['Conjunto dourado', 'Correcção contra referência, recall da recuperação, recusa correcta, por intenção', 'Minutos e alguns euros por corrida; em cada PR ou à noite', 'Perguntas que ninguém pôs no conjunto'],
            ['Revisão humana', 'Tom, utilidade, erros subtis de domínio, calibração do juiz', 'Caro: 50–100 casos por semana', 'Escala e tendências'],
            ['Online', 'Resolução, escalamento para humano, reformulações, feedback, A/B', 'Grátis por caso, mas lento e ruidoso', 'Porquê falhou'],
          ],
        },
        {
          type: 'p',
          text: 'A regra prática é **converter critérios em asserções sempre que possível**: «cita pelo menos um documento» e «não promete reembolso acima de 500 MT sem aprovação» são verificáveis com código, não precisam de juiz. O juiz LLM fica para o que é mesmo semântico (a resposta está correcta, está completa) e é calibrado contra anotação humana. Os humanos ficam para calibrar, para os casos que o juiz marca como duvidosos e para descobrir modos de falha novos.',
        },
        {
          type: 'p',
          text: 'O online fecha o ciclo: é o único que mede o utilizador real, mas chega tarde e sem explicação. Cada falha online relevante volta como caso novo ao conjunto dourado — é assim que o conjunto acompanha o tráfego.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Onde corre cada uma',
          text: 'Asserções correm também em produção, como guardrails e métricas (taxa de JSON inválido, taxa de respostas sem citação). O dourado corre no CI. A revisão humana é um ritual semanal com dono. O online vive no dashboard e nos testes A/B.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Define success criteria and build evaluations', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
            { label: 'Langfuse — Evaluation overview', url: 'https://langfuse.com/docs/evaluation/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia as quatro camadas (código, dourado, humana, online) e o custo relativo de cada.',
          'Dá exemplos concretos de critérios verificáveis por código.',
          'Diz que o juiz LLM é calibrado contra humanos e não substitui a revisão.',
          'Explica que falhas online alimentam o conjunto dourado.',
        ],
        fraco: 'Fala só de «usar um LLM para avaliar» ou só de feedback dos utilizadores.',
        solido: 'Descreve as camadas com exemplos e diz quando corre cada uma.',
        excelente: 'Empurra critérios para asserções sempre que pode, diz o que cada camada não vê e fecha o ciclo online → dourado com um dono e uma cadência.',
      },
      seguimento: [
        'Que critérios do teu último sistema conseguiste passar para asserções?',
        'Quem faz a revisão humana e como evitas que deixe de acontecer?',
        'Quando é que um juiz LLM é pior do que uma regex?',
      ],
      sinaisAlarme: [
        'Usar um LLM para verificar se o output é JSON válido.',
        'Não ter nenhuma camada que veja o utilizador real.',
      ],
      modulos: ['avaliacao-fundamentos', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-avaliacao-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Construir um conjunto dourado do zero e decidir o tamanho',
      enunciado:
        'Entras numa equipa que tem um assistente para clientes de um banco móvel em produção há dois meses e nenhum conjunto de avaliação. Como constróis o conjunto dourado e com quantos casos?',
      minutos: 6,
      dica: 'De onde vêm as perguntas, como garantes que as raras estão lá, e que diferença queres conseguir ver.',
      resposta: [
        {
          type: 'p',
          text: 'Começo pelos **logs reais**, não por perguntas inventadas: amostro conversas dos dois meses, anonimizo, classifico por intenção e escolho por **estratificação**, com mínimos para as intenções raras mas graves. O tamanho decide-se pela diferença que quero detectar, e para a maioria das equipas isso dá **algumas centenas de casos**, não dezenas nem milhares.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Fontes', text: 'Conversas reais (a mais valiosa: erros ortográficos, português misturado com changana, perguntas a meio), casos de escalamento e reclamação, perguntas escritas pelo apoio a partir de cada política, e casos adversariais. Cada caso guarda a origem.' },
            { title: 'Estratificação', text: 'Por intenção (saldo, transferência falhada, limites, bloqueio de cartão, fraude) e por tipo (RAG, ferramenta, fora de âmbito, multi-turno). Intenções de risco, como fraude, têm um mínimo de 30–50 casos mesmo que sejam 3% do tráfego.' },
            { title: 'Casos difíceis', text: 'Pergunta ambígua que deve gerar clarificação, pergunta sem resposta no corpus que deve gerar recusa, política que mudou, duas intenções na mesma mensagem, tentativa de injection. É onde as regressões aparecem.' },
            { title: 'Anotação', text: 'Por quem conhece o domínio (apoio ao cliente, compliance), com guia escrito, e uma amostra anotada por duas pessoas para medir concordância. Se dois humanos discordam em 25% dos casos, o critério está mal definido.' },
            { title: 'Versão', text: 'JSONL no repositório, alterado por PR revisto, e cada corrida regista a versão do conjunto, do prompt e do modelo.' },
          ],
        },
        {
          type: 'p',
          text: 'Para o tamanho faço a conta ao contrário. O erro padrão de uma taxa é a raiz de p(1 − p)/n: com 240 casos e 85% de acerto, o IC a 95% é cerca de ±4,5 pontos; com 30 casos de uma intenção, ±13. Para detectar uma melhoria de 5 pontos com potência de 80%, comparando versões independentes, precisaria de ~1000 casos por versão; **emparelhando** no mesmo conjunto, se só ~10% dos casos mudam de resultado entre versões, bastam ~300.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Distribuição natural ou estratificada',
          text: 'Um conjunto estratificado dá uma média global que não é a do tráfego. Reporto por intenção e, se preciso de um número global, reponderto pelas frequências reais.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'Anthropic — Define success criteria and build evaluations', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Parte de tráfego real anonimizado e regista a origem de cada caso.',
          'Estratifica por intenção com mínimos para intenções raras e graves.',
          'Inclui explicitamente casos difíceis: ambíguos, sem resposta, fora de âmbito, adversariais.',
          'Calcula o tamanho a partir do erro padrão ou da diferença a detectar, e menciona o ganho do emparelhamento.',
          'Mede a concordância entre anotadores e versiona o conjunto.',
        ],
        fraco: 'Pede a um LLM 100 perguntas sobre os documentos e chama-lhe conjunto dourado.',
        solido: 'Usa logs reais, estratifica por intenção, inclui casos difíceis e dá um tamanho na ordem das centenas.',
        excelente: 'Justifica o tamanho com a conta do intervalo e da potência, distingue média estratificada de média do tráfego, e mede concordância entre anotadores antes de confiar nas etiquetas.',
      },
      seguimento: [
        'Como anonimizas conversas de um banco antes de as pôr num repositório?',
        'Quanto tempo de especialistas pedes e como o justificas?',
        'Quando é que retiras um caso do conjunto?',
      ],
      sinaisAlarme: [
        'Dizer um tamanho («100 perguntas chega») sem relação com a diferença a detectar.',
        'Só perguntas sintéticas, sem nenhuma vinda de utilizadores.',
        'Ignorar que intenções raras ficam com meia dúzia de casos.',
      ],
      modulos: ['avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-avaliacao-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Análise de erros: ler traços antes de escolher métricas',
      enunciado:
        'Tens 5 000 conversas por dia e uma taxa de satisfação a cair. Antes de escrever qualquer métrica, o que fazes com os traços?',
      minutos: 5,
      dica: 'Pensa em como um investigador qualitativo transforma notas soltas em categorias contáveis.',
      resposta: [
        {
          type: 'p',
          text: 'Leio traços. Amostro **50 a 100 conversas**, escrevo uma nota livre sobre a primeira coisa que correu mal em cada uma (*open coding*), agrupo as notas em categorias de falha (*axial coding*), conto quantas há de cada e só então decido que métricas e que evals criar. As métricas genéricas vêm depois, não antes.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Amostrar com intenção', text: 'Uma parte aleatória (para estimar frequências) e uma parte enviesada para onde dói: conversas com polegar para baixo, escaladas, longas, com reformulações.' },
            { title: 'Open coding', text: 'Para cada traço, uma frase sobre o primeiro erro a montante: «recuperou a política de 2024 em vez da de 2025», «não pediu o número da encomenda», «inventou um prazo». Sem categorias pré-definidas: o objectivo é descobrir o que não se sabia.' },
            { title: 'Taxonomia', text: 'Agrupar as notas em 5 a 10 categorias (recuperação errada, documento desactualizado, ferramenta não chamada, recusa indevida, tom) e contar. Repetir até deixarem de aparecer categorias novas — saturação, tipicamente ao fim de algumas dezenas de traços.' },
            { title: 'Priorizar', text: 'Frequência × gravidade × custo de corrigir. A categoria do topo ganha um avaliador dedicado (asserção ou juiz binário) e casos no conjunto dourado.' },
          ],
        },
        {
          type: 'p',
          text: 'Anotar o **primeiro** erro é importante: num pipeline, uma recuperação errada causa uma resposta errada, e contar as duas duplica o problema e esconde a causa. É o mesmo raciocínio de procurar a causa raiz num incidente.',
        },
        {
          type: 'p',
          text: 'Isto também protege contra métricas que não medem nada útil. Uma métrica de «helpfulness» de 1 a 5 aplicada a tudo dá um número, mas não diz que 40% das falhas são datas de entrega inventadas. Uma asserção «a resposta só menciona datas que estão na resposta da ferramenta» diz.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Quem lê',
          text: 'Alguém com conhecimento do domínio tem de ler connosco. O engenheiro vê o erro técnico; o especialista do apoio vê a resposta que está tecnicamente certa mas que um cliente não aceitaria.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Shankar et al. (2024) — Who Validates the Validators?', url: 'https://arxiv.org/abs/2404.12272' },
            { label: 'Langfuse — Evaluation overview', url: 'https://langfuse.com/docs/evaluation/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe ler uma amostra concreta de traços (dezenas a uma centena) antes de definir métricas.',
          'Descreve notas livres seguidas de agrupamento em categorias contadas.',
          'Anota o primeiro erro a montante para não contar a mesma falha duas vezes.',
          'Prioriza categorias por frequência e gravidade e transforma-as em avaliadores específicos.',
        ],
        fraco: 'Começa por ligar um pacote de métricas genéricas e olhar para a média.',
        solido: 'Amostra traços, categoriza falhas e cria evals para as mais frequentes.',
        excelente: 'Fala de saturação, de amostra aleatória mais amostra enviesada, do primeiro erro a montante, e envolve um especialista do domínio na leitura.',
      },
      seguimento: [
        'Como sabes que já leste traços suficientes?',
        'Podes usar um LLM para ajudar a agrupar as notas? Com que cuidado?',
        'Com que frequência repetes este exercício?',
      ],
      sinaisAlarme: [
        'Nunca ter lido traços de produção do próprio sistema.',
        'Escolher métricas porque vêm por omissão numa biblioteca.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-avaliacao-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Eval-driven development: quando começar e quanto investir',
      enunciado:
        'Estás a construir o primeiro protótipo de um assistente para uma seguradora. O gestor quer uma demo em duas semanas. Começas pelas evals ou pelo produto? Quanto investes em avaliação nesta fase?',
      minutos: 7,
      dica: 'O que é o equivalente mínimo de um teste a falhar quando ainda não há utilizadores?',
      resposta: [
        {
          type: 'p',
          text: 'Começo pelas duas coisas ao mesmo tempo, mas pequenas: no primeiro dia escrevo **20 a 30 casos** com o especialista e duas ou três asserções, e a partir daí cada mudança de prompt corre contra eles. Não construo uma plataforma de avaliação antes de ter um produto, mas também não itero no prompt às cegas.',
        },
        {
          type: 'p',
          text: 'Eval-driven development é o TDD aplicado a sistemas não determinísticos: **hipótese** («recusa perguntas sobre seguro automóvel porque o limiar de relevância está alto»), **caso que falha** no conjunto, **mudança pequena**, **corrida completa** contra a versão anterior, **decisão** escrita. A diferença para o TDD é que o teste não passa ou falha: a taxa sobe ou desce com ruído, e uma mudança que corrige um caso pode partir outros três.',
        },
        {
          type: 'compare',
          left: {
            title: 'Evals mínimas desde o dia 1',
            items: [
              'Cada iteração de prompt dá um número, não uma impressão.',
              'Os casos escritos com o especialista definem o que é «certo» antes da demo.',
              'Evita a regressão silenciosa: a versão da demo não parte o que já funcionava.',
              'Custo: um dia do especialista e meio dia de engenharia.',
            ],
          },
          right: {
            title: 'Produto primeiro, evals depois',
            items: [
              'Mais rápido para a primeira demo.',
              'Os critérios ainda não são conhecidos e mudam quando se vêem saídas reais.',
              'Risco: a demo é afinada para 5 perguntas e o número real fica desconhecido.',
              'Dívida que se paga mais caro: reconstruir o histórico de decisões sem dados.',
            ],
          },
        },
        {
          type: 'p',
          text: 'O investimento cresce com a exposição: protótipo, umas dezenas de casos e asserções; piloto interno, algumas centenas estratificadas, juiz calibrado e revisão semanal; produção com clientes, gate de CI, amostragem online e A/B. Os critérios **mudam** quando se começa a ver saídas reais — é esperado — e o conjunto deve evoluir com eles em vez de ser congelado cedo.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Quando não vale a pena',
          text: 'Um script interno de uso único ou uma ferramenta em que o humano lê sempre tudo antes de agir não justifica um conjunto de centenas de casos. O custo de errar decide o investimento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Shankar et al. (2024) — Who Validates the Validators? (deriva de critérios)', url: 'https://arxiv.org/abs/2404.12272' },
            { label: 'OpenAI — Evals guide', url: 'https://developers.openai.com/api/docs/guides/evals' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Dá um número concreto para a fase de protótipo (dezenas de casos, poucas asserções).',
          'Descreve o ciclo hipótese, caso que falha, mudança, corrida, decisão.',
          'Explica a diferença para o TDD: taxas com ruído e efeitos noutros casos.',
          'Faz o investimento crescer com a exposição e o custo de errar.',
          'Reconhece que os critérios mudam ao ver saídas reais.',
        ],
        fraco: '«Primeiro o produto, as evals vêm quando houver tempo» ou, no outro extremo, propor semanas de plataforma antes da primeira resposta.',
        solido: 'Começa com um conjunto pequeno e asserções, e explica o ciclo de EDD.',
        excelente: 'Liga o investimento ao risco e à fase, diz quando não vale a pena, e trata a deriva de critérios como parte do processo e não como falha.',
      },
      seguimento: [
        'Como convences o gestor de que o dia do especialista vale mais do que um dia de features?',
        'Que asserções escreverias para uma seguradora no primeiro dia?',
        'Como evitas que os 30 casos iniciais se tornem o único alvo da equipa?',
      ],
      sinaisAlarme: [
        'Iterar no prompt durante semanas sem nenhum caso fixo.',
        'Tratar a eval como algo que se faz uma vez antes do lançamento.',
      ],
      modulos: ['avaliacao-fundamentos', 'prompt-engineering'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-avaliacao-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Avaliação offline contra online: A/B e sinais implícitos',
      enunciado:
        'O teu novo prompt ganhou 4 pontos no conjunto dourado. Fazes deploy directo, fazes um A/B, ou outra coisa? Que sinais online usas num assistente de suporte onde quase ninguém dá feedback explícito?',
      minutos: 8,
      dica: 'Pensa no que o offline não pode ver e em quanto tráfego precisas para ver um efeito online.',
      resposta: [
        {
          type: 'p',
          text: 'Os 4 pontos offline dão-me licença para **expor a mudança a tráfego real com risco controlado**, não para declarar vitória. Faço canary com guardrails e, se o tráfego o permite, um A/B com uma métrica primária online definida antes. O offline diz que a mudança não partiu o que conheço; o online diz se ajuda os utilizadores que não conheço.',
        },
        {
          type: 'table',
          head: ['', 'Offline (conjunto dourado)', 'Online (tráfego real)'],
          rows: [
            ['Pergunta que responde', 'Esta versão é melhor nos casos que anotei?', 'Os utilizadores resolvem mais, escalam menos?'],
            ['Velocidade', 'Minutos, em cada PR', 'Dias a semanas para significância'],
            ['Causalidade', 'Exacta: mesmos casos, emparelhado', 'Exacta só com aleatorização (A/B)'],
            ['Cobertura', 'Só o que está no conjunto', 'Todo o tráfego, incluindo o que mudou'],
            ['Risco', 'Nenhum', 'Utilizadores reais expostos'],
          ],
        },
        {
          type: 'p',
          text: 'Como o feedback explícito é raro (polegares em poucos por cento das conversas, e enviesados para quem ficou zangado), uso **sinais implícitos**: taxa de **reformulação** (o utilizador repete a pergunta por outras palavras), **escalamento** para humano, **abandono** a meio, **recontacto** sobre o mesmo assunto em 48 h, e cliques nas citações. Cada um é um proxy com falhas: um escalamento pode ser bom (o assistente reconheceu o limite) e menos reformulações pode querer dizer que o utilizador desistiu.',
        },
        {
          type: 'p',
          text: 'Quanto tráfego preciso: se a taxa de escalamento é 20% e quero detectar 2 pontos de descida, com potência de 80% preciso de ~6 000 conversas por braço. Com 5 000 conversas por dia em 50/50, são uns três dias — e corro pelo menos uma semana completa para apanhar a sazonalidade semanal. Aleatorizo por **utilizador**, não por pedido, para que a mesma pessoa não veja duas versões.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Olhar todos os dias e parar quando dá significativo',
          text: 'Espreitar o p-valor diariamente e parar no primeiro dia abaixo de 0,05 infla muito os falsos positivos. Fixo a duração antes, ou uso um método sequencial desenhado para isso.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Langfuse — Evaluation overview (offline e online)', url: 'https://langfuse.com/docs/evaluation/overview' },
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue o que o offline e o online respondem e não trata um como substituto do outro.',
          'Propõe canary ou A/B com métrica primária definida antes.',
          'Enumera sinais implícitos (reformulação, escalamento, abandono, recontacto) e uma falha de cada.',
          'Estima o tráfego necessário e a duração mínima do teste.',
          'Aleatoriza por utilizador e evita parar o teste ao primeiro resultado significativo.',
        ],
        fraco: 'Faz deploy porque o número offline subiu, ou propõe medir só polegares.',
        solido: 'Usa canary ou A/B com escalamento e reformulações como métricas.',
        excelente: 'Faz a conta do tráfego, discute as falhas de cada proxy, aleatoriza por utilizador, fixa a duração e define guardrails que abortam o teste.',
      },
      seguimento: [
        'E se o tráfego for 200 conversas por dia?',
        'Como detectas automaticamente uma reformulação?',
        'O A/B sobe a resolução mas também o custo por conversa em 30%. Como decides?',
      ],
      sinaisAlarme: [
        'Achar que o conjunto dourado prova o efeito no utilizador.',
        'Aleatorizar por pedido numa conversa multi-turno.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-avaliacao-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Overfitting ao conjunto dourado',
      enunciado:
        'Há seis meses que a equipa itera contra o mesmo conjunto de 300 perguntas. O número subiu de 71% para 93%, mas a satisfação dos utilizadores quase não mexeu. O que achas que aconteceu e como organizas a avaliação para não voltar a acontecer?',
      minutos: 8,
      dica: 'Lembra-te de porque é que em ML se separa validação de teste.',
      resposta: [
        {
          type: 'p',
          text: 'A equipa **sobre-ajustou ao conjunto**: cada decisão foi tomada a olhar para os mesmos 300 casos, e o prompt, os limiares e até os exemplos few-shot foram moldados para eles. O número passou a medir «quão bem conhecemos estas 300 perguntas» e deixou de estimar o desempenho no tráfego. É a lei de Goodhart aplicada às evals.',
        },
        {
          type: 'p',
          text: 'Os sinais típicos: exemplos few-shot no prompt quase iguais a casos do conjunto; regras do tipo «se perguntarem X, responde Y» que correspondem a casos que falhavam; limiares afinados a três casas decimais; e o número a subir enquanto a amostra de tráfego novo avaliada da mesma forma fica parada.',
        },
        {
          type: 'table',
          head: ['Medida', 'O que resolve', 'Custo'],
          rows: [
            ['Separar desenvolvimento e teste', 'O conjunto de teste só se corre no gate de release, a equipa não lê os casos falhados', 'Duplica a anotação; exige disciplina'],
            ['Renovação mensal com tráfego novo', 'O conjunto acompanha a distribuição real', 'Anotação contínua, 30–50 casos por mês'],
            ['Avaliar uma amostra fresca de produção', 'Estima o desempenho fora do conjunto', 'Juiz calibrado ou revisão humana'],
            ['Proibir casos do conjunto no prompt', 'Evita fuga directa', 'Regra de revisão de PR'],
          ],
        },
        {
          type: 'p',
          text: 'Organizo três conjuntos: **desenvolvimento** (a equipa lê, depura, itera), **teste** (retido, só o número agregado é visível, rotação parcial a cada trimestre) e uma **amostra semanal de produção** anotada. O indicador de saúde é a distância entre desenvolvimento e produção: se o primeiro sobe e o segundo não, estamos a ajustar ao conjunto.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Retido não é eterno',
          text: 'Cada vez que uma decisão é tomada com base no conjunto de teste, ele perde um pouco de independência. Conto quantas vezes foi usado para decidir e renovo-o antes que deixe de ser informativo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — Cross-validation: evaluating estimator performance', url: 'https://scikit-learn.org/stable/modules/cross_validation.html' },
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica sobre-ajuste ao conjunto e não culpa a métrica de satisfação.',
          'Dá sinais concretos (few-shot parecido com casos, regras específicas, limiares afinados).',
          'Propõe separação desenvolvimento e teste com teste retido.',
          'Propõe renovação contínua com tráfego real e avaliação de amostras frescas.',
          'Define um indicador para detectar a divergência no futuro.',
        ],
        fraco: 'Diz que a satisfação é uma métrica má e que o conjunto está certo.',
        solido: 'Explica o sobre-ajuste e propõe conjunto de teste retido e renovação.',
        excelente: 'Desenha os três conjuntos com regras de acesso, mede a distância entre desenvolvimento e produção, e trata o desgaste do conjunto de teste como recurso finito.',
      },
      seguimento: [
        'Quem decide quando um caso do teste passa para desenvolvimento?',
        'Como justificas ao negócio o custo de anotar continuamente?',
        'E se o próprio conjunto tiver referências erradas que a equipa corrigiu no prompt?',
      ],
      sinaisAlarme: [
        'Colar casos do conjunto dourado como exemplos few-shot.',
        'Celebrar 93% sem nenhuma medida fora do conjunto.',
      ],
      modulos: ['avaliacao-fundamentos', 'engenharia-ia'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-avaliacao-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Evals como gate de CI quando a métrica tem ruído',
      enunciado:
        'Queres que nenhum PR baixe a qualidade do assistente. Como desenhas o gate de avaliação no CI sem que ele bloqueie PRs bons por ruído nem deixe passar regressões?',
      minutos: 8,
      dica: 'Separa o que é determinístico do que é estatístico, e pensa no custo de cada tipo de erro do gate.',
      resposta: [
        {
          type: 'p',
          text: 'Divido o gate em dois níveis. As **asserções determinísticas** (esquema, ferramentas proibidas, citações válidas, casos de segurança) bloqueiam sempre, sem tolerância. As **métricas com ruído** bloqueiam só quando a **diferença emparelhada** contra a versão em produção é negativa para além do ruído, medida **por intenção**, e não quando a média cai 0,5 pontos.',
        },
        {
          type: 'p',
          text: 'Um limiar absoluto («acerto ≥ 85%») é frágil: com 240 casos o próprio sistema oscila alguns pontos entre corridas, e um PR que não toca no prompt pode chumbar. Prefiro: corro baseline e candidato no mesmo conjunto, calculo o IC da diferença por bootstrap emparelhado, e bloqueio se o limite superior do IC estiver abaixo de −2 pontos (regressão provável) ou se uma intenção crítica descer mais do que a tolerância dela. Entre esses extremos, o PR passa com aviso e o relatório vai no comentário.',
        },
        {
          type: 'table',
          head: ['Decisão', 'Opção A', 'Opção B'],
          rows: [
            ['Quando corre', 'Em cada PR: feedback rápido, custo por PR', 'Só quando toca em prompt, modelo, retriever ou dados: mais barato, exige mapear dependências'],
            ['Conjunto', 'Subconjunto rápido de ~50 casos no PR', 'Conjunto completo à noite e antes de release'],
            ['Ruído do modelo', 'Temperatura 0 e cache de respostas do baseline', 'Repetir cada caso 3 vezes e usar a média por caso'],
            ['Juiz', 'Juiz fixo e versionado, calibrado contra humanos', 'Mudar o juiz é uma mudança que também passa no gate'],
          ],
        },
        {
          type: 'p',
          text: 'Os dois erros custam coisas diferentes. Um falso bloqueio custa tempo e, pior, ensina a equipa a ignorar o gate ou a re-correr até passar. Uma regressão que passa custa clientes. Por isso meço a taxa de falsos bloqueios: corro o gate com baseline contra baseline (sem mudança nenhuma) várias vezes e verifico que quase nunca bloqueia. Se bloqueia, o gate está demasiado apertado.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Re-correr até ficar verde',
          text: 'Se a política permite re-correr o job de eval até passar, o gate deixa de existir. Fixo a seed do bootstrap, guardo as respostas do baseline e registo cada corrida.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'GitHub Actions — documentação', url: 'https://docs.github.com/en/actions' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa asserções determinísticas (bloqueio duro) de métricas estatísticas (bloqueio por IC).',
          'Compara candidato e baseline com diferença emparelhada em vez de limiar absoluto.',
          'Aplica o gate por intenção, com tolerâncias diferentes para intenções críticas.',
          'Mede a taxa de falsos bloqueios com corridas baseline contra baseline.',
          'Trata o custo e a duração do job (subconjunto no PR, completo à noite).',
        ],
        fraco: 'Um limiar fixo na média global, sem falar de ruído.',
        solido: 'Asserções bloqueantes, comparação com baseline e tolerância por intenção.',
        excelente: 'Calibra o gate com baseline contra baseline, controla a versão do juiz como dependência, e desenha a política para impedir re-corridas até passar.',
      },
      seguimento: [
        'Quanto custa correr o conjunto completo por PR e quem paga?',
        'O fornecedor actualiza o modelo e o baseline muda. O que fazes ao gate?',
        'Como lidas com um PR que melhora uma intenção e piora outra?',
      ],
      sinaisAlarme: [
        'Gate com limiar absoluto na média e re-corrida livre.',
        'Usar o mesmo LLM como gerador e juiz sem calibração.',
      ],
      modulos: ['ci-cd', 'avaliacao-fundamentos', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-avaliacao-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'IC por bootstrap da diferença emparelhada entre dois sistemas',
      enunciado:
        'Tens os resultados de dois sistemas nas mesmas 200 perguntas, 1 se acertou e 0 se falhou. Escreve uma função que devolve a diferença média e um intervalo de confiança a 95% por bootstrap, reprodutível.',
      contexto:
        'Assinatura pedida: `bootstrap_diferenca_emparelhada(a, b, n_reamostras=10_000, confianca=0.95, semente=42) -> tuple[float, float, float]`, devolvendo (diferença observada b − a, limite inferior, limite superior). Só biblioteca padrão. Exemplo: A acerta 160 das 200; B ganha em 20 casos onde A falhou e perde em 8 onde A acertou.',
      minutos: 20,
      dica: 'Qual é a unidade que reamostras: o sistema ou a pergunta?',
      resposta: [
        {
          type: 'p',
          text: 'Reamostro **a pergunta**, não cada sistema separadamente: calculo a diferença por pergunta `b[i] − a[i]`, reamostro esse vector com reposição muitas vezes e tiro os percentis 2,5 e 97,5 das médias. Complexidade O(R × n), com R reamostras; com R = 10 000 e n = 200 corre em menos de um segundo em Python puro.',
        },
        {
          type: 'code',
          lang: 'python',
          code: `import random
from collections.abc import Sequence


def bootstrap_diferenca_emparelhada(
    a: Sequence[float],
    b: Sequence[float],
    n_reamostras: int = 10_000,
    confianca: float = 0.95,
    semente: int = 42,
) -> tuple[float, float, float]:
    """Diferença média b - a no MESMO conjunto, com IC por bootstrap de percentis.

    a[i] e b[i] são os scores dos dois sistemas na pergunta i (0/1 ou contínuos).
    Reamostra-se a PERGUNTA (o par), não cada sistema em separado.
    """
    if len(a) != len(b):
        raise ValueError("os dois sistemas têm de ser avaliados nas mesmas perguntas")
    n = len(a)
    if n == 0:
        raise ValueError("conjunto vazio")
    if not 0 < confianca < 1:
        raise ValueError("confianca tem de estar em ]0, 1[")
    if n_reamostras < 100:
        raise ValueError("poucas reamostras para estimar percentis")

    diffs = [y - x for x, y in zip(a, b)]          # diferença por pergunta
    observada = sum(diffs) / n
    rng = random.Random(semente)                    # reprodutível
    medias = []
    for _ in range(n_reamostras):
        amostra = rng.choices(diffs, k=n)           # com reposição
        medias.append(sum(amostra) / n)
    medias.sort()
    alfa = 1 - confianca
    lo = medias[int((alfa / 2) * n_reamostras)]
    hi = medias[int((1 - alfa / 2) * n_reamostras) - 1]
    return observada, lo, hi


if __name__ == "__main__":
    # 200 perguntas: A acerta 160 (80%). B ganha em 20 casos e perde em 8.
    a = [1] * 160 + [0] * 40
    b = [1] * 152 + [0] * 8 + [1] * 20 + [0] * 20
    obs, lo, hi = bootstrap_diferenca_emparelhada(a, b)
    print(f"A={sum(a)/len(a):.3f} B={sum(b)/len(b):.3f}")
    print(f"diferença={obs:+.3f}  IC95%=[{lo:+.3f}, {hi:+.3f}]")
    # A=0.800 B=0.860
    # diferença=+0.060  IC95%=[+0.010, +0.110]

    # Sem emparelhar (ERRADO aqui): reamostrar cada sistema à parte
    rng = random.Random(42)
    ms = sorted(sum(rng.choices(b, k=200)) / 200 - sum(rng.choices(a, k=200)) / 200
                for _ in range(10_000))
    print(f"não emparelhado: IC95%=[{ms[250]:+.3f}, {ms[9749]:+.3f}]")
    # não emparelhado: IC95%=[-0.015, +0.130]`,
        },
        {
          type: 'p',
          text: 'O exemplo mostra porque é que o emparelhamento importa: a mesma diferença de +6 pontos tem IC [+1,0; +11,0] emparelhado, que exclui zero, e [−1,5; +13,0] se reamostrar os sistemas à parte, que não exclui. As 172 perguntas em que os dois concordam não têm variância na diferença; o emparelhamento aproveita isso.',
        },
        {
          type: 'p',
          text: '**Casos-limite**: listas de tamanhos diferentes (erro, não truncar em silêncio, porque significa que se avaliaram conjuntos diferentes); conjunto vazio; diferença constante, em que o IC colapsa num ponto. **Teste**: `a == b` devolve (0, 0, 0); com `a` todo 0 e `b` todo 1 devolve (1, 1, 1); mesma semente dá o mesmo resultado.',
        },
        {
          type: 'p',
          text: '**Extensões** que costumam pedir: um p-valor (fracção das reamostras com média ≤ 0, ou o teste de McNemar sobre os 20 e os 8 casos discordantes); bootstrap estratificado por intenção para não mudar a mistura; agrupar por conversa quando há várias perguntas da mesma conversa (bootstrap por cluster); e vectorizar com NumPy quando n e R crescem.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Python — random.Random e choices', url: 'https://docs.python.org/3/library/random.html' },
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Reamostra pares (diferenças por pergunta), não cada sistema independentemente.',
          'Usa um gerador com semente local (random.Random) em vez do estado global.',
          'Calcula os percentis com índices correctos e valida entradas (tamanhos, vazio, confiança).',
          'Explica porque é que o IC emparelhado é mais estreito e interpreta se exclui zero.',
          'Propõe testes com resultado conhecido e uma extensão (McNemar, estratificação ou cluster).',
        ],
        fraco: 'Calcula dois intervalos separados e compara se se sobrepõem, ou usa random.seed global sem validar entradas.',
        solido: 'Implementa o bootstrap emparelhado correcto, reprodutível, com casos-limite.',
        excelente: 'Mostra a diferença numérica entre emparelhado e não emparelhado, menciona McNemar e bootstrap por cluster quando as perguntas não são independentes.',
      },
      seguimento: [
        'Como adaptas isto se cada pergunta for corrida 3 vezes por sistema?',
        'Qual é o p-valor do teste de McNemar com 20 e 8 discordâncias?',
        'O que muda se o score for contínuo, de 0 a 1, dado por um juiz?',
      ],
      sinaisAlarme: [
        'Reamostrar cada sistema à parte quando foram avaliados nas mesmas perguntas.',
        'Truncar com zip listas de tamanhos diferentes sem erro.',
      ],
      modulos: ['avaliacao-fundamentos', 'avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-avaliacao-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A métrica online piora e a offline está estável',
      enunciado:
        'Há três semanas que a taxa de escalamento para humano sobe, de 14% para 19%. Corres o conjunto dourado todas as noites e está estável em 87%, e ninguém mexeu no prompt. O que se passa e como investigas?',
      contexto:
        'Farmácia online em Portugal, assistente de encomendas e receitas, cerca de 3 000 conversas por dia. Conjunto dourado de 280 perguntas construído há cinco meses. Os traços guardam intenção classificada, documentos recuperados, ferramentas chamadas, versão do modelo e canal (web ou app).',
      minutos: 12,
      dica: 'Se o sistema não mudou e o conjunto diz que está igual, o que é que pode ter mudado?',
      resposta: [
        {
          type: 'p',
          text: 'A hipótese mais provável é que **o tráfego mudou e o conjunto não**: o dourado mede bem o que mede, mas deixou de representar o que os clientes perguntam agora. As alternativas, por ordem de probabilidade × custo de verificar, são uma mudança fora do prompt (modelo actualizado pelo fornecedor, corpus, ferramenta), uma mudança no próprio sinal (regra de escalamento, canal novo) e só depois uma degradação real do modelo.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Decompor o sinal', text: 'Escalamento por intenção, por canal e por dia. Se a subida está concentrada numa intenção ou num canal, já tenho metade da resposta. Comparo também a mistura de intenções destas três semanas com a do conjunto dourado.' },
            { title: 'Verificar o que mudou à volta', text: 'Versão do modelo nos traços (um alias que aponta para um snapshot novo), deploys de outras equipas (API de stock, catálogo), documentos novos ou retirados do índice, alterações à regra que dispara o escalamento ou ao botão na app.' },
            { title: 'Ler conversas escaladas', text: 'Amostro 50 conversas escaladas desta semana e 50 de há um mês, e faço a mesma análise de erros: qual é o primeiro ponto em que falha. Procuro intenções que não existem no conjunto.' },
            { title: 'Medir o conjunto contra o tráfego', text: 'Corro o avaliador sobre uma amostra fresca de 100–200 conversas recentes, com o mesmo juiz. Se o acerto nessa amostra é muito menor do que os 87% do dourado, está confirmado que o conjunto envelheceu.' },
          ],
        },
        {
          type: 'p',
          text: 'Um cenário típico: entrou em vigor uma alteração às regras de receitas ou chegou a época da gripe, e muitas perguntas passaram a ser sobre um processo que o corpus não cobre ou cobre com documentos antigos. O assistente recusa ou responde vagamente, o cliente pede humano. O dourado de há cinco meses quase não tem essas perguntas, por isso continua nos 87%.',
        },
        {
          type: 'p',
          text: 'Correcção: actualizar o corpus e as ferramentas para a intenção nova, adicionar 30–50 casos dela ao conjunto (anotados com a farmácia), e verificar o efeito no escalamento por intenção. Se o problema foi um snapshot novo do modelo, fixo a versão explícita e trato a mudança de modelo como um PR que passa no gate.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir que volte',
          text: 'Um alarme de deriva de intenções (distribuição semanal contra a do conjunto), renovação mensal do conjunto com tráfego recente, avaliação semanal de uma amostra fresca de produção, e a versão do modelo e do índice registadas em cada traço e em cada corrida de eval.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Langfuse — Evaluation overview (offline e online)', url: 'https://langfuse.com/docs/evaluation/overview' },
            { label: 'OpenTelemetry — Traces', url: 'https://opentelemetry.io/docs/concepts/signals/traces/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Suspeita primeiro da representatividade do conjunto e não do modelo.',
          'Decompõe o sinal online por intenção, canal e tempo antes de mexer em código.',
          'Verifica mudanças à volta do sistema: snapshot do modelo, corpus, ferramentas, regra de escalamento.',
          'Confirma com uma amostra fresca de produção avaliada com o mesmo juiz.',
          'Propõe alarme de deriva e renovação periódica do conjunto.',
        ],
        fraco: 'Conclui que o modelo piorou e propõe trocar de modelo, ou diz que o escalamento é ruído porque o dourado está estável.',
        solido: 'Decompõe por intenção, encontra a intenção nova e acrescenta-a ao conjunto e ao corpus.',
        excelente: 'Ordena as hipóteses por custo de verificar, mede a distância entre dourado e tráfego com uma amostra fresca, e institucionaliza a detecção de deriva e a versão do modelo nos traços.',
      },
      seguimento: [
        'Como detectarias deriva de intenções sem um classificador de intenção?',
        'E se a subida fosse igual em todas as intenções?',
        'Quem é dono da renovação do conjunto?',
      ],
      sinaisAlarme: [
        'Confiar no dourado contra o sinal de produção sem investigar.',
        'Mudar o prompt antes de saber onde a subida está concentrada.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },
  ],
};
