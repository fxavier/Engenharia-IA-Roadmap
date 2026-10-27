import type { BlocoEntrevistaId, NivelPergunta, TipoPergunta } from '../types';

export interface BlocoEntrevista {
  id: BlocoEntrevistaId;
  nome: string;
  blurb: string;
  accent: string;
}

export const BLOCOS: BlocoEntrevista[] = [
  {
    id: 'llm',
    nome: 'I · LLMs e modelos',
    blurb: 'Como um LLM gera texto, amostragem e alucinação, APIs de modelos, prompts e contexto, tool calling, escolha de modelo, fine-tuning e o ML que tens de saber para não tropeçar.',
    accent: 'oklch(0.62 0.17 288)',
  },
  {
    id: 'rag',
    nome: 'II · RAG e pesquisa',
    blurb: 'Embeddings, bases vectoriais e ANN, ingestão e chunking, RAG de ponta a ponta e os seus modos de falha, pesquisa híbrida com re-ranking, e as técnicas avançadas.',
    accent: 'oklch(0.66 0.16 200)',
  },
  {
    id: 'agentes',
    nome: 'III · Agentes e orquestração',
    blurb: 'O ciclo de um agente, agente vs workflow, grafos de estado com persistência e humano no circuito, memória, multi-agente e MCP.',
    accent: 'oklch(0.64 0.16 155)',
  },
  {
    id: 'avaliacao',
    nome: 'IV · Avaliação e segurança',
    blurb: 'Conjuntos dourados e eval-driven development, métricas de RAG, LLM-como-juiz, avaliação de agentes, prompt injection, guardrails, privacidade e regulação.',
    accent: 'oklch(0.70 0.16 65)',
  },
  {
    id: 'producao',
    nome: 'V · Produção e LLMOps',
    blurb: 'Servir modelos (APIs e self-hosted), streaming e concorrência, observabilidade, custo e latência, testes e CI/CD com evals como gate.',
    accent: 'oklch(0.58 0.12 250)',
  },
  {
    id: 'rondas',
    nome: 'VI · Rondas de entrevista',
    blurb: 'As rondas tal como acontecem: system design de sistemas LLM, código ao vivo, debugging de incidentes e a conversa comportamental que decide o nível.',
    accent: 'oklch(0.62 0.19 25)',
  },
];

export const BLOCO_DE: Record<BlocoEntrevistaId, BlocoEntrevista> = Object.fromEntries(BLOCOS.map((b) => [b.id, b])) as Record<BlocoEntrevistaId, BlocoEntrevista>;

export const TIPOS: Record<TipoPergunta, { nome: string; curto: string; minutos: [number, number]; cor: string }> = {
  conceito: { nome: 'Conceito', curto: 'Conceito', minutos: [3, 6], cor: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' },
  tradeoff: { nome: 'Trade-off', curto: 'Trade-off', minutos: [5, 10], cor: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
  design: { nome: 'System design', curto: 'Design', minutos: [12, 50], cor: 'bg-rose-500/12 text-rose-700 dark:text-rose-300' },
  codigo: { nome: 'Código ao vivo', curto: 'Código', minutos: [12, 35], cor: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  debug: { nome: 'Debugging', curto: 'Debug', minutos: [6, 15], cor: 'bg-amber-500/14 text-amber-800 dark:text-amber-300' },
  comportamental: { nome: 'Comportamental', curto: 'Comport.', minutos: [4, 8], cor: 'bg-pink-500/12 text-pink-700 dark:text-pink-300' },
};

export const NIVEIS: Record<NivelPergunta, { nome: string; ordem: number }> = {
  pleno: { nome: 'Pleno', ordem: 0 },
  senior: { nome: 'Sénior', ordem: 1 },
  staff: { nome: 'Staff', ordem: 2 },
};

/** Tabela de tópicos — fonte única de número, id, bloco e título. */
export const TABELA_TOPICOS: { numero: number; id: string; bloco: BlocoEntrevistaId; titulo: string; modulos: string[] }[] = [
  { numero: 1, id: 'llm-internos', bloco: 'llm', titulo: 'Como um LLM funciona por dentro', modulos: ['como-funciona-llm'] },
  { numero: 2, id: 'amostragem-alucinacao', bloco: 'llm', titulo: 'Amostragem, determinismo e alucinação', modulos: ['como-funciona-llm', 'avaliacao-fundamentos'] },
  { numero: 3, id: 'apis-modelos', bloco: 'llm', titulo: 'APIs de modelos em produção', modulos: ['apis-de-modelos'] },
  { numero: 4, id: 'prompt-contexto', bloco: 'llm', titulo: 'Prompt e context engineering', modulos: ['prompt-engineering'] },
  { numero: 5, id: 'tool-calling', bloco: 'llm', titulo: 'Tool calling e saída estruturada', modulos: ['tool-calling'] },
  { numero: 6, id: 'escolher-modelo', bloco: 'llm', titulo: 'Escolher, hospedar e trocar de modelo', modulos: ['escolher-modelo'] },
  { numero: 7, id: 'fine-tuning', bloco: 'llm', titulo: 'Fine-tuning, adaptação e quando não treinar', modulos: ['escolher-modelo', 'engenharia-ia'] },
  { numero: 8, id: 'ml-essencial', bloco: 'llm', titulo: 'ML essencial para AI engineers', modulos: ['engenharia-ia', 'avaliacao-fundamentos'] },
  { numero: 9, id: 'embeddings', bloco: 'rag', titulo: 'Embeddings e similaridade', modulos: ['embeddings'] },
  { numero: 10, id: 'bases-vectoriais', bloco: 'rag', titulo: 'Bases vectoriais e pesquisa aproximada', modulos: ['bases-vectoriais'] },
  { numero: 11, id: 'chunking-ingestao', bloco: 'rag', titulo: 'Ingestão e chunking', modulos: ['ingestao-chunking'] },
  { numero: 12, id: 'rag-falhas', bloco: 'rag', titulo: 'RAG de ponta a ponta e modos de falha', modulos: ['rag-basico', 'langchain-rag'] },
  { numero: 13, id: 'hibrida-rerank', bloco: 'rag', titulo: 'Pesquisa híbrida e re-ranking', modulos: ['pesquisa-hibrida'] },
  { numero: 14, id: 'rag-avancado', bloco: 'rag', titulo: 'RAG avançado', modulos: ['rag-avancado'] },
  { numero: 15, id: 'agentes', bloco: 'agentes', titulo: 'Agentes: ciclo, ferramentas e limites', modulos: ['agentes', 'langchain-lcel'] },
  { numero: 16, id: 'grafos-hitl', bloco: 'agentes', titulo: 'Grafos de estado, persistência e humano no circuito', modulos: ['langgraph', 'langgraph-persistencia'] },
  { numero: 17, id: 'memoria', bloco: 'agentes', titulo: 'Memória de conversa e de longo prazo', modulos: ['memoria'] },
  { numero: 18, id: 'multi-agente-mcp', bloco: 'agentes', titulo: 'Multi-agente e MCP', modulos: ['multi-agente-mcp'] },
  { numero: 19, id: 'avaliacao', bloco: 'avaliacao', titulo: 'Avaliação: conjuntos dourados e eval-driven development', modulos: ['avaliacao-fundamentos'] },
  { numero: 20, id: 'avaliar-rag', bloco: 'avaliacao', titulo: 'Avaliar RAG', modulos: ['avaliar-rag'] },
  { numero: 21, id: 'llm-juiz', bloco: 'avaliacao', titulo: 'LLM-como-juiz', modulos: ['llm-como-juiz'] },
  { numero: 22, id: 'avaliar-agentes', bloco: 'avaliacao', titulo: 'Avaliar agentes e conversas', modulos: ['avaliar-agentes'] },
  { numero: 23, id: 'seguranca', bloco: 'avaliacao', titulo: 'Segurança: prompt injection e guardrails', modulos: ['guardrails-seguranca'] },
  { numero: 24, id: 'governanca', bloco: 'avaliacao', titulo: 'Privacidade, governança e IA responsável', modulos: ['guardrails-seguranca'] },
  { numero: 25, id: 'servir-modelos', bloco: 'producao', titulo: 'Servir LLMs: streaming, concorrência e inferência', modulos: ['fastapi-servico', 'escolher-modelo'] },
  { numero: 26, id: 'llmops', bloco: 'producao', titulo: 'Observabilidade e LLMOps', modulos: ['observabilidade-llmops'] },
  { numero: 27, id: 'custo-latencia', bloco: 'producao', titulo: 'Custo, latência e escala', modulos: ['custo-escala'] },
  { numero: 28, id: 'testes-cicd', bloco: 'producao', titulo: 'Testes, CI/CD e releases', modulos: ['ci-cd', 'git-fluxo', 'docker'] },
  { numero: 29, id: 'design-rag', bloco: 'rondas', titulo: 'System design I: pesquisa e RAG', modulos: ['balcao-ponta-a-ponta', 'entrevista'] },
  { numero: 30, id: 'design-agentes', bloco: 'rondas', titulo: 'System design II: agentes e plataformas', modulos: ['balcao-ponta-a-ponta', 'entrevista'] },
  { numero: 31, id: 'codigo-ao-vivo', bloco: 'rondas', titulo: 'Código ao vivo para AI engineers', modulos: ['entrevista'] },
  { numero: 32, id: 'debugging', bloco: 'rondas', titulo: 'Debugging e incidentes de produção', modulos: ['entrevista', 'observabilidade-llmops'] },
  { numero: 33, id: 'comportamental', bloco: 'rondas', titulo: 'Comportamental, produto e senioridade', modulos: ['entrevista'] },
];

export function ficheiroDoTopico(numero: number, id: string): string {
  return `t${String(numero).padStart(2, '0')}-${id}.ts`;
}
