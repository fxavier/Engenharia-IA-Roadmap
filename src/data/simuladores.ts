/* Metadados leves dos simuladores (sem os componentes), para a página inicial
   e a pesquisa não descarregarem o pedaço dos widgets. */

import type { WidgetId } from '../types';

/** Ordem e explicação dos grupos definidos em `components/widgets/index.tsx`.
 *  Um grupo novo que apareça lá continua a ser mostrado, no fim. */
export const GRUPOS_SIMULADORES: { nome: string; blurb: string; accent: string }[] = [
  {
    nome: 'LLMs',
    blurb: 'Tokens, amostragem, custo por conversa, a janela de contexto a encher, esquemas de ferramentas e a escolha de modelo por números medidos.',
    accent: 'oklch(0.62 0.17 288)',
  },
  {
    nome: 'RAG',
    blurb: 'Embeddings no plano, HNSW por dentro, quatro estratégias de chunking, o pipeline RAG passo a passo, a fusão RRF e a reescrita de consultas.',
    accent: 'oklch(0.66 0.16 200)',
  },
  {
    nome: 'LangChain e LangGraph',
    blurb: 'Runnables encadeados, o ciclo de um agente, o grafo do «Balcão», checkpoints com interrupt e replay, memória de conversa e o protocolo MCP.',
    accent: 'oklch(0.64 0.16 155)',
  },
  {
    nome: 'Avaliação',
    blurb: 'Duas versões no conjunto dourado com intervalo de confiança, métricas de recuperação à mão, a calibração de um juiz e ataques de prompt injection.',
    accent: 'oklch(0.70 0.16 65)',
  },
  {
    nome: 'Produção',
    blurb: 'SSE e TTFT, Git visual, camadas de uma imagem Docker, um pipeline de CI/CD com evals como gate, traços gen_ai e o planeador de custo e escala.',
    accent: 'oklch(0.58 0.12 250)',
  },
];

/** Módulo onde cada simulador aparece (a tabela de atribuição do CONTRATO.md). */
export const MODULO_DO_WIDGET: Record<WidgetId, string> = {
  'mapa-stack': 'engenharia-ia',
  'tokenizador': 'como-funciona-llm',
  'amostragem-lab': 'como-funciona-llm',
  'custo-tokens': 'apis-de-modelos',
  'contexto-janela': 'prompt-engineering',
  'esquema-ferramenta': 'tool-calling',
  'escolher-modelo': 'escolher-modelo',
  'embeddings-2d': 'embeddings',
  'hnsw-lab': 'bases-vectoriais',
  'chunking-lab': 'ingestao-chunking',
  'rag-pipeline': 'rag-basico',
  'rrf-lab': 'pesquisa-hibrida',
  'reescrita-consulta': 'rag-avancado',
  'lcel-lab': 'langchain-lcel',
  'react-ciclo': 'agentes',
  'grafo-editor': 'langgraph',
  'checkpoint-replay': 'langgraph-persistencia',
  'memoria-lab': 'memoria',
  'mcp-inspector': 'multi-agente-mcp',
  'eval-painel': 'avaliacao-fundamentos',
  'metricas-retrieval': 'avaliar-rag',
  'juiz-lab': 'llm-como-juiz',
  'injeccao-lab': 'guardrails-seguranca',
  'streaming-sse': 'fastapi-servico',
  'git-grafo': 'git-fluxo',
  'docker-camadas': 'docker',
  'pipeline-ci': 'ci-cd',
  'trace-explorador': 'observabilidade-llmops',
  'custo-escala': 'custo-escala',
};

export const TOTAL_SIMULADORES = Object.keys(MODULO_DO_WIDGET).length;
