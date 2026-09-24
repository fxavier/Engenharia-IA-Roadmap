import type { Module } from '../types';

export const m09: Module = {
  id: 'ingestao-chunking',
  number: 9,
  part: 'rag',
  title: 'Ingestão e chunking',
  subtitle: 'O índice só devolve o que a ingestão lá pôs: fontes limpas, chunks que contêm uma regra inteira e metadados que deixam filtrar',
  icon: '✂️',
  minutes: 90,
  tags: ['chunking', 'ingestão', 'metadados', 'idempotência', 'parent-child'],
  goals: [
    'Decidir o que entra no índice do «Balcão» e o que fica de fora (pedidos, avisos, dados pessoais), e que metadados cada chunk tem de levar para poder ser filtrado.',
    'Comparar chunking fixo, por frases, recursivo, estrutural e semântico pelo que produzem de facto: tamanhos, cortes a meio de frase e respostas que saem desses chunks.',
    'Escolher tamanho e sobreposição com números medidos no conjunto dourado, e perceber porque é que o recall ao nível do documento esconde metade do problema.',
    'Usar parent-child e cabeçalhos contextuais para pesquisar com chunks pequenos e responder com contexto suficiente.',
    'Desenhar uma ingestão incremental e idempotente: hash por documento, substituição transaccional, retirada de versões e reindexação quando o modelo de embeddings muda.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'fontes',
      title: 'Carregar e limpar: o que entra no índice',
      blocks: [
        {
          type: 'p',
          text:
            'Num sistema RAG, a qualidade da resposta tem um tecto que se fixa muito antes do prompt: o modelo só pode citar o que a pesquisa devolveu, e a pesquisa só devolve o que a ingestão escreveu no índice. Um chunk cortado a meio de uma regra, uma política substituída sem marca, ou uma FAQ duplicada com dois prazos diferentes são defeitos que nenhum prompt corrige depois. Por isso a ingestão é engenharia de dados, com as mesmas preocupações de um ETL: contrato de entrada, validação, idempotência, observabilidade.',
        },
        {
          type: 'p',
          text:
            'O «Balcão» tem cinco fontes de conhecimento (`FONTES` em `design.ts`) e a primeira decisão é quais delas são **indexadas**. A regra que se aplica é simples: indexa-se o que é estável durante horas ou dias e é igual para todos os clientes; lê-se por ferramenta o que muda em minutos ou é pessoal.',
        },
        {
          type: 'table',
          head: ['Fonte', 'Volume', 'Actualização', 'Indexada?', 'Porquê'],
          rows: [
            ['Políticas ao cliente', '62 documentos', 'semanal, com revisão jurídica', 'sim', 'Fonte de verdade para dinheiro e prazos. Cada documento traz `vigente` e `actualizado`.'],
            ['Perguntas frequentes', '118 documentos', 'diária', 'sim', 'Linguagem próxima da do cliente; em conflito com uma política, a política ganha.'],
            ['Procedimentos internos', '21 documentos', 'mensal', 'sim, com `publico = interno`', 'Orientam o agente (escalar, fraude) mas nunca são citados ao cliente: o filtro trata disso.'],
            ['Avisos operacionais', '0 a 13 activos', 'em tempo real', 'não', 'Caducam em horas. Um aviso de chuva indexado às 9h ainda seria recuperado às 21h, já falso.'],
            ['Pedidos e clientes', '9 421 pedidos por dia', 'em tempo real', 'não', 'Estado mutável e dados pessoais. Lêem-se por `ler_pedido` com a autorização do cliente da conversa.'],
          ],
          caption: 'As 214 fontes indexadas dão ≈ 1 870 chunks em produção; o módulo `balcao` que corre no browser tem uma amostra de 40 documentos.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: indexar tudo o que existe',
          text:
            'A primeira versão de quase todos os RAG de suporte indexa os tickets antigos, as notas dos pedidos e os avisos «porque dão contexto». O resultado é um índice com dados pessoais de outros clientes (que a pesquisa pode devolver a qualquer pessoa), estados de pedidos que já mudaram e respostas de agentes humanos que contradizem a política. Dados mutáveis ou pessoais pertencem a uma ferramenta com autorização, não a um índice partilhado.',
        },
        {
          type: 'p',
          text:
            'Depois de decidir o que entra, limpa-se. A limpeza não é cosmética: o que sobra no texto vai para o embedding e para o `tsvector`, e ruído repetido em todos os documentos (rodapés, menus exportados do CMS, avisos legais) aproxima documentos que não têm nada a ver. As operações que o «Balcão» faz, por ordem:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Validar o contrato', text: 'Cada ficheiro tem cabeçalho com `id`, `titulo`, `categoria`, `publico`, `vigente` e `actualizado`. Sem `id` ou sem `publico` válido, o documento é recusado e registado: um documento sem dono nem público não entra (RI-02).' },
            { title: 'Normalizar Unicode', text: 'NFC em todo o texto. «Cupão» escrito com o til combinado (dois code points) e com o carácter pré-composto (um) têm bytes diferentes: sem normalizar, o hash e o índice lexical tratam-nos como palavras distintas.' },
            { title: 'Tirar o que não é conteúdo', text: 'HTML do CMS convertido para Markdown, rodapés e navegação removidos, espaços colapsados. Tabelas ficam em Markdown, que os modelos lêem bem, em vez de colunas soltas.' },
            { title: 'Mascarar dados pessoais', text: 'As FAQ às vezes trazem um número de exemplo real. O mesmo detector de PII das guardas corre na ingestão; um documento com PII vai para revisão em vez de ir para o índice.' },
            { title: 'Calcular o hash', text: 'SHA-256 do conteúdo e dos metadados que afectam a pesquisa. É o que torna a ingestão idempotente (secção 5).' },
          ],
        },
        {
          type: 'code',
          lang: 'markdown',
          caption: 'Uma política no repositório de conteúdos: o cabeçalho é o contrato que a ingestão valida (`carregar_markdown` em `ingestao.py`).',
          code: `---
id: pol-reembolso-prazos
titulo: Prazos de reembolso por meio de pagamento
categoria: reembolsos
publico: cliente
vigente: true
actualizado: 2026-06-01
---
Depois de aprovado, o reembolso chega em prazos diferentes conforme o meio de pagamento.
M-Pesa e e-Mola: até 24 horas. Cartão Visa ou Mastercard: 5 a 10 dias úteis, dependendo do banco emissor.
Numerário: o valor é creditado na carteira Chega do cliente de imediato e pode ser usado no pedido seguinte.

Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso,
que começa por RB-, para que a equipa confirme o estado junto do operador.`,
        },
        {
          type: 'p',
          text:
            'Os metadados são a parte da ingestão que mais se subestima. `vigente` e `publico` não servem para enfeitar a citação: são colunas que a consulta SQL filtra **antes** de ordenar por semelhança (adr-0010, módulo 12). Um chunk que não herdou `vigente = false` do seu documento é indistinguível de um válido. O runtime didáctico faz o mesmo que o laboratório: cada chunk copia os metadados do documento.',
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-01',
            title: 'Os metadados que cada chunk herda',
            brief: 'Conta os documentos da amostra por público e vigência, e mostra que o chunk da política de 2025 transporta `vigente: False` — é essa marca que permite retirá-lo da pesquisa.',
            code: `import balcao as b
from collections import Counter

c = Counter((d["publico"], d["vigente"]) for d in b.DOCUMENTOS)
for (pub, vig), n in sorted(c.items()):
    print(f"publico={pub:8} vigente={vig!s:5} -> {n} documentos")

chunks = b.chunkar_corpus("recursivo")
print(len(chunks), "chunks no total")
velho = next(x for x in chunks if x.id == "pol-reembolso-2025#0")
print(velho.id, velho.meta)

citaveis = b.chunkar_corpus("recursivo", incluir_internos=False, so_vigentes=True)
print(len(citaveis), "chunks citáveis ao cliente")`,
            expected: `publico=cliente  vigente=False -> 1 documentos
publico=cliente  vigente=True  -> 34 documentos
publico=interno  vigente=True  -> 5 documentos
46 chunks no total
pol-reembolso-2025#0 {'titulo': 'Política de reembolsos (versão de 2025)', 'categoria': 'reembolsos', 'publico': 'cliente', 'vigente': False, 'actualizado': '2025-03-10'}
39 chunks citáveis ao cliente`,
          },
        },
        { type: 'file', ref: 'src/balcao/ingestao.py' },
        {
          type: 'refs',
          items: [
            { label: 'Python — unicodedata.normalize', url: 'https://docs.python.org/3/library/unicodedata.html' },
            { label: 'LangChain — Retrieval (loaders, splitters, vector stores)', url: 'https://docs.langchain.com/oss/python/langchain/retrieval' },
            { label: 'Lewis et al. — Retrieval-Augmented Generation (2020)', url: 'https://arxiv.org/abs/2005.11401' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'estrategias',
      title: 'Cinco formas de partir um documento',
      blocks: [
        {
          type: 'p',
          text:
            'Partir documentos em chunks existe por duas razões que puxam em sentidos opostos. A pesquisa quer unidades **pequenas e focadas**: um embedding de um parágrafo sobre prazos de M-Pesa fica perto da pergunta sobre prazos de M-Pesa; um embedding de uma página inteira sobre reembolsos fica numa média de tudo o que a página diz. A geração quer unidades **completas**: uma regra partida em dois chunks, com metade no top-3 e metade no lugar 9, dá uma resposta meio certa. As estratégias de chunking são formas diferentes de negociar esta tensão.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Fixo', def: 'Janelas de N unidades (caracteres, palavras ou tokens) com sobreposição de O. Ignora a estrutura do texto. Previsível e trivial; corta frases a meio.' },
            { term: 'Por frases', def: 'Agrupa frases inteiras, K de cada vez. Nunca corta uma frase, mas ignora parágrafos e secções, e depende de um detector de frases que falha em abreviaturas e listas.' },
            { term: 'Recursivo', def: 'Tenta o separador mais forte (parágrafo); se um pedaço ainda for grande, desce para linha, frase, palavra. Junta pedaços pequenos vizinhos até ao tamanho máximo. É o `RecursiveCharacterTextSplitter`.' },
            { term: 'Estrutural', def: 'Parte pelos marcadores do formato: títulos Markdown, secções HTML, cláusulas numeradas de um contrato. Guarda o caminho de títulos como metadado.' },
            { term: 'Semântico', def: 'Calcula o embedding de cada frase e corta onde a distância entre frases consecutivas salta. Fronteiras por mudança de assunto, a um custo de embeddings na ingestão.' },
          ],
        },
        {
          type: 'p',
          text:
            'Vale a pena ver o que cada estratégia faz ao mesmo documento. A `pol-reembolso` tem 117 palavras em quatro parágrafos, cada um com uma regra. O excerto seguinte parte-a com as três estratégias do runtime e conta os chunks que terminam a meio de uma frase.',
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-02',
            title: 'A mesma política, três cortes',
            brief: 'O chunking fixo de 30 palavras com 5 de sobreposição corta quatro dos cinco chunks a meio de uma frase; por frases e recursivo nunca cortam. Repara onde acaba o segundo chunk fixo.',
            code: `import balcao as b

texto = b.DOC["pol-reembolso"]["texto"]
print("palavras no documento:", len(texto.split()))
for nome, partes in [
    ("fixo 30/5", b.chunk_fixo(texto, 30, 5)),
    ("frases 2", b.chunk_frases(texto, 2)),
    ("recursivo 40", b.chunk_recursivo(texto, 40)),
]:
    cortes = sum(1 for p in partes if not p.rstrip().endswith((".", "!", "?")))
    tamanhos = [len(p.split()) for p in partes]
    print(f"{nome:13} {len(partes)} chunks, tamanhos {tamanhos}, {cortes} acabam a meio de frase")

print()
print(repr(b.chunk_fixo(texto, 30, 5)[1][-60:]))
print(repr(b.chunk_recursivo(texto, 40)[1][-60:]))`,
            expected: `palavras no documento: 117
fixo 30/5     5 chunks, tamanhos [30, 30, 30, 30, 17], 4 acabam a meio de frase
frases 2      4 chunks, tamanhos [36, 33, 31, 17], 0 acabam a meio de frase
recursivo 40  4 chunks, tamanhos [20, 38, 31, 28], 0 acabam a meio de frase

'ito até 48 horas depois da entrega, na aplicação, em Ajuda >'
'depois da entrega, na aplicação, em Ajuda > Os meus pedidos.'`,
          },
        },
        { type: 'widget', id: 'chunking-lab' },
        {
          type: 'p',
          text:
            'No laboratório real, o «Balcão» usa o `RecursiveCharacterTextSplitter` do pacote `langchain-text-splitters` com os separadores parágrafo, linha, frase, palavra e carácter vazio. O tamanho mede-se em caracteres (700, com 100 de sobreposição), porque é isso que `len` mede por omissão; o runtime didáctico mede em palavras (80 por chunk) para os números ficarem legíveis. 700 caracteres de português são ≈ 195 tokens pela estimativa de 3,6 caracteres por token.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O divisor do «Balcão» (`criar_divisor` em `ingestao.py`). `keep_separator="end"` deixa o ponto final no fim do chunk em vez de o pôr no início do seguinte.',
          code: `from langchain_text_splitters import RecursiveCharacterTextSplitter

divisor = RecursiveCharacterTextSplitter(
    chunk_size=700,            # caracteres (length_function=len por omissão)
    chunk_overlap=100,
    separators=["\\n\\n", "\\n", ". ", " ", ""],   # parágrafo → linha → frase → palavra → carácter
    keep_separator="end",
    strip_whitespace=True,
)
partes = divisor.split_text(texto)   # list[str]; create_documents(...) devolve Document com metadados`,
        },
        {
          type: 'p',
          text:
            'O chunking **estrutural** é o recursivo levado a sério quando o formato tem marcadores explícitos. Para Markdown, o `MarkdownHeaderTextSplitter` parte pelos títulos e põe o caminho de títulos nos metadados; encadeia-se com o recursivo para os casos em que uma secção passa do tamanho máximo. É o que se usa quando as políticas crescem para páginas com várias secções.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Estrutural e depois recursivo: o título da secção fica nos metadados de cada chunk e pode ir para o cabeçalho contextual (secção 4).',
          code: `from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

por_titulo = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("#", "documento"), ("##", "seccao")],
    strip_headers=False,       # o título continua no texto: ajuda o embedding e o BM25
)
recursivo = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)

seccoes = por_titulo.split_text(markdown)          # list[Document], metadata={"documento": ..., "seccao": ...}
chunks = recursivo.split_documents(seccoes)        # herda os metadados de cada secção`,
        },
        {
          type: 'p',
          text:
            'O chunking **semântico** (o `SemanticChunker` vive no pacote `langchain-experimental`, fora do núcleo) mede a distância de cosseno entre frases consecutivas e corta nos saltos acima de um percentil. Tem dois custos que raramente aparecem nos tutoriais: um embedding por frase na ingestão (dez a vinte vezes mais chamadas do que um por chunk) e fronteiras que mudam quando se troca de modelo de embeddings, o que torna a reindexação não reprodutível. Nos documentos do «Chega», escritos por pessoas em parágrafos de uma regra, as fronteiras que o semântico encontra são as que o recursivo já encontra de graça (adr-0008).',
        },
        {
          type: 'table',
          head: ['Estratégia', 'Custo na ingestão', 'Determinista', 'Corta regras', 'Onde compensa'],
          rows: [
            ['Fixo com sobreposição', 'nulo', 'sim', 'sim, frequentemente', 'Texto sem estrutura (transcrições, logs), ou como último recurso.'],
            ['Por frases', 'detector de frases', 'sim', 'não corta frases; separa frases da mesma regra', 'FAQ curtas, respostas de uma ou duas frases.'],
            ['Recursivo', 'nulo', 'sim', 'raramente, se o autor escreveu em parágrafos', 'O padrão para Markdown e texto escrito por pessoas. A escolha do «Balcão».'],
            ['Estrutural', 'parser do formato', 'sim', 'não, se os títulos forem fiéis', 'Documentos longos com secções: contratos, manuais, condições gerais.'],
            ['Semântico', 'um embedding por frase', 'não entre versões do modelo', 'depende do limiar', 'Texto longo e corrido sem marcadores, quando se mediu ganho.'],
          ],
          caption: 'Nenhuma coluna diz «qualidade»: a qualidade mede-se no teu conjunto dourado, não se lê numa tabela (secção 3).',
        },
        { type: 'adr', ref: 'adr-0008' },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — repositório (langchain-text-splitters)', url: 'https://github.com/langchain-ai/langchain' },
            { label: 'LangChain — RAG com RecursiveCharacterTextSplitter', url: 'https://docs.langchain.com/oss/python/langchain/rag' },
            { label: 'Günther et al. — Late Chunking (2024)', url: 'https://arxiv.org/abs/2409.04701' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'tamanho',
      title: 'Tamanho e sobreposição: medir em vez de adivinhar',
      blocks: [
        {
          type: 'p',
          text:
            'O tamanho do chunk é o parâmetro mais discutido e menos medido de um RAG. Valores como «512 tokens com 50 de sobreposição» aparecem em tutoriais sem qualquer referência ao corpus. A forma honesta de escolher é correr o conjunto dourado com dois ou três tamanhos e olhar para duas coisas: se o documento certo aparece (recall) e se o texto que aparece chega para responder (que o recall não mede).',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-ingestao-chunking-01',
            title: 'Quantos chunks e quanto custa a sobreposição',
            expr: 'n = ⌈ (N − o) / (s − o) ⌉        tokens indexados ≈ n · s ≈ N · s / (s − o)',
            where: [
              { sym: 'N', means: 'tamanho do documento, na mesma unidade do chunk (117 palavras na `pol-reembolso`)' },
              { sym: 's', means: 'tamanho do chunk (30 palavras no exemplo fixo)' },
              { sym: 'o', means: 'sobreposição entre chunks consecutivos (5 palavras); tem de ser menor do que s' },
              { sym: 'n', means: 'número de chunks: ⌈112 / 25⌉ = 5, os mesmos cinco que o `chunk_fixo` devolveu' },
              { sym: 's / (s − o)', means: 'factor de inflação: com 700 e 100 caracteres, cada token é indexado ≈ 1,17 vezes' },
            ],
            reading: 'A sobreposição compra continuidade entre chunks e paga-a em vectores, tokens de embedding e chunks quase repetidos no top-k.',
            note: 'No «Balcão» a inflação é irrelevante em dinheiro (reindexar os ≈ 1 870 chunks custa menos de 1 MZN numa API de embeddings) mas não em contexto: dois chunks vizinhos com 100 caracteres em comum podem ocupar dois dos três lugares do prompt.',
          },
        },
        {
          type: 'p',
          text:
            'O excerto seguinte corre as 30 perguntas douradas com as três estratégias do runtime e os quatro métodos de pesquisa, e mede o recall@3 ao nível do documento. Lê o resultado com cuidado: com 30 perguntas, cada pergunta vale 0,033, e a diferença entre 0,900 e 0,933 é **uma** pergunta.',
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-03',
            title: 'Recall@3 por estratégia de chunking e método de pesquisa',
            brief: 'As diferenças entre estratégias são de uma ou duas perguntas em 30 — dentro do ruído. O re-ranking iguala as três. É o sinal de que, neste corpus, o chunking não se decide pelo recall.',
            code: `import balcao as b

def docs_unicos(res):
    vistos = []
    for c, _ in res:
        if c.doc not in vistos:
            vistos.append(c.doc)
    return vistos

print("estratégia  chunks   bm25  denso  híbrido  rerank")
for estrategia in ["fixo", "frases", "recursivo"]:
    linha = []
    for metodo in ["bm25", "denso", "hibrido", "rerank"]:
        r = [b.recall_at_k(docs_unicos(b.recuperar(p["pergunta"], 30, metodo, estrategia=estrategia)),
                           p["relevantes"], 3) for p in b.PERGUNTAS]
        linha.append(sum(r) / len(r))
    n = len(b.chunkar_corpus(estrategia))
    print(f"{estrategia:10} {n:6}   " + "  ".join(f"{x:.3f}" for x in linha))`,
            expected: `estratégia  chunks   bm25  denso  híbrido  rerank
fixo           51   0.833  0.933  0.900  0.950
frases         50   0.800  0.917  0.900  0.950
recursivo      46   0.833  0.900  0.933  0.950`,
          },
        },
        {
          type: 'p',
          text:
            'Se o recall não distingue as estratégias, o que as distingue? O texto que chega ao modelo. O próximo excerto usa o mesmo índice exacto com chunks fixos de 30 palavras e com chunks recursivos, e pede ao modelo simulado (que responde por extracção, copiando frases do contexto) a resposta a duas perguntas douradas. O documento certo aparece nos dois casos; a resposta não.',
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-04',
            title: 'Mesmo documento recuperado, respostas diferentes',
            brief: 'Com chunks fixos, a resposta sobre a taxa para 5 km acaba em «150 MZN entre 6» e a do número de telefone acaba em «a». O recall@3 deu estas perguntas como acertadas nas duas estratégias.',
            code: `import balcao as b

modelo = b.ModeloSimulado()
filtro = {"vigente": True, "publico": "cliente"}
indices = {
    "fixo 30/5": b.IndiceExacto(b.chunkar_corpus("fixo", tamanho=30, sobreposicao=5)),
    "recursivo": b.IndiceExacto(b.chunkar_corpus("recursivo")),
}
for gid in ["g05", "g27"]:
    p = next(x for x in b.PERGUNTAS if x["id"] == gid)
    print(f"{gid}: {p['pergunta']}")
    for nome, idx in indices.items():
        res = idx.procurar(p["pergunta"], 3, filtro)
        texto = modelo.gerar(b.montar_prompt_rag(p["pergunta"], res)).texto
        print(f"  [{nome}] ...{texto[-75:]}")`,
            expected: `g05: Quanto custa a entrega para 5 km?
  [fixo 30/5] ...0 MZN até 3 km, 95 MZN entre 3 e 6 km, e 150 MZN entre 6 [pol-taxa-entrega]
  [recursivo] ... [pol-taxa-entrega] Não fazemos entregas acima de 10 km. [pol-taxa-entrega]
g27: Mudei de número e perdi o antigo
  [fixo 30/5] ...telefone] Se já não tiver acesso ao número antigo, a [faq-alterar-telefone]
  [recursivo] ...uporte, depois de verificar a identidade do titular. [faq-alterar-telefone]`,
          },
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o recall ao nível do documento não vê',
          text:
            'O recall@k conta documentos, não frases. Um chunk que traz o documento certo mas corta a regra a meio conta como acerto. Por isso a comparação de chunking fecha-se com uma métrica de geração (correcção da resposta ou faithfulness com juiz, módulo 21) sobre as mesmas perguntas, e com a leitura humana de uma amostra de chunks: dez minutos a ler chunks apanham mais problemas do que uma tabela de recall.',
        },
        {
          type: 'p',
          text:
            'Uma última nota sobre o modelo simulado: ele copia frases, por isso um chunk truncado dá uma resposta visivelmente truncada. Um modelo real é mais perigoso, porque **completa** a frase cortada com o que lhe parecer plausível: «150 MZN entre 6» vira «150 MZN entre 6 e 12 km» sem qualquer suporte. O defeito é o mesmo; só fica mais difícil de ver.',
        },
        {
          type: 'table',
          head: ['Parâmetro', 'Pequeno demais', 'Grande demais', 'Ponto de partida no «Balcão»'],
          rows: [
            ['Tamanho do chunk', 'Regras partidas; chunks sem contexto («Até 24 horas.»)', 'Embedding diluído por vários temas; poucos chunks cabem no prompt', '700 caracteres (≈ 195 tokens), um a dois parágrafos'],
            ['Sobreposição', 'Frase de fronteira perdida entre dois chunks', 'Top-k cheio de vizinhos quase iguais; mais vectores', '100 caracteres; zero quando o corte é sempre em parágrafo'],
            ['Chunks no prompt (k)', 'Resposta sem a regra que faltava', 'Contexto ruidoso, mais tokens e mais latência (módulo 10)', '4 depois do re-ranking'],
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. — Lost in the Middle (2023)', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'RAGAS — métricas de RAG', url: 'https://docs.ragas.io/en/stable/' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'parent-child',
      title: 'Pesquisar pequeno, responder grande: parent-child e cabeçalhos',
      blocks: [
        {
          type: 'p',
          text:
            'A tensão entre pesquisa e geração tem uma saída elegante: usar duas granularidades. Os chunks **filhos**, pequenos, são o que se vectoriza e pesquisa; o **pai**, maior (a secção ou o documento), é o que vai para o prompt. A pesquisa ganha precisão porque cada vector representa uma ideia; a geração ganha contexto porque recebe a regra inteira à volta da frase que bateu.',
        },
        {
          type: 'p',
          text:
            'Há um segundo problema que os chunks pequenos agravam: perdem o contexto do documento. A frase «M-Pesa e e-Mola: até 24 horas.» sozinha não diz de que prazo se trata — pode ser reembolso, reversão de débito ou confirmação de pagamento. A solução mais barata é um **cabeçalho contextual**: pôr o título do documento (ou o caminho de títulos) à frente do texto que se vectoriza. O `IndiceMemoria` e o `IndicePostgres` do laboratório fazem-no em todos os chunks (`f"{doc.titulo}\\n{c.page_content}"`).',
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-05',
            title: 'O mesmo chunk, com e sem título à frente',
            brief: 'Com chunks de uma frase, «M-Pesa e e-Mola: até 24 horas.» fica em 19.º lugar para a pergunta sobre a devolução no M-Pesa. Com o título do documento à frente, sobe para 3.º.',
            code: `import balcao as b

q = "Quanto tempo demora a devolução do dinheiro no M-Pesa?"
alvo = "pol-reembolso-prazos#1"          # «M-Pesa e e-Mola: até 24 horas.»
frases = b.chunkar_corpus("frases", max_frases=1)

def com_cabecalho(c):
    return b.Chunk(c.id, c.doc, f"{c.meta['titulo']}. {c.texto}", c.ordem, c.meta)

for nome, lista in [("sem cabeçalho", frases), ("com título", [com_cabecalho(c) for c in frases])]:
    res = b.IndiceExacto(lista).procurar(q, 50, {"vigente": True})
    pos = [c.id for c, _ in res].index(alvo) + 1
    score = dict((c.id, s) for c, s in res)[alvo]
    print(f"{nome:14} posição {pos:2}  cosseno {score}")`,
            expected: `sem cabeçalho  posição 19  cosseno 0.1858
com título     posição  3  cosseno 0.503`,
          },
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Parent-child: o que se pesquisa não é o que se envia',
            caption: 'Os filhos (uma frase com o título à frente) vivem no índice vectorial; os pais (o documento ou a secção) vivem numa tabela por id. A pesquisa devolve filhos; o prompt recebe os pais, sem repetir.',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'z-indice', label: 'Índice (filhos)', col: 1, row: 0, colSpan: 2, rowSpan: 3, tone: 'rag' },
              { id: 'z-loja', label: 'Loja de documentos (pais)', col: 3, row: 0, colSpan: 1, rowSpan: 3, tone: 'data' },
            ],
            nodes: [
              { id: 'pergunta', label: 'pergunta', sub: 'devolução no M-Pesa', col: 0, row: 1, kind: 'user' },
              { id: 'f1', label: 'pol-reembolso#6', sub: '0,563', col: 1, row: 0, kind: 'vector' },
              { id: 'f2', label: 'pol-reembolso-prazos#4', sub: '0,508', col: 1, row: 1, kind: 'vector' },
              { id: 'f3', label: 'pol-reembolso-prazos#1', sub: '0,503', col: 1, row: 2, kind: 'vector' },
              { id: 'dedup', label: 'agrupar por doc', sub: 'sem repetir o pai', col: 2, row: 1, kind: 'service' },
              { id: 'p1', label: 'pol-reembolso', sub: 'documento inteiro', col: 3, row: 0, kind: 'data' },
              { id: 'p2', label: 'pol-reembolso-prazos', sub: 'documento inteiro', col: 3, row: 2, kind: 'data' },
              { id: 'prompt', label: 'prompt', sub: '≈ 313 tokens de contexto', col: 4, row: 1, kind: 'model' },
            ],
            edges: [
              { from: 'pergunta', to: 'f1' },
              { from: 'pergunta', to: 'f2' },
              { from: 'pergunta', to: 'f3' },
              { from: 'f1', to: 'dedup' },
              { from: 'f2', to: 'dedup' },
              { from: 'f3', to: 'dedup' },
              { from: 'dedup', to: 'p1', label: 'por id' },
              { from: 'dedup', to: 'p2', label: 'por id' },
              { from: 'p1', to: 'prompt' },
              { from: 'p2', to: 'prompt' },
            ],
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-06',
            title: 'Parent-child com o runtime',
            brief: 'Pesquisa em frases com cabeçalho e devolve os documentos pais, sem repetir. A frase que responde à pergunta («até 24 horas») passa a estar no contexto, que custa ≈ 313 tokens por dois documentos.',
            code: `import balcao as b

q = "Quanto tempo demora a devolução do dinheiro no M-Pesa?"
filtro = {"vigente": True, "publico": "cliente"}

# filhos: uma frase cada, com o título do documento à frente (o que se vectoriza)
filhos = [b.Chunk(c.id, c.doc, f"{c.meta['titulo']}. {c.texto}", c.ordem, c.meta)
          for c in b.chunkar_corpus("frases", max_frases=1)]
achados = b.IndiceExacto(filhos).procurar(q, 4, filtro)
for c, s in achados:
    print(f"filho {c.id:24} {s}")

# pais: o documento inteiro de cada filho, sem repetir (o que vai para o prompt)
pais = list(dict.fromkeys(c.doc for c, _ in achados))[:2]
contexto = " ".join(b.DOC[d]["texto"] for d in pais)
print("pais:", pais)
print("tokens de contexto:", b.estimar_tokens(contexto))
print("«até 24 horas» no contexto:", "até 24 horas" in contexto)`,
            expected: `filho pol-reembolso#6          0.563
filho pol-reembolso-prazos#4   0.5081
filho pol-reembolso-prazos#1   0.503
filho pol-reembolso-prazos#0   0.4823
pais: ['pol-reembolso', 'pol-reembolso-prazos']
tokens de contexto: 313
«até 24 horas» no contexto: True`,
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Parent-child com as peças do `langchain-core` 1.x: um vector store para os filhos, um dicionário (ou uma tabela) para os pais. O `ParentDocumentRetriever` clássico ficou no pacote `langchain-classic`; escrever as vinte linhas dá controlo sobre o filtro e a deduplicação.',
          code: `from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

filhos_div = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=0)
pais: dict[str, Document] = {}
loja = InMemoryVectorStore(embeddings)          # em produção: a tabela chunks do PostgreSQL

for doc in documentos:                          # um Document por política, com metadata["id"]
    pais[doc.metadata["id"]] = doc
    filhos = filhos_div.split_documents([doc])
    for i, f in enumerate(filhos):
        f.page_content = f"{doc.metadata['titulo']}\\n{f.page_content}"   # cabeçalho contextual
        f.id = f"{doc.metadata['id']}#{i}"
    loja.add_documents(filhos)

def recuperar_pais(pergunta: str, k_filhos: int = 8, k_pais: int = 3) -> list[Document]:
    achados = loja.similarity_search(
        pergunta, k=k_filhos,
        filter=lambda d: d.metadata["vigente"] and d.metadata["publico"] == "cliente",
    )
    ids = list(dict.fromkeys(d.metadata["id"] for d in achados))[:k_pais]
    return [pais[i] for i in ids]`,
        },
        {
          type: 'p',
          text:
            'O cabeçalho contextual com o título é a versão barata de uma ideia que a Anthropic publicou em 2024 como **contextual retrieval**: pedir a um modelo pequeno uma frase de 50 a 100 tokens que situe cada chunk no documento, e juntá-la ao chunk antes do embedding e do índice lexical. No conjunto de avaliação deles, a taxa de falhas de recuperação (1 − recall@20) desceu de 5,7% para 3,7% com contexto nos embeddings e para 2,9% com contexto também no BM25. O custo é uma chamada ao modelo por chunk na ingestão. O módulo 12 compara as duas versões.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Parent-child enche o contexto',
          text:
            'Três pais de 700 caracteres são ≈ 580 tokens; três documentos inteiros de 2 000 caracteres são ≈ 1 700. O ganho de recall paga-se no orçamento de contexto (≈ 2 000 tokens por turno no «Balcão», `CAPACIDADE`) e na latência do modelo. Limita `k_pais`, e mede se o pai precisa mesmo de ser o documento inteiro ou só a secção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval' },
            { label: 'Sarthi et al. — RAPTOR: recursive abstractive processing (2024)', url: 'https://arxiv.org/abs/2401.18059' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 'idempotencia',
      title: 'Ingestão incremental e idempotente',
      blocks: [
        {
          type: 'p',
          text:
            'A ingestão não corre uma vez. As políticas mudam todas as semanas, as FAQ todos os dias, e RF-07 pede que um documento novo seja pesquisável em menos de 10 minutos, sem parar o serviço, retirando as versões substituídas. Isto é o problema clássico de sincronizar uma fonte com uma cópia derivada, e resolve-se como qualquer engenheiro de backend o resolveria: com uma chave de conteúdo, operações idempotentes e transacções.',
        },
        {
          type: 'list',
          items: [
            '**Hash por documento.** SHA-256 do texto e dos metadados que mudam a pesquisa. Se o hash guardado for igual, o documento salta-se: zero embeddings, zero escritas.',
            '**Substituição transaccional.** Documento alterado: numa só transacção, actualiza-se a linha de `documentos`, apagam-se os chunks antigos e inserem-se os novos. Quem pesquisa a meio vê a versão antiga ou a nova, nunca metade.',
            '**Ids estáveis.** `pol-reembolso#0` é o chunk 0 da `pol-reembolso` em todas as versões. Os traços, as avaliações e o feedback continuam a apontar para algo que existe.',
            '**Retirar é alterar.** Mudar `vigente` de true para false muda o hash: a ingestão reescreve o documento com a marca nova, e o filtro faz o resto.',
            '**O modelo de embeddings faz parte da chave.** Trocar de modelo não muda o texto nem o hash; sem mais nada, a ingestão saltaria tudo e a pesquisa (que filtra por `modelo_embedding`) ficaria vazia.',
          ],
        },
        {
          type: 'run',
          run: {
            id: 'run-ingestao-chunking-07',
            title: 'Três ingestões e uma deduplicação',
            brief: 'A segunda ingestão da mesma fonte não pede nenhum embedding. Em Junho, retirar a política de 2025 é uma actualização de um documento: um chunk reescrito. No fim, dois textos com acentos e espaços diferentes dão a mesma chave de conteúdo.',
            code: `import hashlib
import json
import balcao as b

def hash_documento(d: dict) -> str:
    # conteúdo + metadados que mudam a pesquisa (como DocumentoFonte.hash)
    chave = json.dumps([d["titulo"], d["categoria"], d["publico"], d["vigente"],
                        d["actualizado"], d["texto"]], ensure_ascii=False)
    return hashlib.sha256(chave.encode("utf-8")).hexdigest()

indice: dict[str, str] = {}        # doc_id -> hash guardado
embeddings_pedidos = 0

def ingerir(docs: list[dict]) -> str:
    global embeddings_pedidos
    novos = actualizados = inalterados = 0
    for d in docs:
        h, anterior = hash_documento(d), indice.get(d["id"])
        if h == anterior:
            inalterados += 1
            continue
        embeddings_pedidos += len(b.chunk_recursivo(d["texto"]))
        indice[d["id"]] = h
        novos, actualizados = novos + (anterior is None), actualizados + (anterior is not None)
    return f"novos={novos} actualizados={actualizados} inalterados={inalterados} embeddings={embeddings_pedidos}"

antes = [dict(d, vigente=True) if d["id"] == "pol-reembolso-2025" else d for d in b.DOCUMENTOS]
print("1.ª ingestão (Maio):  ", ingerir(antes))
print("mesma fonte outra vez:", ingerir(antes))
print("Junho, 2025 retirada: ", ingerir(b.DOCUMENTOS))

def chave_conteudo(t: str) -> str:
    return hashlib.sha256(" ".join(b.normalizar(t).split()).encode()).hexdigest()[:12]
print(chave_conteudo("Os cupões são válidos durante 30 dias."),
      chave_conteudo("Os  cupoes sao validos durante 30 dias."))`,
            expected: `1.ª ingestão (Maio):   novos=40 actualizados=0 inalterados=0 embeddings=46
mesma fonte outra vez: novos=0 actualizados=0 inalterados=40 embeddings=46
Junho, 2025 retirada:  novos=0 actualizados=1 inalterados=39 embeddings=47
f152198eb82d f152198eb82d`,
          },
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-ingestao-chunking-01',
            title: 'Junho de 2026: a política de reembolsos muda',
            intro: 'O suporte publica a nova `pol-reembolso-prazos` (24 horas no M-Pesa) e marca a de 2025 como `vigente: false`. O job de ingestão sincroniza as duas; o serviço continua a responder durante todo o processo.',
            lanes: [
              { id: 'suporte', label: 'Suporte', sub: 'dono das políticas', kind: 'human' },
              { id: 'api', label: 'API do «Balcão»', sub: 'POST /v1/ingestao', kind: 'service' },
              { id: 'worker', label: 'Job de ingestão', sub: 'balcao.ingestao', kind: 'service' },
              { id: 'emb', label: 'Embeddings', sub: '768 dimensões', kind: 'model' },
              { id: 'pg', label: 'PostgreSQL', sub: 'documentos, chunks', kind: 'store' },
            ],
            steps: [
              { from: 'suporte', to: 'api', label: 'merge no repositório de conteúdos', detail: 'A integração do repositório chama a API com os dois ficheiros alterados.', kind: 'req', ms: 40 },
              { from: 'api', to: 'worker', label: '202 Accepted, tarefa em fila', detail: 'A ingestão é assíncrona: o pedido HTTP não espera pelos embeddings.', kind: 'async', ms: 15 },
              { from: 'worker', to: 'worker', label: 'validar cabeçalho, normalizar, mascarar PII', detail: 'Um documento sem `id` ou `publico` é recusado com erro por documento; os outros seguem.', kind: 'self', ms: 20 },
              { from: 'worker', to: 'pg', label: 'SELECT hash dos dois documentos', detail: 'Só conta o hash se houver chunks do modelo de embeddings actual (`hash_documento` em `recuperacao.py`).', kind: 'req', ms: 5, code: "SELECT d.hash FROM documentos d WHERE d.id = %s AND EXISTS\n  (SELECT 1 FROM chunks c WHERE c.documento_id = d.id AND c.modelo_embedding = %s)", lang: 'sql' },
              { from: 'pg', to: 'worker', label: 'hashes diferentes: os dois mudaram', kind: 'res', ms: 2 },
              { from: 'worker', to: 'emb', label: 'embed_documents(título + chunk) para 3 chunks', detail: 'Dois chunks da política nova, um da de 2025 (que só mudou de `vigente`). O custo cresce com o que mudou, não com o corpus.', kind: 'req', ms: 180 },
              { from: 'emb', to: 'worker', label: '3 vectores', kind: 'res', ms: 5 },
              { from: 'worker', to: 'pg', label: 'BEGIN; upsert documento; DELETE chunks; INSERT chunks; COMMIT', detail: 'Por documento, numa transacção. A pesquisa concorrente vê a versão antiga até ao COMMIT e a nova depois.', kind: 'req', ms: 12 },
              { from: 'worker', to: 'api', label: 'tarefa concluída: 0 novos, 2 actualizados, 212 inalterados', detail: 'Contadores por fase e erros por documento em `GET /v1/ingestao/{tarefa_id}`.', kind: 'res', ms: 5 },
            ],
            outro: 'Da publicação à pesquisa passam segundos, longe dos 10 minutos de RF-07. O teste de CI com perguntas cuja resposta mudou (RI-05) corre a seguir: «Quanto tempo demora a devolução no M-Pesa?» tem de citar `pol-reembolso-prazos` e nunca `pol-reembolso-2025`.',
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O núcleo real (`ingestao.py`): salta o que não mudou e substitui o que mudou. `indice` é o `IndicePostgres` ou o `IndiceMemoria`.',
          code: `def ingerir(docs, indice, cfg, modelo_embedding) -> RelatorioIngestao:
    divisor = criar_divisor(cfg)
    rel = RelatorioIngestao()
    for doc in docs:
        anterior = indice.hash_documento(doc.id)      # None se não existe ou se é de outro modelo
        if anterior == doc.hash:
            rel.inalterados.append(doc.id)
            continue
        chunks = partir(doc, divisor, modelo_embedding)   # ids estáveis doc#ordem, metadados herdados
        indice.substituir_documento(doc, chunks)          # uma transacção por documento
        rel.chunks += len(chunks)
        (rel.novos if anterior is None else rel.actualizados).append(doc.id)
    return rel`,
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'A alternativa pronta no `langchain-core`: a API `index` com um `RecordManager` guarda hashes por documento e apaga os órfãos. Útil quando o vector store é genérico; o «Balcão» escreveu a sua porque o esquema tem colunas próprias (`vigente`, `publico`, `tsv`).',
          code: `from langchain_core.indexing import InMemoryRecordManager, index

gestor = InMemoryRecordManager(namespace="balcao/chunks")   # em produção: um RecordManager persistente
gestor.create_schema()

resultado = index(
    chunks,                          # Document com metadata["documento_id"]
    gestor,
    vector_store,
    cleanup="incremental",           # apaga chunks antigos das fontes que voltaram a ser indexadas
    source_id_key="documento_id",
    key_encoder="sha256",
)
print(resultado)   # {'num_added': ..., 'num_updated': ..., 'num_skipped': ..., 'num_deleted': ...}`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção: a ingestão também tem SLO e alarmes',
          text:
            'Três sinais chegam: tarefas de ingestão falhadas ou com documentos recusados (alarme para o dono da fonte, não para a plataforma), idade do documento mais recente no índice versus no repositório (se passar de 10 minutos, RF-07 está violado), e número de chunks sem `vigente` ou `publico` preenchidos (tem de ser zero; adr-0008). Um índice desactualizado não dá erro nenhum: responde com confiança a partir da versão da semana passada.',
        },
        { type: 'endpoint', ref: 'ingestao-criar' },
        {
          type: 'refs',
          items: [
            { label: 'Python — hashlib', url: 'https://docs.python.org/3/library/hashlib.html' },
            { label: 'LangChain — repositório (langchain_core.indexing)', url: 'https://github.com/langchain-ai/langchain' },
            { label: 'PostgreSQL — colunas geradas', url: 'https://www.postgresql.org/docs/current/ddl-generated-columns.html' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'pipeline',
      title: 'O pipeline de ingestão do «Balcão»',
      blocks: [
        {
          type: 'p',
          text:
            'Juntando as peças, o pipeline tem seis fases e duas saídas por chunk: um vector (para o HNSW) e um `tsvector` gerado pela base de dados (para a pesquisa lexical do módulo 11). O esquema põe as duas lado a lado na mesma linha; os filtros vivem em colunas da tabela `documentos`, indexadas.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Do repositório de conteúdos à tabela chunks',
            caption: 'As fontes em tempo real (avisos, pedidos) ficam fora do pipeline: são lidas por ferramenta. O hash decide se um documento passa das fases baratas (carregar, validar) para as caras (embeddings, escrita).',
            cols: 6,
            rows: 3,
            zones: [
              { id: 'z-fontes', label: 'Fontes', col: 0, row: 0, colSpan: 1, rowSpan: 3, tone: 'external' },
              { id: 'z-job', label: 'Job de ingestão', col: 1, row: 0, colSpan: 3, rowSpan: 3, tone: 'rag' },
              { id: 'z-pg', label: 'PostgreSQL 18 + pgvector', col: 4, row: 0, colSpan: 2, rowSpan: 3, tone: 'data' },
            ],
            nodes: [
              { id: 'md', label: 'Políticas', sub: 'Markdown', col: 0, row: 0, kind: 'external' },
              { id: 'cms', label: 'FAQ', sub: 'JSON do CMS', col: 0, row: 1, kind: 'external' },
              { id: 'proc', label: 'Procedimentos', sub: 'publico = interno', col: 0, row: 2, kind: 'external' },
              { id: 'validar', label: 'carregar e validar', sub: 'cabeçalho, NFC, PII', col: 1, row: 1, kind: 'service' },
              { id: 'hash', label: 'hash mudou?', sub: 'SHA-256', col: 2, row: 0, kind: 'decision' },
              { id: 'partir', label: 'partir', sub: 'recursivo, 700/100', col: 2, row: 1, kind: 'service' },
              { id: 'embed', label: 'embeddings', sub: 'título + chunk', col: 3, row: 1, kind: 'model' },
              { id: 'docs', label: 'documentos', sub: 'vigente, publico, hash', col: 4, row: 0, kind: 'data' },
              { id: 'chunks', label: 'chunks', sub: 'vector(768), tsv, modelo', col: 4, row: 1, kind: 'vector' },
              { id: 'hnsw', label: 'HNSW', sub: 'cosseno', col: 5, row: 1, kind: 'data' },
              { id: 'gin', label: 'GIN', sub: 'tsvector portuguese', col: 5, row: 2, kind: 'data' },
            ],
            edges: [
              { from: 'md', to: 'validar' },
              { from: 'cms', to: 'validar' },
              { from: 'proc', to: 'validar' },
              { from: 'validar', to: 'hash' },
              { from: 'hash', to: 'partir', label: 'sim' },
              { from: 'hash', to: 'docs', label: 'não: saltar', style: 'dashed' },
              { from: 'partir', to: 'embed' },
              { from: 'embed', to: 'chunks', label: 'uma transacção' },
              { from: 'chunks', to: 'docs', label: 'FK', dir: 'none' },
              { from: 'chunks', to: 'hnsw' },
              { from: 'chunks', to: 'gin' },
            ],
          },
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Excerto de `sql/001_esquema.sql`: o `tsvector` é uma coluna gerada, por isso nunca fica dessincronizado do texto; o modelo de embeddings fica em cada linha.',
          code: `CREATE TABLE IF NOT EXISTS chunks (
    id               text PRIMARY KEY,           -- pol-reembolso#0: estável entre reindexações
    documento_id     text    NOT NULL REFERENCES documentos (id) ON DELETE CASCADE,
    ordem            integer NOT NULL,
    texto            text    NOT NULL,
    embedding        vector(768) NOT NULL,
    modelo_embedding text    NOT NULL,           -- vectores de modelos diferentes não se comparam
    tsv              tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
    metadados        jsonb   NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (documento_id, ordem)
);`,
        },
        { type: 'file', ref: 'sql/001_esquema.sql' },
        {
          type: 'p',
          text:
            'O ranking seguinte mostra porque é que os metadados têm de estar certos em cada chunk. É a pesquisa densa, sem filtro, para a pergunta da conversa `politica-substituida`: o chunk de 2025 aparece em primeiro lugar, e o quarto é um procedimento interno. Nenhum dos dois pode chegar ao cliente. A decisão de os retirar na consulta é do módulo 12; a possibilidade de o fazer nasce aqui, na ingestão.',
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-ingestao-chunking-01',
            title: 'Pesquisa densa sem filtro: o que os metadados permitem retirar',
            brief: 'k = 4, chunking recursivo, índice exacto do runtime. Scores de cosseno.',
            query: 'Quanto tempo demora a devolução do dinheiro no M-Pesa?',
            method: 'denso',
            k: 4,
            hits: [
              { doc: 'pol-reembolso-2025', texto: 'Os reembolsos para M-Pesa são processados em até 72 horas. O assistente pode aprovar reembolsos até 300 MZN.', score: 0.482, relevante: false },
              { doc: 'pol-reembolso-prazos', texto: 'Se o prazo passou e o dinheiro não apareceu, o cliente deve enviar a referência do reembolso, que começa por RB-.', score: 0.4053, relevante: true },
              { doc: 'pol-reembolso', texto: 'O reembolso é feito sempre para o meio de pagamento original. Não fazemos reembolsos para outro número M-Pesa ou e-Mola.', score: 0.3546, relevante: false },
              { doc: 'int-tom-de-voz', texto: 'O assistente trata o cliente por você, escreve frases curtas e responde primeiro ao que foi perguntado.', score: 0.328, relevante: false },
            ],
            note: 'O primeiro é `vigente = false`; o quarto é `publico = interno`. E o chunk que tem a resposta («M-Pesa e e-Mola: até 24 horas», `pol-reembolso-prazos#0`) nem está no top-4: está diluído num chunk que fala de quatro meios de pagamento. Três problemas de ingestão num só ranking.',
          },
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-ingestao-chunking-01',
            title: 'Que estratégia de chunking para uma fonte nova?',
            intro: 'Uma decisão por fonte, não por sistema. Começa pelo formato e acaba com uma medição.',
            start: 'formato',
            nodes: [
              {
                id: 'formato',
                question: 'A fonte tem estrutura explícita (títulos Markdown, secções HTML, cláusulas numeradas)?',
                options: [
                  { label: 'Sim', next: 'longo' },
                  { label: 'Não, é texto corrido', next: 'corrido' },
                ],
              },
              {
                id: 'longo',
                question: 'As secções cabem no tamanho máximo do chunk?',
                options: [
                  { label: 'Sim, quase todas', next: 'estrutural' },
                  { label: 'Não, há secções de várias páginas', next: 'estrutural-recursivo' },
                ],
              },
              { id: 'estrutural', answer: 'Estrutural: um chunk por secção, com o caminho de títulos nos metadados e no cabeçalho contextual.' },
              { id: 'estrutural-recursivo', answer: 'Estrutural e depois recursivo dentro de cada secção longa; considera parent-child com a secção como pai.' },
              {
                id: 'corrido',
                question: 'O texto foi escrito por pessoas em parágrafos (políticas, FAQ, artigos)?',
                options: [
                  { label: 'Sim', next: 'recursivo' },
                  { label: 'Não: transcrições, chats, OCR', next: 'fixo-ou-semantico' },
                ],
              },
              { id: 'recursivo', answer: 'Recursivo com separadores parágrafo → linha → frase → palavra. É a escolha do «Balcão» (adr-0008).' },
              { id: 'fixo-ou-semantico', answer: 'Fixo com sobreposição como linha de base; semântico só se medires ganho no conjunto dourado que pague um embedding por frase na ingestão.' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Guarda o que precisas para depurar',
          text:
            'Cada chunk leva `hash_documento`, `modelo_embedding` e `ordem`. Quando o suporte perguntar «porque é que o assistente citou isto?», `POST /v1/pesquisa` devolve o chunk com os metadados e o traço mostra a versão do índice: sem estas colunas, a resposta seria «não sabemos que versão estava indexada nesse dia».',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — repositório e documentação', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — pesquisa de texto', url: 'https://www.postgresql.org/docs/current/textsearch.html' },
          ],
        },
      ],
    },
  ],

  /* ================================================================ quiz */
  quiz: [
    {
      id: 'q-ingestao-chunking-01',
      topic: 'fontes',
      prompt: 'A equipa de operações quer que os avisos de chuva forte entrem no índice do «Balcão» «para o assistente saber». Qual é o problema principal?',
      options: [
        'Os avisos são curtos demais para gerar um embedding útil.',
        'Os avisos caducam em horas; um aviso indexado continua a ser recuperado depois de deixar de ser verdade.',
        'O `tsvector` em português não reconhece nomes de bairros.',
        'Os avisos têm dados pessoais dos estafetas.',
      ],
      answer: [1],
      explain: 'O índice é uma cópia derivada, sincronizada por ingestão. Informação que muda em horas pertence a uma ferramenta lida a cada conversa (a fonte `avisos` do `design.ts`), onde o valor é sempre o actual.',
    },
    {
      id: 'q-ingestao-chunking-02',
      topic: 'chunking',
      prompt: 'Com chunks fixos de 30 palavras, o recall@3 da pergunta g27 (número de telefone perdido) é 1. Porque é que a resposta pode continuar má?',
      options: [
        'Porque o recall@3 conta documentos, e o chunk recuperado pode cortar a regra a meio.',
        'Porque o chunk fixo muda o id do documento.',
        'Porque o modelo não consegue ler chunks com menos de 50 palavras.',
        'Porque a sobreposição duplica a citação.',
      ],
      answer: [0],
      explain: 'O runtime mostrou-o: com o documento certo recuperado, a resposta acabou em «Se já não tiver acesso ao número antigo, a». Um modelo real completaria a frase com algo plausível e sem suporte. O chunking avalia-se com métricas de geração e leitura de chunks, não só com recall.',
    },
    {
      id: 'q-ingestao-chunking-03',
      topic: 'metadados',
      prompt: 'Quais destas decisões de ingestão são pré-condição para o filtro `vigente AND publico = \'cliente\'` funcionar? (duas respostas)',
      options: [
        'Cada chunk herdar `vigente` e `publico` do documento de origem.',
        'Usar chunking semântico em vez de recursivo.',
        'Recusar documentos sem `publico` válido no cabeçalho.',
        'Guardar o texto do chunk em JSONB em vez de `text`.',
      ],
      answer: [0, 2],
      explain: 'O filtro só é tão bom quanto os metadados: um chunk sem `vigente` ou com `publico` em falta é invisível (ou visível) por acidente. A estratégia de corte e o tipo da coluna de texto não interferem.',
      why: [
        'Sem herança, o chunk não tem a coluna que o filtro lê.',
        'A estratégia de corte não mexe em metadados.',
        'Um documento sem público cairia num valor por omissão que pode expô-lo ao cliente.',
        'O formato do texto é irrelevante para o filtro.',
      ],
    },
    {
      id: 'q-ingestao-chunking-04',
      topic: 'idempotencia',
      prompt: 'Um colega implementa a deduplicação com `hash(texto)` do Python e guarda o valor na base de dados. O que acontece?',
      options: [
        'Funciona, mas é mais lento do que SHA-256.',
        'Na execução seguinte do job, os hashes de `str` saem diferentes e tudo é reindexado.',
        'Dá colisões frequentes em textos portugueses.',
        'O PostgreSQL rejeita inteiros negativos.',
      ],
      answer: [1],
      explain: 'O `hash()` de `str` é aleatorizado por processo (PYTHONHASHSEED). Serve para dicionários em memória, não para chaves persistentes. Uma chave de conteúdo persistente usa `hashlib.sha256` sobre bytes com codificação fixa.',
    },
    {
      id: 'q-ingestao-chunking-05',
      topic: 'idempotencia',
      prompt: 'O «Balcão» troca o modelo de embeddings. Os documentos não mudaram. O que tem de acontecer na ingestão?',
      options: [
        'Nada: o hash não mudou, por isso os vectores continuam válidos.',
        'Reindexar tudo, porque vectores de modelos diferentes não se comparam; a ingestão só considera o hash se os chunks forem do modelo actual.',
        'Recalcular só os embeddings das perguntas.',
        'Reduzir a dimensão dos vectores antigos para a do modelo novo.',
      ],
      answer: [1],
      explain: 'É por isso que `hash_documento` só devolve o hash quando existem chunks com `modelo_embedding` igual ao actual (adr-0007): trocar de modelo e ingerir é reindexar. O custo em dinheiro é pequeno; o cuidado está em não misturar vectores dos dois modelos na mesma consulta.',
    },
    {
      id: 'q-ingestao-chunking-06',
      topic: 'parent-child',
      prompt: 'O que ganha e o que custa o padrão parent-child em relação a vectorizar e enviar os mesmos chunks? (duas respostas)',
      options: [
        'Ganha precisão na pesquisa, porque cada vector filho representa uma ideia.',
        'Ganha latência, porque os pais não precisam de embedding.',
        'Custa mais tokens no prompt, porque o pai é maior do que o filho que bateu.',
        'Custa recall, porque os pais não são pesquisáveis.',
      ],
      answer: [0, 2],
      explain: 'A pesquisa é feita nos filhos (precisos) e a geração recebe os pais (completos). O preço é o contexto: três documentos inteiros podem ser o triplo dos tokens de três chunks.',
    },
    {
      id: 'q-ingestao-chunking-07',
      topic: 'chunking',
      prompt: 'Com 1 400 palavras, chunks de 200 e sobreposição de 50, quantos chunks produz um chunker fixo como o `chunk_fixo`?',
      options: ['7', '9', '10', '12'],
      answer: [1],
      explain: 'n = ⌈(N − o)/(s − o)⌉ = ⌈1 350/150⌉ = 9. Sem sobreposição seriam 7: a sobreposição de 25% custa dois chunks a mais (e dois embeddings, e dois candidatos quase repetidos).',
    },
    {
      id: 'q-ingestao-chunking-08',
      topic: 'contexto',
      prompt: 'O chunk «M-Pesa e e-Mola: até 24 horas.» fica em 19.º lugar; com o título do documento à frente, em 3.º. Que técnica é esta e que alternativa mais cara existe?',
      options: [
        'Cabeçalho contextual; a alternativa é gerar com um modelo pequeno uma frase de contexto por chunk (contextual retrieval).',
        'Re-ranking; a alternativa é um cross-encoder maior.',
        'Parent-child; a alternativa é GraphRAG.',
        'Sobreposição; a alternativa é aumentar o chunk.',
      ],
      answer: [0],
      explain: 'Pôr o título à frente do texto vectorizado é a versão determinista e gratuita; o contextual retrieval da Anthropic pede a um modelo 50 a 100 tokens de contexto por chunk, a um custo de uma chamada por chunk na ingestão.',
    },
    {
      id: 'q-ingestao-chunking-09',
      topic: 'chunking',
      prompt: 'Porque é que o «Balcão» não usa chunking semântico?',
      options: [
        'Porque não é suportado pelo pgvector.',
        'Porque exige um embedding por frase na ingestão e as fronteiras mudam com o modelo, sem ganho medido em documentos que já estão escritos em parágrafos de uma regra.',
        'Porque produz chunks maiores do que 768 dimensões.',
        'Porque não funciona em português.',
      ],
      answer: [1],
      explain: 'A adr-0008 rejeita-o por custo e não determinismo com ganho pequeno em documentos bem estruturados. Numa fonte de transcrições longas sem parágrafos, a decisão podia ser outra — e mediria-se.',
    },
  ],

  /* =========================================================== exercícios */
  exercises: [
    {
      id: 'e-ingestao-chunking-01',
      title: 'Contar chunks antes de indexar',
      kind: 'input',
      statement:
        'Uma política longa tem 700 palavras. O chunker fixo usa 80 palavras por chunk e 20 de sobreposição. Quantos chunks produz?',
      accept: ['12', 'doze'],
      hint: 'n = ⌈(N − o)/(s − o)⌉.',
      solution: '⌈(700 − 20)/(80 − 20)⌉ = ⌈680/60⌉ = ⌈11,33⌉ = 12. Sem sobreposição seriam ⌈700/80⌉ = 9: a sobreposição custa três chunks a mais.',
      difficulty: 1,
    },
    {
      id: 'e-ingestao-chunking-02',
      title: 'A FAQ que contradiz a política',
      kind: 'open',
      statement:
        'A FAQ do CMS diz «o reembolso no M-Pesa demora até 72 horas» (texto antigo que ninguém actualizou) e a política vigente diz 24 horas. As duas são `vigente = true`. O que muda na ingestão e na pesquisa para que o assistente não cite a FAQ, e como detectas este tipo de conflito antes de chegar ao cliente?',
      hint: 'A precedência entre fontes está em `FONTES`: em conflito, a política ganha. Pensa em metadados e num teste.',
      solution:
        'Três camadas. (1) Metadado de precedência: `categoria`/`fonte` já existe; acrescenta-se uma prioridade (política > FAQ) usada no re-ranking ou, mais simples, na montagem do contexto (se houver chunk de política sobre o mesmo tema, a FAQ sai). (2) Processo: a FAQ sobre prazos passa a ter um dono e um campo `substitui_por` ou é gerada a partir da política. (3) Detecção: um teste de CI com as perguntas cuja resposta tem valores (prazos, MZN) que compara os números citados com os da política vigente; e um job semanal que recupera, para cada política, as FAQ mais semelhantes e sinaliza números diferentes para revisão humana. Pedir ao modelo para «preferir políticas» é a camada mais fraca.',
      difficulty: 2,
    },
    {
      id: 'e-ingestao-chunking-03',
      title: 'Ingestão de condições gerais em PDF',
      kind: 'design',
      statement:
        'O «Chega» vai começar a vender seguros de entrega com condições gerais de uma seguradora parceira: 3 PDFs de 40 páginas, com cláusulas numeradas (3.2.1), tabelas de franquias e revisões anuais. Desenha a ingestão: extracção, estratégia de chunking, metadados, versões, e como validas que está bem.',
      hint: 'Cláusulas numeradas são estrutura explícita. Tabelas partidas a meio são o pior caso.',
      solution:
        'Extracção com um parser que preserve estrutura (títulos e tabelas), convertida para Markdown; revisão humana da primeira conversão. Chunking estrutural por cláusula (3.2, 3.2.1) com o caminho de títulos em metadados e no cabeçalho contextual («Condições gerais — Seguro de entrega — 3.2.1 Exclusões»); tabelas nunca partidas: uma tabela é um chunk, com a legenda. Parent-child com a cláusula de 2.º nível como pai. Metadados: `produto`, `versao_condicoes`, `vigente`, `valido_de`, `publico`. Versões: a revisão anual entra como documento novo e a anterior passa a `vigente = false` (mantém-se para apólices antigas, com filtro por data da apólice). Validação: 20 perguntas douradas escritas com o jurídico da seguradora, recall@3 e leitura de 30 chunks ao acaso; alarme se algum chunk tiver uma tabela sem cabeçalho.',
      difficulty: 3,
    },
    {
      id: 'e-ingestao-chunking-04',
      title: 'Chunker com metadados herdados',
      kind: 'code',
      statement:
        'Escreve `partir(doc: dict, max_palavras: int) -> list[balcao.Chunk]` que usa `balcao.chunk_recursivo`, dá ids estáveis `doc#ordem`, herda `titulo`, `categoria`, `publico`, `vigente`, `actualizado` e junta o título ao texto num campo separado `texto_vector` dentro de `meta` (o texto que se vectoriza).',
      hint: 'Não mudes `Chunk.texto`: é o que vai para o prompt e para a citação.',
      solution:
        'import balcao as b\n\nCAMPOS = ("titulo", "categoria", "publico", "vigente", "actualizado")\n\ndef partir(doc: dict, max_palavras: int = 80) -> list[b.Chunk]:\n    out = []\n    for i, t in enumerate(b.chunk_recursivo(doc["texto"], max_palavras)):\n        meta = {k: doc[k] for k in CAMPOS}\n        meta["texto_vector"] = f"{doc[\'titulo\']}\\n{t}"\n        out.append(b.Chunk(id=f"{doc[\'id\']}#{i}", doc=doc["id"], texto=t, ordem=i, meta=meta))\n    return out',
      difficulty: 2,
    },
  ],

  /* ========================================================= laboratórios */
  labs: [
    {
      id: 'lab-ingestao-chunking-01',
      moduleId: 'ingestao-chunking',
      title: 'Chunks que se podem filtrar',
      brief:
        'A função `partir_corpus` parte o corpus mas perde os metadados: nenhum chunk sabe se é vigente ou interno, e os ids não são estáveis. Corrige-a para usar o chunking recursivo, gerar ids `doc#ordem` e herdar `publico` e `vigente` (e os outros campos) de cada documento. No fim, conta os chunks citáveis ao cliente.',
      lang: 'python',
      starter: `import balcao as b

def partir_corpus(max_palavras: int = 80) -> list[b.Chunk]:
    chunks = []
    n = 0
    for d in b.DOCUMENTOS:
        for t in b.chunk_fixo(d["texto"], max_palavras, 10):
            chunks.append(b.Chunk(id=str(n), doc=d["id"], texto=t, ordem=0))
            n += 1
    return chunks

cs = partir_corpus()
print(len(cs))
`,
      checks: [
        { id: 'recursivo', label: 'Usa o chunking recursivo', re: 'chunk_recursivo\\(', why: 'O recursivo respeita parágrafos e frases (adr-0008).' },
        { id: 'sem-fixo', label: 'Não usa o chunking fixo', re: 'chunk_fixo\\(', forbid: true, why: 'O fixo corta regras a meio.' },
        { id: 'id-estavel', label: 'Ids estáveis doc#ordem', re: '#\\{i\\}|#\\{ordem\\}|\\+ *"#" *\\+', why: 'Traços, avaliações e feedback apontam para ids que têm de sobreviver a reindexações.' },
        { id: 'herda-vigente', label: 'Herda `vigente`', re: '["\']vigente["\']', why: 'Sem `vigente`, a política de 2025 não se distingue da actual.' },
        { id: 'herda-publico', label: 'Herda `publico`', re: '["\']publico["\']', why: 'Sem `publico`, um procedimento interno pode ser citado ao cliente.' },
        { id: 'meta', label: 'Passa `meta=` ao Chunk', re: 'meta\\s*=', why: 'O `Chunk` guarda os metadados em `meta`.' },
      ],
      hints: [
        'Usa `enumerate(b.chunk_recursivo(d["texto"], max_palavras))` para ter a ordem.',
        'Os campos a herdar são `titulo`, `categoria`, `publico`, `vigente` e `actualizado`.',
        'Para contar os citáveis: `c.meta["publico"] == "cliente" and c.meta["vigente"]`.',
      ],
      solution: `import balcao as b

CAMPOS = ("titulo", "categoria", "publico", "vigente", "actualizado")

def partir_corpus(max_palavras: int = 80) -> list[b.Chunk]:
    chunks = []
    for d in b.DOCUMENTOS:
        for i, t in enumerate(b.chunk_recursivo(d["texto"], max_palavras)):
            meta = {k: d[k] for k in CAMPOS}
            chunks.append(b.Chunk(id=f"{d['id']}#{i}", doc=d["id"], texto=t, ordem=i, meta=meta))
    return chunks

cs = partir_corpus()
citaveis = [c for c in cs if c.meta["publico"] == "cliente" and c.meta["vigente"]]
print(len(cs), "chunks;", len(citaveis), "citáveis ao cliente")
`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-ingestao-chunking-02',
      moduleId: 'ingestao-chunking',
      title: 'Ingestão idempotente',
      brief:
        'O job de ingestão abaixo reindexa tudo em cada execução e usa `hash()` do Python como chave. Reescreve `ingerir` para: calcular um SHA-256 do texto **e** dos metadados que afectam a pesquisa (`vigente`, `publico`), saltar documentos inalterados, e contar novos, actualizados e inalterados. Uma segunda execução com os mesmos documentos tem de dar zero embeddings.',
      lang: 'python',
      starter: `import balcao as b

guardado: dict[str, int] = {}

def ingerir(docs):
    embeddings = 0
    for d in docs:
        guardado[d["id"]] = hash(d["texto"])
        embeddings += len(b.chunk_recursivo(d["texto"]))
    return embeddings

print(ingerir(b.DOCUMENTOS))
print(ingerir(b.DOCUMENTOS))
`,
      checks: [
        { id: 'sha256', label: 'Usa hashlib.sha256', re: 'hashlib\\.sha256\\(', why: 'Uma chave de conteúdo persistente precisa de um hash criptográfico estável entre processos.' },
        { id: 'sem-hash-builtin', label: 'Não usa o hash() do Python', re: '(^|[^.\\w])hash\\(', forbid: true, why: 'O `hash()` de `str` muda de processo para processo (PYTHONHASHSEED).' },
        { id: 'vigente-na-chave', label: '`vigente` entra na chave', re: 'vigente', why: 'Retirar uma política (vigente passa a false) tem de ser uma alteração, não um no-op.' },
        { id: 'salta', label: 'Salta os inalterados', re: 'continue', why: 'Sem saltar, cada execução paga todos os embeddings outra vez.' },
        { id: 'conta', label: 'Conta inalterados', re: 'inalterados', why: 'O relatório da ingestão é o que o alarme lê.' },
      ],
      hints: [
        'Serializa a chave com `json.dumps([...], ensure_ascii=False)` e codifica em UTF-8 antes do SHA-256.',
        'Compara com `guardado.get(d["id"])`: `None` é novo, diferente é actualizado, igual é para saltar com `continue`.',
      ],
      solution: `import hashlib
import json
import balcao as b

guardado: dict[str, str] = {}

def chave(d: dict) -> str:
    bruto = json.dumps([d["texto"], d["titulo"], d["publico"], d["vigente"], d["actualizado"]], ensure_ascii=False)
    return hashlib.sha256(bruto.encode("utf-8")).hexdigest()

def ingerir(docs):
    novos = actualizados = inalterados = embeddings = 0
    for d in docs:
        h, anterior = chave(d), guardado.get(d["id"])
        if h == anterior:
            inalterados += 1
            continue
        embeddings += len(b.chunk_recursivo(d["texto"]))
        guardado[d["id"]] = h
        if anterior is None:
            novos += 1
        else:
            actualizados += 1
    return {"novos": novos, "actualizados": actualizados, "inalterados": inalterados, "embeddings": embeddings}

print(ingerir(b.DOCUMENTOS))
print(ingerir(b.DOCUMENTOS))
`,
      difficulty: 2,
      executavel: true,
    },
  ],

  /* ========================================================= casos de uso */
  useCases: [
    {
      id: 'uc-ingestao-chunking-01',
      title: 'Seguradora em Maputo: condições gerais de apólices para o apoio ao cliente',
      area: 'seguros',
      level: 2,
      scenario:
        'Uma seguradora moçambicana quer um assistente para a sua linha de apoio responder a perguntas sobre coberturas automóvel e de saúde. A base são 60 PDFs de condições gerais e particulares (20 a 90 páginas cada), com cláusulas numeradas, tabelas de franquias e revisões anuais publicadas em Janeiro. As apólices antigas continuam válidas até à renovação, por isso duas versões das mesmas condições são verdadeiras ao mesmo tempo, para clientes diferentes.',
      requirements: [
        'Cada resposta cita a cláusula exacta (produto, versão, número da cláusula).',
        'A resposta usa a versão das condições que se aplica à apólice do cliente, não a mais recente.',
        'Nenhuma tabela de franquias partida entre chunks.',
        'Reindexação da revisão anual em menos de uma hora, sem parar o assistente.',
      ],
      constraints: [
        'PDFs gerados por ferramentas diferentes ao longo de dez anos; alguns são digitalizações.',
        'Dados de apólices (nome, NUIT, matrícula) nunca entram no índice.',
      ],
      approach: [
        { title: 'Extracção com estrutura', text: 'Conversão para Markdown preservando títulos e tabelas; as digitalizações passam por OCR e por revisão humana amostral, porque um «5 000» lido como «3 000» numa franquia é um erro caro.' },
        { title: 'Chunking estrutural por cláusula', text: 'Um chunk por cláusula de 3.º nível, com o caminho «Automóvel › Condições gerais 2026 › 4.2.1 Exclusões» nos metadados e à frente do texto vectorizado. Tabelas são chunks inteiros com a legenda.' },
        { title: 'Parent-child', text: 'Os filhos são as cláusulas; o pai é a cláusula de 2.º nível, que é o que vai para o prompt quando uma exclusão depende da definição que a antecede.' },
        { title: 'Versões por data, não por «a mais recente»', text: 'Metadados `produto`, `versao`, `valido_de`, `valido_ate`. A ferramenta lê a apólice do cliente (data de emissão e produto) e a pesquisa filtra pela versão aplicável, na consulta SQL.' },
        { title: 'Ingestão idempotente por hash de cláusula', text: 'A revisão anual muda ≈ 15% das cláusulas; o hash por cláusula faz com que só essas sejam reindexadas, e a versão anterior mantém-se com `valido_ate` preenchido.' },
      ],
      diagram: {
        title: 'Condições gerais: da revisão anual ao chunk filtrado por apólice',
        cols: 5,
        rows: 2,
        zones: [
          { id: 'z-ing', label: 'Ingestão', col: 0, row: 0, colSpan: 3, rowSpan: 1, tone: 'rag' },
          { id: 'z-resp', label: 'Resposta', col: 0, row: 1, colSpan: 5, rowSpan: 1, tone: 'service' },
        ],
        nodes: [
          { id: 'pdf', label: 'PDF da revisão', sub: 'Janeiro', col: 0, row: 0, kind: 'external' },
          { id: 'md', label: 'Markdown', sub: 'títulos e tabelas', col: 1, row: 0, kind: 'service' },
          { id: 'clausulas', label: 'chunks por cláusula', sub: 'hash, versão, validade', col: 2, row: 0, kind: 'vector' },
          { id: 'pg', label: 'PostgreSQL', sub: 'pgvector + tsvector', col: 3, row: 0, kind: 'data' },
          { id: 'cliente', label: 'cliente', sub: 'pergunta sobre franquia', col: 0, row: 1, kind: 'user' },
          { id: 'apolice', label: 'ler apólice', sub: 'produto, data de emissão', col: 1, row: 1, kind: 'tool' },
          { id: 'pesquisa', label: 'pesquisa filtrada', sub: 'versão aplicável', col: 3, row: 1, kind: 'service' },
          { id: 'modelo', label: 'modelo', sub: 'cita a cláusula', col: 4, row: 1, kind: 'model' },
        ],
        edges: [
          { from: 'pdf', to: 'md' },
          { from: 'md', to: 'clausulas' },
          { from: 'clausulas', to: 'pg', label: 'só cláusulas alteradas' },
          { from: 'cliente', to: 'apolice' },
          { from: 'apolice', to: 'pesquisa', label: 'filtro de versão' },
          { from: 'pg', to: 'pesquisa' },
          { from: 'pesquisa', to: 'modelo' },
        ],
      },
      solution:
        'Chunking estrutural por cláusula com parent-child, metadados de versão e validade aplicados como filtro na consulta a partir da apólice lida por ferramenta, e ingestão incremental por hash de cláusula. A versão certa é garantida pela base de dados, não pela instrução ao modelo.',
      tools: [
        { name: 'MarkdownHeaderTextSplitter', role: 'corte por títulos com caminho nos metadados' },
        { name: 'RecursiveCharacterTextSplitter', role: 'cláusulas que passam do tamanho máximo' },
        { name: 'PostgreSQL + pgvector', role: 'vectores, tsvector e filtros de versão na mesma consulta' },
      ],
      rejected: [
        { option: 'Chunking fixo de 500 tokens sobre o texto extraído', why: 'Parte tabelas de franquias e cláusulas de exclusão; a citação ficaria «página 14» em vez de «cláusula 4.2.1».' },
        { option: 'Indexar só a versão mais recente', why: 'Clientes com apólices emitidas antes da revisão receberiam as condições erradas.' },
        { option: 'Pôr a data da apólice no prompt e pedir ao modelo para escolher a versão', why: 'As duas versões estariam no contexto; o modelo escolheria bem quase sempre, e o «quase» é um problema regulatório.' },
      ],
      costNote:
        'A conversão dos PDFs e a revisão humana das tabelas custam dias de trabalho, uma vez; os embeddings de todo o corpus custam cêntimos numa API. O custo recorrente é a revisão anual, que o hash por cláusula reduz às cláusulas alteradas.',
      takeaways: [
        'A estrutura do documento é o melhor chunker que existe; usa-a quando existe.',
        'Versões verdadeiras em simultâneo resolvem-se com metadados de validade e filtros, não com «a mais recente».',
        'O custo real da ingestão está na extracção e na revisão, não nos embeddings.',
      ],
      refs: [
        { label: 'Anthropic — Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval' },
        { label: 'PostgreSQL — pesquisa de texto', url: 'https://www.postgresql.org/docs/current/textsearch.html' },
      ],
    },
  ],
};
