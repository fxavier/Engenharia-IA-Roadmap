/* GERADO POR scripts/gerar-repo.mjs — NÃO EDITAR À MÃO.
   Corre `npm run gerar-repo` depois de mexer em laboratorio/. */

export interface RepoEntrada {
  path: string;
  lang: string;
  grupo: string;
  linhas: number;
  bytes: number;
  blurb: string;
}

export interface RepoGrupo {
  id: string;
  title: string;
  blurb: string;
  files: string[];
}

export const MANIFESTO: RepoEntrada[] = [
  {
    path: ".dockerignore",
    lang: "text",
    grupo: "docker-ci",
    linhas: 25,
    bytes: 471,
    blurb: "O que não entra no contexto de build da imagem: testes, caches e segredos."
  },
  {
    path: ".env.example",
    lang: "bash",
    grupo: "projecto",
    linhas: 52,
    bytes: 2444,
    blurb: "Variáveis de ambiente do «Balcão». Copia para `.env` e ajusta: `cp .env.example .env`."
  },
  {
    path: ".github/workflows/ci.yml",
    lang: "yaml",
    grupo: "docker-ci",
    linhas: 145,
    bytes: 4535,
    blurb: "CI do «Balcão» (adr-0024): lint e tipos, testes com PostgreSQL + pgvector, evals como gate, e — só na main — a imagem imutável no GHCR, etiquetada com o SHA do commit."
  },
  {
    path: ".github/workflows/evals-nocturnas.yml",
    lang: "yaml",
    grupo: "docker-ci",
    linhas: 73,
    bytes: 2744,
    blurb: "Avaliação nocturna com o modelo real (RI-07): o conjunto dourado e o red team contra a versão de modelo fixada, todas as noites."
  },
  {
    path: ".gitignore",
    lang: "text",
    grupo: "projecto",
    linhas: 29,
    bytes: 417,
    blurb: "O que não entra no repositório: o ambiente, as caches, os relatórios e o `.env` com segredos."
  },
  {
    path: ".pre-commit-config.yaml",
    lang: "yaml",
    grupo: "projecto",
    linhas: 23,
    bytes: 734,
    blurb: "Verificações antes de cada commit: as mesmas regras do CI, mais cedo e mais baratas."
  },
  {
    path: ".python-version",
    lang: "text",
    grupo: "projecto",
    linhas: 2,
    bytes: 5,
    blurb: "Python 3.13: a versão que o uv instala e que a imagem Docker usa."
  },
  {
    path: "Makefile",
    lang: "bash",
    grupo: "projecto",
    linhas: 61,
    bytes: 2245,
    blurb: "Atalhos do laboratório do «Balcão». Tudo passa pelo uv: o mesmo ambiente no portátil, no CI e na imagem."
  },
  {
    path: "README.md",
    lang: "markdown",
    grupo: "projecto",
    linhas: 165,
    bytes: 9087,
    blurb: "Como pôr o laboratório do «Balcão» a correr: com e sem Docker, com Ollama ou sem nada."
  },
  {
    path: "dados/dourado.jsonl",
    lang: "json",
    grupo: "dados",
    linhas: 49,
    bytes: 11538,
    blurb: "Conjunto dourado: 30 perguntas de política, 10 fora de âmbito e 8 casos de ferramenta, com a resposta ou a ferramenta esperada."
  },
  {
    path: "dados/redteam.jsonl",
    lang: "json",
    grupo: "dados",
    linhas: 21,
    bytes: 6935,
    blurb: "Os 20 ataques de prompt injection (directa, indirecta, codificada, roleplay, exfiltração) e o comportamento esperado."
  },
  {
    path: "docker-compose.yml",
    lang: "yaml",
    grupo: "docker-ci",
    linhas: 116,
    bytes: 3781,
    blurb: "Ambiente local do «Balcão»: API + PostgreSQL 18 com pgvector, e Ollama opcional."
  },
  {
    path: "docker/Dockerfile",
    lang: "dockerfile",
    grupo: "docker-ci",
    linhas: 81,
    bytes: 3523,
    blurb: "Imagem do «Balcão» (adr-0022): multi-stage com uv, dependências fixadas pelo uv.lock, utilizador não-root e nenhum segredo lá dentro (vêm do ambiente em tempo de execução)."
  },
  {
    path: "prompts/classificar.md",
    lang: "markdown",
    grupo: "dados",
    linhas: 33,
    bytes: 1467,
    blurb: "Prompt de classificação de intenção"
  },
  {
    path: "prompts/sistema.md",
    lang: "markdown",
    grupo: "dados",
    linhas: 37,
    bytes: 2548,
    blurb: "Prompt de sistema do «Balcão»"
  },
  {
    path: "pyproject.toml",
    lang: "toml",
    grupo: "projecto",
    linhas: 120,
    bytes: 3804,
    blurb: "Projecto do «Balcão»: o assistente de suporte ao cliente do «Chega»."
  },
  {
    path: "sql/001_esquema.sql",
    lang: "sql",
    grupo: "dados",
    linhas: 242,
    bytes: 11184,
    blurb: "Esquema do «Balcão»: conhecimento, conversas, aprovações e avaliações numa só base de dados."
  },
  {
    path: "src/balcao/__init__.py",
    lang: "python",
    grupo: "projecto",
    linhas: 6,
    bytes: 237,
    blurb: "Pacote do «Balcão»."
  },
  {
    path: "src/balcao/api/__init__.py",
    lang: "python",
    grupo: "api",
    linhas: 6,
    bytes: 188,
    blurb: "API HTTP do «Balcão» (FastAPI): conversas com streaming por SSE, aprovações, pesquisa, ingestão e avaliação."
  },
  {
    path: "src/balcao/api/app.py",
    lang: "python",
    grupo: "api",
    linhas: 148,
    bytes: 6268,
    blurb: "A aplicação FastAPI do «Balcão»: `create_app()` e o ciclo de vida dos recursos (adr-0001)."
  },
  {
    path: "src/balcao/api/esquemas.py",
    lang: "python",
    grupo: "api",
    linhas: 200,
    bytes: 5011,
    blurb: "Esquemas Pydantic da API: o contrato HTTP do «Balcão»."
  },
  {
    path: "src/balcao/api/repositorio.py",
    lang: "python",
    grupo: "api",
    linhas: 321,
    bytes: 12828,
    blurb: "Persistência da API: conversas, mensagens, feedback, aprovações e corridas de avaliação."
  },
  {
    path: "src/balcao/api/rotas.py",
    lang: "python",
    grupo: "api",
    linhas: 528,
    bytes: 21933,
    blurb: "Os endpoints do «Balcão»."
  },
  {
    path: "src/balcao/avaliacao/__init__.py",
    lang: "python",
    grupo: "avaliacao",
    linhas: 2,
    bytes: 108,
    blurb: "Avaliação do «Balcão»: métricas, LLM-como-juiz e o corredor do conjunto dourado com gate de CI."
  },
  {
    path: "src/balcao/avaliacao/correr.py",
    lang: "python",
    grupo: "avaliacao",
    linhas: 424,
    bytes: 16699,
    blurb: "Corre o conjunto dourado e o red team contra o sistema, e decide o gate de CI (adr-0018)."
  },
  {
    path: "src/balcao/avaliacao/juiz.py",
    lang: "python",
    grupo: "avaliacao",
    linhas: 136,
    bytes: 5858,
    blurb: "LLM-como-juiz com rubrica e saída estruturada (adr-0019)."
  },
  {
    path: "src/balcao/avaliacao/metricas.py",
    lang: "python",
    grupo: "avaliacao",
    linhas: 100,
    bytes: 3432,
    blurb: "Métricas de avaliação do «Balcão» e o gate de CI (adr-0018)."
  },
  {
    path: "src/balcao/cadeias.py",
    lang: "python",
    grupo: "rag",
    linhas: 214,
    bytes: 8618,
    blurb: "A cadeia RAG em LCEL: reformular → recuperar → contexto → prompt → modelo → validar."
  },
  {
    path: "src/balcao/config.py",
    lang: "python",
    grupo: "projecto",
    linhas: 161,
    bytes: 6679,
    blurb: "Configuração do «Balcão», lida do ambiente (prefixo `BALCAO_`) e do `.env`."
  },
  {
    path: "src/balcao/corpus.py",
    lang: "python",
    grupo: "didactico",
    linhas: 625,
    bytes: 34835,
    blurb: "Corpus de conhecimento do «Balcão» — amostra didáctica."
  },
  {
    path: "src/balcao/didactico.py",
    lang: "python",
    grupo: "didactico",
    linhas: 1287,
    bytes: 55599,
    blurb: "Runtime didáctico do «Balcão»."
  },
  {
    path: "src/balcao/ferramentas.py",
    lang: "python",
    grupo: "agente",
    linhas: 488,
    bytes: 21730,
    blurb: "As 12 ferramentas do «Balcão»: a fronteira entre o modelo e o mundo."
  },
  {
    path: "src/balcao/grafo.py",
    lang: "python",
    grupo: "agente",
    linhas: 561,
    bytes: 26348,
    blurb: "O grafo do «Balcão» em LangGraph: router explícito, agente com limite e aprovação humana."
  },
  {
    path: "src/balcao/guardas.py",
    lang: "python",
    grupo: "agente",
    linhas: 129,
    bytes: 4519,
    blurb: "Guardrails em camadas: entrada, ferramentas e saída (adr-0020, adr-0028)."
  },
  {
    path: "src/balcao/ingestao.py",
    lang: "python",
    grupo: "rag",
    linhas: 259,
    bytes: 8851,
    blurb: "Ingestão: carregar documentos, partir em chunks, calcular embeddings e indexar."
  },
  {
    path: "src/balcao/mcp_servidor.py",
    lang: "python",
    grupo: "agente",
    linhas: 84,
    bytes: 3545,
    blurb: "Servidor MCP do «Balcão»: as ferramentas de leitura para outros agentes internos (adr-0017, RF-08)."
  },
  {
    path: "src/balcao/memoria.py",
    lang: "python",
    grupo: "agente",
    linhas: 118,
    bytes: 4796,
    blurb: "Memória de conversa: janela recente mais resumo incremental (adr-0016)."
  },
  {
    path: "src/balcao/modelos.py",
    lang: "python",
    grupo: "projecto",
    linhas: 148,
    bytes: 5993,
    blurb: "Fábrica de modelos: a única porta entre o «Balcão» e os fornecedores (adr-0003)."
  },
  {
    path: "src/balcao/observabilidade.py",
    lang: "python",
    grupo: "api",
    linhas: 176,
    bytes: 7718,
    blurb: "Observabilidade: traços OpenTelemetry com as convenções `gen_ai.*` e métricas Prometheus (adr-0025)."
  },
  {
    path: "src/balcao/recuperacao.py",
    lang: "python",
    grupo: "rag",
    linhas: 390,
    bytes: 15732,
    blurb: "Recuperação híbrida: vectores + texto, fundidos com RRF e re-ordenados (adr-0009)."
  },
  {
    path: "src/balcao/simulado.py",
    lang: "python",
    grupo: "projecto",
    linhas: 185,
    bytes: 7275,
    blurb: "Modelo de chat e embeddings simulados, com a interface do LangChain."
  },
  {
    path: "tests/conftest.py",
    lang: "python",
    grupo: "testes",
    linhas: 90,
    bytes: 2781,
    blurb: "Fixtures partilhadas."
  },
  {
    path: "tests/test_api.py",
    lang: "python",
    grupo: "testes",
    linhas: 201,
    bytes: 8941,
    blurb: "A API de ponta a ponta com o `TestClient`: conversas com SSE, aprovação, erros RFC 9457."
  },
  {
    path: "tests/test_avaliacao.py",
    lang: "python",
    grupo: "testes",
    linhas: 114,
    bytes: 4799,
    blurb: "Métricas, juiz heurístico, corredor da avaliação e o gate de CI."
  },
  {
    path: "tests/test_didactico.py",
    lang: "python",
    grupo: "testes",
    linhas: 88,
    bytes: 3562,
    blurb: "O runtime didáctico: saídas conhecidas que o tutorial mostra e de que o laboratório depende."
  },
  {
    path: "tests/test_ferramentas.py",
    lang: "python",
    grupo: "testes",
    linhas: 164,
    bytes: 7158,
    blurb: "Ferramentas: esquemas, autorização pelo contexto, limite de 500 MZN no código e idempotência."
  },
  {
    path: "tests/test_grafo.py",
    lang: "python",
    grupo: "testes",
    linhas: 263,
    bytes: 11131,
    blurb: "O grafo: router, ciclo do agente com limite, interrupt e retoma, guardas e memória."
  },
  {
    path: "tests/test_guardas.py",
    lang: "python",
    grupo: "testes",
    linhas: 69,
    bytes: 2842,
    blurb: "Guardrails de entrada e de saída."
  },
  {
    path: "tests/test_recuperacao.py",
    lang: "python",
    grupo: "testes",
    linhas: 142,
    bytes: 6562,
    blurb: "Recuperação híbrida, filtros de metadados e ingestão idempotente."
  }
];

export const GRUPOS: RepoGrupo[] = [
  {
    id: "projecto",
    title: "Projecto e configuração",
    blurb: "O que faz o laboratório arrancar noutra máquina: `pyproject.toml` com as dependências e a configuração de ruff, mypy e pytest, a versão de Python, as variáveis de ambiente, o Makefile, o LEIA-ME — e as três peças que escolhem o modelo: a configuração tipada, a fábrica de modelos por fornecedor e o modelo simulado.",
    files: [
      ".env.example",
      ".gitignore",
      ".pre-commit-config.yaml",
      ".python-version",
      "Makefile",
      "README.md",
      "pyproject.toml",
      "src/balcao/__init__.py",
      "src/balcao/config.py",
      "src/balcao/modelos.py",
      "src/balcao/simulado.py"
    ]
  },
  {
    id: "docker-ci",
    title: "Docker e CI/CD",
    blurb: "Imagem multi-stage com uv e utilizador não-root (adr-0022), o compose com PostgreSQL 18 + pgvector e o Ollama opcional, e os dois workflows: CI com lint, testes, evals como gate e imagem por SHA no GHCR (adr-0024), e a avaliação nocturna contra o modelo real.",
    files: [
      ".dockerignore",
      ".github/workflows/ci.yml",
      ".github/workflows/evals-nocturnas.yml",
      "docker-compose.yml",
      "docker/Dockerfile"
    ]
  },
  {
    id: "dados",
    title: "Dados, SQL e prompts",
    blurb: "O esquema do PostgreSQL (vector(768), HNSW, tsvector, a função de pesquisa híbrida com RRF, conversas e aprovações), os prompts versionados com cabeçalho de versão (adr-0023) e o conjunto dourado e os ataques de red team que o gate de CI corre (adr-0018).",
    files: [
      "dados/dourado.jsonl",
      "dados/redteam.jsonl",
      "prompts/classificar.md",
      "prompts/sistema.md",
      "sql/001_esquema.sql"
    ]
  },
  {
    id: "didactico",
    title: "Runtime didáctico",
    blurb: "O módulo que corre no browser (Pyodide) e no laboratório: BPE, embeddings por hashing, BM25, IVF, RRF, re-ranking, métricas, o modelo simulado, as ferramentas e o mini-grafo — mais o corpus de 40 documentos, as 30 perguntas douradas e os pedidos simulados.",
    files: [
      "src/balcao/corpus.py",
      "src/balcao/didactico.py"
    ]
  },
  {
    id: "rag",
    title: "RAG: ingestão, recuperação e cadeia",
    blurb: "Ingestão idempotente com chunking recursivo e metadados herdados (adr-0008), o retriever híbrido sobre pgvector ou em memória com filtros na base de dados (adr-0009, adr-0010) e a cadeia LCEL com citações validadas e recusa (adr-0011).",
    files: [
      "src/balcao/cadeias.py",
      "src/balcao/ingestao.py",
      "src/balcao/recuperacao.py"
    ]
  },
  {
    id: "agente",
    title: "Agente e grafo",
    blurb: "O grafo LangGraph com router, agente com orçamento de ferramentas e interrupt para reembolsos acima de 500 MZN (adr-0013, adr-0015), as 12 ferramentas com identidade vinda do contexto e limites no código, a memória (janela + resumo), os guardrails e o servidor MCP.",
    files: [
      "src/balcao/ferramentas.py",
      "src/balcao/grafo.py",
      "src/balcao/guardas.py",
      "src/balcao/mcp_servidor.py",
      "src/balcao/memoria.py"
    ]
  },
  {
    id: "api",
    title: "API e observabilidade",
    blurb: "FastAPI com lifespan, streaming por Server-Sent Events (adr-0021), erros RFC 9457, papéis por bearer token, aprovações que retomam o grafo com Command(resume=...), persistência em memória ou PostgreSQL, e os traços `gen_ai.*` e métricas Prometheus (adr-0025).",
    files: [
      "src/balcao/api/__init__.py",
      "src/balcao/api/app.py",
      "src/balcao/api/esquemas.py",
      "src/balcao/api/repositorio.py",
      "src/balcao/api/rotas.py",
      "src/balcao/observabilidade.py"
    ]
  },
  {
    id: "avaliacao",
    title: "Avaliação",
    blurb: "Métricas com intervalo de confiança por bootstrap, LLM-como-juiz com rubrica e saída estruturada (adr-0019) e o corredor do conjunto dourado com `--gate`, que falha o CI abaixo dos limiares.",
    files: [
      "src/balcao/avaliacao/__init__.py",
      "src/balcao/avaliacao/correr.py",
      "src/balcao/avaliacao/juiz.py",
      "src/balcao/avaliacao/metricas.py"
    ]
  },
  {
    id: "testes",
    title: "Testes",
    blurb: "pytest offline, com o modelo simulado e o índice em memória: runtime didáctico, recuperação e filtros, ferramentas e limites, grafo (router, interrupt e retoma, limite de passos), guardas, API com SSE e o gate. Os de PostgreSQL saltam sem DATABASE_URL.",
    files: [
      "tests/conftest.py",
      "tests/test_api.py",
      "tests/test_avaliacao.py",
      "tests/test_didactico.py",
      "tests/test_ferramentas.py",
      "tests/test_grafo.py",
      "tests/test_guardas.py",
      "tests/test_recuperacao.py"
    ]
  }
];

export const POR_CAMINHO: Record<string, RepoEntrada> = Object.fromEntries(MANIFESTO.map((e) => [e.path, e]));
