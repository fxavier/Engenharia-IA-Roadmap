import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'avaliar-rag',
  numero: 20,
  bloco: 'avaliacao',
  titulo: 'Avaliar RAG',
  resumo:
    'Como se mede um RAG peça a peça e de ponta a ponta: métricas de recuperação (recall@k, MRR, nDCG), métricas de geração (faithfulness, relevância, context precision e recall), citações, perguntas sintéticas, anotação barata e comparações com significância. Perguntado porque quase toda a gente tem um RAG e quase ninguém sabe se ele funciona.',
  icon: '🔎',
  modulos: ['avaliar-rag', 'avaliacao-fundamentos', 'llm-como-juiz'],
  essencial: [
    'Recall@k = relevantes no top-k / total de relevantes. Precision@k = relevantes no top-k / k. Não confundir recall@k com hit rate@k (pelo menos um relevante no top-k).',
    'MRR = média de 1/posição do primeiro relevante (0 se não aparece). Bom quando só o primeiro relevante interessa.',
    'nDCG@k = DCG@k / IDCG@k, com DCG = soma de ganho_i / log2(i + 1). Ganho linear (rel) ou exponencial (2^rel − 1). O IDCG usa TODOS os relevantes anotados, não só os recuperados.',
    'Faithfulness (RAGAS) = afirmações da resposta suportadas pelo contexto / total de afirmações. Mede fidelidade ao contexto, não verdade: contexto errado dá resposta fiel e errada.',
    'Response relevancy (RAGAS) = média do cosseno entre a pergunta e N perguntas (3 por omissão) geradas a partir da resposta. Mede se responde ao que foi perguntado, não se está correcto.',
    'Context recall (RAGAS) = afirmações da resposta de referência suportadas pelo contexto recuperado / total. Precisa de referência; context precision mede se os chunks relevantes vêm no topo.',
    'Avalia primeiro a recuperação (barata, determinística, sem LLM) e só depois a geração; a métrica de ponta a ponta diz se falhou, as de componente dizem onde.',
    'Perguntas sintéticas geradas a partir de um chunk partilham vocabulário com ele e inflacionam o recall, sobretudo do BM25: valida que ordenam sistemas como as perguntas reais.',
    'Citações (ALCE): recall = afirmações totalmente suportadas pelas passagens que citam; precision = citações que não são irrelevantes. Verificação mínima em produção: o id citado estava no contexto.',
    'Anotar com pouco orçamento: pooling do top-k de vários sistemas, juiz LLM para escala, amostra humana para calibrar e corrigir o enviesamento.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-avaliar-rag-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Recall@k, precision@k, MRR e nDCG: fórmulas e quando usar cada uma',
      enunciado:
        'Escreve no quadro recall@k, precision@k, MRR e nDCG@k. Para o retriever de um RAG que mete 5 chunks no prompt, qual delas é a tua métrica principal e porquê?',
      minutos: 5,
      dica: 'O LLM lê os 5 chunks todos ou só o primeiro?',
      resposta: [
        {
          type: 'p',
          text: 'Para um RAG que injecta k chunks, a métrica principal é **recall@k**: o LLM lê os k todos, por isso o que importa primeiro é se a informação necessária lá está. MRR e nDCG entram quando a ordem conta — contexto curto, re-ranker, ou modelo que dá mais peso ao início — e precision@k quando o ruído e o custo do contexto pesam.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Fórmula (por pergunta, depois média)', 'Responde a'],
          rows: [
            ['Recall@k', 'relevantes no top-k / total de relevantes', 'A informação chegou ao contexto?'],
            ['Precision@k', 'relevantes no top-k / k', 'Quanto do contexto é lixo?'],
            ['MRR', '1 / posição do primeiro relevante; 0 se não aparece', 'Quão cedo aparece o primeiro relevante?'],
            ['nDCG@k', 'DCG@k / IDCG@k, com DCG = soma de ganho_i / log2(i + 1)', 'A ordem está certa, com relevância graduada?'],
          ],
        },
        {
          type: 'p',
          text: 'Detalhes que costumam ser perguntados. **Hit rate@k** (pelo menos um relevante no top-k) não é recall@k: com uma pergunta que precisa de dois documentos, encontrar um dá hit rate 1 e recall 0,5. **Precision@k** com um só relevante por pergunta nunca passa de 1/k, por isso optimizá-la empurra para k pequeno e mata o recall. No **nDCG**, o desconto 1/log2(i + 1) vale 1 na posição 1, 0,63 na 2 e 0,5 na 3; o IDCG é o DCG da ordem ideal de todos os relevantes anotados, o que põe o valor entre 0 e 1 e torna as perguntas comparáveis.',
        },
        {
          type: 'p',
          text: 'Na prática reporto recall@k com o k que vai para o prompt, MRR ou nDCG@k para ver o efeito de um re-ranker, e tudo **por intenção** e com intervalo de confiança, porque uma média global de 200 perguntas esconde uma intenção a 40%.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Perguntas sem relevantes',
          text: 'Perguntas fora de âmbito não têm documento relevante: recall é indefinido, não zero. Excluo-as da média de recuperação e avalio-as à parte, pela recusa correcta.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — ndcg_score', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html' },
            { label: 'Thakur et al. (2021) — BEIR: benchmark heterogéneo de recuperação', url: 'https://arxiv.org/abs/2104.08663' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve as quatro fórmulas correctamente, incluindo o IDCG no nDCG.',
          'Escolhe recall@k como principal porque o LLM lê os k chunks.',
          'Distingue recall@k de hit rate@k.',
          'Explica o tecto de precision@k com um só relevante.',
          'Trata as perguntas sem relevante à parte em vez de as contar como zero.',
        ],
        fraco: 'Sabe nomes mas troca as fórmulas, ou escolhe precision@k como principal sem justificar.',
        solido: 'Fórmulas certas, recall@k como principal e MRR/nDCG para a ordem.',
        excelente: 'Acrescenta hit rate contra recall, o tecto de precision, o tratamento das perguntas fora de âmbito e a desagregação por intenção com intervalo de confiança.',
      },
      seguimento: [
        'Com que k avalias se o prompt leva 5 chunks mas o re-ranker recebe 50?',
        'Porque é que o nDCG precisa do IDCG?',
        'Em que caso o MRR é a métrica certa num RAG?',
      ],
      sinaisAlarme: [
        'Calcular o IDCG só com os documentos recuperados.',
        'Optimizar precision@k num corpus com um relevante por pergunta.',
      ],
      modulos: ['avaliar-rag', 'pesquisa-hibrida'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-avaliar-rag-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Relevância binária contra relevância graduada',
      enunciado:
        'Quando anotas relevância para avaliar um retriever, usas sim ou não, ou uma escala? O que muda nas métricas e na anotação?',
      minutos: 4,
      dica: 'Pensa num documento que responde à pergunta e noutro que só ajuda a contextualizar.',
      resposta: [
        {
          type: 'p',
          text: 'Começo **binário**, porque é mais barato, mais consistente entre anotadores e chega para recall@k e MRR. Passo a **graduado** (por exemplo 0 irrelevante, 1 relacionado, 2 ajuda, 3 responde) quando preciso de distinguir ordenações que o binário vê como iguais — tipicamente para afinar um re-ranker com nDCG.',
        },
        {
          type: 'p',
          text: 'Com binário, um ranking que põe o documento que responde em 2.º e um relacionado em 1.º tem o mesmo recall e, se ambos contam como relevantes, o mesmo MRR que o ranking ideal. Com graduado, o nDCG penaliza: ranking com ganhos [1, 3, 0] contra o ideal [3, 1, 0] dá nDCG@3 ≈ 0,80 com ganho linear e ≈ 0,71 com ganho exponencial (2^rel − 1), que dá muito mais peso ao documento que responde.',
        },
        {
          type: 'table',
          head: ['', 'Binária', 'Graduada'],
          rows: [
            ['Métricas', 'Recall@k, precision@k, MRR, nDCG binário', 'nDCG com ganhos; as outras exigem escolher um limiar'],
            ['Custo de anotação', 'Rápida', 'Mais lenta; exige guia com exemplos por nível'],
            ['Concordância entre anotadores', 'Mais alta', 'Mais baixa nos níveis do meio'],
            ['Quando', 'Primeiro conjunto, perguntas factuais com resposta num documento', 'Afinar ordem, perguntas abertas, vários documentos parcialmente úteis'],
          ],
        },
        {
          type: 'p',
          text: 'Num RAG há uma categoria que nenhuma das duas escalas apanha bem: o documento **parecido mas errado** — a política de 2023 quando a de 2025 está em vigor, o tarifário de outro país. É pior do que irrelevante porque induz o modelo em erro. Não lhe dou um ganho negativo no nDCG (sai do intervalo 0–1); meço-o à parte com uma asserção: «nenhum documento não vigente no top-k».',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Escala com significado',
          text: 'Os níveis definem-se pelo que o LLM pode fazer com o documento («sozinho responde», «responde com outro», «só contexto»), não por adjectivos como «muito relevante». Assim dois anotadores concordam mais.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — ndcg_score (relevância graduada como ganho)', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html' },
            { label: 'Thomas et al. (2023) — LLMs can accurately predict searcher preferences', url: 'https://arxiv.org/abs/2309.10621' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Recomenda começar binário e justifica com custo e concordância.',
          'Explica que o nDCG é a métrica que aproveita graus e dá um exemplo de diferença.',
          'Distingue ganho linear de exponencial.',
          'Trata o documento «parecido mas errado» como caso à parte.',
        ],
        fraco: 'Escolhe uma escala de 1 a 10 sem dizer que métrica a usa nem como se anota.',
        solido: 'Binário para começar, graduado para nDCG, com guia de anotação.',
        excelente: 'Mostra numericamente o efeito do ganho, define níveis pelo que o LLM pode fazer com o documento e mede documentos desactualizados com uma asserção dedicada.',
      },
      seguimento: [
        'Como medes a concordância entre dois anotadores numa escala de 4 níveis?',
        'Que limiar usas para converter graduado em binário para o recall?',
        'Um juiz LLM consegue anotar relevância graduada de forma fiável?',
      ],
      sinaisAlarme: [
        'Escala com muitos níveis sem guia nem medida de concordância.',
        'Não pensar em documentos desactualizados como risco.',
      ],
      modulos: ['avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-avaliar-rag-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'O que as métricas do RAGAS medem de facto',
      enunciado:
        'Explica faithfulness, answer relevance, context precision e context recall. O que é que cada uma mede de facto, e o que é que nenhuma delas te diz?',
      minutos: 6,
      dica: 'Para cada uma, pergunta contra o quê é que a resposta ou o contexto está a ser comparado.',
      resposta: [
        {
          type: 'p',
          text: 'Cada métrica compara duas coisas diferentes: **faithfulness** compara a resposta com o contexto, **answer relevance** compara a resposta com a pergunta, e **context precision** e **context recall** comparam o contexto com uma referência. Nenhuma, sozinha, diz se a resposta está **correcta** para o utilizador: para isso preciso de comparar com uma resposta de referência ou com um humano.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Como se calcula (RAGAS)', 'Precisa de referência', 'Não detecta'],
          rows: [
            ['Faithfulness', 'Um LLM parte a resposta em afirmações; fracção suportada pelo contexto recuperado', 'Não', 'Contexto errado ou desactualizado: a resposta é fiel e errada'],
            ['Response (answer) relevancy', 'Gera N perguntas (3 por omissão) a partir da resposta; média do cosseno com a pergunta original', 'Não', 'Erros factuais: a documentação diz que não avalia exactidão'],
            ['Context precision@K', 'Soma de precision@k vezes o indicador de relevância no rank k, dividida pelos relevantes no top-K', 'Sim (ou usa a resposta)', 'Se faltou algum relevante'],
            ['Context recall', 'Fracção das afirmações da resposta de referência suportadas pelo contexto', 'Sim', 'Se a resposta usou bem o contexto'],
          ],
        },
        {
          type: 'p',
          text: 'Faithfulness e relevância são *reference-free*: correm em tráfego de produção sem anotação, por isso são boas para monitorizar. Context precision e recall precisam de referência e vivem no conjunto dourado. A combinação útil para diagnóstico: context recall baixo diz que a recuperação falhou; context recall alto com faithfulness baixa diz que o gerador inventou; ambos altos e resposta errada diz que a referência ou o corpus estão errados.',
        },
        {
          type: 'p',
          text: 'Todas exceptuando as variantes não-LLM dependem de um **juiz LLM** — a extracção de afirmações e a verificação de suporte são chamadas ao modelo. Isso traz custo (várias chamadas por pergunta), ruído entre corridas e enviesamentos do juiz. Antes de usar o número num gate, calibro contra 50–100 respostas anotadas por humanos e fixo a versão do juiz.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O artigo e a biblioteca não são a mesma coisa',
          text: 'O artigo original (Es et al., 2023) propõe faithfulness, answer relevance e context relevance sem referência; a biblioteca evoluiu e as definições e nomes actuais (context precision com referência, response relevancy) estão na documentação. Cito a versão que uso.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Es et al. (2023) — RAGAS: Automated Evaluation of Retrieval Augmented Generation', url: 'https://arxiv.org/abs/2309.15217' },
            { label: 'RAGAS — métricas disponíveis', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/' },
            { label: 'RAGAS — Faithfulness', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz contra o quê compara cada métrica (contexto, pergunta, referência).',
          'Afirma que faithfulness mede fidelidade ao contexto e não verdade.',
          'Explica que answer relevance não mede correcção factual.',
          'Distingue métricas com e sem referência e onde corre cada uma.',
          'Menciona custo, ruído e calibração do juiz LLM.',
        ],
        fraco: 'Trata faithfulness como «a resposta está certa» e answer relevance como «a resposta é boa».',
        solido: 'Define as quatro correctamente e diz que nenhuma mede correcção sozinha.',
        excelente: 'Usa as combinações para localizar a falha, separa monitorização sem referência de gate com referência, e calibra o juiz antes de confiar no número.',
      },
      seguimento: [
        'Como medirias correcção se não tens respostas de referência?',
        'O que acontece à faithfulness se a resposta for uma recusa?',
        'Quanto custa correr estas quatro métricas em 500 perguntas por noite?',
      ],
      sinaisAlarme: [
        'Reportar faithfulness 0,95 como prova de que o sistema acerta.',
        'Usar métricas de juiz LLM num gate sem nunca as ter comparado com humanos.',
      ],
      modulos: ['avaliar-rag', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-avaliar-rag-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Avaliar componente a componente ou de ponta a ponta',
      enunciado:
        'O teu RAG tem reescrita de pergunta, pesquisa híbrida, re-ranker e gerador. Avalias cada peça ou só a resposta final? Onde gastas o orçamento de avaliação?',
      minutos: 7,
      dica: 'Uma métrica diz-te se falhou; outra diz-te onde.',
      resposta: [
        {
          type: 'p',
          text: 'As duas, com papéis diferentes. A avaliação **de ponta a ponta** (a resposta está correcta?) é a que importa ao negócio e decide o deploy. A **por componente** é a que me deixa iterar depressa e localizar a falha. Gasto a maior parte do esforço de anotação nas referências de ponta a ponta e nos documentos relevantes, porque deles saem as métricas das duas camadas.',
        },
        {
          type: 'table',
          head: ['', 'Por componente', 'Ponta a ponta'],
          rows: [
            ['Exemplos', 'Recall@k da pesquisa, nDCG do re-ranker, faithfulness do gerador com contexto fixo', 'Correcção contra referência, recusa correcta, citações válidas'],
            ['Custo por corrida', 'Recuperação: sem LLM, segundos; geração: chamadas ao juiz', 'Pipeline inteiro mais juiz'],
            ['Diagnóstico', 'Diz onde falhou', 'Diz se falhou'],
            ['Risco', 'Optimizar uma peça que não move o resultado', 'Não saber o que mudar'],
            ['Anotação', 'Documentos ou passagens relevantes', 'Resposta de referência'],
          ],
        },
        {
          type: 'p',
          text: 'A técnica que mais uso é **fixar o contexto**: para avaliar o gerador, dou-lhe os chunks relevantes anotados em vez dos recuperados. Se a correcção com contexto perfeito é 92% e com o contexto real é 74%, os 18 pontos são da recuperação; se com contexto perfeito já é 75%, o problema está no prompt ou no modelo e não vale a pena mexer no retriever. É a forma barata de decidir onde investir a próxima semana.',
        },
        {
          type: 'p',
          text: 'O perigo da avaliação por componente é a melhoria local que não se propaga: a reescrita de pergunta sobe o recall@20 de 0,85 para 0,90, mas o re-ranker já recuperava esses casos no top-5 e o resultado final não muda. Por isso uma mudança numa peça só entra se a métrica de ponta a ponta não desce e, idealmente, sobe.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Cadência',
          text: 'Métricas de recuperação em cada PR (rápidas e determinísticas); geração e ponta a ponta à noite ou quando o PR toca no prompt ou no modelo; em produção, faithfulness e relevância numa amostra, sem referência.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RAGAS — métricas disponíveis', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/' },
            { label: 'Saad-Falcon et al. (2023) — ARES', url: 'https://arxiv.org/abs/2311.09476' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Defende as duas camadas e diz que a de ponta a ponta decide o deploy.',
          'Descreve a técnica de fixar o contexto para separar recuperação de geração.',
          'Dá um exemplo de melhoria local que não se propaga ao resultado.',
          'Define cadência e custo de cada camada.',
        ],
        fraco: 'Só avalia a resposta final, ou só o recall, e assume que o resto segue.',
        solido: 'Avalia as duas camadas e usa as de componente para diagnóstico.',
        excelente: 'Quantifica a contribuição de cada peça com contexto fixo, recusa melhorias locais que não movem o resultado e liga a cadência ao custo.',
      },
      seguimento: [
        'Como avalias a reescrita de pergunta isoladamente?',
        'Que métrica usarias para o re-ranker se o prompt só leva 3 chunks?',
        'O contexto «perfeito» anotado pode estar errado. Como o verificas?',
      ],
      sinaisAlarme: [
        'Afinar o retriever durante semanas sem saber se a falha está na geração.',
        'Uma única métrica para o pipeline inteiro.',
      ],
      modulos: ['avaliar-rag', 'rag-basico'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-avaliar-rag-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Perguntas sintéticas: o que ganhas e onde enviesam',
      enunciado:
        'Não tens perguntas reais porque o produto ainda não foi lançado. Geras 500 perguntas com um LLM a partir dos documentos? O que é que pode correr mal?',
      minutos: 7,
      dica: 'Pensa em como a pergunta foi criada e que palavras partilha com o chunk de onde veio.',
      resposta: [
        {
          type: 'p',
          text: 'Gero, mas trato-as como um **ponto de partida enviesado**, não como o conjunto dourado. As perguntas sintéticas dão cobertura do corpus e relevância anotada de graça (sabe-se de que chunk vieram), mas são mais fáceis, mais limpas e mais parecidas com o texto do que as perguntas reais, e isso inflaciona as métricas de recuperação.',
        },
        {
          type: 'compare',
          left: {
            title: 'O que ganhas',
            items: [
              'Centenas de pares pergunta–documento numa tarde, sem especialistas.',
              'Cobertura de todo o corpus, incluindo documentos que ninguém lembraria.',
              'Permite comparar configurações antes do lançamento.',
              'Ferramentas como o RAGAS geram também perguntas multi-hop (por omissão 50% single-hop, 25% multi-hop abstractas, 25% multi-hop específicas).',
            ],
          },
          right: {
            title: 'Onde enviesam',
            items: [
              'Sobreposição lexical com o chunk de origem: favorece BM25 e sobrestima o recall.',
              'Uma pergunta, um chunk: sub-representa perguntas que precisam de vários documentos ou de nenhum.',
              'Bem escritas: sem erros, sem calão, sem mistura de línguas, sem contexto implícito.',
              'Sem perguntas fora de âmbito, que são onde o sistema mais falha.',
            ],
          },
        },
        {
          type: 'p',
          text: 'Mitigações: pedir ao gerador para parafrasear sem usar os termos do chunk e filtrar pares com sobreposição alta de palavras; gerar a partir de *personas* (cliente com pressa, mensagem de voz transcrita) e de perguntas reais de outros canais (emails, FAQ, chamadas); filtrar com uma verificação de consistência (o próprio retriever ou um juiz deve conseguir responder a partir do chunk); e acrescentar à mão perguntas sem resposta e ambíguas.',
        },
        {
          type: 'p',
          text: 'O teste que decide se o conjunto sintético serve: quando aparecem as primeiras 100 perguntas reais, anoto-as e verifico se as duas fontes **ordenam as configurações da mesma maneira**. O valor absoluto vai ser diferente (o sintético é mais fácil); o que me interessa é que a decisão «híbrido é melhor do que denso» seja a mesma. Se a ordem diverge, o sintético está a medir outra coisa.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O mesmo modelo dos dois lados',
          text: 'Se o modelo que gera as perguntas é da mesma família do que gera as respostas ou dos embeddings, o conjunto favorece o estilo desse modelo. Uso um gerador de outro fornecedor ou pelo menos outra família.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RAGAS — Testset generation for RAG', url: 'https://docs.ragas.io/en/stable/getstarted/rag_testset_generation/' },
            { label: 'Bonifacio et al. (2022) — InPars: geração de consultas com LLMs', url: 'https://arxiv.org/abs/2202.05144' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Aceita usar sintéticas para arrancar mas não como conjunto final.',
          'Identifica a sobreposição lexical e o seu efeito no BM25 e no recall.',
          'Aponta a falta de perguntas multi-documento, fora de âmbito e mal escritas.',
          'Propõe mitigações concretas (paráfrase, filtro, personas, perguntas manuais).',
          'Valida o sintético pela concordância de ordenação com perguntas reais.',
        ],
        fraco: 'Gera 500 perguntas e reporta o recall como se fosse o desempenho real.',
        solido: 'Identifica os enviesamentos principais e mistura com perguntas reais quando existirem.',
        excelente: 'Usa a concordância de ordenação entre sintético e real como critério de validade e controla o enviesamento de família de modelo.',
      },
      seguimento: [
        'Como medirias a sobreposição lexical entre pergunta e chunk?',
        'Que percentagem do conjunto deixarias sintética depois de seis meses em produção?',
        'Como geras perguntas multi-hop que sejam realistas?',
      ],
      sinaisAlarme: [
        'Ficar contente com recall@5 de 0,98 num conjunto sintético.',
        'Não ter nenhuma pergunta sem resposta no corpus.',
      ],
      modulos: ['avaliar-rag', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-avaliar-rag-06',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Anotar relevância com pouco orçamento',
      enunciado:
        'Tens 40 horas de um especialista para anotar relevância num corpus de 20 000 documentos de uma seguradora. Como gastas essas horas para teres métricas de recuperação em que confias?',
      minutos: 9,
      dica: 'Não anotes o corpus; anota o que os sistemas devolvem. E pensa no que um juiz LLM faz bem e mal.',
      resposta: [
        {
          type: 'p',
          text: 'Não anoto o corpus, anoto **o que os sistemas candidatos devolvem** (pooling), deixo um juiz LLM fazer o volume e uso as horas humanas onde rendem mais: guia de anotação, calibração do juiz e casos de discordância. Com 40 horas consigo ~150 perguntas com relevância razoavelmente completa e um juiz calibrado para estender.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Pooling', text: 'Para cada pergunta, junto o top-10 de três sistemas diferentes (BM25, denso, híbrido). Com sobreposição, ficam ~20 documentos únicos por pergunta. Documentos fora do pool assumem-se irrelevantes — é a aproximação clássica das avaliações TREC.' },
            { title: 'Orçamento', text: '150 perguntas × 20 documentos = 3 000 julgamentos; a ~30 s cada são ~25 horas. Não cabe com folga, por isso o especialista não anota tudo.' },
            { title: 'Juiz LLM para o volume', text: 'Um juiz com rubrica binária ou de 3 níveis anota os 3 000 pares. O especialista anota 300 aleatórios (~3 horas) e mede-se a concordância (kappa de Cohen). Se for boa, o juiz fica; se não, ajusta-se a rubrica com os desacordos.' },
            { title: 'Horas humanas onde rendem', text: 'Guia de anotação com exemplos (4 h), os casos em que o juiz discorda de si próprio entre corridas ou dá confiança baixa, e as intenções críticas (exclusões de cobertura) anotadas a 100% por humano.' },
            { title: 'Corrigir o enviesamento', text: 'Com a amostra humana posso corrigir a estimativa do juiz: em vez de confiar na taxa do juiz, uso a diferença medida na amostra para ajustar o número e o intervalo — é a ideia da prediction-powered inference que o ARES usa.' },
          ],
        },
        {
          type: 'p',
          text: 'O trade-off principal é **profundidade contra largura**: menos perguntas com relevância completa dão recall fiável por pergunta; mais perguntas com anotação rasa (só o primeiro relevante) dão MRR fiável mas recall subestimado. Para um corpus de seguros, onde as respostas dependem de condições e exclusões espalhadas, prefiro profundidade.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Pool viciado',
          text: 'Um sistema novo que encontra documentos fora do pool é penalizado porque esses documentos não têm anotação e contam como irrelevantes. Quando avalio um sistema novo, anoto os documentos novos que ele traz para o top-k antes de comparar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Saad-Falcon et al. (2023) — ARES', url: 'https://arxiv.org/abs/2311.09476' },
            { label: 'Angelopoulos et al. (2023) — Prediction-Powered Inference', url: 'https://arxiv.org/abs/2301.09633' },
            { label: 'Thomas et al. (2023) — LLMs can accurately predict searcher preferences', url: 'https://arxiv.org/abs/2309.10621' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe pooling dos top-k de vários sistemas em vez de anotar o corpus.',
          'Faz a conta do orçamento (perguntas × documentos × tempo por julgamento).',
          'Usa um juiz LLM para volume e uma amostra humana para medir concordância.',
          'Menciona corrigir o enviesamento do juiz com a amostra humana (PPI ou equivalente).',
          'Reconhece o viés do pool contra sistemas novos.',
        ],
        fraco: 'Pede ao especialista para anotar o máximo de pares que conseguir, sem estratégia.',
        solido: 'Pooling mais juiz LLM calibrado com amostra humana.',
        excelente: 'Faz a conta do orçamento, discute profundidade contra largura, corrige o enviesamento do juiz estatisticamente e trata o viés do pool.',
      },
      seguimento: [
        'Que valor de kappa aceitarias para confiar no juiz?',
        'Como escolhes as 150 perguntas?',
        'O que fazes quando o especialista e o juiz discordam sistematicamente numa intenção?',
      ],
      sinaisAlarme: [
        'Anotar documentos aleatórios do corpus.',
        'Confiar no juiz LLM sem nenhuma comparação com humanos.',
      ],
      modulos: ['avaliar-rag', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-avaliar-rag-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Comparar configurações de chunking e pesquisa com significância',
      enunciado:
        'Testaste 12 configurações: três tamanhos de chunk, com e sem overlap, denso e híbrido. A melhor tem recall@5 de 0,84 contra 0,81 da actual, em 200 perguntas. Mudas?',
      minutos: 6,
      dica: 'Quantas comparações fizeste, e o que acontece às etiquetas quando mudas o chunking?',
      resposta: [
        {
          type: 'p',
          text: 'Ainda não. Três pontos em 200 perguntas está dentro do ruído típico, e escolhi o melhor de **12** — com 12 comparações a α = 0,05, a probabilidade de pelo menos um falso positivo, se fossem independentes, é cerca de 46%. Preciso de uma comparação emparelhada, corrigida para comparações múltiplas, e de garantir que as etiquetas mediram a mesma coisa nas 12.',
        },
        {
          type: 'p',
          text: '**Emparelhar**: as 12 configurações correm nas mesmas perguntas, por isso comparo a diferença por pergunta (bootstrap ou teste de permutação), não duas médias. Muitas perguntas dão o mesmo resultado nas duas configurações e não contribuem para a variância, o que estreita o intervalo.',
        },
        {
          type: 'p',
          text: '**Comparações múltiplas**: escolher o máximo de 12 é optimista por construção. Ou corrijo (Holm-Bonferroni sobre as comparações contra a actual), ou faço a busca num conjunto de desenvolvimento e confirmo **só a vencedora** num conjunto de teste separado, que é o que prefiro.',
        },
        {
          type: 'p',
          text: '**Etiquetas que sobrevivem ao chunking**: se a relevância estiver anotada por id de chunk, mudar o tamanho invalida as etiquetas — o chunk 47 de 512 tokens não existe na configuração de 256. Anoto ao nível do **documento** ou, melhor, do **trecho de texto** (documento mais offsets de caracteres), e conto um chunk como relevante se se sobrepõe ao trecho. Assim as 12 configurações são comparáveis.',
        },
        {
          type: 'table',
          head: ['Verificação', 'Porquê'],
          rows: [
            ['Diferença emparelhada com IC', 'Separa efeito de ruído'],
            ['Busca em desenvolvimento, confirmação em teste', 'Evita o optimismo do máximo de 12'],
            ['Relevância por documento ou trecho', 'Etiquetas válidas para todos os chunkings'],
            ['Resultado por intenção', 'Um ganho global pode esconder uma perda numa intenção crítica'],
            ['Custo em tokens por pergunta', 'Chunks maiores com o mesmo k custam mais no prompt'],
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'LangChain — text splitters', url: 'https://docs.langchain.com/oss/python/integrations/splitters/index' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Não aceita 3 pontos sem intervalo de confiança da diferença emparelhada.',
          'Identifica o problema de comparações múltiplas e propõe correcção ou conjunto de confirmação.',
          'Explica que etiquetas por id de chunk não sobrevivem a mudanças de chunking.',
          'Considera o custo em tokens e o resultado por intenção.',
        ],
        fraco: 'Muda porque 0,84 é maior do que 0,81.',
        solido: 'Pede IC emparelhado e menciona que escolher entre 12 infla o resultado.',
        excelente: 'Desenha busca em desenvolvimento e confirmação em teste, anota por trecho para tornar os chunkings comparáveis, e pesa o ganho contra o custo em tokens.',
      },
      seguimento: [
        'Como calculas a sobreposição entre um chunk e um trecho anotado?',
        'E se a melhor configuração for melhor em recall e pior em MRR?',
        'Quantas perguntas precisarias para detectar 3 pontos com confiança?',
      ],
      sinaisAlarme: [
        'Escolher o máximo de uma grelha sem confirmação.',
        'Relevância anotada por id de chunk ao comparar chunkings.',
      ],
      modulos: ['avaliar-rag', 'ingestao-chunking', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-avaliar-rag-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Precisão e recall de citações',
      enunciado:
        'O teu assistente cita fontes em cada frase. Como medes se as citações estão certas? Que métricas usas e o que verificas em produção?',
      minutos: 5,
      dica: 'Uma citação pode faltar, pode não suportar a frase, ou pode estar a mais.',
      resposta: [
        {
          type: 'p',
          text: 'Meço duas coisas, como no ALCE: **citation recall** — cada afirmação está totalmente suportada pelas passagens que cita? — e **citation precision** — cada citação contribui para esse suporte, ou está lá a mais? Em produção acrescento verificações determinísticas baratas: o id citado existe e estava no contexto.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Citation recall', def: 'Por afirmação: 1 se tem pelo menos uma citação e a concatenação das passagens citadas a implica (verificado por um modelo de NLI ou juiz); média sobre as afirmações.' },
            { term: 'Citation precision', def: 'Por citação: 0 se é «irrelevante» — sozinha não suporta a afirmação e, retirando-a, as restantes continuam a suportar; média sobre as citações.' },
            { term: 'Cobertura de citação', def: 'Fracção das frases factuais que têm citação. Determinística, barata, boa para alarme.' },
            { term: 'Citação válida', def: 'O id citado pertence aos chunks que estavam no contexto daquela resposta. Determinística; apanha citações inventadas.' },
          ],
        },
        {
          type: 'p',
          text: 'No artigo do ALCE a verificação de suporte é feita com um modelo de NLI (TRUE, baseado em T5-11B). Em produção uso um juiz LLM com a mesma rubrica binária, calibrado contra anotação humana, ou um modelo de NLI mais pequeno quando o custo pesa.',
        },
        {
          type: 'p',
          text: 'Porque é que interessa separar das métricas de faithfulness: uma resposta pode ser fiel ao contexto e citar o documento errado — o utilizador clica, não encontra a frase, e perde a confiança. E numa seguradora ou num banco a citação é muitas vezes o que o cliente ou o auditor verifica. Uma taxa alta de citation precision baixa costuma indicar um prompt que pede «cita sempre» e o modelo a citar tudo o que recebeu.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção',
          text: 'Asserção bloqueante: nenhuma resposta sai com um id de citação que não esteja no contexto. Alarme quando a cobertura de citação nas respostas factuais desce abaixo do limiar. Recall e precision de citação medidos à noite numa amostra.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Gao et al. (2023) — Enabling LLMs to Generate Text with Citations (ALCE)', url: 'https://arxiv.org/abs/2305.14627' },
            { label: 'Anthropic — Citations', url: 'https://platform.claude.com/docs/en/build-with-claude/citations' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define citation recall por afirmação suportada pelas passagens citadas.',
          'Define citation precision com a noção de citação irrelevante.',
          'Propõe verificações determinísticas: id existe e estava no contexto, cobertura de citação.',
          'Distingue citação correcta de faithfulness.',
        ],
        fraco: 'Verifica só se a resposta tem citações.',
        solido: 'Define recall e precision de citação e verifica ids contra o contexto.',
        excelente: 'Explica a definição de citação irrelevante, liga a precisão baixa a um prompt que força citações, e separa asserções bloqueantes de métricas noturnas.',
      },
      seguimento: [
        'Como verificas o suporte quando a citação aponta para um documento de 40 páginas?',
        'O que fazes quando a resposta combina duas fontes contraditórias?',
        'Usarias a funcionalidade de citações nativa do fornecedor? Com que limites?',
      ],
      sinaisAlarme: [
        'Confiar que o modelo cita correctamente porque o prompt o pede.',
        'Não verificar se o id citado estava no contexto.',
      ],
      modulos: ['avaliar-rag', 'guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-avaliar-rag-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Implementar recall@k, MRR e nDCG@k a partir de rankings',
      enunciado:
        'Escreve uma função que recebe os rankings devolvidos pelo retriever e as relevâncias anotadas, e devolve recall@k, MRR@k e nDCG@k médios. Trata os casos-limite.',
      contexto:
        'Entrada: `rankings: dict[str, list[str]]` (pergunta → ids de documentos por ordem) e `qrels: dict[str, dict[str, int]]` (pergunta → documento → relevância graduada 0–3). Saída: `dict` com n, recall@k, mrr@k e ndcg@k. Só biblioteca padrão. Exemplo com 4 perguntas, uma das quais o sistema não devolveu.',
      minutos: 20,
      dica: 'Sobre que perguntas fazes a média: as do ranking ou as do dourado?',
      resposta: [
        {
          type: 'p',
          text: 'Itero sobre **as perguntas do dourado**, não sobre as do ranking — uma pergunta a que o sistema não respondeu conta como falha e não desaparece da média. Por pergunta: recall pela intersecção com o top-k, RR pela primeira posição relevante, nDCG com ganho linear e IDCG calculado sobre **todos** os relevantes anotados. Complexidade O(Q × (k + R log R)), com R relevantes por pergunta.',
        },
        {
          type: 'code',
          lang: 'python',
          code: `import math
from collections.abc import Mapping, Sequence


def recall_at_k(ranking: Sequence[str], rel: Mapping[str, int], k: int) -> float | None:
    relevantes = {d for d, g in rel.items() if g > 0}
    if not relevantes:
        return None                                  # pergunta sem relevantes: fora da média
    vistos = set(ranking[:k])                        # ignora duplicados no ranking
    return len(relevantes & vistos) / len(relevantes)


def reciprocal_rank(ranking: Sequence[str], rel: Mapping[str, int], k: int | None = None) -> float:
    for i, d in enumerate(ranking[:k] if k else ranking, start=1):
        if rel.get(d, 0) > 0:
            return 1 / i
    return 0.0                                       # nenhum relevante: conta 0, não se ignora


def ndcg_at_k(ranking: Sequence[str], rel: Mapping[str, int], k: int) -> float | None:
    def dcg(ganhos: Sequence[int]) -> float:
        return sum(g / math.log2(i + 1) for i, g in enumerate(ganhos, start=1))
    vistos, ganhos = set(), []
    for d in ranking[:k]:
        ganhos.append(rel.get(d, 0) if d not in vistos else 0)  # duplicado não ganha 2x
        vistos.add(d)
    ideal = sorted((g for g in rel.values() if g > 0), reverse=True)[:k]
    if not ideal:
        return None
    return dcg(ganhos) / dcg(ideal)


def avaliar(rankings: Mapping[str, Sequence[str]], qrels: Mapping[str, Mapping[str, int]], k: int) -> dict[str, float]:
    if k < 1:
        raise ValueError("k >= 1")
    rec, rr, nd = [], [], []
    for q, rel in qrels.items():                     # itera o DOURADO, não os rankings
        ranking = rankings.get(q, [])                # pergunta sem resposta conta como falha
        if (r := recall_at_k(ranking, rel, k)) is None:
            continue
        rec.append(r)
        rr.append(reciprocal_rank(ranking, rel, k))
        nd.append(ndcg_at_k(ranking, rel, k))
    n = len(rec)
    return {"n": n, f"recall@{k}": sum(rec) / n, f"mrr@{k}": sum(rr) / n, f"ndcg@{k}": sum(nd) / n}


if __name__ == "__main__":
    qrels = {
        "q1": {"d1": 3, "d4": 1},          # graduada: 3 = responde, 1 = ajuda
        "q2": {"d7": 2},
        "q3": {"d2": 1, "d9": 3},
        "q4": {"d5": 2},                   # o sistema não devolveu nada
    }
    rankings = {
        "q1": ["d4", "d1", "d3"],
        "q2": ["d8", "d6", "d7"],
        "q3": ["d9", "d3", "d2"],
    }
    print({k: round(v, 4) for k, v in avaliar(rankings, qrels, k=3).items()})
    # {'n': 4, 'recall@3': 0.75, 'mrr@3': 0.5833, 'ndcg@3': 0.5652}`,
        },
        {
          type: 'p',
          text: 'Conferência à mão: q1 tem os dois relevantes (recall 1), o primeiro relevante em 1.º (RR 1) mas pela ordem errada, nDCG = (1 + 3/log2 3) / (3 + 1/log2 3) ≈ 0,797; q2 tem RR 1/3 e nDCG 0,5; q3 ≈ 0,964; q4 conta 0 em tudo. Os nDCG por pergunta coincidem com `sklearn.metrics.ndcg_score` quando os relevantes estão todos no ranking.',
        },
        {
          type: 'p',
          text: '**Casos-limite**: pergunta sem relevantes (sai da média e reporta-se à parte); pergunta sem ranking (conta 0); ids duplicados no ranking (não podem ganhar duas vezes); k maior do que o ranking; `n = 0` daria divisão por zero — num gate prefiro que falhe com erro claro. **Testes**: ranking ideal dá 1,0 em tudo; ranking vazio dá 0; inverter a ordem mantém o recall e baixa MRR e nDCG.',
        },
        {
          type: 'p',
          text: '**Extensões**: ganho exponencial (2^rel − 1), um limiar de relevância para o recall (só conta grau ≥ 2), métricas por intenção e intervalo de confiança por bootstrap das listas por pergunta.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — ndcg_score', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html' },
            { label: 'Python — math.log2', url: 'https://docs.python.org/3/library/math.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Itera sobre as perguntas do dourado e conta perguntas sem ranking como falha.',
          'Calcula o IDCG com todos os relevantes anotados, não só os recuperados.',
          'Trata duplicados, perguntas sem relevantes e k maior do que o ranking.',
          'Dá um exemplo com resultado conferido à mão.',
          'Propõe testes de propriedades (ideal = 1, vazio = 0, inverter ordem).',
        ],
        fraco: 'Itera sobre os rankings, calcula o IDCG a partir da lista recuperada e não testa.',
        solido: 'Implementação correcta das três métricas com os casos-limite principais.',
        excelente: 'Confere à mão, compara com uma implementação de referência, propõe testes de propriedades e as extensões (ganho exponencial, por intenção, IC).',
      },
      seguimento: [
        'Como adaptavas para relevância anotada por trecho de texto em vez de documento?',
        'Porque é que o teu nDCG difere do da sklearn quando falta um relevante no ranking?',
        'Como paralelizarias para 100 000 perguntas?',
      ],
      sinaisAlarme: [
        'Ignorar em silêncio as perguntas a que o sistema não respondeu.',
        'Não conseguir explicar o denominador do nDCG.',
      ],
      modulos: ['avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-avaliar-rag-10',
      tipo: 'debug',
      nivel: 'staff',
      titulo: 'Faithfulness alta e utilizadores a dizer que está errado',
      enunciado:
        'O dashboard mostra faithfulness média de 0,94 há um mês. Ao mesmo tempo, as avaliações negativas com comentários do tipo «isso não é verdade» triplicaram. Como explicas e como investigas?',
      contexto:
        'Operador de telecomunicações em Moçambique, assistente sobre tarifários, pacotes de dados e roaming. Corpus de cerca de 1 800 documentos (tarifários, termos, FAQs), actualizado semanalmente por exportação do CMS. Faithfulness medida com RAGAS numa amostra diária de 300 conversas. Traços guardam pergunta, chunks recuperados (com id e data do documento) e resposta.',
      minutos: 12,
      dica: 'Faithfulness compara a resposta com quê?',
      resposta: [
        {
          type: 'p',
          text: 'Faithfulness alta e respostas erradas não se contradizem: a métrica diz que **a resposta é fiel ao contexto recuperado**, não que o contexto está certo. A hipótese mais provável é que o contexto esteja errado — documentos desactualizados, de outro produto ou de outro segmento — e o modelo os reproduza fielmente.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Ler as queixas', text: 'Amostro 50 conversas com «não é verdade» e, para cada uma, vejo os chunks recuperados e a data e o estado dos documentos de onde vieram. Classifico: contexto errado, contexto certo mas resposta errada, utilizador enganado.' },
            { title: 'Verificar versões no índice', text: 'Conto quantos tarifários existem em duas versões no índice. Se a exportação semanal acrescenta a versão nova sem retirar a antiga, as duas competem e a antiga ganha muitas vezes por ter mais texto ou mais FAQs a falar dela.' },
            { title: 'Medir correcção e não fidelidade', text: 'Nas 50 conversas, anoto a resposta certa e meço a correcção. Se faithfulness é ~0,95 e a correcção ~0,6, o problema está a montante da geração.' },
            { title: 'Excluir as outras causas', text: 'Perguntas sobre um produto novo sem documento (o modelo responde com o mais parecido), mistura de segmentos (pré-pago contra pós-pago, particular contra empresa), e o juiz de faithfulness a aceitar paráfrases demasiado livres.' },
          ],
        },
        {
          type: 'p',
          text: 'Num cenário destes, a causa mais comum é a **ingestão**: uma promoção de dados expirada continua no índice com a mesma relevância que a actual, e os pedidos «quanto custa o pacote X» recuperam as duas. O modelo escolhe uma, cita-a, e é fiel. O dashboard não vê nada porque nenhuma métrica de produção compara com a verdade.',
        },
        {
          type: 'p',
          text: 'Correcção imediata: filtro de metadados na pesquisa (só documentos vigentes, por data de início e fim) e reindexação que retira versões substituídas. Depois: um campo de versão e vigência obrigatório na ingestão, e a data do documento no prompt para que o modelo possa preferir a mais recente quando há duas.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Asserção na recuperação: nenhum documento não vigente no top-k, testada em CI e monitorizada em produção. Correcção contra referência no conjunto dourado com casos de produtos que mudaram de preço. No dashboard, faithfulness ao lado de uma taxa de correcção estimada numa amostra semanal anotada — nunca sozinha.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RAGAS — Faithfulness', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/' },
            { label: 'RAGAS — Factual correctness', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/factual_correctness/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que faithfulness mede fidelidade ao contexto e não correcção.',
          'Suspeita do contexto (versões, vigência, segmento) antes do modelo.',
          'Propõe ler traços com a data e o estado dos documentos recuperados.',
          'Mede correcção contra referência numa amostra para quantificar a distância.',
          'Corrige na ingestão e na pesquisa (vigência, filtro) e acrescenta uma asserção que impede a regressão.',
        ],
        fraco: 'Diz que a métrica está avariada ou que os utilizadores estão enganados, sem olhar para o contexto.',
        solido: 'Identifica documentos desactualizados como causa e propõe filtrar por vigência.',
        excelente: 'Quantifica a distância entre faithfulness e correcção, separa as causas por classificação dos traços, corrige na ingestão e muda o dashboard para não voltar a ter uma métrica de fidelidade sozinha.',
      },
      seguimento: [
        'Como medirias correcção em produção sem anotar todos os dias?',
        'O CMS não tem data de fim. Como inferias a vigência?',
        'E se o problema fosse o juiz de faithfulness a ser demasiado permissivo?',
      ],
      sinaisAlarme: [
        'Defender o sistema porque a faithfulness está acima de 0,9.',
        'Propor trocar de modelo sem olhar para os documentos recuperados.',
        'Não ter nenhuma métrica de produção que compare com a verdade.',
      ],
      modulos: ['avaliar-rag', 'ingestao-chunking', 'observabilidade-llmops'],
    },
  ],
};
