import type { Module } from '../types';
import { seccoesA } from './m14-langchain-rag.parte-a';
import { seccoesB } from './m14-langchain-rag.parte-b';

export const m14: Module = {
  id: 'langchain-rag',
  number: 14,
  part: 'orquestracao',
  title: 'RAG com LangChain',
  subtitle: 'Documentos, splitters, lojas vectoriais e retrievers: o que a biblioteca dá, e o que continua a ser trabalho teu',
  icon: '📚',
  minutes: 90,
  tags: ['RAG', 'retriever', 'PGVector', 'splitters', 'testes'],
  goals: [
    'Representar a base de conhecimento como `Document`s com metadados que funcionam como contrato (público, vigência, id estável, modelo de embeddings).',
    'Partir documentos com `RecursiveCharacterTextSplitter` e ids determinísticos, para que a ingestão seja idempotente.',
    'Escolher entre `InMemoryVectorStore`, `PGVector` e um índice próprio, sabendo onde cada um aplica os filtros.',
    'Configurar retrievers com `search_kwargs` e escrever um `BaseRetriever` próprio para pesquisa híbrida com re-ranking.',
    'Montar a cadeia RAG com histórico, citações validadas e streaming de eventos.',
    'Testar a cadeia sem rede com fakes e simulados, e ligar os testes ao conjunto dourado.',
  ],

  sections: [...seccoesA, ...seccoesB],

  quiz: [
    {
      id: 'q-langchain-rag-01',
      topic: 'ingestao',
      prompt: 'A ingestão faz `chunks = splitter.split_documents(docs)` e `loja.add_documents(chunks)`, e corre todas as noites. O que acontece ao fim de uma semana?',
      options: [
        'Nada: `add_documents` detecta chunks iguais pelo conteúdo.',
        'O índice tem sete cópias de cada chunk: os chunks não têm id e cada `add_documents` gera UUIDs novos.',
        'A ingestão falha à segunda noite com um erro de chave duplicada.',
        'Os chunks antigos são substituídos, porque herdam o id do documento.',
      ],
      answer: [1],
      explain:
        '`split_documents` copia os metadados para os chunks mas deixa `id=None`, e a loja gera um identificador aleatório para cada um. Não há erro, só duplicação silenciosa, que aparece como o mesmo excerto repetido no contexto. Ids determinísticos (`doc#ordem`) e substituição por documento resolvem.',
    },
    {
      id: 'q-langchain-rag-02',
      topic: 'filtros',
      prompt: 'Porque é que o filtro `{"vigente": True}` tem de ser aplicado dentro da pesquisa e não pedido no prompt de sistema? (duas respostas)',
      options: [
        'Porque o chunk substituído nunca chega ao contexto, e o que não está no contexto não pode ser citado.',
        'Porque, com o filtro dentro, o top-k é preenchido com documentos válidos em vez de perder lugares para os que seriam descartados.',
        'Porque o modelo não consegue ler metadados.',
        'Porque o filtro dentro da pesquisa é sempre mais rápido.',
      ],
      answer: [0, 1],
      explain:
        'Uma instrução depende de o modelo obedecer; um filtro não depende de nada. E filtrar antes do corte em k garante k resultados válidos, enquanto filtrar depois pode deixar o contexto com dois excertos em vez de quatro. A velocidade depende do índice e da selectividade.',
    },
    {
      id: 'q-langchain-rag-03',
      topic: 'retrievers',
      prompt: 'Chamas `InMemoryVectorStore(...).as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": 0.3})` e invocas. O que acontece em `langchain-core` 1.6?',
      options: [
        'Devolve só os documentos com cosseno acima de 0,3.',
        'Levanta `NotImplementedError`: a loja em memória não define a função que converte distância em relevância.',
        'Ignora o limiar e devolve os 4 mais próximos.',
        'Devolve uma lista vazia sempre.',
      ],
      answer: [1],
      explain:
        '`similarity_score_threshold` passa por `similarity_search_with_relevance_scores`, que pede à loja a função de relevância. A loja em memória não a implementa. É um bom exemplo de porque o «Balcão» aplica o limiar na cadeia, com o score do re-ranking, em vez de o delegar na loja.',
    },
    {
      id: 'q-langchain-rag-04',
      topic: 'embeddings',
      prompt: 'Trocas `nomic-embed-text` por outro modelo de embeddings de 768 dimensões e não reindexas. O que acontece?',
      options: [
        'Funciona, porque as dimensões são iguais.',
        'A pesquisa compara vectores de espaços diferentes: os resultados degradam sem nenhum erro, a menos que a pesquisa filtre por `modelo_embedding`.',
        'O PostgreSQL recusa a consulta por incompatibilidade de tipo.',
        'O retriever converte automaticamente os vectores antigos.',
      ],
      answer: [1],
      explain:
        'Dimensões iguais não tornam os espaços comparáveis. O «Balcão» guarda o modelo em cada linha e filtra por ele; com o modelo novo a pesquisa fica vazia até se reingerir, o que é uma falha visível em vez de uma degradação silenciosa (adr-0007).',
    },
    {
      id: 'q-langchain-rag-05',
      topic: 'cadeia',
      prompt: 'No segundo turno, o cliente escreve «E no cartão?». Sem reformulação, o que é mais provável?',
      options: [
        'A pesquisa recupera excertos sobre cartões em geral (autenticação, bandeiras aceites) e não o prazo de reembolso.',
        'O modelo responde bem, porque vê o histórico.',
        'A cadeia recusa, porque a pergunta é curta.',
        'A pesquisa devolve os mesmos documentos do turno anterior.',
      ],
      answer: [0],
      explain:
        'O modelo vê o histórico, mas o retriever só vê a consulta. Se a consulta for «E no cartão?», os excertos vêm de `pol-pagamento-cartao`, e o modelo só pode responder com o que recebeu. A reformulação (heurística ou modelo pequeno) é o que liga o retriever à conversa.',
    },
    {
      id: 'q-langchain-rag-06',
      topic: 'lojas',
      prompt: 'Que duas razões levaram o «Balcão» a não usar o `PGVector` em produção?',
      options: [
        'Não tem coluna `tsvector`: a metade lexical da pesquisa híbrida ficaria fora da base de dados.',
        'Os filtros são sobre um JSONB genérico, sem os índices por coluna do esquema próprio.',
        'Não suporta HNSW.',
        'Não funciona com `psycopg` 3.',
      ],
      answer: [0, 1],
      explain:
        'O `PGVector` é uma boa forma de começar: filtros por operadores sobre JSONB, pesquisa densa. Quando a pesquisa híbrida numa só consulta SQL e os filtros por colunas indexadas passam a ser o produto (adr-0009, adr-0010), um índice próprio atrás de um `BaseRetriever` dá o controlo sem perder a integração com o LCEL.',
    },
    {
      id: 'q-langchain-rag-07',
      topic: 'testes',
      prompt: 'Que tipo de erro um teste com `GenericFakeChatModel` **não** consegue apanhar?',
      options: [
        'Uma chave em falta no `dict` de saída da cadeia.',
        'A guarda de saída a deixar passar uma citação de documento interno.',
        'O modelo real responder com uma regra que não está no contexto.',
        'O `ChatPromptTemplate` a pedir uma variável que ninguém passa.',
      ],
      answer: [2],
      explain:
        'O fake devolve o que lhe mandas devolver: testa a canalização e as guardas de forma exacta, mas não diz nada sobre o que um modelo real faz com aquele contexto. Isso é trabalho das avaliações com modelo real e juiz (faithfulness, módulos 21 e 22).',
    },
    {
      id: 'q-langchain-rag-08',
      topic: 'avaliacao',
      prompt: 'No conjunto de 30 perguntas, a cadeia com re-ranking tem 25 hits com e sem filtros de metadados. O que isto diz? (duas respostas)',
      options: [
        'Que a métrica de hit não mede a coisa que os filtros protegem: citar um documento interno ou substituído.',
        'Que é preciso uma asserção específica «nenhuma citação de documento não vigente ou interno» no gate de CI.',
        'Que os filtros podem ser retirados sem risco.',
        'Que o re-ranking torna os filtros redundantes.',
      ],
      answer: [0, 1],
      explain:
        'Uma resposta que cita um documento relevante e também um interno conta como hit. A métrica certa para este risco é uma asserção sobre as citações, com tolerância zero, ao lado do hit rate.',
    },
  ],

  exercises: [
    {
      id: 'e-langchain-rag-01',
      title: 'Quantos chunks depois de três ingestões?',
      kind: 'input',
      statement:
        'O corpus de amostra dá 46 chunks. A ingestão é corrida três vezes seguidas com `loja.add_documents(splitter.split_documents(docs))`, sem ids, sobre um `InMemoryVectorStore`. Quantos vectores tem a loja no fim? Escreve só o número.',
      accept: ['138'],
      hint: 'Cada `add_documents` sem ids gera identificadores novos.',
      solution:
        '138 = 46 × 3. Com ids `doc#ordem`, a loja substituiria os vectores com o mesmo id e ficaria com 46; com o hash do documento, as corridas seguintes nem chamariam o modelo de embeddings.',
      difficulty: 1,
    },
    {
      id: 'e-langchain-rag-02',
      title: 'Onde vive o limiar de relevância?',
      kind: 'open',
      statement:
        'Um colega propõe trocar o `RunnableBranch` da recusa por `as_retriever(search_type="similarity_score_threshold")` no `PGVector`, «para simplificar». Compara as duas soluções e decide.',
      hint: 'Que score é comparado em cada caso, e o que acontece à pesquisa lexical?',
      solution:
        'O limiar do «Balcão» (0,1) é calibrado sobre o score do re-ranking, que combina termos, números e cosseno depois da fusão híbrida; o limiar da loja seria sobre a relevância derivada do cosseno denso, antes da fusão e do re-ranking, e deixaria de fora o lado lexical. Pior: um retriever que devolve zero documentos e uma cadeia que continua a chamar o modelo com contexto vazio trocam uma recusa determinista por uma que depende de o modelo obedecer. Fica o `RunnableBranch`, e o limiar continua a ser recalibrado no conjunto dourado quando o re-ranker muda.',
      difficulty: 2,
    },
    {
      id: 'e-langchain-rag-03',
      title: 'Um `BaseRetriever` com deduplicação por documento',
      kind: 'code',
      statement:
        'Escreve um retriever que envolve outro (`base: BaseRetriever`) e devolve no máximo um chunk por documento, mantendo a ordem, até `k`. Tem de funcionar dentro de uma cadeia LCEL e propagar callbacks.',
      hint: 'Herda de `BaseRetriever`, e chama `self.base.invoke(query, config={"callbacks": run_manager.get_child()})`.',
      solution:
        '```python\nclass UmPorDocumento(BaseRetriever):\n    base: BaseRetriever\n    k: int = 4\n\n    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:\n        docs = self.base.invoke(query, config={"callbacks": run_manager.get_child()})\n        vistos, out = set(), []\n        for d in docs:\n            doc_id = d.metadata["documento_id"]\n            if doc_id not in vistos:\n                vistos.add(doc_id)\n                out.append(d)\n        return out[: self.k]\n```\n\nPara que sobrem k documentos distintos, o `base` tem de devolver mais do que k (no «Balcão», os 20 candidatos antes do corte).',
      difficulty: 2,
    },
    {
      id: 'e-langchain-rag-04',
      title: 'Migrar do índice em memória para o PostgreSQL sem parar',
      kind: 'design',
      statement:
        'O laboratório corre com `IndiceMemoria`; a produção vai usar `IndicePostgres`. Desenha a migração: como provas que os dois índices devolvem resultados equivalentes, o que muda na ingestão, e que testes ficam em CI.',
      hint: 'Os dois implementam o mesmo protocolo `Indice`. O que pode ser diferente entre eles?',
      solution:
        'Os dois índices implementam `Indice` (`hash_documento`, `substituir_documento`, `pesquisar`, `contar_chunks`), por isso o `RecuperadorHibrido` e a cadeia não mudam. Diferenças esperadas: o lexical (BM25 didáctico contra `ts_rank_cd` com dicionário `portuguese`) e a pesquisa densa (exacta contra HNSW aproximado). Prova: correr as 240 perguntas douradas contra os dois e comparar recall@4 e MRR com intervalo de confiança; tolerância pequena, e zero documentos não vigentes ou internos em ambos. Ingestão: a mesma função `ingerir`, idempotente por hash; o PostgreSQL substitui o documento numa transacção. CI: os testes com `IndiceMemoria` em cada PR, os marcados `postgres` com o serviço do CI, e o teste que confirma que a SQL da pesquisa híbrida está no esquema.',
      difficulty: 3,
    },
  ],

  labs: [
    {
      id: 'lab-langchain-rag-01',
      moduleId: 'langchain-rag',
      title: 'Loader próprio e partição com ids estáveis',
      brief:
        'Completa o loader de políticas em Markdown (recusa documentos sem `publico`) e a partição, de forma a que correr a ingestão duas vezes não duplique nada: ids `documento_id#ordem` e metadados herdados.',
      lang: 'python',
      starter: `from collections.abc import Iterator

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def carregar(pasta) -> list[Document]:
    docs = []
    for caminho in sorted(pasta.glob("*.md")):
        meta, corpo = front_matter(caminho.read_text(encoding="utf-8"))
        docs.append(Document(page_content=corpo, metadata=meta))
    return docs


def ingerir(pasta, loja) -> None:
    splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
    chunks = splitter.split_documents(carregar(pasta))
    loja.add_documents(chunks)`,
      checks: [
        { id: 'c1', label: 'Loader sobre `BaseLoader`', re: 'class \\w+\\(BaseLoader\\)', why: 'A interface do `langchain-core`: implementas `lazy_load` e ganhas `load`.' },
        { id: 'c2', label: '`lazy_load` é um gerador', re: 'def lazy_load\\(self\\)[\\s\\S]*?yield Document\\(', why: 'Documentos um a um, sem carregar a pasta toda em memória.' },
        { id: 'c3', label: 'Recusa documentos sem público válido', re: 'publico["\']?\\)?\\s*not in\\s*\\(\\s*["\']cliente["\']\\s*,\\s*["\']interno["\']\\s*\\)', why: 'Sem público, o filtro da pesquisa não sabe se o documento pode chegar ao cliente (RI-02).' },
        { id: 'c4', label: 'Ids determinísticos por chunk', re: 'id\\s*=\\s*f["\']\\{[^}]+\\}#\\{ordem\\}', why: '`doc#ordem` torna a ingestão idempotente.' },
        { id: 'c5', label: 'Passa os ids à loja', re: 'add_documents\\([^)]*ids\\s*=', why: 'Sem ids, cada corrida gera UUIDs novos e duplica o índice.' },
      ],
      hints: [
        '`split_text(doc.page_content)` com `enumerate` dá-te a `ordem` de cada pedaço.',
        'Constrói cada chunk com `Document(id=f"{doc.id}#{ordem}", page_content=texto, metadata={**doc.metadata, "ordem": ordem})`.',
      ],
      solution: `from collections.abc import Iterator

from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class LoaderPoliticas(BaseLoader):
    def __init__(self, pasta) -> None:
        self.pasta = pasta

    def lazy_load(self) -> Iterator[Document]:
        for caminho in sorted(self.pasta.glob("*.md")):
            meta, corpo = front_matter(caminho.read_text(encoding="utf-8"))
            if "id" not in meta or meta.get("publico") not in ("cliente", "interno"):
                continue
            yield Document(id=meta["id"], page_content=corpo.strip(),
                           metadata={**meta, "documento_id": meta["id"]})


def partir(doc: Document, splitter: RecursiveCharacterTextSplitter) -> list[Document]:
    return [
        Document(id=f"{doc.id}#{ordem}", page_content=texto,
                 metadata={**doc.metadata, "ordem": ordem})
        for ordem, texto in enumerate(splitter.split_text(doc.page_content))
    ]


def ingerir(pasta, loja) -> None:
    splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100,
                                              separators=["\\n\\n", "\\n", ". ", " ", ""])
    for doc in LoaderPoliticas(pasta).lazy_load():
        chunks = partir(doc, splitter)
        loja.add_documents(chunks, ids=[c.id for c in chunks])`,
      difficulty: 2,
    },
    {
      id: 'lab-langchain-rag-02',
      moduleId: 'langchain-rag',
      title: 'Testes de contrato da cadeia com fakes',
      brief:
        'Escreve dois testes pytest para a cadeia `criar_cadeia(modelo, recuperador)`: (1) com um modelo falso que cita um documento que não estava no contexto, a cadeia recusa; (2) a loja de teste usa embeddings falsos de 768 dimensões e ids estáveis. Nada de rede.',
      lang: 'python',
      starter: `from langchain_ollama import ChatOllama, OllamaEmbeddings


def test_cadeia_responde():
    modelo = ChatOllama(model="llama3.2:3b")
    emb = OllamaEmbeddings(model="nomic-embed-text")
    cadeia = criar_cadeia(modelo, criar_recuperador(emb))
    r = cadeia.invoke({"pergunta": "Durante quanto tempo posso usar um cupão?"})
    print(r)`,
      checks: [
        { id: 'c1', label: 'Modelo falso com mensagens escolhidas', re: 'GenericFakeChatModel\\(\\s*messages\\s*=\\s*iter\\(', why: 'Um fake devolve exactamente o que o teste precisa, sem rede e sem variância.' },
        { id: 'c2', label: 'Embeddings falsos de 768 dimensões', re: 'DeterministicFakeEmbedding\\(\\s*size\\s*=\\s*768\\s*\\)', why: 'A dimensão do esquema do «Balcão»; determinista por hash.' },
        { id: 'c3', label: 'Loja em memória', re: 'InMemoryVectorStore\\(', why: 'Sem PostgreSQL no teste de contrato.' },
        { id: 'c4', label: 'Asserção sobre a recusa', re: 'assert\\s+r\\[["\']recusa["\']\\]', why: 'Um teste sem asserção é um print com passos extra.' },
        { id: 'c5', label: 'Sem Ollama no teste', re: 'Ollama', forbid: true, why: 'Os testes de CI correm sem rede (RE-03); o Ollama fica para o laboratório e as evals.' },
      ],
      hints: [
        '`from langchain_core.language_models import GenericFakeChatModel` e `from langchain_core.embeddings import DeterministicFakeEmbedding`.',
        'Para o teste da recusa, o fake devolve `AIMessage("... [int-fraude-sinais]")` e a loja só tem documentos públicos.',
      ],
      solution: `from langchain_core.documents import Document
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from langchain_core.vectorstores import InMemoryVectorStore

CHUNKS = [
    Document(id="pol-cupoes#0", page_content="Os cupões são válidos durante 30 dias.",
             metadata={"documento_id": "pol-cupoes", "publico": "cliente", "vigente": True, "score": 1.0}),
]


def loja_de_teste() -> InMemoryVectorStore:
    loja = InMemoryVectorStore(DeterministicFakeEmbedding(size=768))
    loja.add_documents(CHUNKS, ids=[c.id for c in CHUNKS])
    return loja


def test_ids_estaveis():
    loja = loja_de_teste()
    loja.add_documents(CHUNKS, ids=[c.id for c in CHUNKS])     # segunda ingestão
    assert len(loja.store) == 1


def test_citacao_fora_do_contexto_e_recusada():
    falso = GenericFakeChatModel(messages=iter([
        AIMessage("Bloqueamos contas com 3 reembolsos em 30 dias. [int-fraude-sinais]"),
    ]))
    cadeia = criar_cadeia(falso, loja_de_teste().as_retriever(search_kwargs={"k": 1}))
    r = cadeia.invoke({"pergunta": "Durante quanto tempo posso usar um cupão?"})
    assert r["recusa"] is True
    assert "int-fraude-sinais" not in r["citacoes"]`,
      difficulty: 2,
    },
    {
      id: 'lab-langchain-rag-03',
      moduleId: 'langchain-rag',
      title: 'Um retriever híbrido em Python puro: filtrar antes, deduplicar depois',
      brief:
        'Corre no browser. Completa `pesquisar(consulta, k, filtro)`: denso com o filtro dentro da pesquisa, BM25 filtrado antes do corte em 20, fusão com `b.rrf`, e no máximo um chunk por documento.',
      lang: 'python',
      executavel: true,
      starter: `import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
DENSO = b.IndiceExacto(CHUNKS)
LEXICO = b.BM25(CHUNKS)


def aceita(c, filtro):
    return all(c.meta.get(k) == v for k, v in filtro.items())


def pesquisar(consulta, k, filtro):
    densos = DENSO.procurar(consulta, k)
    lexicos = LEXICO.procurar(consulta, k)
    # TODO: filtrar antes do corte, fundir com RRF, um chunk por documento
    return [(c.doc, round(s, 4)) for c, s in densos + lexicos if aceita(c, filtro)][:k]


print(pesquisar("Quanto tempo demora o reembolso no M-Pesa?", 3, {"vigente": True, "publico": "cliente"}))`,
      checks: [
        { id: 'c1', label: 'Filtro dentro da pesquisa densa', re: 'DENSO\\.procurar\\(\\s*consulta\\s*,\\s*20\\s*,\\s*filtro\\s*\\)', why: 'O índice denso aceita o filtro: aplica-o antes do top-k.' },
        { id: 'c2', label: 'BM25 filtrado antes do corte', re: 'if aceita\\(c,\\s*filtro\\)\\s*\\]\\s*\\[\\s*:\\s*20\\s*\\]', why: 'Filtrar depois de cortar em k perde lugares para documentos que seriam descartados.' },
        { id: 'c3', label: 'Fusão com RRF', re: 'b\\.rrf\\(', why: 'Os scores do denso e do BM25 não são comparáveis; o RRF usa só as posições.' },
        { id: 'c4', label: 'Um chunk por documento', re: 'c\\.doc\\s+in\\s+vistos', why: 'Dois chunks do mesmo documento gastam contexto sem acrescentar fontes.' },
      ],
      hints: [
        '`lexicos = [(c, s) for c, s in LEXICO.procurar(consulta, 50) if aceita(c, filtro)][:20]`.',
        'Percorre o resultado de `b.rrf(densos, lexicos)` com um `set` de documentos já vistos e pára quando tiveres k.',
      ],
      solution: `import balcao as b

CHUNKS = b.chunkar_corpus("recursivo")
DENSO = b.IndiceExacto(CHUNKS)
LEXICO = b.BM25(CHUNKS)


def aceita(c, filtro):
    return all(c.meta.get(k) == v for k, v in filtro.items())


def pesquisar(consulta, k, filtro):
    densos = DENSO.procurar(consulta, 20, filtro)
    lexicos = [(c, s) for c, s in LEXICO.procurar(consulta, 50) if aceita(c, filtro)][:20]
    fundido = b.rrf(densos, lexicos)
    vistos, out = set(), []
    for c, s in fundido:
        if c.doc in vistos:
            continue
        vistos.add(c.doc)
        out.append((c.doc, round(s, 4)))
        if len(out) == k:
            break
    return out


print(pesquisar("Quanto tempo demora o reembolso no M-Pesa?", 3, {"vigente": True, "publico": "cliente"}))`,
      difficulty: 2,
    },
  ],

  useCases: [
    {
      id: 'uc-langchain-rag-01',
      title: 'Condições gerais de apólices numa seguradora: RAG filtrado pelo contrato do cliente',
      area: 'RAG com metadados de negócio',
      level: 3,
      scenario:
        'Uma seguradora em Portugal quer um assistente que responda a clientes sobre as condições da **sua** apólice: coberturas, franquias, exclusões. Há 9 produtos, cada um com 3 a 6 versões de condições gerais em vigor para contratos diferentes, ≈ 1 100 documentos. Um cliente com um seguro automóvel subscrito em 2023 tem de receber as condições da versão de 2023, mesmo que exista uma de 2026 mais parecida com a pergunta.',
      requirements: [
        'Nenhum excerto de outro produto ou de outra versão no contexto da resposta.',
        'Citação da cláusula (documento e secção) em cada resposta factual.',
        'Recusa quando a apólice do cliente não cobre o tema, em vez de responder com a de outro produto.',
        'Actualizar condições sem reindexar tudo.',
      ],
      constraints: ['Dados de clientes no PostgreSQL já existente; nada de base vectorial nova.', 'Auditoria: saber que excertos foram usados em cada resposta durante 5 anos.'],
      approach: [
        { title: 'Metadados como chave de negócio', text: 'Cada chunk tem `produto`, `versao_condicoes` e `clausula`; o loader recusa documentos sem eles. Os ids são `produto:versao:clausula#ordem`.' },
        { title: 'Filtro vindo do contrato, não do modelo', text: 'Um `BaseRetriever` próprio lê o produto e a versão da apólice do cliente autenticado (config da execução) e aplica-os como filtro dentro da pesquisa. O modelo nunca escolhe a versão.' },
        { title: 'Loja com colunas', text: '`PGVectorStore` com `produto` e `versao_condicoes` como colunas de metadados indexadas, em vez de filtros sobre JSONB.' },
        { title: 'Cadeia com recusa e auditoria', text: 'LCEL com `RunnableBranch` para a recusa, guarda de citações, e os ids recuperados gravados com a resposta.' },
      ],
      diagram: {
        title: 'O filtro vem da apólice, antes do top-k',
        caption: 'O cliente autenticado determina produto e versão; o retriever aplica-os na base de dados; o modelo só vê excertos do contrato certo.',
        cols: 5,
        rows: 2,
        zones: [
          { id: 'zr', label: 'recuperação', col: 1, row: 0, colSpan: 2, rowSpan: 2, tone: 'rag' },
        ],
        nodes: [
          { id: 'cli', label: 'cliente autenticado', sub: 'apólice AUT-2023', col: 0, row: 0, kind: 'user' },
          { id: 'apol', label: 'apólices', sub: 'produto, versão', col: 0, row: 1, kind: 'data' },
          { id: 'ret', label: 'RetrieverApolice', sub: 'BaseRetriever', col: 1, row: 0, kind: 'service' },
          { id: 'pg', label: 'PGVectorStore', sub: 'filtro produto + versão', col: 2, row: 1, kind: 'vector' },
          { id: 'cad', label: 'cadeia LCEL', sub: 'recusa + citações', col: 3, row: 0, kind: 'agent' },
          { id: 'llm', label: 'modelo médio', col: 4, row: 0, kind: 'model' },
          { id: 'aud', label: 'auditoria', sub: 'ids por resposta', col: 4, row: 1, kind: 'data' },
        ],
        edges: [
          { from: 'cli', to: 'ret', label: 'pergunta' },
          { from: 'apol', to: 'ret', label: 'produto, versão' },
          { from: 'ret', to: 'pg', label: 'filtro dentro' },
          { from: 'ret', to: 'cad', label: 'documentos' },
          { from: 'cad', to: 'llm' },
          { from: 'cad', to: 'aud', style: 'dashed' },
        ],
      },
      solution:
        'O que torna este RAG correcto não é o modelo nem o embedding: é o filtro por produto e versão, derivado do contrato do cliente autenticado e aplicado dentro da pesquisa. O LangChain dá a interface (`BaseRetriever`, LCEL, `PGVectorStore`); a regra de negócio vive num retriever de 40 linhas testado sem modelo.',
      tools: [
        { name: '`BaseRetriever` próprio', role: 'Traduz a apólice do cliente em filtro de pesquisa.' },
        { name: '`PGVectorStore`', role: 'Colunas de metadados indexadas no PostgreSQL existente.' },
        { name: '`RunnableBranch`', role: 'Recusa quando não há excerto da apólice acima do limiar.' },
        { name: 'Guarda de citações', role: 'Só cláusulas do contrato recuperado podem ser citadas.' },
      ],
      rejected: [
        { option: 'Pedir ao modelo para «usar só a versão de 2023»', why: 'Depende de obediência e falha precisamente quando a versão errada é mais parecida com a pergunta.' },
        { option: 'Um índice por produto e versão', why: 'Mais de 40 índices para gerir e reindexar; o filtro por coluna faz o mesmo numa tabela.' },
        { option: 'Agente que decide que documentos consultar', why: 'A decisão é determinística (está no contrato); um agente acrescenta custo e variância sem acrescentar informação.' },
      ],
      costNote:
        'O custo dominante é o do modelo que responde (≈ 3 000 tokens de entrada por pergunta). A indexação de 1 100 documentos, ≈ 10 000 chunks, custa cêntimos em embeddings; o que custa é a revisão jurídica das condições, que já existia.',
      takeaways: [
        'Metadados de negócio são o que torna um RAG correcto; o retriever próprio é onde eles viram filtro.',
        'O que se sabe pelo contexto de execução (quem é o cliente, que contrato tem) nunca deve ser decidido pelo modelo.',
        'Uma integração pronta serve para começar; quando a recuperação é o produto, escreve o retriever.',
      ],
      refs: [
        { label: 'LangChain — PGVectorStore', url: 'https://docs.langchain.com/oss/python/integrations/vectorstores/pgvectorstore' },
        { label: 'LangChain — retrieval', url: 'https://docs.langchain.com/oss/python/langchain/retrieval' },
      ],
    },
  ],
};
