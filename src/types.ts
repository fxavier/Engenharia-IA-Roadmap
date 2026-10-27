/* ==================================================================== partes */

export type PartId = 'fundamentos' | 'rag' | 'orquestracao' | 'avaliacao' | 'producao' | 'balcao';

/* ================================================================= diagramas */

export type NodeKind = 'service' | 'user' | 'data' | 'external' | 'note' | 'queue' | 'decision' | 'model' | 'agent' | 'tool' | 'vector';

export type ZoneTone =
  | 'cluster' | 'namespace' | 'service' | 'data' | 'edge' | 'external' | 'async' | 'neutral' | 'agente' | 'rag' | 'ci';

/** No posicionado numa grelha logica (col/row), nao em pixels. */
export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  col: number;
  row: number;
  span?: number;
  kind?: NodeKind;
}

export interface DiagramZone {
  id: string;
  label: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  tone?: ZoneTone;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
  dir?: 'fwd' | 'both' | 'none';
}

export interface Diagram {
  title?: string;
  caption?: string;
  cols: number;
  rows: number;
  zones?: DiagramZone[];
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
}

/* ========================================================= animacoes de fluxo */

export type LaneKind = 'client' | 'service' | 'store' | 'broker' | 'external' | 'infra' | 'model' | 'human' | 'agent';

export interface FlowLane {
  id: string;
  label: string;
  sub?: string;
  kind?: LaneKind;
}

export type StepKind = 'req' | 'res' | 'async' | 'err' | 'self' | 'note';

export interface FlowStep {
  from: string;
  /** Igual a `from` para trabalho interno da mesma pista. */
  to: string;
  label: string;
  detail?: string;
  kind?: StepKind;
  /** Codigo, cabecalhos ou payload mostrados no painel lateral do passo. */
  code?: string;
  lang?: string;
  /** Milissegundos simulados que este passo consome (usado no orcamento). */
  ms?: number;
  /** Tokens consumidos por este passo, quando e uma chamada ao modelo. */
  tokens?: number;
}

export interface Flow {
  id: string;
  title: string;
  intro?: string;
  lanes: FlowLane[];
  steps: FlowStep[];
  outro?: string;
}

/* ===================================================================== arvores */

export interface DecisionOption {
  label: string;
  next: string;
  note?: string;
}

export interface DecisionNode {
  id: string;
  question?: string;
  options?: DecisionOption[];
  answer?: string;
  detail?: string;
}

export interface DecisionTree {
  id: string;
  title: string;
  intro?: string;
  start: string;
  nodes: DecisionNode[];
}


/* ============================================================ conversa com o modelo */

export type Role = 'sistema' | 'utilizador' | 'assistente' | 'ferramenta';

export interface Message {
  role: Role;
  /** Nome da ferramenta, quando `role` e 'ferramenta'. */
  name?: string;
  text: string;
  /** Chamada de ferramenta emitida pelo assistente, em JSON. */
  call?: { tool: string; args: string };
  /** Anotacao didactica mostrada a margem da mensagem. */
  note?: string;
  /** Marca a mensagem como o sitio onde entra conteudo nao confiavel. */
  untrusted?: boolean;
  tokens?: number;
}

/** Janela de contexto mostrada como conversa, com anotacoes. */
export interface PromptSpec {
  id: string;
  title: string;
  brief?: string;
  messages: Message[];
  note?: string;
}

/* =========================================================== ferramentas do agente */

export type ToolEffect = 'leitura' | 'escrita' | 'externo' | 'humano';

export interface ToolParam {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
}

export interface ToolError {
  code: string;
  when: string;
  handling: string;
}

/** Uma ferramenta que o agente do «Balcão» pode chamar. O equivalente agentico de um endpoint. */
export interface ToolSpec {
  id: string;
  name: string;
  /** Agrupamento curto: 'consulta', 'conhecimento', 'accao', 'humano'. */
  group: string;
  summary: string;
  description: string;
  effect: ToolEffect;
  /** Risco de a chamada estar errada: 1 inofensivo, 3 irreversivel ou caro. */
  risk: 1 | 2 | 3;
  approval: 'nunca' | 'condicional' | 'sempre';
  idempotent?: boolean;
  /** Latencia tipica (p95) em milissegundos. */
  p95?: number;
  params: ToolParam[];
  returns: string;
  /** Esquema JSON entregue ao modelo, tal como vai no pedido. */
  schema?: string;
  sample?: { args: string; result: string };
  errors?: ToolError[];
  notes?: string[];
}

/* ===================================================================== grafos */

export type GraphNodeKind = 'inicio' | 'fim' | 'llm' | 'ferramenta' | 'router' | 'humano' | 'subgrafo' | 'reducer' | 'guarda' | 'retriever';

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  sub?: string;
  col: number;
  row: number;
  /** Custo simulado deste no. */
  ms?: number;
  tokens?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  /** Condicao que tem de ser verdadeira para a aresta ser seguida. */
  cond?: string;
  style?: 'solid' | 'dashed';
}

export interface GraphChannel {
  canal: string;
  tipo: string;
  reducer: string;
  nota: string;
}

export interface GraphRun {
  label: string;
  /** Sequencia de ids de nos, na ordem em que executam. Passos paralelos vao no mesmo grupo. */
  path: string[][];
  note?: string;
  outcome?: string;
}

export interface GraphSpec {
  id: string;
  title: string;
  brief?: string;
  entry: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  channels?: GraphChannel[];
  runs?: GraphRun[];
  note?: string;
}

/* ====================================================================== tracos */

export type SpanKind = 'pedido' | 'no' | 'llm' | 'ferramenta' | 'retriever' | 'embedding' | 'humano' | 'retry' | 'guarda';

export interface Span {
  id: string;
  parent?: string;
  name: string;
  kind: SpanKind;
  ms: number;
  tokensIn?: number;
  tokensOut?: number;
  status?: 'ok' | 'erro' | 'cancelado';
  attrs?: [string, string][];
  detail?: string;
}

export interface TraceSpec {
  id: string;
  title: string;
  brief?: string;
  spans: Span[];
  note?: string;
}

/* ================================================================== avaliacoes */

export interface EvalCase {
  id: string;
  input: string;
  expect: string;
  /** Criterios da rubrica, quando a resposta nao e comparavel por igualdade. */
  rubric?: string[];
  /** Resultado registado na ultima corrida: passou ou nao, e porque. */
  got?: string;
  pass?: boolean;
}

export interface EvalSpec {
  id: string;
  title: string;
  brief?: string;
  /** Metrica agregada, ex. 'resolucao correcta' ou 'faithfulness'. */
  metric: string;
  cases: EvalCase[];
  /** Historico entre versoes do sistema. */
  runs?: { versao: string; passou: number; total: number; nota: string }[];
  note?: string;
}

/* ================================================================= recuperacao */

export type RetrievalMethod = 'denso' | 'bm25' | 'hibrido' | 'rerank';

export interface RetrievalHit {
  /** Id de documento do corpus do «Balcão» (`balcao.CORPUS`, ex. 'pol-reembolso'). */
  doc: string;
  /** Excerto do chunk recuperado, curto (uma a tres frases). */
  texto: string;
  score: number;
  /** Quando o conjunto dourado diz se este chunk e relevante para a pergunta. */
  relevante?: boolean;
  /** Posicao antes de uma fusao ou re-ranking, quando interessa mostrar a mudanca. */
  antes?: number;
}

/** Resultado de uma pesquisa, mostrado como ranking anotado. */
export interface RetrievalSpec {
  id: string;
  title: string;
  brief?: string;
  query: string;
  method: RetrievalMethod;
  k: number;
  hits: RetrievalHit[];
  note?: string;
}

/* ===================================================================== blocos */

export type Tone = 'info' | 'tip' | 'warn' | 'key' | 'trap' | 'prod';

export type WidgetId =
  /* fundamentos */
  | 'mapa-stack'
  | 'tokenizador'
  | 'amostragem-lab'
  | 'custo-tokens'
  | 'contexto-janela'
  | 'esquema-ferramenta'
  | 'escolher-modelo'
  /* rag */
  | 'embeddings-2d'
  | 'hnsw-lab'
  | 'chunking-lab'
  | 'rag-pipeline'
  | 'rrf-lab'
  | 'reescrita-consulta'
  /* orquestracao */
  | 'lcel-lab'
  | 'react-ciclo'
  | 'grafo-editor'
  | 'checkpoint-replay'
  | 'memoria-lab'
  | 'mcp-inspector'
  /* avaliacao */
  | 'eval-painel'
  | 'metricas-retrieval'
  | 'juiz-lab'
  | 'injeccao-lab'
  /* producao */
  | 'streaming-sse'
  | 'git-grafo'
  | 'docker-camadas'
  | 'pipeline-ci'
  | 'trace-explorador'
  | 'custo-escala';

export interface ToolRef {
  name: string;
  role: string;
  badge?: string;
}

export interface Reference {
  label: string;
  url: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'code'; code: string; lang?: string; caption?: string }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'callout'; tone: Tone; title?: string; text: string }
  | { type: 'steps'; items: { title: string; text: string }[] }
  | { type: 'terms'; items: { term: string; def: string }[] }
  | { type: 'compare'; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { type: 'diagram'; diagram: Diagram }
  | { type: 'flow'; flow: Flow }
  | { type: 'decision'; tree: DecisionTree }
  | { type: 'tools'; items: ToolRef[] }
  /** Uma ferramenta do agente (`src/data/ferramentas.ts`). */
  | { type: 'tool'; ref: string }
  /** Um endpoint HTTP do servico (`src/data/api.ts`). */
  | { type: 'endpoint'; ref: string }
  | { type: 'lab'; ref: string }
  /** Referencia a uma decisao de `src/data/adr.ts`. */
  | { type: 'adr'; ref: string }
  /** Referencia a um ficheiro do laboratorio (`src/data/repo/`). */
  | { type: 'file'; ref: string; lines?: [number, number] }
  /** Bloco de Python executavel no browser (Pyodide), com o modulo `balcao` carregado. */
  | { type: 'run'; run: RunnableSnippet }
  | { type: 'formula'; formula: Formula }
  /** Janela de contexto anotada. */
  | { type: 'prompt'; prompt: PromptSpec }
  /** Grafo executavel, com corridas de exemplo. */
  | { type: 'graph'; graph: GraphSpec }
  /** Traco OpenTelemetry de uma execucao. */
  | { type: 'trace'; trace: TraceSpec }
  /** Conjunto de avaliacao. */
  | { type: 'eval'; eval: EvalSpec }
  /** Ranking de recuperacao anotado. */
  | { type: 'retrieval'; retrieval: RetrievalSpec }
  | { type: 'refs'; items: Reference[] }
  | { type: 'widget'; id: WidgetId; props?: Record<string, unknown> };

/** Excerto de Python que corre mesmo, no browser (Pyodide), com o modulo `balcao` disponivel. */
export interface RunnableSnippet {
  id: string;
  title: string;
  /** Uma a tres frases: o que este excerto mostra. */
  brief?: string;
  code: string;
  /** Pacotes Pyodide necessarios alem de numpy. */
  packages?: string[];
  /** Saida real do codigo, mostrada antes de correr e quando nao ha Pyodide. */
  expected?: string;
  /** Gera uma figura matplotlib (o executor recolhe a imagem). */
  plot?: boolean;
}

export interface Formula {
  id: string;
  title: string;
  /** Notacao, em texto simples alinhado (o componente formata em monoespacado). */
  expr: string;
  /** Cada simbolo e o que significa no «Balcão». */
  where: { sym: string; means: string }[];
  /** A leitura em portugues corrente, uma frase. */
  reading: string;
  note?: string;
}

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

/* ================================================================== avaliacao */

export interface Question {
  id: string;
  /** Topico curto, ex. 'rag', 'langgraph', 'docker'. */
  topic: string;
  prompt: string;
  options: string[];
  /** Indices correctos. Comprimento 1 = escolha multipla; > 1 = resposta multipla. */
  answer: number[];
  explain: string;
  /** Justificacao opcional por opcao (mesmo comprimento que `options`). */
  why?: string[];
  refs?: Reference[];
}

export type ExerciseKind = 'input' | 'open' | 'design' | 'code';

export interface Exercise {
  id: string;
  title: string;
  statement: string;
  kind: ExerciseKind;
  /** Respostas aceites (normalizadas) quando kind === 'input'. */
  accept?: string[];
  hint?: string;
  solution: string;
  difficulty: 1 | 2 | 3;
}

/* ========================================================= laboratorios de codigo */

export interface LabCheck {
  id: string;
  label: string;
  /** Expressao regular aplicada ao codigo submetido. */
  re: string;
  flags?: string;
  /** Quando true, a verificacao passa se a expressao NAO ocorrer. */
  forbid?: boolean;
  /** Explicacao mostrada quando a verificacao falha. */
  why?: string;
}

export interface Lab {
  id: string;
  moduleId: string;
  title: string;
  brief: string;
  lang: string;
  starter: string;
  checks: LabCheck[];
  hints: string[];
  solution: string;
  difficulty: 1 | 2 | 3;
  /** Quando true (e lang === 'python'), o laboratorio tambem corre em Pyodide depois de passar. */
  executavel?: boolean;
}

/* ====================================================== especificacao da API HTTP */

export interface EndpointParam {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  type: string;
  required?: boolean;
  desc: string;
}

export interface EndpointResponse {
  status: number;
  desc: string;
  sample?: string;
}

export interface Endpoint {
  id: string;
  service: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  auth: 'none' | 'bearer' | 'bearer:cliente' | 'bearer:suporte' | 'bearer:admin' | 'bearer:servico';
  idempotent?: boolean;
  /** Resposta em streaming (text/event-stream). */
  stream?: boolean;
  params: EndpointParam[];
  requestSample?: string;
  responses: EndpointResponse[];
  /** Latencia alvo (p95) em milissegundos. */
  p95?: number;
  notes?: string[];
}

/* ==================================================================== decisoes */

export type AdrStatus = 'aceite' | 'proposto' | 'substituido' | 'rejeitado';

/** Registo de decisao de arquitectura, no formato MADR. */
export interface Adr {
  id: string;
  number: number;
  title: string;
  status: AdrStatus;
  date: string;
  /** Area curta: 'modelo', 'rag', 'orquestracao', 'avaliacao', 'seguranca', 'producao', 'plataforma'. */
  area: string;
  deciders: string[];
  context: string;
  drivers: string[];
  options: { name: string; pros: string[]; cons: string[] }[];
  decision: string;
  rationale: string;
  consequences: { good: string[]; bad: string[] };
  validation?: string;
  related?: string[];
  supersedes?: string;
  module?: string;
  refs?: Reference[];
}

/* ============================================================ desenho do sistema */

export interface Requirement {
  id: string;
  kind: 'funcional' | 'nao-funcional' | 'restricao' | 'fora-de-ambito';
  text: string;
  priority?: 'must' | 'should' | 'could' | 'wont';
  measure?: string;
}

export interface CapacityRow {
  label: string;
  value: string;
  work: string;
}

/** Uma fonte de conhecimento que alimenta o RAG do «Balcão». */
export interface FonteSpec {
  id: string;
  nome: string;
  dono: string;
  formato: string;
  volume: string;
  actualizacao: string;
  confianca: 'alta' | 'media' | 'baixa';
  nota: string;
}

/** Uma intencao de contacto de cliente, com peso e caminho de resolucao. */
export interface IntencaoSpec {
  id: string;
  nome: string;
  /** Percentagem das conversas. */
  peso: number;
  exemplo: string;
  caminho: 'rag' | 'ferramenta' | 'agente' | 'humano';
  resolucaoAlvo: string;
  nota: string;
}

/** Uma conversa de referencia: o que o cliente escreve e o que o sistema tem de fazer. */
export interface ConversaSpec {
  id: string;
  nome: string;
  intencao: string;
  resumo: string;
  turnos: { quem: 'cliente' | 'balcao'; texto: string }[];
  comportamentoCerto: string;
  armadilha: string;
  /** Documentos do corpus que sustentam a resposta certa. */
  docs: string[];
  /** Ferramentas que a resposta certa usa. */
  ferramentas: string[];
}

/** Uma politica de autonomia: o que o agente pode fazer sozinho. */
export interface PolicyRow {
  accao: string;
  autonomia: 'autonomo' | 'aprovacao' | 'proibido';
  limite: string;
  porque: string;
}

export interface MetricLink {
  negocio: string;
  definicao: string;
  sistema: string;
  porque: string;
  alvo: string;
}

/** Um modelo disponivel, com custo e latencia de referencia. */
export interface ModelSpec {
  id: string;
  nome: string;
  papel: string;
  janela: string;
  custoEntrada: string;
  custoSaida: string;
  p50: string;
  nota: string;
}

/* =========================================================== repositorio do lab */

export interface RepoFile {
  path: string;
  lang: string;
  blurb: string;
  code: string;
}

export interface RepoGroup {
  id: string;
  title: string;
  blurb: string;
  files: string[];
}

/* ================================================================ casos de uso */

export interface UseCase {
  id: string;
  title: string;
  area: string;
  level: 1 | 2 | 3;
  scenario: string;
  requirements: string[];
  constraints?: string[];
  approach: { title: string; text: string }[];
  diagram?: Diagram;
  solution: string;
  tools: ToolRef[];
  rejected: { option: string; why: string }[];
  costNote?: string;
  takeaways: string[];
  refs?: Reference[];
}

/* ===================================================================== modulos */

export interface Module {
  id: string;
  number: number;
  part: PartId;
  title: string;
  subtitle: string;
  icon: string;
  minutes: number;
  tags: string[];
  goals: string[];
  sections: Section[];
  quiz: Question[];
  exercises: Exercise[];
  labs: Lab[];
  useCases: UseCase[];
}

/* ======================================================================= apoio */

export interface GlossaryEntry {
  term: string;
  def: string;
  /** Categoria: 'llm', 'rag', 'vectores', 'agentes', 'langchain', 'langgraph', 'avaliacao', 'seguranca', 'fastapi', 'docker', 'git', 'cicd', 'operacao'. */
  cat?: string;
  module?: string;
  see?: string[];
  formula?: string;
}

export interface PartMeta {
  id: PartId;
  name: string;
  blurb: string;
  accent: string;
}

/* ================================================================ entrevista */

/** Os seis blocos da área «Entrevista» (preparação para entrevista de AI engineer). */
export type BlocoEntrevistaId = 'llm' | 'rag' | 'agentes' | 'avaliacao' | 'producao' | 'rondas';

/** O formato da pergunta — decide o tempo sugerido e em que rondas da simulação entra. */
export type TipoPergunta = 'conceito' | 'tradeoff' | 'design' | 'codigo' | 'debug' | 'comportamental';

/** Nível a partir do qual a pergunta costuma aparecer. */
export type NivelPergunta = 'pleno' | 'senior' | 'staff';

/** Blocos permitidos numa resposta-modelo (subconjunto de `Block`). */
export type BlocoResposta = Extract<
  Block,
  { type: 'p' | 'h' | 'list' | 'code' | 'table' | 'callout' | 'steps' | 'compare' | 'terms' | 'diagram' | 'adr' | 'refs' }
>;

export interface RubricaPergunta {
  /** O que o entrevistador procura: 3 a 6 pontos verificáveis, cada um uma frase. */
  criterios: string[];
  /** Como soa uma resposta fraca (o que falta ou o que está errado). */
  fraco: string;
  /** Como soa uma resposta sólida de quem já fez isto em produção. */
  solido: string;
  /** O que distingue uma resposta excelente (sénior/staff) de uma sólida. */
  excelente: string;
}

export interface PerguntaEntrevista {
  /** `p-<topicoId>-NN`. */
  id: string;
  tipo: TipoPergunta;
  nivel: NivelPergunta;
  /** Título curto para listas (até ~70 caracteres). */
  titulo: string;
  /** O que o entrevistador diz, tal e qual. */
  enunciado: string;
  /** Cenário, restrições ou números dados ao candidato (design, debug, código). */
  contexto?: string;
  /** Tempo de resposta sugerido, em minutos. */
  minutos: number;
  /** Uma pista que não dá a resposta. */
  dica?: string;
  /** A resposta-modelo. */
  resposta: BlocoResposta[];
  rubrica: RubricaPergunta;
  /** Perguntas de seguimento que o entrevistador faz a seguir (2 a 4). */
  seguimento: string[];
  /** Frases ou atitudes que custam a vaga (2 a 4). */
  sinaisAlarme: string[];
  /** Ids de módulos do tutorial para rever o tema. */
  modulos?: string[];
}

export interface TopicoEntrevista {
  /** Slug, igual ao nome do ficheiro sem o prefixo `tNN-`. */
  id: string;
  numero: number;
  bloco: BlocoEntrevistaId;
  titulo: string;
  /** Uma ou duas frases: o que este tópico cobre e porque é perguntado. */
  resumo: string;
  icon: string;
  /** Ids de módulos do tutorial relacionados. */
  modulos: string[];
  /** Cábula: 6 a 10 factos, fórmulas ou frases que tens de saber dizer de cor. */
  essencial: string[];
  perguntas: PerguntaEntrevista[];
}
