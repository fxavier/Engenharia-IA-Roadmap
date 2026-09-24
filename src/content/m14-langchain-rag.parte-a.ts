import type { Section } from '../types';

/* Secções 1 a 3 do módulo 14: documentos e loaders, splitters, embeddings e lojas vectoriais. */

export const seccoesA: Section[] = [
  /* ================================================================= 1 */
  {
    id: 'documentos',
    title: '`Document`, loaders e metadados como contrato',
    blocks: [
      {
        type: 'p',
        text:
          'Os módulos 7 a 12 construíram o RAG peça a peça, com o runtime didáctico. Este módulo monta as mesmas peças com as abstracções do LangChain, e a pergunta que o acompanha do princípio ao fim é: **em cada peça, o que é que a biblioteca te dá, e o que é que continua a ser responsabilidade tua?** A resposta curta: a biblioteca dá interfaces e integrações; a qualidade da recuperação, os filtros, a idempotência e as citações continuam a ser trabalho teu.',
      },
      {
        type: 'p',
        text:
          'A unidade de dados é o `Document` de `langchain_core.documents`: `page_content` (o texto), `metadata` (um `dict`) e `id` (opcional, mas não o trates como opcional). Tudo o que o resto do pipeline decide sobre um chunk (se é público, se está em vigor, de que política veio, que modelo gerou o vector) só pode vir de `metadata`. Um metadado que falta na ingestão não se recupera na pesquisa.',
      },
      {
        type: 'table',
        head: ['Metadado', 'Origem', 'Quem o usa', 'O que parte se faltar'],
        rows: [
          ['`documento_id`', 'cabeçalho do Markdown ou id do CMS', 'citações `[pol-reembolso]`, guarda de saída', 'o modelo não tem o que citar; a guarda recusa tudo'],
          ['`publico`', 'cabeçalho (`cliente` ou `interno`)', 'filtro na pesquisa (adr-0010)', 'um procedimento interno de fraude chega ao cliente'],
          ['`vigente`', 'cabeçalho; muda quando a política é substituída', 'filtro na pesquisa', 'a política de 2025 (72 horas) é citada como actual'],
          ['`actualizado`', 'data de revisão', 'desempate, auditoria', 'não se sabe que versão estava em vigor quando o cliente perguntou'],
          ['`chunk_id` = `doc#ordem`', 'calculado na partição', 'idempotência da ingestão, traços, avaliação', 'reingerir duplica chunks'],
          ['`modelo_embedding`', 'configuração', 'pesquisa só compara vectores do mesmo modelo (adr-0007)', 'trocar de modelo mistura espaços vectoriais incomparáveis'],
        ],
        caption: 'Os metadados de cada chunk do «Balcão». Não são decoração: cada linha corresponde a uma falha observada ou a um requisito.',
      },
      {
        type: 'p',
        text:
          'Os *loaders* são a peça que transforma uma fonte em `Document`s. A interface está em `langchain_core.document_loaders.BaseLoader`: implementas `lazy_load()` (um gerador) e ganhas `load()`. As centenas de loaders prontos (PDF, HTML, Notion, S3) vivem em `langchain-community` e em pacotes de parceiros. Para o «Balcão», as fontes são Markdown com cabeçalho e uma exportação JSON do CMS: um loader próprio de 30 linhas, que **recusa** um documento sem `id` ou sem `publico`, vale mais do que um loader genérico que aceita tudo em silêncio.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Um loader próprio sobre a interface do `langchain-core`: o cabeçalho é obrigatório, e um documento sem dono nem público não entra no índice (RI-02).',
        code: `from collections.abc import Iterator
from pathlib import Path

from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document

class LoaderPoliticas(BaseLoader):
    """Markdown com cabeçalho \`---\\nid: ...\\npublico: cliente\\n---\`."""

    def __init__(self, pasta: Path) -> None:
        self.pasta = pasta

    def lazy_load(self) -> Iterator[Document]:
        for caminho in sorted(self.pasta.glob("**/*.md")):
            meta, corpo = _front_matter(caminho.read_text(encoding="utf-8"))
            if "id" not in meta or meta.get("publico") not in ("cliente", "interno"):
                log.warning("ignorado %s: sem id ou publico válido", caminho)
                continue
            yield Document(
                id=meta["id"],
                page_content=corpo.strip(),
                metadata={
                    "documento_id": meta["id"],
                    "titulo": meta.get("titulo", meta["id"]),
                    "publico": meta["publico"],
                    "vigente": meta.get("vigente", "true").lower() == "true",
                    "actualizado": meta.get("actualizado", ""),
                    "fonte": str(caminho),
                },
            )

docs = LoaderPoliticas(Path("documentos/")).load()     # load() vem de lazy_load()`,
      },
      {
        type: 'run',
        run: {
          id: 'run-langchain-rag-01',
          title: 'O corpus e o que cada chunk herda',
          brief:
            'Os 40 documentos da amostra por público e vigência, e os metadados que um chunk recebe do seu documento. Runtime didáctico (`balcao`), sem LangChain: é a mesma estrutura que `ingestao.partir` constrói com `Document`s.',
          code: `# Documentos, metadados e chunks: o que cada chunk herda do documento.
from collections import Counter
import balcao as b

por_tipo = Counter((d["publico"], d["vigente"]) for d in b.DOCUMENTOS)
for (publico, vigente), n in sorted(por_tipo.items()):
    print(f"publico={publico:<8} vigente={str(vigente):<5} {n:>2} documentos")

chunks = b.chunkar_corpus("recursivo")
print(len(b.DOCUMENTOS), "documentos ->", len(chunks), "chunks")
c = next(x for x in chunks if x.doc == "pol-reembolso-prazos")
print(c.id, sorted(c.meta))
print({k: c.meta[k] for k in ("publico", "vigente", "actualizado")})`,
          expected: `publico=cliente  vigente=False  1 documentos
publico=cliente  vigente=True  34 documentos
publico=interno  vigente=True   5 documentos
40 documentos -> 46 chunks
pol-reembolso-prazos#0 ['actualizado', 'categoria', 'publico', 'titulo', 'vigente']
{'publico': 'cliente', 'vigente': True, 'actualizado': '2026-06-01'}`,
        },
      },
      {
        type: 'p',
        text:
          'Seis documentos em 40 (15%) não podem nunca chegar a uma resposta ao cliente: um porque foi substituído, cinco porque são internos. Em produção são 21 procedimentos internos em 214 documentos, e as versões substituídas acumulam-se a cada revisão jurídica. É por isso que os filtros não são uma optimização: são a diferença entre um sistema que cita a política certa e um que cita a mais parecida com a pergunta.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O `id` do `Document` é a chave da idempotência',
        text:
          'Sem `id`, as lojas vectoriais geram um UUID novo a cada `add_documents`: correr a ingestão duas vezes duplica todos os chunks, e a pesquisa passa a devolver o mesmo excerto duas vezes com o mesmo score. O «Balcão» usa `documento_id#ordem` como id do chunk e um hash do documento para saltar o que não mudou (módulo 9).',
      },
      { type: 'file', ref: 'src/balcao/ingestao.py' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — retrieval (visão geral)', url: 'https://docs.langchain.com/oss/python/langchain/retrieval' },
          { label: 'LangChain — document loaders', url: 'https://docs.langchain.com/oss/python/integrations/document_loaders/index' },
          { label: 'Referência — langchain_core', url: 'https://reference.langchain.com/python/langchain_core/' },
        ],
      },
    ],
  },

  /* ================================================================= 2 */
  {
    id: 'splitters',
    title: '`RecursiveCharacterTextSplitter` e a partição com ids estáveis',
    blocks: [
      {
        type: 'p',
        text:
          'O `RecursiveCharacterTextSplitter` de `langchain-text-splitters` implementa o chunking recursivo do módulo 9: tenta partir pelo primeiro separador da lista; se um pedaço continua maior do que `chunk_size`, desce para o separador seguinte. Com `["\\n\\n", "\\n", ". ", " ", ""]`, isso significa parágrafo, linha, frase, palavra e, em último caso, carácter. É a escolha do adr-0008.',
      },
      {
        type: 'table',
        head: ['Parâmetro', 'Valor no «Balcão»', 'Porquê'],
        rows: [
          ['`chunk_size`', '700 (caracteres)', 'Medido em caracteres por omissão (`length_function=len`). 700 caracteres ≈ 190 tokens em português: um parágrafo de política com uma regra completa.'],
          ['`chunk_overlap`', '100', 'Uma frase de contexto partilhada entre chunks vizinhos, para que uma regra partida a meio não perca o sujeito.'],
          ['`separators`', '`["\\n\\n", "\\n", ". ", " ", ""]`', 'A ordem é a hierarquia do documento. `". "` antes de `" "` evita cortar a meio de uma frase.'],
          ['`keep_separator`', '`"end"`', 'O ponto final fica no fim do chunk anterior, não no início do seguinte.'],
          ['`add_start_index`', 'não usado', 'Quando `True`, acrescenta `start_index` (posição no documento) aos metadados. Útil para destacar o excerto no documento original.'],
        ],
        caption: 'Os parâmetros de `criar_divisor` em `ingestao.py`. `chunk_size` em caracteres, não em tokens: para contar tokens, há `from_tiktoken_encoder` ou `from_huggingface_tokenizer`.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'A partição do «Balcão»: `split_text` e não `split_documents`, para controlar o id e os metadados de cada chunk.',
        code: `from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

def criar_divisor(cfg) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_caracteres,            # 700
        chunk_overlap=cfg.chunk_sobreposicao,       # 100
        separators=["\\n\\n", "\\n", ". ", " ", ""],
        keep_separator="end",
        strip_whitespace=True,
    )

def partir(doc, divisor, modelo_embedding: str) -> list[Document]:
    out = []
    for ordem, texto in enumerate(divisor.split_text(doc.texto)):
        meta = {**doc.metadados(), "chunk_id": f"{doc.id}#{ordem}", "ordem": ordem,
                "hash_documento": doc.hash, "modelo_embedding": modelo_embedding}
        out.append(Document(id=f"{doc.id}#{ordem}", page_content=texto, metadata=meta))
    return out`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O erro clássico: `split_documents` e depois `add_documents` sem ids',
        text:
          '`splitter.split_documents(docs)` copia os metadados de cada documento para os seus chunks, mas **não** dá ids aos chunks (ficam com `id=None`). Passados a `vector_store.add_documents(chunks)`, cada chunk recebe um UUID aleatório. A ingestão parece funcionar; a segunda corrida duplica o índice, a terceira triplica-o, e ninguém repara até o re-ranking começar a devolver três cópias do mesmo parágrafo. Dá sempre ids determinísticos (`doc#ordem`) e apaga os chunks antigos do documento na mesma transacção em que inseres os novos.',
      },
      {
        type: 'p',
        text:
          'Repara também no que o splitter **não** faz: não sabe que «Até 24 horas.» sozinho não diz de que política é. O `IndiceMemoria` do laboratório vectoriza `titulo + "\\n" + texto` (um cabeçalho contextual, módulo 12), mas guarda e mostra só o texto. É uma linha de código que o splitter não te dá e que muda o recall de excertos curtos.',
      },
      {
        type: 'diagram',
        diagram: {
          title: 'O pipeline de ingestão do «Balcão» com as peças do LangChain',
          caption: 'Loader, hash, splitter, embeddings e substituição por documento. O hash salta o que não mudou; a substituição numa transacção evita que a pesquisa veja metade de um documento.',
          cols: 6,
          rows: 2,
          zones: [
            { id: 'zl', label: 'langchain-core e text-splitters', col: 0, row: 0, colSpan: 4, rowSpan: 1, tone: 'agente' },
            { id: 'zd', label: 'PostgreSQL', col: 4, row: 0, colSpan: 2, rowSpan: 2, tone: 'data' },
          ],
          nodes: [
            { id: 'md', label: 'Markdown / CMS', sub: 'com cabeçalho', col: 0, row: 1, kind: 'data' },
            { id: 'loader', label: 'LoaderPoliticas', sub: 'BaseLoader.lazy_load', col: 0, row: 0, kind: 'service' },
            { id: 'hash', label: 'hash igual?', sub: 'salta o inalterado', col: 1, row: 0, kind: 'decision' },
            { id: 'split', label: 'RecursiveCharacterTextSplitter', sub: 'split_text, ids doc#ordem', col: 2, row: 0, kind: 'service' },
            { id: 'emb', label: 'Embeddings', sub: 'embed_documents (768)', col: 3, row: 0, kind: 'model' },
            { id: 'docs', label: 'documentos', sub: 'hash, vigente, publico', col: 4, row: 0, kind: 'data' },
            { id: 'chunks', label: 'chunks', sub: 'vector(768), tsvector', col: 5, row: 0, kind: 'vector' },
            { id: 'tx', label: 'substituir_documento', sub: 'DELETE + INSERT numa transacção', col: 4, row: 1, span: 2, kind: 'service' },
          ],
          edges: [
            { from: 'md', to: 'loader' },
            { from: 'loader', to: 'hash', label: 'Document' },
            { from: 'hash', to: 'split', label: 'mudou' },
            { from: 'split', to: 'emb', label: 'chunks' },
            { from: 'emb', to: 'tx', label: 'vectores' },
            { from: 'tx', to: 'docs' },
            { from: 'tx', to: 'chunks' },
          ],
        },
      },
      { type: 'adr', ref: 'adr-0008' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — RecursiveCharacterTextSplitter', url: 'https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter' },
          { label: 'LangChain — text splitters', url: 'https://docs.langchain.com/oss/python/integrations/splitters/index' },
        ],
      },
    ],
  },

  /* ================================================================= 3 */
  {
    id: 'lojas-vectoriais',
    title: 'Embeddings e lojas vectoriais: `OllamaEmbeddings`, `InMemoryVectorStore`, `PGVector`',
    blocks: [
      {
        type: 'p',
        text:
          'A interface `Embeddings` tem dois métodos: `embed_documents(textos)` para indexar e `embed_query(texto)` para pesquisar. A separação existe porque vários modelos são **assimétricos** (módulo 7): o `nomic-embed-text` foi treinado com os prefixos `search_document: ` e `search_query: `, e a documentação do modelo manda usá-los. O `OllamaEmbeddings` não os acrescenta por ti; se o teu modelo os espera, a responsabilidade de os pôr é tua, e é igual na ingestão e na pesquisa.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Embeddings locais no laboratório (768 dimensões, adr-0007), com timeout explícito no cliente httpx do Ollama.',
        code: `from langchain_ollama import OllamaEmbeddings

embeddings = OllamaEmbeddings(
    model="nomic-embed-text",
    base_url="http://localhost:11434",
    client_kwargs={"timeout": 30.0},
)
v = embeddings.embed_query("search_query: Quanto tempo demora o reembolso no M-Pesa?")
len(v)                                   # 768: tem de bater com vector(768) no esquema`,
      },
      {
        type: 'p',
        text:
          'Uma `VectorStore` junta embeddings e armazenamento: `add_documents`, `similarity_search`, `similarity_search_with_score`, `max_marginal_relevance_search`, `delete` e `as_retriever`. O «Balcão» encontra três implementações, e a escolha entre elas é a mesma escolha do módulo 8 com uma camada de API por cima.',
      },
      {
        type: 'table',
        head: ['Loja', 'Filtros', 'Persistência', 'Quando'],
        rows: [
          ['`InMemoryVectorStore` (`langchain-core`)', 'função Python `filter=lambda doc: ...`, aplicada antes do top-k', 'nenhuma (processo)', 'testes, CI, laboratório sem base de dados. Kilobytes a poucos MB.'],
          ['`PGVector` (`langchain-postgres`)', 'dicionário com operadores `$eq`, `$in`, `$gte`, `$and`... sobre JSONB', 'PostgreSQL + pgvector', 'um só índice denso, metadados livres, sem pesquisa lexical.'],
          ['`PGVectorStore` (`langchain-postgres`)', 'colunas de metadados próprias, além de JSONB', 'PostgreSQL + pgvector', 'a API mais recente do pacote; tabela com esquema que tu defines.'],
          ['`IndicePostgres` do «Balcão»', 'colunas indexadas (`vigente`, `publico`) dentro de cada CTE', 'PostgreSQL + pgvector', 'pesquisa híbrida (HNSW + `tsvector` + RRF) numa só consulta SQL (adr-0009).'],
        ],
        caption: 'As lojas que interessam ao «Balcão». O `InMemoryVectorStore` compara por cosseno contra todos os vectores: é kNN exacto, bom para 46 chunks e inútil para milhões.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: '`PGVector` com filtros de metadados. O filtro é traduzido para SQL sobre a coluna JSONB e aplicado na base de dados, não depois do top-k.',
        code: `from langchain_postgres import PGVector

loja = PGVector(
    embeddings=embeddings,
    collection_name="politicas_v1",
    connection="postgresql+psycopg://balcao:segredo@localhost:5432/balcao",
    use_jsonb=True,
)
loja.add_documents(chunks, ids=[c.id for c in chunks])      # ids determinísticos

loja.similarity_search(
    "Quanto tempo demora o reembolso no M-Pesa?",
    k=4,
    filter={"vigente": {"$eq": True}, "publico": {"$in": ["cliente"]}},
)`,
      },
      {
        type: 'p',
        text:
          'Porque é que o «Balcão» não usa o `PGVector` em produção? O comentário em `recuperacao.py` explica: o esquema dele guarda os metadados num JSONB genérico e não tem coluna `tsvector`. A metade lexical da pesquisa híbrida, que é a que acerta em «PD-8842507», «3-D Secure» ou «72 horas» (módulo 11), teria de ser feita fora da base de dados, e os filtros sobre JSONB não usam os índices que o esquema de `sql/001_esquema.sql` tem nas colunas. É o caso típico em que a integração pronta serve para começar e deixa de servir quando a recuperação é o produto.',
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Filtro antes ou depois do top-k',
        text:
          'Um filtro aplicado **depois** de pedir os k vizinhos mais próximos devolve menos de k resultados (ou nenhum) quando os vizinhos são quase todos filtrados. Com HNSW no pgvector 0.8, o `hnsw.iterative_scan` continua a percorrer o índice até ter k linhas que passam o filtro. Numa loja que filtra em Python depois da pesquisa, pedes `fetch_k` maior e cruzas os dedos. Confirma sempre em que lado do top-k a tua loja aplica o filtro.',
      },
      { type: 'adr', ref: 'adr-0010' },
      { type: 'file', ref: 'src/balcao/recuperacao.py' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — PGVector', url: 'https://docs.langchain.com/oss/python/integrations/vectorstores/pgvector' },
          { label: 'LangChain — OllamaEmbeddings', url: 'https://docs.langchain.com/oss/python/integrations/embeddings/ollama' },
          { label: 'Nomic — nomic-embed-text (prefixos de tarefa)', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5' },
          { label: 'pgvector — filtros e iterative index scans', url: 'https://github.com/pgvector/pgvector' },
        ],
      },
    ],
  },
];
