# Contrato de conteúdo — Engenharia de IA (projecto «Balcão»)

Fonte única de verdade para quem escreve módulos. **Lê `src/types.ts` antes de escrever seja o que
for.** Não inventes campos, não inventes ids de widget, não inventes tipos de bloco.

Antes de escrever um módulo, lê também:

- `src/data/parts.ts` — o projecto «Balcão»: números, equipa, versões de referência.
- `src/data/design.ts` — requisitos, capacidade, fontes, intenções, conversas de referência,
  política de autonomia, modelos, métricas, orçamento de latência e riscos. **Todos os números que
  usares têm de sair daqui ou do módulo `balcao` (Python).**
- `src/data/ids.ts` — os ids válidos para os blocos `adr` (com os títulos), `tool`, `endpoint`,
  `file` e para os documentos dos blocos `retrieval`.
- `laboratorio/src/balcao/didactico.py` e `laboratorio/src/balcao/corpus.py` — o runtime Python que
  os blocos `run` têm disponível, e o corpus de 40 documentos, as 30 perguntas douradas e os pedidos
  simulados.

## Regras de ouro

1. **Português europeu**, tom técnico e directo, para um engenheiro de software sénior (backend,
   Java/Spring, Go, Python) que sabe desenhar sistemas mas ainda não pôs um sistema LLM em produção.
   Termos técnicos ficam **em inglês** quando é assim que se dizem: `prompt`, `token`, `embedding`,
   `chunk`, `retriever`, `re-ranking`, `tool calling`, `structured output`, `prompt injection`,
   `guardrail`, `eval`, `golden set`, `faithfulness`, `checkpoint`, `interrupt`, `reducer`,
   `streaming`, `backoff`, `rate limit`, `canary`, `trunk-based`, `pull request`. **Na prosa do
   tutorial não uses "você"**; usa a 2.ª pessoa («escolhes», «repara», «vais precisar»). As falas
   do assistente para o cliente (em `prompt`, `eval` e `retrieval`) tratam o cliente por você, como
   manda a política de tom do «Chega».
2. **Rigor acima de tudo.** Cada afirmação sobre uma biblioteca, um protocolo ou um algoritmo tem de
   ser verificável na documentação oficial ou no artigo original. Nada de «é muito mais rápido»:
   diz quanto, medido como, sobre que dados. Números que mudam de versão para versão escrevem-se
   como ordem de grandeza e com a versão em que valem. **Preços e nomes de modelos comerciais mudam:**
   usa os escalões `pequeno`/`medio`/`grande`/`local` de `design.ts`, e remete para a página oficial
   de preços quando falares de um fornecedor.
3. **Nada de misticismo.** Um LLM não «pensa», não «percebe» e não «sabe»: gera tokens condicionados
   no contexto. Um retriever não «entende» a pergunta: compara vectores ou termos. Sempre que a
   tentação de antropomorfizar aparecer, troca-a por uma frase sobre o que é calculado e medido.
4. **Código que corre.** Python 3.13 válido, com a API real das versões da tabela (LangChain 1.x,
   LangGraph 1.x, FastAPI, Pydantic 2). Nada de parâmetros inventados. Na dúvida sobre um nome de
   API, prefere a forma estável e documentada (`init_chat_model`, `ChatPromptTemplate`,
   `RunnablePassthrough`, `StateGraph`, `add_messages`, `interrupt`, `Command`, `InMemorySaver`,
   `PostgresSaver`, `create_agent`, `@tool`, `with_structured_output`).
5. **Sem emojis no corpo do texto.** O campo `Module.icon` é a única excepção.
6. Explica sempre o **porquê** e os **trade-offs**: o que a técnica custa (tokens, latência,
   complexidade operacional, risco) e quando *não* vale a pena usá-la.
7. **Tudo se liga ao «Balcão».** Os exemplos usam o corpus, as intenções, as conversas, as
   ferramentas e os números do projecto. Nada de `foo`/`bar`, nada de «chatbot de receitas», nada de
   «pergunta ao PDF da Wikipédia». O domínio é sempre o suporte ao cliente do «Chega».
8. **Liga-te às decisões.** Sempre que o texto tocar num tema com ADR, referencia-o com o bloco
   `adr`. O tutorial ensina *como se decide*, não só o que ficou decidido.
9. **Um erro clássico por módulo, no mínimo** (`callout` de tom `trap`): o erro que um engenheiro
   sénior comete na primeira vez que faz isto.
10. **Exemplos do mundo real.** Cada módulo tem pelo menos um `useCase` realista (pode ser noutra
    empresa do mesmo mundo: uma farmácia online, um banco móvel, uma seguradora, um operador de
    telecomunicações em Moçambique ou Portugal), com requisitos, abordagem, opções rejeitadas e
    custo.

## Versões de referência (Setembro de 2026)

Não inventes números fora desta tabela. Se precisares de citar outra, escreve a linha maior.

| Peça | Versão | Nota |
|------|--------|------|
| Python | 3.13 | Laboratório; os blocos `run` também correm em Pyodide (Python 3.14). |
| uv | 0.9.x | Ambiente, `uv.lock`, `uv sync --frozen` na imagem. |
| FastAPI | 0.12x | Pydantic 2.x, `lifespan`, `StreamingResponse`. |
| LangChain | 1.x | `langchain-core`, `langchain`, `langchain-ollama`, `langchain-anthropic`, `langchain-openai`, `langchain-postgres`, `langchain-text-splitters`. `create_agent` em `langchain.agents`. |
| LangGraph | 1.x | `StateGraph`, `START`, `END`, `add_messages`, `interrupt`, `Command`, `InMemorySaver`, `PostgresSaver` (`langgraph-checkpoint-postgres`). |
| PostgreSQL / pgvector | 18 / 0.8 | `vector(768)`, `halfvec`, HNSW, `<=>`, iterative index scans. |
| Qdrant | 1.x | Só como alternativa comparada. |
| Ollama | 0.x | `llama3.2:3b` (chat) e `nomic-embed-text` (768 dimensões) no laboratório. |
| Docker / Compose | 28.x / v2 | Multi-stage, `HEALTHCHECK`, `depends_on: condition: service_healthy`. |
| GitHub Actions | — | `actions/checkout@v5`, `astral-sh/setup-uv@v6`, `docker/build-push-action@v6`. |
| pytest | 8.x | Sem rede nos testes: modelo simulado. |
| MCP | revisão 2025-11-25+ | SDK Python `mcp` (`FastMCP`), `langchain-mcp-adapters`. |
| OpenTelemetry | semconv `gen_ai.*` | `gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`. |

## Ficheiros

Um módulo por ficheiro: `src/content/mNN-slug.ts`, exportando `export const mNN: Module`.

```ts
import type { Module } from '../types';

export const m14: Module = { ... };
```

O `slug` do ficheiro é igual ao `Module.id`. **Não mexas** em `src/content/index.ts`,
`src/content/todos.ts` nem `src/content/meta.ts` — são gerados por quem integra.

Para módulos grandes, podes partir o conteúdo em ficheiros auxiliares
`src/content/mNN-slug.parte-a.ts` (etc.) que exportam `Section[]`, `Question[]`, … e importá-los no
ficheiro principal. O verificador segue os imports.

## Identificadores

- `Module.id`: o slug atribuído (tabela no fim).
- `Section.id`: slug curto único **dentro do módulo**.
- `Question.id`: `q-<moduloId>-NN`. `Exercise.id`: `e-<moduloId>-NN`.
- `Lab.id`: `lab-<moduloId>-NN`; `Lab.moduleId` é o `Module.id`.
- `UseCase.id`: `uc-<moduloId>-NN`.
- `Flow.id`: `fl-<moduloId>-NN`. `DecisionTree.id`: `dt-<moduloId>-NN`.
- `RunnableSnippet.id`: `run-<moduloId>-NN`. `Formula.id`: `f-<moduloId>-NN`.
- `PromptSpec.id`: `pr-<moduloId>-NN`. `GraphSpec.id`: `gr-<moduloId>-NN`.
- `TraceSpec.id`: `tr-<moduloId>-NN`. `EvalSpec.id`: `ev-<moduloId>-NN`.
  `RetrievalSpec.id`: `rt-<moduloId>-NN`.
- Nós de diagrama, de grafo, de fluxo e de árvore: minúsculas, únicos dentro do próprio objecto.

`Module.part` só aceita: `fundamentos`, `rag`, `orquestracao`, `avaliacao`, `producao`, `balcao`.

## Volume por módulo

- `goals`: 4 a 6.
- `sections`: 5 a 7. Cada secção com 8 a 22 blocos.
- `quiz`: 8 a 10 perguntas (pelo menos duas com `answer.length === 2`).
- `exercises`: 4 a 6, misturando `input`, `open`, `design` e `code`.
- `labs`: 2 a 3 laboratórios de código.
- `useCases`: 1 a 2, cada um com diagrama.
- `minutes`: 55 a 110. `icon`: um único emoji. `tags`: 3 a 6 termos curtos.

Cada módulo tem de ter, no conjunto das secções, **pelo menos**: um `flow`, um `diagram`, quatro
`code`, dois `run`, um `table`, um `refs` por secção com mais de 6 blocos, um `adr`, e três
`callout` dos quais pelo menos um de tom `trap` e um de tom `prod`.

Além disso, por parte:

| Parte | Blocos obrigatórios extra |
|-------|---------------------------|
| `fundamentos` | um `prompt` |
| `rag` | um `retrieval` e uma `formula` |
| `orquestracao` | um `graph` com pelo menos duas `runs`, e um `tool` ou um `prompt` |
| `avaliacao` | um `eval` e uma `formula` |
| `producao` | um `trace` ou um `eval`, e um `code` em `bash`, `yaml`, `dockerfile` ou `toml` |
| `balcao` | um `graph`, um `trace` e um `eval` |

## Marcação inline

Nos campos de texto podes usar `**negrito**`, `*itálico*`, `` `código` `` e `[texto](url)`. Nada
mais — não há listas nem títulos markdown dentro de um `p`, nem `|`.

## Blocos disponíveis

`p`, `h`, `list`, `code`, `run`, `formula`, `table`, `callout`, `steps`, `terms`, `compare`,
`diagram`, `flow`, `decision`, `tools`, `tool`, `endpoint`, `lab`, `adr`, `file`, `prompt`, `graph`,
`trace`, `eval`, `retrieval`, `refs`, `widget`.

- `callout.tone`: `info` | `tip` | `warn` | `key` | `trap` | `prod`.
- `code.lang`: `python` | `bash` | `sql` | `yaml` | `toml` | `json` | `http` | `dockerfile` | `text`
  | `ts` | `java` | `ini` | `diff` | `markdown`.
- `tool.ref`: um id de `TOOL_IDS` em `src/data/ids.ts`.
- `adr.ref`: um id de `ADR_TITULOS` (`adr-0001` a `adr-0028`). **Lê o título** para escolher o ADR
  certo.
- `endpoint.ref`: um id de `ENDPOINT_IDS`.
- `file.ref`: um caminho de `REPO_PATHS` (relativo a `laboratorio/`). **Sem `lines`.**
- `lab.ref`: um `Lab.id` do próprio módulo.
- `retrieval.hits[].doc`: um id de `DOC_IDS`. Os `score` e a ordem têm de ser os que o `balcao`
  devolve de facto: corre `recuperar(query, k, metodo)` e copia.
- `widget.id`: só o da tabela de atribuição, e só no módulo indicado. `props` é opcional.
- `refs`: 2 a 4 links oficiais por secção substantiva.
- `graph.nodes[].kind`: `inicio` | `fim` | `llm` | `ferramenta` | `router` | `humano` | `subgrafo` |
  `reducer` | `guarda` | `retriever`.
- `trace.spans[].kind`: `pedido` | `no` | `llm` | `ferramenta` | `retriever` | `embedding` |
  `humano` | `retry` | `guarda`. Usa atributos `gen_ai.*` reais nos `attrs`.

### Domínios permitidos nas referências

`docs.python.org`, `python.org`, `peps.python.org`, `numpy.org`, `pyodide.org`,
`fastapi.tiangolo.com`, `docs.pydantic.dev`, `starlette.io`, `uvicorn.org`, `docs.astral.sh`,
`docs.pytest.org`, `python.langchain.com`, `docs.langchain.com`, `langchain-ai.github.io`,
`reference.langchain.com`, `blog.langchain.com`, `docs.anthropic.com`, `platform.claude.com`,
`anthropic.com`, `platform.openai.com`, `openai.com`, `ai.google.dev`, `ollama.com`,
`docs.ollama.com`, `huggingface.co`, `sbert.net`, `arxiv.org`, `aclanthology.org`,
`postgresql.org`, `qdrant.tech`, `milvus.io`, `faiss.ai`, `weaviate.io`, `docs.docker.com`,
`docker.com`, `git-scm.com`, `conventionalcommits.org`, `semver.org`, `docs.github.com`,
`github.com`, `trunkbaseddevelopment.com`, `opentelemetry.io`, `langfuse.com`, `prometheus.io`,
`grafana.com`, `owasp.org`, `genai.owasp.org`, `nist.gov`, `modelcontextprotocol.io`, `jsonrpc.org`,
`html.spec.whatwg.org`, `developer.mozilla.org`, `rfc-editor.org`, `datatracker.ietf.org`,
`docs.ragas.io`, `redis.io`, `kubernetes.io`, `sre.google`, `artificialintelligenceact.eu`,
`eur-lex.europa.eu`, `json-schema.org`, `yaml.org`.

Um blogue pessoal, o Stack Overflow, o Medium, o dev.to ou um agregador **não passam**. Dois links
verificados valem mais do que quatro a adivinhar caminhos profundos: se não tens a certeza do
caminho, usa a raiz da secção de documentação (ex. `https://docs.langchain.com/oss/python/langgraph/overview`,
`https://github.com/pgvector/pgvector`, `https://arxiv.org/abs/2005.11401`).

## Blocos `run` — Python que corre mesmo

O leitor carrega em «Correr» e o código executa em Pyodide, no browser, com `numpy` e o módulo
`balcao` já carregados. O verificador **corre cada bloco com `python3`** (com
`PYTHONPATH=laboratorio/src`) e **compara a saída com `expected`, linha a linha**. Por isso:

- Escreve o código, corre-o tu mesmo e cola a saída exacta em `expected`:

  ```bash
  cd laboratorio/src && python3 - <<'EOF'
  import balcao as b
  print(b.contar_tokens("O reembolso chega em 24 horas no M-Pesa."))
  EOF
  ```

- Só podes importar a biblioteca-padrão, `numpy` e `balcao`. Nada de LangChain, LangGraph,
  FastAPI, `requests` ou SDKs de fornecedores — um exemplo com essas bibliotecas é um bloco `code`.
- Nada de tempos de relógio, `id()`, `random` sem semente ou ordens de `set` na saída.
- Saídas curtas (até ~25 linhas). Formata números com `round` ou f-strings.

O que o `balcao` oferece (ver as docstrings em `didactico.py`):

| Grupo | Nomes |
|-------|-------|
| Dados | `DOCUMENTOS`, `DOC`, `PERGUNTAS`, `PEDIDOS`, `CLIENTES`, `PROJECTO`, `MODELOS`, `CAMBIO_USD_MZN` |
| Texto e tokens | `normalizar`, `palavras`, `radicais`, `treinar_bpe`, `tokenizar`, `contar_tokens`, `estimar_tokens` |
| Amostragem | `softmax`, `amostrar`, `LOGITS_EXEMPLO` |
| Custo | `custo_mzn(tokens_entrada, tokens_saida, modelo, tokens_cache)`, `custo_conversa(...)` |
| Embeddings | `DIM`, `embed`, `embed_lote`, `cosseno`, `projectar_2d` |
| Chunking | `Chunk`, `chunk_fixo`, `chunk_frases`, `chunk_recursivo`, `chunkar_corpus` |
| Pesquisa | `BM25`, `IndiceExacto`, `IndiceIVF`, `rrf`, `rerank`, `recuperar(consulta, k, metodo, filtro)` |
| Avaliação | `recall_at_k`, `precisao_at_k`, `mrr`, `ndcg_at_k`, `avaliar_recuperacao`, `fidelidade`, `cohen_kappa`, `bootstrap_ic` |
| Modelo simulado | `Resposta`, `ModeloSimulado`, `montar_prompt_rag` |
| Ferramentas | `ferramenta`, `FERRAMENTAS`, `esquema_json`, `executar_ferramenta`, `ler_pedido`, `ler_cliente`, `calcular_reembolso`, `emitir_reembolso`, `pesquisar_conhecimento`, `transferir_humano` |
| Grafo | `START`, `END`, `adicionar`, `GrafoEstado`, `CheckpointerMemoria`, `Interromper`, `Comando` |
| Guardrails | `detectar_pii`, `mascarar_pii`, `detectar_injeccao` |
| Operação | `Tracer` (`mostrar()` sem tempos é determinista), `CacheSemantico` |

Números de referência que o `balcao` produz (usa-os, não os contradigas):

| Medida (30 perguntas douradas, chunking recursivo) | BM25 | Denso | Híbrido (RRF) | Híbrido + re-rank |
|---|---|---|---|---|
| recall@3 | 0,833 | 0,900 | 0,933 | 0,950 |
| MRR@3 | 0,706 | 0,867 | 0,828 | 0,889 |
| recall@5 | 0,867 | 0,950 | 0,950 | 0,950 |

(Confirma com `avaliar_recuperacao(metodo, k)` antes de citar; se o runtime mudar, manda o runtime.)

**Diz sempre ao leitor o que o `balcao` é:** um runtime didáctico, determinista, com um embedding
por hashing e um modelo simulado que responde por extracção. Os números servem para comparar
técnicas entre si, não para prever o que um modelo real faria. Quando a diferença importa, mostra
em `code` o equivalente real (LangChain, Ollama, pgvector).

## Laboratórios (`labs`)

A verificação é **estrutural**: expressões regulares sobre o código submetido. Escreve `checks` que
apanhem a construção certa e não a formatação (`\\bwith_structured_output\\b`, `add_messages`,
`interrupt\\(`), e usa `forbid: true` para o anti-padrão (`eval\\(`, `f".*\\{pergunta\\}.*"` dentro
do prompt de sistema, `except:\\s*pass`). A `solution` **tem de passar as próprias `checks`** e o
`starter` **tem de falhar pelo menos uma**. `lang` é `python` salvo quando o exercício é noutra
linguagem (`yaml`, `dockerfile`, `sql`, `bash`). Quando `executavel: true` (só `python`, e só com
biblioteca-padrão, `numpy` e `balcao`), o verificador corre a solução e ela não pode falhar.

## Quiz

Cada pergunta tem uma explicação que ensina, não que repete o enunciado. Pelo menos duas por módulo
têm duas respostas certas. Evita perguntas de memorização de nomes de API; pergunta consequências
(«o que acontece se…», «qual destes falha primeiro quando…», «que métrica apanha…»).

## Tabela de módulos

| # | Parte | `id` | Título | Widget | Âmbito |
|---|-------|------|--------|--------|--------|
| 1 | fundamentos | `engenharia-ia` | Engenharia de IA e o problema do «Balcão» | `mapa-stack` | O que é engenharia de IA (e a diferença para ML engineering); as camadas da stack (modelo, contexto, orquestração, avaliação, serviço, operação); quando um LLM é a ferramenta errada (regras, pesquisa, ML clássico); o «Balcão»: intenções, requisitos, métricas, caminhos de resolução; mapa dos 32 módulos. |
| 2 | fundamentos | `como-funciona-llm` | Como um LLM gera texto | `tokenizador`, `amostragem-lab` | Tokenização BPE, embeddings de tokens, atenção (fórmula), geração autoregressiva, logits e softmax, temperatura/top-k/top-p, janela de contexto, KV cache, porque é que um modelo alucina, determinismo e reprodutibilidade, pré-treino vs instruction tuning vs RLHF (o suficiente para decidir). |
| 3 | fundamentos | `apis-de-modelos` | APIs de modelos na prática | `custo-tokens` | Anatomia de um pedido de mensagens (system, user, assistant), parâmetros, `stop_reason`, `usage`; streaming (eventos SSE); erros 429/5xx e retentativas com backoff e jitter; timeouts; SDKs Python (Anthropic, OpenAI, Ollama) e `init_chat_model`; prompt caching; batch; custo por pedido; interface própria sobre o fornecedor. |
| 4 | fundamentos | `prompt-engineering` | Prompts e engenharia de contexto | `contexto-janela` | Estrutura do prompt de sistema, instruções vs dados, delimitadores, few-shot, formatos de saída, raciocínio explícito e *extended thinking*, engenharia de contexto (o que entra, em que ordem, *lost in the middle*), prompts versionados como código, o prompt do «Balcão» dissecado. |
| 5 | fundamentos | `tool-calling` | Tool calling e saída estruturada | `esquema-ferramenta` | O ciclo de tool use, esquemas JSON, descrições como documentação para o modelo, validação com Pydantic, `with_structured_output`, erros de ferramenta como resultado, chamadas paralelas, idempotência, autorização dentro da ferramenta, `tool_choice`. As 12 ferramentas do «Balcão». |
| 6 | fundamentos | `escolher-modelo` | Escolher (e trocar) de modelo | `escolher-modelo` | Critérios medidos no teu conjunto (qualidade, TTFT, tokens/s, custo, janela, tool calling, português), API vs open-weights (Ollama, vLLM), privacidade e residência de dados, fixar versões, cascatas e routing por dificuldade, fallback entre fornecedores, o que fazer quando sai um modelo novo. |
| 7 | rag | `embeddings` | Embeddings e similaridade | `embeddings-2d` | O que é um embedding de texto, como se treinam (contrastive), dimensões e normalização, cosseno vs produto interno vs L2, semântico vs lexical, multilinguismo, assimetria pergunta/documento (prefixos), Matryoshka, versionar e reindexar, custo de embeddings. |
| 8 | rag | `bases-vectoriais` | Bases de dados vectoriais | `hnsw-lab` | kNN exacto vs ANN; IVF e HNSW (M, ef_construction, ef_search); quantização (halfvec, binária, PQ); pgvector (tipos, operadores, índices, filtros e iterative scans); Qdrant, Milvus e serviços geridos; pré-filtro vs pós-filtro; recall vs latência; dimensionar para o «Balcão» (5,7 MB). |
| 9 | rag | `ingestao-chunking` | Ingestão e chunking | `chunking-lab` | Carregar e limpar fontes, metadados (vigente, público, data), chunking fixo, por frases, recursivo, estrutural e semântico; tamanho e sobreposição; parent-child; deduplicação por hash; ingestão incremental e idempotente; o pipeline de ingestão do «Balcão». |
| 10 | rag | `rag-basico` | RAG de ponta a ponta | `rag-pipeline` | Indexar → recuperar → aumentar → gerar; o prompt RAG com citações; k e limiar de score; orçamento de tokens do contexto; recusa quando não há suporte; as falhas típicas (recuperação falhada, contexto ruidoso, fonte desactualizada, citação inventada) e como as ver. |
| 11 | rag | `pesquisa-hibrida` | Pesquisa híbrida e re-ranking | `rrf-lab` | BM25 (fórmula), full-text do PostgreSQL (`tsvector`, `ts_rank`, dicionário `portuguese`), onde o denso falha (códigos, números, nomes) e onde o lexical falha (sinónimos), RRF (fórmula), cross-encoders, custo do re-ranking, a consulta híbrida numa só SQL. |
| 12 | rag | `rag-avancado` | RAG avançado | `reescrita-consulta` | Reescrita de consulta, multi-query, HyDE, decomposição; filtros de metadados e self-query; parent document e contextual retrieval; compressão de contexto; versões de políticas; multi-tenant e controlo de acesso; RAG agêntico; quando GraphRAG compensa (raramente). |
| 13 | orquestracao | `langchain-lcel` | LangChain: runnables e LCEL | `lcel-lab` | Pacotes do LangChain 1.x, a interface `Runnable` (`invoke`, `batch`, `stream`, `ainvoke`), o operador `\|`, `RunnablePassthrough`, `RunnableParallel`, `RunnableLambda`, `with_retry`, `with_fallbacks`, `ChatPromptTemplate`, parsers, `with_structured_output`, callbacks, e quando **não** usar LangChain. |
| 14 | orquestracao | `langchain-rag` | RAG com LangChain | — | `Document`, loaders, `RecursiveCharacterTextSplitter`, `OllamaEmbeddings`, `PGVector` e `InMemoryVectorStore`, retrievers com `search_kwargs` e filtros, a cadeia RAG em LCEL com citações e streaming, retriever híbrido próprio, testes com fakes. |
| 15 | orquestracao | `agentes` | Agentes: o ciclo com ferramentas | `react-ciclo` | O que é um agente (modelo + ferramentas + ciclo + paragem), ReAct, `create_agent` do LangChain 1.x, critérios de paragem e limites, erros de ferramenta, agente vs workflow (e porque o «Balcão» usa um grafo), custo e variância de um agente. |
| 16 | orquestracao | `langgraph` | LangGraph: grafos de estado | `grafo-editor` | `StateGraph`, estado com `TypedDict`, reducers (`add_messages`, `operator.add`), nós, arestas, arestas condicionais, `START`/`END`, `compile`, modos de `stream`, `Send` para fan-out, `Command`, `recursion_limit`, `ToolNode`, subgrafos. O grafo do «Balcão». |
| 17 | orquestracao | `langgraph-persistencia` | Persistência, interrupts e humano no circuito | `checkpoint-replay` | Checkpointers (`InMemorySaver`, `PostgresSaver`), `thread_id`, `get_state`, `get_state_history`, replay e *time travel*, `update_state`, `interrupt()` e `Command(resume=...)`, aprovação de reembolsos acima de 500 MZN, nós com efeitos e idempotência, streaming de eventos. |
| 18 | orquestracao | `memoria` | Memória de conversa | `memoria-lab` | Memória de curto prazo no estado, `trim_messages`, resumo incremental, memória de longo prazo (Store), semântica/episódica/procedimental, o que nunca guardar (PII), o custo de um histórico que cresce, a política de memória do «Balcão». |
| 19 | orquestracao | `multi-agente-mcp` | Multi-agente e MCP | `mcp-inspector` | Supervisor, handoffs e hierarquias; quando multi-agente não compensa; MCP (host/cliente/servidor, tools/resources/prompts, stdio e Streamable HTTP, JSON-RPC 2.0), o servidor MCP do «Balcão» com `FastMCP`, `langchain-mcp-adapters`, riscos (tool poisoning, permissões). |
| 20 | avaliacao | `avaliacao-fundamentos` | Avaliação: porque e como | `eval-painel` | Não-determinismo e porque «parece bem» não é métrica; tipos de avaliação (asserções, conjunto dourado, humana, online); construir o conjunto dourado (fontes, estratificação por intenção, tamanho); versionar; significância com bootstrap; análise de erros a ler traços; eval-driven development. |
| 21 | avaliacao | `avaliar-rag` | Avaliar RAG | `metricas-retrieval` | Recall@k, precision@k, MRR, nDCG (fórmulas); faithfulness, answer relevance, context precision/recall (RAGAS); avaliar componente a componente; comparar chunking e pesquisa com números reais do `balcao`; armadilhas (juiz a avaliar-se a si próprio, relevância mal anotada). |
| 22 | avaliacao | `llm-como-juiz` | LLM-como-juiz | `juiz-lab` | Juiz com rubrica, pointwise vs pairwise, escalas binárias vs Likert, vieses (posição, verbosidade, auto-preferência), calibração contra anotação humana (Cohen kappa), prompts de juiz, custo e quando o juiz é pior do que uma asserção. |
| 23 | avaliacao | `avaliar-agentes` | Avaliar agentes e conversas | — | Resultado final vs trajectória; tool-call accuracy e argumentos; passos, custo e latência; conversas multi-turno com utilizador simulado; pass@k e pass^k; traços de referência como testes de regressão; ferramentas simuladas deterministas. |
| 24 | avaliacao | `guardrails-seguranca` | Guardrails e segurança | `injeccao-lab` | OWASP Top 10 para LLM (2025), prompt injection directa e indirecta, jailbreaks, defesa em camadas, PII, validação de saída, privilégio mínimo nas ferramentas, limites em código, red teaming, NIST AI RMF e AI Act (o suficiente para saber o que se aplica). |
| 25 | producao | `fastapi-servico` | O serviço FastAPI | `streaming-sse` | App e `lifespan`, esquemas Pydantic, dependências (autenticação, sessão), async vs sync, SSE com `StreamingResponse`, cancelamento quando o cliente desliga, timeouts, erros RFC 9457, health e readiness, testes com `TestClient` e `httpx.AsyncClient`, uvicorn e workers. |
| 26 | producao | `git-fluxo` | Git para equipas de IA | `git-grafo` | O modelo de commits, merge vs rebase, trunk-based, PRs pequenos, Conventional Commits e SemVer, versionar prompts e conjuntos dourados, notebooks, ficheiros grandes (LFS vs DVC vs armazenamento externo), segredos, pre-commit, `git bisect` para regressões de qualidade. |
| 27 | producao | `docker` | Docker e docker-compose | `docker-camadas` | Imagens e camadas, cache de build, multi-stage com uv, base slim, utilizador não-root, `.dockerignore`, `HEALTHCHECK`, segredos, `docker compose` com API, PostgreSQL+pgvector e Ollama, perfis, `depends_on` com saúde, volumes, GPU, tamanho e scan de imagens. |
| 28 | producao | `ci-cd` | CI/CD com evals como gate | `pipeline-ci` | GitHub Actions (workflows, jobs, matriz, cache), serviços em CI, ruff, mypy, pytest, evals como gate por intenção, build e push de imagem por SHA, SBOM e assinatura, ambientes e aprovações, canário e rollback, OIDC em vez de segredos longos, evals nocturnas com modelo real. |
| 29 | producao | `observabilidade-llmops` | Observabilidade e LLMOps | `trace-explorador` | Tracing com OpenTelemetry e convenções `gen_ai`, spans de um turno RAG, métricas (TTFT, tokens, custo, recusas), logs sem PII, Langfuse, feedback ligado ao traço, painéis e alertas, drift de perguntas, gestão de prompts e versões em produção. |
| 30 | producao | `custo-escala` | Custo, latência e escala | `custo-escala` | Custo por conversa (fórmula), prompt caching, cache semântica, routing de modelos, limitar a saída, comprimir contexto, rate limits do fornecedor (RPM/TPM), filas e backpressure, concorrência async, escalar horizontalmente, degradação graciosa e fallback. |
| 31 | balcao | `balcao-ponta-a-ponta` | O «Balcão», ponta a ponta | — | System design completo (requisitos → HLD → LLD: grafo, esquema SQL, API), os ADRs que o moldam, um turno de ponta a ponta com traço, o laboratório a correr (`docker compose up`, ingestão, conversa, evals), relatório de avaliação, checklist de produção, próximos passos. |
| 32 | balcao | `entrevista` | Preparação para entrevista de AI engineer | — | Perguntas conceptuais com resposta-modelo, system design de sistemas LLM (dois enunciados resolvidos), cenários de debugging, código ao vivo (RRF, recall@k, chunker, ciclo de ferramentas), sinais de senioridade e erros que custam a vaga. |

Um widget só aparece no módulo a que está atribuído. Os módulos sem widget compensam com `graph`,
`trace`, `eval`, `retrieval` e diagramas.

## Verificação

```bash
node scripts/verificar.mjs src/content/m14-langchain-rag.ts   # um módulo isolado (corre os `run`)
npm run gerar-indice && npm run gerar-meta                    # índice e meta
npm run typecheck                                             # tipos
npm test                                                      # testes globais de conteúdo
```

Um módulo só está pronto quando `verificar.mjs` passa sem erros, o `typecheck` passa, e a solução
de cada laboratório passa as próprias verificações.
