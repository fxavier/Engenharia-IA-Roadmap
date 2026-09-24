import type { Module } from '../types';

export const m21: Module = {
  id: 'avaliar-rag',
  number: 21,
  part: 'avaliacao',
  title: 'Avaliar RAG',
  subtitle: 'Um RAG são duas máquinas em série: uma que encontra e outra que escreve. Mede-se cada uma à parte, ou nunca se sabe qual das duas partiu',
  icon: '🎯',
  minutes: 95,
  tags: ['recall@k', 'nDCG', 'faithfulness', 'RAGAS', 'bootstrap'],
  goals: [
    'Decompor a avaliação de um RAG em recuperação e geração, e saber que métrica apanha cada uma das falhas típicas (documento não encontrado, contexto ruidoso, resposta inventada, resposta fiel mas errada).',
    'Calcular à mão e em código recall@k, precision@k, MRR e nDCG@k, e explicar porque é que duas pesquisas com o mesmo recall podem ter nDCG muito diferente.',
    'Comparar BM25, denso, híbrido e re-ranking com os números reais do `balcao` e decidir, com intervalo de confiança pareado, quando uma diferença é real.',
    'Usar faithfulness, answer relevancy, context precision e context recall (RAGAS), saber o que cada uma mede de facto e onde uma versão lexical barata falha.',
    'Reconhecer as armadilhas clássicas: juiz a avaliar-se a si próprio, relevância mal anotada, métricas ao nível do chunk contra o nível do documento, e perguntas fora de âmbito a contaminar médias.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'duas-maquinas',
      title: 'Avaliar um RAG é avaliar duas máquinas',
      blocks: [
        {
          type: 'p',
          text:
            'O módulo 20 montou a infra-estrutura geral: conjunto dourado, bootstrap, análise de erros. Aqui aplica-se isso ao sistema que responde a 18% das conversas do «Balcão» só com RAG (a intenção `politica`) e a uma boa parte das de `compensacao` e `pagamentos`. A pergunta de partida é simples: quando uma resposta sai errada, **onde** partiu?',
        },
        {
          type: 'p',
          text:
            'Um RAG é uma composição de duas funções. O *retriever* recebe a pergunta e devolve uma lista ordenada de chunks; o *gerador* recebe a pergunta mais esses chunks e devolve texto. Se medires só a resposta final, uma queda de qualidade pode vir de qualquer das duas, e as correcções são opostas: um retriever que não encontra `pol-reembolso-prazos` corrige-se com pesquisa híbrida ou chunking; um gerador que tem o chunk certo e escreve «72 horas» corrige-se no prompt, no modelo ou numa guarda de saída. Trocar o modelo quando o problema é o índice custa dinheiro e não resolve nada.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Onde se mede um RAG',
            caption: 'Cada seta tem uma métrica. As da esquerda precisam só de ids de documento anotados (baratas, deterministas, correm em cada PR); as da direita precisam de texto de referência ou de um juiz (mais caras, nocturnas).',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'zr', label: 'Recuperação: ids e ordem', col: 0, row: 0, colSpan: 2, rowSpan: 3, tone: 'rag' },
              { id: 'zg', label: 'Geração: texto contra contexto e referência', col: 3, row: 0, colSpan: 2, rowSpan: 3, tone: 'agente' },
            ],
            nodes: [
              { id: 'q', label: 'Pergunta dourada', sub: 'g14 · «cerveja às 23h?»', col: 0, row: 0, kind: 'user' },
              { id: 'ret', label: 'Retriever', sub: 'BM25 · denso · RRF · re-rank', col: 1, row: 0, kind: 'vector' },
              { id: 'rank', label: 'Ranking de chunks', sub: 'top-k com scores', col: 1, row: 1, kind: 'data' },
              { id: 'mr', label: 'recall@k · MRR · nDCG', sub: 'contra `relevantes` anotados', col: 0, row: 2, span: 2, kind: 'note' },
              { id: 'ctx', label: 'Contexto', sub: 'k chunks delimitados', col: 2, row: 1, kind: 'data' },
              { id: 'gen', label: 'Gerador', sub: 'modelo médio + prompt RAG', col: 3, row: 0, kind: 'model' },
              { id: 'resp', label: 'Resposta com citações', col: 4, row: 0, kind: 'data' },
              { id: 'mg', label: 'faithfulness · relevância · correcção', sub: 'juiz ou heurística', col: 3, row: 2, span: 2, kind: 'note' },
              { id: 'mc', label: 'context precision / recall', sub: 'o contexto tinha o que a referência precisa?', col: 2, row: 2, kind: 'note' },
            ],
            edges: [
              { from: 'q', to: 'ret' },
              { from: 'ret', to: 'rank' },
              { from: 'rank', to: 'mr', style: 'dashed', label: 'mede' },
              { from: 'rank', to: 'ctx' },
              { from: 'ctx', to: 'gen' },
              { from: 'q', to: 'gen', style: 'dashed' },
              { from: 'gen', to: 'resp' },
              { from: 'ctx', to: 'mc', style: 'dashed', label: 'mede' },
              { from: 'resp', to: 'mg', style: 'dashed', label: 'mede' },
            ],
          },
        },
        {
          type: 'table',
          head: ['Falha observada', 'Onde nasce', 'Métrica que a apanha', 'O que se corrige'],
          rows: [
            ['O documento certo não aparece no top-k', 'Retriever', 'recall@k (e context recall)', 'Pesquisa híbrida, sinónimos, chunking, k maior'],
            ['O documento certo aparece, mas em 5.º', 'Retriever (ordem)', 'MRR, nDCG@k', 'Re-ranking; o gerador lê pior o fim do contexto'],
            ['Contexto cheio de chunks irrelevantes', 'Retriever (precisão)', 'precision@k, context precision', 'k menor, limiar de score, re-ranking'],
            ['Resposta afirma o que não está no contexto', 'Gerador', 'faithfulness', 'Prompt, modelo, guarda de citações (adr-0011)'],
            ['Resposta fiel ao contexto mas não responde à pergunta', 'Gerador', 'answer relevancy, correcção contra referência', 'Prompt, selecção de frases, modelo'],
            ['Resposta fiel a um chunk de política substituída', 'Índice (metadados)', 'Nenhuma das anteriores: precisa de teste dedicado', 'Filtro `vigente = true` na base de dados (adr-0010)'],
          ],
          caption: 'A última linha é a razão para nunca confiar só em métricas genéricas: uma resposta fiel a um documento de 2025 tem faithfulness 1,0 e está errada.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A regra de ouro',
          text:
            'Mede a recuperação **sem** o gerador e a geração **com o contexto fixo**. Se a recuperação está estável e a correcção cai, o problema está no prompt ou no modelo. Se a recuperação cai, nem vale a pena olhar para a geração antes de a corrigir: um gerador perfeito não responde com um documento que não recebeu.',
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-avaliar-rag-01',
            title: 'Uma corrida de avaliação componente a componente',
            intro: 'O que `correr.py` faz a cada pergunta dourada do tipo `rag`. Os tempos vêm do orçamento de latência de referência (modelo real); no modo simulado tudo corre em milissegundos, e com modelo real o passo do juiz domina.',
            lanes: [
              { id: 'ev', label: 'Corredor de evals', sub: 'balcao.avaliacao.correr', kind: 'service' },
              { id: 'ret', label: 'Recuperador', sub: 'RecuperadorHibrido', kind: 'store' },
              { id: 'rag', label: 'Cadeia RAG', sub: 'LCEL', kind: 'model' },
              { id: 'juiz', label: 'Juiz', sub: 'heurístico ou escalão grande', kind: 'model' },
            ],
            steps: [
              { from: 'ev', to: 'ev', label: 'Ler g14 do dourado.jsonl', detail: 'Pergunta, `relevantes: [pol-bebidas-alcool, faq-horarios]`, resposta de referência.', kind: 'self' },
              { from: 'ev', to: 'ret', label: 'pesquisar_com_scores(pergunta, k=5)', detail: 'Só o retriever, sem modelo: é por isto que as métricas de recuperação correm em cada PR sem custo.', kind: 'req', ms: 45 },
              { from: 'ret', to: 'ev', label: 'Ranking de chunks', detail: 'Vários chunks do mesmo documento colapsam num id (`docs_unicos`), pela ordem da primeira ocorrência.', kind: 'res' },
              { from: 'ev', to: 'ev', label: 'recall@5 e MRR', detail: 'Contra os ids anotados. Determinista: a mesma versão do índice dá sempre o mesmo número.', kind: 'self', code: 'docs = docs_unicos(d.metadata["documento_id"] for d, _ in res)\nm = {"recall_at_5": recall_at_k(docs, caso.relevantes, 5),\n     "mrr": mrr(docs, caso.relevantes)}', lang: 'python' },
              { from: 'ev', to: 'rag', label: 'cadeia_rag.invoke({pergunta})', detail: 'O sistema completo: recupera de novo, monta o prompt, gera, valida citações.', kind: 'req', ms: 700 },
              { from: 'rag', to: 'ev', label: 'resposta, citações, documentos', kind: 'res' },
              { from: 'ev', to: 'juiz', label: 'julgar(pergunta, resposta, contexto, referência)', detail: 'O contexto que o juiz vê é o que o gerador viu, não o ideal. Faithfulness mede-se contra isso.', kind: 'req', ms: 1100 },
              { from: 'juiz', to: 'ev', label: 'Veredicto {fiel, correcta, cita_fonte}', detail: 'Binário por critério (adr-0019); a nota de 1 a 5 é só para leitura humana.', kind: 'res' },
              { from: 'ev', to: 'ev', label: 'Agregar por intenção e bootstrap', detail: 'Média global, IC a 95% e médias por intenção; o gate lê isto.', kind: 'self' },
            ],
            outro: 'Repara que o recuperador é chamado duas vezes: uma para medir a recuperação isolada, outra dentro da cadeia. Custa ≈ 45 ms e evita acoplar a métrica de recuperação a detalhes da cadeia.',
          },
        },
        { type: 'adr', ref: 'adr-0018' },
        {
          type: 'p',
          text:
            'O ADR fixa o que isto implica: as métricas de recuperação e as asserções correm em cada pull request com o modelo simulado (baratas, deterministas, sem rede); as de geração com juiz correm à noite com o modelo real. O gate de CI é tema do módulo 28; aqui interessa perceber o que cada número diz e o que não diz.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Lewis et al. — Retrieval-Augmented Generation (2020)', url: 'https://arxiv.org/abs/2005.11401' },
            { label: 'RAGAS — métricas disponíveis', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/' },
            { label: 'Anthropic — definir critérios de sucesso e testes', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'metricas-ordem',
      title: 'Métricas de recuperação: presença e ordem',
      blocks: [
        {
          type: 'p',
          text:
            'As quatro métricas clássicas de *information retrieval* respondem a perguntas diferentes. Recall@k: o que era preciso apareceu? Precision@k: quanto do que apareceu era preciso? MRR: quão cedo apareceu o primeiro relevante? nDCG@k: os relevantes estão arrumados no topo? No «Balcão» calculam-se **ao nível do documento**: vários chunks do mesmo documento contam uma vez, porque a anotação do conjunto dourado é por documento (`relevantes: ["pol-reembolso-prazos"]`).',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliar-rag-01',
            title: 'Recall@k e precision@k',
            expr: 'recall@k    = |Rel ∩ Top_k| / |Rel|\nprecision@k = |Rel ∩ Top_k| / k',
            where: [
              { sym: 'Rel', means: 'conjunto de documentos relevantes anotados para a pergunta (ex. {pol-bebidas-alcool, faq-horarios})' },
              { sym: 'Top_k', means: 'os k primeiros documentos distintos do ranking' },
              { sym: 'k', means: 'quantos documentos entram no contexto; o «Balcão» usa 3 a 5' },
            ],
            reading: 'Recall é a fracção do necessário que chegou ao contexto; precision é a fracção do contexto que era necessária.',
            note: 'Com um só documento relevante, precision@k nunca passa de 1/k. Por isso precision@5 = 0,2 pode ser um resultado perfeito.',
          },
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliar-rag-02',
            title: 'MRR (mean reciprocal rank)',
            expr: 'RR(q)  = 1 / rank_q      (0 se nenhum relevante no top-k)\nMRR    = (1/|Q|) · Σ_q RR(q)',
            where: [
              { sym: 'rank_q', means: 'posição (a partir de 1) do primeiro documento relevante para a pergunta q' },
              { sym: 'Q', means: 'as perguntas douradas avaliadas (30 no `balcao`, 240 em produção)' },
            ],
            reading: 'O inverso da posição do primeiro acerto, em média: 1 se está em primeiro, 0,5 em segundo, 0,33 em terceiro.',
            note: 'Só olha para o primeiro relevante. Com duas fontes necessárias (g14 precisa da política de álcool e do horário), MRR não vê a segunda.',
          },
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliar-rag-03',
            title: 'nDCG@k com relevância binária',
            expr: 'DCG@k  = Σ_{i=1..k} rel_i / log2(i + 1)\nIDCG@k = Σ_{i=1..min(k, |Rel|)} 1 / log2(i + 1)\nnDCG@k = DCG@k / IDCG@k',
            where: [
              { sym: 'rel_i', means: '1 se o documento na posição i é relevante, 0 se não (o `balcao` usa relevância binária)' },
              { sym: 'log2(i + 1)', means: 'desconto por posição: 1 na posição 1, 0,63 na 2, 0,5 na 3, 0,43 na 4' },
              { sym: 'IDCG@k', means: 'o DCG do ranking ideal, com todos os relevantes no topo; normaliza para [0, 1]' },
            ],
            reading: 'Soma os acertos descontados pela posição e divide pelo melhor valor possível.',
            note: 'Com relevância graduada (0, 1, 2), o numerador usa rel_i ou 2^rel_i − 1; o conjunto dourado do «Balcão» é binário porque a anotação graduada custa três vezes mais e o suporte discorda mais nela.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliar-rag-01',
            title: 'As quatro métricas numa pergunta difícil',
            brief: 'A g14 precisa de dois documentos. O híbrido e o re-ranking encontram o mesmo conjunto no top-5, mas não pela mesma ordem. Runtime didáctico: embeddings por hashing e BM25 sobre radicais.',
            code: `import balcao as b

p = next(x for x in b.PERGUNTAS if x["id"] == "g14")
print(p["pergunta"], "->", p["relevantes"])

for metodo in ("hibrido", "rerank"):
    docs = []
    for c, _ in b.recuperar(p["pergunta"], k=30, metodo=metodo):
        if c.doc not in docs:          # vários chunks do mesmo doc contam uma vez
            docs.append(c.doc)
    topo = docs[:5]
    print(f"\\n{metodo}: {topo}")
    rel = p["relevantes"]
    print(f"  recall@5    = {b.recall_at_k(topo, rel, 5):.3f}")
    print(f"  precision@5 = {b.precisao_at_k(topo, rel, 5):.3f}")
    print(f"  RR          = {b.mrr(topo, rel):.3f}")
    print(f"  nDCG@5      = {b.ndcg_at_k(topo, rel, 5):.3f}")`,
            expected: `Posso pedir cerveja às 23h? -> ['pol-bebidas-alcool', 'faq-horarios']

hibrido: ['faq-conta-apagar', 'faq-dados-pessoais', 'faq-codigo-entrega', 'pol-bebidas-alcool', 'int-ferramentas-guia']
  recall@5    = 0.500
  precision@5 = 0.200
  RR          = 0.250
  nDCG@5      = 0.264

rerank: ['pol-bebidas-alcool', 'faq-conta-apagar', 'faq-dados-pessoais', 'faq-codigo-entrega', 'int-ferramentas-guia']
  recall@5    = 0.500
  precision@5 = 0.200
  RR          = 1.000
  nDCG@5      = 0.613`,
          },
        },
        {
          type: 'p',
          text:
            'Recall e precision são iguais nos dois métodos: o mesmo conjunto no top-5. RR passa de 0,25 para 1 e nDCG de 0,264 para 0,613, porque o re-ranker trouxe a política de álcool do 4.º para o 1.º lugar. Nenhum dos dois encontrou `faq-horarios`: o texto diz «das 07h00 às 23h00», a pergunta diz «23h», e o radical `23h` não é o mesmo termo que `23h00`. É uma falha de recuperação que nenhum modelo resolve a jusante. O nDCG de 0,613 é o máximo que este ranking pode ter: IDCG@5 = 1 + 1/log2(3) = 1,631, DCG = 1.',
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-avaliar-rag-01',
            title: 'g14 com o híbrido (RRF): o relevante em 4.º',
            brief: 'O BM25 puxa documentos que contêm «pedir» (pedir para apagar a conta, pedir o código). O RRF funde as duas listas pela posição, e esses documentos sobem.',
            query: 'Posso pedir cerveja às 23h?',
            method: 'hibrido',
            k: 5,
            hits: [
              { doc: 'faq-conta-apagar', texto: 'O cliente pode pedir para apagar a conta em Perfil > Privacidade. Os dados pessoais são apagados em até 30 dias.', score: 0.03227, relevante: false },
              { doc: 'faq-dados-pessoais', texto: 'Usamos o nome, o telefone e a morada para entregar os pedidos, e o histórico de pedidos para o suporte e para recomendações.', score: 0.03126, relevante: false },
              { doc: 'faq-codigo-entrega', texto: 'Cada pedido tem um código de entrega de 4 dígitos, que aparece na aplicação.', score: 0.03041, relevante: false },
              { doc: 'pol-bebidas-alcool', texto: 'Bebidas alcoólicas só são vendidas a maiores de 18 anos. [...] As bebidas alcoólicas só são entregues até às 22h00.', score: 0.01639, relevante: true },
              { doc: 'int-ferramentas-guia', texto: 'Para perguntas sobre um pedido concreto, o assistente consulta primeiro o pedido com ler_pedido e só depois responde.', score: 0.01613, relevante: false },
            ],
            note: 'Scores RRF com k = 60: 1/61 + 1/62 ≈ 0,0325 é o máximo para um chunk em 1.º nas duas listas.',
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-avaliar-rag-02',
            title: 'g14 depois do re-ranking dos 20 primeiros',
            brief: 'O re-ranker olha para a pergunta e o chunk juntos (cobertura de termos, bigramas, números, título) e reordena. `antes` é a posição no híbrido.',
            query: 'Posso pedir cerveja às 23h?',
            method: 'rerank',
            k: 5,
            hits: [
              { doc: 'pol-bebidas-alcool', texto: 'Bebidas alcoólicas só são vendidas a maiores de 18 anos. [...] As bebidas alcoólicas só são entregues até às 22h00.', score: 0.2429, relevante: true, antes: 4 },
              { doc: 'faq-conta-apagar', texto: 'O cliente pode pedir para apagar a conta em Perfil > Privacidade.', score: 0.1687, relevante: false, antes: 1 },
              { doc: 'faq-dados-pessoais', texto: 'Usamos o nome, o telefone e a morada para entregar os pedidos.', score: 0.1637, relevante: false, antes: 2 },
              { doc: 'faq-codigo-entrega', texto: 'Cada pedido tem um código de entrega de 4 dígitos, que aparece na aplicação.', score: 0.1579, relevante: false, antes: 3 },
              { doc: 'int-ferramentas-guia', texto: 'Para perguntas sobre um pedido concreto, o assistente consulta primeiro o pedido com ler_pedido.', score: 0.0619, relevante: false, antes: 5 },
            ],
            note: 'O re-ranker não inventa candidatos: `faq-horarios` não estava nos 20 do híbrido, por isso não pode aparecer aqui. O recall do re-ranking está limitado pelo recall@20 da fase anterior.',
          },
        },
        {
          type: 'widget',
          id: 'metricas-retrieval',
        },
        {
          type: 'p',
          text:
            'No simulador escolhes uma pergunta dourada, carregas o ranking real de cada método, marcas o que é relevante e reordenas à mão. Experimenta tirar a marca de relevante a um documento que o conjunto anota: é o efeito de uma anotação errada, e vês a métrica mudar sem o sistema ter mudado.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: optimizar precision@k com um só relevante',
          text:
            'Numa pergunta com um único documento relevante, precision@5 é no máximo 0,2 e só sobe se baixares k. Uma equipa que põe «precision@5 ≥ 0,6» como objectivo acaba a reduzir k para 1, e a primeira pergunta com duas fontes necessárias (g09, g14, g24) perde metade da resposta. No «Balcão», o gate é sobre recall@5; precision entra como diagnóstico de ruído no contexto, e o custo desse ruído mede-se em tokens.',
        },
        {
          type: 'refs',
          items: [
            { label: 'BEIR — benchmark de recuperação com nDCG@10', url: 'https://arxiv.org/abs/2104.08663' },
            { label: 'MTEB — Massive Text Embedding Benchmark', url: 'https://huggingface.co/spaces/mteb/leaderboard' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'numeros-balcao',
      title: 'Comparar técnicas com os números do «Balcão»',
      blocks: [
        {
          type: 'p',
          text:
            'Antes dos números, o aviso que acompanha todos os blocos «Correr»: o `balcao` é um runtime didáctico e determinista. O embedding é por hashing com uma tabela de sinónimos, não uma rede neuronal; o BM25 é real mas sobre radicais caseiros; o corpus tem 40 documentos e o conjunto dourado 30 perguntas. Os números servem para **comparar técnicas entre si** e para aprender a ler métricas, não para prever o que `nomic-embed-text` com pgvector daria nos 214 documentos de produção.',
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliar-rag-02',
            title: 'Os quatro métodos, em k = 3 e k = 5',
            brief: '`avaliar_recuperacao` corre as 30 perguntas douradas e devolve médias ao nível do documento.',
            code: `import balcao as b

print(f"{'método':<9}{'k':>3}{'recall':>8}{'MRR':>7}{'nDCG':>7}")
for k in (3, 5):
    for metodo in ("bm25", "denso", "hibrido", "rerank"):
        r = b.avaliar_recuperacao(metodo, k)
        print(f"{metodo:<9}{k:>3}{r['recall']:>8.3f}{r['mrr']:>7.3f}{r['ndcg']:>7.3f}")`,
            expected: `método     k  recall    MRR   nDCG
bm25       3   0.833  0.706  0.738
denso      3   0.900  0.867  0.858
hibrido    3   0.933  0.828  0.855
rerank     3   0.950  0.889  0.896
bm25       5   0.867  0.714  0.753
denso      5   0.950  0.875  0.881
hibrido    5   0.950  0.836  0.864
rerank     5   0.950  0.889  0.896`,
          },
        },
        {
          type: 'table',
          head: ['Leitura', 'O que os números mostram', 'Cuidado'],
          rows: [
            ['BM25 perde em recall', '0,833 contra 0,900 do denso em k = 3', 'Perde nas perguntas com sinónimos («estorno», «motoqueiro»); ganharia em códigos e números'],
            ['O híbrido sobe o recall mas baixa o MRR', 'recall@3 0,933, MRR 0,828 contra 0,867 do denso', 'O RRF traz o relevante para o top-3 mas nem sempre para 1.º: as listas discordam na ordem'],
            ['O re-ranking recupera a ordem', 'MRR 0,889 e nDCG 0,896, os melhores', 'Custa ≈ 180 ms no orçamento de latência; é a fase mais cara antes do modelo'],
            ['Em k = 5 os métodos densos empatam', 'recall@5 = 0,950 em denso, híbrido e re-rank', 'Com 30 perguntas, 0,950 são 28,5 acertos: uma pergunta muda tudo'],
          ],
          caption: 'São os números da tabela de referência do CONTRATO. A tentação é escolher o re-ranking por ter o maior número em todas as colunas; a secção seguinte mostra porque isso ainda não chega.',
        },
        {
          type: 'p',
          text:
            'Trinta perguntas são poucas. A pergunta certa não é «qual tem a média maior?» mas «a diferença sobrevive à troca das perguntas?». O bootstrap (módulo 20) responde a isso reamostrando as perguntas com reposição. Para comparar dois métodos sobre **as mesmas** perguntas, faz-se o bootstrap da diferença pergunta a pergunta, o que desconta a dificuldade de cada pergunta: é o equivalente a um teste pareado.',
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliar-rag-03',
            title: 'Intervalo de confiança pareado: que diferenças são reais?',
            brief: 'Recall@3 por pergunta para cada método, e o bootstrap (2 000 reamostras, semente fixa) da diferença pareada.',
            code: `import balcao as b

def docs_de(pergunta, metodo):
    docs = []
    for c, _ in b.recuperar(pergunta, k=30, metodo=metodo):
        if c.doc not in docs:
            docs.append(c.doc)
    return docs

def por_pergunta(metodo, k=3):
    return [b.recall_at_k(docs_de(p["pergunta"], metodo), p["relevantes"], k) for p in b.PERGUNTAS]

r = {m: por_pergunta(m) for m in ("bm25", "denso", "hibrido", "rerank")}
print("bm25   recall@3 (média, IC95):", b.bootstrap_ic(r["bm25"]))
print("rerank recall@3 (média, IC95):", b.bootstrap_ic(r["rerank"]))
for a, c in (("rerank", "bm25"), ("hibrido", "denso"), ("rerank", "hibrido")):
    dif = [x - y for x, y in zip(r[a], r[c])]
    print(f"{a} - {c}: {b.bootstrap_ic(dif)}")`,
            expected: `bm25   recall@3 (média, IC95): (0.8333, 0.7, 0.9667)
rerank recall@3 (média, IC95): (0.95, 0.8667, 1.0)
rerank - bm25: (0.1167, 0.0167, 0.2333)
hibrido - denso: (0.0333, -0.0333, 0.1167)
rerank - hibrido: (0.0167, 0.0, 0.05)`,
          },
        },
        {
          type: 'p',
          text:
            'Os intervalos individuais do BM25 [0,70; 0,97] e do re-ranking [0,87; 1,00] sobrepõem-se, e mesmo assim a diferença pareada [0,017; 0,233] exclui o zero: o re-ranking é melhor do que o BM25 nestas perguntas. Já o híbrido contra o denso inclui o zero (−0,033 a 0,117), e o re-ranking contra o híbrido tem o limite inferior em 0,0 exactamente: nesta amostra não se distingue de «não mudou nada». Olhar para intervalos individuais sobrepostos e concluir «não há diferença» é um erro comum; comparar médias sem intervalo é o erro oposto.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O que o intervalo não te diz',
          text:
            'O bootstrap mede a incerteza por amostragem de perguntas, não o viés do conjunto. Se as 30 perguntas não representam o tráfego (por exemplo, nenhuma com número de pedido, nenhuma em inglês), o intervalo é estreito e errado. A estratificação por intenção do módulo 20 é o que dá sentido ao intervalo.',
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliar-rag-04',
            title: 'O chunking muda o recall? Neste corpus, pouco',
            brief: '`recuperar` aceita a estratégia de chunking. Recall@3 médio por estratégia e método, e o número de chunks gerados.',
            code: `import numpy as np
import balcao as b

def recall3(metodo, estrategia):
    v = []
    for p in b.PERGUNTAS:
        docs = []
        for c, _ in b.recuperar(p["pergunta"], k=30, metodo=metodo, estrategia=estrategia):
            if c.doc not in docs:
                docs.append(c.doc)
        v.append(b.recall_at_k(docs, p["relevantes"], 3))
    return float(np.mean(v))

for est in ("fixo", "frases", "recursivo"):
    n = len(b.chunkar_corpus(est))
    linha = "  ".join(f"{m}={recall3(m, est):.3f}" for m in ("bm25", "denso", "hibrido"))
    print(f"{est:<10} chunks={n:<3} {linha}")`,
            expected: `fixo       chunks=51  bm25=0.833  denso=0.933  hibrido=0.900
frases     chunks=50  bm25=0.800  denso=0.917  hibrido=0.900
recursivo  chunks=46  bm25=0.833  denso=0.900  hibrido=0.933`,
          },
        },
        {
          type: 'p',
          text:
            'Os 40 documentos da amostra são curtos (a maioria cabe num só chunk de 80 palavras), por isso trocar a estratégia muda 5 chunks e mexe o recall em ±0,03, dentro do ruído que a secção anterior mediu. Seria um erro concluir «o chunking fixo é melhor para o denso». Com os 214 documentos de produção, alguns com várias páginas, a mesma experiência dá diferenças maiores: é lá que a adr-0008 se decidiu. A lição é de método: **uma experiência de chunking só diz alguma coisa num corpus onde o chunking tem margem para mudar o resultado**.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O mesmo cálculo no laboratório real, contra o índice que o sistema usa (pgvector ou memória), com as funções de `balcao.avaliacao.metricas`.',
          code: `from balcao.avaliacao import correr
from balcao.avaliacao.metricas import bootstrap_ic, docs_unicos, mrr, recall_at_k
from balcao.config import obter_config
from balcao.grafo import montar_sistema

cfg = obter_config()                       # BALCAO_* do ambiente; pgvector se houver DATABASE_URL
sistema = montar_sistema(cfg)
casos = [c for c in correr.carregar_casos(cfg, "dourado") if c.tipo == "rag"]

recall, rr = [], []
for caso in casos:
    res = sistema.recuperador.pesquisar_com_scores(caso.pergunta, k=5)
    docs = docs_unicos(d.metadata["documento_id"] for d, _ in res)
    recall.append(recall_at_k(docs, caso.relevantes, 5))
    rr.append(mrr(docs, caso.relevantes))

print("recall@5", bootstrap_ic(recall))    # (média, limite inferior, limite superior)
print("MRR@5   ", bootstrap_ic(rr))`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção: por intenção, e contra a versão que está no ar',
          text:
            'O gate do «Balcão» não pergunta «recall@5 ≥ 0,80?» sozinho. Compara a candidata com a versão em produção **por intenção**, porque um re-ranker novo pode subir a média e afundar `pagamentos` (onde as perguntas têm códigos como `RB-` e números de carteira que o denso trata mal). Uma intenção com 14% do tráfego a perder 10 pontos custa mais do que a média a ganhar 2. O mecanismo está no módulo 28.',
        },
        {
          type: 'refs',
          items: [
            { label: 'NIST e-Handbook — Bootstrap Plot', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/bootplot.htm' },
            { label: 'NumPy — Generator.choice', url: 'https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.choice.html' },
            { label: 'Anthropic — Contextual Retrieval (avaliação por recall@20)', url: 'https://www.anthropic.com/news/contextual-retrieval' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'geracao',
      title: 'Avaliar a geração: faithfulness, relevância e contexto',
      blocks: [
        {
          type: 'p',
          text:
            'Com o contexto fixo, a pergunta passa a ser sobre o texto gerado. O RAGAS popularizou quatro métricas que hoje são vocabulário comum; convém saber exactamente o que cada uma calcula, porque os nomes prometem mais do que medem.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Faithfulness', def: 'Fracção das afirmações da resposta que se inferem do contexto recuperado. Um LLM parte a resposta em afirmações e verifica cada uma contra o contexto. Não olha para a referência: uma resposta fiel pode estar errada.' },
            { term: 'Answer relevancy (Response Relevancy)', def: 'Quão bem a resposta responde à pergunta. O RAGAS gera, a partir da resposta, algumas perguntas artificiais e mede a semelhança de cosseno média entre os embeddings dessas perguntas e o da pergunta original. Não mede correcção.' },
            { term: 'Context precision', def: 'Se os chunks relevantes do contexto estão no topo: média de precision@i sobre as posições i relevantes. Precisa de saber que chunks são relevantes (por referência ou por juiz).' },
            { term: 'Context recall', def: 'Fracção das afirmações da resposta de referência que se podem atribuir ao contexto recuperado. Mede se o retriever trouxe o suficiente para responder bem.' },
          ],
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliar-rag-04',
            title: 'Faithfulness e context recall (RAGAS)',
            expr: 'faithfulness   = |afirmações da resposta suportadas pelo contexto| / |afirmações da resposta|\ncontext_recall = |afirmações da referência atribuíveis ao contexto| / |afirmações da referência|',
            where: [
              { sym: 'afirmações', means: 'frases atómicas extraídas por um LLM («o reembolso M-Pesa chega em 24 h»)' },
              { sym: 'contexto', means: 'os chunks que o gerador recebeu neste turno, não o corpus inteiro' },
              { sym: 'referência', means: 'a `resposta` anotada no conjunto dourado' },
            ],
            reading: 'A primeira pergunta se a resposta inventou; a segunda, se o contexto tinha o que era preciso.',
            note: 'As duas dependem de um LLM a extrair e a verificar afirmações: herdam os vieses do juiz (módulo 22).',
          },
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliar-rag-05',
            title: 'Context precision@K (RAGAS)',
            expr: 'context_precision@K = Σ_{k=1..K} (precision@k · v_k) / |{k ≤ K : v_k = 1}|',
            where: [
              { sym: 'v_k', means: '1 se o chunk na posição k é relevante, 0 se não' },
              { sym: 'precision@k', means: 'a fórmula da secção anterior, calculada até à posição k' },
            ],
            reading: 'A média das precisões medidas em cada posição onde aparece um relevante.',
            note: 'É a *average precision* do IR clássico. Com um só relevante, é igual ao reciprocal rank.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliar-rag-05',
            title: 'Faithfulness por sobreposição, e onde falha',
            brief: '`fidelidade` é a ideia do RAGAS sem LLM: cada frase precisa de 50% dos seus radicais no contexto. Três respostas à mesma pergunta, contra o contexto do re-ranking com `vigente = true`.',
            code: `import balcao as b

pergunta = "Quanto tempo demora a devolução do dinheiro no M-Pesa?"
res = b.recuperar(pergunta, k=3, metodo="rerank", filtro={"vigente": True})
contexto = "\\n".join(f"[{c.doc}] {c.texto}" for c, _ in res)
print("contexto:", [c.doc for c, _ in res])

respostas = {
    "fiel": "Depois de aprovado, o reembolso para M-Pesa chega em até 24 horas. [pol-reembolso-prazos]",
    "inventa": "O reembolso para M-Pesa chega em até 24 horas. Se demorar mais, recebe um cupão de 50 MZN de compensação.",
    "antiga": "Os reembolsos para M-Pesa são processados em até 72 horas.",
}
for nome, r in respostas.items():
    f = b.fidelidade(r, contexto)
    print(f"\\n{nome}: fidelidade = {f['fidelidade']}")
    for frase, cob, ok in f["frases"]:
        print(f"  {'ok ' if ok else 'NAO'} {cob:.2f}  {frase[:60]}")`,
            expected: `contexto: ['pol-reembolso-prazos', 'pol-reembolso-prazos', 'pol-reembolso']

fiel: fidelidade = 1.0
  ok  1.00  Depois de aprovado, o reembolso para M-Pesa chega em até 24

inventa: fidelidade = 0.5
  ok  1.00  O reembolso para M-Pesa chega em até 24 horas.
  NAO 0.33  Se demorar mais, recebe um cupão de 50 MZN de compensação.

antiga: fidelidade = 1.0
  ok  0.60  Os reembolsos para M-Pesa são processados em até 72 horas.`,
          },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '«72 horas» passa com fidelidade 1,0',
          text:
            'A terceira resposta copia a política de 2025, que o filtro excluiu do contexto, e mesmo assim tem 60% dos radicais no contexto («reembolso», «M-Pesa», «até», «horas»). A métrica lexical não sabe que 72 não é 24. É por isso que o `JuizHeuristico` do laboratório exige, além da sobreposição, que **os números da referência apareçam na resposta**, e que em produção a faithfulness vem de um juiz com rubrica. Uma métrica barata serve de alarme; não serve de prova.',
        },
        {
          type: 'p',
          text:
            'A outra metade do problema é a resposta fiel e inútil. Corre-se o `ModeloSimulado` (que responde por extracção de frases do contexto) sobre as 30 perguntas com o re-ranking, `k = 3` e filtros `vigente` e `publico`, e julga-se com o `JuizHeuristico` do laboratório: **30 em 30 fiéis, 17 em 30 correctas**. Trocar o retriever mexe pouco: 15 correctas com BM25, 16 com o híbrido, 17 com denso ou re-ranking. A recuperação melhorou 12 pontos de recall@3 e a correcção só 2 respostas. O gargalo desta configuração é o gerador, e só a decomposição o mostra.',
        },
        {
          type: 'eval',
          eval: {
            id: 'ev-avaliar-rag-01',
            title: 'Fiel não é correcto: cinco perguntas douradas',
            brief: '`ModeloSimulado` com re-ranking, k = 3, filtro `vigente` e `publico`; veredicto do `JuizHeuristico` (fiel, correcta, cita_fonte). Passa quem é fiel **e** correcto.',
            metric: 'fiel e correcta (juiz heurístico)',
            cases: [
              {
                id: 'g14',
                input: 'Posso pedir cerveja às 23h?',
                expect: 'Não: bebidas alcoólicas só até às 22h00.',
                rubric: ['fiel: todas as frases sustentadas pelo contexto', 'correcta: mesma informação essencial e mesmos números que a referência', 'cita_fonte: citações existem no contexto'],
                got: 'Bebidas alcoólicas só são vendidas a maiores de 18 anos. [pol-bebidas-alcool] As bebidas alcoólicas só são entregues até às 22h00. [pol-bebidas-alcool]',
                pass: true,
              },
              {
                id: 'g07',
                input: 'Posso juntar dois cupões no mesmo pedido?',
                expect: 'Não: um cupão por pedido e não acumulável com outras promoções.',
                got: 'Um pedido em grupo junta até 8 pessoas no mesmo carrinho. [faq-pedido-grupo] Só se pode usar um cupão por pedido e os cupões não são acumuláveis com outras promoções. [pol-cupoes]',
                pass: true,
              },
              {
                id: 'g01',
                input: 'Quanto tempo demora a devolução do dinheiro no M-Pesa?',
                expect: 'Até 24 horas depois de o reembolso ser aprovado.',
                got: 'Depois de aprovado, o reembolso chega em prazos diferentes conforme o meio de pagamento. [pol-reembolso-prazos] Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso [...]',
                pass: false,
              },
              {
                id: 'g30',
                input: 'Qual é o prazo para pedir reembolso?',
                expect: 'Até 48 horas depois da entrega.',
                got: 'Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso [...] [pol-reembolso-prazos]',
                pass: false,
              },
              {
                id: 'g05',
                input: 'Quanto custa a entrega para 5 km?',
                expect: '95 MZN (entre 3 e 6 km).',
                got: 'A taxa de entrega depende da distância [...]: 60 MZN até 3 km, 95 MZN entre 3 e 6 km, e 150 MZN entre 6 e 10 km. [pol-taxa-entrega]',
                pass: true,
              },
            ],
            runs: [
              { versao: 'bm25, k=3', passou: 15, total: 30, nota: 'recall@3 = 0,833; 30/30 fiéis' },
              { versao: 'hibrido, k=3', passou: 16, total: 30, nota: 'recall@3 = 0,933' },
              { versao: 'denso, k=3', passou: 17, total: 30, nota: 'recall@3 = 0,900' },
              { versao: 'rerank, k=3', passou: 17, total: 30, nota: 'recall@3 = 0,950; o gerador extractivo é o gargalo' },
            ],
            note: 'g01 e g30 têm causas diferentes. Em g01 o documento certo está no contexto e o gerador escolheu as frases erradas (falha de geração). Em g30 `pol-reembolso` não entrou no top-3 (falha de recuperação: context recall 0). As duas têm faithfulness 1,0.',
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'As mesmas métricas com o RAGAS (API da série 0.2/0.3; confirma na documentação da versão que fixares, o pacote muda de nomes entre versões). O juiz vem do escalão grande, nunca do modelo que respondeu.',
          code: `import os

from langchain.chat_models import init_chat_model
from langchain_ollama import OllamaEmbeddings
from ragas import EvaluationDataset, evaluate
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import Faithfulness, LLMContextPrecisionWithReference, LLMContextRecall, ResponseRelevancy

# Uma linha por pergunta dourada: pergunta, contexto que o gerador viu, resposta, referência.
linhas = [
    {
        "user_input": caso.pergunta,
        "retrieved_contexts": [d.page_content for d in saida["documentos"]],
        "response": saida["resposta"],
        "reference": caso.resposta,
    }
    for caso, saida in resultados              # produzido pela cadeia RAG, como em correr.py
]

juiz = LangchainLLMWrapper(init_chat_model(os.environ["BALCAO_MODELO_JUIZ"], temperature=0))
emb = LangchainEmbeddingsWrapper(OllamaEmbeddings(model="nomic-embed-text"))

relatorio = evaluate(
    dataset=EvaluationDataset.from_list(linhas),
    metrics=[Faithfulness(), ResponseRelevancy(), LLMContextPrecisionWithReference(), LLMContextRecall()],
    llm=juiz,
    embeddings=emb,
)
print(relatorio)                        # médias; relatorio.to_pandas() dá o detalhe por pergunta`,
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Quanto custa o RAGAS por noite',
          text:
            'Faithfulness faz duas chamadas por pergunta (extrair afirmações, verificá-las) e answer relevancy gera várias perguntas artificiais. Nas 240 perguntas douradas, as quatro métricas ficam na ordem das mil chamadas ao escalão grande por corrida. A 3 USD por milhão de tokens de entrada é barato à noite e caro em cada PR: é por isso que o PR usa as métricas deterministas e a noite usa o juiz.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RAGAS — Faithfulness', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/' },
            { label: 'RAGAS — Context Precision', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/' },
            { label: 'Es et al. — RAGAS: Automated Evaluation of RAG (2023)', url: 'https://arxiv.org/abs/2309.15217' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 'armadilhas',
      title: 'Armadilhas: quando a métrica mente',
      blocks: [
        {
          type: 'p',
          text:
            'As métricas desta parte são simples de calcular e fáceis de corromper. As armadilhas abaixo aparecem em quase todas as equipas que avaliam RAG pela primeira vez; todas deram números bonitos durante semanas antes de alguém ler os casos.',
        },
        {
          type: 'list',
          items: [
            '**O juiz a avaliar-se a si próprio.** O mesmo modelo que respondeu julga a faithfulness da resposta. Os modelos tendem a preferir o próprio estilo (Zheng et al. medem esta auto-preferência), e o juiz partilha os pontos cegos do gerador: se o gerador confunde «24» e «72», o juiz também. O `criar_juiz` do laboratório regista um aviso quando `BALCAO_MODELO_JUIZ` é igual ao modelo que responde.',
            '**Relevância mal anotada.** `g01` anota só `pol-reembolso-prazos`; se alguém anotar também `pol-reembolso-2025` (que menciona M-Pesa e prazos), o recall premeia o retriever que traz a política substituída. As anotações de relevância são revistas pelo suporte, que conhece as políticas, e mudam por PR (adr-0018).',
            '**Chunk contra documento.** Com vários chunks por documento, recall ao nível do chunk penaliza um retriever que traz o chunk certo de um documento anotado como relevante mas não o chunk anotado. Decide o nível e mantém-no: o «Balcão» avalia por documento porque as citações são por documento.',
            '**Perguntas fora de âmbito nas médias.** Uma pergunta sem relevantes tem recall indefinido (o `recall_at_k` do `balcao` devolve 0). Misturar as 40 perguntas fora de âmbito nas médias de recall afunda a métrica sem nada ter partido. Avaliam-se à parte com `recusa_correcta`.',
            '**Fuga do conjunto dourado para o sistema.** Copiar respostas de referência para few-shot no prompt, ou ajustar o re-ranker até a g14 passar, sobreajusta ao conjunto. Mantém uma partição de validação que ninguém olha durante o afinamento.',
            '**k diferente entre avaliação e produção.** Medir recall@10 e servir com k = 3 mede um sistema que não existe.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Juiz = gerador, e o erro que isso esconde',
          text:
            'Cenário típico: uma equipa mede faithfulness 0,97 com o próprio modelo médio como juiz. Quando passa a julgar com o escalão grande de outro fornecedor, desce para 0,89: as 8 respostas de diferença tinham valores de dinheiro ligeiramente trocados que os dois modelos leram da mesma maneira. A adr-0019 existe por isto: juiz de outro escalão, rubrica binária, e kappa contra o suporte antes de entrar no gate.',
        },
        {
          type: 'compare',
          left: {
            title: 'Métricas sem referência (reference-free)',
            items: [
              'Faithfulness, answer relevancy.',
              'Correm sobre tráfego real, sem anotação: servem para monitorizar produção (módulo 29).',
              'Não detectam uma resposta fiel ao documento errado.',
              'Dependem inteiramente da qualidade do juiz.',
            ],
          },
          right: {
            title: 'Métricas com referência',
            items: [
              'Recall@k, nDCG, context recall, correcção contra referência.',
              'Precisam do conjunto dourado anotado e revisto.',
              'Detectam «fiel mas errado» e «não encontrou».',
              'Só medem o que o conjunto cobre: perguntas novas passam despercebidas.',
            ],
          },
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-avaliar-rag-01',
            title: 'A correcção caiu. Onde procurar?',
            intro: 'A sequência de diagnóstico quando a métrica de correcção desce entre duas versões.',
            start: 'r1',
            nodes: [
              { id: 'r1', question: 'O recall@5 das mesmas perguntas desceu?', options: [{ label: 'Sim', next: 'r2' }, { label: 'Não', next: 'g1' }] },
              { id: 'r2', question: 'Mudou o índice (chunking, embeddings, filtros) ou só a consulta?', options: [{ label: 'O índice', next: 'f1' }, { label: 'A consulta ou o re-ranker', next: 'f2' }] },
              { id: 'f1', answer: 'Regressão de recuperação por reindexação.', detail: 'Compara os rankings pergunta a pergunta entre as duas versões do índice; confirma a versão do modelo de embeddings em cada linha (adr-0007).' },
              { id: 'f2', answer: 'Regressão na fase de pesquisa.', detail: 'Olha para MRR e nDCG: se o recall@20 se manteve e o top-5 mudou, o problema é o re-ranker ou o peso da fusão.' },
              { id: 'g1', question: 'A faithfulness desceu?', options: [{ label: 'Sim', next: 'f3' }, { label: 'Não', next: 'g2' }] },
              { id: 'f3', answer: 'O gerador está a inventar.', detail: 'Prompt, modelo ou temperatura mudaram. Lê as frases sem suporte; confirma que a guarda de citações está activa.' },
              { id: 'g2', question: 'Context recall desceu mas recall@5 não?', options: [{ label: 'Sim', next: 'f4' }, { label: 'Não', next: 'f5' }] },
              { id: 'f4', answer: 'O documento certo vem, o chunk certo não.', detail: 'Chunking cortou a frase que responde. Olha para o nível do chunk.' },
              { id: 'f5', answer: 'Resposta fiel e completa, mas não correcta.', detail: 'Selecção de frases, formato, ou a própria referência está errada. Lê os casos antes de mexer no sistema.' },
            ],
          },
        },
        {
          type: 'code',
          lang: 'json',
          caption: 'Uma linha de `dados/dourado.jsonl` com o que a revisão da anotação precisa: quem anotou e porque é que um documento parecido **não** é relevante.',
          code: `{"id": "g01", "tipo": "rag", "intencao": "reembolso",
 "pergunta": "Quanto tempo demora a devolução do dinheiro no M-Pesa?",
 "relevantes": ["pol-reembolso-prazos"],
 "nao_relevantes_proximos": ["pol-reembolso-2025"],
 "resposta": "Até 24 horas depois de o reembolso ser aprovado.",
 "anotado_por": "suporte", "revisto_em": "2026-09-01"}`,
        },
        {
          type: 'p',
          text:
            'Os campos `nao_relevantes_proximos`, `anotado_por` e `revisto_em` não existem no `dourado.jsonl` do laboratório: são a extensão recomendada quando o conjunto passa das 240 perguntas e mais de uma pessoa anota. O primeiro permite um teste que falha se a política substituída aparecer no top-k; os outros dois dão história à anotação.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zheng et al. — Judging LLM-as-a-Judge (2023)', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'RAGAS — Context Recall', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/' },
            { label: 'Saad-Falcon et al. — ARES: avaliação automática de RAG (2023)', url: 'https://arxiv.org/abs/2311.09476' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'no-laboratorio',
      title: 'No laboratório: do JSONL ao gate',
      blocks: [
        {
          type: 'p',
          text:
            'O laboratório junta tudo num comando. O conjunto dourado vive em `dados/dourado.jsonl` (30 perguntas `rag`, 10 fora de âmbito, 8 de ferramentas na amostra), as métricas em `metricas.py`, o corredor em `correr.py` e os testes que garantem que o corredor faz o que diz em `test_avaliacao.py`.',
        },
        { type: 'file', ref: 'dados/dourado.jsonl' },
        { type: 'file', ref: 'src/balcao/avaliacao/metricas.py' },
        {
          type: 'p',
          text:
            'Repara em três decisões de `metricas.py`. As métricas de recuperação **são as do runtime didáctico** (o tutorial e o laboratório calculam exactamente o mesmo). `bootstrap_ic` trata o caso de um só valor (IC degenerado) em vez de rebentar. E `verificar_gate` trata uma métrica em falta como falha com valor 0: um conjunto que deixou de ter casos de ferramentas não pode passar em silêncio.',
        },
        { type: 'file', ref: 'src/balcao/avaliacao/correr.py' },
        {
          type: 'code',
          lang: 'bash',
          caption: 'Correr as evals de recuperação e geração no modo simulado, e o gate com um limiar mais exigente do que o de omissão (0,80).',
          code: `cd laboratorio
uv run python -m balcao.avaliacao.correr --conjunto dourado
uv run python -m balcao.avaliacao.correr --conjunto dourado --gate --min-recall 0.9
echo "código de saída: $?"      # 1 se alguma métrica ficar abaixo do limiar`,
        },
        {
          type: 'table',
          head: ['Métrica do relatório', 'Sobre que casos', 'Limiar de omissão', 'Variável'],
          rows: [
            ['`recall_at_5`', 'perguntas `rag`', '0,80', '`BALCAO_GATE_RECALL`'],
            ['`fidelidade`', 'perguntas `rag` não recusadas', '0,85', '`BALCAO_GATE_FIDELIDADE`'],
            ['`recusa_correcta`', 'perguntas `fora_de_ambito`', '0,80', '`BALCAO_GATE_RECUSA`'],
            ['`mrr`, `correccao`, `citacao_valida`', 'perguntas `rag`', 'reportadas, sem gate no simulado', '—'],
          ],
          caption: 'Os limiares de `config.py`. A correcção fica fora do gate no modo simulado porque o juiz heurístico não é calibrado; à noite, com o juiz real calibrado, entra.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Um teste de regressão de recuperação que não precisa de juiz nem de rede: a política substituída nunca chega ao top-5 com o filtro de vigência.',
          code: `import pytest

from balcao import didactico as b

SUBSTITUIDAS = {d["id"] for d in b.DOCUMENTOS if not d["vigente"]}


@pytest.mark.parametrize("p", b.PERGUNTAS, ids=lambda p: p["id"])
def test_nenhuma_politica_substituida_no_top5(p: dict) -> None:
    res = b.recuperar(p["pergunta"], k=5, metodo="rerank", filtro={"vigente": True})
    assert not {c.doc for c, _ in res} & SUBSTITUIDAS


def test_recall5_do_rerank_nao_regride() -> None:
    r = b.avaliar_recuperacao("rerank", 5)
    assert r["recall"] >= 0.95, r       # valor medido na versão actual do índice`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Fixa a versão do índice que o número mede',
          text:
            'Um recall@5 de 0,95 só é comparável com outro recall@5 medido sobre o mesmo corpus, o mesmo modelo de embeddings e a mesma versão do chunking. O relatório de `correr.py` grava o modelo de embeddings; em produção, grava também a data da última ingestão. Sem isso, uma subida de recall pode ser só um documento novo que alguém ingeriu.',
        },
        { type: 'lab', ref: 'lab-avaliar-rag-01' },
        { type: 'lab', ref: 'lab-avaliar-rag-02' },
        {
          type: 'refs',
          items: [
            { label: 'pytest — parametrize', url: 'https://docs.pytest.org/en/stable/how-to/parametrize.html' },
            { label: 'OpenAI — evals', url: 'https://platform.openai.com/docs/guides/evals' },
          ],
        },
      ],
    },
  ],

  /* =================================================================== quiz */
  quiz: [
    {
      id: 'q-avaliar-rag-01',
      topic: 'recuperacao',
      prompt: 'Dois retrievers devolvem o mesmo conjunto de 5 documentos para uma pergunta com um relevante; num está em 1.º, no outro em 4.º. Que métricas os distinguem?',
      options: ['recall@5', 'precision@5', 'MRR', 'nDCG@5'],
      answer: [2, 3],
      explain: 'Recall e precision só olham para a presença no top-k; são iguais. MRR (1 contra 0,25) e nDCG (1 contra 0,43) descontam a posição. É o caso da g14 com híbrido e re-ranking.',
    },
    {
      id: 'q-avaliar-rag-02',
      topic: 'recuperacao',
      prompt: 'Uma pergunta tem um único documento relevante, e o retriever põe-no em 1.º com k = 5. Qual é o precision@5?',
      options: ['1,0', '0,5', '0,2', 'Indefinido'],
      answer: [2],
      explain: 'Um relevante em cinco posições: 1/5. É o máximo possível para esta pergunta; por isso precision@k é má meta de optimização quando a maioria das perguntas tem um só relevante.',
    },
    {
      id: 'q-avaliar-rag-03',
      topic: 'estatistica',
      prompt: 'Recall@3 do re-ranking tem IC [0,87; 1,00] e o do BM25 [0,70; 0,97]. O que concluis?',
      options: [
        'Nada: os intervalos sobrepõem-se, logo não há diferença.',
        'É preciso o intervalo da diferença pareada pergunta a pergunta para decidir.',
        'O re-ranking é melhor porque a média é maior.',
        'É preciso correr o bootstrap com mais reamostras.',
      ],
      answer: [1],
      explain: 'Intervalos individuais sobrepostos não implicam ausência de diferença quando as amostras são pareadas. A diferença pareada no `balcao` dá [0,017; 0,233], que exclui o zero. Mais reamostras só estabilizam o intervalo, não o estreitam.',
    },
    {
      id: 'q-avaliar-rag-04',
      topic: 'geracao',
      prompt: 'Uma resposta copia fielmente um chunk da política de 2025 (72 horas) que chegou ao contexto porque faltava o filtro de vigência. Que métricas a apanham?',
      options: ['Faithfulness', 'Correcção contra a resposta de referência', 'Um teste de que nenhuma política substituída aparece no top-k', 'Answer relevancy'],
      answer: [1, 2],
      explain: 'A resposta é fiel ao contexto e relevante para a pergunta, por isso faithfulness e answer relevancy passam. Só a comparação com a referência (24 horas) e um teste dedicado aos metadados a apanham.',
    },
    {
      id: 'q-avaliar-rag-05',
      topic: 'geracao',
      prompt: 'O que calcula a answer relevancy do RAGAS?',
      options: [
        'A fracção das afirmações da resposta suportadas pelo contexto.',
        'A semelhança de cosseno média entre a pergunta original e perguntas geradas a partir da resposta.',
        'Se a resposta coincide com a referência.',
        'A posição do primeiro chunk relevante.',
      ],
      answer: [1],
      explain: 'Gera perguntas artificiais a partir da resposta e compara os seus embeddings com o da pergunta. Mede se a resposta «fala do mesmo», não se está correcta; uma resposta errada mas no tema tem relevância alta.',
    },
    {
      id: 'q-avaliar-rag-06',
      topic: 'diagnostico',
      prompt: 'Uma nova versão sobe recall@3 de 0,833 para 0,950 e a correcção só de 15 para 17 respostas em 30. Qual é a leitura mais provável?',
      options: [
        'O gerador é o gargalo: recebe o contexto certo e não o usa bem.',
        'O juiz está descalibrado.',
        'O recall está mal calculado.',
        'O conjunto dourado é pequeno demais para medir recall.',
      ],
      answer: [0],
      explain: 'Foi o que aconteceu com o `ModeloSimulado`: faithfulness 30/30, recall a subir, correcção quase parada. Casos como g01 têm o documento certo no contexto e a frase errada na resposta. O próximo trabalho é no prompt ou no modelo, não no índice.',
    },
    {
      id: 'q-avaliar-rag-07',
      topic: 'armadilhas',
      prompt: 'Porque é que as 40 perguntas fora de âmbito não entram na média de recall@5?',
      options: [
        'Porque não têm documentos relevantes e o recall fica 0 ou indefinido, baixando a média sem nada ter partido.',
        'Porque o retriever não é chamado nessas perguntas.',
        'Porque são avaliadas pelo juiz.',
        'Porque o recall só se calcula com k = 3.',
      ],
      answer: [0],
      explain: 'Sem relevantes, o denominador |Rel| é zero. Estas perguntas medem-se com `recusa_correcta`: o sistema disse que não sabe, sem inventar.',
    },
    {
      id: 'q-avaliar-rag-08',
      topic: 'juiz',
      prompt: 'Que decisões reduzem o risco de uma faithfulness inflacionada pelo juiz?',
      options: [
        'Usar como juiz um modelo de outro escalão ou fornecedor.',
        'Pedir ao juiz uma nota de 1 a 10 em vez de critérios binários.',
        'Medir o kappa do juiz contra anotação do suporte antes de o usar no gate.',
        'Usar temperatura alta no juiz para diversificar.',
      ],
      answer: [0, 2],
      explain: 'Um modelo diferente evita a auto-preferência e os pontos cegos partilhados; o kappa mede a concordância com quem conhece o domínio. Escalas largas e temperatura alta aumentam a variância do juiz.',
    },
    {
      id: 'q-avaliar-rag-09',
      topic: 'recuperacao',
      prompt: 'O re-ranking do «Balcão» reordena os 20 primeiros do híbrido. Se o documento relevante está em 25.º no híbrido, o que acontece?',
      options: [
        'O re-ranker trá-lo para o topo, porque avalia pergunta e chunk juntos.',
        'Nunca aparece: o recall do re-ranking está limitado pelo recall@20 da fase anterior.',
        'Aparece em 20.º.',
        'Depende do score de cosseno.',
      ],
      answer: [1],
      explain: 'O re-ranker só reordena candidatos; não pesquisa. Por isso se mede recall@20 do primeiro estágio separadamente: é o tecto do sistema.',
    },
  ],

  /* ============================================================== exercícios */
  exercises: [
    {
      id: 'e-avaliar-rag-01',
      title: 'nDCG@5 à mão',
      statement: 'Uma pergunta tem dois documentos relevantes. O ranking tem-nos nas posições 2 e 4. Calcula nDCG@5 com relevância binária, com três casas decimais.',
      kind: 'input',
      accept: ['0.651', '0,651', '0.65', '0,65'],
      hint: 'DCG = 1/log2(3) + 1/log2(5). IDCG = 1/log2(2) + 1/log2(3).',
      solution: 'DCG = 0,6309 + 0,4307 = 1,0616. IDCG = 1 + 0,6309 = 1,6309. nDCG@5 = 1,0616 / 1,6309 ≈ 0,651.',
      difficulty: 1,
    },
    {
      id: 'e-avaliar-rag-02',
      title: 'MRR de três perguntas',
      statement: 'Em três perguntas, o primeiro relevante aparece em 1.º, em 3.º e não aparece no top-5. Qual é o MRR@5? Responde com três casas decimais.',
      kind: 'input',
      accept: ['0.444', '0,444', '0.44', '0,44'],
      solution: '(1 + 1/3 + 0) / 3 = 1,333 / 3 ≈ 0,444.',
      difficulty: 1,
    },
    {
      id: 'e-avaliar-rag-03',
      title: 'Aceitar ou não o re-ranker novo?',
      statement:
        'Um PR troca o re-ranker. Nas 240 perguntas douradas, recall@5 passa de 0,912 para 0,925, o IC a 95% da diferença pareada é [−0,004; 0,030], a latência p95 do re-ranking sobe de 180 para 260 ms, e a intenção `pagamentos` desce de 0,90 para 0,83. Decide e justifica.',
      kind: 'open',
      hint: 'Três eixos: significância da média, regressão por intenção e orçamento de latência (TTFT p95 < 1,5 s).',
      solution:
        'Rejeitar. A melhoria média não é distinguível de zero (o IC inclui −0,004). A descida de 7 pontos em `pagamentos`, uma intenção com 14% do tráfego, é exactamente o RI-04 que o gate por intenção existe para travar. E +80 ms no caminho crítico consome margem do TTFT sem ganho demonstrado. O caminho é analisar os casos de `pagamentos` que regrediram (provavelmente códigos e números) antes de pensar em trocar.',
      difficulty: 2,
    },
    {
      id: 'e-avaliar-rag-04',
      title: 'Context recall sem LLM',
      statement:
        'Escreve `context_recall(referencia: str, contexto: str, limiar: float = 0.5) -> float` só com o `balcao`: parte a referência em frases, e conta uma frase como atribuível se pelo menos `limiar` dos seus radicais estiver no contexto e todos os números da frase aparecerem no contexto.',
      kind: 'code',
      hint: 'Reutiliza `b.radicais` e uma expressão regular `\\d+` para os números.',
      solution:
        'import re\nimport balcao as b\n\ndef context_recall(referencia, contexto, limiar=0.5):\n    ctx = set(b.radicais(contexto))\n    nums_ctx = set(re.findall(r"\\d+", contexto))\n    frases = [f for f in re.split(r"(?<=[.!?])\\s+", referencia.strip()) if f]\n    ok = 0\n    for f in frases:\n        rs = b.radicais(f)\n        cob = sum(r in ctx for r in rs) / max(1, len(rs))\n        ok += cob >= limiar and set(re.findall(r"\\d+", f)) <= nums_ctx\n    return ok / max(1, len(frases))',
      difficulty: 2,
    },
    {
      id: 'e-avaliar-rag-05',
      title: 'Desenhar a avaliação de RAG para um corpus novo',
      statement:
        'O «Chega» vai lançar suporte a restaurantes parceiros com 90 documentos novos (contratos, comissões, pagamentos semanais). Desenha a avaliação de RAG antes do lançamento: conjunto dourado, métricas por componente, o que corre em cada PR e à noite, e o critério de lançamento.',
      kind: 'design',
      solution:
        'Conjunto: 120 perguntas recolhidas de tickets reais de restaurantes, estratificadas por tema (comissões, pagamentos, contrato, operação), com relevantes anotados por documento pela equipa de parceiros, mais 20 fora de âmbito; 20% reservado como validação. PR: recall@5, MRR e nDCG por tema com o modelo simulado, teste de que nenhum documento não vigente aparece no top-5, e recusa correcta. Noite: faithfulness e correcção com juiz do escalão grande calibrado (kappa ≥ 0,6 contra 50 anotações). Lançamento: recall@5 ≥ 0,85 em todos os temas, faithfulness ≥ 0,9, recusa ≥ 0,9, e revisão manual de 50 conversas de piloto.',
      difficulty: 3,
    },
  ],

  /* ==================================================================== labs */
  labs: [
    {
      id: 'lab-avaliar-rag-01',
      moduleId: 'avaliar-rag',
      title: 'Implementar MRR e nDCG@k e conferir com o conjunto dourado',
      brief:
        'Completa `rr` e `ndcg_at_k` (relevância binária, desconto log2(i + 1), IDCG com min(k, |Rel|)). O fim do ficheiro compara as tuas funções com as do `balcao` nas 30 perguntas douradas com o re-ranking.',
      lang: 'python',
      starter: `import balcao as b


def rr(ranking: list[str], relevantes: set[str]) -> float:
    # TODO: 1 / posição do primeiro relevante (a contar de 1), ou 0
    return 0.0


def ndcg_at_k(ranking: list[str], relevantes: set[str], k: int) -> float:
    # TODO: DCG sobre o top-k dividido pelo DCG ideal
    return 0.0


def docs_de(pergunta: str) -> list[str]:
    docs: list[str] = []
    for c, _ in b.recuperar(pergunta, k=30, metodo="rerank"):
        if c.doc not in docs:
            docs.append(c.doc)
    return docs


for p in b.PERGUNTAS:
    d, rel = docs_de(p["pergunta"]), set(p["relevantes"])
    assert abs(rr(d[:5], rel) - b.mrr(d[:5], rel)) < 1e-9, p["id"]
    assert abs(ndcg_at_k(d, rel, 5) - b.ndcg_at_k(d, rel, 5)) < 1e-9, p["id"]
print("ok")
`,
      checks: [
        { id: 'log2', label: 'Desconto log2(i + 1)', re: 'log2\\(\\s*i\\s*\\+\\s*1\\s*\\)', why: 'O desconto do nDCG é 1/log2(i + 1) com i a contar de 1.' },
        { id: 'enum1', label: 'Posições a contar de 1', re: 'enumerate\\([^)]*start\\s*=\\s*1', why: 'Com enumerate a partir de 0, a posição 1 dava log2(1) = 0 e uma divisão por zero.' },
        { id: 'ideal', label: 'IDCG com min(k, |Rel|)', re: 'min\\(\\s*k\\s*,\\s*len\\(', why: 'O ranking ideal tem no máximo k posições e no máximo |Rel| relevantes.' },
        { id: 'inverso', label: 'Reciprocal rank', re: '1(\\.0)?\\s*/\\s*i\\b', why: 'RR é o inverso da posição do primeiro relevante.' },
        { id: 'sem-atalho', label: 'Sem chamar as funções prontas do balcao dentro das tuas', re: 'return\\s+b\\.(mrr|ndcg_at_k)\\(', forbid: true, why: 'O objectivo é implementar a fórmula, não delegar.' },
      ],
      hints: [
        'Em `rr`, percorre `enumerate(ranking, start=1)` e devolve `1.0 / i` no primeiro relevante.',
        'Em `ndcg_at_k`, o DCG soma `1 / math.log2(i + 1)` só nas posições relevantes do top-k.',
        'Se o IDCG for 0 (nenhum relevante), devolve 0.',
      ],
      solution: `import math

import balcao as b


def rr(ranking: list[str], relevantes: set[str]) -> float:
    for i, d in enumerate(ranking, start=1):
        if d in relevantes:
            return 1.0 / i
    return 0.0


def ndcg_at_k(ranking: list[str], relevantes: set[str], k: int) -> float:
    dcg = sum(1 / math.log2(i + 1) for i, d in enumerate(ranking[:k], start=1) if d in relevantes)
    ideal = sum(1 / math.log2(i + 1) for i in range(1, min(k, len(relevantes)) + 1))
    return dcg / ideal if ideal else 0.0


def docs_de(pergunta: str) -> list[str]:
    docs: list[str] = []
    for c, _ in b.recuperar(pergunta, k=30, metodo="rerank"):
        if c.doc not in docs:
            docs.append(c.doc)
    return docs


for p in b.PERGUNTAS:
    d, rel = docs_de(p["pergunta"]), set(p["relevantes"])
    assert abs(rr(d[:5], rel) - b.mrr(d[:5], rel)) < 1e-9, p["id"]
    assert abs(ndcg_at_k(d, rel, 5) - b.ndcg_at_k(d, rel, 5)) < 1e-9, p["id"]
print("ok")
`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-avaliar-rag-02',
      moduleId: 'avaliar-rag',
      title: 'Um gate que não se deixa enganar pela média',
      brief:
        'A função `decidir` compara a versão em produção (A) e a candidata (B) por recall@3 pergunta a pergunta. Hoje rejeita B se a média baixar, o que aprova ruído e chumba empates. Reescreve-a com a diferença pareada e `bootstrap_ic`: rejeita só se o limite superior do IC da diferença B − A ficar abaixo de −tolerância.',
      lang: 'python',
      starter: `import numpy as np
import balcao as b


def recall3(metodo: str) -> list[float]:
    out = []
    for p in b.PERGUNTAS:
        docs: list[str] = []
        for c, _ in b.recuperar(p["pergunta"], k=30, metodo=metodo):
            if c.doc not in docs:
                docs.append(c.doc)
        out.append(b.recall_at_k(docs, p["relevantes"], 3))
    return out


def decidir(a: list[float], b_: list[float], tolerancia: float = 0.02) -> str:
    media_a, media_b = np.mean(a), np.mean(b_)
    if media_b < media_a:
        return "rejeitar"
    return "aceitar"


print("hibrido -> denso:", decidir(recall3("hibrido"), recall3("denso")))
print("bm25 -> rerank:  ", decidir(recall3("bm25"), recall3("rerank")))
`,
      checks: [
        { id: 'pareado', label: 'Diferença pergunta a pergunta', re: 'zip\\(\\s*b_\\s*,\\s*a\\s*\\)|zip\\(\\s*a\\s*,\\s*b_\\s*\\)', why: 'A comparação tem de ser pareada: a mesma pergunta nas duas versões.' },
        { id: 'ic', label: 'Usa bootstrap_ic sobre as diferenças', re: 'bootstrap_ic\\(', why: 'Sem intervalo, uma pergunta a mais ou a menos decide o gate.' },
        { id: 'tol', label: 'Compara com a tolerância', re: '<\\s*-\\s*tolerancia', why: 'Rejeitar só quando a descida é claramente maior do que a tolerância.' },
        { id: 'sem-media', label: 'Sem decidir só pela média', re: 'if\\s+media_b\\s*<\\s*media_a', forbid: true, why: 'Comparar médias sem intervalo é o erro que este laboratório corrige.' },
      ],
      hints: [
        '`dif = [y - x for x, y in zip(a, b_)]` dá B − A por pergunta.',
        '`media, lo, hi = b.bootstrap_ic(dif)`.',
        'Se `hi < -tolerancia`, a candidata é pior com confiança; caso contrário, aceita (e reporta o IC).',
      ],
      solution: `import balcao as b


def recall3(metodo: str) -> list[float]:
    out = []
    for p in b.PERGUNTAS:
        docs: list[str] = []
        for c, _ in b.recuperar(p["pergunta"], k=30, metodo=metodo):
            if c.doc not in docs:
                docs.append(c.doc)
        out.append(b.recall_at_k(docs, p["relevantes"], 3))
    return out


def decidir(a: list[float], b_: list[float], tolerancia: float = 0.02) -> str:
    dif = [y - x for x, y in zip(a, b_)]
    media, lo, hi = b.bootstrap_ic(dif)
    if hi < -tolerancia:
        return f"rejeitar (B-A = {media:+.3f}, IC [{lo:+.3f}; {hi:+.3f}])"
    return f"aceitar (B-A = {media:+.3f}, IC [{lo:+.3f}; {hi:+.3f}])"


print("hibrido -> denso:", decidir(recall3("hibrido"), recall3("denso")))
print("bm25 -> rerank:  ", decidir(recall3("bm25"), recall3("rerank")))
`,
      difficulty: 2,
      executavel: true,
    },
  ],

  /* =============================================================== casos de uso */
  useCases: [
    {
      id: 'uc-avaliar-rag-01',
      title: 'Seguradora avalia o RAG sobre condições gerais antes de o abrir aos mediadores',
      area: 'seguros',
      level: 2,
      scenario:
        'Uma seguradora em Lisboa quer um assistente para os seus 600 mediadores responderem a perguntas sobre coberturas e exclusões de 1 400 documentos de condições gerais e particulares (automóvel, habitação, saúde). Uma resposta errada sobre uma exclusão pode virar reclamação ao regulador. A direcção quer um número antes de abrir o piloto.',
      requirements: [
        'Correcção medida por produto (automóvel, habitação, saúde), não só global.',
        'Nenhuma resposta a citar uma versão de condições gerais já substituída.',
        'Recusa quando a apólice em causa não está no corpus.',
        'Avaliação em cada alteração do índice sem custo de modelo por PR.',
      ],
      constraints: ['Dados de clientes nunca no conjunto dourado.', 'Equipa de dois engenheiros e um actuário a meio tempo para anotar.'],
      approach: [
        { title: 'Conjunto dourado a partir das perguntas reais', text: '300 perguntas retiradas da linha de apoio aos mediadores, anonimizadas, estratificadas por produto e por tipo (cobertura, exclusão, franquia, prazos). Relevância anotada por documento e por versão; 40 perguntas sobre produtos fora do corpus.' },
        { title: 'Recuperação em cada PR', text: 'Recall@5, MRR e nDCG@5 por produto, com IC pareado contra a versão em produção. Teste dedicado: nenhum documento com `vigente = false` no top-10.' },
        { title: 'Geração à noite', text: 'Faithfulness e correcção contra a referência com juiz de outro fornecedor, rubrica binária, calibrado com kappa contra 80 respostas anotadas pelo actuário.' },
        { title: 'Leitura de casos', text: 'Todas as semanas, os 20 casos com faithfulness 1 e correcção 0 são lidos: é onde vivem as referências mal escritas e os chunks que cortam uma exclusão a meio.' },
      ],
      diagram: {
        title: 'Avaliação da seguradora',
        cols: 4,
        rows: 3,
        zones: [
          { id: 'pr', label: 'Cada PR (sem modelo)', col: 0, row: 0, colSpan: 2, rowSpan: 3, tone: 'ci' },
          { id: 'noite', label: 'Todas as noites', col: 2, row: 0, colSpan: 2, rowSpan: 3, tone: 'async' },
        ],
        nodes: [
          { id: 'gold', label: 'Conjunto dourado', sub: '300 + 40 fora de âmbito', col: 0, row: 0, kind: 'data' },
          { id: 'idx', label: 'Índice candidato', sub: 'pgvector + FTS', col: 1, row: 0, kind: 'vector' },
          { id: 'mret', label: 'recall@5 · nDCG por produto', sub: 'IC pareado', col: 0, row: 1, span: 2, kind: 'service' },
          { id: 'vig', label: 'Teste de vigência', sub: 'top-10 sem versões antigas', col: 0, row: 2, span: 2, kind: 'service' },
          { id: 'rag', label: 'Cadeia RAG', col: 2, row: 0, kind: 'model' },
          { id: 'juiz', label: 'Juiz de outro fornecedor', sub: 'kappa ≥ 0,6', col: 3, row: 0, kind: 'model' },
          { id: 'rel', label: 'Relatório por produto', sub: 'faithfulness · correcção · recusa', col: 2, row: 1, span: 2, kind: 'data' },
          { id: 'ler', label: 'Leitura semanal', sub: '20 casos fiéis e errados', col: 2, row: 2, span: 2, kind: 'user' },
        ],
        edges: [
          { from: 'gold', to: 'mret' },
          { from: 'idx', to: 'mret' },
          { from: 'idx', to: 'vig' },
          { from: 'gold', to: 'rag', style: 'dashed' },
          { from: 'rag', to: 'juiz' },
          { from: 'juiz', to: 'rel' },
          { from: 'rel', to: 'ler' },
        ],
      },
      solution:
        'O piloto abriu com recall@5 ≥ 0,88 em todos os produtos, faithfulness 0,94 e recusa correcta 0,92. O número que mais mudou decisões foi o da decomposição: em saúde, a correcção era baixa com recall alto, e a leitura de casos mostrou que as exclusões estavam em tabelas que o chunking partia ao meio. Corrigiu-se o chunking, não o modelo.',
      tools: [
        { name: 'pgvector + full-text do PostgreSQL', role: 'índice híbrido' },
        { name: 'RAGAS', role: 'faithfulness e context recall nocturnos', badge: 'noite' },
        { name: 'pytest', role: 'métricas de recuperação e teste de vigência em cada PR', badge: 'PR' },
      ],
      rejected: [
        { option: 'Só faithfulness com juiz em cada PR', why: 'Custo por PR e sem referência: não apanhava as respostas fiéis a condições gerais antigas.' },
        { option: 'Avaliação global sem estratificar por produto', why: 'Saúde (18% das perguntas) escondia-se atrás de automóvel.' },
        { option: 'Gerar o conjunto dourado com um LLM a partir dos documentos', why: 'As perguntas geradas copiam o vocabulário dos documentos e inflacionam o recall; os mediadores perguntam de outra maneira.' },
      ],
      costNote: 'Anotação: ≈ 60 horas de actuário para 300 perguntas. Juiz nocturno: 340 perguntas × ≈ 4 chamadas ao escalão grande, na ordem de dezenas de USD por mês aos preços de referência.',
      takeaways: [
        'Decompor em recuperação e geração mostrou que o problema era o chunking.',
        'O teste de vigência apanha o que nenhuma métrica genérica apanha.',
        'Perguntas reais valem mais do que perguntas geradas.',
      ],
      refs: [
        { label: 'RAGAS — Context Recall', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/' },
        { label: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
      ],
    },
  ],
};
