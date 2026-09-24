# Engenharia de IA — projecto «Balcão»

Tutorial interactivo (React 19 + Vite 7 + TypeScript + Tailwind 4) sobre engenharia de IA em produção:
LLMs, APIs de modelos, prompts, tool calling, embeddings, bases vectoriais, RAG (básico, híbrido,
avançado), LangChain (LCEL), agentes, LangGraph (checkpoints, interrupts, memória), multi-agente e
MCP, avaliação (RAG, LLM-como-juiz, agentes), guardrails, FastAPI, Git, Docker, CI/CD,
observabilidade e custo. Tudo a construir um só sistema: o «Balcão», o assistente de suporte do
«Chega», um marketplace fictício de entregas em Maputo e Matola.

## Arrancar

```bash
npm install
npm run vendor-pyodide        # copia o interpretador Python (Pyodide) para public/ — corre offline
npm run dev                   # http://localhost:5173
```

Opcional: `npm run vendor-pyodide -- --wheels` descarrega também o numpy para correr 100% offline
(sem isto, o numpy vem do CDN da Pyodide na primeira execução).

## O que tem

- **32 módulos em 6 partes**, cada um com matéria, diagramas e fluxos animados, código Python que
  corre no browser (Pyodide, com o pacote `balcao`), quiz, exercícios, laboratórios de código com
  verificação e casos de uso do mundo real.
- **Playground**: editor Python no browser; chat com o «Balcão» (simulado no browser, Ollama local,
  Anthropic ou OpenAI com a tua chave — guardada só em `sessionStorage`) com RAG no browser;
  galeria dos 29 simuladores.
- **Glossário** (360+ termos), **28 ADRs** em MADR, desenho do sistema, 12 ferramentas do agente,
  API de 14 endpoints, pesquisa global (Ctrl+K), progresso local, tema claro/escuro.
- **Laboratório real** em `laboratorio/`: FastAPI + LangChain 1.x + LangGraph 1.x + PostgreSQL/pgvector
  + Ollama, com `docker compose`, 121 testes que correm offline, evals com gate e GitHub Actions.
  Ver `laboratorio/README.md`.

## Comandos úteis

| Comando | O quê |
|---|---|
| `npm run build` | build de produção em `dist/` (gera fonte Python, índice e meta) |
| `npm test` | testes globais de conteúdo |
| `node scripts/verificar.mjs src/content/m10-rag-basico.ts` | valida um módulo contra o `CONTRATO.md` e corre os blocos Python |
| `npm run gerar-repo` | regenera a vista do laboratório depois de mexer em `laboratorio/` |
| `cd laboratorio && make testes` | testes do laboratório |

O `CONTRATO.md` descreve como escrever ou alterar módulos.

Copyright 2026, Feito por Xavier Francisco
