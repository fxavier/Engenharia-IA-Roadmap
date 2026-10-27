import type { TopicoEntrevista } from '../../types';

const CODIGO_TOPK = `import numpy as np


def top_k_cosseno(
    consultas: np.ndarray, docs: np.ndarray, k: int, eps: float = 1e-12
) -> tuple[np.ndarray, np.ndarray]:
    """Top-k por cosseno. consultas (q, d) ou (d,), docs (n, d).

    Devolve (indices, scores), ambos (q, min(k, n)), por score decrescente.
    Vectores nulos ficam com score -inf (nunca passam à frente de um real).
    """
    Q = np.atleast_2d(np.asarray(consultas, dtype=np.float32))
    D = np.asarray(docs, dtype=np.float32)
    if D.ndim != 2 or Q.shape[1] != D.shape[1]:
        raise ValueError(f"dimensões incompatíveis: {Q.shape} vs {D.shape}")
    if k <= 0 or D.shape[0] == 0:
        vazio = np.empty((Q.shape[0], 0))
        return vazio.astype(np.int64), vazio.astype(np.float32)
    k = min(k, D.shape[0])

    nq = np.linalg.norm(Q, axis=1, keepdims=True)
    nd = np.linalg.norm(D, axis=1, keepdims=True)
    Qn = np.divide(Q, nq, out=np.zeros_like(Q), where=nq > eps)
    Dn = np.divide(D, nd, out=np.zeros_like(D), where=nd > eps)

    S = Qn @ Dn.T                                   # (q, n): um único GEMM
    S[:, (nd[:, 0] <= eps)] = -np.inf               # documentos nulos
    S[(nq[:, 0] <= eps), :] = -np.inf               # consultas nulas

    # argpartition é O(n) por linha; só ordenamos os k candidatos
    part = np.argpartition(-S, k - 1, axis=1)[:, :k]
    ps = np.take_along_axis(S, part, axis=1)
    ordem = np.argsort(-ps, axis=1, kind="stable")
    idx = np.take_along_axis(part, ordem, axis=1)
    return idx, np.take_along_axis(S, idx, axis=1)


docs = np.array([
    [1.0, 0.0, 0.0],   # 0
    [0.0, 1.0, 0.0],   # 1
    [1.0, 1.0, 0.0],   # 2
    [0.0, 0.0, 0.0],   # 3: vector nulo (ex.: chunk vazio)
    [10.0, 0.0, 1.0],  # 4: quase a direcção de 0, norma muito maior
])
idx, sc = top_k_cosseno(np.array([2.0, 0.0, 0.0]), docs, k=3)
print(idx.tolist(), np.round(sc.astype(float), 4).tolist())
# [[0, 4, 2]] [[1.0, 0.995, 0.7071]]

idx, sc = top_k_cosseno(docs[[1, 3]], docs, k=10)   # k > n, consulta nula
print(idx.shape, idx[0].tolist(), np.round(sc[0].astype(float), 4).tolist())
# (2, 5) [1, 2, 0, 4, 3] [1.0, 0.7071, 0.0, 0.0, -inf]
print(sc[1].tolist()[:2])
# [-inf, -inf]
print(top_k_cosseno(np.ones(3), docs, k=0)[0].shape)
# (1, 0)`;

export const topico: TopicoEntrevista = {
  id: 'embeddings',
  numero: 9,
  bloco: 'rag',
  titulo: 'Embeddings e similaridade',
  resumo:
    'Como um modelo de embeddings é treinado, que similaridade usar, dimensões e Matryoshka, assimetria pergunta/documento, bi- vs cross-encoder, português e domínios difíceis, e como versionar e reindexar sem parar o serviço. É a base de qualquer pergunta de RAG.',
  icon: '🧭',
  modulos: ['embeddings', 'bases-vectoriais', 'pesquisa-hibrida'],
  essencial: [
    'Um embedding de texto é um vector de dimensão fixa produzido por um encoder treinado para que textos com o mesmo significado fiquem próximos; não guarda o texto, guarda uma projecção dele.',
    'Treino contrastivo (InfoNCE): aproxima o par (pergunta, passagem positiva) e afasta negativos; os outros exemplos do batch servem de negativos e os negativos difíceis vêm do BM25 ou de um modelo anterior.',
    'Com vectores normalizados, cosseno = produto interno e L2² = 2 − 2·cos: as três dão o mesmo ranking. Sem normalizar, o produto interno favorece vectores de norma grande.',
    'Memória bruta: N × D × 4 bytes em float32. 10M chunks de 1024 dimensões são ~41 GB antes do índice.',
    'Matryoshka: o modelo é treinado para que os primeiros 64/128/256 componentes já sejam úteis; truncas e voltas a normalizar.',
    'Modelos assimétricos (E5, nomic) exigem prefixos diferentes para pergunta e documento; esquecer o prefixo degrada a recuperação sem dar erro.',
    'Bi-encoder: embebe pergunta e documento separadamente, pré-calcula o corpus, escala. Cross-encoder: lê o par junto, é mais preciso, só serve para re-rankear dezenas de candidatos.',
    'O cosseno absoluto não é uma probabilidade: modelos diferentes concentram scores em bandas diferentes, e um limiar fixo não se transfere entre modelos.',
    'Vectores de modelos diferentes vivem em espaços diferentes, mesmo com a mesma dimensão: nunca se misturam no mesmo índice. Guarda o modelo e a versão com cada vector.',
    'Siglas, códigos e nomes próprios são o ponto fraco do denso: começa por pesquisa híbrida antes de pensar em fine-tuning.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-embeddings-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que é um embedding de texto e como se treina',
      enunciado:
        'Explica-me o que é um embedding de texto e como é que um modelo destes é treinado. Porque é que «pergunta» e «resposta» acabam perto uma da outra?',
      minutos: 5,
      dica: 'O modelo não aprende «significado» em abstracto: aprende a partir de pares e de uma função de perda. Que pares, e o que faz a perda?',
      resposta: [
        {
          type: 'p',
          text: 'Um embedding é um vector de dimensão fixa — tipicamente centenas a poucos milhares de componentes — que um encoder produz a partir de um texto. O modelo é treinado de forma **contrastiva**: aproxima pares que deviam corresponder (pergunta e passagem que a responde) e afasta os que não deviam. A proximidade é aprendida, não definida à mão.',
        },
        {
          type: 'p',
          text: 'O mecanismo: um transformer do tipo encoder lê o texto, e o vector final sai de um pooling (média dos estados dos tokens ou o token especial inicial). A perda mais comum é a InfoNCE: para cada pergunta, calcula a similaridade com a passagem positiva e com N negativos, divide por uma temperatura baixa e aplica softmax; a perda é a entropia cruzada de acertar no positivo. Os negativos baratos são os **in-batch negatives** — as passagens positivas das outras perguntas do mesmo batch — e por isso batches grandes ajudam.',
        },
        {
          type: 'p',
          text: 'Os negativos aleatórios são fáceis demais; o modelo aprende pouco com eles. Os **negativos difíceis** são passagens parecidas mas erradas — tiradas do top do BM25 ou de uma versão anterior do modelo — e são o que ensina a distinguir «prazo de reembolso» de «prazo de entrega». O risco é o falso negativo: uma passagem que também responde e que foi marcada como negativa; os pipelines sérios filtram-nos com um cross-encoder ou um limiar.',
        },
        {
          type: 'p',
          text: 'Os modelos públicos fortes fazem isto em duas fases: pré-treino contrastivo com centenas de milhões de pares fracos (título e corpo, pergunta e resposta de fóruns) e depois afinação com dados anotados e negativos difíceis. É por isso que funcionam bem em texto geral e pior em vocabulário que nunca viram.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Próximo não é verdadeiro',
          text: 'O modelo aprende «isto costuma responder àquilo», não «isto é correcto». Duas versões contraditórias da mesma política ficam coladas no espaço vectorial. A frescura e a autoridade da fonte resolvem-se com metadados, não com o embedding.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Oord, Li e Vinyals (2018) — Representation Learning with Contrastive Predictive Coding (InfoNCE)', url: 'https://arxiv.org/abs/1807.03748' },
            { label: 'Karpukhin et al. (2020) — Dense Passage Retrieval', url: 'https://arxiv.org/abs/2004.04906' },
            { label: 'Sentence Transformers — visão geral do treino', url: 'https://sbert.net/docs/sentence_transformer/training_overview.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define embedding como vector de dimensão fixa produzido por um encoder com pooling.',
          'Explica a perda contrastiva: aproximar o positivo, afastar negativos, com softmax e temperatura.',
          'Distingue in-batch negatives de negativos difíceis e diz de onde vêm os difíceis.',
          'Menciona o problema dos falsos negativos ou o efeito do tamanho do batch.',
        ],
        fraco: '«É uma representação numérica do significado» sem dizer como se aprende nem com que dados.',
        solido: 'Descreve o encoder com pooling, a perda contrastiva com in-batch negatives e o papel dos negativos difíceis.',
        excelente: 'Acrescenta as duas fases de treino, o risco de falsos negativos e liga isso ao comportamento em produção: bom em texto geral, fraco em vocabulário de domínio, cego à veracidade.',
      },
      seguimento: [
        'Porque é que aumentar o batch melhora este tipo de treino?',
        'Como minerarias negativos difíceis a partir dos logs do teu produto?',
        'O que muda se usares média dos tokens em vez do token inicial como pooling?',
      ],
      sinaisAlarme: [
        'Dizer que o modelo «compreende» o texto ou «sabe» o que é relevante.',
        'Confundir o embedding de um LLM generativo com o de um modelo treinado para recuperação.',
        'Não saber de onde vêm os negativos.',
      ],
      modulos: ['embeddings'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-embeddings-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Cosseno, produto interno ou L2 — e porque normalizar',
      enunciado:
        'A tua base vectorial pede-te uma métrica: cosseno, produto interno ou distância euclidiana. Qual escolhes, e faz diferença?',
      minutos: 4,
      dica: 'Escreve a distância L2 ao quadrado entre dois vectores de norma 1.',
      resposta: [
        {
          type: 'p',
          text: 'Escolho a métrica com que o modelo foi treinado, e quase sempre normalizo os vectores. **Com vectores de norma 1, as três dão exactamente o mesmo ranking**, e então uso o produto interno porque é o mais barato.',
        },
        {
          type: 'p',
          text: 'A conta: cos(a, b) = a·b / (‖a‖‖b‖). Se ‖a‖ = ‖b‖ = 1, o cosseno é o produto interno. E ‖a − b‖² = ‖a‖² + ‖b‖² − 2a·b = 2 − 2·cos(a, b), uma função monótona decrescente do cosseno — ordenar por menor L2 é ordenar por maior cosseno.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Sensível à norma', 'Quando usar'],
          rows: [
            ['Cosseno', 'Não', 'Modelos treinados com cosseno; vectores não normalizados à entrada'],
            ['Produto interno', 'Sim', 'Vectores já normalizados (equivale ao cosseno e poupa a divisão) ou modelos treinados para dot product'],
            ['L2', 'Sim', 'Índices que só suportam L2; com vectores normalizados dá o mesmo ranking'],
          ],
        },
        {
          type: 'p',
          text: 'Onde não é igual: sem normalizar, o produto interno dá vantagem a vectores de norma grande. Há modelos treinados assim de propósito — a documentação do Sentence Transformers nota que os afinados para dot product tendem a preferir passagens mais longas e os de cosseno as mais curtas. Se o modelo foi treinado para dot product, normalizar muda-lhe o comportamento; verifico no cartão do modelo e meço no conjunto avaliado.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Normalizar só de um lado',
          text: 'Normalizar os documentos na ingestão e esquecer a consulta (ou o contrário) com produto interno não muda o ranking de uma consulta, mas muda os scores — e qualquer limiar absoluto deixa de fazer sentido. O sítio certo é uma única função de embedding partilhada pelos dois caminhos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Sentence Transformers — documentação', url: 'https://sbert.net/' },
            { label: 'pgvector — operadores de distância', url: 'https://github.com/pgvector/pgvector' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que com vectores normalizados as três métricas dão o mesmo ranking.',
          'Escreve ou deriva ‖a − b‖² = 2 − 2·cos para vectores unitários.',
          'Explica que sem normalização o produto interno favorece normas grandes.',
          'Liga a escolha à forma como o modelo foi treinado.',
        ],
        fraco: '«Uso cosseno porque é o standard», sem relação entre as métricas.',
        solido: 'Mostra a equivalência para vectores normalizados e escolhe produto interno por custo.',
        excelente: 'Acrescenta o caso dos modelos treinados para dot product, o efeito nos limiares absolutos e garante uma única função de embedding para ingestão e consulta.',
      },
      seguimento: [
        'No pgvector, porque é que o operador de produto interno devolve um valor negativo?',
        'Normalizar antes ou depois de truncar dimensões?',
        'O que acontece a um limiar de 0,8 se trocares de modelo?',
      ],
      sinaisAlarme: [
        'Achar que L2 e cosseno dão resultados «muito diferentes» com vectores normalizados.',
        'Escolher a métrica sem olhar para o modelo.',
      ],
      modulos: ['embeddings', 'bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-embeddings-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Dimensões, Matryoshka e truncar vectores',
      enunciado:
        'O teu modelo dá vectores de 1536 dimensões e a factura de memória do índice está alta. Alguém sugere cortar para 256. Isso funciona? Em que condições?',
      minutos: 5,
      dica: 'Depende de como o modelo foi treinado. O que é que a Matryoshka Representation Learning garante sobre os primeiros componentes?',
      resposta: [
        {
          type: 'p',
          text: 'Só funciona bem se o modelo foi treinado com **Matryoshka Representation Learning** — nesse caso os primeiros componentes já formam um embedding útil e posso truncar e renormalizar. Num modelo normal, cortar componentes é deitar fora informação distribuída por todo o vector, e a qualidade cai sem controlo.',
        },
        {
          type: 'p',
          text: 'Na MRL, a perda é somada sobre vários prefixos do vector (por exemplo 64, 128, 256, 512, até ao total), por isso o modelo aprende a pôr a informação mais importante no início. Truncar a 256 é tirar os primeiros 256 valores e **voltar a normalizar** — sem isto, o cosseno ainda funciona, mas o produto interno não. Alguns fornecedores expõem isto como parâmetro de dimensão na API; nos modelos abertos, o cartão do modelo diz se foi treinado assim.',
        },
        {
          type: 'p',
          text: 'Os números que interessam: memória bruta é N × D × 4 bytes. Para 10 milhões de chunks, 1536 dimensões são ~61 GB e 256 são ~10 GB — 6× menos, e a pesquisa também fica mais rápida porque cada distância custa proporcionalmente menos. O custo é uma perda de qualidade que **tem de ser medida no meu conjunto**: o recall@10 a 256 vs a 1536, por fatia de consulta.',
        },
        {
          type: 'p',
          text: 'Um padrão que funciona bem é o funil: pesquisa ANN com 256 dimensões para tirar 100–200 candidatos, e re-scoring desses candidatos com o vector completo guardado em disco. Fica a memória do pequeno e quase a qualidade do grande.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Truncar é uma reindexação',
          text: 'Mudar de 1536 para 256 obriga a reconstruir o índice e a embeber as consultas da mesma forma. Trato como mudança de versão: novo índice, avaliação, troca atómica.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kusupati et al. (2022) — Matryoshka Representation Learning', url: 'https://arxiv.org/abs/2205.13147' },
            { label: 'nomic-embed-text-v1.5 (modelo com Matryoshka)', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que truncar só é seguro em modelos treinados com Matryoshka.',
          'Explica o mecanismo: perda somada sobre vários prefixos.',
          'Menciona renormalizar depois de truncar.',
          'Faz a conta de memória N × D × 4 e o ganho relativo.',
          'Propõe medir a perda e/ou o funil com re-scoring no vector completo.',
        ],
        fraco: '«Sim, menos dimensões é mais rápido» sem condição sobre o treino do modelo.',
        solido: 'Explica Matryoshka, renormalização e a conta de memória.',
        excelente: 'Propõe o funil truncado + re-scoring, mede por fatia de consulta e trata a mudança como uma nova versão do índice.',
      },
      seguimento: [
        'Como compararias truncar com quantização escalar para poupar a mesma memória?',
        'Usarias PCA num modelo que não é Matryoshka?',
        'Quantos candidatos passavas ao re-scoring?',
      ],
      sinaisAlarme: [
        'Truncar um modelo qualquer e assumir que a qualidade se mantém.',
        'Esquecer que as consultas também têm de ser truncadas da mesma forma.',
      ],
      modulos: ['embeddings', 'bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-embeddings-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Assimetria pergunta/documento e prefixos de instrução',
      enunciado:
        'Estás a usar um modelo da família E5 e o recall está abaixo do que o leaderboard sugere. Um colega diz que «faltam os prefixos». O que são e porque importam?',
      minutos: 4,
      dica: 'Uma pergunta de 8 palavras e um parágrafo de 300 tokens não são o mesmo tipo de texto.',
      resposta: [
        {
          type: 'p',
          text: 'Muitos modelos de recuperação são **assimétricos**: foram treinados com um marcador diferente para a pergunta e para o documento — no E5, `query: ` e `passage: `; no nomic-embed, `search_query: ` e `search_document: `. Se embebo sem os prefixos, ou com o mesmo nos dois lados, estou a usar o modelo fora da distribuição de treino e o recall cai sem qualquer erro.',
        },
        {
          type: 'p',
          text: 'A razão é que pergunta e resposta são textos de natureza diferente: curta, interrogativa, com vocabulário do utilizador contra longa, declarativa, com vocabulário do autor. O prefixo diz ao encoder em que papel está o texto, e o treino contrastivo aprende a projectar os dois papéis para que se encontrem. Os modelos com instruções vão mais longe: a consulta leva uma descrição da tarefa («dada uma pergunta de cliente, recupera a política que a responde») e a instrução passa a ser um parâmetro a afinar.',
        },
        {
          type: 'p',
          text: 'Para tarefas simétricas — deduplicar tickets, agrupar perguntas parecidas — usa-se o mesmo prefixo dos dois lados (no E5, `query: ` em ambos). Escolher o prefixo é escolher a tarefa.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Onde isto parte em produção',
          text: 'O prefixo vive em dois sítios — o job de ingestão e o serviço de consulta — e um deles muda sem o outro. Ponho o modelo, o prefixo de cada papel e a normalização num único módulo versionado, e um teste que embebe um par conhecido e verifica o cosseno esperado.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Wang et al. (2022) — Text Embeddings by Weakly-Supervised Contrastive Pre-training (E5)', url: 'https://arxiv.org/abs/2212.03533' },
            { label: 'nomic-embed-text-v1.5 — prefixos de tarefa', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que o modelo foi treinado com marcadores diferentes para pergunta e documento.',
          'Dá exemplos concretos de prefixos de pelo menos um modelo.',
          'Diz que o erro é silencioso: não falha, só baixa o recall.',
          'Distingue tarefas assimétricas (pesquisa) de simétricas (deduplicação).',
        ],
        fraco: 'Não sabe o que são prefixos ou acha que são «prompt engineering» opcional.',
        solido: 'Explica a assimetria, dá os prefixos do E5 e o efeito de os esquecer.',
        excelente: 'Acrescenta modelos com instruções como parâmetro afinável, o caso simétrico e o controlo em produção: um módulo único e um teste de regressão sobre um par conhecido.',
      },
      seguimento: [
        'Como medirias o impacto de mudar a instrução da consulta?',
        'Se já indexaste 5 milhões de documentos sem prefixo, o que fazes?',
        'E para clustering de tickets, que prefixo usas?',
      ],
      sinaisAlarme: [
        'Concluir que o modelo é mau sem ler o cartão do modelo.',
        'Corrigir o prefixo só no caminho da consulta e não reindexar.',
      ],
      modulos: ['embeddings'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-embeddings-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Bi-encoder ou cross-encoder',
      enunciado:
        'Qual é a diferença entre um bi-encoder e um cross-encoder, e porque é que não usas só o mais preciso para tudo?',
      minutos: 6,
      dica: 'Conta quantas passagens pelo modelo precisas por consulta em cada caso, com um corpus de 2 milhões de chunks.',
      resposta: [
        {
          type: 'p',
          text: 'O bi-encoder embebe pergunta e documento **separadamente**, e a relevância é uma distância entre vectores — o corpus pode ser embebido uma vez e indexado. O cross-encoder lê **o par junto** e devolve um score; é mais preciso porque a atenção cruza os tokens da pergunta com os do documento, mas não há nada a pré-calcular. Por isso combino: bi-encoder para recuperar, cross-encoder para re-rankear poucos candidatos.',
        },
        {
          type: 'p',
          text: 'A conta que decide: com 2 milhões de chunks, o bi-encoder faz uma passagem pelo modelo por consulta (a da pergunta) e depois uma pesquisa ANN de milissegundos. Um cross-encoder sobre o corpus inteiro seriam 2 milhões de passagens por consulta — impossível. Sobre 50 candidatos são 50 pares num batch, o que num GPU ou num modelo pequeno em CPU custa tipicamente dezenas a poucas centenas de milissegundos, e tenho de medir no meu hardware.',
        },
        {
          type: 'compare',
          left: {
            title: 'Bi-encoder',
            items: [
              'Corpus pré-calculado; custo por consulta constante',
              'Escala para milhões ou milhares de milhões com ANN',
              'Perde nuances: negações, comparações, qual das duas condições se aplica',
              'Scores comparáveis entre consultas só de forma aproximada',
            ],
          },
          right: {
            title: 'Cross-encoder',
            items: [
              'Custo linear no número de candidatos, a cada consulta',
              'Melhor precisão no topo, que é o que entra no contexto',
              'Não substitui a recuperação: só re-ordena o que lhe dás',
              'Mais um modelo para servir, versionar e monitorizar',
            ],
          },
        },
        {
          type: 'p',
          text: 'Os pontos de decisão são o número de candidatos e o orçamento de latência. Se o p95 total do assistente é 3 s e a geração leva 2 s, tenho espaço para ~100–200 ms de re-ranking. Escolho o k de candidatos com uma curva: recall@k do bi-encoder sobe com k, a latência do cross-encoder também; paro onde o recall@50 já quase não sobe. Também vale a pena saber quando **não** pôr re-ranker: se o contexto leva 20 chunks e o recall@20 já é alto, a ordem dentro do contexto importa pouco e pago latência por nada.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Variantes intermédias',
          text: 'Os modelos de interacção tardia (estilo ColBERT) guardam um vector por token e calculam um MaxSim — mais precisos que o bi-encoder, mais baratos que o cross-encoder, mas com índice muitas vezes maior. Menciono-os como opção, não como omissão.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Reimers e Gurevych (2019) — Sentence-BERT', url: 'https://arxiv.org/abs/1908.10084' },
            { label: 'Sentence Transformers — pesquisa e re-ranking', url: 'https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica a diferença arquitectural: codificação separada vs codificação do par.',
          'Faz a conta do custo por consulta para o corpus inteiro vs para k candidatos.',
          'Propõe a combinação recuperar com bi-encoder e re-rankear com cross-encoder.',
          'Liga o k de candidatos a uma curva de recall e a um orçamento de latência.',
          'Diz quando o re-ranker não compensa.',
        ],
        fraco: '«O cross-encoder é melhor, mas mais lento», sem custo por consulta nem arquitectura.',
        solido: 'Explica as duas arquitecturas, a combinação em funil e o custo linear do cross-encoder.',
        excelente: 'Escolhe o k pela curva de recall e pelo orçamento de p95, diz quando não usar re-ranker e menciona a interacção tardia como meio-termo com o seu custo de índice.',
      },
      seguimento: [
        'Como verificas que o re-ranker melhorou alguma coisa?',
        'O re-ranker pode piorar o resultado? Em que casos?',
        'Destilarias o cross-encoder para o bi-encoder? Como?',
      ],
      sinaisAlarme: [
        'Propor cross-encoder sobre o corpus inteiro.',
        'Adicionar re-ranker sem métrica antes e depois.',
      ],
      modulos: ['embeddings', 'pesquisa-hibrida'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-embeddings-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Embeddings para português e para várias línguas',
      enunciado:
        'Vais construir pesquisa para uma seguradora com clientes em Portugal e em Moçambique; a documentação interna está metade em português e metade em inglês. Como escolhes o modelo de embeddings?',
      minutos: 7,
      dica: 'O leaderboard geral responde a uma pergunta diferente da tua. Que avaliação precisas, e com que fatias?',
      resposta: [
        {
          type: 'p',
          text: 'Escolho entre modelos **multilingues** treinados para recuperação, e decido com um conjunto avaliado meu, em português de Portugal e de Moçambique, com consultas em português sobre documentos em inglês. O leaderboard serve para fazer a lista curta, não para decidir.',
        },
        {
          type: 'p',
          text: 'Os modelos multilingues (por exemplo a família multilingual-E5 ou o BGE-M3) alinham várias línguas no mesmo espaço, o que me dá recuperação cross-lingual: a pergunta «qual é o prazo para participar um sinistro» encontra a passagem em inglês sobre *claim notification*. Um modelo só de inglês não faz isto, e um modelo «português» treinado sobretudo com pt-BR pode tropeçar em vocabulário europeu ou moçambicano («apólice», «franquia», «talão», nomes de bairros e de instituições locais).',
        },
        {
          type: 'table',
          head: ['Critério', 'O que verifico', 'Porquê'],
          rows: [
            ['Recall por fatia', 'recall@10 em pt-PT, pt-MZ, pt→en', 'A média esconde a fatia onde o modelo falha'],
            ['Tokens máximos', 'Muitos encoders BERT truncam a 512 tokens', 'Chunks maiores são cortados em silêncio'],
            ['Custo de tokenização', 'Tokens por chunk em português', 'Tokenizadores centrados no inglês partem mais as palavras portuguesas, logo mais custo e mais truncagem'],
            ['Dimensão e licença', 'D, Matryoshka, licença comercial, hospedável', 'Memória do índice e residência de dados'],
          ],
        },
        {
          type: 'p',
          text: 'O trade-off central é **um modelo multilingue para tudo** contra **traduzir para uma língua pivô**. Traduzir as consultas para inglês acrescenta latência, custo e erros de tradução em termos de domínio; um modelo multilingue costuma perder um pouco face a um monolingue na língua dele, mas simplifica tudo. Se 90% do tráfego e dos documentos fosse português, testava também a opção de traduzir os documentos ingleses uma vez na ingestão.',
        },
        {
          type: 'p',
          text: 'O conjunto avaliado: 200 a 300 consultas reais (anonimizadas) por fatia, com a passagem relevante anotada, e uma fatia de termos locais. Com isso, comparo dois ou três candidatos em recall@10 e MRR, com intervalo de confiança, e escolho também pelo custo de servir.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Dados que saem do país',
          text: 'Uma API de embeddings envia o texto dos documentos e das consultas para fora. Com dados de clientes de seguros, a residência de dados e o contrato de tratamento podem decidir antes da qualidade — um modelo aberto hospedado na região certa pode ser a única opção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Wang et al. (2024) — Multilingual E5 Text Embeddings', url: 'https://arxiv.org/abs/2402.05672' },
            { label: 'Chen et al. (2024) — M3-Embedding (BGE-M3)', url: 'https://arxiv.org/abs/2402.03216' },
            { label: 'MTEB leaderboard', url: 'https://huggingface.co/spaces/mteb/leaderboard' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe modelos multilingues de recuperação e explica a recuperação cross-lingual.',
          'Propõe um conjunto avaliado próprio com fatias por variante de português e por língua.',
          'Menciona o limite de tokens e o custo de tokenização em português.',
          'Compara modelo multilingue com tradução para língua pivô.',
          'Considera residência de dados ou licença como restrição.',
        ],
        fraco: '«Uso o primeiro do leaderboard» ou um modelo só de inglês.',
        solido: 'Escolhe multilingue, avalia com dados próprios por fatia e nota a truncagem a 512 tokens.',
        excelente: 'Pesa multilingue contra tradução com custos, cria uma fatia de vocabulário local, decide com intervalos de confiança e põe a residência de dados como restrição dura.',
      },
      seguimento: [
        'Como construías as 300 consultas sem ter tráfego ainda?',
        'E se o melhor modelo for 3× mais caro de servir?',
        'O que fazias com documentos que misturam as duas línguas no mesmo parágrafo?',
      ],
      sinaisAlarme: [
        'Tratar pt-BR e pt-PT como indistintos sem verificar.',
        'Decidir pela média geral do MTEB.',
        'Ignorar para onde vão os dados.',
      ],
      modulos: ['embeddings', 'avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-embeddings-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Siglas, códigos e domínio: híbrido, glossário ou fine-tuning',
      enunciado:
        'Num ERP para empresas moçambicanas, as consultas estão cheias de siglas e códigos — «NUIT», «IRPS», «erro E-4012», referências de artigos. O denso falha nessas consultas. Afinavas o modelo de embeddings?',
      minutos: 8,
      dica: 'Ordena as opções por custo e por quanto tempo prendem a equipa. O fine-tuning tem um custo que aparece depois.',
      resposta: [
        {
          type: 'p',
          text: 'Não começava por aí. Primeiro **pesquisa híbrida** (BM25 mais denso), que resolve a maior parte dos códigos e identificadores exactos quase sem custo; depois expansão com glossário para as siglas; e só afinava o modelo se, medido por fatia, ainda houvesse uma falha semântica grande e dados para treinar.',
        },
        {
          type: 'p',
          text: 'Porque é que o denso falha aqui: «E-4012» é partido em vários sub-tokens sem significado, e o modelo nunca viu «NUIT» ligado a «número de identificação tributária». O vector resultante fica perto de textos com formas parecidas, não com o mesmo código. O BM25 faz o contrário: correspondência exacta de termos, que é o que um código pede.',
        },
        {
          type: 'table',
          head: ['Opção', 'Custo', 'Resolve', 'Custo escondido'],
          rows: [
            ['Híbrido + RRF', 'Dias', 'Códigos, identificadores, nomes próprios', 'Mais um índice e afinar o tokenizador do BM25 para não partir «E-4012»'],
            ['Glossário / expansão de siglas', 'Dias a semanas', 'Siglas com expansão conhecida', 'Manter o glossário; siglas ambíguas'],
            ['Fine-tuning do encoder', 'Semanas', 'Paráfrases e jargão do domínio', 'Reindexar tudo a cada versão, pipeline de treino, risco de esquecer o geral'],
          ],
        },
        {
          type: 'p',
          text: 'Se afinar: preciso de alguns milhares de pares (consulta, passagem certa) — os logs dão-mos via cliques ou tickets resolvidos — e de negativos difíceis minerados com o modelo actual, filtrando falsos negativos. Treino com uma perda contrastiva (no Sentence Transformers, a MultipleNegativesRankingLoss), avalio num conjunto separado **por fatia** e verifico que não piorei as consultas gerais. Depois vem a factura: cada nova versão do modelo obriga a reembeber o corpus inteiro e a operar dois índices durante a troca.',
        },
        {
          type: 'p',
          text: 'Uma opção mais barata do que afinar o encoder é afinar o **re-ranker** com os mesmos pares: não obriga a reindexar, porque o cross-encoder só vê os candidatos.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O sinal de staff',
          text: 'O que separa é a ordem: medir por fatia, aplicar a correcção mais barata que fecha a falha, e só aceitar um custo operacional permanente (um modelo próprio) quando o ganho medido o paga.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Sentence Transformers — treino e funções de perda', url: 'https://sbert.net/docs/sentence_transformer/training_overview.html' },
            { label: 'Thakur et al. (2021) — BEIR: generalização zero-shot de retrievers', url: 'https://arxiv.org/abs/2104.08663' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica porque é que o denso falha em códigos e siglas (tokenização, vocabulário não visto).',
          'Propõe pesquisa híbrida como primeira correcção.',
          'Compara pelo menos três opções com custo e custo escondido.',
          'Se propõe fine-tuning, diz de onde vêm os pares e os negativos e como avalia por fatia.',
          'Menciona que afinar o encoder obriga a reindexar, e o re-ranker não.',
        ],
        fraco: '«Sim, faço fine-tuning» sem medir nem considerar o lexical.',
        solido: 'Começa por híbrido, depois glossário, e descreve um fine-tuning contrastivo com pares dos logs.',
        excelente: 'Ordena pelo custo total incluindo operação, propõe afinar o re-ranker para evitar reindexação, e define a fatia e o ganho mínimo que justificam um modelo próprio.',
      },
      seguimento: [
        'Como evitas que o fine-tuning piore as consultas gerais?',
        'Que tokenizador usavas no BM25 para códigos com hífen?',
        'Quantos pares achas que precisas e como validas esse número?',
      ],
      sinaisAlarme: [
        'Saltar directamente para fine-tuning.',
        'Esquecer o custo de reindexar a cada versão do modelo.',
        'Avaliar só na média global.',
      ],
      modulos: ['embeddings', 'pesquisa-hibrida'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-embeddings-08',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Trocar de modelo de embeddings sem downtime',
      enunciado:
        'Queres mudar de modelo de embeddings num sistema em produção. Desenha a migração: como versionas, quanto custa reembeber o corpus e como trocas sem parar o serviço nem misturar vectores.',
      contexto:
        'Banco móvel com assistente de suporte. 20 milhões de chunks (~300 tokens cada), 50 mil novos por dia, índice em Postgres com pgvector (HNSW). Modelo actual com 768 dimensões; o novo tem 1024 e é aberto, para servir em GPU própria. SLO de pesquisa p95 < 150 ms; janela de migração desejada: menos de uma semana.',
      minutos: 18,
      dica: 'Os dois espaços vectoriais nunca se podem encontrar numa mesma consulta. Onde é que isso pode acontecer sem dares por isso?',
      resposta: [
        {
          type: 'p',
          text: 'Trato o modelo de embeddings como um **esquema de dados versionado**: o novo modelo vive numa coluna e num índice novos, faço backfill em paralelo com escrita dupla para os chunks novos, avalio em sombra e troco o caminho de leitura de forma atómica por flag. Nenhuma consulta compara vectores de versões diferentes.',
        },
        {
          type: 'h',
          text: 'Estimativas',
        },
        {
          type: 'list',
          items: [
            'Tokens a reembeber: 20M × 300 = 6 mil milhões de tokens.',
            'Armazenamento novo: 20M × 1024 × 4 B ≈ 82 GB em float32 (≈ 41 GB em halfvec), mais o índice HNSW; o antigo (≈ 61 GB) fica até ao fim.',
            'Throughput necessário: para fazer o backfill em 3 dias, 20M / 259 200 s ≈ 77 chunks/s sustentados, mais os 50 mil por dia, que são residuais.',
            'GPU: meço o throughput real do modelo com batches de 64–256 e sequências de ~300 tokens; o número de GPUs é 77 chunks/s a dividir pelo medido, com margem de 2×.',
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Contrato de versão', text: 'Cada vector leva `embedding_version` (modelo, revisão, prefixos, dimensão, normalização). A função de embedding é uma biblioteca única com a versão fixa, usada pela ingestão e pela consulta.' },
            { title: 'Coluna e índice novos', text: 'Coluna `embedding_v2 vector(1024)` (ou halfvec). O índice HNSW cria-se depois do backfill, com `CREATE INDEX CONCURRENTLY`, porque construir sobre dados completos é mais rápido e dá um grafo melhor do que inserir um a um.' },
            { title: 'Escrita dupla e backfill', text: 'Os chunks novos são embebidos nas duas versões. O backfill é um job idempotente por lotes de ids, com checkpoint, retries e rate limit, fora das horas de ponta para não roubar I/O ao Postgres.' },
            { title: 'Avaliação em sombra', text: 'Corro o conjunto dourado nas duas versões e, em sombra, uma amostra do tráfego real: comparo recall@10, MRR e a sobreposição dos top-10. Os limiares de score (se os houver) são recalibrados, porque a distribuição de cosseno muda com o modelo.' },
            { title: 'Troca e regresso', text: 'Uma feature flag muda o caminho de leitura para a v2, primeiro 5% do tráfego, depois 100%. O antigo continua a ser escrito durante uma ou duas semanas para permitir voltar atrás em minutos; só depois apago coluna e índice.' },
          ],
        },
        {
          type: 'p',
          text: 'Com Qdrant ou outra base dedicada o padrão é o mesmo com outra mecânica: uma colecção nova e um **alias** que aponta para a colecção activa, trocado atomicamente.',
        },
        {
          type: 'table',
          head: ['Opção', 'Vantagem', 'Risco'],
          rows: [
            ['Reescrever no sítio (UPDATE da coluna existente)', 'Nada a mais em disco', 'Durante dias o índice mistura versões; não há volta atrás'],
            ['Coluna nova na mesma tabela', 'Simples, uma só fonte', 'Inchaço da tabela e do VACUUM; I/O partilhado'],
            ['Tabela ou colecção nova + alias', 'Isolamento total e troca atómica', 'Duas cópias e escrita dupla a sincronizar'],
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'A cache que mistura versões',
          text: 'Uma cache de embeddings de consultas indexada só pelo texto devolve vectores v1 a um serviço que já consulta a v2. A chave de qualquer cache inclui a versão do modelo — o mesmo vale para caches semânticas de respostas.',
        },
        {
          type: 'p',
          text: 'O que deixava para depois: migrar para halfvec ou quantização binária, e automatizar a migração como pipeline reutilizável — se trocar de modelo de seis em seis meses, o custo de engenharia da segunda migração tem de ser perto de zero.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — tipos, índices e CREATE INDEX CONCURRENTLY', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — CREATE INDEX', url: 'https://www.postgresql.org/docs/current/sql-createindex.html' },
            { label: 'Qdrant — documentação (colecções e aliases)', url: 'https://qdrant.tech/documentation/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Guarda a versão do modelo com cada vector e usa uma única função de embedding partilhada.',
          'Estima tokens, armazenamento e throughput necessário com números.',
          'Usa coluna/colecção nova com escrita dupla e backfill idempotente, sem reescrever no sítio.',
          'Avalia em sombra e recalibra limiares antes da troca.',
          'Troca de forma atómica (flag ou alias) e mantém caminho de regresso.',
          'Identifica caches como fonte de mistura de versões.',
        ],
        fraco: 'Reembebe tudo no sítio com um script e troca o modelo da consulta no fim.',
        solido: 'Coluna ou colecção nova, backfill, escrita dupla, avaliação no dourado e troca por flag ou alias.',
        excelente: 'Faz as contas de tokens, armazenamento e GPUs, cria o índice após o backfill, recalibra limiares, inclui a versão nas chaves de cache e trata a migração como pipeline repetível.',
      },
      seguimento: [
        'Como verificas que o backfill não deixou chunks sem vector v2?',
        'Se o Postgres não aguentar o I/O do backfill e do índice, o que fazes?',
        'Usarias uma API de embeddings em lote em vez de GPU própria? O que pesa?',
      ],
      sinaisAlarme: [
        'Aceitar um período em que o índice tem vectores de dois modelos.',
        'Não ter plano de regresso.',
        'Não estimar quanto custa reembeber o corpus.',
      ],
      modulos: ['embeddings', 'bases-vectoriais', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-embeddings-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Top-k por cosseno em numpy, vectorizado e robusto',
      enunciado:
        'Escreve uma função que, dadas uma ou várias consultas e uma matriz de embeddings de documentos, devolve os índices e scores dos k mais próximos por cosseno. Sem ciclos em Python sobre os documentos.',
      contexto:
        'Assinatura: `top_k_cosseno(consultas: np.ndarray, docs: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]`. `consultas` é (q, d) ou (d,), `docs` é (n, d), n até ~1 milhão. Os vectores não vêm normalizados e podem existir vectores nulos (chunks vazios). k pode ser maior do que n.',
      minutos: 20,
      dica: 'Normaliza uma vez, um único produto de matrizes, e não ordenes as n colunas inteiras.',
      resposta: [
        {
          type: 'p',
          text: 'Normalizo consultas e documentos uma vez, calculo todas as similaridades com **um único produto de matrizes** (q × n) e uso `argpartition` para tirar os k melhores em O(n) por consulta, ordenando só esses k. Vectores nulos recebem −inf para nunca passarem à frente de um documento real.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Solução completa com exemplos e resultados verificados',
          code: CODIGO_TOPK,
        },
        {
          type: 'p',
          text: 'Complexidade: O(q·n·d) para o produto (feito pelo BLAS, que é onde está o tempo), O(q·n) para a partição e O(q·k log k) para ordenar. Memória: a matriz S tem q × n floats — 64 consultas contra 1 milhão de documentos são 256 MB em float32, por isso para lotes grandes processo as consultas em blocos.',
        },
        {
          type: 'list',
          items: [
            'Vector nulo: a divisão protegida com `where` evita NaN; o score −inf garante que fica no fim, e quem chama filtra com `np.isfinite`.',
            'k > n: corto k para n em vez de rebentar no `argpartition`.',
            'k ≤ 0 ou corpus vazio: devolvo arrays (q, 0) com os dtypes certos.',
            'Dimensões diferentes: erro explícito, porque é o sintoma típico de misturar modelos.',
            'Empates: `argsort` estável dentro dos k; se o entrevistador quiser desempate determinístico por id, ordeno por (−score, índice).',
          ],
        },
        {
          type: 'p',
          text: 'Como testava: os casos acima como testes unitários, mais um teste de propriedade que compara com a solução ingénua (ordenar tudo com `argsort`) em matrizes aleatórias, e um teste que verifica que escalar um documento por 10 não lhe muda o score. Extensões habituais: pré-normalizar os documentos na ingestão e guardar a matriz em float16 para metade da memória, filtrar por máscara de metadados antes da partição, ou passar para FAISS quando n deixar de caber em memória.',
        },
        {
          type: 'refs',
          items: [
            { label: 'NumPy — numpy.linalg.norm', url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html' },
            { label: 'Faiss — pesquisa exacta e aproximada', url: 'https://faiss.ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Normaliza e calcula todas as similaridades com um único produto de matrizes.',
          'Usa argpartition (ou equivalente) em vez de ordenar as n similaridades.',
          'Trata vectores nulos sem produzir NaN e sem os devolver à frente de documentos reais.',
          'Trata k > n e k ≤ 0.',
          'Dá a complexidade e a memória da matriz de scores, e como fazer em blocos.',
        ],
        fraco: 'Ciclo em Python sobre os documentos, ou `sorted` sobre todos os scores, e NaN com vectores nulos.',
        solido: 'Produto de matrizes, argpartition e casos-limite tratados, com teste contra a versão ingénua.',
        excelente: 'Acrescenta a análise de memória com processamento em blocos, desempate determinístico, testes de propriedade e o ponto a partir do qual passa para um índice ANN.',
      },
      seguimento: [
        'Como mudavas isto para suportar um filtro por tenant?',
        'A partir de que n deixavas de fazer pesquisa exacta?',
        'Como paralelizavas para 10 mil consultas em lote?',
      ],
      sinaisAlarme: [
        'Ordenar o vector inteiro de scores para tirar 10.',
        'Ignorar que a divisão por norma zero produz NaN.',
        'Não dizer o resultado esperado do exemplo.',
      ],
      modulos: ['embeddings', 'bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-embeddings-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'Tudo parece relevante: scores altos e misturados',
      enunciado:
        'Depois de uma migração parcial, o assistente começou a citar documentos sem relação com a pergunta. Os logs mostram que quase todos os candidatos têm cosseno entre 0,78 e 0,86, e o limiar de relevância é 0,75. O que investigas?',
      contexto:
        'Farmácia online com pesquisa de produtos e bulas: 1,2 milhões de chunks em Qdrant. Há duas semanas começou a migração para um modelo novo com a mesma dimensão (768); o job de backfill foi interrompido e reiniciado duas vezes. Desde então, a taxa de respostas marcadas como «não ajudou» subiu de 9% para 21%.',
      minutos: 12,
      dica: 'Dois modelos com 768 dimensões produzem vectores do mesmo tamanho. O que é que isso não garante?',
      resposta: [
        {
          type: 'p',
          text: 'A hipótese mais provável é **mistura de versões no índice**: parte dos chunks tem vectores do modelo antigo, parte do novo, e as consultas são embebidas com um só. Vectores de modelos diferentes vivem em espaços diferentes; o cosseno entre eles é ruído com um viés positivo, e o limiar fixo de 0,75 deixa esse ruído passar. A segunda hipótese, que agrava a primeira, é o limiar absoluto não ter sido recalibrado para o modelo novo.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Contar versões no índice', text: 'Se o payload tem a versão do modelo, conto pontos por versão. Se não tem, já encontrei um defeito: amostro 1 000 pontos, reembebo o texto com os dois modelos e vejo com qual o vector guardado tem cosseno ~1,0.' },
            { title: 'Separar scores por versão', text: 'Para 200 consultas do dourado, distribuição dos scores dos resultados divididos pela versão do vector. Se os vectores antigos aparecem no top com scores na mesma banda dos novos mas sem relevância, está confirmado.' },
            { title: 'Rever o job de backfill', text: 'As interrupções: o job retomou do início, saltou lotes, ou o checkpoint marcou como feitos lotes que falharam? E a ingestão de documentos novos durante a migração — com que modelo escrevia?' },
            { title: 'Excluir a anisotropia', text: 'Mesmo sem mistura, muitos modelos concentram o cosseno numa banda alta para qualquer par do domínio. Comparo a distribuição de scores de pares relevantes e de pares aleatórios no modelo novo: se se sobrepõem acima de 0,75, o limiar nunca filtrou nada.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcção imediata: filtrar a pesquisa pela versão actual da consulta (`embedding_version = v2` no payload) — perde-se recall nos chunks por migrar, mas acaba o ruído. Depois, terminar o backfill com um job idempotente que seleciona por versão em falta, e não por intervalo de ids. A seguir, recalibrar o limiar no dourado: escolho o valor pela curva de precisão e cobertura, ou abandono o limiar absoluto em favor de top-k com re-ranker, cujo score é mais estável.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Cada ponto leva a versão do modelo; a consulta filtra sempre pela versão com que foi embebida; um alarme dispara se houver mais de uma versão activa fora de uma janela de migração declarada; e a migração faz-se numa colecção nova com alias, nunca no sítio.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mesma dimensão, espaços diferentes',
          text: 'A base vectorial aceita o vector porque o tamanho bate certo. Nenhuma camada te avisa de que a dimensão 17 de um modelo não tem nada a ver com a dimensão 17 do outro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — filtragem por payload', url: 'https://qdrant.tech/documentation/concepts/filtering/' },
            { label: 'Sentence Transformers — documentação', url: 'https://sbert.net/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Levanta a mistura de versões de modelo como hipótese principal e explica porque o cosseno entre espaços diferentes é ruído.',
          'Propõe uma forma de detectar a versão de cada vector mesmo sem metadados (reembeber uma amostra).',
          'Verifica a lógica de retoma do backfill e a ingestão durante a migração.',
          'Distingue a mistura da banda alta natural do cosseno (limiar mal calibrado).',
          'Propõe mitigação imediata (filtro por versão) e prevenção (versão no payload, colecção nova, alarme).',
        ],
        fraco: 'Sobe o limiar para 0,85 e dá por resolvido.',
        solido: 'Identifica a mistura de versões, confirma pela contagem por versão e termina o backfill.',
        excelente: 'Separa as duas causas com distribuições de scores, mitiga em minutos com filtro por versão, recalibra ou substitui o limiar absoluto e institui versão no payload, alarme e migração por alias.',
      },
      seguimento: [
        'Como recalibravas o limiar com o conjunto dourado?',
        'Que alarme punhas para detectar isto antes dos utilizadores?',
        'Se não houver texto guardado para reembeber, como recuperas?',
      ],
      sinaisAlarme: [
        'Mexer no limiar sem perceber porque é que os scores mudaram.',
        'Achar que vectores com a mesma dimensão são compatíveis.',
        'Recomeçar o backfill do zero sem perceber porque falhou.',
      ],
      modulos: ['embeddings', 'bases-vectoriais', 'observabilidade-llmops'],
    },
  ],
};
