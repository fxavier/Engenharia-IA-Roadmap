import type { Module } from '../types';

export const m07: Module = {
  id: 'embeddings',
  number: 7,
  part: 'rag',
  title: 'Embeddings e similaridade',
  subtitle: 'Texto transformado em vectores comparáveis: o que medem, como se treinam e quanto custa trocá-los',
  icon: '🧭',
  minutes: 90,
  tags: ['embeddings', 'cosseno', 'contrastive', 'Matryoshka', 'reindexação'],
  goals: [
    'Explicar o que um modelo de embeddings calcula (tokens, transformer, pooling, normalização) e porque dois textos próximos no espaço vectorial não são necessariamente equivalentes para o cliente.',
    'Descrever o treino contrastivo (InfoNCE com negativos no batch e negativos difíceis) e a diferença entre bi-encoder e cross-encoder.',
    'Escolher entre cosseno, produto interno e distância L2, e saber quando são equivalentes (vectores normalizados) e quando não são.',
    'Reconhecer onde a pesquisa semântica ganha e onde perde para a lexical, e medir isso no conjunto dourado em vez de o supor.',
    'Aplicar prefixos de pergunta e de documento, decidir truncagens Matryoshka e planear uma troca de modelo como reindexação versionada.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'o-que-e',
      title: 'O que é um embedding de texto',
      blocks: [
        {
          type: 'p',
          text:
            'Um embedding de texto é uma função `f(texto) → vector de d números`, calculada por um modelo treinado para que textos com o mesmo significado, para uma certa tarefa, fiquem próximos segundo uma medida (quase sempre o cosseno). O modelo não «percebe» a pergunta: produz coordenadas, e a proximidade entre coordenadas foi optimizada, durante o treino, para correlacionar com pares de textos que humanos ou heurísticas marcaram como relacionados.',
        },
        {
          type: 'p',
          text:
            'Por dentro, um modelo de embeddings moderno é um transformer do tipo encoder (o mesmo mecanismo de atenção do módulo 2, mas sem gerar texto): tokeniza a entrada, calcula um vector contextual por token, junta-os num só vector (*pooling*: média dos tokens, ou o vector de um token especial) e normaliza-o para norma 1. O `nomic-embed-text` que o laboratório usa via Ollama devolve 768 números por texto e aceita até 8 192 tokens no modelo original (o Ollama anuncia uma janela de 2 k na sua biblioteca, e é essa que vale no laboratório).',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'De uma pergunta a um vector de 768 dimensões',
            caption: 'O mesmo pipeline corre na ingestão (para cada chunk) e em cada pergunta. Se as duas pontas usarem modelos, versões ou prefixos diferentes, os vectores deixam de ser comparáveis.',
            cols: 6,
            rows: 2,
            zones: [
              { id: 'modelo', label: 'Modelo de embeddings (encoder)', col: 1, row: 0, colSpan: 3, rowSpan: 2, tone: 'rag' },
            ],
            nodes: [
              { id: 'txt', label: '«search_query: Quanto tempo demora o estorno no Visa?»', col: 0, row: 0, kind: 'user' },
              { id: 'tok', label: 'Tokenizador', sub: '≈ 15 tokens', col: 1, row: 0, kind: 'service' },
              { id: 'enc', label: 'Transformer', sub: 'um vector por token', col: 2, row: 0, kind: 'model' },
              { id: 'pool', label: 'Pooling', sub: 'média dos tokens', col: 3, row: 0, kind: 'service' },
              { id: 'norm', label: 'Normalizar', sub: '‖v‖ = 1', col: 3, row: 1, kind: 'service' },
              { id: 'vec', label: 'vector(768)', sub: '3 KB em float4', col: 4, row: 1, kind: 'vector' },
              { id: 'pg', label: 'pgvector', sub: '`<=>` contra 1 870 chunks', col: 5, row: 1, kind: 'data' },
            ],
            edges: [
              { from: 'txt', to: 'tok' },
              { from: 'tok', to: 'enc' },
              { from: 'enc', to: 'pool' },
              { from: 'pool', to: 'norm' },
              { from: 'norm', to: 'vec' },
              { from: 'vec', to: 'pg' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O embedding do `balcao` é didáctico',
          text:
            'Os blocos «Correr» usam `balcao.embed`: um embedding por **hashing** de radicais e trigramas de caracteres, com 256 dimensões, sinal aleatório por hash, normalização L2 e uma tabela de sinónimos escrita à mão («estorno» → «reembolso», «motoqueiro» → «estafeta», «Visa» → «cartão»). Não é uma rede neuronal: só «sabe» os sinónimos que lhe demos. Tem as propriedades que interessam para o tutorial (norma 1, cosseno, determinismo) e serve para comparar técnicas entre si, não para prever o que o `nomic-embed-text` faria.',
        },
        {
          type: 'run',
          run: {
            id: 'run-embeddings-01',
            title: 'Um vector, uma norma, quatro cossenos',
            brief: 'A pergunta do cliente contra quatro documentos. Repara nos radicais no fim: «demora», «estorno» e «Visa» foram trocados por sinónimos canónicos, e é daí que vem a semelhança com `pol-reembolso-prazos`. Num modelo real, essas relações vêm do treino.',
            code: `import balcao as b

pergunta = "Quanto tempo demora o estorno no cartão Visa?"
q = b.embed(pergunta)
print("dimensões:", b.DIM, "| norma:", round(float((q ** 2).sum() ** 0.5), 6))
print("primeiras 6 coordenadas:", [round(float(x), 3) for x in q[:6]])
print()
for doc in ["pol-reembolso-prazos", "pol-pagamento-cartao", "pol-gorjetas", "faq-horarios"]:
    d = b.embed(b.DOC[doc]["texto"])
    print(f"{doc:22s} cosseno = {b.cosseno(q, d):.3f}")
print()
print("radicais da pergunta:", b.radicais(pergunta))`,
            expected: `dimensões: 256 | norma: 1.0
primeiras 6 coordenadas: [0.0, 0.215, 0.0, 0.0, 0.0, -0.107]

pol-reembolso-prazos   cosseno = 0.430
pol-pagamento-cartao   cosseno = 0.361
pol-gorjetas           cosseno = 0.000
faq-horarios           cosseno = -0.179

radicais da pergunta: ['tempo', 'prazo', 'reembolso', 'cartao', 'cartao']`,
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O equivalente real no laboratório: `OllamaEmbeddings` do `langchain-ollama`, 768 dimensões. Os prefixos são obrigatórios para este modelo (secção 5).',
          code: `from langchain_ollama import OllamaEmbeddings

emb = OllamaEmbeddings(model="nomic-embed-text", base_url="http://localhost:11434")

q = emb.embed_query("search_query: Quanto tempo demora o estorno no cartão Visa?")
docs = emb.embed_documents([
    "search_document: Prazos de reembolso por meio de pagamento\\nNo cartão, o reembolso demora 5 a 10 dias úteis...",
])
print(len(q))   # 768
# O pedido HTTP por baixo: POST /api/embed {"model": "nomic-embed-text", "input": [...]} → {"embeddings": [[...]]}`,
        },
        {
          type: 'terms',
          items: [
            { term: 'Dimensão', def: 'Número de coordenadas do vector (768 no `nomic-embed-text`, 256 no `balcao`). Fixada pelo modelo; muda a memória do índice linearmente.' },
            { term: 'Pooling', def: 'Como os vectores por token se juntam num só: média (mean pooling) na maioria dos modelos de texto actuais.' },
            { term: 'Normalização L2', def: 'Dividir o vector pela sua norma para ficar com comprimento 1: o cosseno passa a ser só o produto interno.' },
            { term: 'Janela do modelo de embeddings', def: 'Máximo de tokens por texto. O que passar é cortado em silêncio: um chunk de 3 000 tokens num modelo de 512 só é representado pelo início.' },
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'Ollama — nomic-embed-text', url: 'https://ollama.com/library/nomic-embed-text' },
            { label: 'Nussbaum et al. — Nomic Embed (2024)', url: 'https://arxiv.org/abs/2402.01613' },
            { label: 'LangChain — Embedding models', url: 'https://docs.langchain.com/oss/python/integrations/text_embedding' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'treino',
      title: 'Como se treinam: aprendizagem contrastiva',
      blocks: [
        {
          type: 'p',
          text:
            'Os modelos de embeddings de texto actuais treinam-se com pares (pergunta, passagem relevante), (título, corpo), (pergunta, resposta aceite), recolhidos aos milhões da web e depois afinados em conjuntos anotados. O objectivo não é prever a palavra seguinte: é pôr o vector da pergunta mais perto do da passagem certa do que de todas as outras passagens do mesmo batch. As outras passagens funcionam como negativos «de graça» (*in-batch negatives*): num batch de 1 000 pares, cada pergunta tem 1 positivo e 999 negativos.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-embeddings-01',
            title: 'Perda contrastiva InfoNCE com negativos no batch',
            expr: 'L(q, d⁺) = − log ( exp(cos(q, d⁺) / τ)  /  Σⱼ exp(cos(q, dⱼ) / τ) )',
            where: [
              { sym: 'q', means: 'embedding da pergunta, por exemplo «Esqueci o meu guarda-chuva com o motoqueiro»' },
              { sym: 'd⁺', means: 'embedding da passagem relevante (`faq-objecto-esquecido`)' },
              { sym: 'dⱼ', means: 'todas as passagens do batch: d⁺ e os negativos (`pol-gorjetas`, `faq-horarios`, …)' },
              { sym: 'τ', means: 'temperatura: pequena (≈ 0,01 a 0,1) torna a softmax mais «afiada» e castiga mais os negativos próximos' },
              { sym: 'L', means: 'a perda: zero quando d⁺ ganha a todos os negativos por larga margem' },
            ],
            reading: 'Uma softmax sobre os cossenos do batch, em que a classe certa é a passagem relevante: o treino empurra q para d⁺ e afasta-o dos outros.',
            note: 'É a `MultipleNegativesRankingLoss` do Sentence Transformers. A mesma forma aparece no CLIP para imagem e texto. Os valores de τ variam por modelo: lê-os no artigo de cada um.',
          },
        },
        {
          type: 'p',
          text:
            'Os negativos aleatórios são fáceis: `pol-gorjetas` nunca foi candidato a responder a uma pergunta sobre guarda-chuvas. O que distingue um bom modelo é o treino com **negativos difíceis**: passagens parecidas mas erradas, minadas com BM25 ou com um modelo anterior. Para o «Balcão», um negativo difícil de «o restaurante cancelou o meu pedido» é `pol-cancelamento-cliente`, que partilha quase todas as palavras e responde à pergunta errada. É exactamente o caso em que o embedding didáctico falha, na secção 4.',
        },
        {
          type: 'compare',
          left: {
            title: 'Bi-encoder (embeddings)',
            items: [
              'Pergunta e documento codificados em separado; a comparação é um produto interno.',
              'Os documentos codificam-se uma vez, na ingestão; a pergunta, uma vez por pedido (≈ 60 ms no «Balcão»).',
              'Escala para milhões de documentos com um índice ANN (módulo 8).',
              'Perde nuances que só se vêem com os dois textos juntos (negações, números, quem fez o quê).',
            ],
          },
          right: {
            title: 'Cross-encoder (re-ranker)',
            items: [
              'Pergunta e documento entram juntos no modelo, que devolve um score de relevância.',
              'Não há nada para pré-calcular: um passo de modelo por par (pergunta, candidato).',
              'Só é viável sobre poucos candidatos: o «Balcão» re-ordena os 20 primeiros em ≈ 180 ms.',
              'Mais preciso por candidato; é a segunda fase, não a primeira (módulo 11).',
            ],
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Afinar um modelo de embeddings com pares do domínio (Sentence Transformers). Só vale a pena quando o conjunto dourado mostra que o modelo genérico falha em vocabulário do domínio, e com milhares de pares, não dezenas.',
          code: `from datasets import Dataset
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, losses

modelo = SentenceTransformer("<modelo-multilingue-base>")

pares = Dataset.from_dict({
    "anchor":   ["Esqueci o meu guarda-chuva com o motoqueiro", "O restaurante cancelou o meu pedido, e agora?"],
    "positive": ["Objecto esquecido com o estafeta: reporte em 24 horas...", "Cancelamento pelo restaurante: reembolso total automático..."],
})

perda = losses.MultipleNegativesRankingLoss(modelo)   # InfoNCE com negativos no batch
SentenceTransformerTrainer(model=modelo, train_dataset=pares, loss=perda).train()
# Depois: reindexar TUDO com o modelo afinado (novo modelo_embedding) e comparar no dourado.`,
        },
        {
          type: 'table',
          head: ['Fonte de pares', 'Exemplo no «Chega»', 'Qualidade do sinal'],
          rows: [
            ['Pergunta e passagem anotada', 'g23 → `faq-objecto-esquecido`', 'Alta, mas cara: é o conjunto dourado'],
            ['Título e corpo', '«Cupões» → texto de `pol-cupoes`', 'Média: o título é curto e genérico'],
            ['Pergunta do cliente e FAQ que o suporte citou', 'conversa escalada → artigo enviado pelo humano', 'Alta e barata, se o suporte registar o artigo'],
            ['Negativo difícil minado com BM25', '«restaurante cancelou» × `pol-cancelamento-cliente`', 'O que mais ensina, e o que mais precisa de revisão (falsos negativos)'],
          ],
          caption: 'Se algum dia afinares um modelo de embeddings, os pares vêm daqui. O registo do artigo que o humano enviou é o dado mais barato de começar a guardar já.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Porque não afinamos (ainda)',
          text:
            'Afinar é criar um modelo novo que tens de versionar, servir e reavaliar a cada alteração, e o ganho só aparece se o vocabulário do domínio falhar de forma sistemática. No «Balcão», o recall@5 do denso sozinho já é 0,950 no dourado didáctico, e as falhas que restam (negativos difíceis como o cancelamento) resolvem-se melhor com pesquisa híbrida e re-ranking (adr-0009) do que com um modelo afinado. FA-01 exclui fine-tuning de modelos de geração; o de embeddings fica em aberto, a reabrir com dados.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Oord, Li e Vinyals — Contrastive Predictive Coding / InfoNCE (2018)', url: 'https://arxiv.org/abs/1807.03748' },
            { label: 'Reimers e Gurevych — Sentence-BERT (2019)', url: 'https://arxiv.org/abs/1908.10084' },
            { label: 'Sentence Transformers — Training overview', url: 'https://sbert.net/docs/sentence_transformer/training_overview.html' },
            { label: 'Wang et al. — E5: weakly-supervised contrastive pre-training (2022)', url: 'https://arxiv.org/abs/2212.03533' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'similaridade',
      title: 'Cosseno, produto interno e L2: dimensões e normalização',
      blocks: [
        {
          type: 'p',
          text:
            'Há três medidas em uso. O **cosseno** mede o ângulo entre dois vectores e ignora o comprimento. O **produto interno** soma os produtos coordenada a coordenada e depende do ângulo e dos comprimentos. A **distância L2** (euclidiana) mede o comprimento da diferença. Para vectores de norma 1, que é o que quase todos os modelos de embeddings de texto devolvem ou recomendam, as três dão **o mesmo ranking**.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-embeddings-02',
            title: 'Com vectores normalizados, as três medidas são a mesma',
            expr: 'cos(a, b) = (a · b) / (‖a‖ ‖b‖)        e, se ‖a‖ = ‖b‖ = 1:   ‖a − b‖² = 2 − 2 · cos(a, b) = 2 − 2 · (a · b)',
            where: [
              { sym: 'a · b', means: 'produto interno: Σᵢ aᵢ bᵢ sobre as 768 dimensões' },
              { sym: '‖a‖', means: 'norma L2 do vector; 1 depois de normalizar' },
              { sym: 'cos(a, b)', means: 'entre −1 e 1; na prática, entre ≈ 0,2 e ≈ 0,9 para textos em português com os modelos actuais' },
              { sym: '‖a − b‖²', means: 'quadrado da distância euclidiana, função decrescente do cosseno' },
            ],
            reading: 'Com norma 1, ordenar por cosseno decrescente, por produto interno decrescente ou por L2 crescente dá exactamente a mesma lista.',
            note: 'No pgvector: `<=>` é a distância de cosseno (1 − cos), `<#>` é o produto interno **negativo** (para ordenar de forma ascendente), `<->` é L2. O índice tem de ser criado com o operador que a consulta usa (`vector_cosine_ops`, `vector_ip_ops`, `vector_l2_ops`).',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-embeddings-02',
            title: 'As três medidas com e sem normalização',
            brief: 'Com norma 1, `L2² = 2 − 2cos` e os rankings coincidem. Multiplica um vector por 3 (como faria um modelo que não normaliza, com documentos longos a ter normas maiores) e o produto interno muda de vencedor.',
            code: `import numpy as np
import balcao as b

q = b.embed("Posso juntar dois cupões no mesmo pedido?")
docs = ["pol-cupoes", "faq-pedido-grupo", "pol-taxa-servico"]
V = np.vstack([b.embed(b.DOC[d]["texto"]) for d in docs])

print("normalizados (norma 1):")
for d, v in zip(docs, V):
    cos, dot, l2 = b.cosseno(q, v), float(q @ v), float(np.linalg.norm(q - v))
    print(f"  {d:18s} cos={cos:.3f} dot={dot:.3f} L2={l2:.3f} 2-2cos={2 - 2 * cos:.3f} L2²={l2 ** 2:.3f}")

# Sem normalizar: um documento «maior» (vector escalado) ganha no produto interno.
W = V * np.array([[1.0], [3.0], [1.0]])
print("sem normalizar (faq-pedido-grupo × 3):")
print("  ranking por cosseno:", [docs[i] for i in np.argsort([-b.cosseno(q, w) for w in W])])
print("  ranking por dot:    ", [docs[i] for i in np.argsort([-float(q @ w) for w in W])])`,
            expected: `normalizados (norma 1):
  pol-cupoes         cos=0.486 dot=0.486 L2=1.014 2-2cos=1.027 L2²=1.027
  faq-pedido-grupo   cos=0.321 dot=0.321 L2=1.166 2-2cos=1.358 L2²=1.358
  pol-taxa-servico   cos=0.137 dot=0.137 L2=1.313 2-2cos=1.725 L2²=1.725
sem normalizar (faq-pedido-grupo × 3):
  ranking por cosseno: ['pol-cupoes', 'faq-pedido-grupo', 'pol-taxa-servico']
  ranking por dot:     ['faq-pedido-grupo', 'pol-cupoes', 'pol-taxa-servico']`,
          },
        },
        {
          type: 'table',
          head: ['Medida', 'Operador pgvector', 'Opclass do índice', 'Quando'],
          rows: [
            ['Distância de cosseno', '`<=>`', '`vector_cosine_ops`', 'Por omissão para texto: robusta a vectores não normalizados. É o que o «Balcão» usa.'],
            ['Produto interno', '`<#>` (negativo)', '`vector_ip_ops`', 'Vectores já normalizados, ou modelos treinados para produto interno; um pouco mais barato de calcular.'],
            ['L2 (euclidiana)', '`<->`', '`vector_l2_ops`', 'Modelos treinados com L2 (alguns de imagem); raro em texto.'],
            ['L1, Hamming, Jaccard', '`<+>`, `<~>`, `<%>`', '`vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`', 'Hamming e Jaccard para vectores binários quantizados (módulo 8).'],
          ],
          caption: 'Operadores e classes de operadores do pgvector 0.8. A regra: usa a medida com que o modelo foi treinado, que está no cartão do modelo.',
        },
        {
          type: 'p',
          text:
            'O número de dimensões é uma escolha do fabricante do modelo, com custo linear: 768 dimensões em `float4` são 3 KB por vector, 3 072 seriam 12 KB. Para os ≈ 1 870 chunks do «Balcão» a diferença é entre 5,7 e 23 MB, trivial. Em 100 milhões de vectores é entre 300 GB e 1,2 TB de RAM para o índice, e aí a dimensão é a decisão de infraestrutura mais cara do sistema. O limite de indexação do tipo `vector` no pgvector é 2 000 dimensões (4 000 com `halfvec`).',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'O operador da consulta tem de ser o do índice. Com `vector_cosine_ops`, só `ORDER BY embedding <=> ...` usa o HNSW; ordenar por `<#>` faz uma pesquisa exacta sem aviso.',
          code: `-- índice do «Balcão» (sql/001_esquema.sql)
CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);

-- usa o índice
SELECT id, 1 - (embedding <=> :q) AS cosseno FROM chunks ORDER BY embedding <=> :q LIMIT 20;

-- NÃO usa o índice: outro operador (produto interno negativo)
SELECT id, (embedding <#> :q) * -1 AS produto FROM chunks ORDER BY embedding <#> :q LIMIT 20;`,
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Um cosseno de 0,43 não é «43% de relevância»',
          text:
            'Os scores absolutos dependem do modelo, da língua e do comprimento dos textos: num modelo os pares relevantes ficam acima de 0,8, noutro acima de 0,5. Um limiar de recusa calibrado para um modelo não serve para outro. Calibra-o no conjunto dourado (distribuição de scores de pares relevantes contra irrelevantes) e volta a calibrá-lo a cada troca de modelo; o «Balcão» faz o limiar sobre o score de re-ranking, não sobre o cosseno (módulo 10).',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — operadores e índices', url: 'https://github.com/pgvector/pgvector' },
            { label: 'NumPy — linalg.norm', url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html' },
            { label: 'Sentence Transformers — Semantic search', url: 'https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'semantico-lexical',
      title: 'Semântico contra lexical, e o português de Maputo',
      blocks: [
        {
          type: 'p',
          text:
            'A pesquisa lexical (BM25, `tsvector`, módulo 11) só encontra documentos que partilham termos com a pergunta. A densa encontra documentos cujo vector está perto, mesmo sem palavras em comum. Isto resolve o problema clássico do suporte: o cliente escreve «motoqueiro», «estorno» e «guarda-chuva», as políticas dizem «estafeta», «reembolso» e «objecto esquecido».',
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-embeddings-01',
            title: 'Onde o denso ganha: nenhuma palavra em comum',
            brief: 'Pergunta g23 do conjunto dourado, pesquisa densa exacta, k = 3. O BM25 do `balcao`, sem sinónimos, devolve zero resultados: nenhum termo da pergunta aparece no corpus.',
            query: 'Esqueci o meu guarda-chuva com o motoqueiro',
            method: 'denso',
            k: 3,
            hits: [{"doc": "faq-objecto-esquecido", "texto": "Se o cliente se esquecer de um objecto com o estafeta, ou o estafeta o deixar por engano, deve reportar na aplicação até 24 horas depois. A equipa coordena a devolução; quando a devolução é feita em casa do cliente, custa 60 MZN.", "score": 0.4101, "relevante": true}, {"doc": "pol-pagamento-numerario", "texto": "O pagamento em numerário é feito ao estafeta, no momento da entrega. O estafeta leva troco até 1 000 MZN; recomendamos ter o valor certo.", "score": 0.2342, "relevante": false}, {"doc": "faq-alterar-morada", "texto": "A morada pode ser alterada até o estafeta recolher o pedido. Se a nova morada ficar a mais de 2 km da original, a taxa de entrega é recalculada e a diferença é cobrada ou devolvida.", "score": 0.1913, "relevante": false}],
            note: 'O cosseno de 0,41 vem de «esqueci» → «esquecer» e «motoqueiro» → «estafeta» na tabela de sinónimos do embedding didáctico. Um modelo neuronal aprende estas relações dos dados; o efeito na pesquisa é o mesmo.',
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-embeddings-02',
            title: 'Onde o denso perde: o negativo difícil',
            brief: 'Pergunta g19. O documento certo é `pol-cancelamento-restaurante`; o denso prefere o cancelamento **pelo cliente**, que partilha quase todo o vocabulário.',
            query: 'O restaurante cancelou o meu pedido, e agora?',
            method: 'denso',
            k: 3,
            hits: [{"doc": "pol-cancelamento-cliente", "texto": "O cliente pode cancelar sem custos enquanto o restaurante ainda não aceitou o pedido. Depois de o restaurante aceitar e antes de o pedido estar pronto, o cancelamento custa 50% do valor dos artigos, porque a comida já está a ser preparada.", "score": 0.4496, "relevante": false}, {"doc": "pol-cancelamento-cliente", "texto": "Para cancelar, o cliente abre o pedido na aplicação e escolhe Cancelar pedido. O assistente não cancela pedidos sem a confirmação explícita do cliente e, depois de aceite pelo restaurante, sem aprovação de um humano.", "score": 0.4293, "relevante": false}, {"doc": "pol-pagamento-cartao", "texto": "Aceitamos cartões Visa e Mastercard, com autenticação 3-D Secure. O valor é cativo no momento do pedido e só é cobrado na entrega.", "score": 0.3805, "relevante": false}],
            note: 'Quem cancelou (o restaurante ou o cliente) é uma relação entre palavras que um vector de 256 números por hashing não representa. Modelos neuronais fazem melhor, mas este tipo de erro (negação, agente, números) é a fraqueza conhecida dos bi-encoders.',
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-embeddings-03',
            title: 'A mesma pergunta com BM25',
            brief: 'O termo raro «restaurante» no título e no texto de `pol-cancelamento-restaurante` pesa no IDF, e o documento certo entra no top-3.',
            query: 'O restaurante cancelou o meu pedido, e agora?',
            method: 'bm25',
            k: 3,
            hits: [{"doc": "pol-cancelamento-cliente", "texto": "O cliente pode cancelar sem custos enquanto o restaurante ainda não aceitou o pedido. Depois de o restaurante aceitar e antes de o pedido estar pronto, o cancelamento custa 50% do valor dos artigos, porque a comida já está a ser preparada.", "score": 2.6964, "relevante": false}, {"doc": "pol-cancelamento-cliente", "texto": "Para cancelar, o cliente abre o pedido na aplicação e escolhe Cancelar pedido. O assistente não cancela pedidos sem a confirmação explícita do cliente e, depois de aceite pelo restaurante, sem aprovação de um humano.", "score": 2.368, "relevante": false}, {"doc": "pol-cancelamento-restaurante", "texto": "Se o restaurante ou a loja cancelar o pedido, por falta de ingredientes ou por encerramento, o cliente recebe o reembolso total de forma automática e um cupão de 100 MZN como pedido de desculpa. Não é preciso contactar o suporte.", "score": 2.1869, "relevante": true}],
            note: 'Nenhum dos dois métodos ganha sempre: no dourado didáctico, o denso tem recall@3 de 0,900 e o BM25 0,833, e falham em perguntas diferentes. É o argumento da pesquisa híbrida (módulo 11, adr-0009).',
          },
        },
        {
          type: 'table',
          head: ['Tipo de pergunta', 'Exemplo', 'Melhor', 'Porquê'],
          rows: [
            ['Paráfrase, sinónimos', '«Esqueci o guarda-chuva com o motoqueiro»', 'denso', 'Nenhum termo em comum com a FAQ'],
            ['Códigos e identificadores', '«O que é um RB-873353?», «PD-8841990»', 'lexical', 'Um código raro é um token exacto; num vector dilui-se'],
            ['Números e limites', '«troco para 2000», «taxa para 5 km»', 'lexical ou re-ranker', 'O embedding aproxima números próximos; a política distingue 1 000 de 2 000'],
            ['Quem fez o quê', '«o restaurante cancelou»', 'lexical + re-ranker', 'Negativo difícil para bi-encoders'],
            ['Nomes locais', '«matapa», «Machava», «e-Mola»', 'lexical', 'Termos raros ou fora do vocabulário do treino do modelo'],
            ['Perguntas vagas', '«tive um problema com a comida»', 'denso', 'Aproxima-se do tema sem termos precisos'],
          ],
          caption: 'Tendências, não leis: mede no teu conjunto dourado, por tipo de pergunta.',
        },
        {
          type: 'widget',
          id: 'embeddings-2d',
        },
        {
          type: 'run',
          run: {
            id: 'run-embeddings-03',
            title: 'Perguntas (P) e documentos (D) no plano',
            brief: '`projectar_2d` faz PCA dos vectores de 256 dimensões para 2. As perguntas de prazos ficam do lado dos prazos, a do guarda-chuva junto do objecto esquecido. A PCA perde quase toda a informação: serve para intuição, nunca para decidir.',
            code: `import balcao as b

textos = {
    "P estorno Visa": "Quanto tempo demora o estorno no cartão Visa?",
    "P devolução M-Pesa": "Quanto tempo demora a devolução do dinheiro no M-Pesa?",
    "P guarda-chuva": "Esqueci o meu guarda-chuva com o motoqueiro",
    "P cerveja 23h": "Posso pedir cerveja às 23h?",
    "D prazos": b.DOC["pol-reembolso-prazos"]["texto"],
    "D objecto": b.DOC["faq-objecto-esquecido"]["texto"],
    "D álcool": b.DOC["pol-bebidas-alcool"]["texto"],
    "D horários": b.DOC["faq-horarios"]["texto"],
}
xy = b.projectar_2d(b.embed_lote(list(textos.values())))
for (nome, _), (x, y) in zip(textos.items(), xy):
    print(f"{nome:20s} ({x:+.2f}, {y:+.2f})")`,
            expected: `P estorno Visa       (-0.72, -0.07)
P devolução M-Pesa   (-0.62, +0.13)
P guarda-chuva       (+0.34, +0.71)
P cerveja 23h        (+0.50, -0.29)
D prazos             (-0.39, -0.32)
D objecto            (+0.07, +0.43)
D álcool             (+0.43, -0.06)
D horários           (+0.39, -0.51)`,
          },
        },
        {
          type: 'h',
          text: 'Multilinguismo e código misto',
        },
        {
          type: 'p',
          text:
            'Os clientes do «Chega» escrevem em português com palavras de changana e de inglês («o rider ainda não chegou», «khanimambo»), e as políticas estão em português europeu com termos locais. Um modelo multilingue treinado com pares em várias línguas projecta traduções e paráfrases para zonas próximas do espaço, o que ajuda no código misto; um modelo só de inglês trata «reembolso» como uma sequência de sub-palavras sem vizinhos úteis. A adr-0007 escolheu um modelo multilingue por isso, mas a prova está no dourado: estratifica-o por variedade (português de Moçambique, mistura com inglês, com changana) e compara modelos nessas fatias, não na média.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: «semântico» como sinónimo de «melhor»',
          text:
            'Trocar BM25 por embeddings porque «a pesquisa semântica percebe o significado» e descobrir, em produção, que «PD-8841990» e «RB-873353» deixaram de ser encontrados e que «troco para 2000» devolve a política do troco de 1 000. Um embedding é uma compressão com perdas; os termos exactos são o que ele perde primeiro. O «Balcão» corre as duas pesquisas e funde-as (adr-0009), e decide com recall@k por tipo de pergunta.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Thakur et al. — BEIR: benchmark heterogéneo de recuperação (2021)', url: 'https://arxiv.org/abs/2104.08663' },
            { label: 'Muennighoff et al. — MTEB (2022)', url: 'https://arxiv.org/abs/2210.07316' },
            { label: 'Hugging Face — MTEB leaderboard', url: 'https://huggingface.co/spaces/mteb/leaderboard' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 'assimetria-matryoshka',
      title: 'Assimetria pergunta/documento e Matryoshka',
      blocks: [
        {
          type: 'p',
          text:
            'Uma pergunta de cliente tem 8 a 15 palavras e é uma pergunta; um chunk tem 60 a 120 palavras e é uma afirmação. Muitos modelos são treinados para esta **assimetria** e pedem que o texto venha marcado: o `nomic-embed-text` exige `search_query: ` antes das perguntas e `search_document: ` antes dos documentos (e `clustering: ` ou `classification: ` noutras tarefas); a família E5 usa `query: ` e `passage: `. Sem o prefixo, o modelo continua a devolver 768 números, sem erro nem aviso, e o recall desce.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Um `Embeddings` que aplica os prefixos numa só camada. Toda a ingestão chama `embed_documents` e toda a pesquisa `embed_query`, por isso o prefixo nunca fica esquecido num sítio.',
          code: `from langchain_core.embeddings import Embeddings
from langchain_ollama import OllamaEmbeddings


class ComPrefixos(Embeddings):
    """Aplica os prefixos de tarefa que o nomic-embed-text exige."""

    def __init__(self, base: Embeddings, pergunta: str = "search_query: ", documento: str = "search_document: "):
        self.base, self.pergunta, self.documento = base, pergunta, documento

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.base.embed_documents([self.documento + t for t in texts])

    def embed_query(self, text: str) -> list[float]:
        return self.base.embed_query(self.pergunta + text)


emb = ComPrefixos(OllamaEmbeddings(model="nomic-embed-text"))
# No laboratório, criar_embeddings() devolve o OllamaEmbeddings sem esta camada:
# é aqui que a adr-0007 («com os prefixos que o modelo exige») se cumpre.`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Prefixos trocados ou esquecidos degradam sem erro',
          text:
            'O modo de falha é silencioso: ingerir com `search_document:` e pesquisar sem prefixo, ou ingerir sem prefixo e mais tarde «corrigir» só a pesquisa. Os vectores continuam válidos, as consultas continuam a devolver k linhas, e o recall@5 cai alguns pontos que só o conjunto dourado mostra. Põe um teste de CI que verifica o prefixo nos dois caminhos, e regista-o como parte de `modelo_embedding` (por exemplo `ollama:nomic-embed-text+prefixos`).',
        },
        {
          type: 'h',
          text: 'Matryoshka: vectores que se podem encurtar',
        },
        {
          type: 'p',
          text:
            'Um modelo treinado com *Matryoshka Representation Learning* optimiza a perda não só sobre o vector completo mas também sobre os seus prefixos (as primeiras 64, 128, 256, 512 dimensões). O resultado é que podes cortar o vector e renormalizar, com uma perda de qualidade pequena e conhecida. O cartão do `nomic-embed-text-v1.5` reporta, no MTEB, 62,28 com 768 dimensões, 61,04 com 256 e 56,10 com 64. Os modelos de embeddings da OpenAI expõem o mesmo mecanismo com o parâmetro `dimensions`, que o laboratório usa para caber na coluna de 768.',
        },
        {
          type: 'run',
          run: {
            id: 'run-embeddings-04',
            title: 'Cortar um vector que NÃO foi treinado para isso',
            brief: 'O embedding didáctico não é Matryoshka: cada dimensão é um balde de hashing, sem ordem de importância. Cortar as primeiras d dimensões e renormalizar mostra o que acontece quando se trunca um modelo que não foi treinado para isso: o recall@3 no dourado cai depressa.',
            code: `import numpy as np
import balcao as b

chunks = b.chunkar_corpus("recursivo")
M = b.embed_lote([c.texto for c in chunks])

def recall_at_3(dims: int) -> float:
    m = M[:, :dims] / np.linalg.norm(M[:, :dims], axis=1, keepdims=True)
    acertos = []
    for p in b.PERGUNTAS:
        q = b.embed(p["pergunta"])[:dims]
        q = q / (np.linalg.norm(q) or 1.0)
        docs = []
        for i in np.argsort(-(m @ q)):
            if chunks[i].doc not in docs:
                docs.append(chunks[i].doc)
            if len(docs) == 3:
                break
        acertos.append(b.recall_at_k(docs, p["relevantes"], 3))
    return round(float(np.mean(acertos)), 3)

for d in (256, 128, 64, 32):
    print(f"primeiras {d:3d} dimensões: recall@3 = {recall_at_3(d)}  ({d * 4} bytes por vector)")`,
            expected: `primeiras 256 dimensões: recall@3 = 0.9  (1024 bytes por vector)
primeiras 128 dimensões: recall@3 = 0.75  (512 bytes por vector)
primeiras  64 dimensões: recall@3 = 0.65  (256 bytes por vector)
primeiras  32 dimensões: recall@3 = 0.617  (128 bytes por vector)`,
          },
        },
        {
          type: 'p',
          text:
            'Num modelo Matryoshka a curva seria muito mais plana, e a decisão seria de custo: para 5,7 MB de vectores não há razão para cortar nada. Onde compensa é em índices de centenas de milhões de vectores, e de forma elegante em duas fases: pesquisa ANN com 256 dimensões (4× menos memória no índice) e re-ordenação dos candidatos com as 768 completas, a mesma ideia da quantização binária com re-scoring do módulo 8.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kusupati et al. — Matryoshka Representation Learning (2022)', url: 'https://arxiv.org/abs/2205.13147' },
            { label: 'Hugging Face — nomic-embed-text-v1.5 (prefixos e dimensões)', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5' },
            { label: 'OpenAI — Embeddings (parâmetro dimensions)', url: 'https://platform.openai.com/docs/guides/embeddings' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'versionar-custo',
      title: 'Versionar, reindexar e quanto custa',
      blocks: [
        {
          type: 'p',
          text:
            'Vectores de modelos diferentes vivem em espaços diferentes: a coordenada 17 de um modelo não tem relação nenhuma com a coordenada 17 de outro, mesmo com o mesmo número de dimensões. Comparar uma pergunta codificada pelo modelo B com chunks codificados pelo modelo A devolve números entre −1 e 1 com aspecto perfeitamente normal, e ordem aleatória. É por isso que a adr-0007 guarda `modelo_embedding` em **cada linha** e que a consulta híbrida filtra por ele.',
        },
        { type: 'adr', ref: 'adr-0007' },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Do `sql/001_esquema.sql`: o vector e o modelo que o gerou lado a lado, e o filtro dentro da CTE densa da `pesquisa_hibrida`.',
          code: `CREATE TABLE IF NOT EXISTS chunks (
    id               text PRIMARY KEY,           -- pol-reembolso#0: estável entre reindexações
    documento_id     text    NOT NULL REFERENCES documentos (id) ON DELETE CASCADE,
    ordem            integer NOT NULL,
    texto            text    NOT NULL,
    embedding        vector(768) NOT NULL,
    modelo_embedding text    NOT NULL,           -- vectores de modelos diferentes não se comparam
    ...
);

-- dentro de pesquisa_hibrida(consulta, consulta_vector, publicos, modelo, k, k_rrf):
SELECT c.id, c.embedding <=> consulta_vector AS distancia
FROM chunks c JOIN documentos d ON d.id = c.documento_id
WHERE d.vigente AND d.publico = ANY (publicos)
  AND c.modelo_embedding = modelo
ORDER BY c.embedding <=> consulta_vector
LIMIT k;`,
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-embeddings-01',
            title: 'Trocar de modelo de embeddings sem janela de indisponibilidade',
            intro: 'Uma reindexação é um deploy: lado a lado, avaliada, trocada por configuração, reversível.',
            lanes: [
              { id: 'eng', label: 'Engenharia de IA', kind: 'human' },
              { id: 'job', label: 'Job de ingestão', sub: 'modelo B', kind: 'service' },
              { id: 'db', label: 'PostgreSQL', sub: 'chunks', kind: 'store' },
              { id: 'api', label: 'API do «Balcão»', sub: 'pesquisa', kind: 'service' },
            ],
            steps: [
              { from: 'eng', to: 'job', label: 'ingerir tudo com modelo_embedding = B', detail: 'A ingestão não salta documentos com hash igual se os chunks forem de outro modelo (`hash_documento` em `recuperacao.py`).', kind: 'req' },
              { from: 'job', to: 'db', label: '≈ 1 870 linhas novas ao lado das de A', detail: 'O armazenamento duplica durante a migração: ≈ 11 MB em vez de 5,7 MB, irrelevante aqui.', kind: 'req', ms: 180000 },
              { from: 'api', to: 'db', label: 'pesquisas continuam com modelo = A', kind: 'req' },
              { from: 'eng', to: 'db', label: 'avaliar B no dourado (recall@5 por intenção)', detail: 'Mesma pesquisa híbrida, `modelo = B`. Se B não ganhar, apagam-se as linhas B e nada mudou para o cliente.', kind: 'self' },
              { from: 'eng', to: 'api', label: 'deploy: BALCAO_MODELO_EMBEDDINGS = B', detail: 'A pergunta passa a ser codificada por B e o filtro passa a `modelo = B`, no mesmo deploy.', kind: 'req' },
              { from: 'api', to: 'db', label: 'pesquisas com modelo = B', kind: 'req' },
              { from: 'eng', to: 'db', label: 'dias depois: DELETE WHERE modelo_embedding = A', kind: 'async' },
            ],
            outro: 'O erro que este fluxo evita: trocar o modelo da pergunta sem ter reindexado, ou reindexar por cima das linhas antigas enquanto o serviço pesquisa. Nos dois casos, o índice mistura dois espaços e as respostas degradam sem nenhum erro.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-embeddings-05',
            title: 'Quanto custa reindexar, pesquisar e guardar',
            brief: 'Tokens da amostra de 40 documentos extrapolados para os 1 870 chunks de produção, ao preço de referência de embeddings por API de `design.ts` (≈ 0,02 USD por milhão de tokens), e o espaço dos vectores em três tipos.',
            code: `import balcao as b

chunks = b.chunkar_corpus("recursivo")
tokens = sum(b.estimar_tokens(c.texto) for c in chunks)
print(f"amostra: {len(chunks)} chunks, {tokens} tokens, média {tokens / len(chunks):.0f} por chunk")

# Produção: ≈ 1 870 chunks de 768 dimensões (design.ts).
N, DIM, PRECO_USD_M = 1870, 768, 0.02
tok_prod = N * tokens / len(chunks)
print(f"produção: ≈ {tok_prod / 1e3:.0f} k tokens para reindexar tudo")
print(f"custo de reindexar por API: ≈ {tok_prod / 1e6 * PRECO_USD_M * b.CAMBIO_USD_MZN:.2f} MZN")
print(f"perguntas: 3 100/dia × 15 tokens ≈ {3100 * 15 / 1e6 * PRECO_USD_M * b.CAMBIO_USD_MZN * 30:.2f} MZN/mês")
for tipo, bytes_por in (("vector (float4)", 4), ("halfvec (float2)", 2), ("bit (binário)", 1 / 8)):
    print(f"{tipo:17s} {N * DIM * bytes_por / 1e6:6.2f} MB de vectores")`,
            expected: `amostra: 46 chunks, 3387 tokens, média 74 por chunk
produção: ≈ 138 k tokens para reindexar tudo
custo de reindexar por API: ≈ 0.18 MZN
perguntas: 3 100/dia × 15 tokens ≈ 1.78 MZN/mês
vector (float4)     5.74 MB de vectores
halfvec (float2)    2.87 MB de vectores
bit (binário)       0.18 MB de vectores`,
          },
        },
        {
          type: 'p',
          text:
            'Reindexar o «Balcão» inteiro por API custa menos de um metical e as pesquisas do mês inteiro menos de dois: o custo de embeddings é irrelevante ao lado dos ≈ 23 000 MZN por mês do modelo de chat. O que custa numa troca de modelo é o resto: tempo de engenharia, avaliação, o limiar de recusa a recalibrar, o cache semântico a invalidar (adr-0026). Com o `nomic-embed-text` local o custo por token é zero e o custo passa a ser CPU e os ≈ 60 ms por pergunta.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Um teste que falha antes de o índice misturar espaços',
          text:
            'A validação da adr-0007 é um teste de CI que falha se existirem linhas com dois valores de `modelo_embedding` no filtro activo, e um alarme em produção sobre `SELECT modelo_embedding, count(*) FROM chunks GROUP BY 1`. Acrescenta a dimensão do vector devolvido no arranque (`len(emb.embed_query("teste")) == 768`): um modelo com outra dimensão rebenta o `INSERT`, mas só na primeira ingestão, não no arranque.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — tipos e armazenamento', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Ollama — Embeddings', url: 'https://docs.ollama.com/capabilities/embeddings' },
          ],
        },
      ],
    },
  ],

  /* ==================================================================== quiz */
  quiz: [
    {
      id: 'q-embeddings-01',
      topic: 'similaridade',
      prompt: 'Os vectores do teu modelo têm norma 1. Qual destas afirmações é verdadeira?',
      options: [
        'Ordenar por cosseno e por distância L2 pode dar rankings diferentes.',
        'Ordenar por cosseno decrescente, produto interno decrescente e L2 crescente dá o mesmo ranking.',
        'O produto interno é sempre maior do que o cosseno.',
        'A distância L2 entre dois vectores normalizados está entre 0 e 1.',
      ],
      answer: [1],
      explain:
        'Com norma 1, `‖a − b‖² = 2 − 2cos` e `a · b = cos`: as três ordenações coincidem. A distância L2 entre vectores unitários vai de 0 a 2 (opostos). Por isso, com vectores normalizados, a escolha do operador é de desempenho e de consistência com o índice, não de qualidade.',
    },
    {
      id: 'q-embeddings-02',
      topic: 'versões',
      prompt: 'Trocaste `BALCAO_MODELO_EMBEDDINGS` para um modelo novo com as mesmas 768 dimensões e fizeste deploy, sem reindexar. O que acontece?',
      options: [
        'O `INSERT` falha por incompatibilidade de dimensões.',
        'As pesquisas devolvem resultados com scores normais e ordem praticamente aleatória, sem nenhum erro.',
        'O pgvector converte os vectores antigos para o espaço novo.',
        'As pesquisas ficam vazias por causa do filtro `modelo_embedding`.',
      ],
      answer: [1, 3],
      explain:
        'Depende de a consulta filtrar por modelo. Sem filtro, a pergunta (modelo novo) é comparada com chunks do modelo antigo: espaços diferentes, mesma dimensão, resultados com aspecto normal e sem sentido. Com o filtro `modelo_embedding = novo` da `pesquisa_hibrida`, não há linhas desse modelo e a pesquisa densa fica vazia (a lexical continua a responder). As duas são respostas possíveis consoante o desenho; o filtro torna a falha visível, que é o objectivo.',
    },
    {
      id: 'q-embeddings-03',
      topic: 'semântico',
      prompt: 'Em que perguntas esperas que a pesquisa lexical ganhe à densa? (duas respostas)',
      options: [
        '«O reembolso RB-873353 já foi processado?»',
        '«Esqueci o guarda-chuva com o motoqueiro»',
        '«O estafeta tem troco para 2000?»',
        '«Tive um problema com a comida»',
      ],
      answer: [0, 2],
      explain:
        'Códigos e números exactos são termos raros que o BM25 pesa muito; num vector, dissolvem-se entre números parecidos. Paráfrases sem palavras em comum e perguntas vagas são o terreno do denso. Tendência a confirmar no dourado.',
    },
    {
      id: 'q-embeddings-04',
      topic: 'treino',
      prompt: 'Porque é que os negativos difíceis melhoram um modelo de embeddings mais do que os aleatórios?',
      options: [
        'Porque aumentam o tamanho do batch.',
        'Porque obrigam o modelo a separar textos parecidos mas errados, que é onde a pesquisa falha; os aleatórios já estão longe.',
        'Porque reduzem a temperatura τ.',
        'Porque tornam o modelo multilingue.',
      ],
      answer: [1],
      explain:
        'Com negativos aleatórios, a perda InfoNCE fica perto de zero depressa: `pol-gorjetas` nunca competiu com a resposta a uma pergunta sobre cancelamentos. O sinal de treino está nos negativos próximos, como `pol-cancelamento-cliente` para «o restaurante cancelou».',
    },
    {
      id: 'q-embeddings-05',
      topic: 'prefixos',
      prompt: 'Com `nomic-embed-text`, a ingestão usa `search_document:` e a pesquisa não usa prefixo. Como detectas o problema?',
      options: [
        'O Ollama devolve um erro de validação.',
        'As dimensões do vector de pergunta ficam diferentes.',
        'Só pelo recall@k no conjunto dourado, ou por um teste que verifica o prefixo nos dois caminhos.',
        'Os cossenos passam a ser negativos.',
      ],
      answer: [2],
      explain:
        'Nada no sistema falha: os vectores têm 768 números e norma 1, os scores parecem razoáveis. É um defeito de qualidade que só a avaliação ou um teste explícito apanha, e por isso o prefixo deve viver numa só camada (`embed_query` e `embed_documents`).',
    },
    {
      id: 'q-embeddings-06',
      topic: 'Matryoshka',
      prompt: 'Queres reduzir a memória do índice de um corpus muito grande. Que opções preservam melhor a qualidade? (duas respostas)',
      options: [
        'Cortar para 256 dimensões um modelo treinado com Matryoshka e renormalizar.',
        'Cortar para 256 dimensões qualquer modelo de 768 e renormalizar.',
        'Pesquisar com vectores reduzidos e re-ordenar os candidatos com os vectores completos.',
        'Trocar cosseno por L2.',
      ],
      answer: [0, 2],
      explain:
        'Só os modelos treinados para isso aguentam o corte com perda pequena (o run 4 mostra o que acontece com um que não foi: recall@3 de 0,900 para 0,650 com 64 dimensões). A pesquisa em duas fases recupera quase toda a precisão. Trocar a medida não muda a memória.',
    },
    {
      id: 'q-embeddings-07',
      topic: 'custo',
      prompt: 'Qual é, no «Balcão», o custo dominante de trocar de modelo de embeddings?',
      options: [
        'Os tokens para reindexar os 1 870 chunks por API.',
        'O armazenamento duplicado durante a migração.',
        'A engenharia: avaliar no dourado, recalibrar o limiar de recusa, invalidar a cache semântica, e o risco de misturar espaços.',
        'O tempo de CPU das pesquisas.',
      ],
      answer: [2],
      explain:
        'Reindexar custa ≈ 0,18 MZN por API e o armazenamento extra são ≈ 6 MB. O caro é tudo o que depende dos scores e do espaço: limiares, caches, avaliações. É por isso que a troca é tratada como um deploy com versão por linha.',
    },
    {
      id: 'q-embeddings-08',
      topic: 'bi-encoder',
      prompt: 'Porque é que o «Balcão» usa um bi-encoder para a primeira fase e um cross-encoder só para os 20 primeiros?',
      options: [
        'Porque o cross-encoder não funciona em português.',
        'Porque o bi-encoder permite pré-calcular os vectores dos documentos e usar um índice; o cross-encoder precisa de um passo de modelo por par e só é viável em poucos candidatos.',
        'Porque o bi-encoder é mais preciso.',
        'Porque o pgvector não aceita scores de cross-encoders.',
      ],
      answer: [1],
      explain:
        'A primeira fase compara uma pergunta com todos os chunks: tem de ser barata por par, e só o bi-encoder o é. O cross-encoder é mais preciso por candidato mas custa ≈ 180 ms para 20 pares no orçamento de latência; aplicado a 1 870 chunks seria segundos.',
    },
  ],

  /* =============================================================== exercícios */
  exercises: [
    {
      id: 'e-embeddings-01',
      title: 'Tamanho do índice com halfvec',
      kind: 'input',
      statement:
        'O «Balcão» tem ≈ 1 870 chunks de 768 dimensões. Quantos MB de vectores ocupam em `halfvec` (2 bytes por dimensão)? Arredonda a duas casas decimais, sem contar o cabeçalho de 8 bytes por linha.',
      accept: ['2,87', '2.87', '2,87 mb', '2.87 mb'],
      hint: '1 870 × 768 × 2 bytes.',
      solution:
        '1 870 × 768 × 2 = 2 872 320 bytes ≈ 2,87 MB, metade dos 5,74 MB em `vector`. Para este tamanho não muda nada; a decisão só pesa com milhões de vectores.',
      difficulty: 1,
    },
    {
      id: 'e-embeddings-02',
      title: 'Calibrar o limiar de relevância',
      kind: 'open',
      statement:
        'Vais trocar de modelo de embeddings. Descreve como recalibras o limiar abaixo do qual o «Balcão» recusa responder, que dados usas e que métricas olhas.',
      hint: 'As 40 perguntas fora de âmbito do dourado de produção existem para isto.',
      solution:
        'Correr as 240 perguntas douradas (200 com documento relevante, 40 fora de âmbito) com o modelo novo e registar o score do primeiro resultado (no «Balcão», o score de re-ranking; se o limiar for sobre o cosseno, o cosseno). Traçar as duas distribuições e escolher o limiar que maximiza recusas correctas (RF-05, ≥ 90%) sem recusar perguntas com resposta, olhando para o custo assimétrico: inventar é pior do que recusar. Validar com intervalo de confiança por bootstrap e registar o limiar ao lado do `modelo_embedding` na configuração, porque um não serve sem o outro.',
      difficulty: 2,
    },
    {
      id: 'e-embeddings-03',
      title: 'Desenhar a reindexação',
      kind: 'design',
      statement:
        'Escreve o plano (passos, SQL principal, critério de promoção e de reversão) para passar do `nomic-embed-text` para outro modelo multilingue de 768 dimensões sem parar o serviço.',
      hint: 'A coluna `modelo_embedding` e o filtro na `pesquisa_hibrida` fazem quase tudo.',
      solution:
        '1) Configurar o job de ingestão com o modelo B e `modelo_embedding = \'B\'`; ingerir todos os documentos (a verificação de hash considera o modelo). 2) Confirmar contagens: `SELECT modelo_embedding, count(*) FROM chunks GROUP BY 1` com A e B iguais. 3) Avaliar: correr o dourado com `modelo = B` na `pesquisa_hibrida`; critério recall@5 e MRR por intenção sem regressão, recusa correcta com o limiar recalibrado. 4) Deploy que muda, em conjunto, o modelo da pergunta, o filtro e o limiar. 5) Canário 10% durante 24 h. 6) Reversão: voltar a configuração (as linhas A continuam lá). 7) Depois de uma semana, `DELETE FROM chunks WHERE modelo_embedding = \'A\'` e invalidar a cache semântica.',
      difficulty: 2,
    },
    {
      id: 'e-embeddings-04',
      title: 'Top-k exacto com NumPy',
      kind: 'code',
      statement:
        'Com `balcao.embed_lote` e `balcao.embed`, escreve uma função `top_k(pergunta, textos, k)` que devolve os índices e os cossenos dos k textos mais próximos, usando uma só multiplicação de matrizes. Explica porque é que não precisas de dividir pelas normas.',
      hint: '`embed` já devolve vectores de norma 1.',
      solution:
        '`M = b.embed_lote(textos); q = b.embed(pergunta); s = M @ q; idx = np.argsort(-s)[:k]; return [(int(i), round(float(s[i]), 3)) for i in idx]`. Como todos os vectores têm norma 1, `M @ q` é directamente o vector de cossenos; é o que o índice exacto do `balcao` faz, e o que a pesquisa exacta do pgvector faz sem índice.',
      difficulty: 1,
    },
  ],

  /* ==================================================================== labs */
  labs: [
    {
      id: 'lab-embeddings-01',
      moduleId: 'embeddings',
      title: 'Pesquisa densa exacta, vectorizada',
      brief:
        'Completa `procurar` para devolver os k chunks mais próximos da pergunta com uma só multiplicação de matrizes (`M @ q`), sem ciclos Python sobre os chunks, desempatando pela ordem dos índices.',
      lang: 'python',
      starter: `import numpy as np

import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
M = b.embed_lote([c.texto for c in CHUNKS])


def procurar(pergunta: str, k: int = 3) -> list[tuple[str, float]]:
    q = b.embed(pergunta)
    resultados = []
    for c in CHUNKS:
        resultados.append((c.id, b.cosseno(b.embed(c.texto), q)))
    return resultados[:k]


print(procurar("Posso juntar dois cupões no mesmo pedido?"))
`,
      checks: [
        { id: 'c1', label: 'Uma multiplicação de matrizes', re: 'M\\s*@\\s*q|np\\.dot\\(\\s*M\\s*,\\s*q\\s*\\)', why: 'Com vectores normalizados, `M @ q` são todos os cossenos de uma vez.' },
        { id: 'c2', label: 'Ordena por score decrescente', re: 'argsort\\(\\s*-|sorted\\([^)]*-', why: 'Os k melhores são os de maior cosseno.' },
        { id: 'c3', label: 'Não recalcula embeddings dos chunks por pergunta', re: 'for\\s+c\\s+in\\s+CHUNKS[\\s\\S]*embed\\(c\\.texto', forbid: true, why: 'Os vectores dos documentos calculam-se uma vez, na ingestão; recalculá-los por pergunta é o erro que um índice existe para evitar.' },
      ],
      hints: [
        '`s = M @ q` dá um array com um cosseno por chunk.',
        '`idx = np.argsort(-s, kind="stable")[:k]` e depois `[(CHUNKS[i].id, round(float(s[i]), 4)) for i in idx]`.',
      ],
      solution: `import numpy as np

import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
M = b.embed_lote([c.texto for c in CHUNKS])


def procurar(pergunta: str, k: int = 3) -> list[tuple[str, float]]:
    q = b.embed(pergunta)
    s = M @ q
    idx = np.argsort(-s, kind="stable")[:k]
    return [(CHUNKS[i].id, round(float(s[i]), 4)) for i in idx]


print(procurar("Posso juntar dois cupões no mesmo pedido?"))`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-embeddings-02',
      moduleId: 'embeddings',
      title: 'Prefixos numa só camada',
      brief:
        'A ingestão e a pesquisa chamam o `OllamaEmbeddings` directamente e o prefixo só aparece num sítio. Escreve uma classe `ComPrefixos(Embeddings)` que aplica `search_document: ` em `embed_documents` e `search_query: ` em `embed_query`, e usa-a nos dois caminhos.',
      lang: 'python',
      starter: `from langchain_ollama import OllamaEmbeddings

emb = OllamaEmbeddings(model="nomic-embed-text")

vectores_chunks = emb.embed_documents(["search_document: " + t for t in textos_chunks])
vector_pergunta = emb.embed_query(pergunta)
`,
      checks: [
        { id: 'c1', label: 'Subclasse de `Embeddings`', re: 'class\\s+\\w+\\(\\s*Embeddings\\s*\\)', why: 'Uma classe com a interface do LangChain entra em qualquer vector store e retriever.' },
        { id: 'c2', label: 'Prefixo de documento em `embed_documents`', re: 'def\\s+embed_documents[\\s\\S]*search_document: ', why: 'Todos os chunks passam por aqui na ingestão.' },
        { id: 'c3', label: 'Prefixo de pergunta em `embed_query`', re: 'def\\s+embed_query[\\s\\S]*search_query: ', why: 'Sem ele, o modelo trata a pergunta como documento e o recall desce sem erro.' },
        { id: 'c4', label: 'Nenhum prefixo concatenado fora da classe', re: '^emb\\w*\\.embed_documents\\(\\s*\\[\\s*["\']search_', flags: 'm', forbid: true, why: 'Um prefixo aplicado no chamador é um prefixo que alguém vai esquecer no outro caminho.' },
      ],
      hints: [
        '`from langchain_core.embeddings import Embeddings`.',
        'Guarda o `OllamaEmbeddings` como `self.base` e delega nele depois de juntar o prefixo.',
      ],
      solution: `from langchain_core.embeddings import Embeddings
from langchain_ollama import OllamaEmbeddings


class ComPrefixos(Embeddings):
    def __init__(self, base: Embeddings) -> None:
        self.base = base

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.base.embed_documents(["search_document: " + t for t in texts])

    def embed_query(self, text: str) -> list[float]:
        return self.base.embed_query("search_query: " + text)


emb = ComPrefixos(OllamaEmbeddings(model="nomic-embed-text"))
vectores_chunks = emb.embed_documents(textos_chunks)
vector_pergunta = emb.embed_query(pergunta)
`,
      difficulty: 1,
    },
    {
      id: 'lab-embeddings-03',
      moduleId: 'embeddings',
      title: 'Consulta densa que não mistura modelos',
      brief:
        'A consulta abaixo compara a pergunta com todos os chunks, de qualquer modelo, e ignora os filtros de negócio. Reescreve-a para filtrar por `modelo_embedding`, `vigente` e `publico`, ordenar pela distância de cosseno (o operador do índice) e limitar a k.',
      lang: 'sql',
      starter: `SELECT c.id, 1 - (c.embedding <#> :vector) AS score
FROM chunks c
ORDER BY score DESC;
`,
      checks: [
        { id: 'c1', label: 'Filtra pelo modelo de embeddings', re: 'modelo_embedding\\s*=', why: 'Sem este filtro, uma reindexação a meio mistura dois espaços vectoriais.' },
        { id: 'c2', label: 'Usa o operador de cosseno do índice', re: 'ORDER\\s+BY\\s+c\\.embedding\\s*<=>', flags: 'i', why: 'O índice HNSW foi criado com `vector_cosine_ops`: só `ORDER BY embedding <=> ...` o usa.' },
        { id: 'c3', label: 'Tem LIMIT', re: 'LIMIT\\s+(:k|\\d+)', flags: 'i', why: 'Sem LIMIT o planeador não usa o índice ANN e devolve a tabela inteira.' },
        { id: 'c4', label: 'Filtros de vigência e público', re: 'vigente[\\s\\S]*publico|publico[\\s\\S]*vigente', why: 'Os filtros vão na base de dados, antes do ranking (adr-0010).' },
      ],
      hints: [
        '`JOIN documentos d ON d.id = c.documento_id` para ter `vigente` e `publico`.',
        'Ordena pela expressão `c.embedding <=> :vector` e calcula o score como `1 - (c.embedding <=> :vector)` na lista de colunas.',
      ],
      solution: `SELECT c.id, 1 - (c.embedding <=> :vector) AS score
FROM chunks c
JOIN documentos d ON d.id = c.documento_id
WHERE c.modelo_embedding = :modelo
  AND d.vigente
  AND d.publico = ANY (:publicos)
ORDER BY c.embedding <=> :vector
LIMIT :k;
`,
      difficulty: 2,
    },
  ],

  /* =============================================================== casos de uso */
  useCases: [
    {
      id: 'uc-embeddings-01',
      title: 'Operador de telecomunicações: agrupar reclamações por tema',
      area: 'telecomunicações',
      level: 2,
      scenario:
        'Um operador móvel em Moçambique recebe ≈ 15 000 reclamações por semana por SMS, WhatsApp e aplicação, em português com inglês e changana misturados. A equipa de qualidade quer ver, todas as segundas, os temas que cresceram (falhas de rede numa zona, cobranças de pacotes, portabilidade) sem ler as mensagens uma a uma, e ligar cada tema às FAQs existentes.',
      requirements: [
        'Temas semanais com exemplos representativos e contagem, comparados com a semana anterior.',
        'Ligação de cada tema à FAQ mais próxima, ou marca «sem FAQ» para o produto escrever uma.',
        'Números de telefone e nomes nunca enviados para fora nem guardados nos vectores.',
      ],
      constraints: [
        'Texto curto e ruidoso: abreviaturas de SMS, código misto, erros ortográficos.',
        'Equipa de dados pequena; tem de correr num job semanal simples.',
      ],
      approach: [
        { title: 'Mascarar, depois vectorizar', text: 'Telefones, nomes e NUIT substituídos por `[TIPO]` antes do embedding, como a guarda do «Balcão». O vector é derivado do texto: se o texto tem PII, o vector também a codifica em parte.' },
        { title: 'Modelo multilingue com prefixo de agrupamento', text: 'Um modelo de embeddings multilingue local, com o prefixo da tarefa de agrupamento (`clustering: ` no caso da família nomic). O modelo escolheu-se medindo a pureza dos grupos em 500 mensagens anotadas pela equipa.' },
        { title: 'Agrupar e nomear', text: 'Agrupamento (k-means ou HDBSCAN) sobre os vectores normalizados; para cada grupo, as 5 mensagens mais próximas do centróide vão a um modelo pequeno que propõe um nome de tema, validado por uma pessoa.' },
        { title: 'Ligar a FAQs', text: 'Cosseno entre o centróide do grupo e os embeddings das FAQs (com o prefixo de documento); abaixo de um limiar calibrado, «sem FAQ».' },
      ],
      diagram: {
        title: 'Temas semanais de reclamações',
        cols: 5,
        rows: 2,
        zones: [
          { id: 'job', label: 'Job semanal (interno)', col: 0, row: 0, colSpan: 4, rowSpan: 2, tone: 'async' },
        ],
        nodes: [
          { id: 'msgs', label: 'Reclamações', sub: '≈ 15 000/semana', col: 0, row: 0, kind: 'data' },
          { id: 'mask', label: 'Mascarar PII', col: 1, row: 0, kind: 'service' },
          { id: 'emb', label: 'Embeddings', sub: 'multilingue, local', col: 2, row: 0, kind: 'model' },
          { id: 'clu', label: 'Agrupar', sub: 'k-means / HDBSCAN', col: 3, row: 0, kind: 'service' },
          { id: 'faq', label: 'FAQs vectorizadas', col: 2, row: 1, kind: 'vector' },
          { id: 'nome', label: 'Nomear tema', sub: 'modelo pequeno + revisão', col: 3, row: 1, kind: 'model' },
          { id: 'painel', label: 'Painel de qualidade', col: 4, row: 1, kind: 'user' },
        ],
        edges: [
          { from: 'msgs', to: 'mask' },
          { from: 'mask', to: 'emb' },
          { from: 'emb', to: 'clu' },
          { from: 'clu', to: 'nome' },
          { from: 'faq', to: 'nome', label: 'cosseno ao centróide' },
          { from: 'nome', to: 'painel' },
        ],
      },
      solution:
        'Embeddings locais com o prefixo certo para agrupar, PII mascarada antes de vectorizar, grupos nomeados por um modelo pequeno e revistos por uma pessoa, e ligação às FAQs por cosseno com limiar calibrado.',
      tools: [
        { name: 'Sentence Transformers ou Ollama', role: 'Embeddings multilingues locais' },
        { name: 'NumPy / scikit-learn', role: 'Normalização e agrupamento' },
        { name: 'PostgreSQL + pgvector', role: 'Vectores das FAQs e histórico de centróides por semana' },
      ],
      rejected: [
        { option: 'Contar palavras-chave por tema', why: 'Falha no código misto e nas abreviaturas; «sem rede», «n tem net» e «network down» ficavam em temas diferentes.' },
        { option: 'Mandar todas as mensagens a um LLM para classificar', why: '15 000 chamadas por semana, temas fixos à partida e PII enviada para fora; o objectivo é descobrir temas novos.' },
      ],
      costNote:
        'Embeddings locais: custo de CPU de um job semanal. O único custo por token é o de nomear algumas dezenas de grupos num modelo pequeno.',
      takeaways: [
        'Embeddings servem para agrupar e comparar, não só para RAG, e cada tarefa pode ter o seu prefixo.',
        'Mascarar antes de vectorizar: o vector herda o que está no texto.',
        'A qualidade do modelo mede-se na tarefa (pureza dos grupos), não num ranking genérico.',
      ],
      refs: [
        { label: 'Sentence Transformers — documentação', url: 'https://sbert.net/' },
        { label: 'Muennighoff et al. — MTEB (2022)', url: 'https://arxiv.org/abs/2210.07316' },
      ],
    },
  ],
};
