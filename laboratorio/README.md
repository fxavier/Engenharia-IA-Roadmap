# Balcão — laboratório

O «Balcão» é o assistente de suporte ao cliente do «Chega», um marketplace fictício de entregas ao domicílio em Maputo e Matola. Responde a perguntas sobre políticas com a fonte citada, consulta pedidos, calcula compensações e emite-as dentro do limite de 500 MZN, pede aprovação humana acima disso e passa a conversa a uma pessoa quando deve.

Este repositório é o laboratório do tutorial *Engenharia de IA*: um serviço Python de produção, pequeno o suficiente para se ler de uma ponta à outra, que corre no teu portátil com `docker compose up` e cujos testes passam sem rede, sem chave e sem GPU.

## Arquitectura

```
cliente ──HTTP/SSE──► FastAPI (api/) ──► grafo LangGraph (grafo.py)
                                           │
   guarda_entrada ─► classificar ─┬─► responder_rag ── cadeia LCEL (cadeias.py) ── retriever híbrido (recuperacao.py)
   (PII, injecção)   (regras +    ├─► agente ⇄ ferramentas (ToolNode, ferramentas.py) ─► aprovação (interrupt)
                      modelo)     └─► escalar (transferir_humano)
                                           │
                                   guarda_saida (citações) ─► resumir (memória) ─► fim
```

| Peça | Onde | Decisão |
|---|---|---|
| Modelos por fornecedor (simulado, Ollama, Anthropic, OpenAI) | `modelos.py`, `simulado.py` | adr-0003, adr-0004 |
| Ingestão idempotente, chunking recursivo com metadados | `ingestao.py` | adr-0007, adr-0008 |
| Pesquisa híbrida: HNSW + `tsvector`, RRF em SQL, re-ranking | `recuperacao.py`, `sql/001_esquema.sql` | adr-0005, adr-0006, adr-0009, adr-0010 |
| RAG em LCEL com citações obrigatórias e recusa | `cadeias.py`, `prompts/` | adr-0011, adr-0012 |
| Grafo com router, agente com limite, `interrupt` para > 500 MZN | `grafo.py` | adr-0013, adr-0014, adr-0015 |
| Ferramentas com identidade do contexto e limites no código | `ferramentas.py` | adr-0015, adr-0020 |
| Memória: janela + resumo | `memoria.py` | adr-0016 |
| Servidor MCP (stdio) | `mcp_servidor.py` | adr-0017 |
| Conjunto dourado, LLM-como-juiz, gate de CI | `avaliacao/`, `dados/` | adr-0018, adr-0019 |
| Guardrails de entrada e saída, PII mascarada | `guardas.py` | adr-0020, adr-0028 |
| Streaming por SSE, erros RFC 9457 | `api/` | adr-0021 |
| Imagem multi-stage, CI/CD | `docker/`, `.github/` | adr-0022, adr-0024 |
| OpenTelemetry `gen_ai.*` e Prometheus | `observabilidade.py` | adr-0025 |

`didactico.py` e `corpus.py` são o runtime do tutorial (também corre no browser, em Pyodide): BM25, embeddings por hashing, RRF, o modelo simulado e o corpus de 40 documentos, 30 perguntas douradas e 4 pedidos simulados. O laboratório usa-os como motor do modo simulado e como fonte de dados.

## Como correr

### Só com Python (sem Docker, sem nada)

Precisas do [uv](https://docs.astral.sh/uv/) 0.9 ou posterior. O uv instala o Python 3.13 se não o tiveres.

```bash
make instalar        # uv sync --frozen
make testes          # 120+ testes, offline, em segundos
make evals           # conjunto dourado + red team; relatório em relatorios/
make api             # http://localhost:8000/docs
```

Sem `DATABASE_URL`, tudo fica em memória: o índice (corpus ingerido no arranque), as conversas e os checkpoints do grafo. O modelo é o simulado — determinista, sem rede.

### Com Docker (API + PostgreSQL com pgvector)

```bash
docker compose up -d --build --wait
curl -s localhost:8000/readyz
```

O PostgreSQL 18 arranca com o esquema de `sql/` e a API ingere o corpus de amostra na primeira vez. Os checkpoints do LangGraph ficam no mesmo PostgreSQL.

### Com Ollama (modelo local real)

```bash
BALCAO_MODELO_FORNECEDOR=ollama docker compose --profile ollama up -d --build --wait
```

O serviço `ollama-init` descarrega `llama3.2:3b` (≈ 2 GB) e `nomic-embed-text` (≈ 270 MB) antes de a API arrancar. Trocar de embeddings obriga a reindexar (`make ingerir`): os vectores de modelos diferentes não se comparam, e a pesquisa só olha para os do modelo actual.

### Com um fornecedor comercial

```bash
export BALCAO_MODELO_FORNECEDOR=anthropic
export BALCAO_MODELO_CHAT=<identificador com data da página do fornecedor>
export ANTHROPIC_API_KEY=...
make api
```

A fábrica de modelos recusa aliases móveis (sem data): uma troca silenciosa de versão é um incidente à espera de acontecer (RI-07).

## Experimentar a API

Os tokens de laboratório estão em `BALCAO_TOKENS_API` (`.env.example`): `dev-aida`, `dev-nelson` e `dev-graca` são clientes, `dev-supervisor` aprova reembolsos, `dev-operador` ingere e avalia.

```bash
T="Authorization: Bearer dev-nelson"
C=$(curl -s -X POST localhost:8000/v1/conversas -H "$T" -H 'Content-Type: application/json' -d '{}' | jq -r .id)

# Resposta em streaming (Server-Sent Events): token, ferramenta, citacao, aprovacao, fim, erro
curl -N -X POST localhost:8000/v1/conversas/$C/mensagens -H "$T" -H 'Content-Type: application/json' \
  -d '{"texto": "O PD-8842507 não chegou, quero o reembolso do dinheiro"}'

# 2 910 MZN passa o limite: o grafo parou num interrupt. Um supervisor decide:
curl -s localhost:8000/v1/aprovacoes -H 'Authorization: Bearer dev-supervisor'
curl -s -X POST localhost:8000/v1/aprovacoes/<id>/decisao -H 'Authorization: Bearer dev-supervisor' \
  -H 'Content-Type: application/json' -d '{"aprovado": true}'
```

| Método | Caminho | Papel |
|---|---|---|
| POST | `/v1/conversas` | cliente |
| POST | `/v1/conversas/{id}/mensagens` (SSE) | cliente |
| GET | `/v1/conversas/{id}` | dono, supervisor, operador |
| POST | `/v1/conversas/{id}/feedback` | cliente |
| POST | `/v1/pesquisa` | qualquer (documentos internos só operador) |
| POST · GET | `/v1/ingestao` · `/v1/ingestao/{id}` | operador |
| GET · POST | `/v1/aprovacoes` · `/v1/aprovacoes/{id}/decisao` | supervisor |
| POST · GET | `/v1/avaliacoes` · `/v1/avaliacoes/{id}` | operador |
| GET | `/healthz`, `/readyz`, `/metrics` | — |

Os erros seguem o RFC 9457 (`application/problem+json`).

## Servidor MCP

```bash
BALCAO_MCP_CLIENTE_ID=CL-77120 uv run balcao-mcp
```

Expõe `pesquisar_conhecimento` e `ler_pedido` por stdio, com os mesmos esquemas Pydantic que o grafo usa. Só leituras: acções com efeito não saem do grafo.

## Variáveis de ambiente

Todas em `.env.example`. As principais:

| Variável | Omissão | Para quê |
|---|---|---|
| `BALCAO_MODELO_FORNECEDOR` | `simulado` | `simulado`, `ollama`, `anthropic` ou `openai` |
| `BALCAO_MODELO_CHAT` · `_CLASSIFICAR` · `_JUIZ` | `llama3.2:3b` · = chat · = chat | um modelo por escalão |
| `BALCAO_EMBEDDINGS_FORNECEDOR` · `BALCAO_MODELO_EMBEDDINGS` | segue o do modelo · `nomic-embed-text` | 768 dimensões |
| `DATABASE_URL` | — | sem ela, tudo em memória |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | |
| `BALCAO_TOKENS_API` | — | `token=papel[:cliente]`, separados por vírgulas |
| `BALCAO_LIMITE_REEMBOLSO_MZN` | `500` | acima disto, aprovação humana |
| `BALCAO_MAX_CHAMADAS_FERRAMENTAS` | `6` | orçamento de ferramentas por turno |
| `BALCAO_GATE_*` | ver `.env.example` | limiares do gate de avaliação |

## Comandos

`make ajuda` lista-os todos: `instalar`, `testes`, `testes-pg`, `lint`, `formatar`, `evals`, `evals-gate`, `subir`, `subir-ollama`, `descer`, `ingerir`, `api`, `mcp`, `limpar`.

## Estrutura

```
.
├── pyproject.toml · uv.lock · .python-version    projecto, dependências fixadas, Python 3.13
├── Makefile · .env.example · .pre-commit-config.yaml
├── docker/Dockerfile · .dockerignore · docker-compose.yml
├── .github/workflows/ci.yml · evals-nocturnas.yml
├── sql/001_esquema.sql          documentos, chunks (vector + tsvector), pesquisa_hibrida(), conversas…
├── prompts/sistema.md · classificar.md          prompts versionados (cabeçalho com versão)
├── dados/dourado.jsonl · redteam.jsonl          conjunto dourado e ataques de prompt injection
├── src/balcao/
│   ├── didactico.py · corpus.py                 runtime do tutorial e corpus de amostra
│   ├── config.py · modelos.py · simulado.py     configuração e fábrica de modelos
│   ├── ingestao.py · recuperacao.py · cadeias.py            RAG
│   ├── ferramentas.py · grafo.py · memoria.py · guardas.py  agente e grafo
│   ├── observabilidade.py · mcp_servidor.py
│   ├── api/ app.py · rotas.py · esquemas.py · repositorio.py
│   └── avaliacao/ metricas.py · juiz.py · correr.py
└── tests/                        offline; os de PostgreSQL saltam sem DATABASE_URL
```

## O que o modo simulado é, e o que não é

O modelo simulado responde por extracção (escolhe frases do contexto e cita a fonte) e pede ferramentas quando vê um número de pedido. Serve para ver a *forma* do sistema, testar o comportamento exacto e fazer de gate no CI. Não raciocina e não generaliza: os números de qualidade medidos com ele não se transferem para um modelo real. É para isso que existe a avaliação nocturna.
