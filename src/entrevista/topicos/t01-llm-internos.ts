import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'llm-internos',
  numero: 1,
  bloco: 'llm',
  titulo: 'Como um LLM funciona por dentro',
  resumo:
    'Tokenização, embeddings e posição, atenção, geração autoregressiva, KV cache, janela de contexto, MoE e as fases de treino — o mecanismo ao nível que um AI engineer aplicado precisa para prever custo, latência e modos de falha.',
  icon: '🧠',
  modulos: ['como-funciona-llm', 'custo-escala', 'escolher-modelo'],
  essencial: [
    'Um LLM gera um token de cada vez, condicionado em todos os anteriores; não consulta uma base de factos.',
    'BPE: funde os pares mais frequentes do corpus do tokenizador. O que é raro (português, nomes, IDs, dígitos) custa mais tokens por carácter.',
    'Atenção: softmax(QKᵀ/√d)V. Divide-se por √d porque a variância do produto interno cresce com d e satura o softmax.',
    'O custo de QKᵀ é O(n²·d) no comprimento n; o FlashAttention reduz a memória para O(n), não os FLOPs.',
    'Prefill processa o prompt em paralelo e é limitado por computação (manda no TTFT); decode gera um token por passo e é limitado por largura de banda de memória (manda nos tokens/s).',
    'KV cache por token = 2 × camadas × cabeças KV × dim. da cabeça × bytes. Modelo de ~8B com GQA em fp16: ≈ 128 KiB/token, ≈ 4 GiB para 32 k tokens.',
    'Lost in the middle: a informação no meio de um contexto longo é usada pior do que a das pontas (Liu et al., 2023). Janela anunciada não é janela útil.',
    'MoE: parâmetros totais pagam memória; parâmetros activos por token pagam computação. Um MoE é mais barato por token, não mais leve de alojar.',
    'Pré-treino dá língua e factos frequentes; SFT dá formato e seguir instruções; RLHF/DPO dá preferências (e também bajulação e excesso de confiança).',
    'Contar tokens sempre com o tokenizador do modelo ou com o `usage` da resposta, nunca com «4 caracteres por token».',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-llm-internos-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque é que o modelo não sabe quantos «r» tem uma palavra',
      enunciado:
        'Explica-me como funciona a tokenização BPE. E já agora: porque é que um modelo enorme falha a contar as letras de uma palavra, e porque é que o mesmo texto custa mais em português do que em inglês?',
      minutos: 4,
      dica: 'O que é que o modelo recebe à entrada: caracteres ou outra coisa?',
      resposta: [
        {
          type: 'p',
          text: 'O modelo nunca vê caracteres: vê **ids de tokens**, e um token é tipicamente um pedaço de palavra. Contar letras exige informação que a tokenização apagou, e o custo depende de quão frequente o texto era no corpus em que o tokenizador foi treinado — por isso português, nomes próprios e números saem mais caros.',
        },
        {
          type: 'p',
          text: 'O **Byte-Pair Encoding** treina-se antes do modelo: parte o corpus em bytes, conta os pares adjacentes, funde o mais frequente num símbolo novo e repete dezenas de milhares de vezes. O resultado é um vocabulário de dezenas a centenas de milhares de entradas e uma lista ordenada de fusões. Para tokenizar texto novo aplicam-se as fusões por essa ordem. Palavras frequentes ficam um token; palavras raras partem-se em pedaços. É determinista e congelado: o tokenizador não aprende com o teu domínio.',
        },
        {
          type: 'list',
          items: [
            '**Contar letras:** «morango» pode ser dois tokens, e o embedding de cada um não tem uma representação explícita das letras. O modelo só acerta se viu exemplos parecidos no treino. Se a tarefa precisa de caracteres, dá-a a código (uma ferramenta), não ao modelo.',
            '**Português:** os tokenizadores comerciais são treinados com predominância de inglês. Prosa inglesa anda nos ≈ 4 caracteres por token; o português das políticas de uma empresa nos ≈ 3,5 a 4; nomes em changana nos ≈ 2 (ordens de grandeza de 2025–2026, variam por tokenizador).',
            '**Números e identificadores:** muitos tokenizadores agrupam dígitos em blocos de até 3 ou partem-nos um a um. Um `PD-8841273` vale vários tokens, e aritmética sobre números partidos em blocos arbitrários é frágil.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'A regra dos 4 caracteres',
          text: 'Vem de exemplos em inglês. Em português com IDs e JSON subestima o custo e deixa passar prompts que não cabem na janela. Em produção conto com o tokenizador do modelo, ou com o `usage` que a API devolve, e registo tokens de entrada e saída em cada chamada.',
        },
        {
          type: 'p',
          text: 'Consequência prática: a métrica de custo, a de latência e o limite da janela contam-se todas nesta unidade, por isso um produto para o mercado lusófono deve medir o rácio caracteres/token no seu próprio tráfego, não no exemplo do fornecedor.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Sennrich, Haddow e Birch — Neural Machine Translation of Rare Words with Subword Units (2015)', url: 'https://arxiv.org/abs/1508.07909' },
            { label: 'Hugging Face — resumo dos tokenizadores', url: 'https://huggingface.co/docs/transformers/tokenizer_summary' },
            { label: 'Petrov et al. — Language Model Tokenizers Introduce Unfairness Between Languages (2023)', url: 'https://arxiv.org/abs/2305.15425' },
            { label: 'tiktoken', url: 'https://github.com/openai/tiktoken' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o modelo recebe ids de tokens (subpalavras), não caracteres.',
          'Descreve o treino do BPE: fundir repetidamente o par adjacente mais frequente.',
          'Liga o custo por carácter à frequência no corpus do tokenizador (português, nomes, dígitos).',
          'Propõe tirar ao modelo tarefas ao nível do carácter ou da aritmética (código ou ferramenta).',
          'Diz que se conta com o tokenizador do modelo ou com o `usage`, não com uma regra fixa.',
        ],
        fraco: '«O modelo ainda não é suficientemente inteligente para contar letras», sem mencionar tokens.',
        solido: 'Explica BPE, que o modelo vê subpalavras e porque é que português e números custam mais tokens.',
        excelente: 'Quantifica caracteres por token por tipo de texto, liga isso a custo e a limites de janela, e tira do modelo o que é contagem ou cálculo, medindo o rácio no tráfego real.',
      },
      seguimento: [
        'Que impacto tem a tokenização na pesquisa por códigos de produto num RAG?',
        'Se trocares de fornecedor, o que muda no teu orçamento sem mudares o prompt?',
        'Porque é que tokenizar ao nível do byte evita tokens desconhecidos?',
      ],
      sinaisAlarme: [
        'Dizer que o modelo «lê palavras».',
        'Estimar custo com «um token é uma palavra».',
        'Propor afinar o modelo para ele aprender a contar letras.',
      ],
      modulos: ['como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-llm-internos-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Embeddings de token e informação de posição',
      enunciado:
        'Depois de tokenizar, o que acontece a cada token antes da primeira camada de atenção? E como é que o modelo sabe a ordem das palavras, se a atenção por si só não a vê?',
      minutos: 4,
      dica: 'O que acontece ao resultado da atenção se baralhares a ordem das chaves e dos values?',
      resposta: [
        {
          type: 'p',
          text: 'Cada id de token é trocado por um vector aprendido numa tabela `vocabulário × dimensão` — o **embedding do token**, igual em qualquer contexto. A ordem entra por uma **codificação de posição**, porque a atenção sem ela é invariante a permutações: trata a sequência como um conjunto.',
        },
        {
          type: 'p',
          text: 'O embedding de « pedido» é o mesmo em «o pedido chegou» e em «fiz um pedido de reembolso»; são as camadas seguintes que o tornam contextual. Não confundir com os embeddings de texto usados em pesquisa, que saem de um modelo treinado para representar uma frase inteira.',
        },
        {
          type: 'p',
          text: 'O transformer original somava ao embedding um vector sinusoidal fixo por posição absoluta. A maioria dos LLMs abertos recentes usa **RoPE** (*rotary position embedding*): em vez de somar, roda os vectores de query e de key, aos pares de dimensões, por um ângulo proporcional à posição, com frequências diferentes por par. O produto interno entre uma query na posição m e uma key na posição n passa a depender só de m − n, ou seja, a atenção vê **posição relativa** sem nenhum parâmetro extra.',
        },
        {
          type: 'table',
          head: ['Esquema', 'Como entra a posição', 'O que implica'],
          rows: [
            ['Absoluta aprendida', 'Tabela de vectores por posição, somada', 'Não generaliza além do comprimento de treino'],
            ['Sinusoidal', 'Vector fixo de senos e cossenos, somado', 'Sem parâmetros; extrapola mal na prática'],
            ['RoPE', 'Rotação de Q e K pela posição', 'Relativa; permite estender a janela com interpolação (ex.: Position Interpolation, YaRN) e algum treino extra'],
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Porque é que isto interessa a quem constrói produtos',
          text: 'Quando um modelo anuncia uma janela muito maior do que aquela em que foi pré-treinado, é quase sempre RoPE esticado e afinado com poucos dados longos. A janela «cabe», mas a qualidade a grandes distâncias tem de ser medida no teu caso, não presumida.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Su et al. — RoFormer: Rotary Position Embedding (2021)', url: 'https://arxiv.org/abs/2104.09864' },
            { label: 'Vaswani et al. — Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762' },
            { label: 'Chen et al. — Extending Context Window via Positional Interpolation (2023)', url: 'https://arxiv.org/abs/2306.15595' },
            { label: 'Peng et al. — YaRN (2023)', url: 'https://arxiv.org/abs/2309.00071' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o embedding de token é uma consulta numa tabela aprendida e não depende do contexto.',
          'Explica que a atenção sem posição é invariante a permutações.',
          'Descreve o RoPE como rotação de Q e K que torna o produto interno dependente da posição relativa.',
          'Liga RoPE à extensão de janela e à necessidade de medir a qualidade em contexto longo.',
        ],
        fraco: 'Confunde embeddings de token com embeddings de frase para pesquisa, ou não sabe como entra a ordem.',
        solido: 'Explica a tabela de embeddings, a invariância a permutações e o RoPE como posição relativa.',
        excelente: 'Acrescenta porque é que janelas esticadas por interpolação degradam a longas distâncias e diz como o validaria no seu caso (testes com informação a profundidades diferentes).',
      },
      seguimento: [
        'Se o embedding é igual em todos os contextos, onde é que «banco» passa a significar instituição ou assento?',
        'Como testarias se um modelo usa mesmo os 200 k tokens que anuncia?',
        'Porque é que as rotações do RoPE usam frequências diferentes por par de dimensões?',
      ],
      sinaisAlarme: [
        'Achar que o modelo sabe a ordem «porque lê da esquerda para a direita».',
        'Dizer que os embeddings de token são os mesmos que se guardam na base vectorial.',
        'Tratar a janela anunciada como garantia de qualidade.',
      ],
      modulos: ['como-funciona-llm', 'embeddings'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-llm-internos-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'A fórmula da atenção, o √d e o custo quadrático',
      enunciado:
        'Escreve-me a fórmula da self-attention e diz o que faz cada termo. Porque é que se divide por raiz de d? E quanto custa, em função do comprimento da sequência?',
      minutos: 5,
      dica: 'Pensa na variância de um produto interno entre dois vectores aleatórios de dimensão d.',
      resposta: [
        {
          type: 'p',
          text: '`Attention(Q, K, V) = softmax(QKᵀ / √d_k + M) V`. Cada posição compara a sua query com as keys de todas as posições visíveis, normaliza as semelhanças com softmax e devolve a média pesada dos values. Divide-se por √d_k para o softmax não saturar, e o custo é **quadrático no comprimento**: O(n²·d) em tempo e, numa implementação ingénua, O(n²) em memória.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Q, K, V', def: 'Projecções lineares aprendidas da mesma sequência (n × d_k). Q é «o que procuro», K «o que ofereço para ser encontrado», V «o que entrego se me escolherem».' },
            { term: 'QKᵀ', def: 'Matriz n × n de produtos internos: quanto cada posição (linha) se interessa por cada outra (coluna).' },
            { term: 'M', def: 'Máscara causal com −∞ acima da diagonal: nenhuma posição vê tokens futuros. É o que permite o KV cache.' },
            { term: 'softmax por linha', def: 'Cada linha passa a somar 1; a saída é uma combinação convexa dos values.' },
          ],
        },
        {
          type: 'p',
          text: '**Porquê √d_k:** se as componentes de q e k forem independentes com média 0 e variância 1, o produto interno tem variância d_k. Com d_k = 128, os scores têm desvio-padrão ≈ 11; o softmax fica quase one-hot e os gradientes ficam quase nulos. Dividir por √d_k devolve a variância a ≈ 1. É o argumento do artigo original.',
        },
        {
          type: 'p',
          text: '**Custo:** para n = 32 k, a matriz de scores tem ≈ 10⁹ entradas por cabeça e por camada. O FlashAttention calcula a atenção por blocos sem materializar essa matriz — a memória passa a O(n) e o tempo de parede desce muito porque se evitam leituras à memória da GPU —, mas os FLOPs continuam O(n²). Na prática, em prompts curtos o custo é dominado pelas camadas feed-forward e pelas projecções (≈ 2 × parâmetros FLOPs por token); o termo quadrático passa a pesar nos contextos longos.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que isto muda em produção',
          text: 'Duplicar o contexto mais do que duplica o trabalho de prefill em contextos longos, por isso o TTFT cresce mais depressa do que o prompt. É uma das razões por que corto contexto irrelevante antes de pensar em modelos mais rápidos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Vaswani et al. — Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762' },
            { label: 'Dao et al. — FlashAttention (2022)', url: 'https://arxiv.org/abs/2205.14135' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve softmax(QKᵀ/√d)V correctamente, com a máscara causal num LLM de descodificador.',
          'Justifica o √d pela variância do produto interno que cresce com d e satura o softmax.',
          'Diz que o custo é O(n²) no comprimento da sequência.',
          'Distingue o que o FlashAttention melhora (memória, I/O) do que não muda (FLOPs quadráticos).',
        ],
        fraco: 'Escreve a fórmula sem saber explicar o √d, ou diz que a atenção é linear.',
        solido: 'Fórmula correcta, papel de Q, K e V, √d pela variância, custo quadrático.',
        excelente: 'Acrescenta que em prompts curtos domina o feed-forward, que o FlashAttention não muda a complexidade em FLOPs, e liga o termo quadrático ao TTFT em produção.',
      },
      seguimento: [
        'Para que servem as várias cabeças de atenção, em vez de uma só com dimensão maior?',
        'O que muda na fórmula durante o decode, com KV cache?',
        'Conheces alguma alternativa sub-quadrática e o que se perde com ela?',
      ],
      sinaisAlarme: [
        'Dizer que se divide por d «para normalizar», sem saber porquê.',
        'Achar que o FlashAttention torna a atenção linear.',
        'Não saber o que é a máscara causal.',
      ],
      modulos: ['como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-llm-internos-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Prefill vs decode: porque TTFT e tokens/s são métricas diferentes',
      enunciado:
        'O teu dashboard tem «latência do modelo» num só histograma. Porque é que isso esconde problemas? Explica as duas fases da geração e o que limita cada uma.',
      minutos: 5,
      dica: 'Numa fase há muito trabalho em paralelo; na outra, um passo de cada vez. O que é que cada passo tem de ler da memória?',
      resposta: [
        {
          type: 'p',
          text: 'Porque a geração tem duas fases com gargalos diferentes. O **prefill** processa o prompt inteiro de uma vez e manda no **TTFT**; é limitado por **computação** e cresce com o tamanho do prompt. O **decode** gera um token por passo e manda nos **tokens por segundo**; é limitado pela **largura de banda de memória**, porque cada passo tem de ler os pesos todos e o KV cache.',
        },
        {
          type: 'p',
          text: 'No prefill, todas as posições do prompt passam pelas camadas em paralelo: são multiplicações de matrizes grandes, que ocupam bem a GPU. O custo é ≈ 2 × parâmetros FLOPs por token de entrada, mais o termo quadrático da atenção. No fim há K e V de todas as posições no KV cache e os logits do primeiro token.',
        },
        {
          type: 'p',
          text: 'No decode, cada passo processa um único token novo. O trabalho aritmético é pequeno, mas os pesos inteiros têm de vir da memória da GPU. Ordem de grandeza: um modelo de ~8B em fp16 ocupa ≈ 16 GB; com ≈ 2–3 TB/s de largura de banda, o limite teórico com um único pedido fica na ordem de 100–200 passos por segundo. Agrupar pedidos em lote amortiza essa leitura — o throughput agregado sobe muito, cada utilizador vê os seus tokens/s descer um pouco.',
        },
        {
          type: 'table',
          head: ['Sintoma', 'Fase', 'Causas típicas', 'Alavancas'],
          rows: [
            ['TTFT sobe, tokens/s iguais', 'Prefill', 'Prompt maior, cache de prompt deixou de acertar, fila no fornecedor', 'Cortar contexto, prefixo estável para cache, modelo menor no caminho crítico'],
            ['Duração total sobe, TTFT igual', 'Decode', 'Respostas mais compridas, lote maior no servidor', '`max_tokens`, instruções de concisão, streaming'],
            ['Ambos sobem em pico', 'Os dois', 'Saturação e filas', 'Capacidade, rate limit, fallback'],
          ],
        },
        {
          type: 'p',
          text: 'Por isso registo pelo menos duas métricas por versão de prompt e de modelo: TTFT e duração até ao último token, mais tokens de entrada e de saída. Num assistente com streaming, o TTFT é o que o utilizador sente como «está a pensar»; a velocidade de decode só importa se for mais lenta do que a leitura.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Percentil de uma soma',
          text: 'Um p95 de «latência do modelo» mistura respostas de 20 e de 800 tokens. Uma subida pode ser só respostas mais longas. Normaliza: TTFT à parte, e tempo por token de saída à parte.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zhong et al. — DistServe: separar prefill e decode (2024)', url: 'https://arxiv.org/abs/2401.09670' },
            { label: 'Kwon et al. — PagedAttention / vLLM (2023)', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'OpenTelemetry — convenções semânticas para GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa prefill (paralelo, limitado por computação) de decode (sequencial, limitado por largura de banda).',
          'Associa TTFT ao prefill e tokens/s ao decode.',
          'Dá uma ordem de grandeza do limite de decode a partir do tamanho dos pesos e da largura de banda.',
          'Explica o efeito do batching: throughput agregado sobe, velocidade por pedido desce.',
          'Propõe métricas separadas e diz que alavanca corrige cada sintoma.',
        ],
        fraco: '«A latência depende do tamanho do modelo», sem distinguir fases.',
        solido: 'Explica as duas fases, o que limita cada uma e regista TTFT e tokens/s separados.',
        excelente: 'Faz a conta de largura de banda, explica batching e a cache de prompt como redução de prefill, e liga cada sintoma no dashboard a uma correcção concreta.',
      },
      seguimento: [
        'Porque é que a cache de prompt baixa o TTFT mas não os tokens/s?',
        'O que é continuous batching e porque é que melhora o throughput?',
        'Num modelo self-hosted, quando separarias prefill e decode em máquinas diferentes?',
      ],
      sinaisAlarme: [
        'Medir só latência total sem tokens de saída.',
        'Achar que a GPU está «subutilizada» no decode por má configuração.',
        'Propor um modelo maior para baixar a latência.',
      ],
      modulos: ['como-funciona-llm', 'observabilidade-llmops', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-llm-internos-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Quantas conversas de 32 k cabem numa GPU: o KV cache',
      enunciado:
        'Vais alojar um modelo aberto de ~8B numa GPU de 80 GB para um assistente interno com contexto até 32 k tokens. Quantas conversas em simultâneo cabem? O que é o KV cache e que alavancas tens para caber mais?',
      minutos: 8,
      dica: 'Escreve primeiro a fórmula dos bytes por token e só depois multiplica.',
      resposta: [
        {
          type: 'p',
          text: 'O KV cache guarda as keys e os values de cada posição já processada, em cada camada, para que o decode não recalcule o prompt a cada token. Ocupa `2 × camadas × cabeças KV × dim. da cabeça × bytes` por token. Numa configuração típica de ~8B com GQA (32 camadas, 8 cabeças KV, dim. 128, fp16) dá ≈ 128 KiB por token, ≈ 4 GiB por conversa de 32 k — cabem **uma dúzia e pouco** de conversas cheias na GPU.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Por token', text: '2 × 32 × 8 × 128 × 2 bytes = 131 072 bytes = 128 KiB.' },
            { title: 'Por conversa cheia', text: '128 KiB × 32 768 tokens = 4 GiB.' },
            { title: 'Orçamento', text: '80 GB menos ≈ 16 GB de pesos em fp16 e margem para activações e fragmentação: ≈ 55–60 GB livres para cache.' },
            { title: 'Resultado', text: '≈ 13–14 conversas de 32 k. Como a maioria das conversas é muito mais curta, com alocação paginada cabem muitas mais em média — o limite é o pior caso, não a média.' },
          ],
        },
        {
          type: 'table',
          head: ['Alavanca', 'Efeito', 'Custo'],
          rows: [
            ['GQA/MQA (escolha de modelo)', 'Sem GQA, 32 cabeças KV: 512 KiB/token, 4× mais', 'Vem do modelo; não se liga depois'],
            ['KV cache em 8 bits', '≈ 2× mais conversas', 'Pequena perda de qualidade; tem de ser avaliada'],
            ['PagedAttention (vLLM)', 'Aloca por blocos, quase sem desperdício; partilha prefixos', 'Nenhum relevante; é o padrão actual'],
            ['Cache de prefixo', 'O prompt de sistema comum guarda-se uma vez', 'Só ajuda se o prefixo for estável'],
            ['Limitar contexto', 'Resumir histórico, cortar RAG', 'Pode perder informação; medir com evals'],
            ['Recalcular em vez de guardar', 'Libera memória ao preemptar pedidos', 'Mais prefill, TTFT pior para quem é preemptado'],
          ],
        },
        {
          type: 'p',
          text: 'O trade-off central é **memória contra computação**: sem cache, cada token novo exigiria recalcular K e V do prompt inteiro (custo quadrático no total da resposta); com cache, o custo de cada passo é linear mas a memória cresce com contexto × concorrência. É por isso que, em self-hosting, a concorrência máxima é quase sempre decidida pelo KV cache e não pelo tamanho dos pesos.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que eu faria',
          text: 'Mediria a distribuição real de comprimentos de conversa, configuraria o servidor com o comprimento máximo de que o produto precisa (não o máximo do modelo), e faria um teste de carga a subir a concorrência até o p95 do TTFT sair do SLO — o número vem daí, não da conta no quadro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hugging Face — KV cache em transformers', url: 'https://huggingface.co/docs/transformers/kv_cache' },
            { label: 'Ainslie et al. — GQA: Grouped-Query Attention (2023)', url: 'https://arxiv.org/abs/2305.13245' },
            { label: 'Kwon et al. — PagedAttention / vLLM (2023)', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'Documentação do vLLM', url: 'https://docs.vllm.ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz o que o KV cache guarda (K e V por camada e posição) e porque evita recalcular.',
          'Escreve a fórmula dos bytes por token com o factor 2, as camadas, as cabeças KV e a precisão.',
          'Chega a uma ordem de grandeza correcta (centenas de KiB por token, GiB por conversa longa).',
          'Nomeia pelo menos três alavancas com o custo de cada (GQA, quantização da cache, paginação, limitar contexto).',
          'Valida com teste de carga contra um SLO em vez de confiar só na conta.',
        ],
        fraco: 'Conta só a memória dos pesos e conclui que cabem «muitos» utilizadores.',
        solido: 'Faz a conta do KV cache, chega à ordem de grandeza certa e cita GQA e PagedAttention.',
        excelente: 'Distingue pior caso de média, explica o trade-off memória vs recomputação e fecha com um teste de carga contra o SLO de TTFT.',
      },
      seguimento: [
        'Porque é que o GQA tem de vir do treino e não pode ser activado depois?',
        'Como é que a partilha de prefixo muda a conta num assistente com um prompt de sistema de 3 000 tokens?',
        'Que métrica do servidor te diz que a cache está a ser a restrição?',
      ],
      sinaisAlarme: [
        'Ignorar o KV cache no dimensionamento.',
        'Esquecer o factor 2 (keys e values) ou as camadas.',
        'Dimensionar pela janela máxima do modelo em vez da do produto.',
      ],
      modulos: ['como-funciona-llm', 'custo-escala', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-llm-internos-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Porque não pôr tudo numa janela de 1M tokens',
      enunciado:
        'Os modelos já aceitam centenas de milhares de tokens. Porque é que não metemos a base de conhecimento inteira no prompt e deitamos fora o RAG?',
      minutos: 7,
      dica: 'Separa quatro coisas: custo, latência, qualidade e controlo de acesso.',
      resposta: [
        {
          type: 'p',
          text: 'Porque caber na janela não é o mesmo que ser bem usado, e porque se paga o contexto inteiro em cada pedido. Para corpora pequenos e estáveis, contexto longo com cache de prompt pode mesmo ser a melhor opção; para uma base que muda, com permissões e milhares de pedidos por dia, o RAG continua a ganhar em custo, latência e controlo.',
        },
        {
          type: 'list',
          items: [
            '**Custo:** o preço é linear nos tokens de entrada. 500 k tokens por pedido são centenas de vezes o custo de um prompt de 5 k com RAG. A cache de prompt baixa muito o preço da parte repetida, mas só se o prefixo for idêntico e dentro do tempo de vida da cache.',
            '**Latência:** o prefill de centenas de milhares de tokens leva segundos a dezenas de segundos, e o termo quadrático da atenção pesa precisamente aqui.',
            '**Qualidade:** Liu et al. (2023) mostraram uma curva em U — o modelo usa melhor o que está no início e no fim do contexto do que no meio. Benchmarks como o RULER mostram que a janela efectiva em tarefas com várias agulhas ou agregação é muitas vezes bem menor do que a anunciada. Mais texto irrelevante é mais distracção.',
            '**Controlo:** num SaaS multi-tenant, o RAG filtra por tenant e por permissões antes de o texto chegar ao modelo. Num contexto gigante, ou fazes um prompt por utilizador (perdes a cache) ou arriscas fugas entre clientes.',
            '**Operação:** com RAG sabes que chunks entraram e podes citar e auditar; com tudo no contexto, não sabes em que parte a resposta se baseou.',
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Contexto longo ganha quando',
            items: [
              'O corpus é pequeno (dezenas de documentos) e muda pouco',
              'A tarefa precisa de ver tudo junto (resumo global, comparar contratos)',
              'O volume de pedidos é baixo ou o prefixo é cacheável',
              'Não há permissões diferentes por utilizador',
            ],
          },
          right: {
            title: 'RAG ganha quando',
            items: [
              'O corpus é grande, muda todos os dias ou tem versões',
              'Há permissões por tenant ou por utilizador',
              'O volume é alto e o orçamento por pedido é apertado',
              'Precisas de citar a fonte e auditar a resposta',
            ],
          },
        },
        {
          type: 'p',
          text: 'Na prática acabo muitas vezes num híbrido: recupero documentos inteiros em vez de chunks pequenos, porque a janela o permite, e ponho a parte mais relevante no princípio ou no fim. E decido com números: comparo no golden set as duas variantes em exactidão, custo por pedido e p95 de TTFT.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'A armadilha da agulha',
          text: 'O teste «needle in a haystack» com uma única frase plantada passa em quase todos os modelos. Não prova que o modelo junta três factos espalhados ou que ignora parágrafos parecidos mas desactualizados — que é o que um corpus real de políticas exige.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. — Lost in the Middle (2023)', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Hsieh et al. — RULER: What’s the Real Context Size of Your Long-Context Language Models? (2024)', url: 'https://arxiv.org/abs/2404.06654' },
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o custo de entrada é linear nos tokens e se paga em cada pedido, e menciona a cache de prompt como atenuante.',
          'Liga contexto longo a TTFT alto pelo prefill.',
          'Cita lost-in-the-middle ou a diferença entre janela anunciada e janela efectiva.',
          'Aponta permissões e multi-tenancy como argumento a favor do RAG.',
          'Reconhece casos em que o contexto longo ganha e propõe medir as duas variantes.',
        ],
        fraco: '«RAG é sempre melhor» ou «sim, já não é preciso RAG», sem números nem casos.',
        solido: 'Cobre custo, latência e lost-in-the-middle, e reconhece que corpora pequenos podem ir no contexto.',
        excelente: 'Acrescenta permissões, cache de prompt e auditoria, propõe um híbrido e decide com uma comparação no golden set em qualidade, custo e TTFT.',
      },
      seguimento: [
        'Como montarias um teste para saber a janela efectiva do modelo nos teus documentos?',
        'Se o fornecedor baixar o preço de entrada 10×, a tua resposta muda?',
        'Onde colocarias a informação mais importante num prompt de 100 k tokens?',
      ],
      sinaisAlarme: [
        'Acreditar que a janela anunciada é toda igualmente útil.',
        'Ignorar o custo por pedido em volume.',
        'Não pensar em permissões ao meter tudo no prompt.',
      ],
      modulos: ['como-funciona-llm', 'prompt-engineering', 'rag-basico'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-llm-internos-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Mixture-of-experts: parâmetros totais vs activos',
      enunciado:
        'Estás a decidir entre alojar um modelo denso e um mixture-of-experts com muito mais parâmetros totais mas um número de parâmetros activos parecido. O que muda em custo, latência e operação?',
      minutos: 8,
      dica: 'Separa o que custa computação do que custa memória.',
      resposta: [
        {
          type: 'p',
          text: 'Num MoE, cada camada feed-forward é substituída por vários «experts» e um **router** que manda cada token a poucos deles (tipicamente 1 ou 2). A computação por token segue os **parâmetros activos**; a memória segue os **parâmetros totais**. É mais barato por token do que um denso da mesma qualidade, mas não é mais leve de alojar.',
        },
        {
          type: 'p',
          text: 'Exemplo publicado: o artigo do Mixtral 8x7B descreve ≈ 47 B parâmetros totais e ≈ 13 B activos por token. Os FLOPs por token aproximam-se de um denso de 13 B, mas tens de ter os 47 B em memória da GPU (≈ 94 GB em fp16, antes de qualquer KV cache). A ideia vem de Shazeer et al. (2017) e o Switch Transformer simplificou-a para um expert por token.',
        },
        {
          type: 'table',
          head: ['Dimensão', 'Denso', 'MoE com activos parecidos'],
          rows: [
            ['FLOPs por token', 'Proporcional aos parâmetros', 'Proporcional aos activos: semelhante'],
            ['Memória dos pesos', 'Proporcional aos parâmetros', 'Proporcional aos totais: várias vezes maior'],
            ['Qualidade', 'Referência', 'Em geral superior à de um denso com o mesmo custo por token'],
            ['Decode com lote pequeno', 'Lê os pesos todos', 'Lê só os experts escolhidos, mas tokens diferentes escolhem experts diferentes'],
            ['Decode com lote grande', 'Bem amortizado', 'Quase todos os experts são lidos; precisa de paralelismo de experts entre GPUs'],
            ['Operação', 'Simples', 'Desequilíbrio de carga entre experts, comunicação entre GPUs, mais GPUs mínimas'],
          ],
        },
        {
          type: 'p',
          text: 'Para quem **consome por API**, MoE é sobretudo uma razão por que um modelo forte pode ser barato e rápido por token; o preço já reflecte isso. Para quem **aloja**, a decisão é de capacidade: o MoE exige o hardware dos parâmetros totais e compensa com throughput alto quando há volume suficiente para encher lotes. Com tráfego baixo, pagas GPUs para manter experts ociosos em memória.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Como decidiria',
          text: 'Mediria qualidade no meu eval, e depois custo por 1 000 pedidos ao meu perfil de tráfego (incluindo GPUs mínimas e utilização média), não custo por token no pico. Um MoE em self-hosting só ganha com volume sustentado; abaixo disso, um denso menor ou uma API costumam sair mais baratos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Shazeer et al. — Outrageously Large Neural Networks: Sparsely-Gated MoE (2017)', url: 'https://arxiv.org/abs/1701.06538' },
            { label: 'Fedus, Zoph e Shazeer — Switch Transformers (2021)', url: 'https://arxiv.org/abs/2101.03961' },
            { label: 'Jiang et al. — Mixtral of Experts (2024)', url: 'https://arxiv.org/abs/2401.04088' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica router e experts e que só alguns experts correm por token.',
          'Separa parâmetros activos (computação) de totais (memória).',
          'Dá um exemplo com números ou faz a conta de memória dos pesos.',
          'Aponta custos de operação: balanceamento de carga, paralelismo de experts, GPUs mínimas.',
          'Liga a decisão ao perfil de tráfego e mede custo por pedido, não por token no pico.',
        ],
        fraco: '«O MoE é mais pequeno porque só usa parte dos parâmetros.»',
        solido: 'Distingue activos de totais, explica que a memória segue os totais e que é mais barato por token.',
        excelente: 'Discute lote pequeno vs grande, paralelismo de experts e utilização, e decide entre API, denso e MoE com custo por pedido no tráfego real.',
      },
      seguimento: [
        'Porque é que o batching muda tanto a eficiência de um MoE?',
        'O que é a perda de balanceamento de carga no treino de um MoE e porque existe?',
        'Quantizarias um MoE para caber numa só GPU? O que mediarias?',
      ],
      sinaisAlarme: [
        'Achar que um MoE precisa de menos memória do que um denso com os mesmos activos.',
        'Comparar modelos só por número de parâmetros.',
        'Decidir self-hosting sem perfil de tráfego.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-llm-internos-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Pré-treino, SFT e RLHF/DPO: o suficiente para decidir',
      enunciado:
        'Explica as fases de treino de um modelo de chat moderno. Não quero a matemática: quero saber o que cada fase dá ao modelo e o que isso implica para quem constrói produtos em cima dele.',
      minutos: 5,
      dica: 'Para cada fase, pergunta: que dados, que objectivo, que efeito secundário.',
      resposta: [
        {
          type: 'p',
          text: 'Três fases com objectivos diferentes: o **pré-treino** ensina a prever o próximo token em texto massivo e dá língua, factos frequentes e padrões; o **SFT** (instruction tuning) ensina o formato de conversa e a seguir instruções com pares pedido-resposta; a **afinação por preferências** (RLHF ou DPO) empurra o modelo para as respostas que avaliadores preferem. Nenhuma optimiza directamente a verdade.',
        },
        {
          type: 'table',
          head: ['Fase', 'Dados e objectivo', 'O que dá', 'Efeito secundário'],
          rows: [
            ['Pré-treino', 'Biliões de tokens; prever o próximo token', 'Língua, conhecimento frequente, código', 'Data de corte; nada privado; factos raros pouco fiáveis'],
            ['SFT', 'Milhares a milhões de pares instrução-resposta', 'Formato, chat template, seguir instruções, tool calling', 'Imita o estilo dos exemplos; pode ensinar a responder com confiança o que não sabe'],
            ['RLHF', 'Comparações humanas; modelo de recompensa e RL (PPO)', 'Utilidade, tom, recusas', 'Bajulação, verbosidade, excesso de confiança'],
            ['DPO', 'Os mesmos pares de preferência; perda directa sem modelo de recompensa', 'Efeito semelhante com treino mais simples e estável', 'Os mesmos riscos de optimizar o que parece bom'],
          ],
        },
        {
          type: 'p',
          text: 'Três consequências práticas. Primeiro, o conhecimento vem do pré-treino: para factos do teu domínio usa-se contexto (RAG), não fine-tuning — afinar com factos novos é pouco eficiente e há evidência de que aumenta a tendência para alucinar. Segundo, o SFT é a ferramenta certa para **formato e comportamento** (um estilo, um esquema de saída, uma tarefa estreita), muitas vezes com poucos milhares de exemplos e LoRA. Terceiro, a afinação por preferências explica comportamentos que vês em produção: concordar com o utilizador quando ele insiste, respostas longas e confiantes — e é por isso que uma resposta segura não é uma resposta certa.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Base vs instruct',
          text: 'Os modelos abertos costumam sair em versão base (só pré-treino) e instruct. Para um produto usa-se a instruct com o chat template correcto; um template errado degrada o modelo sem dar erro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Ouyang et al. — InstructGPT: Training language models to follow instructions with human feedback (2022)', url: 'https://arxiv.org/abs/2203.02155' },
            { label: 'Rafailov et al. — Direct Preference Optimization (2023)', url: 'https://arxiv.org/abs/2305.18290' },
            { label: 'Gekhman et al. — Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations? (2024)', url: 'https://arxiv.org/abs/2405.05904' },
            { label: 'Hugging Face — chat templates', url: 'https://huggingface.co/docs/transformers/chat_templating' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue as três fases pelo objectivo de treino e pelos dados.',
          'Diz que o conhecimento factual vem sobretudo do pré-treino e que factos do domínio entram por contexto.',
          'Diz para que serve o SFT (formato, comportamento, tarefa estreita).',
          'Liga a afinação por preferências a bajulação ou excesso de confiança.',
          'Diferencia RLHF de DPO no essencial (modelo de recompensa e RL vs perda directa sobre pares).',
        ],
        fraco: '«Treina-se com dados e depois afina-se», ou propõe fine-tuning para ensinar as políticas da empresa.',
        solido: 'Descreve as três fases e conclui que factos vão por RAG e formato por SFT.',
        excelente: 'Explica os efeitos secundários de cada fase, cita a evidência sobre afinar com conhecimento novo e liga tudo a decisões de produto (RAG vs SFT, chat template, desconfiança da confiança).',
      },
      seguimento: [
        'Quando é que farias SFT em vez de melhorar o prompt?',
        'Porque é que um modelo muda de opinião quando o utilizador insiste?',
        'O que é o modelo de recompensa e porque é que pode ser explorado?',
      ],
      sinaisAlarme: [
        'Propor fine-tuning para o modelo «aprender a documentação».',
        'Dizer que o RLHF torna o modelo verdadeiro.',
        'Não saber que existe uma versão base e uma instruct.',
      ],
      modulos: ['como-funciona-llm', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-llm-internos-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Implementa atenção causal com softmax estável em numpy',
      enunciado:
        'Implementa em numpy a atenção escalada com máscara causal. Quero ver o softmax numericamente estável e um teste que prove que a máscara funciona.',
      contexto:
        'Assinatura: `atencao(q, k, v, causal=True) -> (saida, pesos)`, com q de forma (n, d), k de forma (m, d) e v de forma (m, d_v). Tem de funcionar no prefill (n = m) e num passo de decode com KV cache (n = 1, m = posições já vistas). Sem frameworks de deep learning; só numpy.',
      minutos: 20,
      dica: 'O que acontece a `exp(1000)` em float64? E como alinhas a máscara quando há menos queries do que keys?',
      resposta: [
        {
          type: 'p',
          text: 'Calculo os scores `QKᵀ/√d`, aplico a máscara pondo −∞ nas posições futuras, e faço o softmax por linha **subtraindo o máximo** antes de exponenciar — matematicamente igual, mas sem overflow. Complexidade O(n·m·d) em tempo e O(n·m) em memória.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Atenção escalada causal, com softmax estável e alinhamento da máscara para decode.',
          code: `import numpy as np


def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    """Softmax estável: subtrai o máximo antes de exponenciar."""
    m = np.max(x, axis=axis, keepdims=True)
    m = np.where(np.isfinite(m), m, 0.0)          # linha toda a -inf
    e = np.exp(x - m)
    s = e.sum(axis=axis, keepdims=True)
    return np.divide(e, s, out=np.zeros_like(e), where=s > 0)


def atencao(q: np.ndarray, k: np.ndarray, v: np.ndarray, causal: bool = True) -> tuple[np.ndarray, np.ndarray]:
    """q: (n, d), k: (m, d), v: (m, d_v). Devolve (saída (n, d_v), pesos (n, m))."""
    if q.ndim != 2 or k.ndim != 2 or v.ndim != 2:
        raise ValueError("esperava matrizes 2D")
    if q.shape[1] != k.shape[1] or k.shape[0] != v.shape[0]:
        raise ValueError(f"formas incompatíveis: q{q.shape} k{k.shape} v{v.shape}")
    n, d = q.shape
    m = k.shape[0]
    scores = (q @ k.T) / np.sqrt(d)               # (n, m)
    if causal:
        # a query i corresponde à posição i + (m - n): funciona também em decode (n=1)
        desloc = m - n
        mascara = np.triu(np.ones((n, m), dtype=bool), k=1 + desloc)
        scores = np.where(mascara, -np.inf, scores)
    pesos = softmax(scores, axis=-1)
    return pesos @ v, pesos


# softmax ingénuo rebenta com logits grandes; o estável não
x = np.array([1000.0, 1001.0, 1002.0])
with np.errstate(over="ignore", invalid="ignore"):
    ingenuo = np.exp(x) / np.exp(x).sum()
print(ingenuo)                                    # [nan nan nan]
print(softmax(x).round(4))                        # [0.09   0.2447 0.6652]

rng = np.random.default_rng(0)
q = rng.normal(size=(4, 8)); k = rng.normal(size=(4, 8)); v = rng.normal(size=(4, 8))
out, w = atencao(q, k, v)
print(w.sum(axis=1).round(6))                     # [1. 1. 1. 1.]
print(bool(np.all(np.triu(w, k=1) == 0)))         # True
print(np.allclose(out[0], v[0]))                  # True  (1.º token só se vê a si)

# decode com KV cache: a última query contra todas as keys dá o mesmo que a linha 3
out_dec, _ = atencao(q[3:4], k, v)
print(np.allclose(out_dec[0], out[3]))            # True`,
        },
        {
          type: 'h',
          text: 'Casos-limite e testes',
        },
        {
          type: 'list',
          items: [
            '**Overflow:** `exp(1000)` é `inf` em float64 e `inf/inf` dá `nan`; subtrair o máximo põe o maior expoente em 0. O teste com `[1000, 1001, 1002]` prova-o.',
            '**Linha toda mascarada:** não acontece com máscara causal pura, mas acontece com máscaras de padding; o `where` devolve zeros em vez de `nan`.',
            '**Decode:** com n = 1 e m posições, a máscara tem de deixar ver tudo. O deslocamento `m − n` alinha a query com a última posição; o teste compara com a linha correspondente do prefill.',
            '**Propriedades a testar:** linhas somam 1, triângulo superior a zero, a primeira saída é exactamente o primeiro value, e invariância a somar uma constante a todos os scores de uma linha.',
          ],
        },
        {
          type: 'p',
          text: 'Extensões que um entrevistador costuma pedir: várias cabeças (reshape para `(h, n, d/h)` e `einsum`), lotes com padding (máscara combinada causal e de padding), e calcular por blocos com um softmax *online* que mantém o máximo e a soma correntes — a ideia do FlashAttention, que evita materializar a matriz n × m.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Vaswani et al. — Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762' },
            { label: 'NumPy — documentação', url: 'https://numpy.org/doc/stable/' },
            { label: 'Dao et al. — FlashAttention (2022)', url: 'https://arxiv.org/abs/2205.14135' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escala por √d e aplica a máscara antes do softmax, com −∞ (não com 0).',
          'Subtrai o máximo por linha no softmax e explica porquê.',
          'Trata o caso de decode (n diferente de m) alinhando a máscara.',
          'Valida dimensões e escreve testes de propriedades (linhas somam 1, triângulo superior a zero).',
          'Discute complexidade e como estenderia a várias cabeças ou por blocos.',
        ],
        fraco: 'Aplica a máscara multiplicando os pesos por zero depois do softmax, ou usa o softmax ingénuo.',
        solido: 'Implementação correcta com máscara a −∞, softmax estável e testes básicos.',
        excelente: 'Acrescenta o alinhamento para decode, o caso de linha toda mascarada, testes de propriedades e explica o softmax online por blocos.',
      },
      seguimento: [
        'Como juntarias várias cabeças sem ciclos em Python?',
        'Como escreverias o softmax online que processa as keys por blocos?',
        'Como combinarias a máscara causal com uma máscara de padding num lote?',
      ],
      sinaisAlarme: [
        'Mascarar depois do softmax e não renormalizar.',
        'Não saber porque o softmax ingénuo dá `nan`.',
        'Não escrever nenhum teste.',
      ],
      modulos: ['como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-llm-internos-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A factura de tokens veio duas vezes acima do orçamento',
      enunciado:
        'Lançaste um assistente em português para um banco móvel. O orçamento de tokens foi feito com cuidado, mas a primeira factura mensal veio 2,1 vezes acima. Como investigas e o que corriges?',
      contexto:
        'Assistente de apoio ao cliente de um banco móvel em Moçambique, ≈ 120 000 turnos por mês, modelo médio por API. A estimativa contou caracteres e dividiu por 4: prompt de sistema de 4 800 caracteres, 3 chunks de RAG de ≈ 2 400 caracteres cada, mensagem do utilizador de ≈ 200 caracteres, total ≈ 3 050 tokens de entrada por turno. O agente tem 6 ferramentas. As respostas da API trazem o campo `usage`, que até agora só ia para os logs em texto livre.',
      minutos: 10,
      dica: 'Antes de discutir o rácio caracteres/token, verifica se a estimativa contou tudo o que é enviado em cada chamada.',
      resposta: [
        {
          type: 'p',
          text: 'Suspeito primeiro de **componentes que a estimativa não contou** — esquemas das ferramentas e histórico reenviado em cada turno — e só depois do rácio de 4 caracteres por token, que subestima português com IDs, montantes e tabelas. Confirmo decompondo os tokens reais por componente, não discutindo fórmulas.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Pôr o `usage` em números', text: 'Extraio `input_tokens` e `output_tokens` de cada chamada, por rota e versão de prompt, e confirmo que a factura bate com a soma. Se não bater, há chamadas fora do assistente (retries, avaliações, um job batch) a cobrar na mesma chave.' },
            { title: 'Contar chamadas por turno', text: 'Um agente com ferramentas faz várias chamadas por turno: uma para decidir a ferramenta, outra com o resultado. Se a média é 1,8 chamadas por turno e a estimativa assumiu 1, isso sozinho explica quase tudo.' },
            { title: 'Decompor a entrada', text: 'Numa amostra de 200 pedidos reais, conto cada componente com o tokenizador do modelo (ou o endpoint de contagem do fornecedor): sistema, esquemas, histórico, chunks, mensagem.' },
            { title: 'Olhar para a saída', text: 'Tokens de saída costumam custar várias vezes mais do que os de entrada. Verifico a distribuição: respostas longas, `max_tokens` alto, ou tokens de raciocínio que são facturados como saída em modelos que os usam.' },
          ],
        },
        {
          type: 'table',
          head: ['Componente', 'Estimado (tokens)', 'Medido, mediana (tokens)', 'Porquê'],
          rows: [
            ['Prompt de sistema', '1 200', '1 450', 'Português com termos bancários: ≈ 3,3 caracteres por token'],
            ['Esquemas das 6 ferramentas', '0', '1 100', 'Não contados; JSON com descrições vai em cada chamada'],
            ['Histórico da conversa', '0', '1 600', 'Reenviado em cada turno e cresce com a conversa'],
            ['3 chunks de RAG', '1 800', '2 100', 'Números de conta, montantes em MZN e tabelas partem-se mais'],
            ['Mensagem do utilizador', '50', '70', 'Mistura de português e changana'],
            ['Total por chamada', '3 050', '6 320', '≈ 2,1×'],
          ],
          caption: 'Decomposição ilustrativa de uma amostra; os valores reais saem do teu tokenizador e do teu tráfego.',
        },
        {
          type: 'p',
          text: 'Neste caso o grosso vem de esquemas e histórico (2 700 tokens que não estavam no modelo de custo); o rácio caracteres/token explica só ≈ 17% da diferença. Correcções, por ordem de impacto: **cache de prompt** sobre o prefixo estável (sistema mais esquemas, ≈ 2 550 tokens), o que exige pôr o que muda no fim; **resumir o histórico** a partir do 4.º turno; expor só as ferramentas relevantes para a intenção classificada; e recalibrar o estimador com o rácio medido no tráfego real.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Os tokens de entrada e saída passam a ser métricas com etiquetas de rota e versão de prompt, com orçamento por turno e alarme quando o p50 sobe mais de 20% depois de um deploy. Um teste no CI conta os tokens do prompt montado para um caso típico com o tokenizador do modelo e falha se passar do orçamento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — contagem de tokens', url: 'https://platform.claude.com/docs/en/build-with-claude/token-counting' },
            { label: 'tiktoken', url: 'https://github.com/openai/tiktoken' },
            { label: 'OpenTelemetry — convenções semânticas para GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Começa pelos dados reais do `usage` e confirma que batem com a factura.',
          'Considera componentes esquecidos (esquemas de ferramentas, histórico, várias chamadas por turno) antes do rácio.',
          'Explica porque é que português, IDs e montantes têm menos caracteres por token.',
          'Considera os tokens de saída e o seu preço mais alto.',
          'Propõe correcções com impacto estimado (cache de prompt, resumo de histórico, ferramentas filtradas) e um alarme ou teste no CI.',
        ],
        fraco: 'Muda para um modelo mais barato ou diz que «o português gasta mais tokens» sem medir.',
        solido: 'Usa o `usage`, decompõe por componente, encontra esquemas e histórico e propõe cache de prompt e resumo.',
        excelente: 'Quantifica a contribuição de cada causa, verifica chamadas por turno e tokens de saída, ordena correcções por impacto e transforma tokens por turno numa métrica com orçamento e gate.',
      },
      seguimento: [
        'Como organizas o prompt para a cache de prompt acertar o máximo possível?',
        'A partir de que turno resumes o histórico, e como medes se o resumo perde informação?',
        'Como farias o modelo de custo antes do lançamento da próxima vez?',
      ],
      sinaisAlarme: [
        'Discutir o rácio caracteres/token sem olhar para o `usage`.',
        'Trocar de modelo antes de perceber de onde vêm os tokens.',
        'Esquecer que o histórico e os esquemas vão em cada chamada.',
      ],
      modulos: ['custo-escala', 'como-funciona-llm', 'observabilidade-llmops'],
    },
  ],
};
