import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'llm-juiz',
  numero: 21,
  bloco: 'avaliacao',
  titulo: 'LLM-como-juiz',
  resumo:
    'Quando pôr um modelo a avaliar outro, como escrever a rubrica, que vieses o juiz tem e como provar que ele concorda com humanos. É perguntado porque quase todas as equipas usam juízes e poucas os calibram.',
  icon: '⚖️',
  modulos: ['llm-como-juiz', 'avaliacao-fundamentos', 'avaliar-rag'],
  essencial: [
    'Hierarquia de verificadores: asserção em código primeiro, juiz só para o que o código não verifica, humano para calibrar o juiz.',
    'Rubrica: critérios binários decompostos (passa/falha por critério, com a fronteira escrita) calibram-se melhor do que uma nota Likert de 1 a 10.',
    'Pointwise avalia uma resposta sozinha; pairwise compara A contra B (mais sensível, mas com viés de posição); com referência compara com a resposta dourada.',
    'Zheng et al. (2023): juiz forte atinge mais de 80% de concordância com humanos, o mesmo nível humano–humano; vieses de posição, verbosidade e auto-preferência.',
    'Cohen kappa = (p_o − p_e) / (1 − p_e); p_e é a concordância esperada por acaso a partir das taxas marginais de cada avaliador.',
    'Landis e Koch: 0,41–0,60 moderada, 0,61–0,80 substancial, acima de 0,80 quase perfeita. Gate típico: kappa ≥ 0,6 por critério.',
    'Um juiz que aprova tudo tem concordância igual à taxa de aprovação humana e kappa 0: a concordância bruta engana com classes desequilibradas.',
    'O juiz é um modelo diferente do avaliado (outro fornecedor ou escalão superior), com versão fixada, temperatura 0 e saída estruturada.',
    'Mudar o modelo do juiz, a rubrica ou o prompt invalida a calibração: volta a medir o kappa no conjunto anotado congelado.',
    'Em produção amostra-se: com 1000 avaliações a proporção tem IC95 de cerca de ±2,5 pontos percentuais perto de 80%.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-llm-juiz-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quando usar um juiz e quando uma asserção em código chega',
      enunciado:
        'Vais avaliar um assistente que responde a clientes de uma seguradora. Que partes avalias com um LLM-como-juiz e que partes avalias com código normal?',
      minutos: 4,
      dica: 'Pergunta-te, critério a critério, se consegues escrever a verificação sem um modelo.',
      resposta: [
        {
          type: 'p',
          text: 'Uso o juiz **só para o que não consigo verificar de forma determinista**. Tudo o que tem forma — JSON válido, campo presente, número da apólice certo, ferramenta chamada, nenhuma frase proibida, link para o domínio certo — verifico com asserções em código, porque são grátis, instantâneas, reprodutíveis e não têm vieses.',
        },
        {
          type: 'p',
          text: 'O juiz entra quando a resposta certa admite muitas formulações: «a franquia é de 150 euros por sinistro» e «paga os primeiros 150 euros de cada participação» dizem o mesmo e nenhuma comparação de strings o apanha. Também entra para critérios de juízo — fidelidade ao contexto recuperado, se respondeu à pergunta, tom. Mesmo aí, decomponho: se «tom adequado» inclui «frases com menos de 30 palavras», essa parte sai do juiz e vai para código.',
        },
        {
          type: 'table',
          head: ['Critério', 'Verificador', 'Porquê'],
          rows: [
            ['Saída respeita o esquema', 'Código (Pydantic, JSON Schema)', 'Determinista e exacto'],
            ['Chamou `consultar_apolice` com o NIF certo', 'Código sobre o traço', 'Comparação de argumentos'],
            ['Valor da franquia correcto', 'Código com regex ou extracção, juiz se a forma varia muito', 'Número extraível na maioria dos casos'],
            ['Resposta fiel aos documentos', 'Juiz com o contexto', 'Paráfrase, não há igualdade de strings'],
            ['Juiz em si', 'Anotação humana', 'É o humano que calibra o juiz'],
          ],
        },
        {
          type: 'p',
          text: 'Há uma terceira camada: humanos, que não avaliam tudo mas anotam um conjunto para medir se o juiz concorda com eles. Um juiz sem essa medição é uma opinião automatizada.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Juiz para tudo',
          text: 'Pôr o juiz a verificar «o JSON é válido» ou «mencionou o número de apólice» troca uma verificação exacta e gratuita por uma probabilística e paga. Quando o juiz e a asserção discordam numa coisa verificável, quem está errado é o juiz.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Demystifying evals for AI agents (graders de código, de modelo e humanos)', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena', url: 'https://arxiv.org/abs/2306.05685' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que asserções em código vêm primeiro e o juiz só cobre o que o código não verifica.',
          'Dá exemplos concretos de critérios verificáveis por código (esquema, argumentos de ferramentas, frases proibidas).',
          'Explica que o juiz é necessário quando há paráfrase ou critério de juízo (fidelidade, relevância, tom).',
          'Menciona que o juiz tem de ser calibrado contra anotação humana.',
        ],
        fraco: '«Uso um LLM para avaliar tudo, é mais flexível», sem separar o que é verificável por código.',
        solido: 'Separa critérios estruturais (código) de critérios semânticos (juiz) com exemplos, e menciona calibração com humanos.',
        excelente: 'Decompõe critérios mistos para tirar do juiz tudo o que é verificável, trata a anotação humana como terceira camada e diz que, em caso de conflito num critério verificável, a asserção ganha.',
      },
      seguimento: [
        'Que fazes com um critério que é verificável em 90% dos casos e ambíguo nos outros 10%?',
        'Quanto custa, em ordem de grandeza, avaliar 240 casos com um juiz do escalão grande?',
        'Como garantes que as asserções em código não ficam demasiado rígidas?',
      ],
      sinaisAlarme: [
        'Usar o juiz para validar formato ou presença de campos.',
        'Não mencionar humanos em nenhum ponto do processo.',
        'Tratar a nota do juiz como verdade sem dizer como foi validada.',
      ],
      modulos: ['llm-como-juiz', 'avaliacao-fundamentos'],
    },
    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-llm-juiz-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Rubrica binária decomposta ou nota de 1 a 10',
      enunciado:
        'A equipa tem um juiz que dá uma nota de qualidade de 1 a 10 a cada resposta. Propões mudar a rubrica. Para quê, e como a escreverias?',
      minutos: 5,
      dica: 'Tenta explicar a um colega o que separa um 6 de um 7.',
      resposta: [
        {
          type: 'p',
          text: 'Trocava a nota única por **três a cinco critérios binários**, cada um com a fronteira entre passa e falha escrita e exemplos de falha. Uma escala de 1 a 10 não tem definição operacional: ninguém sabe dizer o que separa um 6 de um 7, o juiz concentra as notas numa banda estreita e uma média que passa de 7,4 para 7,1 não diz o que piorou.',
        },
        {
          type: 'p',
          text: 'Com critérios decompostos — por exemplo **fiel ao contexto**, **responde à pergunta feita**, **não promete o que não pode cumprir**, **tratamento formal** — cada critério tem uma definição verificável («qualquer afirmação factual ausente do contexto torna a resposta não fiel») e a calibração torna-se um problema de concordância em duas classes, que o Cohen kappa mede bem. Quando a qualidade cai, sei qual critério caiu.',
        },
        {
          type: 'compare',
          left: {
            title: 'Likert de 1 a 10',
            items: [
              'Fronteiras entre notas não definidas',
              'Notas concentradas e instáveis entre execuções',
              'Média não diz o que mudou',
              'Calibração exige concordância ponderada e é difícil de explicar',
            ],
          },
          right: {
            title: 'Critérios binários',
            items: [
              'Fronteira escrita com exemplos de passa e falha',
              'Veredictos mais estáveis',
              'Regressão localizada num critério',
              'Kappa por critério, fácil de explicar ao produto',
            ],
          },
        },
        {
          type: 'p',
          text: 'Na prática peço saída estruturada com um campo de análise **antes** dos booleanos, para o raciocínio condicionar o veredicto em vez de o justificar depois. Se o produto precisa de gradação, uso três níveis com definição (falha, parcial, completo) em vez de dez. A alternativa séria às escalas largas é o G-Eval, que pondera a nota pelas probabilidades dos tokens da escala, mas exige *logprobs*, que nem todos os fornecedores expõem.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Critérios que se sobrepõem',
          text: 'Se «completa» e «responde à pergunta» falham sempre juntas, são o mesmo critério com dois nomes: a rubrica fica mais cara e a informação não aumenta. Olho para a correlação entre critérios nas anotações humanas antes de fixar a lista.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. (2023) — G-Eval', url: 'https://arxiv.org/abs/2303.16634' },
            { label: 'OpenAI — guia de evals', url: 'https://platform.openai.com/docs/guides/evals' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica porque uma escala larga não tem definição operacional e é instável.',
          'Propõe critérios binários com a fronteira escrita e exemplos de falha.',
          'Liga a escolha binária à calibração em duas classes com kappa.',
          'Menciona a ordem dos campos na saída estruturada (análise antes do veredicto) ou o G-Eval como alternativa.',
        ],
        fraco: '«Binário é mais simples», sem dizer o que se ganha na calibração nem na localização de regressões.',
        solido: 'Propõe três a cinco critérios binários com definições, explica a estabilidade e a calibração por critério.',
        excelente: 'Acrescenta a ordem dos campos no esquema, a verificação de redundância entre critérios com dados humanos e quando três níveis definidos fazem mais sentido do que binário.',
      },
      seguimento: [
        'Como escolhes os exemplos de falha que vão para o prompt do juiz?',
        'Uma chamada por critério ou todos os critérios numa chamada?',
        'O produto quer um único número para o dashboard. O que lhe dás?',
      ],
      sinaisAlarme: [
        'Defender a escala de 1 a 10 «porque tem mais informação».',
        'Rubrica com critérios vagos como «qualidade geral» ou «útil».',
        'Não saber dizer o que acontece à calibração com a escala larga.',
      ],
      modulos: ['llm-como-juiz'],
    },
    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-llm-juiz-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Pointwise, pairwise ou contra uma resposta de referência',
      enunciado:
        'Estás a decidir se a nova versão do prompt é melhor do que a actual. Pedes ao juiz uma nota por resposta, uma comparação entre as duas, ou uma comparação com a resposta dourada? Quando usas cada uma?',
      minutos: 7,
      dica: 'Distingue «esta resposta é aceitável?» de «qual das duas é melhor?».',
      resposta: [
        {
          type: 'p',
          text: 'Depende da pergunta. Para **regressão e gates** uso *pointwise*, de preferência **com referência** quando tenho resposta dourada: dá uma taxa de aprovação absoluta, comparável entre versões e ao longo do tempo. Para **escolher entre duas variantes próximas** uso *pairwise*, que é mais sensível a diferenças pequenas, com as posições trocadas para neutralizar o viés de posição.',
        },
        {
          type: 'table',
          head: ['Modo', 'Responde a', 'Pontos fortes', 'Pontos fracos'],
          rows: [
            ['Pointwise sem referência', 'Esta resposta cumpre os critérios?', 'Funciona em produção, onde não há dourada', 'Juiz tem de saber o que é certo; mais leniente'],
            ['Pointwise com referência', 'Diz o mesmo que a resposta dourada?', 'Mais estável e mais fácil de calibrar', 'Precisa de referência; pode penalizar respostas certas e diferentes'],
            ['Pairwise', 'A ou B é melhor?', 'Sensível a diferenças pequenas; sem escala', 'Viés de posição; só relativo; custo cresce com o número de variantes'],
          ],
        },
        {
          type: 'p',
          text: 'O pairwise tem dois custos. Primeiro, **o viés de posição**: Zheng et al. (2023) mostram que os juízes preferem uma das posições; corro cada par duas vezes com A e B trocados e conto como empate quando o veredicto muda. Isso duplica o custo. Segundo, **é só relativo**: «B ganha 58% dos pares» não me diz se B é bom o suficiente para ir para produção — se ambos forem maus, um ganha na mesma. Por isso nunca é o meu gate.',
        },
        {
          type: 'p',
          text: 'O pointwise com referência é o meu padrão no conjunto dourado: a pergunta «a resposta contém os factos da referência e não os contradiz?» é muito mais fácil para o juiz do que «esta resposta está certa?», e o kappa contra humanos costuma ser mais alto. O risco é a referência ficar desactualizada quando a política muda; versiono-a junto com o conjunto. Sem referência — em amostras de produção — avalio critérios que não dependem do gabarito: fidelidade ao contexto recuperado, se respondeu à pergunta, tom.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Combinação que uso',
          text: 'Gate de CI: pointwise com referência, taxa por critério com intervalo de confiança. Decisão entre duas variantes candidatas: pairwise com troca de posições num subconjunto de 100 a 200 casos. Produção: pointwise sem referência numa amostra.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge (pairwise, single-answer e reference-guided)', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'Wang et al. (2023) — Large Language Models are not Fair Evaluators', url: 'https://arxiv.org/abs/2305.17926' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue avaliação absoluta (pointwise) de relativa (pairwise) e diz para que serve cada uma.',
          'Menciona o viés de posição no pairwise e a mitigação com troca de posições.',
          'Explica que o pairwise não serve de gate porque não diz se a melhor é suficiente.',
          'Explica as vantagens e o risco (referência desactualizada) da avaliação com referência.',
          'Diz o que usa em produção, onde não há resposta dourada.',
        ],
        fraco: 'Escolhe um dos modos para tudo, sem falar de viés de posição nem da diferença entre absoluto e relativo.',
        solido: 'Usa pointwise com referência para o gate e pairwise com troca de posições para escolher entre variantes.',
        excelente: 'Acrescenta o custo duplicado da troca, o tratamento de veredictos inconsistentes como empate, o versionamento das referências e a avaliação sem referência em produção.',
      },
      seguimento: [
        'Com cinco variantes, quantas comparações pairwise precisas e como reduzes?',
        'A referência foi escrita há seis meses e a política mudou. Como detectas?',
        'Como transformas resultados pairwise num ranking?',
      ],
      sinaisAlarme: [
        'Usar a taxa de vitórias pairwise como critério de lançamento.',
        'Não conhecer o viés de posição.',
        'Assumir que a referência está sempre certa.',
      ],
      modulos: ['llm-como-juiz', 'avaliacao-fundamentos'],
    },
    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-llm-juiz-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Os vieses conhecidos do juiz e como os mitigas',
      enunciado:
        'Que vieses tem um LLM quando é usado como juiz, e o que fazes concretamente para cada um?',
      minutos: 5,
      resposta: [
        {
          type: 'p',
          text: 'Os três documentados no artigo do MT-Bench (Zheng et al., 2023) são **posição**, **verbosidade** e **auto-preferência**. Nenhum se resolve escrevendo «sê imparcial» no prompt; resolve-se com o desenho da avaliação e confirma-se medindo contra humanos.',
        },
        {
          type: 'table',
          head: ['Viés', 'O que é', 'Mitigação'],
          rows: [
            ['Posição', 'Em pairwise, preferir a resposta numa posição fixa', 'Correr com A e B trocados; veredicto inconsistente conta como empate'],
            ['Verbosidade', 'Preferir respostas mais longas, mesmo sem mais conteúdo', 'Critérios binários com fronteira escrita; critério explícito de concisão; medir a correlação entre comprimento e aprovação'],
            ['Auto-preferência', 'Favorecer texto gerado pelo próprio modelo ou família', 'Juiz de outro fornecedor ou escalão; nunca o mesmo modelo que respondeu'],
            ['Leniência', 'Aprovar quase tudo', 'Exemplos de falha na rubrica; medir a taxa de verdadeiros negativos contra humanos'],
          ],
        },
        {
          type: 'p',
          text: 'A auto-preferência tem evidência específica: Panickssery, Bowman e Feng (2024) mostram que modelos como GPT-4 e Llama 2 distinguem as suas gerações das de outros acima do acaso e que, após *fine-tuning*, a força da auto-preferência cresce linearmente com essa capacidade de auto-reconhecimento. A consequência prática é simples: se o produto responde com um modelo de um fornecedor, o juiz vem de outro.',
        },
        {
          type: 'p',
          text: 'Para verbosidade faço um teste barato: pego em 30 respostas aprovadas, acrescento um parágrafo plausível mas irrelevante e vejo quantas mudam de veredicto ou de nota. Para a leniência, olho para a matriz de confusão do juiz contra humanos: o número que importa é quantas das respostas que os humanos chumbam o juiz também chumba.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que dizer em voz alta',
          text: 'Os vieses existem, mas o meu controlo final não é a lista de mitigações: é o kappa por critério contra anotação humana, refeito sempre que mudo o juiz ou a rubrica.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'Panickssery, Bowman e Feng (2024) — LLM Evaluators Recognize and Favor Their Own Generations', url: 'https://arxiv.org/abs/2404.13076' },
            { label: 'Wang et al. (2023) — Large Language Models are not Fair Evaluators', url: 'https://arxiv.org/abs/2305.17926' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia posição, verbosidade e auto-preferência.',
          'Dá uma mitigação concreta para cada um (troca de posições, critérios com fronteira, juiz de outro fornecedor).',
          'Diz que instruções de imparcialidade no prompt não chegam.',
          'Propõe medir os vieses (teste de perturbação, matriz de confusão) em vez de os assumir resolvidos.',
        ],
        fraco: 'Nomeia um viés e propõe «dizer ao modelo para ser imparcial».',
        solido: 'Nomeia os três vieses com uma mitigação de desenho para cada um.',
        excelente: 'Cita a evidência, propõe testes de perturbação para medir a verbosidade, olha para a taxa de verdadeiros negativos para a leniência e fecha com a calibração humana como controlo final.',
      },
      seguimento: [
        'Como medirias o viés de verbosidade sem anotação humana nova?',
        'E se o único modelo forte disponível for do mesmo fornecedor que o avaliado?',
        'Que outros vieses esperas num juiz de tom em português?',
      ],
      sinaisAlarme: [
        'Usar o mesmo modelo para responder e julgar sem ver problema.',
        'Achar que temperatura 0 elimina os vieses.',
        'Não saber nenhum viés pelo nome.',
      ],
      modulos: ['llm-como-juiz'],
    },
    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-llm-juiz-05',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque é que 90% de concordância pode não valer nada',
      enunciado:
        'O teu juiz concorda com os anotadores em 90% dos casos. Chega para o pôr no gate de CI? Explica como medes a concordância a sério.',
      minutos: 5,
      dica: 'Qual é a concordância de um juiz que aprova tudo?',
      resposta: [
        {
          type: 'p',
          text: 'Não chega sem saber a taxa de aprovação humana. Se os humanos aprovam 90% das respostas, **um juiz que aprova tudo concorda 90%** e não serve para nada. Meço com o **Cohen kappa**, que desconta a concordância esperada por acaso, e olho para a matriz de confusão do juiz.',
        },
        {
          type: 'p',
          text: 'A fórmula é `kappa = (p_o − p_e) / (1 − p_e)`. `p_o` é a concordância observada; `p_e` é a que dois avaliadores independentes com as mesmas taxas marginais teriam por acaso: em binário, `p_e = p_h·p_j + (1 − p_h)·(1 − p_j)`, com `p_h` e `p_j` as taxas de aprovação do humano e do juiz. No exemplo do juiz que aprova tudo, `p_e = 0,9 × 1 + 0,1 × 0 = 0,9`, logo kappa = 0. Kappa 1 é concordância perfeita; 0 é o acaso; negativo é pior do que o acaso.',
        },
        {
          type: 'table',
          head: ['Kappa', 'Leitura (Landis e Koch, 1977)'],
          rows: [
            ['0,21 a 0,40', 'Razoável'],
            ['0,41 a 0,60', 'Moderada'],
            ['0,61 a 0,80', 'Substancial'],
            ['acima de 0,80', 'Quase perfeita'],
          ],
          caption: 'A escala é uma convenção, não uma lei. Uso kappa ≥ 0,6 por critério para o juiz bloquear PRs.',
        },
        {
          type: 'p',
          text: 'A matriz de confusão diz *como* o juiz erra. Com as respostas que os humanos chumbam como classe positiva de «defeito», quero saber a fracção que o juiz também chumba: é a capacidade de apanhar regressões. Um juiz leniente tem esta taxa baixa e muitos falsos «passa».',
        },
        {
          type: 'p',
          text: 'Também meço o **kappa entre dois humanos** no mesmo conjunto: é o tecto realista. Se os anotadores só concordam com kappa 0,55, o problema é a rubrica, não o juiz. E reporto o kappa com intervalo de confiança por bootstrap: com 30 anotações o intervalo é tão largo que não distingue «moderada» de «quase perfeita»; por isso anoto pelo menos 100 casos estratificados.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — cohen_kappa_score', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html' },
            { label: 'Zheng et al. (2023) — concordância juiz–humano e humano–humano', url: 'https://arxiv.org/abs/2306.05685' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Mostra que a concordância bruta engana quando as classes são desequilibradas (juiz que aprova tudo).',
          'Escreve a fórmula do kappa e como se calcula p_e a partir das taxas marginais.',
          'Interpreta valores de kappa e dá um limiar para o gate.',
          'Usa a matriz de confusão para ver se o juiz apanha as respostas más.',
          'Menciona o kappa humano–humano como tecto ou o intervalo de confiança.',
        ],
        fraco: '«90% é bom, está acima de 80%», sem olhar para as taxas marginais.',
        solido: 'Explica o kappa com a fórmula, mostra o caso do juiz que aprova tudo e define um limiar.',
        excelente: 'Acrescenta o tecto humano–humano, o intervalo por bootstrap e o tamanho de amostra, e lê a matriz de confusão pela capacidade de apanhar defeitos.',
      },
      seguimento: [
        'Como calculas p_e com três categorias em vez de duas?',
        'Que fazes se o kappa humano–humano for 0,5?',
        'Quantas anotações precisas para o limite inferior do IC passar 0,6?',
      ],
      sinaisAlarme: [
        'Reportar apenas concordância bruta.',
        'Não saber o que é concordância por acaso.',
        'Calibrar o juiz contra as próprias respostas do engenheiro, sem anotadores do domínio.',
      ],
      modulos: ['llm-como-juiz', 'avaliacao-fundamentos'],
    },
    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-llm-juiz-06',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Implementa o Cohen kappa e a matriz de confusão do juiz',
      enunciado:
        'Escreve uma função que, dadas as etiquetas de um humano e de um juiz para as mesmas respostas, devolva a concordância observada, a esperada por acaso e o Cohen kappa. Escreve também a matriz de confusão. Sem bibliotecas de métricas.',
      contexto:
        'Assinaturas: `cohen_kappa(humano, juiz) -> tuple[float, float, float]` com (p_o, p_e, kappa) e `matriz_confusao(humano, juiz) -> dict[tuple, int]`. As etiquetas são hashable (0/1 ou strings) e pode haver mais de duas categorias. Exemplo de dados: 20 respostas, 1 = passa, 0 = falha.',
      minutos: 15,
      dica: 'p_e soma, por categoria, o produto das frequências marginais dos dois avaliadores.',
      resposta: [
        {
          type: 'p',
          text: 'Uma passagem para contar pares e marginais: O(n) em tempo e O(c²) em memória para a matriz, com c categorias. `p_o` é a fracção de pares iguais; `p_e` soma, para cada categoria, a frequência no humano vezes a frequência no juiz; o kappa é `(p_o − p_e) / (1 − p_e)`.',
        },
        {
          type: 'code',
          lang: 'python',
          code: `from collections import Counter
from typing import Hashable, Sequence


def matriz_confusao(humano: Sequence[Hashable], juiz: Sequence[Hashable]) -> dict[tuple, int]:
    """Contagens (rotulo_humano, rotulo_juiz) para todas as combinações de categorias."""
    if len(humano) != len(juiz):
        raise ValueError("as duas listas têm de ter o mesmo comprimento")
    cats = sorted(set(humano) | set(juiz), key=str)
    pares = Counter(zip(humano, juiz))
    return {(h, j): pares.get((h, j), 0) for h in cats for j in cats}


def cohen_kappa(humano: Sequence[Hashable], juiz: Sequence[Hashable]) -> tuple[float, float, float]:
    """Devolve (p_o, p_e, kappa). kappa = (p_o - p_e) / (1 - p_e)."""
    n = len(humano)
    if n == 0 or n != len(juiz):
        raise ValueError("listas vazias ou de comprimentos diferentes")
    p_o = sum(h == j for h, j in zip(humano, juiz)) / n
    fh, fj = Counter(humano), Counter(juiz)
    p_e = sum((fh[c] / n) * (fj[c] / n) for c in set(fh) | set(fj))
    if p_e == 1.0:  # os dois usaram sempre a mesma única categoria
        return p_o, p_e, float("nan")
    return p_o, p_e, (p_o - p_e) / (1 - p_e)


if __name__ == "__main__":
    # 20 respostas anotadas: 1 = passa, 0 = falha
    HUMANO = [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0]
    JUIZ   = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0]
    p_o, p_e, k = cohen_kappa(HUMANO, JUIZ)
    print(f"p_o={p_o:.3f}  p_e={p_e:.3f}  kappa={k:.3f}")
    # p_o=0.800  p_e=0.620  kappa=0.474
    for (h, j), c in matriz_confusao(HUMANO, JUIZ).items():
        print(f"humano={h} juiz={j}: {c}")
    # humano=0 juiz=0: 3
    # humano=0 juiz=1: 3
    # humano=1 juiz=0: 1
    # humano=1 juiz=1: 13
    print(cohen_kappa(HUMANO, [1] * 20))  # juiz que aprova tudo
    # (0.7, 0.7, 0.0)`,
        },
        {
          type: 'p',
          text: 'A leitura do resultado é o que o entrevistador quer ouvir: 80% de concordância, mas kappa 0,47 — moderado. A matriz explica porquê: das 6 respostas que o humano chumba, o juiz só chumba 3. O juiz é leniente, e é exactamente nas respostas más que a avaliação tem de funcionar. Com a mesma taxa de aprovação humana, o juiz que aprova tudo tem 70% de concordância e kappa 0.',
        },
        {
          type: 'list',
          items: [
            'Casos-limite: listas vazias ou de tamanhos diferentes levantam erro; se os dois usam sempre a mesma categoria, `p_e = 1` e o kappa é indefinido (devolvo NaN em vez de dividir por zero).',
            'Teste: comparo com `sklearn.metrics.cohen_kappa_score` em dados aleatórios (dá 0,474 neste exemplo) e testo os casos conhecidos: concordância perfeita dá 1, juiz constante dá 0.',
            'Extensões prováveis: kappa ponderado para escalas ordinais, intervalo de confiança por bootstrap reamostrando os pares, kappa por critério da rubrica.',
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — cohen_kappa_score', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html' },
            { label: 'Python — collections.Counter', url: 'https://docs.python.org/3/library/collections.html#collections.Counter' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Calcula p_e a partir das frequências marginais de cada avaliador, não de uma distribuição uniforme.',
          'Trata listas vazias, comprimentos diferentes e p_e = 1.',
          'Funciona com mais de duas categorias.',
          'Interpreta o resultado (concordância alta, kappa moderado, juiz leniente pela matriz).',
          'Propõe testar contra uma implementação de referência e com casos conhecidos.',
        ],
        fraco: 'Calcula só a concordância, ou usa p_e = 0,5 fixo, e não trata a divisão por zero.',
        solido: 'Implementação correcta e geral com casos-limite e um exemplo verificado.',
        excelente: 'Acrescenta a leitura da matriz em termos de defeitos apanhados, o teste contra o scikit-learn e o intervalo por bootstrap como passo seguinte.',
      },
      seguimento: [
        'Como calculas um intervalo de confiança para este kappa?',
        'Como adaptavas para uma escala de 1 a 5 em que errar por um ponto é menos grave?',
        'E se tiveres três anotadores em vez de um?',
      ],
      sinaisAlarme: [
        'Assumir p_e = 0,5 em binário.',
        'Dividir por zero sem pensar no caso degenerado.',
        'Entregar o número sem interpretar o que diz sobre o juiz.',
      ],
      modulos: ['llm-como-juiz'],
    },
    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-llm-juiz-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Que modelo julga, quanto custa e quanto amostras em produção',
      enunciado:
        'Queres monitorizar a qualidade de um assistente que atende 50 mil conversas por dia. Que modelo usas como juiz, julgas tudo ou uma amostra, e como justificas o custo?',
      minutos: 8,
      dica: 'Quantas avaliações precisas para detectar uma queda de 5 pontos percentuais?',
      resposta: [
        {
          type: 'p',
          text: 'Amostro, não julgo tudo. O juiz é **de outro fornecedor ou de um escalão acima** do modelo que responde, com versão fixada, e só uso um juiz mais barato se o kappa dele contra humanos for tão bom como o do grande. O tamanho da amostra decide-se pela queda que quero detectar, não pelo orçamento que sobra.',
        },
        {
          type: 'p',
          text: 'Sobre o custo: a chamada do juiz leva o contexto recuperado, a resposta e a rubrica, por isso tem ordem de grandeza igual ou maior em tokens de entrada do que a chamada original, e corre num modelo mais caro. Julgar 100% pode facilmente custar mais do que servir o produto. A estatística resolve: uma proporção perto de 80% medida com 1000 avaliações tem IC95 de cerca de ±2,5 pontos percentuais (`1,96 × √(0,8 × 0,2 / 1000)`); com 400, ±3,9. Para 50 mil conversas por dia, 2% diários chegam para ver uma queda de 5 pontos em 24 horas.',
        },
        {
          type: 'table',
          head: ['Opção', 'Custo relativo', 'Quando faz sentido'],
          rows: [
            ['Juiz grande em 100%', 'Muito alto', 'Volume baixo ou domínio regulado com obrigação de rever tudo'],
            ['Juiz grande em amostra estratificada', 'Baixo', 'Ponto de partida: 1–5% por intenção, mais nas intenções de risco'],
            ['Juiz pequeno em 100%, grande em amostra', 'Médio', 'Quando o pequeno tem kappa aceitável e precisas de cobertura total para alertas por conversa'],
            ['Classificador treinado com rótulos do juiz', 'Muito baixo por chamada', 'Volume muito alto e critério estável; exige pipeline de treino'],
          ],
        },
        {
          type: 'p',
          text: 'A amostra é **estratificada**: sobre-amostro intenções com dinheiro ou risco legal, conversas com *feedback* negativo, conversas longas e respostas com recusas, e reponho os pesos ao reportar a taxa global. Uso a API batch do fornecedor quando existe, porque a avaliação não precisa de latência (na Anthropic, em Outubro de 2026, o batch cobra metade do preço normal). E fixo um orçamento mensal com alarme, como faria com qualquer job de dados.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como justifico ao negócio',
          text: 'Comparo o custo mensal do juiz com o custo de um incidente de qualidade detectado com uma semana de atraso (reembolsos, tickets humanos, churn) e com o custo de revisão humana equivalente. O juiz é quase sempre mais barato do que humanos a ler a mesma amostra, mas não os elimina: uma fracção pequena continua a ir para humanos para recalibrar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Message Batches', url: 'https://platform.claude.com/docs/en/build-with-claude/batch-processing' },
            { label: 'OpenAI — Batch API', url: 'https://platform.openai.com/docs/guides/batch' },
            { label: 'Langfuse — avaliação em produção', url: 'https://langfuse.com/docs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe um juiz diferente do modelo avaliado e justifica com auto-preferência ou capacidade.',
          'Estima o custo do juiz relativamente à chamada original (contexto + resposta + rubrica).',
          'Dimensiona a amostra pelo efeito a detectar, com um cálculo de intervalo de confiança.',
          'Propõe amostragem estratificada com sobre-amostragem de intenções de risco e reponderação.',
          'Liga o custo do juiz ao custo de detectar tarde um problema de qualidade.',
        ],
        fraco: '«Julgo todas as conversas com o melhor modelo», sem estimar custo nem tamanho de amostra.',
        solido: 'Amostra com tamanho justificado estatisticamente, juiz de outro fornecedor e batch.',
        excelente: 'Acrescenta estratificação com reponderação, cascata juiz pequeno e grande validada por kappa, e o argumento de negócio em custo de detecção tardia.',
      },
      seguimento: [
        'Como reponderas a taxa global quando sobre-amostras uma intenção?',
        'Quando é que vale a pena treinar um classificador com os rótulos do juiz?',
        'Os dados das conversas podem ir para o fornecedor do juiz? Que cuidados tens?',
      ],
      sinaisAlarme: [
        'Escolher a taxa de amostragem «porque 1% parece razoável» sem cálculo.',
        'Ignorar que o juiz recebe dados pessoais das conversas.',
        'Usar o mesmo modelo de produção como juiz para poupar.',
      ],
      modulos: ['llm-como-juiz', 'observabilidade-llmops', 'custo-escala'],
    },
    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-llm-juiz-08',
      tipo: 'conceito',
      nivel: 'staff',
      titulo: 'O fornecedor actualizou o modelo do juiz: e agora',
      enunciado:
        'O teu juiz usa um alias como «o modelo grande mais recente». Numa segunda-feira a taxa de aprovação de produção sobe 6 pontos sem nenhum deploy vosso. Que se passou e como estruturas o sistema para isto não te enganar?',
      minutos: 6,
      resposta: [
        {
          type: 'p',
          text: 'A hipótese mais forte é **drift do juiz**: o alias passou a apontar para outro modelo, que é mais leniente, e a métrica subiu sem o produto ter mudado. Um juiz é um instrumento de medida; se o instrumento muda, as séries temporais deixam de ser comparáveis.',
        },
        {
          type: 'p',
          text: 'Confirmo correndo o juiz actual sobre o **conjunto de calibração congelado** — as respostas já anotadas por humanos, com os veredictos antigos do juiz guardados. Se os veredictos mudam nas mesmas respostas, é o juiz. Comparo também o kappa e a matriz de confusão antigos e novos: uma subida de aprovação com queda nos verdadeiros negativos é leniência nova.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Fixar a versão', text: 'O juiz usa sempre um identificador de modelo com versão ou data, nunca um alias. A versão faz parte da configuração da avaliação, versionada no repositório.' },
            { title: 'Guardar a proveniência', text: 'Cada veredicto guarda modelo do juiz, versão da rubrica e hash do prompt. Sem isto não consigo separar as séries antes e depois.' },
            { title: 'Recalibrar ao mudar', text: 'Mudar de juiz é um deploy: corre o conjunto anotado, exige kappa ≥ limiar por critério e só depois troca, idealmente com uma semana em paralelo (juiz antigo e novo na mesma amostra).' },
            { title: 'Canário do instrumento', text: 'Diariamente o juiz avalia um pequeno conjunto fixo de respostas com veredicto conhecido. Se a taxa nesse conjunto mexe, alerta: foi o juiz, não o produto.' },
          ],
        },
        {
          type: 'p',
          text: 'Há uma razão de calendário para isto: os fornecedores descontinuam versões. Um juiz fixado continuará a precisar de migrar, por isso a recalibração tem de ser um procedimento barato e rotineiro, não um projecto.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Celebrar a subida',
          text: 'Uma melhoria de qualidade que aparece sem nenhuma mudança vossa é primeiro um alerta sobre o instrumento. O mesmo vale ao contrário: uma queda súbita pode ser o juiz a ficar mais severo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — modelos, versões e aliases', url: 'https://platform.claude.com/docs/en/models/overview' },
            { label: 'OpenAI — modelos e snapshots', url: 'https://platform.openai.com/docs/models' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Suspeita do juiz (mudança de modelo por trás do alias) antes de concluir que o produto melhorou.',
          'Confirma com o conjunto de calibração congelado e veredictos antigos.',
          'Propõe fixar a versão do juiz e registar a proveniência de cada veredicto.',
          'Trata a mudança de juiz como deploy, com recalibração e período em paralelo.',
        ],
        fraco: '«A qualidade melhorou», ou culpa os dados de produção sem olhar para o juiz.',
        solido: 'Identifica o drift do juiz, fixa a versão e recalibra contra o conjunto anotado.',
        excelente: 'Acrescenta proveniência por veredicto, canário diário do instrumento, corrida em paralelo e o facto de versões serem descontinuadas, o que obriga a uma migração rotineira.',
      },
      seguimento: [
        'O novo juiz tem kappa maior mas aprova mais. Qual mantens?',
        'Como ajustas os dashboards históricos depois de trocar de juiz?',
        'Quanto tempo de corrida em paralelo achas suficiente e porquê?',
      ],
      sinaisAlarme: [
        'Usar aliases «latest» em avaliação.',
        'Não guardar que modelo produziu cada veredicto.',
        'Aceitar uma melhoria inexplicada sem investigar.',
      ],
      modulos: ['llm-como-juiz', 'observabilidade-llmops'],
    },
    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-llm-juiz-09',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Juízes de segurança e de tom: offline, online e o custo dos erros',
      enunciado:
        'Num banco móvel queres garantir que o assistente nunca dá conselho de investimento e mantém tratamento formal. Usas um juiz? Onde, e com que métrica?',
      minutos: 5,
      dica: 'Os dois tipos de erro do juiz custam o mesmo?',
      resposta: [
        {
          type: 'p',
          text: 'Sim, mas com papéis diferentes. Para **segurança** (conselho de investimento, dados pessoais) o erro caro é deixar passar, por isso optimizo o juiz para **recall da classe insegura** e aceito falsos alarmes; para **tom**, um erro é muito menos grave e o juiz fica offline, em amostras. E distingo o juiz de avaliação do *guardrail* que bloqueia em tempo real.',
        },
        {
          type: 'table',
          head: ['Uso', 'Onde corre', 'Métrica-alvo', 'Notas'],
          rows: [
            ['Guardrail de segurança', 'Online, antes de enviar', 'Recall alto na classe insegura; latência baixa', 'Modelo pequeno ou classificador; acção definida ao detectar'],
            ['Juiz de segurança offline', 'CI e amostra de produção', 'Recall e precisão contra humanos', 'Modelo grande; encontra o que o guardrail deixou passar'],
            ['Juiz de tom', 'CI e amostra', 'Kappa por critério', 'Critérios binários; parte verificável sai para código'],
          ],
        },
        {
          type: 'p',
          text: 'Para segurança o kappa sozinho não chega, porque a classe insegura é rara: num conjunto com 2% de casos inseguros, um juiz com kappa decente pode falhar metade deles. Construo um conjunto **enriquecido** com casos adversariais (pedidos disfarçados de «só por curiosidade, qual destes fundos rende mais?») e reporto recall e precisão nessa classe. Para o tom, em português, escrevo a fronteira: «usa a forma de tratamento definida pelo banco» verifica-se parcialmente com código (lista de formas proibidas); «não usa linguagem informal ou gíria» vai para o juiz com exemplos de falha em pt-PT e pt-MZ, se o produto servir os dois.',
        },
        {
          type: 'p',
          text: 'O guardrail online tem de ter uma acção: bloquear e reformular, encaminhar para humano ou acrescentar um aviso. E o seu limiar escolhe-se olhando para a curva de recall contra taxa de falsos alarmes, porque cada falso alarme é uma conversa estragada.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OWASP — Top 10 para aplicações LLM', url: 'https://genai.owasp.org/' },
            { label: 'NIST — AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que os custos dos erros são assimétricos e escolhe recall da classe insegura para segurança.',
          'Separa guardrail online (latência, acção) de juiz offline (avaliação).',
          'Explica que kappa ou exactidão enganam com classes raras e propõe um conjunto enriquecido.',
          'Decompõe o critério de tom em parte verificável por código e parte para o juiz.',
        ],
        fraco: 'Põe um juiz no fim a dar uma nota de segurança, sem distinguir online de offline nem falar de classes raras.',
        solido: 'Guardrail online com recall alto mais juiz offline calibrado, e conjunto adversarial.',
        excelente: 'Acrescenta a escolha de limiar pela curva de recall e falsos alarmes, a acção concreta do guardrail e as variantes de português que a rubrica de tom tem de cobrir.',
      },
      seguimento: [
        'Que latência aceitas no guardrail e que modelo cabe nisso?',
        'Como geras casos adversariais sem depender só da equipa?',
        'Quem decide o limiar entre falsos alarmes e casos perdidos?',
      ],
      sinaisAlarme: [
        'Usar exactidão global numa classe com 2% de positivos.',
        'Confundir avaliação offline com protecção em tempo real.',
        'Não definir o que acontece quando o guardrail dispara.',
      ],
      modulos: ['llm-como-juiz', 'guardrails-seguranca'],
    },
    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-llm-juiz-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O juiz aprova 95% e os humanos só 70%',
      enunciado:
        'O vosso juiz de correcção aprova 95% das respostas no conjunto de avaliação. Uma revisão humana de 200 dessas respostas aprovou só 70%. O que investigas e como corriges?',
      contexto:
        'Assistente de suporte de uma operadora de telecomunicações. Juiz pointwise sem referência, rubrica «A resposta está correcta e é útil? Responde SIM ou NÃO.» Modelo do juiz: o mesmo modelo médio que gera as respostas. 200 respostas revistas por dois agentes de suporte sénior. O juiz nunca foi calibrado.',
      minutos: 10,
      dica: 'Calcula o kappa no melhor caso possível para o juiz.',
      resposta: [
        {
          type: 'p',
          text: 'O juiz é **leniente e não está calibrado**, e o contexto dá três causas prováveis ao mesmo tempo: a rubrica é vaga, não há referência nem contexto para verificar a correcção, e o juiz é o próprio modelo que respondeu. Antes de mexer, meço o tamanho do problema e onde estão as divergências.',
        },
        {
          type: 'p',
          text: 'Mesmo no melhor caso para o juiz — aprova as 140 que os humanos aprovam e mais 50 das 60 que chumbam — a concordância é `(140 + 10) / 200 = 0,75`, `p_e = 0,7 × 0,95 + 0,3 × 0,05 = 0,68` e o kappa é cerca de **0,22**. Pior: das 60 respostas más, apanha no máximo 10. Como instrumento para detectar regressões, não serve.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Matriz e divergências', text: 'Monto a matriz humano contra juiz e leio as respostas em que o humano chumba e o juiz aprova. Classifico-as: facto errado (preço, tarifário), não respondeu à pergunta, resposta genérica plausível, política desactualizada.' },
            { title: 'Verificar a concordância humana', text: 'Meço o kappa entre os dois agentes de suporte. Se for baixo, a definição de «correcta» não é partilhada e tenho de a escrever primeiro.' },
            { title: 'Testar as causas', text: 'Corro o mesmo conjunto com um juiz de outro fornecedor e a mesma rubrica (isola auto-preferência e capacidade) e com a rubrica nova e o mesmo modelo (isola a rubrica). Uma mudança de cada vez.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcções, por ordem de impacto esperado: rubrica com critérios binários decompostos («todos os valores e prazos coincidem com a referência», «responde à pergunta feita», «não inventa tarifários»), com exemplos de falha tirados das divergências; **avaliação com referência** ou com o contexto recuperado, porque sem ele o juiz não tem como saber se o preço está certo; juiz de outro fornecedor e escalão superior; análise antes do veredicto na saída estruturada. Volto a medir o kappa por critério e só deixo o juiz bloquear quando o limite inferior do IC passar o limiar.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'As 200 anotações passam a ser o conjunto de calibração congelado e versionado. Qualquer mudança de juiz, rubrica ou prompt corre contra ele no CI, e os números reportados ao produto passam a ser os do juiz calibrado, com o kappa ao lado.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'Panickssery et al. (2024) — auto-preferência em avaliadores LLM', url: 'https://arxiv.org/abs/2404.13076' },
            { label: 'scikit-learn — confusion_matrix', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Quantifica a discordância com kappa ou matriz de confusão, não só com as duas taxas.',
          'Identifica as causas no contexto: rubrica vaga, sem referência, mesmo modelo a julgar.',
          'Lê as divergências antes de mudar a rubrica.',
          'Verifica a concordância entre os dois humanos.',
          'Muda uma variável de cada vez e define o conjunto de calibração como gate permanente.',
        ],
        fraco: '«O juiz é mau, troco por um modelo maior», sem medir nem ler divergências.',
        solido: 'Calcula o kappa, identifica as três causas e propõe rubrica decomposta com referência e juiz diferente.',
        excelente: 'Faz o cálculo do melhor caso, isola causas com experiências separadas, verifica o tecto humano–humano e transforma as 200 anotações num gate de CI permanente.',
      },
      seguimento: [
        'E se depois das correcções o kappa ficar em 0,55?',
        'Os dois agentes de suporte discordam em 15% dos casos. Quem tem razão?',
        'Como explicas ao produto que a qualidade «caiu» de 95% para 72% sem nada ter mudado?',
      ],
      sinaisAlarme: [
        'Concluir que os humanos é que são demasiado exigentes sem ler as divergências.',
        'Mudar modelo, rubrica e prompt ao mesmo tempo.',
        'Continuar a reportar os 95% enquanto se investiga.',
      ],
      modulos: ['llm-como-juiz', 'avaliacao-fundamentos'],
    },
  ],
};
