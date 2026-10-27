import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'bases-vectoriais',
  numero: 10,
  bloco: 'rag',
  titulo: 'Bases vectoriais e pesquisa aproximada',
  resumo:
    'Pesquisa exacta vs aproximada, HNSW, IVF e PQ, quantização com re-scoring, filtros e o recall que se perde com eles, pgvector vs base dedicada, dimensionamento e multi-tenancy. É onde um engenheiro de backend sénior mostra que sabe de bases de dados também neste mundo.',
  icon: '🗄️',
  modulos: ['bases-vectoriais', 'embeddings', 'pesquisa-hibrida'],
  essencial: [
    'Pesquisa exacta custa O(N·D) por consulta e tem recall 1; até ~10⁵–10⁶ vectores, ou num subconjunto filtrado pequeno, muitas vezes chega e dispensa índice.',
    'HNSW: grafo em camadas com pesquisa gulosa. M controla ligações por nó (memória e recall), ef_construction a qualidade da construção, ef_search o recall e a latência de cada consulta (ef_search ≥ k).',
    'Defaults do pgvector: m = 16, ef_construction = 64, hnsw.ef_search = 40. O vector indexável vai até 2 000 dimensões; halfvec até 4 000.',
    'IVF parte o espaço em listas por k-means e visita nprobe listas; PQ comprime cada vector em m bytes com codebooks por sub-vector. IVF-PQ é a receita para milhares de milhões.',
    'Memória: N × D × 4 bytes em float32; halfvec ÷2, int8 ÷4, binária ÷32. 50M × 768 em float32 são ~154 GB; em binário ~4,8 GB.',
    'Quantização agressiva só se usa com re-scoring: sobre-amostrar candidatos no índice quantizado e reordenar com os vectores originais.',
    'Pós-filtro num índice ANN devolve menos de k resultados quando o filtro é selectivo: com ef_search = 40 e 10% de selectividade, sobram ~4 linhas em média.',
    'pgvector 0.8.0 trouxe iterative index scans (hnsw.iterative_scan = strict_order ou relaxed_order) para continuar a procurar até ter linhas suficientes.',
    'Multi-tenancy: filtro por tenant num índice partilhado, partição por tenant, ou índice por tenant — isolamento e custo crescem por esta ordem.',
    'Recall de um índice ANN mede-se contra a pesquisa exacta no mesmo corpus, por fatia de filtro, e não se assume.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-bases-vectoriais-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Pesquisa exacta ou aproximada: quando é que o kNN exacto chega',
      enunciado:
        'Precisas mesmo de um índice aproximado? Tens 80 mil chunks de documentação interna. Quando é que a pesquisa exacta chega e quando deixa de chegar?',
      minutos: 4,
      dica: 'Calcula quantos bytes lês por consulta numa pesquisa exacta.',
      resposta: [
        {
          type: 'p',
          text: 'Com 80 mil chunks **a pesquisa exacta chega e é a melhor escolha**: recall de 100%, nada para afinar, nenhum índice para manter. Um índice ANN só se justifica quando o custo O(N·D) por consulta deixa de caber no orçamento de latência ou de CPU.',
        },
        {
          type: 'p',
          text: 'A conta: a pesquisa exacta lê N × D × 4 bytes por consulta. 80 mil × 768 em float32 são ~245 MB — um produto matriz-vector que em CPU demora milissegundos a poucas dezenas de milissegundos, e muito menos por consulta se fizer lotes. Com 1 milhão de vectores já são ~3 GB lidos por consulta: dezenas a centenas de milissegundos e um núcleo inteiro ocupado, o que a 50 consultas por segundo deixa de ser razoável. Um HNSW bem afinado responde em milissegundos com recall típico acima de 0,95, à custa de memória extra e de recall imperfeito.',
        },
        {
          type: 'table',
          head: ['Situação', 'Escolha'],
          rows: [
            ['Até ~10⁵ vectores, QPS modesto', 'Exacta (numpy, FAISS IndexFlat, ou pgvector sem índice)'],
            ['Filtro reduz cada consulta a poucos milhares de vectores (por tenant, por utilizador)', 'Exacta sobre o subconjunto filtrado, com índice B-tree no filtro'],
            ['10⁶ ou mais, latência de milissegundos', 'ANN (HNSW ou IVF)'],
            ['Avaliar um índice ANN', 'Exacta como verdade de referência para medir o recall'],
          ],
        },
        {
          type: 'p',
          text: 'Em Postgres isto é literal: o pgvector faz pesquisa exacta por omissão quando não há índice, com recall perfeito, e pode paralelizar o scan. Começo assim e só crio o HNSW quando a latência medida o pede.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'ANN por reflexo',
          text: 'Pôr uma base vectorial distribuída à frente de 80 mil vectores é acrescentar um sistema, uma sincronização e um recall abaixo de 1 para resolver um problema que um produto de matrizes já resolvia.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — pesquisa exacta e índices', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Faiss — documentação', url: 'https://faiss.ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que a pesquisa exacta tem recall 1 e custo O(N·D) por consulta.',
          'Faz a conta de bytes lidos por consulta para o N dado.',
          'Dá uma ordem de grandeza a partir da qual o ANN compensa.',
          'Menciona o caso do subconjunto filtrado pequeno ou o uso do exacto para medir recall.',
        ],
        fraco: '«Uso sempre uma base vectorial com HNSW», sem contas.',
        solido: 'Faz a conta de N × D × 4, conclui que 80 mil cabe em exacto e diz quando passar a ANN.',
        excelente: 'Acrescenta lotes de consultas, o exacto sobre subconjuntos filtrados e como verdade de referência para medir o recall do índice.',
      },
      seguimento: [
        'Como medirias o recall do HNSW quando o criares?',
        'Se cada tenant tiver 5 mil vectores e houver 2 000 tenants, que fazes?',
        'O que muda se as consultas vierem em lotes de 1 000?',
      ],
      sinaisAlarme: [
        'Achar que pesquisa exacta «não escala» sem fazer a conta.',
        'Não saber que o ANN tem recall abaixo de 1.',
      ],
      modulos: ['bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-bases-vectoriais-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'HNSW por dentro: M, ef_construction, ef_search, inserções e deletes',
      enunciado:
        'Explica-me como funciona o HNSW e o que fazem M, ef_construction e ef_search. O que acontece ao índice quando há muitas inserções e deletes?',
      minutos: 6,
      dica: 'Pensa numa skip list feita com grafos de vizinhança.',
      resposta: [
        {
          type: 'p',
          text: 'O HNSW é um **grafo de proximidade em camadas**: as camadas de cima têm poucos nós e ligações longas, a de baixo tem todos os nós e ligações curtas. A pesquisa entra no topo, desce de forma gulosa até à camada 0 e aí explora uma lista de candidatos de tamanho ef_search. É uma skip list feita de grafos, com custo de pesquisa que cresce aproximadamente com log N.',
        },
        {
          type: 'terms',
          items: [
            { term: 'M', def: 'Ligações por nó (na camada 0 é habitual 2M). Mais M dá melhor recall em dados difíceis, mais memória por vector e construção mais lenta. Valores de 12 a 48 são comuns; o pgvector usa 16 por omissão.' },
            { term: 'ef_construction', def: 'Tamanho da lista de candidatos ao inserir cada nó. Mais alto dá um grafo melhor e construção mais lenta; não afecta a memória. pgvector: 64 por omissão.' },
            { term: 'ef_search', def: 'Lista de candidatos por consulta, o botão de recall contra latência em tempo de execução; tem de ser pelo menos k. pgvector: 40 por omissão, ajustável por sessão.' },
          ],
        },
        {
          type: 'p',
          text: 'Memória: o HNSW quer o grafo e os vectores em RAM, porque a pesquisa salta para posições aleatórias. Os vizinhos custam da ordem de 2M × (4 a 8) bytes por vector na camada 0, pouco ao lado dos vectores (768 × 4 = 3 KB), mas no pgvector o índice guarda também uma cópia do vector, por isso o índice tem tamanho comparável à tabela.',
        },
        {
          type: 'p',
          text: 'Inserções: ao contrário do IVF, o HNSW aceita inserções incrementais sem re-treino, mas cada inserção é uma pesquisa mais a reescrita de ligações — carga em massa é muito mais rápida com construção do zero. No pgvector, a construção é muito mais rápida quando o grafo cabe em `maintenance_work_mem`, e pode usar workers paralelos. **Deletes** são o ponto fraco: o nó é marcado e as ligações têm de ser reparadas mais tarde (no pgvector, no VACUUM, que pode ser lento — a documentação sugere reindexar primeiro); muitas actualizações degradam a conectividade e o recall até haver reconstrução. No Qdrant, o optimizador reconstrói segmentos com muitos pontos apagados.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como afino na prática',
          text: 'Fixo M e ef_construction, construo uma vez, e depois varro ef_search (40, 80, 160, 320) medindo recall@10 contra pesquisa exacta e p95 de latência. Escolho o menor ef_search que dá o recall alvo. Se nem com ef_search alto chego lá, aí sim reconstruo com M maior.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Malkov e Yashunin (2016) — Efficient and robust approximate nearest neighbor search using HNSW', url: 'https://arxiv.org/abs/1603.09320' },
            { label: 'pgvector — HNSW, opções e VACUUM', url: 'https://github.com/pgvector/pgvector' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Descreve a estrutura em camadas e a pesquisa gulosa de cima para baixo.',
          'Explica o efeito de M, ef_construction e ef_search, separando tempo de construção de tempo de consulta.',
          'Diz que ef_search tem de ser pelo menos k e é o botão de recall em execução.',
          'Fala da memória (grafo + vectores em RAM) com alguma ordem de grandeza.',
          'Explica que deletes deixam marcas e degradam o grafo até reparação ou reconstrução.',
        ],
        fraco: '«É um grafo que encontra vizinhos rápido», sem parâmetros nem custo.',
        solido: 'Explica camadas, os três parâmetros e que se afina ef_search contra recall medido.',
        excelente: 'Acrescenta a memória por vector, a diferença entre carga em massa e inserção incremental, o custo dos deletes com reparação e o procedimento de afinação com varrimento de ef_search.',
      },
      seguimento: [
        'Porque é que o HNSW não gosta de estar em disco?',
        'Como reconstruías o índice sem parar as consultas?',
        'Que impacto tem uma taxa de 10% de actualizações por dia?',
      ],
      sinaisAlarme: [
        'Confundir ef_construction com ef_search.',
        'Achar que o recall do HNSW é 100%.',
        'Ignorar o efeito dos deletes.',
      ],
      modulos: ['bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-bases-vectoriais-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'IVF e Product Quantization',
      enunciado:
        'Fora o HNSW, que outras famílias de índices conheces? Explica IVF e PQ e quando os escolhias.',
      minutos: 5,
      dica: 'Uma das técnicas reduz quantos vectores visitas; a outra reduz quanto custa cada vector.',
      resposta: [
        {
          type: 'p',
          text: 'O **IVF** reduz quantos vectores comparo: parte o espaço em listas com k-means e cada consulta só visita as nprobe listas mais próximas. O **PQ** reduz quanto custa cada vector: comprime-o em poucos bytes e calcula distâncias aproximadas por tabela. Juntos (IVF-PQ) são a receita clássica para centenas de milhões ou milhares de milhões de vectores com pouca memória.',
        },
        {
          type: 'p',
          text: 'IVF: treino nlist centróides sobre uma amostra, atribuo cada vector à lista do centróide mais próximo, e na consulta procuro exaustivamente dentro de nprobe listas. O recall sobe com nprobe; o custo também. As receitas do pgvector para IVFFlat são um bom ponto de partida: lists = linhas / 1000 até 1 milhão de linhas e √linhas acima disso, probes ≈ √lists. Como os centróides são treinados, o índice tem de ser criado depois de haver dados, e se a distribuição mudar (novo tipo de documento, novo modelo) as listas desequilibram e o recall cai até re-treinar.',
        },
        {
          type: 'p',
          text: 'PQ: divido o vector de D dimensões em m sub-vectores e treino um codebook de 256 centróides para cada sub-espaço; cada vector passa a ser m códigos de 1 byte. Com D = 768 e m = 96, são 96 bytes em vez de 3 072 — 32× menos. A distância à consulta calcula-se somando entradas de tabelas pré-calculadas (distância assimétrica), o que é rápido. O custo é erro de aproximação, e por isso guardo os vectores originais para **re-ordenar** os candidatos finais.',
        },
        {
          type: 'table',
          head: ['Índice', 'Memória', 'Pontos fortes', 'Pontos fracos'],
          rows: [
            ['HNSW', 'Alta (vectores + grafo)', 'Recall alto, latência baixa, inserções incrementais', 'RAM, deletes caros'],
            ['IVF-Flat', 'Vectores + centróides', 'Construção rápida, simples', 'Precisa de treino; recall cai com deriva'],
            ['IVF-PQ', 'Muito baixa', 'Escala enorme num só nó', 'Recall menor sem re-ordenação; afinação mais difícil'],
          ],
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Onde existe',
          text: 'O pgvector tem HNSW e IVFFlat, não PQ. FAISS e Milvus têm IVF-PQ e variantes; o Qdrant tem quantização de produto como opção de compressão do índice. Escolho a ferramenta depois de saber se preciso disto.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Douze et al. (2024) — The Faiss library', url: 'https://arxiv.org/abs/2401.08281' },
            { label: 'Milvus — tipos de índice', url: 'https://milvus.io/docs/index.md' },
            { label: 'pgvector — IVFFlat', url: 'https://github.com/pgvector/pgvector' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica IVF como partição por k-means com visita a nprobe listas.',
          'Explica PQ como sub-vectores quantizados com codebooks, m bytes por vector.',
          'Faz uma conta de compressão do PQ.',
          'Menciona que IVF precisa de treino e sofre com deriva da distribuição.',
          'Propõe re-ordenar com vectores originais para recuperar recall.',
        ],
        fraco: 'Sabe só o nome dos índices ou confunde IVF com PQ.',
        solido: 'Explica os dois mecanismos, os parâmetros nlist/nprobe e m, e o trade-off recall/memória.',
        excelente: 'Acrescenta números de compressão, as receitas de lists/probes, o problema da deriva e quando escolher IVF-PQ em vez de HNSW.',
      },
      seguimento: [
        'O que acontece a um índice IVF se adicionares 30% de documentos de outro domínio?',
        'Como escolhias m no PQ?',
        'HNSW sobre vectores PQ faz sentido?',
      ],
      sinaisAlarme: [
        'Criar um IVF sobre a tabela vazia e carregar os dados depois.',
        'Usar PQ sem re-ordenação e aceitar o recall que vier.',
      ],
      modulos: ['bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-bases-vectoriais-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Quantização: halfvec, int8, binária e re-scoring',
      enunciado:
        'O índice já não cabe na RAM do servidor. Alguém propõe quantização binária «porque é 32 vezes menor». Concordas? O que pões em cima da mesa?',
      minutos: 7,
      dica: 'A pergunta certa não é quanto encolhe, é quanto recall perdes e como o recuperas.',
      resposta: [
        {
          type: 'p',
          text: 'Concordo em considerar, não em aplicar às cegas. Ponho três degraus em cima da mesa — **half precision (2×), int8 (4×) e binária (32×)** — e a binária só com **re-scoring**: pesquisa no índice binário com sobre-amostragem e reordenação dos candidatos com os vectores completos, que ficam em disco. Decido pelo recall@10 medido contra a pesquisa exacta.',
        },
        {
          type: 'table',
          head: ['Formato', 'Bytes por vector (D = 1024)', 'Perda típica', 'Notas'],
          rows: [
            ['float32', '4 096', 'Referência', 'O que o modelo produz'],
            ['halfvec / float16', '2 048', 'Normalmente desprezável', 'No pgvector indexa até 4 000 dimensões'],
            ['int8 escalar', '1 024', 'Pequena, depende da distribuição', 'Precisa de calibrar intervalos por dimensão'],
            ['binária (1 bit)', '128', 'Grande sem re-scoring', 'Distância de Hamming com popcount, muito rápida'],
          ],
        },
        {
          type: 'p',
          text: 'Porque é que a binária funciona com re-scoring: guardar só o sinal de cada componente preserva a «direcção grossa» do vector, suficiente para tirar um conjunto de candidatos onde os verdadeiros vizinhos quase sempre estão. Peço, por exemplo, 4× mais candidatos do que preciso e reordeno-os com os vectores float — custa algumas dezenas de leituras de disco por consulta. Funciona melhor com modelos de muitas dimensões e com modelos cujo cartão diz que foram avaliados com quantização; com poucas dimensões, a perda é maior.',
        },
        {
          type: 'p',
          text: 'No pgvector faço isto com um índice de expressão sobre `binary_quantize(embedding)::bit(1024)` com `bit_hamming_ops`, uma subconsulta que tira os 40 primeiros por Hamming e uma consulta exterior que reordena por `<=>` sobre a coluna original. No Qdrant, a quantização é configuração da colecção, com os originais em disco e parâmetros de pesquisa para `rescore` e `oversampling`.',
        },
        {
          type: 'p',
          text: 'Antes de quantizar, pergunto se o problema não se resolve mais barato: halfvec dá metade da memória quase sem perda; Matryoshka permite truncar dimensões se o modelo o suportar; e às vezes o certo é dividir o índice por tenant e só manter quentes os activos.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Medir no índice errado',
          text: 'Comparar o recall do índice quantizado contra o HNSW em float32 mede duas aproximações uma contra a outra. A referência é a pesquisa exacta em float32 sobre uma amostra de consultas reais.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — halfvec e quantização binária', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Qdrant — quantização', url: 'https://qdrant.tech/documentation/guides/quantization/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Apresenta vários níveis de quantização com o factor de compressão de cada um.',
          'Exige re-scoring com sobre-amostragem para a quantização binária.',
          'Diz onde ficam os vectores originais (disco) e o custo de os ler.',
          'Mede recall contra pesquisa exacta, não contra outro índice aproximado.',
          'Considera alternativas mais baratas (halfvec, Matryoshka, partição).',
        ],
        fraco: '«Sim, 32× menos memória», sem falar de recall nem de re-scoring.',
        solido: 'Compara halfvec, int8 e binária, propõe binária com re-scoring e mede recall@10.',
        excelente: 'Escolhe a sobre-amostragem por curva medida, descreve a implementação concreta (pgvector ou Qdrant), mede contra o exacto e propõe primeiro as opções mais baratas.',
      },
      seguimento: [
        'Que factor de sobre-amostragem escolhias e como?',
        'O re-scoring lê de disco: qual é o impacto no p95?',
        'Quantização int8 precisa de calibração? Com que dados?',
      ],
      sinaisAlarme: [
        'Quantizar sem guardar os vectores originais.',
        'Não medir o recall depois da quantização.',
      ],
      modulos: ['bases-vectoriais', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-bases-vectoriais-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Pré-filtro, pós-filtro e filtro dentro do índice',
      enunciado:
        'Numa pesquisa vectorial com filtro de metadados — «só documentos deste país e desta categoria» — onde aplicas o filtro, e porque é que a resposta depende da selectividade?',
      minutos: 5,
      dica: 'Faz a conta para um filtro que deixa passar 50% dos documentos e para um que deixa passar 0,1%.',
      resposta: [
        {
          type: 'p',
          text: 'Há três sítios — antes, depois ou durante a travessia do índice — e a escolha depende da **selectividade**. Filtros largos funcionam bem dentro do índice; filtros muito selectivos funcionam melhor com pré-filtro e pesquisa exacta sobre o subconjunto; o pós-filtro ingénuo é o que parte o recall.',
        },
        {
          type: 'table',
          head: ['Estratégia', 'Como funciona', 'Bom quando', 'Falha quando'],
          rows: [
            ['Pós-filtro', 'ANN devolve os ef_search candidatos e depois descarta os que não passam', 'O filtro deixa passar a maioria', 'Filtro selectivo: sobram menos de k resultados'],
            ['Pré-filtro + exacto', 'Índice B-tree ou payload index dá o subconjunto; distância exacta sobre ele', 'O subconjunto tem poucos milhares de vectores', 'O subconjunto é grande: volta o custo O(N·D)'],
            ['Filtro durante a travessia', 'O grafo só aceita candidatos que passam, mas continua a navegar pelos outros', 'Selectividade intermédia', 'Filtro muito selectivo desliga o grafo e a pesquisa fica presa'],
          ],
        },
        {
          type: 'p',
          text: 'A conta do pós-filtro: o pgvector aplica o filtro depois do scan do índice, e com ef_search = 40 e um filtro que deixa passar 10% sobram em média 4 linhas — pedi 10 e recebo 4. Com 1% sobra 0,4. É por isso que a versão 0.8.0 trouxe os **iterative index scans**: com `hnsw.iterative_scan` activo, o índice continua a procurar até ter linhas suficientes ou chegar a `hnsw.max_scan_tuples`.',
        },
        {
          type: 'p',
          text: 'As bases dedicadas fazem o filtro durante a travessia e usam estatísticas para decidir. O Qdrant usa os índices de payload para estimar a cardinalidade do filtro e escolher a estratégia, e quando o índice de payload existe antes da construção do HNSW acrescenta ligações por valor desse campo, para o grafo não se desligar. A consequência prática é a mesma em todo o lado: **indexar os campos de filtro e medir o recall por faixa de selectividade**.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Selectividade conhecida, estrutura dedicada',
          text: 'Se há poucos valores de filtro muito usados (país, idioma), um índice parcial ou uma partição por valor elimina o problema: dentro da partição, não há filtro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — filtering e iterative index scans', url: 'https://github.com/pgvector/pgvector#iterative-index-scans' },
            { label: 'Qdrant — filtragem', url: 'https://qdrant.tech/documentation/concepts/filtering/' },
            { label: 'Qdrant — indexação e índices de payload', url: 'https://qdrant.tech/documentation/concepts/indexing/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue pós-filtro, pré-filtro com exacto e filtro durante a travessia.',
          'Faz a conta de quantas linhas sobram no pós-filtro com ef_search e selectividade.',
          'Liga a escolha à selectividade do filtro.',
          'Menciona uma solução concreta: iterative scans, índice de payload, partição ou índice parcial.',
        ],
        fraco: '«Aplico o filtro no WHERE» sem perceber que o índice aproximado o ignora.',
        solido: 'Explica as três estratégias, a conta do pós-filtro e os iterative scans do pgvector.',
        excelente: 'Escolhe por faixa de selectividade, explica como o grafo se desliga com filtros selectivos e propõe partições ou índices parciais para os filtros previsíveis, medindo recall por faixa.',
      },
      seguimento: [
        'Como estimas a selectividade de um filtro em tempo de consulta?',
        'Dois filtros combinados com AND: o que muda?',
        'O que custa o relaxed_order em relação ao strict_order?',
      ],
      sinaisAlarme: [
        'Achar que o WHERE é aplicado dentro do índice HNSW.',
        'Não considerar que a selectividade varia entre consultas.',
      ],
      modulos: ['bases-vectoriais', 'pesquisa-hibrida'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-bases-vectoriais-06',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'pgvector ou base vectorial dedicada',
      enunciado:
        'A tua empresa já corre tudo em Postgres. A equipa de dados quer Qdrant ou Milvus para o RAG novo. Como decides, e o que te faria mudar de ideias daqui a um ano?',
      minutos: 9,
      dica: 'O custo de uma base nova não está na pesquisa, está na sincronização, na segurança e em quem a opera às 3 da manhã.',
      resposta: [
        {
          type: 'p',
          text: 'Começava por **pgvector** se os dados de origem já vivem em Postgres e a escala cabe num nó — ganho transacções, joins com metadados, permissões e backups que já sei operar. Passava para uma base dedicada quando houvesse uma razão medida: memória que não cabe num nó, filtros selectivos com recall mau, multi-tenancy em grande escala, ou tempos de reconstrução do índice incompatíveis com a operação.',
        },
        {
          type: 'compare',
          left: {
            title: 'pgvector',
            items: [
              'Vector e metadados na mesma linha e na mesma transacção: sem sincronização',
              'Joins, RLS por tenant, backups, réplicas e monitorização já existentes',
              'HNSW e IVFFlat, halfvec, binário com re-scoring, iterative scans desde 0.8.0',
              'Escala vertical; índice HNSW quer RAM; reconstruções e VACUUM pesam no mesmo servidor que serve o resto',
            ],
          },
          right: {
            title: 'Base dedicada (Qdrant, Milvus, Weaviate)',
            items: [
              'Quantização com re-scoring e vectores em disco como configuração',
              'Filtros integrados na travessia e funcionalidades de multi-tenancy',
              'Sharding e replicação horizontais nativos',
              'Mais um sistema: sincronização (CDC ou outbox), consistência eventual, mais uma superfície de segurança',
            ],
          },
        },
        {
          type: 'p',
          text: 'As perguntas que faço para decidir: quantos vectores hoje e daqui a 18 meses, e quanta RAM isso exige (N × D × bytes por componente, mais o grafo); qual é a selectividade dos filtros; que p95 e QPS; que isolamento entre clientes; e quem fica de piquete. Para uns poucos milhões de vectores com metadados relacionais, o pgvector é quase sempre suficiente; para centenas de milhões com filtros por tenant, uma base dedicada passa a pagar-se.',
        },
        {
          type: 'p',
          text: 'O custo escondido da base dedicada é a **sincronização**: cada documento apagado ou cujas permissões mudaram tem de chegar ao índice vectorial, ou o RAG cita dados que já não deviam existir. Isso pede outbox ou CDC com idempotência, reconciliação periódica e um alarme de desvio — trabalho que o pgvector me poupa por estar na mesma transacção.',
        },
        {
          type: 'p',
          text: 'Para não ficar preso, escondo a pesquisa atrás de uma interface própria (pesquisar com filtros, inserir, apagar), com um conjunto de recall e latência que corre contra qualquer implementação. Assim, mudar daqui a um ano é uma migração com avaliação, não uma reescrita.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador quer ouvir',
          text: 'Não há resposta certa em abstracto; há critérios com números, um ponto de partida justificado e um gatilho explícito para mudar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Qdrant — documentação', url: 'https://qdrant.tech/documentation/' },
            { label: 'Milvus — documentação', url: 'https://milvus.io/docs/index.md' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe um ponto de partida justificado pelo contexto (dados já em Postgres, escala).',
          'Lista critérios mensuráveis: N, D, RAM, selectividade dos filtros, p95, QPS, isolamento.',
          'Identifica a sincronização e os deletes como custo principal de uma base separada.',
          'Define gatilhos concretos para mudar.',
          'Propõe uma abstracção e um conjunto de avaliação para não ficar preso.',
        ],
        fraco: 'Escolhe pela popularidade ou por «ser feita para isto», sem critérios.',
        solido: 'Compara capacidades, considera a operação e escolhe pgvector com gatilhos para mudar.',
        excelente: 'Quantifica a RAM e a escala a 18 meses, trata deletes e permissões na sincronização como requisito de segurança, e reduz o custo de mudar com interface e avaliação reutilizável.',
      },
      seguimento: [
        'Como garantias que um documento apagado sai do índice vectorial em menos de 5 minutos?',
        'Que números te fariam sair do pgvector?',
        'E uma solução gerida na cloud, muda alguma coisa?',
      ],
      sinaisAlarme: [
        'Ignorar a sincronização e a consistência entre a base de origem e o índice.',
        'Decidir sem qualquer número de escala.',
        'Desvalorizar o custo operacional de mais um sistema.',
      ],
      modulos: ['bases-vectoriais', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-bases-vectoriais-07',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quanta memória e disco para 10 milhões de vectores',
      enunciado:
        'Estima-me, no quadro, quanta memória e disco precisas para 10 milhões de chunks com embeddings de 1024 dimensões num Postgres com pgvector e HNSW.',
      minutos: 5,
      dica: 'Vectores, grafo, cópias, réplicas e margem. Faz cada parcela separadamente.',
      resposta: [
        {
          type: 'p',
          text: 'Os vectores em float32 são cerca de **41 GB**; com o índice HNSW, que no pgvector guarda outra cópia do vector mais os vizinhos, conto com ~85–90 GB por réplica, e quero que o índice caiba em RAM. Com halfvec divido quase tudo por dois.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Vectores', text: '10M × (1024 × 4 + 8) bytes ≈ 41 GB na tabela (o 8 é o cabeçalho do tipo vector do pgvector). Com halfvec: 10M × (1024 × 2 + 8) ≈ 20,5 GB.' },
            { title: 'Índice HNSW', text: 'Cópia do vector (~41 GB) mais vizinhos: com m = 16, a camada 0 tem até 32 vizinhos de ~6 bytes cada, ~200 bytes por vector, ~2 GB. Total na ordem de 43–45 GB; confirmo com `pg_relation_size` depois de construir uma amostra.' },
            { title: 'Resto da linha', text: 'Texto do chunk (300 tokens ≈ 1,2–1,5 KB), metadados e índices B-tree: mais 15–20 GB, sobretudo em TOAST.' },
            { title: 'Multiplicadores', text: 'Uma réplica de leitura duplica tudo; WAL e espaço para reconstruir o índice em paralelo (REINDEX CONCURRENTLY constrói o novo ao lado do velho) pedem ~1 índice de folga; crescimento anual por cima.' },
          ],
        },
        {
          type: 'p',
          text: 'Conclusão em ordem de grandeza: ~100 GB de disco por réplica em float32, mais folga para reconstrução, e RAM suficiente para o índice estar quente — uma máquina na casa dos 64 GB já obriga a ir buscar páginas ao disco no HNSW em float32, o que dá p95 imprevisível. Em halfvec o índice cai para ~22 GB e cabe com folga. Para a construção, `maintenance_work_mem` grande o suficiente para o grafo caber acelera-a muito.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Esquecer a cópia no índice',
          text: 'Quem conta só N × D × 4 subestima por 2× no pgvector. Valida sempre a fórmula com uma amostra real de 100 mil linhas e extrapola.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — armazenamento por tipo e construção de índices', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — CREATE INDEX (CONCURRENTLY)', url: 'https://www.postgresql.org/docs/current/sql-createindex.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Calcula N × D × 4 correctamente (~41 GB).',
          'Conta o índice HNSW à parte, com a cópia do vector e os vizinhos.',
          'Inclui texto, metadados, réplicas e folga para reconstrução.',
          'Diz que o índice deve caber em RAM e porquê.',
          'Propõe validar a estimativa com uma amostra real.',
        ],
        fraco: 'Dá um número sem decomposição ou conta só os vectores.',
        solido: 'Decompõe vectores, índice e metadados e chega a ~100 GB por réplica.',
        excelente: 'Acrescenta réplicas, folga de reconstrução, o efeito de halfvec, a necessidade de RAM para o p95 e a validação por amostra.',
      },
      seguimento: [
        'E se fossem 100 milhões?',
        'Quanto tempo demora a construir este índice e como o aceleras?',
        'O que acontece ao p95 se só metade do índice couber em RAM?',
      ],
      sinaisAlarme: [
        'Errar a ordem de grandeza por 10×.',
        'Não considerar que o HNSW precisa de RAM para ser rápido.',
      ],
      modulos: ['bases-vectoriais', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-bases-vectoriais-08',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Multi-tenancy: filtro, partição ou índice por tenant',
      enunciado:
        'Estás a construir RAG para um SaaS B2B com 1 500 clientes, do pequeno com 2 mil documentos ao grande com 3 milhões. Como organizas os vectores entre clientes?',
      minutos: 8,
      dica: 'A distribuição de tamanhos importa tanto quanto o número de clientes. E o que acontece quando um cliente sai?',
      resposta: [
        {
          type: 'p',
          text: 'Com uma distribuição tão desigual, uso **uma estrutura híbrida**: os clientes pequenos partilham um índice com o tenant como chave de filtro (ou de partição), e os poucos clientes grandes têm partição ou shard próprio. O isolamento é imposto no servidor, nunca dependente de o cliente da API se lembrar do filtro.',
        },
        {
          type: 'table',
          head: ['Modelo', 'Isolamento', 'Custo', 'Problema típico'],
          rows: [
            ['Índice partilhado + filtro por tenant', 'Lógico', 'O mais baixo', 'Recall com filtro selectivo; um filtro esquecido é uma fuga de dados'],
            ['Partição por tenant (Postgres) ou payload de tenant co-localizado', 'Lógico, físico parcial', 'Médio', 'Milhares de partições pesam no planeador e na manutenção'],
            ['Índice ou colecção por tenant', 'Forte', 'Alto: overhead por índice', 'Não escala para milhares de clientes pequenos'],
          ],
        },
        {
          type: 'p',
          text: 'Em Postgres: tabela particionada por lista para os grandes (um HNSW por partição) e uma partição partilhada por hash para os pequenos, onde um B-tree em `tenant_id` permite **pesquisa exacta** sobre os poucos milhares de vectores de cada um — sem recall perdido. Row Level Security com o tenant a vir da sessão autenticada. No Qdrant, o padrão documentado é uma colecção com índice de payload `is_tenant`, HNSW com `m = 0` e `payload_m` positivo para construir grafos por tenant, e multi-tenancy em escalões que dá shard próprio aos clientes grandes; a documentação desaconselha uma colecção por cliente em escala.',
        },
        {
          type: 'p',
          text: 'O que muitas vezes decide é o ciclo de vida: quando um cliente sai ou pede apagamento, num índice partilhado são milhões de deletes que degradam o grafo e esperam pelo VACUUM; numa partição própria é um `DROP`. E clientes ruidosos: um grande a reindexar não deve roubar I/O aos pequenos.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O teste que tem de existir',
          text: 'Um teste de integração que pesquisa como tenant A uma frase que só existe no tenant B e exige zero resultados — em CI, em cada alteração ao caminho de pesquisa.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — multitenancy', url: 'https://qdrant.tech/documentation/guides/multiple-partitions/' },
            { label: 'PostgreSQL — particionamento de tabelas', url: 'https://www.postgresql.org/docs/current/ddl-partitioning.html' },
            { label: 'pgvector — filtering e partições', url: 'https://github.com/pgvector/pgvector' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Compara pelo menos três modelos de isolamento com custo e problema típico.',
          'Usa a distribuição de tamanhos dos clientes para propor uma solução híbrida.',
          'Impõe o tenant no servidor (RLS, filtro obrigatório) e testa a fuga entre tenants.',
          'Considera o ciclo de vida: saída de cliente, apagamento, vizinhos ruidosos.',
          'Nota que para tenants pequenos a pesquisa exacta no subconjunto evita perda de recall.',
        ],
        fraco: '«Um índice por cliente» ou «filtro por tenant_id» sem discutir custo, recall ou fuga.',
        solido: 'Propõe híbrido por tamanho, RLS ou filtro obrigatório e partições em Postgres ou is_tenant no Qdrant.',
        excelente: 'Acrescenta pesquisa exacta para os pequenos, o custo dos deletes no offboarding, vizinhos ruidosos e um teste de isolamento em CI.',
      },
      seguimento: [
        'Como promoves um cliente de partilhado para dedicado sem downtime?',
        'Uma pesquisa global entre todos os tenants (para a equipa interna) — como a fazias?',
        'Onde ficaria o tenant_id se usasses uma cache semântica?',
      ],
      sinaisAlarme: [
        'Confiar no cliente da API para enviar o filtro de tenant.',
        'Propor 1 500 colecções sem considerar o overhead.',
      ],
      modulos: ['bases-vectoriais', 'guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-bases-vectoriais-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Pesquisa vectorial para 50 milhões de vectores com filtros por tenant',
      enunciado:
        'Desenha a camada de pesquisa vectorial de uma plataforma de documentos B2B: 50 milhões de vectores, filtros obrigatórios por tenant e opcionais por tipo de documento e data. Diz-me que componentes, quanta memória e como sabes que funciona.',
      contexto:
        'Embeddings de 768 dimensões. 3 000 tenants: os 20 maiores têm metade dos vectores (o maior, 4 milhões); a mediana tem 5 mil. Pico de 300 consultas/s, p95 < 100 ms para a pesquisa. 1 milhão de vectores novos ou alterados por dia e apagamentos por pedido RGPD em menos de 24 h. Orçamento sensível a RAM.',
      minutos: 18,
      dica: 'Começa pelas contas de memória em cada formato e pela distribuição dos tenants; a arquitectura sai daí.',
      resposta: [
        {
          type: 'p',
          text: 'Proponho uma base vectorial com sharding e multi-tenancy **em escalões**: os ~20 tenants grandes em shards próprios com HNSW, os pequenos num shard partilhado com o tenant co-localizado e grafos por tenant, vectores em quantização binária ou int8 em RAM com os originais em disco para re-scoring, e um serviço de pesquisa que impõe o tenant a partir da autenticação.',
        },
        {
          type: 'h',
          text: 'Estimativas',
        },
        {
          type: 'table',
          head: ['Formato', 'Por vector', '50M vectores'],
          rows: [
            ['float32', '3 072 B', '~154 GB'],
            ['float16', '1 536 B', '~77 GB'],
            ['int8', '768 B', '~38 GB'],
            ['binário', '96 B', '~4,8 GB'],
            ['Grafo HNSW (m = 16)', '~130–260 B', '~6–13 GB'],
          ],
        },
        {
          type: 'p',
          text: 'Com int8 em RAM mais grafo, ~50 GB divididos por 3 nós com réplica 2 dá ~35 GB por nó; os originais em float32 (~154 GB) ficam em SSD para re-scoring. Escritas: 1M por dia são ~12/s em média — confortável para inserção incremental no HNSW. Consultas: 300/s com re-scoring de ~40 candidatos são ~12 mil leituras aleatórias de SSD por segundo no pico, que um NVMe aguenta.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Camada de pesquisa vectorial multi-tenant',
            cols: 6,
            rows: 4,
            zones: [
              { id: 'z-db', label: 'Cluster vectorial (3 nós, réplica 2)', col: 3, row: 0, colSpan: 3, rowSpan: 4, tone: 'data' },
            ],
            nodes: [
              { id: 'app', label: 'App / RAG', sub: 'token com tenant', col: 0, row: 1, kind: 'user' },
              { id: 'svc', label: 'Serviço de pesquisa', sub: 'impõe tenant, filtros', col: 1, row: 1, kind: 'service' },
              { id: 'emb', label: 'Modelo de embeddings', sub: 'versão fixa', col: 1, row: 0, kind: 'model' },
              { id: 'ing', label: 'Ingestão', sub: 'outbox / CDC', col: 1, row: 3, kind: 'queue' },
              { id: 'src', label: 'Base de origem', sub: 'documentos e ACL', col: 0, row: 3, kind: 'data' },
              { id: 'big', label: 'Shards dedicados', sub: '20 tenants grandes', col: 3, row: 0, span: 2, kind: 'vector' },
              { id: 'small', label: 'Shard partilhado', sub: '~2 980 tenants, is_tenant', col: 3, row: 1, span: 2, kind: 'vector' },
              { id: 'disk', label: 'Originais em SSD', sub: 're-scoring', col: 3, row: 2, span: 2, kind: 'data' },
              { id: 'eval', label: 'Job de recall', sub: 'exacto vs ANN', col: 5, row: 3, kind: 'note' },
            ],
            edges: [
              { from: 'app', to: 'svc' },
              { from: 'svc', to: 'emb' },
              { from: 'svc', to: 'big', label: 'shard key' },
              { from: 'svc', to: 'small', label: 'filtro tenant' },
              { from: 'src', to: 'ing' },
              { from: 'ing', to: 'small', style: 'dashed' },
              { from: 'ing', to: 'big', style: 'dashed' },
              { from: 'eval', to: 'disk', style: 'dashed' },
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Encaminhamento por tenant', text: 'O serviço lê o tenant do token, nunca do corpo do pedido, e escolhe o shard. No Qdrant isto é multi-tenancy em escalões com shard keys e um shard de recurso para os pequenos; em Postgres seriam partições por lista para os grandes e partições por hash para os restantes.' },
            { title: 'Pequenos tenants', text: 'Com 5 mil vectores, pesquisa exacta sobre o subconjunto é trivial e tem recall 1; no Qdrant, grafos por tenant (`payload_m`) evitam o problema do filtro selectivo num grafo global.' },
            { title: 'Filtros secundários', text: 'Tipo de documento e data com índices de payload criados antes do HNSW; meço o recall por faixa de selectividade e, se o filtro de data for muito selectivo, faço pré-filtro com pesquisa exacta.' },
            { title: 'Apagamentos RGPD', text: 'Delete por id propagado por outbox em minutos; reconciliação diária entre origem e índice; os segmentos com muitos apagados são reconstruídos pelo optimizador. Saída de um tenant grande é apagar o shard.' },
            { title: 'Promoção de tenants', text: 'Quando um tenant passa um limiar de tamanho, copio os seus pontos para um shard dedicado e só depois troco o encaminhamento.' },
          ],
        },
        {
          type: 'h',
          text: 'Como sei que funciona',
        },
        {
          type: 'p',
          text: 'Um job diário tira 500 consultas reais por escalão (grande, pequeno, com e sem filtro secundário), calcula o top-10 exacto sobre os originais e mede o recall@10 do caminho de produção; alarme se cair abaixo de 0,95 em qualquer fatia. Métricas de serviço: p95 por shard, resultados devolvidos menos do que k, e atraso da ingestão. Um teste de isolamento entre tenants corre em cada deploy.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Média global, fatia partida',
          text: 'Um recall médio de 0,97 pode esconder 0,6 nos tenants pequenos com filtro de data. O SLO de recall é por fatia, ou não serve.',
        },
        {
          type: 'p',
          text: 'Para depois: pesquisa híbrida com vectores esparsos, colocação dos tenants grandes por região para residência de dados, e cache de consultas frequentes com o tenant e a versão do modelo na chave.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — multitenancy em escalões', url: 'https://qdrant.tech/documentation/guides/multiple-partitions/' },
            { label: 'Qdrant — quantização', url: 'https://qdrant.tech/documentation/guides/quantization/' },
            { label: 'Malkov e Yashunin (2016) — HNSW', url: 'https://arxiv.org/abs/1603.09320' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Faz as contas de memória por formato e escolhe um com base no orçamento de RAM.',
          'Usa a distribuição dos tenants para separar grandes e pequenos.',
          'Impõe o tenant no servidor e testa o isolamento.',
          'Trata filtros secundários com recall medido por selectividade.',
          'Resolve apagamentos RGPD com propagação, reconciliação e reconstrução.',
          'Define avaliação contínua de recall por fatia contra pesquisa exacta.',
        ],
        fraco: 'Um único índice HNSW em float32 com filtro por tenant, sem contas nem medição de recall.',
        solido: 'Contas de memória, quantização com re-scoring, multi-tenancy por escalões e filtro imposto no servidor.',
        excelente: 'Acrescenta a pesquisa exacta para pequenos tenants, promoção sem downtime, apagamentos com prazo e SLO de recall por fatia com job diário contra o exacto.',
      },
      seguimento: [
        'O maior tenant cresce para 20 milhões. O que muda?',
        'Como lidavas com um pico de 3 000 consultas/s num só tenant?',
        'E se fosse obrigatório usar só Postgres?',
      ],
      sinaisAlarme: [
        'Não fazer nenhuma conta de memória.',
        'Tenant vindo do pedido do cliente.',
        'Medir recall só na média global.',
      ],
      modulos: ['bases-vectoriais', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-bases-vectoriais-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O recall caiu a pique quando se adicionou o filtro de categoria',
      enunciado:
        'Adicionaram um filtro de categoria à pesquisa semântica do catálogo. Sem filtro tudo bem; com filtro, algumas categorias devolvem 0 a 3 produtos quando pedimos 10, e outras funcionam. O que se passa?',
      contexto:
        'Loja online de electrónica e casa: 6 milhões de produtos em Postgres 16 com pgvector 0.7, índice HNSW (m = 16, ef_construction = 64), ef_search por omissão. Consulta: `ORDER BY embedding <=> $1 LIMIT 10` com `WHERE category_id = $2`. Há 1 200 categorias; as maiores têm 8% dos produtos, a maioria menos de 0,1%. Não há erros nos logs.',
      minutos: 10,
      dica: 'Quantas linhas é que o índice devolve antes de o WHERE ser aplicado?',
      resposta: [
        {
          type: 'p',
          text: 'É **pós-filtro num índice aproximado**: o HNSW devolve os ~40 vizinhos mais próximos (o ef_search por omissão) e só depois o Postgres aplica o `WHERE category_id`. Numa categoria com 8% dos produtos sobram ~3 desses 40; numa com 0,1% sobra quase sempre zero. O índice não sabe que há um filtro.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Confirmar o padrão', text: 'Cruzo o número de resultados devolvidos com a fracção de produtos da categoria: se a queda acompanha a selectividade e não o tipo de consulta, a hipótese está quase confirmada.' },
            { title: 'Ver o plano', text: '`EXPLAIN (ANALYZE, BUFFERS)` da consulta: um Index Scan sobre o HNSW com Filter e «Rows Removed by Filter» perto de 40 confirma o pós-filtro. Se o planeador escolher o B-tree da categoria e ordenar, o recall é perfeito — é sinal de que o problema é só nas categorias onde escolhe o HNSW.' },
            { title: 'Medir', text: 'Para 200 consultas por faixa de selectividade, comparo o top-10 com o resultado exacto (desligando o índice na sessão) e calculo recall@10 e a fracção de consultas com menos de 10 resultados.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcções, por ordem de custo. Primeiro, actualizar para **pgvector 0.8.0 ou superior** e activar os iterative index scans (`SET hnsw.iterative_scan = relaxed_order`): o índice continua a procurar até preencher o LIMIT ou atingir `hnsw.max_scan_tuples` (20 000 por omissão). Com `relaxed_order` a ordem pode sair ligeiramente trocada, por isso envolvo a consulta numa CTE materializada e reordeno pela distância. Segundo, para categorias minúsculas, o caminho certo é o B-tree em `category_id` com distância exacta sobre poucos milhares de produtos — se o planeador não o escolher, actualizo estatísticas ou encaminho explicitamente por tamanho de categoria. Terceiro, se meia dúzia de categorias grandes concentrarem o tráfego, índices parciais por categoria ou particionamento.',
        },
        {
          type: 'p',
          text: 'Subir o ef_search sozinho ajuda nas categorias de 8% (com 400 sobram ~32), mas não resolve as de 0,1% e paga latência em todas as consultas. Não é a correcção certa, é um paliativo.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'O conjunto de avaliação de pesquisa passa a ter fatias por selectividade do filtro, com verdade de referência exacta; a métrica «consultas com menos de k resultados» vai para o dashboard com alarme; e qualquer novo filtro só entra com essa avaliação feita.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — iterative index scans', url: 'https://github.com/pgvector/pgvector#iterative-index-scans' },
            { label: 'PostgreSQL — usar EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html' },
            { label: 'PostgreSQL — índices parciais', url: 'https://www.postgresql.org/docs/current/indexes-partial.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica o pós-filtro como causa e faz a conta com ef_search e a selectividade.',
          'Confirma com EXPLAIN ANALYZE e com recall contra pesquisa exacta por faixa de selectividade.',
          'Propõe iterative index scans (pgvector 0.8.0+) e nota o cuidado com relaxed_order.',
          'Propõe pesquisa exacta com B-tree para categorias pequenas e índices parciais ou partições para as grandes.',
          'Explica porque subir ef_search é só um paliativo.',
        ],
        fraco: 'Sobe o ef_search para 1 000 ou culpa o modelo de embeddings.',
        solido: 'Diagnostica o pós-filtro, confirma com EXPLAIN e activa os iterative scans.',
        excelente: 'Escolhe a correcção por faixa de selectividade (exacto para as pequenas, iterative scan para as médias, partições para as quentes) e institui métrica e avaliação por fatia.',
      },
      seguimento: [
        'Como fazias isto em Qdrant?',
        'O que acontece com dois filtros combinados, categoria e preço?',
        'Como escolhias hnsw.max_scan_tuples?',
      ],
      sinaisAlarme: [
        'Assumir que o WHERE é aplicado dentro da travessia do índice.',
        'Não medir contra o resultado exacto.',
        'Aumentar o ef_search sem quantificar a latência.',
      ],
      modulos: ['bases-vectoriais', 'pesquisa-hibrida'],
    },
  ],
};
