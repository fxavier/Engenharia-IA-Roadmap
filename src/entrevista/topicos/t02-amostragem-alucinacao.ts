import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'amostragem-alucinacao',
  numero: 2,
  bloco: 'llm',
  titulo: 'Amostragem, determinismo e alucinação',
  resumo:
    'Como se escolhe o próximo token (temperatura, top-k, top-p), porque é que temperatura 0 não dá respostas iguais, porque é que os modelos alucinam e como se mitiga e mede isso num produto. É das primeiras coisas que um entrevistador usa para separar quem usa uma API de quem a percebe.',
  icon: '🎲',
  modulos: ['como-funciona-llm', 'avaliacao-fundamentos', 'guardrails-seguranca'],
  essencial: [
    'Temperatura divide os logits antes do softmax: T < 1 concentra, T > 1 espalha. T = 0 trata-se como greedy (argmax).',
    'Top-k fica com os k tokens mais prováveis; top-p fica com o menor conjunto cuja massa acumulada chega a p, e adapta-se à forma da distribuição.',
    'Ordem habitual: temperatura, depois top-k, depois top-p, depois renormalizar e amostrar.',
    'Temperatura 0 não é determinismo: kernels não invariantes ao tamanho do lote, soma em vírgula flutuante não associativa, aliases de modelo que mudam de snapshot.',
    'Seed dá reprodutibilidade «best effort» no fornecedor; a reprodutibilidade a sério vem de registar prompt, versão do modelo, contexto e resposta em cada traço.',
    'Um LLM optimiza verosimilhança, não verdade: uma continuação plausível sai mesmo quando o facto não está no contexto.',
    'Mitigação em camadas: contexto (RAG), restrições (citações validadas, ferramentas para cálculos), recusa abaixo de limiar, verificação pós-geração, medição contínua.',
    'Logprobs são um sinal fraco: úteis para uma etiqueta curta, inúteis como detector de alucinação numa resposta longa. A afinação por preferências tende a piorar a calibração.',
    'Structured output garante sintaxe e esquema, não que os valores sejam verdadeiros.',
    'Mede-se alucinação com afirmações verificáveis contra a fonte: taxa de afirmações sem suporte, por amostragem e juiz calibrado com humanos.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-amostragem-alucinacao-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Temperatura, top-k e top-p: o que fazem à distribuição',
      enunciado:
        'Explica-me o que fazem a temperatura, o top-k e o top-p. Que valores usarias para classificar um pedido, para responder a um cliente e para gerar dados sintéticos?',
      minutos: 5,
      dica: 'Todos actuam depois de o modelo calcular os logits. Pensa em forma da distribuição vs corte da cauda.',
      resposta: [
        {
          type: 'p',
          text: 'Os três actuam **depois** de o modelo calcular os logits do próximo token: mudam como se escolhe, não o que o modelo calculou. A temperatura muda a **forma** da distribuição; top-k e top-p **cortam a cauda** antes de amostrar. Greedy é escolher sempre o argmax, que é o limite de temperatura → 0.',
        },
        {
          type: 'list',
          items: [
            '**Temperatura:** `p_i = softmax(z_i / T)`. T < 1 aumenta a diferença entre logits e concentra a massa no mais provável; T > 1 aplana. Não elimina nenhum token: a 1,5, um token absurdo com 1% de probabilidade acaba escolhido algures numa resposta de centenas de tokens.',
            '**Top-k:** fica só com os k mais prováveis e renormaliza. É um corte fixo: k = 40 é demasiado largo quando o modelo está seguro e pode ser estreito quando não está.',
            '**Top-p (nucleus):** fica com o menor conjunto de tokens cuja massa acumulada chega a p. Adapta-se: quando o modelo está seguro, o núcleo tem um ou dois tokens; quando não está, muitos. É o corte mais usado.',
          ],
        },
        {
          type: 'table',
          head: ['Tarefa', 'Configuração', 'Porquê'],
          rows: [
            ['Classificar intenção, extrair campos', 'Temperatura 0 (greedy)', 'Há uma resposta certa; variedade é só ruído'],
            ['Responder a um cliente com RAG', '0 a 0,3', 'Quer-se fidelidade ao contexto e respostas estáveis entre clientes'],
            ['Gerar perguntas sintéticas para avaliação', '0,7 a 1,0 com top-p ≈ 0,9 a 0,95', 'A diversidade é o objectivo; o top-p corta o absurdo'],
            ['Self-consistency (várias amostras para votar)', '≈ 0,7', 'Precisa de caminhos diferentes para a votação ter valor'],
          ],
        },
        {
          type: 'p',
          text: 'Greedy tem um defeito conhecido em texto longo e aberto: tende a repetir-se e a produzir texto pobre, como mostraram Holtzman et al. — foi a motivação do nucleus sampling. Em respostas curtas e ancoradas num contexto, isso quase não se nota, e a estabilidade compensa.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Nem sempre controlas',
          text: 'Alguns modelos com raciocínio explícito fixam a amostragem do lado do fornecedor e rejeitam valores diferentes do omisso. Confirma na documentação do modelo e mede a variância com evals em vez de a presumir.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Holtzman et al. — The Curious Case of Neural Text Degeneration (2019)', url: 'https://arxiv.org/abs/1904.09751' },
            { label: 'Hugging Face — estratégias de geração', url: 'https://huggingface.co/docs/transformers/generation_strategies' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que a temperatura divide os logits antes do softmax e o efeito de T < 1 e T > 1.',
          'Distingue top-k (corte fixo) de top-p (corte adaptativo pela massa acumulada).',
          'Diz que temperatura 0 equivale a greedy.',
          'Escolhe valores diferentes por tarefa e justifica cada um.',
        ],
        fraco: '«A temperatura é a criatividade do modelo», sem mecanismo nem valores por tarefa.',
        solido: 'Explica os três parâmetros com a fórmula da temperatura e escolhe 0 para classificar e valores altos para dados sintéticos.',
        excelente: 'Explica porque é que a temperatura sozinha não corta a cauda, porque top-p se adapta, os problemas do greedy em texto longo e que alguns modelos não deixam controlar a amostragem.',
      },
      seguimento: [
        'O que acontece se combinares temperatura 1,5 com top-p 0,9?',
        'Porque é que top-p se aplica depois da temperatura e não antes?',
        'Que temperatura usarias para um LLM-como-juiz e porquê?',
      ],
      sinaisAlarme: [
        'Dizer que temperatura alta torna o modelo «mais inteligente».',
        'Usar temperatura alta num classificador.',
        'Não saber que existe top-p.',
      ],
      modulos: ['como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-amostragem-alucinacao-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Temperatura 0 e seed fixa, e a resposta ainda muda',
      enunciado:
        'Puseste temperatura 0 e uma seed fixa, chamaste a API cem vezes com o mesmo prompt e obtiveste três respostas diferentes. Isto é um bug do fornecedor? Porque é que acontece e o que fazes com isso?',
      minutos: 5,
      dica: 'Greedy é determinista se os logits forem sempre exactamente iguais. São?',
      resposta: [
        {
          type: 'p',
          text: 'Não é um bug: é o comportamento esperado de inferência servida em GPU partilhada. Greedy só é determinista se os logits forem bit a bit iguais, e não são — mudam com o tamanho do lote em que o pedido calhou. Quando dois tokens estão quase empatados, uma diferença na última casa decimal muda o argmax, e a partir daí a continuação diverge.',
        },
        {
          type: 'list',
          items: [
            '**Vírgula flutuante:** a soma não é associativa; `(a + b) + c` pode diferir de `a + (b + c)` na última casa.',
            '**Lotes:** o teu pedido é agrupado com pedidos de outros clientes, e muitos kernels escolhem a estratégia de redução conforme a forma do lote. Os mesmos números somam-se por ordem diferente, e o resultado depende de quem mais estava a pedir naquele instante.',
            '**MoE com capacidade por expert:** em implementações que limitam quantos tokens cada expert aceita, o encaminhamento pode depender dos outros pedidos no lote.',
            '**Versão do modelo:** um alias sem data pode passar a apontar para outro snapshot; nada que faças no prompt o impede.',
            '**Seed:** fixa o gerador de números aleatórios da amostragem, que com temperatura 0 nem é usado. Os fornecedores que a aceitam descrevem o determinismo como «best effort» e expõem um identificador da configuração do backend para saberes quando mudou.',
          ],
        },
        {
          type: 'p',
          text: 'O que faço com isto: **não escrevo testes que comparam strings** com o modelo real — testo comportamento com um modelo simulado e meço taxas com evals. Fixo a versão datada do modelo em produção. E guardo em cada traço o prompt montado, os parâmetros, a versão devolvida pela API e a resposta, porque a reprodutibilidade que importa numa auditoria é poder mostrar o que foi enviado e recebido, não voltar a gerar o mesmo texto.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A variação é informação',
          text: 'Se uma pergunta dá respostas materialmente diferentes a temperatura 0, os logits estão quase empatados: o modelo está indeciso. Isso costuma apontar para contexto ambíguo ou contraditório, e vale mais a pena corrigir isso do que perseguir o determinismo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI Cookbook — saídas reproduzíveis com o parâmetro seed', url: 'https://cookbook.openai.com/examples/reproducible_outputs_with_the_seed_parameter' },
            { label: 'PyTorch — reprodutibilidade e não-determinismo', url: 'https://pytorch.org/docs/stable/notes/randomness.html' },
            { label: 'Python — aritmética de vírgula flutuante: problemas e limitações', url: 'https://docs.python.org/3/tutorial/floatingpoint.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que greedy só é determinista com logits idênticos e que quase-empates amplificam diferenças mínimas.',
          'Explica a não associatividade da vírgula flutuante e a dependência do tamanho do lote.',
          'Menciona o alias de modelo que muda de snapshot como causa independente.',
          'Explica que a seed controla a amostragem e é «best effort» no fornecedor.',
          'Propõe testes por comportamento ou taxas e registo completo em traços em vez de comparar strings.',
        ],
        fraco: '«Temperatura 0 é determinista, deve ser um bug» ou «é aleatório por natureza».',
        solido: 'Explica vírgula flutuante e lotes, fixa a versão do modelo e não testa por igualdade de strings.',
        excelente: 'Acrescenta que a variação revela quase-empates e contexto ambíguo, separa reprodutibilidade de auditoria de determinismo e diz o que regista em cada traço.',
      },
      seguimento: [
        'Como montarias um modelo self-hosted para ser determinista, e quanto custaria em throughput?',
        'Como testas no CI uma função que chama o modelo?',
        'Que campos guardarias num traço para uma auditoria regulatória?',
      ],
      sinaisAlarme: [
        'Afirmar que temperatura 0 garante a mesma resposta.',
        'Escrever testes que comparam a saída do modelo real com uma string.',
        'Usar um alias sem data em produção sem saber.',
      ],
      modulos: ['como-funciona-llm', 'avaliacao-fundamentos', 'ci-cd'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-amostragem-alucinacao-03',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque é que um LLM alucina',
      enunciado:
        'O assistente disse a um cliente que o reembolso demora 3 a 5 dias úteis. Não há nenhuma política com esse prazo. Porque é que um modelo inventa uma coisa destas com tanta confiança?',
      minutos: 4,
      dica: 'Para que objectivo foi o modelo treinado, e o que é que esse objectivo não distingue?',
      resposta: [
        {
          type: 'p',
          text: 'Porque o modelo foi treinado para gerar a **continuação mais provável**, não a verdadeira. «3 a 5 dias úteis» é uma continuação muito provável de qualquer texto sobre reembolsos; se a política certa não está no contexto, o modelo produz o que é típico — fluente, plausível e falso. A confiança do tom não está ligada à verdade do conteúdo.',
        },
        {
          type: 'list',
          items: [
            '**Objectivo de treino:** o pré-treino premeia verosimilhança. Para factos arbitrários e raros (o prazo de uma empresa concreta), o texto de treino não dá forma de distinguir o verdadeiro do que só parece verdadeiro.',
            '**Falta de contexto:** a política não foi recuperada, foi cortada da janela ou está no meio de um contexto longo e foi mal usada. É a causa mais comum num produto com RAG.',
            '**Pressão para responder:** a afinação e as avaliações típicas premeiam responder em vez de dizer «não sei», como num exame de escolha múltipla sem desconto por erro (Kalai et al., 2025). Sem instrução e mecanismo de recusa, o modelo adivinha.',
            '**Erro que se propaga:** a geração é autoregressiva; um número errado no início passa a ser contexto para o resto da resposta, que o justifica com coerência.',
          ],
        },
        {
          type: 'p',
          text: 'Distingo dois tipos, porque se tratam de formas diferentes: alucinação **sem fonte** (o facto não estava no contexto e o modelo inventou) e alucinação **contra a fonte** (estava, mas o modelo contradisse-a ou misturou duas versões). A primeira resolve-se sobretudo na recuperação e na recusa; a segunda no prompt, na ordem do contexto e na verificação pós-geração.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Temperatura 0 não resolve',
          text: 'Com temperatura 0 o modelo escolhe a continuação mais provável — que é exactamente o «3 a 5 dias úteis». Reduz a variância, não a alucinação. Um modelo maior também não chega: alucina menos vezes e com mais convicção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kalai et al. — Why Language Models Hallucinate (2025)', url: 'https://arxiv.org/abs/2509.04664' },
            { label: 'Ji et al. — Survey of Hallucination in Natural Language Generation (2022)', url: 'https://arxiv.org/abs/2202.03629' },
            { label: 'Anthropic — reduzir alucinações', url: 'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o objectivo de treino é verosimilhança e não verdade.',
          'Identifica a falta de contexto (recuperação, corte, lost-in-the-middle) como causa principal num produto com RAG.',
          'Menciona que o treino e as avaliações premeiam responder em vez de recusar.',
          'Distingue alucinação sem fonte de alucinação contra a fonte.',
          'Diz que temperatura 0 não elimina a alucinação.',
        ],
        fraco: '«O modelo enganou-se» ou «tem de se baixar a temperatura».',
        solido: 'Explica verosimilhança vs verdade e a falta de contexto, e propõe RAG com recusa.',
        excelente: 'Acrescenta a pressão para responder vinda do treino e das avaliações, a propagação autoregressiva e a distinção sem fonte vs contra a fonte, com a correcção de cada uma.',
      },
      seguimento: [
        'Como saberias, a partir dos traços, se foi falha de recuperação ou de geração?',
        'Porque é que pedir ao modelo para dizer «não sei» nem sempre funciona?',
        'Um modelo maior resolveria este caso?',
      ],
      sinaisAlarme: [
        'Dizer que o modelo «mentiu» ou «achou que sabia».',
        'Achar que temperatura 0 elimina alucinação.',
        'Não pensar em verificar se a política estava no contexto.',
      ],
      modulos: ['como-funciona-llm', 'rag-basico'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-amostragem-alucinacao-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Mitigar alucinação em camadas e quanto custa cada camada',
      enunciado:
        'És responsável por um assistente de uma seguradora que responde a perguntas sobre coberturas de apólices. Que defesas contra alucinação pões, em que ordem, e o que custa cada uma em latência, dinheiro e cobertura?',
      minutos: 8,
      dica: 'Nenhuma camada sozinha chega. Pensa em antes, durante e depois da geração.',
      resposta: [
        {
          type: 'p',
          text: 'Defesa em camadas, das mais baratas e eficazes para as mais caras: dar ao modelo a fonte certa, restringir o que pode afirmar, recusar quando não há suporte, verificar depois de gerar, e medir sempre. Cada camada apanha falhas diferentes, e as mais caras só se justificam onde o erro custa caro — numa seguradora, dizer que algo está coberto quando não está é um risco legal.',
        },
        {
          type: 'table',
          head: ['Camada', 'O que apanha', 'Custo típico', 'Limite'],
          rows: [
            ['RAG com filtro por apólice e versão vigente', 'Alucinação sem fonte', 'Dezenas a centenas de ms de recuperação', 'Não impede contradizer a fonte'],
            ['Prompt: responder só com o contexto, citar o id da cláusula', 'Respostas fora do contexto', 'Quase nulo', 'Instrução, não garantia'],
            ['Citações validadas no código', 'Fontes inventadas ou fora do contexto', 'Milissegundos', 'Valida que a fonte existe, não que a apoia'],
            ['Valores por ferramenta (franquias, capitais)', 'Números inventados ou mal calculados', 'Uma chamada extra', 'Só para o que é calculável'],
            ['Recusa abaixo de um limiar de recuperação', 'Perguntas sem suporte', 'Taxa de recusas (cobertura)', 'Limiar mal calibrado recusa demais'],
            ['Verificação pós-geração (NLI ou juiz)', 'Afirmações que a fonte não suporta', '+0,3 a 2 s e outra chamada de modelo', 'O verificador também erra'],
            ['Humano no circuito para respostas de cobertura', 'O que escapa a tudo', 'Tempo de pessoa', 'Não escala a todo o tráfego'],
          ],
        },
        {
          type: 'p',
          text: 'A decisão central é **cobertura contra risco**. Subir o limiar de recusa baixa a taxa de alucinação e sobe a percentagem de perguntas encaminhadas para um humano; o ponto certo escolhe-se com a curva das duas métricas no golden set e com o custo de cada erro para o negócio. Um erro sobre uma exclusão de cobertura pode custar uma reclamação ao regulador; uma recusa custa um contacto no call centre.',
        },
        {
          type: 'p',
          text: 'A verificação pós-geração aplico-a de forma selectiva: só a respostas que afirmam cobertura, exclusão ou valores, que são uma fracção do tráfego. Em streaming, verifico por frase antes de a mostrar ou mostro a resposta com o aviso de que está a ser confirmada — a escolha depende de quanto o TTFT importa no canal.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Medir cada camada',
          text: 'Cada camada tem a sua métrica: recall da recuperação, taxa de citações inválidas, taxa de recusa, taxa de afirmações sem suporte segundo o verificador, e concordância do verificador com revisão humana numa amostra semanal. Sem isso não sei qual camada está a falhar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — reduzir alucinações', url: 'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations' },
            { label: 'RAGAS — métricas de faithfulness', url: 'https://docs.ragas.io/en/stable/' },
            { label: 'OWASP — Top 10 para aplicações LLM', url: 'https://genai.owasp.org/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe pelo menos quatro camadas distintas (contexto, restrição, recusa, verificação, medição).',
          'Diz o custo de cada camada em latência, dinheiro ou cobertura.',
          'Explica o trade-off entre taxa de recusa e taxa de alucinação e como escolher o limiar.',
          'Tira ao modelo os valores calculáveis (ferramentas).',
          'Associa a cada camada uma métrica para saber qual está a falhar.',
        ],
        fraco: '«Usava RAG e pedia ao modelo para não inventar.»',
        solido: 'RAG, citações validadas, recusa com limiar e um verificador, com noção de custo.',
        excelente: 'Liga o limiar ao custo de negócio de cada tipo de erro, aplica a verificação cara só onde importa, trata o caso de streaming e mede cada camada com concordância humana.',
      },
      seguimento: [
        'Como escolhes o limiar de recusa sem ter milhares de exemplos anotados?',
        'O verificador discorda do gerador em 12% das respostas. E agora?',
        'Como fazes isto em streaming sem estragar o TTFT?',
      ],
      sinaisAlarme: [
        'Confiar só numa instrução no prompt.',
        'Propor um verificador em todas as respostas sem falar de custo ou latência.',
        'Não falar de recusa nem de encaminhamento para humano.',
      ],
      modulos: ['guardrails-seguranca', 'rag-basico', 'avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-amostragem-alucinacao-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Logprobs e calibração: o que dizem e o que não dizem',
      enunciado:
        'A API devolve logprobs. Um colega quer usar a probabilidade média dos tokens da resposta como «confiança» e esconder respostas abaixo de 0,8. Concordas?',
      minutos: 5,
      dica: 'A probabilidade de quê, exactamente? E um modelo afinado por preferências está calibrado?',
      resposta: [
        {
          type: 'p',
          text: 'Não para respostas longas. O logprob mede quão provável era **aquele token como continuação**, não se a afirmação é verdadeira. Numa resposta de 150 tokens, a média é dominada por palavras funcionais quase certas, e um número inventado pode ser gerado com probabilidade alta. Como sinal de confiança, funciona razoavelmente para uma **saída curta e fechada**, e mesmo aí só depois de calibrado.',
        },
        {
          type: 'p',
          text: '**Calibração** significa que, entre as previsões com confiança 0,8, cerca de 80% estão certas. Mede-se com um diagrama de fiabilidade e com o erro de calibração esperado (ECE): agrupa-se por intervalos de confiança e compara-se a confiança média com a exactidão em cada um. Há evidência de que modelos pré-treinados são razoavelmente calibrados nalgumas tarefas de escolha múltipla, e o relatório técnico do GPT-4 mostra que a afinação pós-treino piorou essa calibração.',
        },
        {
          type: 'table',
          head: ['Uso', 'Funciona?', 'Condição'],
          rows: [
            ['Etiqueta de classificação (um token)', 'Sim, como sinal', 'Calibrar num conjunto anotado (ex.: escalonamento de temperatura) antes de usar um limiar'],
            ['Detectar alucinação em resposta longa', 'Mal', 'Um facto errado pode ter probabilidade alta; a média dilui-se'],
            ['Ver alternativas próximas (top_logprobs)', 'Sim', 'Quase-empates no token decisivo indicam indecisão'],
            ['Comparar modelos diferentes', 'Não', 'As escalas de probabilidade não são comparáveis entre modelos'],
          ],
        },
        {
          type: 'p',
          text: 'Para a resposta longa, prefiro sinais ao nível da afirmação: suporte na fonte verificado por NLI ou juiz, concordância entre várias amostras, ou a recuperação sem resultados acima do limiar. Para o classificador de intenção, uso o logprob da etiqueta com um limiar escolhido numa curva de precisão vs cobertura, e encaminho os casos abaixo dele para uma via mais cara.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Nem sempre há logprobs',
          text: 'Nem todos os fornecedores e modelos os expõem, e os modelos com raciocínio podem não os dar para os tokens internos. Um desenho que depende deles tem de ter um plano B.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Guo et al. — On Calibration of Modern Neural Networks (2017)', url: 'https://arxiv.org/abs/1706.04599' },
            { label: 'Kadavath et al. — Language Models (Mostly) Know What They Know (2022)', url: 'https://arxiv.org/abs/2207.05221' },
            { label: 'OpenAI — GPT-4 Technical Report (2023)', url: 'https://arxiv.org/abs/2303.08774' },
            { label: 'scikit-learn — calibração de probabilidades', url: 'https://scikit-learn.org/stable/modules/calibration.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o logprob mede probabilidade da continuação, não veracidade.',
          'Explica porque a média sobre uma resposta longa é um mau sinal.',
          'Define calibração e uma forma de a medir (diagrama de fiabilidade, ECE).',
          'Menciona que a afinação por preferências tende a piorar a calibração.',
          'Propõe onde os logprobs são úteis (etiqueta curta calibrada) e alternativas para respostas longas.',
        ],
        fraco: 'Concorda com o limiar de 0,8 sobre a média, ou diz que logprobs não servem para nada.',
        solido: 'Rejeita a média em respostas longas, usa logprobs numa classificação e fala de calibração.',
        excelente: 'Mede a calibração com ECE num conjunto anotado, cita o efeito da afinação pós-treino, escolhe o limiar numa curva precisão vs cobertura e propõe sinais ao nível da afirmação.',
      },
      seguimento: [
        'Como calibrarias o logprob da etiqueta de um classificador?',
        'O que te diz um quase-empate entre «sim» e «não» no primeiro token?',
        'Como é que self-consistency serve de sinal de confiança sem logprobs?',
      ],
      sinaisAlarme: [
        'Tratar probabilidade do token como probabilidade de a resposta estar certa.',
        'Usar um limiar sem o calibrar em dados anotados.',
        'Comparar logprobs entre modelos diferentes.',
      ],
      modulos: ['como-funciona-llm', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-amostragem-alucinacao-06',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Self-consistency: vale a pena pagar N amostras',
      enunciado:
        'Alguém propõe gerar cinco respostas a temperatura 0,7 para cada pergunta e ficar com a mais votada, para reduzir erros. Quando é que isto compensa e quando é desperdício?',
      minutos: 7,
      dica: 'Votar exige comparar respostas. Em que tipo de saída é fácil dizer que duas respostas são «a mesma»?',
      resposta: [
        {
          type: 'p',
          text: 'Compensa quando a resposta final é **curta e comparável** (um número, uma etiqueta, uma decisão sim/não), há raciocínio intermédio onde os erros variam entre amostras, e o custo de um erro justifica pagar N vezes. Em texto livre longo, num caminho com SLO de latência apertado, é quase sempre desperdício.',
        },
        {
          type: 'p',
          text: 'O mecanismo (Wang et al., 2022): amostra-se vários caminhos de raciocínio com temperatura acima de zero, extrai-se a resposta final de cada um e vota-se por maioria. Funciona porque caminhos errados tendem a discordar entre si, e os certos convergem. O artigo mostrou ganhos grandes em aritmética e raciocínio de senso comum em relação a um único caminho greedy; o ganho marginal decresce com N.',
        },
        {
          type: 'table',
          head: ['Dimensão', 'Efeito com N = 5'],
          rows: [
            ['Custo de saída', '≈ 5× (a entrada pode vir da cache de prompt, a saída não)'],
            ['Latência', 'Em paralelo, a da amostra mais lenta; em série, 5×'],
            ['Rate limit', '5× pedidos ou tokens por minuto'],
            ['Qualidade', 'Melhora em respostas fechadas com raciocínio; pouco ou nada em extracção simples'],
            ['Sinal extra', 'A taxa de concordância é uma estimativa de confiança que não precisa de logprobs'],
          ],
        },
        {
          type: 'p',
          text: 'O segundo uso é muitas vezes mais valioso do que o primeiro: o **desacordo entre amostras como detector de alucinação**. É a ideia do SelfCheckGPT — se o modelo sabe o facto, as amostras concordam; se está a inventar, divergem. Num produto, uso-o de forma assíncrona e selectiva: corro N amostras só em respostas de risco ou numa amostra do tráfego, e encaminho para revisão os casos com concordância baixa.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Como decidiria',
          text: 'Faria a curva exactidão vs N (1, 3, 5, 9) no golden set e poria ao lado o custo por mil pedidos e o p95 de latência. Muitas vezes um modelo maior com uma só amostra bate um modelo menor com cinco ao mesmo custo — e é mais simples de operar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Wang et al. — Self-Consistency Improves Chain of Thought Reasoning (2022)', url: 'https://arxiv.org/abs/2203.11171' },
            { label: 'Manakul et al. — SelfCheckGPT (2023)', url: 'https://arxiv.org/abs/2303.08896' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica o mecanismo: amostras com temperatura acima de zero, extrair resposta final, votar.',
          'Diz que exige respostas finais comparáveis e por isso serve mal texto livre.',
          'Quantifica custo, latência e rate limit para N amostras.',
          'Propõe usar a concordância como sinal de incerteza ou detector de alucinação.',
          'Compara com a alternativa de um modelo maior com uma amostra, decidindo com uma curva no golden set.',
        ],
        fraco: '«Mais amostras é sempre melhor» ou rejeita sem argumentos.',
        solido: 'Explica a votação, quando funciona e o custo multiplicado.',
        excelente: 'Usa a concordância como sinal de confiança, aplica-a de forma selectiva ou assíncrona e decide contra a alternativa de um modelo maior com números de custo e latência.',
      },
      seguimento: [
        'Como votarias entre respostas em texto livre?',
        'Que temperatura usarias para as amostras e porquê?',
        'Como integrarias isto num fluxo de streaming?',
      ],
      sinaisAlarme: [
        'Propor self-consistency com temperatura 0.',
        'Ignorar o custo e o rate limit multiplicados.',
        'Votar por igualdade exacta de strings em respostas longas.',
      ],
      modulos: ['prompt-engineering', 'avaliacao-fundamentos', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-amostragem-alucinacao-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Structured output: o que a gramática garante e o que não garante',
      enunciado:
        'Como é que um fornecedor ou um servidor como o vLLM garante que a saída é JSON válido segundo um esquema? Isso resolve a alucinação na extracção de dados?',
      minutos: 5,
      dica: 'Lembra-te de onde actua a amostragem. O que acontece se tirares tokens do vocabulário em cada passo?',
      resposta: [
        {
          type: 'p',
          text: 'Com **decoding restringido**: em cada passo, o servidor calcula que tokens são válidos dado o que já foi gerado e a gramática do esquema, e põe os logits dos restantes a −∞ antes de amostrar. A saída é sempre sintacticamente válida e conforme o esquema. Mas isso garante a **forma**, não o **conteúdo**: um campo `data_sinistro` pode vir com uma data bem formatada e inventada.',
        },
        {
          type: 'p',
          text: 'O esquema JSON (ou uma expressão regular) compila-se num autómato finito ou numa gramática; em cada passo, o estado do autómato diz que tokens o mantêm válido. O trabalho de Willard e Louf (Outlines) mostrou como indexar o vocabulário por estado para o custo por token ser baixo. Os fornecedores expõem isto como «structured outputs» ou modo estrito de tool calling; o vLLM e outros servidores aceitam o esquema no pedido.',
        },
        {
          type: 'list',
          items: [
            '**Garante:** JSON que faz parse, campos obrigatórios presentes, tipos e enums respeitados. Acaba com o ciclo de retry por JSON partido.',
            '**Não garante:** que os valores estão no documento, que o enum escolhido é o certo, nem regras de negócio entre campos (data de fim depois da de início).',
            '**Pode piorar:** forçar formato muito cedo pode baixar a qualidade do raciocínio; há estudos que medem quedas em tarefas de raciocínio sob formato estrito. Pôr um campo de justificação antes da resposta, ou separar raciocínio e extracção, costuma ajudar.',
            '**Efeito subtil:** se o esquema obriga a preencher um campo que o documento não tem, o modelo inventa um valor — o esquema empurrou-o a alucinar. Campos opcionais ou nullable são uma defesa.',
          ],
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção',
          text: 'Uso o esquema estrito para a forma, validação Pydantic com regras de negócio para a semântica, e uma verificação de que cada valor extraído aparece (ou é derivável) no texto de origem. A métrica é exactidão por campo num conjunto anotado, não taxa de JSON válido.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Willard e Louf — Efficient Guided Generation for Large Language Models (2023)', url: 'https://arxiv.org/abs/2307.09702' },
            { label: 'Tam et al. — Let Me Speak Freely? Format restrictions and LLM performance (2024)', url: 'https://arxiv.org/abs/2408.02442' },
            { label: 'OpenAI — structured outputs', url: 'https://platform.openai.com/docs/guides/structured-outputs' },
            { label: 'Pydantic — validadores', url: 'https://docs.pydantic.dev/latest/concepts/validators/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que se mascaram os logits dos tokens inválidos em cada passo segundo uma gramática ou autómato.',
          'Distingue garantia de forma de garantia de conteúdo.',
          'Aponta que campos obrigatórios sem informação na fonte empurram o modelo a inventar.',
          'Menciona o risco de perda de qualidade com formato estrito e uma mitigação.',
          'Propõe validação semântica e métrica de exactidão por campo.',
        ],
        fraco: '«Com structured output o modelo já não erra a extracção.»',
        solido: 'Explica a máscara de logits, separa forma de conteúdo e valida com Pydantic.',
        excelente: 'Acrescenta o efeito de campos obrigatórios a induzir invenção, o impacto no raciocínio e mede exactidão por campo com verificação contra a fonte.',
      },
      seguimento: [
        'Como desenharias o esquema para um campo que às vezes não existe no documento?',
        'Porque é que pôr o campo de justificação antes da resposta pode mudar o resultado?',
        'Que custo de latência tem o decoding restringido num servidor self-hosted?',
      ],
      sinaisAlarme: [
        'Confundir JSON válido com dados correctos.',
        'Tornar tudo obrigatório no esquema.',
        'Medir a extracção pela taxa de parse.',
      ],
      modulos: ['tool-calling', 'como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-amostragem-alucinacao-08',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Medir a taxa de alucinação de um assistente em produção',
      enunciado:
        'A direcção quer um número: «quanto é que o nosso assistente alucina?», e quer vê-lo a descer todos os meses. Desenha como o medirias, offline e em produção.',
      contexto:
        'Seguradora em Portugal. Assistente com RAG sobre ≈ 600 documentos de condições gerais e particulares, ≈ 30 000 conversas por mês, respostas médias de ≈ 120 tokens com citações. Há 2 analistas que podem rever ≈ 150 conversas por semana. Orçamento para avaliação automática: até 5% do custo de inferência.',
      minutos: 18,
      dica: 'Começa por definir a unidade: o que é «uma alucinação»? Uma resposta, ou uma afirmação?',
      resposta: [
        {
          type: 'p',
          text: 'Defino a unidade como **afirmação verificável** e a métrica principal como **percentagem de afirmações sem suporte na fonte citada ou recuperada**, medida de três formas complementares: um golden set offline como gate, um juiz automático sobre uma amostra do tráfego, e revisão humana semanal que calibra o juiz. Um só número sem intervalo de confiança e sem definição não serve à direcção.',
        },
        {
          type: 'h',
          text: 'Definições e clarificação',
        },
        {
          type: 'p',
          text: 'Pergunto: o que conta como erro grave (cobertura, exclusão, valores, prazos) e o que é tolerável (uma frase genérica de cortesia)? Que fonte é a verdade (só os documentos, ou também os dados da apólice do cliente)? Com isso separo três números: **taxa de afirmações sem suporte**, **taxa de respostas com pelo menos uma afirmação grave sem suporte** (a que a direcção deve seguir) e **taxa de recusa**, para que ninguém baixe a primeira recusando tudo.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Três circuitos de medição',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'z-off', label: 'Offline (cada PR)', col: 0, row: 0, colSpan: 5, rowSpan: 1, tone: 'ci' },
              { id: 'z-on', label: 'Produção (diário)', col: 0, row: 1, colSpan: 5, rowSpan: 1, tone: 'service' },
              { id: 'z-hum', label: 'Humano (semanal)', col: 0, row: 2, colSpan: 5, rowSpan: 1, tone: 'neutral' },
            ],
            nodes: [
              { id: 'gold', label: 'Golden set', sub: '300 perguntas anotadas', col: 0, row: 0, kind: 'data' },
              { id: 'gate', label: 'Gate de CI', sub: 'afirmações sem suporte', col: 2, row: 0, kind: 'decision' },
              { id: 'traf', label: 'Tráfego', sub: '≈ 1 000 conversas/dia', col: 0, row: 1, kind: 'user' },
              { id: 'amostra', label: 'Amostra 5–10%', sub: 'estratificada por intenção', col: 1, row: 1, kind: 'queue' },
              { id: 'decomp', label: 'Decompor', sub: 'afirmações', col: 2, row: 1, kind: 'model' },
              { id: 'juiz', label: 'Juiz / NLI', sub: 'afirmação vs fonte', col: 3, row: 1, kind: 'model' },
              { id: 'dash', label: 'Dashboard', sub: 'taxa + IC 95%', col: 4, row: 1, kind: 'service' },
              { id: 'rev', label: 'Revisão humana', sub: '150 conversas/semana', col: 3, row: 2, kind: 'user' },
            ],
            edges: [
              { from: 'gold', to: 'gate' },
              { from: 'traf', to: 'amostra' },
              { from: 'amostra', to: 'decomp' },
              { from: 'decomp', to: 'juiz' },
              { from: 'juiz', to: 'dash' },
              { from: 'juiz', to: 'rev', label: 'casos duvidosos', style: 'dashed' },
              { from: 'rev', to: 'juiz', label: 'calibra', style: 'dashed' },
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Golden set offline', text: '≈ 300 perguntas com a resposta de referência e as cláusulas de suporte, incluindo perguntas sem resposta nos documentos (para medir recusa). Corre em cada mudança de prompt, modelo ou índice e bloqueia o merge se a taxa de afirmações graves sem suporte subir além do intervalo de confiança.' },
            { title: 'Juiz sobre o tráfego', text: 'Amostra diária de 5–10% das conversas, estratificada por intenção, com sobreamostragem das intenções de risco. Um modelo decompõe a resposta em afirmações atómicas (ideia do FActScore) e um juiz ou modelo NLI classifica cada uma como suportada, contradita ou sem suporte face às fontes que estavam no contexto. Com respostas de ≈ 120 tokens, o custo fica dentro dos 5%.' },
            { title: 'Calibração humana', text: 'Os analistas revêem 150 conversas por semana: metade aleatória, metade dos casos em que o juiz tem menor confiança. Mede-se a concordância juiz vs humano (precisão e recall de «sem suporte»); se descer, o número do dashboard deixa de ser confiável até se corrigir o juiz.' },
            { title: 'Sinais baratos em 100% do tráfego', text: 'Citações inválidas, respostas sem citação, recuperação abaixo do limiar, e queixas e escaladas dos clientes. Não medem alucinação directamente, mas detectam regressões em minutos, não em dias.' },
          ],
        },
        {
          type: 'p',
          text: 'Os números: com 150 revisões humanas por semana e uma taxa verdadeira à volta de 5%, o intervalo de confiança a 95% é de cerca de ±3,5 pontos — suficiente para tendências mensais, não para comparar semanas. É por isso que o juiz automático, com milhares de casos, dá o número do dashboard, e o humano dá a garantia de que o juiz mede a coisa certa.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Goodhart',
          text: 'Se a equipa for avaliada só pela taxa de alucinação, a forma mais fácil de a baixar é recusar mais ou responder mais vago. O relatório mensal tem sempre três números lado a lado: afirmações graves sem suporte, taxa de recusa e taxa de resolução sem humano.',
        },
        {
          type: 'p',
          text: 'Ficaria para depois: alarmes por intenção, medir alucinação contra os dados da apólice do cliente (exige acesso a dados pessoais no circuito de avaliação, com as implicações de RGPD) e um conjunto adversarial com perguntas que induzem a inventar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Min et al. — FActScore: avaliação de factualidade por afirmações atómicas (2023)', url: 'https://arxiv.org/abs/2305.14251' },
            { label: 'Zheng et al. — Judging LLM-as-a-Judge (2023)', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'RAGAS — faithfulness', url: 'https://docs.ragas.io/en/stable/' },
            { label: 'Langfuse — avaliação de traços em produção', url: 'https://langfuse.com/docs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define a unidade de medida (afirmação verificável) e o que é grave.',
          'Mede taxa de recusa ao lado da taxa de alucinação para evitar o efeito Goodhart.',
          'Combina golden set offline, juiz sobre amostra do tráfego e revisão humana que calibra o juiz.',
          'Faz uma conta de tamanho de amostra ou intervalo de confiança.',
          'Inclui sinais baratos em todo o tráfego (citações inválidas, queixas) para detecção rápida.',
          'Respeita o orçamento dado (custo de avaliação, horas de analista).',
        ],
        fraco: 'Pede a um LLM que dê nota de 1 a 10 a cada resposta e reporta a média.',
        solido: 'Golden set, juiz de faithfulness sobre amostra e revisão humana, com a taxa de recusa ao lado.',
        excelente: 'Decompõe em afirmações, estratifica a amostra por risco, calibra o juiz com concordância medida, apresenta intervalos de confiança e protege a métrica contra Goodhart com três números lado a lado.',
      },
      seguimento: [
        'O juiz e os analistas concordam só em 80% dos casos. O que fazes ao número do dashboard?',
        'Como lidas com uma afirmação que é verdadeira mas não está em nenhum documento?',
        'Como mostrarias à direcção que a descida de um mês não é ruído?',
      ],
      sinaisAlarme: [
        'Dar um número único sem definição nem intervalo de confiança.',
        'Confiar no juiz sem o calibrar com humanos.',
        'Ignorar que recusar mais baixa a métrica.',
      ],
      modulos: ['avaliacao-fundamentos', 'llm-como-juiz', 'avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-amostragem-alucinacao-09',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A mesma pergunta dá respostas diferentes em produção',
      enunciado:
        'Clientes estão a partilhar capturas de ecrã em que o assistente dá prazos diferentes para a mesma pergunta. A temperatura está a 0. Como investigas?',
      contexto:
        'Operador de telecomunicações em Moçambique. Assistente com RAG (índice HNSW, re-ingestão nocturna), modelo por API com fallback para outro fornecedor em erros 429. Numa amostra de 400 conversas com a pergunta «quanto tempo demora a portabilidade do número», 9% dão «48 horas» e as restantes «5 dias úteis». Os traços guardam o prompt montado, os ids dos chunks, os parâmetros e o campo `model` da resposta.',
      minutos: 12,
      dica: 'Agrupa os casos pelo prompt efectivamente enviado. Se o prompt for igual, a culpa está num sítio; se não for, está noutro.',
      resposta: [
        {
          type: 'p',
          text: 'Antes de culpar a amostragem, verifico se **o modelo recebeu o mesmo prompt**. 9% com uma resposta factual diferente é demasiado para ser ruído numérico de temperatura 0; o mais provável é contexto diferente (recuperação, documentos com duas versões do prazo) ou um modelo diferente (fallback ou alias). O ruído numérico é a última hipótese, não a primeira.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Agrupar por hash do prompt', text: 'Calculo um hash do prompt montado e dos parâmetros em cada traço. Se as respostas «48 horas» têm hashes diferentes das de «5 dias úteis», o problema está a montante do modelo. Se o mesmo hash dá as duas respostas, está no modelo ou no fornecedor.' },
            { title: 'Comparar os chunks', text: 'Nos casos com «48 horas», que chunk aparece? Hipótese forte: existe um documento antigo ou uma FAQ com o prazo anterior, e o HNSW, que é aproximado, ou um empate de scores, decide qual dos dois entra no top-k. Se a re-ingestão nocturna duplicou o documento, os dois aparecem em dias diferentes.' },
            { title: 'Ver o campo `model` e o fornecedor', text: 'Cruzo as respostas divergentes com o campo `model` e com os eventos de fallback. Se os 9% coincidem com picos de 429 e o fallback usa outro fornecedor com outro prompt ou outro modelo, está explicado.' },
            { title: 'Procurar caminhos de código', text: 'Verifico se alguma rota (canal WhatsApp, por exemplo) constrói o cliente sem passar a temperatura e cai no valor por omissão da API, que é 1 em várias APIs.' },
            { title: 'Só então, não-determinismo numérico', text: 'Se o mesmo hash e o mesmo modelo dão as duas respostas, os logits dos dois prazos estão quase empatados — o que quase sempre significa que o contexto tem informação contraditória.' },
          ],
        },
        {
          type: 'p',
          text: 'Causa provável neste cenário: a página de portabilidade foi actualizada, a re-ingestão criou um documento novo sem retirar o antigo, e as duas versões competem com scores quase iguais. A correcção tem duas partes: **dados** (versionamento com `vigente = true`, remover duplicados na ingestão, desempate determinista por score e depois por id) e **sistema** (fallback com o mesmo prompt e um modelo validado no golden set, cliente único que impõe os parâmetros, versão datada do modelo).',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Acrescento ao golden set uma métrica de **consistência**: cada pergunta corre 5 vezes e mede-se a fracção de respostas que concordam com a referência. A ingestão passa a falhar se dois documentos activos tiverem o mesmo título com conteúdo diferente, e há um alarme quando a taxa de fallback passa um limiar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI Cookbook — saídas reproduzíveis com o parâmetro seed', url: 'https://cookbook.openai.com/examples/reproducible_outputs_with_the_seed_parameter' },
            { label: 'Malkov e Yashunin — HNSW (2016)', url: 'https://arxiv.org/abs/1603.09320' },
            { label: 'OpenTelemetry — convenções semânticas para GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa variação a montante (prompt diferente) de variação no modelo, agrupando por prompt efectivo.',
          'Ordena hipóteses por probabilidade: dados ou recuperação, fallback ou alias, parâmetros por omissão, e só depois ruído numérico.',
          'Usa os traços (ids dos chunks, campo `model`, parâmetros) para confirmar antes de mudar código.',
          'Propõe correcção nos dados (versionamento, duplicados, desempate determinista) e no sistema (fallback, parâmetros, versão do modelo).',
          'Acrescenta uma métrica de consistência e verificações na ingestão para impedir a regressão.',
        ],
        fraco: '«É o não-determinismo do modelo, não há nada a fazer» ou «mudar para temperatura 0», que já está.',
        solido: 'Compara prompts e chunks nos traços, encontra o documento duplicado e corrige a ingestão.',
        excelente: 'Usa o hash do prompt para dividir o espaço de hipóteses, verifica fallback e parâmetros por omissão, corrige dados e sistema e acrescenta consistência ao golden set e um alarme de fallback.',
      },
      seguimento: [
        'Como farias o desempate determinista numa pesquisa híbrida com RRF?',
        'O fallback para outro fornecedor deve usar o mesmo prompt? Que riscos tem?',
        'Como detectarias documentos contraditórios no corpus antes de um cliente os encontrar?',
      ],
      sinaisAlarme: [
        'Atribuir 9% de divergência a ruído numérico sem olhar para os traços.',
        'Não considerar o fallback nem os valores por omissão.',
        'Corrigir só o prompt quando o problema está nos dados.',
      ],
      modulos: ['observabilidade-llmops', 'ingestao-chunking', 'apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-amostragem-alucinacao-10',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Implementa um amostrador com temperatura, top-k e top-p',
      enunciado:
        'Escreve em numpy uma função que recebe os logits do próximo token e devolve a distribuição depois de temperatura, top-k e top-p, e outra que amostra dela com uma seed. Mostra que funciona.',
      contexto:
        'Assinaturas: `filtrar(logits, temperatura=1.0, top_k=None, top_p=None) -> np.ndarray` (probabilidades que somam 1) e `amostrar(logits, n, seed, **kw) -> np.ndarray` (índices). Temperatura 0 deve comportar-se como greedy. Usa só numpy; o resultado tem de ser reproduzível com a mesma seed.',
      minutos: 20,
      dica: 'Top-p fica com o menor prefixo, por probabilidade decrescente, cuja massa acumulada chega a p. Cuidado com o token que faz atravessar o limiar.',
      resposta: [
        {
          type: 'p',
          text: 'Aplico pela ordem habitual: dividir os logits pela temperatura, cortar o top-k pondo os logits abaixo do k-ésimo maior a −∞, softmax estável, cortar o top-p ordenando por probabilidade e ficando com o menor prefixo cuja massa chega a p, e renormalizar. O custo é O(V log V) por passo, dominado pela ordenação; em produção usa-se selecção parcial (`argpartition`) quando k é pequeno.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Amostrador com temperatura, top-k e top-p, e gerador local com seed.',
          code: `import numpy as np


def filtrar(logits, temperatura: float = 1.0, top_k: int | None = None,
            top_p: float | None = None) -> np.ndarray:
    """Distribuição final (soma 1) depois de temperatura, top-k e top-p, por esta ordem."""
    z = np.asarray(logits, dtype=np.float64)
    if z.ndim != 1 or z.size == 0:
        raise ValueError("logits tem de ser um vector não vazio")
    if temperatura < 0:
        raise ValueError("temperatura tem de ser >= 0")
    if top_p is not None and not 0 < top_p <= 1:
        raise ValueError("top_p tem de estar em ]0, 1]")
    if temperatura == 0:                          # greedy: toda a massa no argmax
        p = np.zeros_like(z)
        p[np.argmax(z)] = 1.0
        return p
    z = z / temperatura
    if top_k is not None and 0 < top_k < z.size:
        corte = np.sort(z)[-top_k]                # k-ésimo maior logit (empates ficam)
        z = np.where(z < corte, -np.inf, z)
    p = np.exp(z - z.max())                       # softmax estável
    p /= p.sum()
    if top_p is not None and top_p < 1:
        ordem = np.argsort(-p, kind="stable")
        acum = np.cumsum(p[ordem])
        n = int(np.searchsorted(acum, top_p)) + 1  # menor prefixo com massa >= top_p
        manter = np.zeros(p.size, dtype=bool)
        manter[ordem[:n]] = True
        p = np.where(manter, p, 0.0)
        p /= p.sum()
    return p


def amostrar(logits, n: int, seed: int, **kw) -> np.ndarray:
    rng = np.random.default_rng(seed)             # gerador local, nunca o estado global
    p = filtrar(logits, **kw)
    return rng.choice(p.size, size=n, p=p)


vocab = ["caminho", "ser", "chegar", "atrasado", "voar", "dançar"]
logits = np.array([3.0, 1.8, 1.6, 1.0, -1.0, -2.0])

print(filtrar(logits).round(3))                    # [0.585 0.176 0.144 0.079 0.011 0.004]
print(filtrar(logits, temperatura=0.5).round(3))   # [0.855 0.078 0.052 0.016 0.    0.   ]
print(filtrar(logits, temperatura=2.0).round(3))   # [0.38  0.209 0.189 0.14  0.051 0.031]
print(filtrar(logits, top_k=2).round(3))           # [0.769 0.231 0.    0.    0.    0.   ]
print(filtrar(logits, top_p=0.9).round(3))         # [0.646 0.195 0.159 0.    0.    0.   ]
print(filtrar(logits, temperatura=0).tolist())     # [1.0, 0.0, 0.0, 0.0, 0.0, 0.0]

a = amostrar(logits, n=1000, seed=42, top_p=0.9)
print({vocab[i]: int(c) for i, c in zip(*np.unique(a, return_counts=True))})
# {'caminho': 645, 'ser': 194, 'chegar': 161}
print(np.array_equal(a, amostrar(logits, n=1000, seed=42, top_p=0.9)))  # True
print(sorted(set(a.tolist())) == [0, 1, 2])        # True: a cauda nunca sai`,
        },
        {
          type: 'h',
          text: 'Casos-limite e testes',
        },
        {
          type: 'list',
          items: [
            '**Atravessar o limiar de top-p:** com massas 0,585, 0,761 e 0,905, o núcleo para p = 0,9 tem três tokens — o terceiro é o que faz chegar a 0,9 e tem de ficar. O `searchsorted` mais 1 trata disso.',
            '**Temperatura 0:** dividir por zero dá `inf` e `nan`; trato-a à parte como argmax.',
            '**Empates no top-k:** o corte por valor mantém todos os empatados com o k-ésimo, por isso podem sobrar mais de k tokens; é uma escolha que documento.',
            '**Reprodutibilidade:** uso um `Generator` local com a seed, nunca `np.random.seed`, para que outras partes do programa não mudem a sequência.',
          ],
        },
        {
          type: 'p',
          text: 'Testes que escreveria: a distribuição soma 1 em todas as combinações; com temperatura a descer, a entropia não sobe; top-p = 1 e top-k = None devolvem o softmax puro; e um teste estatístico com muitas amostras que compara frequências com as probabilidades. Extensões habituais: penalização de repetição, processar um lote de logits de forma vectorizada, e min-p.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Holtzman et al. — The Curious Case of Neural Text Degeneration (2019)', url: 'https://arxiv.org/abs/1904.09751' },
            { label: 'NumPy — geração de números aleatórios (Generator)', url: 'https://numpy.org/doc/stable/reference/random/generator.html' },
            { label: 'Hugging Face — estratégias de geração', url: 'https://huggingface.co/docs/transformers/generation_strategies' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Aplica temperatura, top-k e top-p pela ordem certa e renormaliza.',
          'Inclui no núcleo o token que faz a massa acumulada atravessar p.',
          'Trata temperatura 0 como greedy sem dividir por zero.',
          'Usa softmax estável e um gerador local com seed.',
          'Escreve testes de propriedades e mostra resultados verificáveis.',
        ],
        fraco: 'Corta o top-p antes da temperatura, exclui o token que atravessa o limiar ou divide por zero.',
        solido: 'Implementação correcta com ordem certa, renormalização, greedy à parte e seed.',
        excelente: 'Discute empates, complexidade e `argpartition`, usa `Generator` local, escreve testes estatísticos e de propriedades e sabe estender a lotes e penalização de repetição.',
      },
      seguimento: [
        'Como vectorizarias isto para um lote de 64 sequências?',
        'Como implementarias uma penalização de repetição?',
        'O que é min-p e em que difere de top-p?',
      ],
      sinaisAlarme: [
        'Usar o estado global do gerador aleatório.',
        'Não renormalizar depois do corte.',
        'Não testar nenhum caso-limite.',
      ],
      modulos: ['como-funciona-llm'],
    },
  ],
};
