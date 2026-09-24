import type { Module } from '../types';

export const m08: Module = {
  id: 'bases-vectoriais',
  number: 8,
  part: 'rag',
  title: 'Bases de dados vectoriais',
  subtitle: 'kNN exacto, IVF e HNSW, quantização, filtros e pgvector: o que muda de 2 mil para mil milhões de vectores',
  icon: '🗄️',
  minutes: 100,
  tags: ['pgvector', 'HNSW', 'IVF', 'quantização', 'filtros', 'Qdrant'],
  goals: [
    'Distinguir pesquisa exacta de pesquisa aproximada (ANN), medir o recall de um índice contra a exacta e decidir quando um índice é necessário.',
    'Explicar IVF (listas e sondas) e HNSW (M, ef_construction, ef_search) ao ponto de prever o efeito de cada parâmetro no recall, na latência, na memória e nas inserções.',
    'Escolher entre `vector`, `halfvec`, quantização binária com re-scoring e product quantization, sabendo o que cada uma custa em recall.',
    'Usar o pgvector 0.8 a sério: tipos, operadores, opclasses, `SET LOCAL hnsw.ef_search`, iterative index scans, índices parciais e partições.',
    'Aplicar filtros de metadados antes do top-k (pré-filtro) e reconhecer o pós-filtro que devolve menos de k resultados ou cita políticas substituídas.',
    'Comparar pgvector com Qdrant, Milvus e serviços geridos, e dimensionar o «Balcão» (5,7 MB) com argumentos de operação e não de escala.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'knn-ann',
      title: 'kNN exacto contra ANN: quando é que precisas de um índice?',
      blocks: [
        {
          type: 'p',
          text:
            'Uma pesquisa vectorial devolve os k vectores mais próximos da pergunta. A forma exacta (kNN, *flat*, *brute force*) compara a pergunta com todos os n vectores: n × d multiplicações. Com os ≈ 1 870 chunks de 768 dimensões do «Balcão» são ≈ 1,4 milhões de multiplicações por pergunta, menos de um milissegundo num CPU moderno. Com 10 milhões de vectores são 7,7 mil milhões, e aí a pesquisa exacta deixa de caber num orçamento de 45 ms.',
        },
        {
          type: 'p',
          text:
            'Os índices ANN (*approximate nearest neighbours*) trocam exactidão por velocidade: visitam uma fracção dos vectores e devolvem quase sempre os mesmos k que a pesquisa exacta. «Quase sempre» mede-se, e a métrica é o recall do índice contra a pesquisa exacta, que não é o mesmo que o recall de recuperação do módulo 21 (esse mede contra documentos relevantes anotados por humanos).',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-bases-vectoriais-01',
            title: 'Recall de um índice ANN',
            expr: 'recall@k(ANN) = | ANN_k(q) ∩ Exacto_k(q) | / k        (média sobre um conjunto de perguntas)',
            where: [
              { sym: 'ANN_k(q)', means: 'os k chunks que o índice HNSW (ou IVF) devolve para a pergunta q' },
              { sym: 'Exacto_k(q)', means: 'os k chunks que a pesquisa exacta devolve (sem índice, `SET enable_indexscan = off` ou `IndiceExacto`)' },
              { sym: 'k', means: 'o número de candidatos pedidos: 20 na primeira fase do «Balcão»' },
            ],
            reading: 'A fracção dos vizinhos verdadeiros que o índice encontrou; 1,0 é igual à pesquisa exacta.',
            note: 'A validação da adr-0005 e da adr-0006 é este número acima de 0,99, medido todos os meses com e sem filtros sobre as perguntas douradas. Mede-o com o mesmo `ef_search` e os mesmos filtros da produção.',
          },
        },
        {
          type: 'table',
          head: ['Vectores (768 d)', 'Memória em `vector`', 'Pesquisa exacta', 'Recomendação'],
          rows: [
            ['até ≈ 100 mil', 'até ≈ 300 MB', 'milissegundos a dezenas de ms', 'Exacta chega; um índice só por hábito ou por filtros'],
            ['100 mil a 10 milhões', '0,3 a 31 GB', 'dezenas de ms a segundos', 'HNSW no pgvector ou num motor dedicado'],
            ['10 milhões a mil milhões', '31 GB a 3 TB', 'inviável online', 'Quantização, partições ou sharding; motor dedicado'],
          ],
          caption: 'Ordens de grandeza, não benchmarks: dependem do CPU, da memória disponível e dos filtros. O «Balcão» está confortavelmente na primeira linha.',
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-bases-vectoriais-01',
            title: 'Preciso de um índice ANN?',
            start: 'q1',
            nodes: [
              { id: 'q1', question: 'A pesquisa exacta, com os teus filtros, cabe no orçamento de latência no p95?', options: [{ label: 'Sim', next: 'q2' }, { label: 'Não', next: 'q3' }] },
              { id: 'q2', question: 'O corpus vai crescer duas ordens de grandeza no próximo ano?', options: [{ label: 'Não', next: 'exacto' }, { label: 'Sim', next: 'hnsw' }] },
              { id: 'q3', question: 'As inserções são contínuas (ingestão incremental)?', options: [{ label: 'Sim', next: 'hnsw' }, { label: 'Não: carga em lote, rara', next: 'ivf' }] },
              { id: 'exacto', answer: 'Sem índice ANN', detail: 'Recall perfeito, nada para afinar. Um índice B-tree nos filtros ajuda mais do que um ANN.' },
              { id: 'hnsw', answer: 'HNSW', detail: 'O caso do «Balcão» (adr-0006): recall alto sem reconstrução, inserções incrementais. Paga memória e tempo de construção.' },
              { id: 'ivf', answer: 'IVFFlat (ou HNSW se a memória chegar)', detail: 'Construção rápida e pouca memória; reconstrói depois de cada carga grande para as listas acompanharem os dados.' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Porque é que o «Balcão» tem um índice HNSW com 1 870 vectores',
          text:
            'Pela decisão, não pela necessidade de hoje: o índice custa quase nada a este tamanho, deixa o padrão de consulta pronto para o corpus crescer (RF-07) e obriga a equipa a medir o recall contra a exacta desde o primeiro dia. Se o corpus ficar pequeno para sempre, apagar o índice é uma migração de uma linha.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Medir o recall do índice no próprio PostgreSQL: a mesma consulta com e sem índice, na mesma transacção.',
          code: `BEGIN;
SET LOCAL hnsw.ef_search = 100;
CREATE TEMP TABLE ann AS
  SELECT id FROM chunks ORDER BY embedding <=> :q LIMIT 20;      -- usa o HNSW

SET LOCAL enable_indexscan = off;                                  -- força a pesquisa exacta
CREATE TEMP TABLE exacto AS
  SELECT id FROM chunks ORDER BY embedding <=> :q LIMIT 20;

SELECT count(*)::float / 20 AS recall_at_20 FROM ann JOIN exacto USING (id);
ROLLBACK;`,
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — Querying e índices', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Johnson, Douze e Jégou — Billion-scale similarity search with GPUs (2017)', url: 'https://arxiv.org/abs/1702.08734' },
            { label: 'ANN-Benchmarks', url: 'https://github.com/erikbern/ann-benchmarks' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'ivf-hnsw',
      title: 'IVF e HNSW por dentro',
      blocks: [
        {
          type: 'p',
          text:
            '**IVF** (*inverted file*) corre k-means sobre os vectores e parte o espaço em `lists` células, cada uma com um centróide. Numa pesquisa, compara a pergunta com os centróides, escolhe as `probes` células mais próximas e só compara com os vectores dessas células. Poucas sondas: rápido e com recall baixo, porque o vizinho verdadeiro pode estar na célula ao lado. Todas as sondas: pesquisa exacta mais o custo dos centróides. No pgvector o ponto de partida recomendado é `lists = linhas / 1000` até um milhão de linhas e `probes = sqrt(lists)`.',
        },
        {
          type: 'run',
          run: {
            id: 'run-bases-vectoriais-01',
            title: 'IVF: sondas contra recall',
            brief: '`IndiceIVF` do `balcao` com 8 listas sobre os 46 chunks da amostra, recall@5 contra a pesquisa exacta nas 30 perguntas douradas. As comparações são as da primeira pergunta e incluem os 8 centróides.',
            code: `import balcao as b

chunks = b.chunkar_corpus("recursivo")
exacto = b.IndiceExacto(chunks)

def recall_vs_exacto(indice, k=5):
    r = []
    for p in b.PERGUNTAS:
        verdade = {c.id for c, _ in exacto.procurar(p["pergunta"], k)}
        obtido = {c.id for c, _ in indice.procurar(p["pergunta"], k)}
        r.append(len(verdade & obtido) / k)
    return sum(r) / len(r)

exacto.procurar("teste", 5)
print(f"exacto       comparações={exacto.comparacoes:3d} recall@5=1.000")
for sondas in (1, 2, 4, 8):
    ivf = b.IndiceIVF(chunks, n_listas=8, n_sondas=sondas)
    rec = recall_vs_exacto(ivf)
    ivf.procurar(b.PERGUNTAS[0]["pergunta"], 5)
    print(f"IVF sondas={sondas} comparações={ivf.comparacoes:3d} recall@5={rec:.3f}")`,
            expected: `exacto       comparações= 46 recall@5=1.000
IVF sondas=1 comparações= 25 recall@5=0.460
IVF sondas=2 comparações= 30 recall@5=0.707
IVF sondas=4 comparações= 40 recall@5=0.933
IVF sondas=8 comparações= 54 recall@5=1.000`,
          },
        },
        {
          type: 'p',
          text:
            'Com 8 sondas em 8 listas o IVF faz **mais** comparações do que a exacta (46 vectores mais 8 centróides) para o mesmo resultado: a um corpus deste tamanho, um índice é pura sobrecarga. E há um defeito estrutural que a amostra não mostra: os centróides são calculados sobre os dados que existem na construção. Com inserções contínuas, os documentos novos caem em células desenhadas para outro corpus, as listas desequilibram-se e o recall degrada até se reconstruir o índice. Foi isto que decidiu a adr-0006.',
        },
        { type: 'adr', ref: 'adr-0006' },
        {
          type: 'p',
          text:
            '**HNSW** (*Hierarchical Navigable Small World*) é um grafo: cada vector é um nó ligado aos seus vizinhos próximos. A pesquisa começa num ponto de entrada e anda gulosamente para o vizinho mais perto da pergunta, mantendo uma lista dos `ef_search` melhores candidatos até não conseguir melhorar. A hierarquia são camadas: a camada 0 tem todos os nós, cada camada acima tem uma fracção exponencialmente menor, e as camadas altas funcionam como autoestradas que levam depressa à zona certa antes de descer ao detalhe.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-bases-vectoriais-02',
            title: 'Camada de um nó novo no HNSW',
            expr: 'nível = ⌊ −ln(U) · mL ⌋,   U ~ Uniforme(0, 1),   mL = 1 / ln(M)',
            where: [
              { sym: 'M', means: 'número máximo de ligações por nó e por camada (`m`, 16 por omissão no pgvector; a camada 0 guarda até 2·M)' },
              { sym: 'mL', means: 'factor de normalização dos níveis; com M = 16, ≈ 0,36' },
              { sym: 'nível', means: 'a camada mais alta onde o nó entra; com M = 16, ≈ 1 em 16 nós chega à camada 1, ≈ 1 em 256 à camada 2' },
            ],
            reading: 'Cada nó novo sorteia a altura; poucos sobem, e é isso que dá à pesquisa um custo que cresce com o logaritmo do número de vectores.',
            note: 'Da secção 4 do artigo de Malkov e Yashunin. `ef_construction` é o `ef` usado ao inserir: quantos candidatos se consideram para escolher os M vizinhos.',
          },
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Uma pesquisa HNSW em três camadas',
            caption: 'A pergunta entra no topo, desce quando já não melhora na camada actual, e na camada 0 explora com uma lista de `ef_search` candidatos.',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'l2', label: 'Camada 2 (≈ n/256 nós)', col: 0, row: 0, colSpan: 5, rowSpan: 1, tone: 'neutral' },
              { id: 'l1', label: 'Camada 1 (≈ n/16)', col: 0, row: 1, colSpan: 5, rowSpan: 1, tone: 'rag' },
              { id: 'l0', label: 'Camada 0 (todos, até 2·M ligações)', col: 0, row: 2, colSpan: 5, rowSpan: 1, tone: 'data' },
            ],
            nodes: [
              { id: 'e', label: 'Entrada', sub: 'nó do topo', col: 0, row: 0, kind: 'vector' },
              { id: 'a2', label: 'Nó A', col: 2, row: 0, kind: 'vector' },
              { id: 'a1', label: 'Nó A', col: 2, row: 1, kind: 'vector' },
              { id: 'b1', label: 'Nó B', col: 3, row: 1, kind: 'vector' },
              { id: 'b0', label: 'Nó B', col: 3, row: 2, kind: 'vector' },
              { id: 'c0', label: 'Vizinhos de B', sub: 'ef_search candidatos', col: 4, row: 2, kind: 'vector' },
              { id: 'q', label: 'Pergunta', sub: 'vector(768)', col: 0, row: 2, kind: 'user' },
            ],
            edges: [
              { from: 'e', to: 'a2', label: 'guloso' },
              { from: 'a2', to: 'a1', label: 'desce', style: 'dashed' },
              { from: 'a1', to: 'b1', label: 'guloso' },
              { from: 'b1', to: 'b0', label: 'desce', style: 'dashed' },
              { from: 'b0', to: 'c0', label: 'explora' },
              { from: 'q', to: 'e', style: 'dashed' },
            ],
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-bases-vectoriais-02',
            title: 'A camada 0 do HNSW em 40 linhas: M e ef_search',
            brief: 'Um grafo navegável de uma camada sobre 2 000 vectores aleatórios de 32 dimensões (semente fixa), com pesquisa gulosa e lista de `ef` candidatos. Não é o HNSW do pgvector (sem camadas, sem a heurística de escolha de vizinhos), mas mostra os dois botões e o seu preço.',
            code: `import numpy as np

# Um grafo navegável de uma só camada (a camada 0 do HNSW), em 40 linhas.
rng = np.random.default_rng(7)
X = rng.normal(size=(2000, 32)); X /= np.linalg.norm(X, axis=1, keepdims=True)
Q = rng.normal(size=(50, 32)); Q /= np.linalg.norm(Q, axis=1, keepdims=True)

def construir(M: int) -> list[list[int]]:
    viz = [[] for _ in range(len(X))]
    for i in range(1, len(X)):                     # inserção incremental
        s = X[:i] @ X[i]
        for j in np.argsort(-s)[:M]:               # liga aos M mais próximos já inseridos
            viz[i].append(int(j)); viz[int(j)].append(i)
    return viz

def procurar(viz, q, ef: int, k: int = 10):
    entrada = 0
    visto, comparacoes = {entrada}, 1
    cand = [(float(X[entrada] @ q), entrada)]      # fronteira a explorar
    melhores = list(cand)                          # os ef melhores até agora
    while cand:
        cand.sort(); s, n = cand.pop()             # o candidato mais próximo
        if len(melhores) >= ef and s < min(melhores)[0]:
            break                                  # já não há como melhorar
        for v in viz[n]:
            if v not in visto:
                visto.add(v); comparacoes += 1
                sv = float(X[v] @ q)
                cand.append((sv, v)); melhores.append((sv, v))
                melhores = sorted(melhores, reverse=True)[:ef]
    return [n for _, n in sorted(melhores, reverse=True)[:k]], comparacoes

for M in (4, 16):
    viz = construir(M)
    for ef in (10, 40, 100):
        rec, comp = [], []
        for q in Q:
            verdade = set(np.argsort(-(X @ q))[:10].tolist())
            achados, c = procurar(viz, q, ef)
            rec.append(len(verdade & set(achados)) / 10); comp.append(c)
        print(f"M={M:2d} ef_search={ef:3d}  recall@10={np.mean(rec):.3f}  comparações≈{np.mean(comp):5.0f} de 2000")`,
            expected: `M= 4 ef_search= 10  recall@10=0.410  comparações≈  138 de 2000
M= 4 ef_search= 40  recall@10=0.742  comparações≈  307 de 2000
M= 4 ef_search=100  recall@10=0.894  comparações≈  574 de 2000
M=16 ef_search= 10  recall@10=0.786  comparações≈  381 de 2000
M=16 ef_search= 40  recall@10=0.962  comparações≈  783 de 2000
M=16 ef_search=100  recall@10=0.998  comparações≈ 1241 de 2000`,
          },
        },
        {
          type: 'table',
          head: ['Parâmetro', 'pgvector', 'Por omissão', 'Subir significa', 'Quando mexer'],
          rows: [
            ['`m`', '`WITH (m = ...)` no `CREATE INDEX`', '16', 'Mais ligações: mais recall, mais memória, construção e inserções mais lentas', 'Vectores de muitas dimensões e recall insuficiente com ef alto'],
            ['`ef_construction`', '`WITH (ef_construction = ...)`', '64', 'Grafo de melhor qualidade; construção mais lenta', 'Raramente; reconstruir o índice'],
            ['`ef_search`', '`SET LOCAL hnsw.ef_search`', '40', 'Mais candidatos por pesquisa: mais recall e mais latência', 'O botão do dia-a-dia; por consulta, sem reconstruir'],
            ['`lists`', 'IVFFlat `WITH (lists = ...)`', '—', 'Células mais pequenas: pesquisa mais rápida, recall mais sensível a `probes`', 'Na construção; linhas/1000 como ponto de partida'],
            ['`probes`', '`SET LOCAL ivfflat.probes`', '1', 'Mais células visitadas: mais recall e latência', 'sqrt(lists) como ponto de partida'],
          ],
          caption: 'Valores por omissão do pgvector (README da versão 0.8). O «Balcão» usa `m = 16`, `ef_construction = 64` e `hnsw.ef_search = 100`.',
        },
        { type: 'widget', id: 'hnsw-lab' },
        {
          type: 'callout',
          tone: 'warn',
          title: '`ef_search` limita o número de resultados',
          text:
            'No pgvector, uma consulta HNSW devolve no máximo `hnsw.ef_search` linhas: com o valor por omissão de 40, um `LIMIT 100` devolve 40. E devolve ainda menos se houver filtros ou linhas mortas. É uma das razões para o «Balcão» fixar `ef_search = 100` para um `k = 20`, e para os iterative scans da secção 5.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Malkov e Yashunin — HNSW (2016)', url: 'https://arxiv.org/abs/1603.09320' },
            { label: 'Faiss — documentação', url: 'https://faiss.ai/' },
            { label: 'Qdrant — Indexing (HNSW)', url: 'https://qdrant.tech/documentation/concepts/indexing/' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'quantizacao',
      title: 'Quantização: halfvec, binária e product quantization',
      blocks: [
        {
          type: 'p',
          text:
            'Um índice HNSW é rápido quando o grafo e os vectores estão em memória. Quando deixam de caber, cada salto no grafo é uma leitura de disco e a latência sobe uma ordem de grandeza. Quantizar é guardar os vectores com menos bits: menos memória, mais vectores em RAM, comparações mais baratas, e alguma perda de precisão que se mede em recall.',
        },
        {
          type: 'table',
          head: ['Técnica', 'Bytes por vector (768 d)', 'No pgvector', 'Perda típica', 'Uso'],
          rows: [
            ['`vector` (float4)', '3 072 + 8', 'tipo `vector(768)`', 'nenhuma', 'Por omissão; o «Balcão»'],
            ['`halfvec` (float2)', '1 536 + 8', 'tipo `halfvec(768)` ou índice sobre `embedding::halfvec(768)`', 'desprezável na maioria dos modelos', 'Primeiro passo quando a memória aperta; indexa até 4 000 dimensões'],
            ['Binária', '96 + 8', '`binary_quantize(embedding)::bit(768)` com `bit_hamming_ops`', 'grande sem re-scoring', 'Primeira fase de 2 fases; re-ordenar com os vectores completos'],
            ['Product quantization (PQ)', 'dezenas de bytes, configurável', 'não nativo (Faiss, Milvus, Qdrant)', 'média, depende dos códigos', 'Centenas de milhões de vectores'],
          ],
          caption: 'Armazenamento por linha segundo o README do pgvector (4·d + 8 e 2·d + 8 bytes). PQ parte o vector em sub-vectores e guarda o índice do centróide mais próximo de cada um.',
        },
        {
          type: 'run',
          run: {
            id: 'run-bases-vectoriais-03',
            title: 'halfvec, binário e binário com re-scoring',
            brief: 'Recall@3 contra a pesquisa exacta nas 30 perguntas douradas, com os vectores didácticos de 256 dimensões. O binário guarda só o sinal de cada coordenada e compara por distância de Hamming.',
            code: `import numpy as np
import balcao as b

chunks = b.chunkar_corpus("recursivo")
M = b.embed_lote([c.texto for c in chunks])            # float64 aqui; float4 no pgvector
M16 = M.astype(np.float16)                              # halfvec: 2 bytes por dimensão
Mbin = M > 0                                            # binary_quantize: 1 bit por dimensão

def top(scores, k):
    return list(np.argsort(-scores, kind="stable")[:k])

r16, rbin, rres = [], [], []
for p in b.PERGUNTAS:
    q = b.embed(p["pergunta"])
    verdade = set(top(M @ q, 3))
    r16.append(len(verdade & set(top(M16.astype(np.float64) @ q, 3))) / 3)
    hamming = (Mbin != (q > 0)).sum(axis=1)             # distância de Hamming
    cand = top(-hamming.astype(float), 10)              # 10 candidatos pelo binário...
    rbin.append(len(verdade & set(cand[:3])) / 3)
    resc = sorted(cand, key=lambda i: -(M[i] @ q))[:3]  # ...re-ordenados com o vector completo
    rres.append(len(verdade & set(resc)) / 3)

print(f"halfvec            recall@3 vs exacto = {np.mean(r16):.3f}  ({256 * 2} bytes/vector)")
print(f"binário            recall@3 vs exacto = {np.mean(rbin):.3f}  ({256 // 8} bytes/vector)")
print(f"binário + rescore  recall@3 vs exacto = {np.mean(rres):.3f}  (lê 10 vectores completos)")`,
            expected: `halfvec            recall@3 vs exacto = 1.000  (512 bytes/vector)
binário            recall@3 vs exacto = 0.222  (32 bytes/vector)
binário + rescore  recall@3 vs exacto = 0.456  (lê 10 vectores completos)`,
          },
        },
        {
          type: 'p',
          text:
            'O `halfvec` não perde nada aqui. O binário perde muito, e há uma razão que é do embedding didáctico: um vector por hashing tem a maioria das coordenadas exactamente a zero, e o sinal de um zero não diz nada, por isso quase toda a informação desaparece. Os embeddings densos de modelos neuronais, com 768 ou mais dimensões preenchidas, perdem bastante menos com o sinal, e o re-scoring recupera quase tudo. A lição geral mantém-se: quantização binária **sem** re-scoring é uma aposta, e o número que decide é o recall medido nos teus vectores.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Duas formas de quantizar no pgvector sem mudar a coluna: índice de expressão em `halfvec`, e primeira fase binária com re-scoring pelo vector completo.',
          code: `-- halfvec só no índice: a tabela continua em vector(768), o índice ocupa metade
CREATE INDEX chunks_embedding_hnsw_half ON chunks
    USING hnsw ((embedding::halfvec(768)) halfvec_cosine_ops);

SELECT id FROM chunks
ORDER BY embedding::halfvec(768) <=> :q::halfvec(768)
LIMIT 20;

-- binário + re-scoring: 1 bit por dimensão no índice, vector completo na ordem final
CREATE INDEX chunks_embedding_bin ON chunks
    USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops);

SELECT id FROM (
    SELECT id, embedding FROM chunks
    ORDER BY binary_quantize(embedding)::bit(768) <~> binary_quantize(:q::vector(768))
    LIMIT 100
) candidatos
ORDER BY embedding <=> :q::vector(768)
LIMIT 20;`,
        },
        {
          type: 'steps',
          items: [
            { title: '1. Medir a linha de base', text: 'Recall@20 do índice actual contra a exacta, com os filtros de produção, e a latência p95.' },
            { title: '2. halfvec primeiro', text: 'Índice de expressão `embedding::halfvec(d)`: metade da memória, quase sempre sem perda mensurável. Se chegar, pára aqui.' },
            { title: '3. Binário com re-scoring', text: 'Pedir 5 a 10 vezes mais candidatos pela fase binária e re-ordenar com o vector completo; medir o recall para cada multiplicador.' },
            { title: '4. Motor dedicado', text: 'PQ e quantização escalar com re-scoring automático são o terreno do Faiss, Qdrant e Milvus: é o sinal de que o pgvector deixou de ser a ferramenta certa.' },
          ],
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Para 5,7 MB, não quantizes',
          text:
            'O «Balcão» cabe três vezes na cache L3 de um servidor comum. Quantizar acrescenta uma variável ao recall, um índice de expressão a manter e uma consulta mais difícil de ler, para poupar 3 MB. O comentário do esquema diz o mesmo: `halfvec` fica «para quando importar». Revê a decisão quando o índice deixar de caber folgadamente em `shared_buffers`.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — Binary quantization', url: 'https://github.com/pgvector/pgvector#binary-quantization' },
            { label: 'Qdrant — Quantization', url: 'https://qdrant.tech/documentation/guides/quantization/' },
            { label: 'Douze et al. — The Faiss library (2024)', url: 'https://arxiv.org/abs/2401.08281' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'pgvector',
      title: 'pgvector na prática: tipos, operadores, índices e sessão',
      blocks: [
        {
          type: 'p',
          text:
            'O pgvector é uma extensão do PostgreSQL: acrescenta tipos (`vector`, `halfvec`, `bit`, `sparsevec`), operadores de distância e dois métodos de índice (`hnsw` e `ivfflat`). O resto é PostgreSQL: transacções, joins, `WHERE`, réplicas, backups, `EXPLAIN`. Para o «Balcão», é essa a vantagem decisiva (adr-0005): o documento, os seus chunks, os vectores, o `tsvector` e os metadados mudam juntos numa transacção, e a pesquisa híbrida é uma consulta SQL.',
        },
        { type: 'adr', ref: 'adr-0005' },
        {
          type: 'table',
          head: ['Tipo', 'Dimensões máximas', 'Indexável até', 'Bytes'],
          rows: [
            ['`vector(d)`', '16 000', '2 000 (HNSW e IVFFlat)', '4·d + 8'],
            ['`halfvec(d)`', '16 000', '4 000', '2·d + 8'],
            ['`bit(d)`', '—', '64 000', 'd/8 + 8'],
            ['`sparsevec(d)`', '—', '1 000 elementos não nulos', 'proporcional aos não nulos'],
          ],
          caption: 'Limites do README do pgvector 0.8. Um modelo de 3 072 dimensões não é indexável em `vector`: indexa-se como `halfvec` ou encurta-se (Matryoshka, módulo 7).',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'O índice do «Balcão» em `sql/001_esquema.sql`, com o comentário que justifica os parâmetros.',
          code: `-- HNSW em vez de IVFFlat (adr-0006): não precisa de dados para treinar listas,
-- aguenta inserções sem degradar e dá melhor recall por milissegundo. m = 16 e
-- ef_construction = 64 são os valores por omissão do pgvector — com 1 870
-- vectores não há nada a afinar na construção; afina-se hnsw.ef_search na consulta.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
    ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- GIN sobre o tsvector: a metade lexical da pesquisa híbrida.
CREATE INDEX IF NOT EXISTS chunks_tsv_gin ON chunks USING gin (tsv);

-- Construir índices grandes: mais memória de manutenção e workers em paralelo.
SET maintenance_work_mem = '2GB';
SET max_parallel_maintenance_workers = 4;`,
        },
        {
          type: 'code',
          lang: 'python',
          caption: '`recuperacao.py`: os parâmetros de sessão ficam dentro da transacção da consulta (`SET LOCAL`), para não vazarem para outras consultas da pool de ligações.',
          code: `def pesquisar(self, consulta: str, vector: list[float], k: int, publicos: Sequence[str]):
    with self.pool.connection() as con, con.transaction():
        # SET LOCAL vale só dentro desta transacção. O pgvector < 0.8 não
        # conhece iterative_scan: desliga-se com BALCAO_ITERATIVE_SCAN=false.
        if self.cfg.iterative_scan:
            con.execute("SET LOCAL hnsw.iterative_scan = relaxed_order")
        con.execute(f"SET LOCAL hnsw.ef_search = {int(self.cfg.ef_search)}")
        linhas = con.execute(SQL_PESQUISA_HIBRIDA, {
            "consulta": consulta, "vector": _vector_literal(vector),
            "publicos": list(publicos), "modelo": self.modelo_embedding,
            "k": k, "k_rrf": self.cfg.k_rrf,
        }).fetchall()`,
        },
        {
          type: 'p',
          text:
            'Três regras que apanham quem vem de outros motores. Primeira: o planeador só usa o índice ANN com `ORDER BY coluna <operador> constante LIMIT n`, e com o operador da opclass do índice; `ORDER BY 1 - (embedding <=> q) DESC` não usa o índice. Segunda: confirma com `EXPLAIN` que aparece `Index Scan using chunks_embedding_hnsw`. Terceira: o `SET` sem `LOCAL` numa pool de ligações muda a sessão de quem vier a seguir, e esse tipo de erro não aparece em testes.',
        },
        { type: 'file', ref: 'sql/001_esquema.sql' },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Construir o índice sem parar a escrita',
          text:
            'Num corpus grande, `CREATE INDEX` bloqueia as escritas na tabela até terminar; `CREATE INDEX CONCURRENTLY` não bloqueia, demora mais e não corre dentro de uma transacção. Carrega os dados primeiro (com `COPY`) e cria o índice depois, com `maintenance_work_mem` suficiente para o grafo caber em memória: o pgvector avisa quando deixa de caber, e a construção fica muito mais lenta a partir daí.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — README', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html' },
            { label: 'PostgreSQL — CREATE INDEX', url: 'https://www.postgresql.org/docs/current/sql-createindex.html' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 'filtros',
      title: 'Filtros: pré-filtro, pós-filtro e iterative scans',
      blocks: [
        {
          type: 'p',
          text:
            'Uma pesquisa do «Balcão» nunca é só «os k mais próximos»: é «os k mais próximos **que estão em vigor, são públicos e foram gerados pelo modelo actual**». Há duas formas de o fazer. No **pós-filtro**, o índice devolve os k mais próximos e depois tiram-se os que não passam; sobram menos de k, às vezes zero. No **pré-filtro**, o filtro entra na pesquisa e o top-k só considera linhas que passam. A adr-0010 obriga ao segundo, na base de dados, e não a uma instrução no prompt.',
        },
        {
          type: 'run',
          run: {
            id: 'run-bases-vectoriais-04',
            title: 'Pós-filtro devolve 2 de 4; pré-filtro devolve 4',
            brief: 'A pergunta da conversa `politica-substituida`. Sem filtro, o primeiro lugar é da política de 2025 (72 horas), que já não está em vigor, e o quarto é um procedimento interno.',
            code: `import balcao as b

indice = b.IndiceExacto(b.chunkar_corpus("recursivo"))
pergunta = "Quanto tempo demora a devolução do dinheiro no M-Pesa?"
filtro = {"vigente": True, "publico": "cliente"}

# Pós-filtro: o índice devolve k, e só depois se tira o que não pode ser citado.
k = 4
brutos = indice.procurar(pergunta, k)
pos = [(c.id, s) for c, s in brutos if all(c.meta[f] == v for f, v in filtro.items())]
print("top-4 sem filtro:", [(c.id, s) for c, s in brutos])
print(f"pós-filtro: {len(pos)} de {k} ->", pos)

# Pré-filtro: o filtro entra na pesquisa, antes do top-k.
pre = indice.procurar(pergunta, k, filtro)
print(f"pré-filtro: {len(pre)} de {k} ->", [(c.id, s) for c, s in pre])`,
            expected: `top-4 sem filtro: [('pol-reembolso-2025#0', 0.482), ('pol-reembolso-prazos#1', 0.4053), ('pol-reembolso#1', 0.3546), ('int-tom-de-voz#0', 0.328)]
pós-filtro: 2 de 4 -> [('pol-reembolso-prazos#1', 0.4053), ('pol-reembolso#1', 0.3546)]
pré-filtro: 4 de 4 -> [('pol-reembolso-prazos#1', 0.4053), ('pol-reembolso#1', 0.3546), ('faq-objecto-esquecido#0', 0.2805), ('pol-atraso-compensacao#0', 0.2579)]`,
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-bases-vectoriais-01',
            title: 'Sem filtro: a política substituída em primeiro lugar',
            brief: 'Pesquisa densa exacta, k = 3. O chunk de 2025 tem mais termos em comum com a pergunta («M-Pesa», «reembolsos», «horas») e ganha.',
            query: 'Quanto tempo demora a devolução do dinheiro no M-Pesa?',
            method: 'denso',
            k: 3,
            hits: [{"doc": "pol-reembolso-2025", "texto": "Os reembolsos para M-Pesa são processados em até 72 horas. O assistente pode aprovar reembolsos até 300 MZN.", "score": 0.482, "relevante": false}, {"doc": "pol-reembolso-prazos", "texto": "Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso, que começa por RB-, para que a equipa confirme o estado junto do operador.", "score": 0.4053, "relevante": true}, {"doc": "pol-reembolso", "texto": "O assistente pode aprovar sozinho reembolsos até 500 MZN por pedido. Acima desse valor, um membro da equipa de suporte revê o caso e responde em menos de 4 horas úteis.", "score": 0.3546, "relevante": false}],
            note: 'Um modelo obediente citaria as 72 horas de 2025. Pedir no prompt «ignora versões antigas» depende de o modelo ler a data do chunk e obedecer; filtrar na base de dados não depende de nada.',
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-bases-vectoriais-02',
            title: 'Com `vigente = true` e `publico = cliente` antes do top-k',
            brief: 'O mesmo índice, com o filtro dentro da pesquisa. O primeiro lugar passa a ser a política em vigor (24 horas).',
            query: 'Quanto tempo demora a devolução do dinheiro no M-Pesa?',
            method: 'denso',
            k: 3,
            hits: [{"doc": "pol-reembolso-prazos", "texto": "Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso, que começa por RB-, para que a equipa confirme o estado junto do operador.", "score": 0.4053, "relevante": true}, {"doc": "pol-reembolso", "texto": "O assistente pode aprovar sozinho reembolsos até 500 MZN por pedido. Acima desse valor, um membro da equipa de suporte revê o caso e responde em menos de 4 horas úteis.", "score": 0.3546, "relevante": false}, {"doc": "faq-objecto-esquecido", "texto": "Se o cliente se esquecer de um objecto com o estafeta, ou o estafeta o deixar por engano, deve reportar na aplicação até 24 horas depois. A equipa coordena a devolução; quando a devolução é feita em casa do cliente, custa 60 MZN.", "score": 0.2805, "relevante": false}],
            note: 'É o comportamento da CTE densa de `pesquisa_hibrida`: `WHERE d.vigente AND d.publico = ANY (publicos)` antes do `ORDER BY ... LIMIT k`.',
          },
        },
        {
          type: 'p',
          text:
            'Num índice aproximado, o pré-filtro tem uma subtileza. O HNSW do pgvector percorre o grafo e só depois aplica o `WHERE` às linhas que encontrou: se o filtro deixa passar 10% das linhas e o `ef_search` é 40, sobram em média 4 resultados. Antes da versão 0.8, a resposta era subir o `ef_search` e rezar. Desde a 0.8 há **iterative index scans**: quando o filtro esvazia o resultado, o índice continua a percorrer o grafo até ter linhas suficientes, ou até atingir `hnsw.max_scan_tuples` (20 000 por omissão).',
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-bases-vectoriais-01',
            title: 'Uma pesquisa filtrada com iterative scan (pgvector 0.8)',
            intro: 'Filtro `vigente AND publico = cliente AND modelo_embedding = actual`, `ef_search = 100`, `LIMIT 20`, `iterative_scan = relaxed_order`. As contagens de linhas são ilustrativas.',
            lanes: [
              { id: 'api', label: 'Retriever', sub: 'recuperacao.py', kind: 'service' },
              { id: 'pg', label: 'Executor SQL', sub: 'PostgreSQL 18', kind: 'store' },
              { id: 'hnsw', label: 'Índice HNSW', sub: 'chunks_embedding_hnsw', kind: 'store' },
            ],
            steps: [
              { from: 'api', to: 'pg', label: 'BEGIN; SET LOCAL hnsw.iterative_scan = relaxed_order; SET LOCAL hnsw.ef_search = 100', kind: 'req', ms: 1 },
              { from: 'pg', to: 'hnsw', label: 'primeira passagem: 100 candidatos', kind: 'req', ms: 3 },
              { from: 'hnsw', to: 'pg', label: '100 linhas; o WHERE deixa passar 14', detail: 'Documentos internos, substituídos e de outro modelo ficam de fora. 14 < 20.', kind: 'res' },
              { from: 'pg', to: 'hnsw', label: 'continuar a percorrer o grafo', detail: 'Sem iterative scan, a consulta devolvia 14 linhas e o RRF trabalhava com menos candidatos.', kind: 'req', ms: 2 },
              { from: 'hnsw', to: 'pg', label: 'mais candidatos; já passam 20', kind: 'res' },
              { from: 'pg', to: 'api', label: '20 linhas, quase ordenadas por distância', detail: '`relaxed_order` pode trocar vizinhos próximos; a fusão RRF e o re-ranking re-ordenam de qualquer forma.', kind: 'res', ms: 1 },
            ],
            outro: 'Se precisasses de ordem estrita, usarias `strict_order`, ou uma CTE `MATERIALIZED` com `relaxed_order` e um `ORDER BY distancia + 0` por fora, como o README do pgvector descreve.',
          },
        },
        {
          type: 'table',
          head: ['Selectividade do filtro', 'Estratégia no pgvector', 'Porquê'],
          rows: [
            ['Deixa passar a maioria (o «Balcão»: ≈ 85% dos chunks são públicos e vigentes)', 'HNSW + iterative scan', 'Poucas passagens extra'],
            ['Muito selectivo (1 cliente em 10 000, um tenant)', 'Índice B-tree no filtro e pesquisa exacta sobre as linhas que passam', 'Poucas linhas: a exacta é barata e perfeita'],
            ['Poucos valores fixos (3 categorias)', 'Índice HNSW parcial por valor (`WHERE categoria = ...`)', 'Cada índice só tem as linhas relevantes'],
            ['Muitos valores (multi-tenant)', 'Partições por lista (`PARTITION BY LIST`) ou tabelas separadas', 'Isolamento de recall e de desempenho entre tenants'],
          ],
          caption: 'Recomendações do README do pgvector (secções Filtering e Multitenancy), aplicadas.',
        },
        { type: 'adr', ref: 'adr-0010' },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: filtrar no código depois do top-k',
          text:
            'O retriever pede `k = 5` ao vector store, filtra `vigente` e `publico` em Python, e passa o que sobra ao modelo. Nos testes funciona, porque as perguntas de teste têm muitos documentos relevantes. Em produção, a pergunta sobre o M-Pesa chega ao modelo com 2 chunks em vez de 5, ou com zero numa pergunta cujo top-5 é todo de procedimentos internos, e a taxa de recusas sobe sem razão aparente. O filtro vai para o `WHERE`, antes do `LIMIT`, e o teste de CI tem uma pergunta cujo melhor resultado é uma política substituída.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — Iterative Index Scans', url: 'https://github.com/pgvector/pgvector#iterative-index-scans' },
            { label: 'PostgreSQL — Índices parciais', url: 'https://www.postgresql.org/docs/current/indexes-partial.html' },
            { label: 'PostgreSQL — Particionamento', url: 'https://www.postgresql.org/docs/current/ddl-partitioning.html' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'alternativas',
      title: 'Qdrant, Milvus, serviços geridos e o tamanho do «Balcão»',
      blocks: [
        {
          type: 'p',
          text:
            'Um motor vectorial dedicado resolve problemas que o pgvector resolve pior ou não resolve: filtros integrados na travessia do grafo (o Qdrant constrói ligações extra no HNSW para os campos de payload indexados, para que um filtro selectivo não parta a navegação), quantização escalar, binária e PQ nativas, vectores esparsos e múltiplos vectores por ponto, e sharding e replicação horizontais. O preço é um serviço novo para operar, com backups, monitorização e actualizações próprias, e uma segunda fonte de verdade a sincronizar com a base de dados onde os documentos vivem.',
        },
        {
          type: 'compare',
          left: {
            title: 'pgvector (a escolha do «Balcão»)',
            items: [
              'Um só sistema: documentos, chunks, vectores, `tsvector`, conversas e checkpoints (RE-02).',
              'Transacções: um documento e os seus chunks mudam juntos; quem pesquisa vê a versão antiga ou a nova.',
              'Pesquisa híbrida e filtros numa consulta SQL, com joins.',
              'Afinar HNSW, `work_mem` e `maintenance_work_mem` é responsabilidade tua; a pesquisa compete com o resto da base de dados.',
            ],
          },
          right: {
            title: 'Qdrant, Milvus e serviços geridos',
            items: [
              'Filtros de payload integrados no HNSW, quantização e sharding nativos.',
              'Escala horizontal para centenas de milhões ou milhares de milhões de vectores.',
              'Um serviço a mais e sincronização entre o PostgreSQL e o índice (dupla escrita ou CDC).',
              'Geridos: zero operação de índice, mas dados fora da infraestrutura e custo fixo por capacidade.',
            ],
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'A mesma pesquisa filtrada no Qdrant, com o cliente Python oficial: coleção com cosseno, índices de payload para os filtros e `query_points` com o filtro dentro da pesquisa.',
          code: `from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, VectorParams

cliente = QdrantClient(url="http://qdrant:6333")
cliente.create_collection("chunks", vectors_config=VectorParams(size=768, distance=Distance.COSINE))
cliente.create_payload_index("chunks", field_name="vigente", field_schema="bool")
cliente.create_payload_index("chunks", field_name="publico", field_schema="keyword")

resultado = cliente.query_points(
    collection_name="chunks",
    query=vector_pergunta,
    query_filter=Filter(must=[
        FieldCondition(key="vigente", match=MatchValue(value=True)),
        FieldCondition(key="publico", match=MatchValue(value="cliente")),
    ]),
    limit=20,
)
# E a metade lexical? Vectores esparsos no Qdrant, ou continua no PostgreSQL — e a fusão passa para o código.`,
        },
        {
          type: 'run',
          run: {
            id: 'run-bases-vectoriais-05',
            title: 'Dimensionar: do «Balcão» à web',
            brief: 'Memória dos vectores de 768 dimensões (sem o grafo HNSW, que acrescenta as ligações) e multiplicações de uma pesquisa exacta, em quatro escalas.',
            code: `# Dimensionar: bytes de vectores por linha no pgvector = 4·d + 8 (vector) ou 2·d + 8 (halfvec).
def mb(linhas: int, d: int, bytes_por_dim: float) -> float:
    return linhas * (bytes_por_dim * d + 8) / 1e6

cenarios = [
    ("«Balcão» hoje", 1_870),
    ("«Balcão» × 100", 187_000),
    ("marketplace grande", 10_000_000),
    ("pesquisa na web", 1_000_000_000),
]
for nome, n in cenarios:
    v, h = mb(n, 768, 4), mb(n, 768, 2)
    comps = n * 768
    print(f"{nome:20s} {n:>13,d} linhas  vector {v:>12,.1f} MB  halfvec {h:>12,.1f} MB  "
          f"exacto: {comps / 1e9:8.3f} G mult. por pergunta")`,
            expected: `«Balcão» hoje                1,870 linhas  vector          5.8 MB  halfvec          2.9 MB  exacto:    0.001 G mult. por pergunta
«Balcão» × 100             187,000 linhas  vector        576.0 MB  halfvec        288.7 MB  exacto:    0.144 G mult. por pergunta
marketplace grande      10,000,000 linhas  vector     30,800.0 MB  halfvec     15,440.0 MB  exacto:    7.680 G mult. por pergunta
pesquisa na web      1,000,000,000 linhas  vector  3,080,000.0 MB  halfvec  1,544,000.0 MB  exacto:  768.000 G mult. por pergunta`,
          },
        },
        {
          type: 'p',
          text:
            'O «Balcão» tem 5,8 MB de vectores (com o cabeçalho de 8 bytes por linha): cabe em memória de qualquer PostgreSQL, e a pesquisa exacta são ≈ 1,4 milhões de multiplicações. Multiplicado por 100 continua a caber. A decisão de pgvector não foi uma aposta em escala; foi uma aposta em **operação**: com um engenheiro de IA e meio engenheiro de plataforma (RE-01), um serviço novo para 6 MB de dados é custo sem benefício. A adr-0005 regista a condição para reabrir a decisão: o corpus crescer duas ordens de grandeza, ou os filtros deixarem de ser servidos pelo pgvector com recall acima de 0,99.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que monitorizar na base de dados vectorial',
          text:
            'Latência p95 da consulta híbrida (orçamento de 45 ms), recall do índice contra a exacta num job mensal (≥ 0,99, com e sem filtros), número de linhas devolvidas por consulta (menos de k é sinal de filtro a esvaziar o resultado), contagem de linhas por `modelo_embedding`, e o tamanho do índice contra `shared_buffers`. Os três primeiros vão para o painel; os dois últimos para alarmes.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Payload (Qdrant)', def: 'Os metadados de um ponto (JSON), filtráveis; com índice de payload, o filtro participa na construção e na travessia do HNSW.' },
            { term: 'Segmento', def: 'Unidade de armazenamento de Qdrant e Milvus; os índices constroem-se por segmento e fundem-se em segundo plano.' },
            { term: 'CDC', def: 'Change data capture: ler as alterações do PostgreSQL (replicação lógica) para manter um índice externo sincronizado sem dupla escrita no código.' },
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — Filtering', url: 'https://qdrant.tech/documentation/concepts/filtering/' },
            { label: 'Milvus — Índices', url: 'https://milvus.io/docs/index.md' },
            { label: 'Weaviate — documentação', url: 'https://weaviate.io/developers/weaviate' },
          ],
        },
      ],
    },
  ],

  /* ==================================================================== quiz */
  quiz: [
    {
      id: 'q-bases-vectoriais-01',
      topic: 'HNSW',
      prompt: 'O recall do índice HNSW contra a pesquisa exacta está em 0,93 e queres 0,99. Qual é o primeiro parâmetro a mexer, e porquê?',
      options: [
        '`m`, porque é o que mais afecta o recall.',
        '`hnsw.ef_search`, porque muda por consulta sem reconstruir o índice.',
        '`ef_construction`, porque é barato.',
        '`lists`, porque o índice tem poucas listas.',
      ],
      answer: [1],
      explain:
        '`ef_search` é o botão do dia-a-dia: `SET LOCAL` por consulta, efeito imediato, custo em latência mensurável. `m` e `ef_construction` exigem reconstruir o índice; `lists` é do IVFFlat. Só se `ef_search` alto não chegar faz sentido reconstruir com `m` maior.',
    },
    {
      id: 'q-bases-vectoriais-02',
      topic: 'filtros',
      prompt: 'A consulta pede `LIMIT 20` com um filtro que deixa passar 10% dos chunks, `hnsw.ef_search = 40` e sem iterative scans. Quantas linhas esperas?',
      options: ['20', 'cerca de 4', '40', 'zero, sempre'],
      answer: [1],
      explain:
        'O HNSW encontra até `ef_search` candidatos e o filtro aplica-se depois: 40 × 10% ≈ 4. É o exemplo do README do pgvector. Iterative scans (0.8) ou um `ef_search` muito maior resolvem; para filtros muito selectivos, a exacta sobre um índice B-tree é melhor.',
    },
    {
      id: 'q-bases-vectoriais-03',
      topic: 'IVF',
      prompt: 'Porque é que o IVFFlat degrada num corpus com inserções contínuas? (duas respostas)',
      options: [
        'Os centróides foram calculados sobre os dados da construção e não acompanham os novos.',
        'O IVFFlat não aceita inserções.',
        'As listas desequilibram-se e as sondas passam a cobrir fracções diferentes do corpus.',
        'A distância de cosseno deixa de funcionar com listas.',
      ],
      answer: [0, 2],
      explain:
        'O IVFFlat aceita inserções, mas cada vector novo vai para a célula do centróide mais próximo, calculado para outro corpus. Com o tempo, células ficam cheias e outras vazias, e o recall por número de sondas muda. Reconstruir resolve; o HNSW não tem este problema, e foi o argumento da adr-0006.',
    },
    {
      id: 'q-bases-vectoriais-04',
      topic: 'quantização',
      prompt: 'Queres usar quantização binária num índice de 50 milhões de vectores de 1 024 dimensões. O que é indispensável?',
      options: [
        'Usar `vector_cosine_ops` no índice binário.',
        'Re-ordenar os candidatos da fase binária com os vectores completos, e medir o recall resultante contra a exacta.',
        'Normalizar os vectores binários.',
        'Subir `m` para 64.',
      ],
      answer: [1],
      explain:
        'A distância de Hamming entre sinais é uma aproximação grosseira; o padrão é pedir mais candidatos (por exemplo 100) pela fase binária e re-ordenar com o vector completo. O índice binário usa `bit_hamming_ops`, não cosseno. O recall medido nos teus vectores é que decide.',
    },
    {
      id: 'q-bases-vectoriais-05',
      topic: 'pgvector',
      prompt: 'Que consultas NÃO usam o índice `hnsw (embedding vector_cosine_ops)`? (duas respostas)',
      options: [
        '`ORDER BY embedding <=> :q LIMIT 20`',
        '`ORDER BY 1 - (embedding <=> :q) DESC LIMIT 20`',
        '`ORDER BY embedding <#> :q LIMIT 20`',
        '`WHERE vigente ORDER BY embedding <=> :q LIMIT 20`',
      ],
      answer: [1, 2],
      explain:
        'O planeador só usa o índice com `ORDER BY coluna operador constante` ascendente e com o operador da opclass. Uma expressão sobre a distância com `DESC` e o operador de produto interno ficam de fora. O `WHERE` não impede o índice (aplica-se às linhas encontradas, com as consequências da secção 5).',
    },
    {
      id: 'q-bases-vectoriais-06',
      topic: 'filtros',
      prompt: 'A equipa propõe tirar o filtro `vigente` da SQL e escrever no prompt «ignora políticas marcadas como não vigentes». O que acontece com a pergunta sobre o prazo do M-Pesa?',
      options: [
        'Nada: o modelo lê a marca e ignora.',
        'O chunk de 2025 ocupa o primeiro lugar do contexto, e a resposta depende de o modelo ler a marca e obedecer, em cada pedido.',
        'O índice HNSW rejeita a consulta.',
        'O recall do índice sobe.',
      ],
      answer: [1],
      explain:
        'Os blocos de recuperação mostram-no: sem filtro, `pol-reembolso-2025` fica em primeiro. Uma instrução no prompt é probabilística e gasta um lugar do contexto num documento que não pode ser citado; o filtro na base de dados é determinista (adr-0010).',
    },
    {
      id: 'q-bases-vectoriais-07',
      topic: 'arquitectura',
      prompt: 'Que factos justificam, no «Balcão», pgvector em vez de Qdrant? (duas respostas)',
      options: [
        'O índice tem ≈ 5,7 MB e cabe em memória de qualquer PostgreSQL.',
        'O pgvector é mais rápido do que o Qdrant em qualquer escala.',
        'A restrição RE-02 impõe uma só base de dados, e documentos e vectores têm de mudar na mesma transacção.',
        'O Qdrant não suporta filtros.',
      ],
      answer: [0, 2],
      explain:
        'A decisão é de operação e consistência, não de desempenho: a este tamanho qualquer opção é rápida. O Qdrant tem filtros de payload excelentes; em escala, um motor dedicado é frequentemente melhor. A adr-0005 regista quando reabrir.',
    },
    {
      id: 'q-bases-vectoriais-08',
      topic: 'operação',
      prompt: 'Uma aplicação com pool de ligações executa `SET hnsw.ef_search = 400` (sem `LOCAL`) num endpoint de relatórios. Que efeito tem no «Balcão»?',
      options: [
        'Nenhum: cada consulta tem a sua sessão.',
        'As consultas seguintes que reutilizem essa ligação herdam `ef_search = 400`, com latência maior e imprevisível.',
        'O índice é reconstruído com mais ligações.',
        'O PostgreSQL rejeita o SET fora de uma transacção.',
      ],
      answer: [1],
      explain:
        'Um `SET` de sessão fica na ligação, e numa pool a ligação é reutilizada por outros pedidos. `SET LOCAL` dentro de uma transacção limita o efeito à consulta, que é o que `recuperacao.py` faz.',
    },
    {
      id: 'q-bases-vectoriais-09',
      topic: 'recall',
      prompt: 'O recall@5 de recuperação no conjunto dourado é 0,95 e o recall do índice HNSW contra a exacta é 0,99. O que significa cada um?',
      options: [
        'São o mesmo número medido de duas formas.',
        'O primeiro compara com documentos anotados como relevantes; o segundo compara o índice com a pesquisa exacta, sem olhar para relevância.',
        'O segundo inclui o re-ranking.',
        'O primeiro só se aplica ao BM25.',
      ],
      answer: [1],
      explain:
        'O recall do índice mede a aproximação do ANN; o de recuperação mede se a pipeline encontra o que humanos marcaram como relevante. Um índice perfeito (1,0) com um mau embedding continua a ter mau recall de recuperação. Os dois vão para o painel, com donos diferentes.',
    },
  ],

  /* =============================================================== exercícios */
  exercises: [
    {
      id: 'e-bases-vectoriais-01',
      title: 'Listas e sondas iniciais do IVFFlat',
      kind: 'input',
      statement:
        'Um corpus tem 400 000 chunks. Segundo as recomendações do pgvector, qual é o valor inicial de `lists`, e quantas `probes` usarias para começar? Responde no formato «lists/probes», arredondando as sondas ao inteiro mais próximo.',
      accept: ['400/20', '400 / 20'],
      hint: 'linhas / 1000 até um milhão de linhas; sqrt(lists).',
      solution:
        '`lists = 400 000 / 1000 = 400`, `probes = sqrt(400) = 20`. Ponto de partida: mede o recall contra a exacta e ajusta `ivfflat.probes` por consulta.',
      difficulty: 1,
    },
    {
      id: 'e-bases-vectoriais-02',
      title: 'Marketplace multi-país',
      kind: 'design',
      statement:
        'O «Chega» vai abrir em Nampula e na Beira com políticas diferentes por cidade, e o corpus passa a 3 000 documentos por cidade, com as mesmas pesquisas filtradas por cidade. Desenha a solução em pgvector: esquema, índices, consulta, e como garantes que uma cidade não afecta o recall da outra.',
      hint: 'Poucos valores de filtro, conhecidos à partida.',
      solution:
        'Coluna `cidade` em `documentos` e `chunks` (desnormalizada para o filtro no índice). Com três cidades, duas opções: índices HNSW parciais `WHERE cidade = \'maputo\'`, etc., ou `PARTITION BY LIST (cidade)` com um HNSW por partição. As partições isolam melhor (cada grafo só tem os vectores da cidade, recall e latência independentes, reindexar uma cidade não toca nas outras) e o planeador faz pruning com `cidade = :c`. A consulta mantém o filtro `vigente`/`publico`/`modelo_embedding` e acrescenta `cidade`; iterative scans ligados. Recall contra a exacta medido por cidade. Com 9 000 chunks no total, a exacta ainda seria barata: o argumento principal é isolamento e manutenção, não velocidade.',
      difficulty: 2,
    },
    {
      id: 'e-bases-vectoriais-03',
      title: 'Porque devolve 14 linhas?',
      kind: 'open',
      statement:
        'Em produção, o painel mostra que 3% das consultas densas devolvem menos de 20 linhas, quase todas de perguntas sobre farmácia. O que investigas, pela ordem, e que correcções consideras?',
      hint: 'Filtros, ef_search, linhas mortas, iterative scans.',
      solution:
        '1) Confirmar a versão do pgvector e se `hnsw.iterative_scan` está activo na transacção (o `SET LOCAL` só existe na 0.8 e pode estar desligado por configuração). 2) Ver a selectividade do filtro nessas perguntas: muitos chunks de farmácia podem ser internos ou substituídos, e o top-100 do grafo fica maioritariamente filtrado. 3) Verificar linhas mortas depois de reindexações (`VACUUM`), que também consomem candidatos. Correcções: ligar iterative scans; subir `hnsw.ef_search` ou `hnsw.max_scan_tuples`; se o subconjunto filtrado for pequeno, pesquisa exacta sobre ele; corrigir a ingestão se houver documentos substituídos que deviam ter sido retirados.',
      difficulty: 2,
    },
    {
      id: 'e-bases-vectoriais-04',
      title: 'Pré-filtro no índice didáctico',
      kind: 'code',
      statement:
        'Com `balcao.IndiceExacto`, escreve uma função que devolve sempre k resultados em vigor e públicos para uma pergunta, e mostra com a pergunta do M-Pesa que a versão com pós-filtro devolve menos.',
      hint: '`procurar(pergunta, k, filtro)` aplica o filtro antes de ordenar.',
      solution:
        '`def pesquisar(indice, pergunta, k): return indice.procurar(pergunta, k, {"vigente": True, "publico": "cliente"})`. Pós-filtro: `[x for x in indice.procurar(pergunta, k) if x[0].meta["vigente"] and x[0].meta["publico"] == "cliente"]`. Com k = 4 e a pergunta do M-Pesa, o pós-filtro devolve 2 (sai `pol-reembolso-2025` e `int-tom-de-voz`) e o pré-filtro devolve 4, com `pol-reembolso-prazos#1` em primeiro.',
      difficulty: 1,
    },
  ],

  /* ==================================================================== labs */
  labs: [
    {
      id: 'lab-bases-vectoriais-01',
      moduleId: 'bases-vectoriais',
      title: 'Medir o recall de um índice IVF contra a pesquisa exacta',
      brief:
        'Completa `recall_indice` para comparar, pergunta a pergunta, os k ids do índice com os k ids da pesquisa exacta, e devolve a média. Depois escolhe o menor `n_sondas` com recall@5 ≥ 0,9.',
      lang: 'python',
      starter: `import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
EXACTO = b.IndiceExacto(CHUNKS)


def recall_indice(indice, k: int = 5) -> float:
    # TODO: para cada pergunta dourada, compara indice.procurar com EXACTO.procurar
    return 1.0


for sondas in (1, 2, 4, 8):
    print(sondas, recall_indice(b.IndiceIVF(CHUNKS, n_listas=8, n_sondas=sondas)))
`,
      checks: [
        { id: 'c1', label: 'Compara com a pesquisa exacta', re: 'EXACTO\\.procurar\\(', why: 'O recall de um índice ANN mede-se contra a exacta, não contra a relevância anotada.' },
        { id: 'c2', label: 'Intersecção de conjuntos de ids', re: '&|intersection\\(', why: 'A fórmula é |ANN ∩ Exacto| / k.' },
        { id: 'c3', label: 'Percorre as perguntas douradas', re: 'for\\s+\\w+\\s+in\\s+b\\.PERGUNTAS', why: 'Um recall de uma pergunta não diz nada; é uma média sobre um conjunto.' },
        { id: 'c4', label: 'Não devolve uma constante', re: 'return\\s+1\\.0\\s*$', flags: 'm', forbid: true, why: 'O esqueleto devolve 1,0 sempre.' },
      ],
      hints: [
        '`verdade = {c.id for c, _ in EXACTO.procurar(p["pergunta"], k)}` e o mesmo para o índice.',
        '`len(verdade & obtido) / k`, e no fim a média.',
      ],
      solution: `import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
EXACTO = b.IndiceExacto(CHUNKS)


def recall_indice(indice, k: int = 5) -> float:
    valores = []
    for p in b.PERGUNTAS:
        verdade = {c.id for c, _ in EXACTO.procurar(p["pergunta"], k)}
        obtido = {c.id for c, _ in indice.procurar(p["pergunta"], k)}
        valores.append(len(verdade & obtido) / k)
    return round(sum(valores) / len(valores), 3)


for sondas in (1, 2, 4, 8):
    print(sondas, recall_indice(b.IndiceIVF(CHUNKS, n_listas=8, n_sondas=sondas)))`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-bases-vectoriais-02',
      moduleId: 'bases-vectoriais',
      title: 'A consulta densa do «Balcão», com índice e filtros certos',
      brief:
        'A consulta abaixo pós-filtra num CTE externo, usa `SET` de sessão e ordena por uma expressão que não usa o índice. Reescreve-a numa transacção com `SET LOCAL` de `ef_search` e iterative scan, filtros dentro da subconsulta e `ORDER BY embedding <=> ... LIMIT`.',
      lang: 'sql',
      starter: `SET hnsw.ef_search = 100;

WITH top AS (
    SELECT c.id, c.documento_id, 1 - (c.embedding <=> :q) AS score
    FROM chunks c
    ORDER BY score DESC
    LIMIT 20
)
SELECT t.* FROM top t
JOIN documentos d ON d.id = t.documento_id
WHERE d.vigente AND d.publico = 'cliente';
`,
      checks: [
        { id: 'c1', label: '`SET LOCAL` do `ef_search`', re: 'SET\\s+LOCAL\\s+hnsw\\.ef_search', flags: 'i', why: 'Sem LOCAL, o valor fica na ligação da pool e afecta outros pedidos.' },
        { id: 'c2', label: 'Iterative scan ligado', re: 'SET\\s+LOCAL\\s+hnsw\\.iterative_scan\\s*=\\s*(relaxed_order|strict_order)', flags: 'i', why: 'Com filtros, o HNSW pode devolver menos de k linhas sem ele (pgvector 0.8).' },
        { id: 'c3', label: 'Ordena pelo operador do índice', re: 'ORDER\\s+BY\\s+c\\.embedding\\s*<=>\\s*:q\\s+LIMIT', flags: 'i', why: 'Só `ORDER BY coluna <=> constante LIMIT` usa o índice HNSW.' },
        { id: 'c4', label: 'Não ordena pelo score com DESC', re: 'ORDER\\s+BY\\s+score\\s+DESC', flags: 'i', forbid: true, why: 'Uma expressão sobre a distância impede o uso do índice.' },
        { id: 'c5', label: 'Filtros antes do LIMIT', re: 'WHERE[\\s\\S]*vigente[\\s\\S]*ORDER\\s+BY\\s+c\\.embedding', flags: 'i', why: 'Pré-filtro: as linhas que não podem ser citadas nunca ocupam um lugar no top-k (adr-0010).' },
      ],
      hints: [
        'Começa com `BEGIN;` e dois `SET LOCAL`.',
        'Junta `documentos` na mesma consulta e põe o `WHERE` antes do `ORDER BY ... LIMIT 20`.',
      ],
      solution: `BEGIN;
SET LOCAL hnsw.iterative_scan = relaxed_order;
SET LOCAL hnsw.ef_search = 100;

SELECT c.id, c.documento_id, 1 - (c.embedding <=> :q) AS score
FROM chunks c
JOIN documentos d ON d.id = c.documento_id
WHERE d.vigente
  AND d.publico = 'cliente'
  AND c.modelo_embedding = :modelo
ORDER BY c.embedding <=> :q LIMIT 20;

COMMIT;
`,
      difficulty: 2,
    },
  ],

  /* =============================================================== casos de uso */
  useCases: [
    {
      id: 'uc-bases-vectoriais-01',
      title: 'Seguradora em Portugal: pesquisa em 40 milhões de parágrafos de processos',
      area: 'seguros',
      level: 3,
      scenario:
        'Uma seguradora quer que os peritos pesquisem, por semelhança, parágrafos de relatórios de sinistros dos últimos 15 anos (≈ 40 milhões de parágrafos) para encontrar casos parecidos com o que estão a analisar. Cada perito só pode ver processos da sua região e ramo, e os resultados têm de aparecer em menos de 300 ms.',
      requirements: [
        'Top-20 por semelhança, filtrado por região, ramo e permissões do perito, em < 300 ms no p95.',
        'Recall do índice ≥ 0,95 contra a exacta, com os filtros.',
        'Inserção diária de ≈ 20 000 parágrafos novos sem reconstruir tudo.',
      ],
      constraints: [
        'Dados em infraestrutura própria na UE.',
        'Modelo de embeddings de 1 024 dimensões, escolhido pelo recall de recuperação no conjunto de casos dos peritos.',
      ],
      approach: [
        { title: 'Fazer as contas primeiro', text: '40 milhões × 1 024 × 4 bytes ≈ 164 GB só de vectores em float4, mais o grafo. Não cabe folgadamente num PostgreSQL existente; com `halfvec` são ≈ 82 GB, ainda muito para a base transaccional.' },
        { title: 'Motor dedicado com quantização', text: 'Qdrant com quantização escalar (int8) em memória e vectores originais em disco para re-scoring; índices de payload em `regiao` e `ramo` para o filtro participar no HNSW.' },
        { title: 'Permissões como filtro, não como pós-processamento', text: 'O filtro por região e ramo vai na consulta; as permissões finas (processos em segredo) verificam-se depois na base transaccional, sobre 20 ids, antes de mostrar.' },
        { title: 'Fonte de verdade no PostgreSQL', text: 'Os relatórios continuam no PostgreSQL; um job lê as alterações (CDC) e actualiza o índice. Reindexar por troca de modelo é uma coleção nova ao lado, com troca de alias.' },
      ],
      diagram: {
        title: 'Pesquisa de casos parecidos para peritos',
        cols: 5,
        rows: 3,
        zones: [
          { id: 'tx', label: 'Sistema transaccional', col: 0, row: 0, colSpan: 2, rowSpan: 3, tone: 'data' },
          { id: 'vec', label: 'Motor vectorial (UE)', col: 2, row: 0, colSpan: 2, rowSpan: 3, tone: 'rag' },
        ],
        nodes: [
          { id: 'pg', label: 'PostgreSQL', sub: 'relatórios, permissões', col: 0, row: 1, kind: 'data' },
          { id: 'cdc', label: 'CDC + embeddings', sub: '20 000/dia', col: 1, row: 0, kind: 'service' },
          { id: 'qd', label: 'Qdrant', sub: 'HNSW + int8, payload indexado', col: 2, row: 1, kind: 'vector' },
          { id: 'api', label: 'API de pesquisa', sub: 'filtro região/ramo', col: 3, row: 1, kind: 'service' },
          { id: 'perm', label: 'Verificar permissões', sub: 'sobre 20 ids', col: 1, row: 2, kind: 'service' },
          { id: 'perito', label: 'Perito', col: 4, row: 1, kind: 'user' },
        ],
        edges: [
          { from: 'pg', to: 'cdc' },
          { from: 'cdc', to: 'qd' },
          { from: 'perito', to: 'api' },
          { from: 'api', to: 'qd', label: 'top-100 filtrado' },
          { from: 'api', to: 'perm' },
          { from: 'perm', to: 'pg' },
        ],
      },
      solution:
        'Motor vectorial dedicado com quantização e filtros de payload no HNSW, alimentado por CDC a partir do PostgreSQL, que continua a ser a fonte de verdade e o árbitro das permissões finas.',
      tools: [
        { name: 'Qdrant', role: 'HNSW com filtros de payload e quantização escalar', badge: 'vectorial' },
        { name: 'PostgreSQL', role: 'Relatórios, permissões e fonte das alterações' },
        { name: 'Replicação lógica (CDC)', role: 'Sincronização incremental do índice' },
      ],
      rejected: [
        { option: 'pgvector na base transaccional', why: 'Dezenas de GB de índice a competir com a carga transaccional pela mesma memória; possível numa réplica dedicada, mas com menos ferramentas de quantização.' },
        { option: 'Pós-filtro por permissões no código', why: 'Com filtros selectivos (uma região, um ramo), o top-20 global ficava quase vazio depois de filtrar.' },
        { option: 'Serviço vectorial gerido fora da UE', why: 'Restrição de residência dos dados.' },
      ],
      costNote:
        'Custo dominado pela memória do motor vectorial: dimensiona-se pelos vectores quantizados mais o grafo, com os originais em disco. Preços a confirmar no fornecedor de cloud.',
      takeaways: [
        'A decisão entre pgvector e motor dedicado começa numa conta de memória.',
        'Filtros selectivos têm de participar na pesquisa, não ser aplicados depois.',
        'O motor vectorial é um índice derivado; a fonte de verdade fica na base transaccional.',
      ],
      refs: [
        { label: 'Qdrant — Quantization', url: 'https://qdrant.tech/documentation/guides/quantization/' },
        { label: 'PostgreSQL — Replicação lógica', url: 'https://www.postgresql.org/docs/current/logical-replication.html' },
      ],
    },
  ],
};
