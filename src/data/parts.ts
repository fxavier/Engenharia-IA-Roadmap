import type { PartMeta } from '../types';

export const PARTS: PartMeta[] = [
  {
    id: 'fundamentos',
    name: 'I · LLMs',
    blurb:
      'O que é engenharia de IA e o que não é. Como um LLM gera texto (tokens, atenção, amostragem), as APIs de modelos, engenharia de prompts e de contexto, tool calling com saída estruturada, e como escolher um modelo por custo, latência e qualidade medida.',
    accent: 'oklch(0.62 0.17 288)',
  },
  {
    id: 'rag',
    name: 'II · RAG e bases vectoriais',
    blurb:
      'Embeddings e similaridade, bases de dados vectoriais (HNSW, IVF, pgvector, Qdrant), ingestão e chunking, o pipeline RAG de ponta a ponta, pesquisa híbrida com re-ranking, e as técnicas avançadas que resolvem os casos em que o RAG ingénuo falha.',
    accent: 'oklch(0.66 0.16 200)',
  },
  {
    id: 'orquestracao',
    name: 'III · LangChain, LangGraph e agentes',
    blurb:
      'LCEL e runnables, RAG com LangChain, o ciclo de um agente com ferramentas, grafos de estado com LangGraph, persistência com checkpoints e aprovação humana, memória de conversa, e multi-agente com MCP.',
    accent: 'oklch(0.64 0.16 155)',
  },
  {
    id: 'avaliacao',
    name: 'IV · Avaliação e segurança',
    blurb:
      'Como se sabe que um sistema de IA funciona: conjuntos dourados, métricas de recuperação e de geração, LLM-como-juiz calibrado contra humanos, avaliação de agentes por trajectória, e guardrails contra prompt injection e fuga de dados.',
    accent: 'oklch(0.70 0.16 65)',
  },
  {
    id: 'producao',
    name: 'V · Produção: FastAPI, Git, Docker e CI/CD',
    blurb:
      'O serviço FastAPI com streaming, Git para equipas que versionam prompts e dados, imagens Docker e docker-compose, pipelines de CI/CD com evals como gate, observabilidade com OpenTelemetry e o custo por conversa como métrica de primeira classe.',
    accent: 'oklch(0.58 0.12 250)',
  },
  {
    id: 'balcao',
    name: 'VI · O «Balcão», ponta a ponta',
    blurb:
      'O exemplo integrado: do system design e dos ADRs ao sistema a correr no laboratório, com todas as peças ligadas. E a preparação para entrevista de AI engineer, com perguntas de system design de sistemas LLM.',
    accent: 'oklch(0.62 0.19 25)',
  },
];

export const PART_OF: Record<string, PartMeta> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

/* ===================================================================== projecto */

export interface ProjectFact {
  label: string;
  value: string;
  note: string;
}

/** O «Balcão» em números. Todos os módulos usam estes valores — não se inventam outros. */
export const PROJECTO = {
  nome: 'Balcão',
  marketplace: 'Chega',
  tagline: 'O assistente de suporte ao cliente de um marketplace de entregas',
  resumo:
    'O «Chega» é um marketplace fictício de entregas ao domicílio em Maputo e Matola: restaurantes, mercearias e farmácias, pagos com M-Pesa, e-Mola, cartão ou numerário. ' +
    'O «Balcão» é o assistente que responde aos clientes na aplicação e no WhatsApp: consulta pedidos, explica políticas com a fonte citada, calcula e emite compensações dentro dos limites, e passa a conversa a um humano quando deve. ' +
    'É um RAG sobre 214 documentos de políticas, um agente com 12 ferramentas orquestrado por um grafo LangGraph, servido por FastAPI em Docker, avaliado em CI contra 240 perguntas douradas — ' +
    'pequeno o suficiente para se construir num tutorial e grande o suficiente para obrigar a todas as peças de engenharia de IA ao mesmo tempo.',
  factos: [
    { label: 'Cidade', value: 'Maputo e Matola', note: '38 zonas de entrega; o mesmo marketplace do «Pulso» e do «Sentinela»' },
    { label: 'Conversas por dia', value: '1 150 em média', note: 'pico de 190 por hora às sextas às 20h; 3,4 turnos por conversa; ≈ 3 900 mensagens por dia' },
    { label: 'Resolução autónoma', value: '68% (alvo)', note: 'hoje 0%: 14 pessoas no suporte, 42 MZN por conversa, 7 minutos até à primeira resposta' },
    { label: 'Base de conhecimento', value: '214 documentos', note: '≈ 1 870 chunks; 40 deles estão no módulo `balcao` que corre no browser' },
    { label: 'Primeira palavra', value: 'p95 < 1,5 s', note: 'time to first token medido no cliente, com streaming por SSE' },
    { label: 'Custo por conversa', value: '< 1,00 MZN', note: 'modelo médio com 60% de cache de prompt ≈ 0,66 MZN, mais classificação no modelo pequeno' },
    { label: 'Conjunto dourado', value: '240 perguntas', note: 'mais 60 conversas multi-turno e 120 ataques de red team; 30 perguntas estão no módulo `balcao`' },
    { label: 'Reembolso autónomo', value: 'até 500 MZN', note: 'acima disso o grafo pára num interrupt e um humano aprova ou recusa' },
  ] as ProjectFact[],
  equipa: [
    { nome: 'Suporte ao cliente', papel: 'Dono do «Balcão». Escreve e mantém as políticas, revê as conversas escaladas e é quem sente o erro primeiro.' },
    { nome: 'Produto', papel: 'Define o tom de voz, as intenções que o assistente cobre e o que conta como conversa resolvida.' },
    { nome: 'Pagamentos', papel: 'Dona das ferramentas de reembolso e das regras de fraude; assina os limites de autonomia.' },
    { nome: 'Plataforma', papel: 'Corre o serviço, o PostgreSQL com pgvector, o pipeline de CI/CD e a observabilidade.' },
    { nome: 'Jurídico e privacidade', papel: 'Revê o tratamento de dados pessoais, a retenção e o que o assistente nunca pode dizer.' },
    { nome: 'Engenharia de IA', papel: 'Desenha o RAG, o grafo, as ferramentas, as avaliações e o serviço; és tu, ao longo dos 32 módulos.' },
  ],
};

/** Versões de referência — a mesma tabela que está no CONTRATO.md. */
export const VERSOES: { peca: string; versao: string; nota: string }[] = [
  { peca: 'Python', versao: '3.13', nota: 'O laboratório fixa 3.13 em `.python-version`; o código dos blocos «Correr» é compatível com 3.13 e 3.14.' },
  { peca: 'uv', versao: '0.9.x', nota: 'Ambiente, dependências e `uv.lock`; também dentro da imagem Docker.' },
  { peca: 'FastAPI', versao: '0.12x', nota: 'Com Pydantic 2.x; `lifespan`, dependências, `StreamingResponse` para SSE.' },
  { peca: 'Pydantic', versao: '2.x', nota: 'Esquemas da API, saída estruturada dos modelos e configuração com `pydantic-settings`.' },
  { peca: 'LangChain (`langchain`, `langchain-core`)', versao: '1.x', nota: 'Runnables, LCEL, integrações de modelos, retrievers e `@tool`. A 1.0 saiu em Outubro de 2025.' },
  { peca: 'LangGraph', versao: '1.x', nota: '`StateGraph`, reducers, `interrupt`/`Command`, checkpointers. A 1.0 saiu em Outubro de 2025.' },
  { peca: 'langchain-postgres / langgraph-checkpoint-postgres', versao: 'actuais', nota: 'Vector store sobre pgvector e checkpoints do grafo no mesmo PostgreSQL.' },
  { peca: 'PostgreSQL', versao: '18', nota: 'Base de dados única: documentos, chunks, vectores, conversas e checkpoints.' },
  { peca: 'pgvector', versao: '0.8', nota: 'Tipos `vector`/`halfvec`, índices HNSW e IVFFlat, iterative index scans para filtros.' },
  { peca: 'Qdrant', versao: '1.x', nota: 'A alternativa dedicada avaliada no módulo 8; não é a escolha do «Balcão».' },
  { peca: 'Ollama', versao: '0.x', nota: 'Modelos locais no laboratório: `llama3.2:3b` para chat e `nomic-embed-text` (768 dimensões) para embeddings.' },
  { peca: 'Docker Engine / Compose', versao: '28.x / v2', nota: 'Imagens multi-stage, `docker compose` com perfis e `healthcheck`.' },
  { peca: 'Git', versao: '2.5x', nota: 'Trunk-based, Conventional Commits, `git lfs` só quando é mesmo preciso.' },
  { peca: 'GitHub Actions', versao: '—', nota: 'CI com lint, tipos, testes e evals como gate; CD com imagem por SHA no GHCR.' },
  { peca: 'pytest', versao: '8.x / 9.x', nota: 'Testes do laboratório; os testes correm sem rede com o modelo simulado.' },
  { peca: 'OpenTelemetry semconv GenAI', versao: '`gen_ai.*`', nota: 'Spans `chat`, `embeddings`, `execute_tool`, `invoke_agent`; tokens em `gen_ai.usage.*`.' },
  { peca: 'MCP', versao: 'revisão 2025-11-25 ou posterior', nota: 'JSON-RPC 2.0; tools, resources e prompts; transporte stdio e Streamable HTTP.' },
  { peca: 'Pyodide', versao: '314.x', nota: 'Python 3.14 no browser para os blocos «Correr» e o playground, com `numpy` e o módulo `balcao`; servido localmente, sem CDN.' },
];
