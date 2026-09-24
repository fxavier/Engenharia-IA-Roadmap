#!/usr/bin/env node
/* Verifica UM ficheiro de módulo contra o CONTRATO.md, de forma isolada.
   Uso: node scripts/verificar.mjs src/content/m14-estado-e-reducers.ts

   Compila o módulo com esbuild para .tmp/, importa-o, e verifica tudo o que o
   CONTRATO.md exige: volume, mínimos de blocos, extras por parte, widgets,
   ids, referências cruzadas, coerência interna de grafos/traços/árvores/
   diagramas, laboratórios e texto. Avisos não fazem o script falhar; erros
   fazem-no sair com código 1.                                                */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const alvo = process.argv[2];
if (!alvo) { console.error('uso: node scripts/verificar.mjs src/content/mNN-slug.ts'); process.exit(2); }

const erros = [];
const avisos = [];
const ok = (cond, msg) => { if (!cond) erros.push(msg); };
const aviso = (cond, msg) => { if (!cond) avisos.push(msg); };

const temp = mkdtempSync(join(tmpdir(), 'verif-'));
function empacotar(ficheiro) {
  const saida = join(temp, basename(ficheiro).replace(/\.tsx?$/, '') + '-' + Math.random().toString(36).slice(2, 8) + '.mjs');
  execFileSync('npx', ['esbuild', ficheiro, '--bundle', '--format=esm', `--outfile=${saida}`, '--log-level=error'], { stdio: 'pipe' });
  return saida;
}

/* ============================================================ tabela do CONTRATO */

/** number, part, id, widgets atribuídos — tabela final do CONTRATO.md. */
const TABELA_MODULOS = [
  [1, 'fundamentos', 'engenharia-ia', ['mapa-stack']],
  [2, 'fundamentos', 'como-funciona-llm', ['tokenizador', 'amostragem-lab']],
  [3, 'fundamentos', 'apis-de-modelos', ['custo-tokens']],
  [4, 'fundamentos', 'prompt-engineering', ['contexto-janela']],
  [5, 'fundamentos', 'tool-calling', ['esquema-ferramenta']],
  [6, 'fundamentos', 'escolher-modelo', ['escolher-modelo']],
  [7, 'rag', 'embeddings', ['embeddings-2d']],
  [8, 'rag', 'bases-vectoriais', ['hnsw-lab']],
  [9, 'rag', 'ingestao-chunking', ['chunking-lab']],
  [10, 'rag', 'rag-basico', ['rag-pipeline']],
  [11, 'rag', 'pesquisa-hibrida', ['rrf-lab']],
  [12, 'rag', 'rag-avancado', ['reescrita-consulta']],
  [13, 'orquestracao', 'langchain-lcel', ['lcel-lab']],
  [14, 'orquestracao', 'langchain-rag', []],
  [15, 'orquestracao', 'agentes', ['react-ciclo']],
  [16, 'orquestracao', 'langgraph', ['grafo-editor']],
  [17, 'orquestracao', 'langgraph-persistencia', ['checkpoint-replay']],
  [18, 'orquestracao', 'memoria', ['memoria-lab']],
  [19, 'orquestracao', 'multi-agente-mcp', ['mcp-inspector']],
  [20, 'avaliacao', 'avaliacao-fundamentos', ['eval-painel']],
  [21, 'avaliacao', 'avaliar-rag', ['metricas-retrieval']],
  [22, 'avaliacao', 'llm-como-juiz', ['juiz-lab']],
  [23, 'avaliacao', 'avaliar-agentes', []],
  [24, 'avaliacao', 'guardrails-seguranca', ['injeccao-lab']],
  [25, 'producao', 'fastapi-servico', ['streaming-sse']],
  [26, 'producao', 'git-fluxo', ['git-grafo']],
  [27, 'producao', 'docker', ['docker-camadas']],
  [28, 'producao', 'ci-cd', ['pipeline-ci']],
  [29, 'producao', 'observabilidade-llmops', ['trace-explorador']],
  [30, 'producao', 'custo-escala', ['custo-escala']],
  [31, 'balcao', 'balcao-ponta-a-ponta', []],
  [32, 'balcao', 'entrevista', []],
].map(([number, part, id, widgets]) => ({ number, part, id, widgets }));

const MODULO_POR_ID = new Map(TABELA_MODULOS.map((m) => [m.id, m]));

const WIDGET_IDS = new Set(TABELA_MODULOS.flatMap((m) => m.widgets));

const PARTES = ['fundamentos', 'rag', 'orquestracao', 'avaliacao', 'producao', 'balcao'];
const TONS = ['info', 'tip', 'warn', 'key', 'trap', 'prod'];
const LANGS = ['python', 'bash', 'sql', 'yaml', 'toml', 'json', 'http', 'dockerfile', 'text', 'ts', 'java', 'ini', 'diff', 'markdown'];
const NODE_KINDS = ['service', 'user', 'data', 'external', 'note', 'queue', 'decision', 'model', 'agent', 'tool', 'vector'];
const ZONE_TONES = ['cluster', 'namespace', 'service', 'data', 'edge', 'external', 'async', 'neutral', 'agente', 'rag', 'ci'];
const STEP_KINDS = ['req', 'res', 'async', 'err', 'self', 'note'];
const LANE_KINDS = ['client', 'service', 'store', 'broker', 'external', 'infra', 'model', 'human', 'agent'];
const GRAPH_NODE_KINDS = ['inicio', 'fim', 'llm', 'ferramenta', 'router', 'humano', 'subgrafo', 'reducer', 'guarda', 'retriever'];
const SPAN_KINDS = ['pedido', 'no', 'llm', 'ferramenta', 'retriever', 'embedding', 'humano', 'retry', 'guarda'];

const DOMINIOS_OFICIAIS = [
  'docs.python.org', 'python.org', 'peps.python.org', 'numpy.org', 'pyodide.org',
  'fastapi.tiangolo.com', 'docs.pydantic.dev', 'starlette.io', 'uvicorn.org', 'docs.astral.sh', 'docs.pytest.org',
  'python.langchain.com', 'docs.langchain.com', 'langchain-ai.github.io', 'reference.langchain.com', 'blog.langchain.com',
  'docs.anthropic.com', 'platform.claude.com', 'anthropic.com', 'platform.openai.com', 'openai.com', 'ai.google.dev',
  'ollama.com', 'docs.ollama.com', 'huggingface.co', 'sbert.net', 'arxiv.org', 'aclanthology.org',
  'postgresql.org', 'qdrant.tech', 'milvus.io', 'faiss.ai', 'weaviate.io',
  'docs.docker.com', 'docker.com', 'git-scm.com', 'conventionalcommits.org', 'semver.org', 'docs.github.com', 'github.com',
  'trunkbaseddevelopment.com', 'opentelemetry.io', 'langfuse.com', 'prometheus.io', 'grafana.com',
  'owasp.org', 'genai.owasp.org', 'nist.gov', 'modelcontextprotocol.io', 'jsonrpc.org', 'html.spec.whatwg.org',
  'developer.mozilla.org', 'rfc-editor.org', 'datatracker.ietf.org', 'docs.ragas.io', 'redis.io', 'kubernetes.io',
  'sre.google', 'artificialintelligenceact.eu', 'eur-lex.europa.eu', 'jsonschema.org', 'json-schema.org', 'yaml.org',
];
/* pgvector é referenciado como github.com/pgvector, já coberto por github.com. */

function dominioOficial(host) {
  return DOMINIOS_OFICIAIS.some((d) => host === d || host.endsWith(`.${d}`));
}

/* ================================================================ dados reais */

const IDS = await import(pathToFileURL(empacotar('src/data/ids.ts')).href);
const ADR_IDS = new Set(IDS.ADR_IDS);
const TOOL_IDS = new Set(IDS.TOOL_IDS);
const ENDPOINT_IDS = new Set(IDS.ENDPOINT_IDS);
const REPO_PATHS = new Set(IDS.REPO_PATHS);
const DOC_IDS = new Set(IDS.DOC_IDS);

/* -------------------------------------------------- 1. TypeScript isolado */
try {
  execFileSync('npx', ['tsc', '--noEmit', '--strict', '--target', 'ES2022', '--lib', 'ES2022,DOM',
    '--module', 'ESNext', '--moduleResolution', 'bundler', '--verbatimModuleSyntax',
    '--noUnusedLocals', '--noUnusedParameters', alvo], { stdio: 'pipe' });
} catch (e) {
  console.error('✗ TypeScript não compila:\n' + (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? ''));
  rmSync(temp, { recursive: true, force: true });
  process.exit(1);
}

/* -------------------------------------------------- 2. carregar o módulo */
const saida = join(temp, basename(alvo).replace(/\.ts$/, '.mjs'));
try {
  execFileSync('npx', ['esbuild', alvo, '--bundle', '--format=esm', `--outfile=${saida}`, '--log-level=error'], { stdio: 'pipe' });
} catch (e) {
  console.error('✗ esbuild falhou:\n' + (e.stderr?.toString() ?? ''));
  rmSync(temp, { recursive: true, force: true });
  process.exit(1);
}
const m = Object.values(await import(pathToFileURL(saida).href)).find((v) => v && typeof v === 'object' && 'sections' in v);
if (!m) { console.error('✗ o ficheiro não exporta um Module'); rmSync(temp, { recursive: true, force: true }); process.exit(1); }

/* -------------------------------------------------------- 3. regex de labs */
function normalize(code) {
  return code.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
}
function correrChecks(code, checks) {
  const flat = normalize(code);
  return checks.map((c) => {
    let re;
    try { re = new RegExp(c.re, c.flags ?? 'm'); } catch { return { id: c.id, ok: false, invalida: true }; }
    const hit = re.test(code) || re.test(flat);
    return { id: c.id, ok: c.forbid ? !hit : hit };
  });
}

/* =================================================================== id/number/part */

const ficheiro = basename(alvo);
const slug = ficheiro.replace(/^m\d\d-/, '').replace(/\.ts$/, '');
const numeroFicheiro = parseInt(ficheiro.slice(1, 3), 10);

ok(m.id === slug, `id="${m.id}" não bate com o slug do ficheiro "${slug}"`);

const entrada = MODULO_POR_ID.get(m.id);
ok(entrada, `módulo "${m.id}" não está na tabela de módulos do CONTRATO.md`);
if (entrada) {
  ok(m.number === entrada.number, `number=${m.number} mas a tabela do CONTRATO diz ${entrada.number}`);
  ok(m.part === entrada.part, `part="${m.part}" mas a tabela do CONTRATO diz "${entrada.part}"`);
  ok(numeroFicheiro === entrada.number, `o nome do ficheiro indica o número ${numeroFicheiro} mas a tabela diz ${entrada.number}`);
}
ok(PARTES.includes(m.part), `part inválida: "${m.part}"`);

/* ======================================================================== volume */

ok(m.goals.length >= 4 && m.goals.length <= 6, `${m.goals.length} objectivos (esperado 4 a 6)`);
ok(m.sections.length >= 5 && m.sections.length <= 7, `${m.sections.length} secções (esperado 5 a 7)`);
ok(m.quiz.length >= 8 && m.quiz.length <= 10, `${m.quiz.length} perguntas (esperado 8 a 10)`);
ok(m.exercises.length >= 4 && m.exercises.length <= 6, `${m.exercises.length} exercícios (esperado 4 a 6)`);
ok(m.labs.length >= 2 && m.labs.length <= 3, `${m.labs.length} laboratórios (esperado 2 a 3)`);
ok(m.useCases.length >= 1 && m.useCases.length <= 2, `${m.useCases.length} casos de uso (esperado 1 a 2)`);
ok(m.minutes >= 55 && m.minutes <= 110, `minutes=${m.minutes} (esperado 55 a 110)`);
ok(m.tags.length >= 3 && m.tags.length <= 6, `${m.tags.length} tags (esperado 3 a 6)`);

{
  const segs = [...new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(m.icon ?? '')];
  ok(segs.length === 1, `icon="${m.icon}" não é um único emoji (${segs.length} segmentos)`);
  ok(/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(m.icon ?? ''), `icon="${m.icon}" não parece ser um emoji`);
}

const idsSec = m.sections.map((s) => s.id);
ok(new Set(idsSec).size === idsSec.length, 'ids de secção repetidos dentro do módulo');
for (const s of m.sections) {
  ok(s.blocks.length >= 8 && s.blocks.length <= 22, `secção "${s.id}": ${s.blocks.length} blocos (esperado 8 a 22)`);
}

const blocos = m.sections.flatMap((s) => s.blocks);
const tipos = blocos.map((b) => b.type);
const conta = (t) => tipos.filter((x) => x === t).length;

/* ------------------------------------------------------------ mínimos de blocos */

ok(conta('flow') >= 1, 'sem nenhum bloco `flow`');
ok(conta('diagram') >= 1, 'sem nenhum bloco `diagram`');
ok(conta('code') >= 4, `só ${conta('code')} blocos \`code\` (mínimo 4)`);
ok(conta('run') >= 2, `só ${conta('run')} blocos \`run\` (mínimo 2)`);
ok(conta('table') >= 1, 'sem nenhum bloco `table`');
ok(conta('adr') >= 1, 'sem nenhum bloco `adr`');

const callouts = blocos.filter((b) => b.type === 'callout');
ok(callouts.length >= 3, `só ${callouts.length} callouts (mínimo 3)`);
ok(callouts.some((c) => c.tone === 'trap'), 'sem callout de tom "trap" — falta o erro clássico do módulo');
ok(callouts.some((c) => c.tone === 'prod'), 'sem callout de tom "prod"');

for (const s of m.sections) {
  if (s.blocks.length > 6) {
    ok(s.blocks.some((b) => b.type === 'refs'), `secção "${s.id}": tem ${s.blocks.length} blocos (>6) mas nenhum \`refs\``);
  }
}

/* --------------------------------------------------------------- extras por parte */

switch (m.part) {
  case 'fundamentos':
    ok(conta('prompt') >= 1, 'parte "fundamentos": falta um bloco `prompt`');
    break;
  case 'rag':
    ok(conta('retrieval') >= 1, 'parte "rag": falta um bloco `retrieval`');
    ok(conta('formula') >= 1, 'parte "rag": falta uma `formula`');
    break;
  case 'orquestracao': {
    const grafos = blocos.filter((b) => b.type === 'graph');
    ok(grafos.length >= 1, 'parte "orquestracao": falta um bloco `graph`');
    ok(grafos.some((g) => (g.graph.runs?.length ?? 0) >= 2), 'parte "orquestracao": nenhum `graph` tem pelo menos duas `runs`');
    ok(conta('tool') >= 1 || conta('prompt') >= 1, 'parte "orquestracao": falta um bloco `tool` ou `prompt`');
    break;
  }
  case 'avaliacao':
    ok(conta('eval') >= 1, 'parte "avaliacao": falta um bloco `eval`');
    ok(conta('formula') >= 1, 'parte "avaliacao": falta uma `formula`');
    break;
  case 'producao':
    ok(conta('trace') >= 1 || conta('eval') >= 1, 'parte "producao": falta um bloco `trace` ou `eval`');
    ok(blocos.some((b) => b.type === 'code' && ['bash', 'yaml', 'dockerfile', 'toml'].includes(b.lang ?? '')), 'parte "producao": falta um bloco `code` em bash, yaml, dockerfile ou toml');
    break;
  case 'balcao':
    ok(conta('graph') >= 1, 'parte "balcao": falta um bloco `graph`');
    ok(conta('trace') >= 1, 'parte "balcao": falta um bloco `trace`');
    ok(conta('eval') >= 1, 'parte "balcao": falta um bloco `eval`');
    break;
}

/* -------------------------------------------------------------------- widgets */

const widgetsUsados = blocos.filter((b) => b.type === 'widget').map((b) => b.id);
const atribuidos = entrada?.widgets ?? [];
for (const w of widgetsUsados) {
  ok(WIDGET_IDS.has(w), `widget "${w}" não existe em types.ts`);
  ok(atribuidos.includes(w), `widget "${w}" usado neste módulo mas o CONTRATO atribui-o a outro módulo (ou a nenhum)`);
}
for (const w of atribuidos) {
  ok(widgetsUsados.includes(w), `widget "${w}" está atribuído a este módulo mas não é usado`);
}

/* ============================================================================ ids */

const idsQ = m.quiz.map((q) => q.id);
ok(new Set(idsQ).size === idsQ.length, 'ids de pergunta repetidos');
for (const q of m.quiz) {
  ok(new RegExp(`^q-${m.id}-\\d\\d$`).test(q.id), `pergunta com id fora do padrão q-${m.id}-NN: "${q.id}"`);
  ok(q.options.length >= 4, `${q.id}: menos de 4 opções`);
  ok(q.answer.length >= 1, `${q.id}: sem resposta`);
  for (const a of q.answer) ok(a >= 0 && a < q.options.length, `${q.id}: índice de resposta ${a} fora das opções`);
  if (q.why) ok(q.why.length === q.options.length, `${q.id}: "why" tem ${q.why.length} itens mas "options" tem ${q.options.length}`);
}
ok(m.quiz.filter((q) => q.answer.length > 1).length >= 2, 'menos de duas perguntas com resposta múltipla (answer.length > 1)');

const idsE = m.exercises.map((e) => e.id);
ok(new Set(idsE).size === idsE.length, 'ids de exercício repetidos');
for (const e of m.exercises) {
  ok(new RegExp(`^e-${m.id}-\\d\\d$`).test(e.id), `exercício com id fora do padrão e-${m.id}-NN: "${e.id}"`);
  if (e.kind === 'input') ok(e.accept && e.accept.length >= 1, `${e.id}: exercício "input" sem "accept"`);
}

const idsL = m.labs.map((l) => l.id);
ok(new Set(idsL).size === idsL.length, 'ids de lab repetidos');
for (const l of m.labs) {
  ok(new RegExp(`^lab-${m.id}-\\d\\d$`).test(l.id), `lab com id fora do padrão lab-${m.id}-NN: "${l.id}"`);
  ok(l.moduleId === m.id, `${l.id}: moduleId="${l.moduleId}" devia ser "${m.id}"`);
}

const idsU = m.useCases.map((u) => u.id);
ok(new Set(idsU).size === idsU.length, 'ids de caso de uso repetidos');
for (const u of m.useCases) {
  ok(new RegExp(`^uc-${m.id}-\\d\\d$`).test(u.id), `caso de uso com id fora do padrão uc-${m.id}-NN: "${u.id}"`);
  ok(u.diagram, `${u.id}: sem diagrama`);
}

function checarIds(tipo, prefixo, itens, extractId) {
  const ids = itens.map(extractId);
  ok(new Set(ids).size === ids.length, `ids de ${tipo} repetidos dentro do módulo`);
  for (const id of ids) {
    ok(new RegExp(`^${prefixo}-${m.id}-\\d\\d$`).test(id), `${tipo} com id fora do padrão ${prefixo}-${m.id}-NN: "${id}"`);
  }
}
checarIds('fluxo', 'fl', blocos.filter((b) => b.type === 'flow'), (b) => b.flow.id);
checarIds('árvore de decisão', 'dt', blocos.filter((b) => b.type === 'decision'), (b) => b.tree.id);
checarIds('bloco run', 'run', blocos.filter((b) => b.type === 'run'), (b) => b.run.id);
checarIds('fórmula', 'f', blocos.filter((b) => b.type === 'formula'), (b) => b.formula.id);
checarIds('prompt', 'pr', blocos.filter((b) => b.type === 'prompt'), (b) => b.prompt.id);
checarIds('retrieval', 'rt', blocos.filter((b) => b.type === 'retrieval'), (b) => b.retrieval.id);
checarIds('graph', 'gr', blocos.filter((b) => b.type === 'graph'), (b) => b.graph.id);
checarIds('trace', 'tr', blocos.filter((b) => b.type === 'trace'), (b) => b.trace.id);
checarIds('eval', 'ev', blocos.filter((b) => b.type === 'eval'), (b) => b.eval.id);

/* ================================================================ referências cruzadas */

for (const b of blocos) {
  if (b.type === 'adr') ok(ADR_IDS.has(b.ref), `bloco adr: "${b.ref}" não existe em src/data/adr.ts`);
  if (b.type === 'tool') ok(TOOL_IDS.has(b.ref), `bloco tool: "${b.ref}" não existe em src/data/ferramentas.ts`);
  if (b.type === 'endpoint') ok(ENDPOINT_IDS.has(b.ref), `bloco endpoint: "${b.ref}" não existe em src/data/api.ts`);
  if (b.type === 'file') {
    ok(REPO_PATHS.has(b.ref), `bloco file: "${b.ref}" não está em REPO_PATHS (src/data/ids.ts)`);
    ok(!b.lines, `bloco file "${b.ref}": não uses \`lines\` — os ficheiros do laboratório ainda podem mudar`);
  }
  if (b.type === 'retrieval') {
    for (const h of b.retrieval.hits) ok(DOC_IDS.has(h.doc), `retrieval "${b.retrieval.id}": documento "${h.doc}" não existe no corpus`);
    ok(['denso', 'bm25', 'hibrido', 'rerank'].includes(b.retrieval.method), `retrieval "${b.retrieval.id}": método inválido`);
  }
  if (b.type === 'lab') ok(m.labs.some((l) => l.id === b.ref), `bloco lab: "${b.ref}" não é um lab deste módulo`);
  if (b.type === 'widget') ok(WIDGET_IDS.has(b.id), `widget "${b.id}" não é um WidgetId real`);
}

/* ============================================================== coerência interna */

for (const b of blocos.filter((x) => x.type === 'graph')) {
  const g = b.graph;
  const ids = new Set(g.nodes.map((n) => n.id));
  ok(ids.size === g.nodes.length, `graph "${g.id}": ids de nó repetidos`);
  ok(ids.has(g.entry), `graph "${g.id}": entry "${g.entry}" não existe nos nodes`);
  for (const n of g.nodes) if (n.kind) ok(GRAPH_NODE_KINDS.includes(n.kind), `graph "${g.id}": kind de nó inválido "${n.kind}"`);
  for (const e of g.edges) {
    ok(ids.has(e.from), `graph "${g.id}": aresta de "${e.from}" inexistente`);
    ok(ids.has(e.to), `graph "${g.id}": aresta para "${e.to}" inexistente`);
  }
  for (const r of g.runs ?? []) {
    for (const grupo of r.path) {
      for (const passo of grupo) ok(ids.has(passo), `graph "${g.id}", run "${r.label}": nó "${passo}" inexistente`);
    }
  }
}

for (const b of blocos.filter((x) => x.type === 'trace')) {
  const t = b.trace;
  const ids = new Set(t.spans.map((s) => s.id));
  ok(ids.size === t.spans.length, `trace "${t.id}": ids de span repetidos`);
  for (const s of t.spans) {
    if (s.parent !== undefined) ok(ids.has(s.parent), `trace "${t.id}": span "${s.id}" tem parent "${s.parent}" inexistente`);
    if (s.kind) ok(SPAN_KINDS.includes(s.kind), `trace "${t.id}": kind de span inválido "${s.kind}"`);
  }
}

for (const b of blocos.filter((x) => x.type === 'decision')) {
  const t = b.tree;
  const ids = new Set(t.nodes.map((n) => n.id));
  ok(ids.has(t.start), `árvore "${t.id}": start "${t.start}" inexistente`);
  for (const n of t.nodes) {
    if (n.options) {
      for (const o of n.options) ok(ids.has(o.next), `árvore "${t.id}": next "${o.next}" inexistente`);
    } else {
      ok(n.answer, `árvore "${t.id}": folha "${n.id}" sem answer`);
    }
  }
}

const diagramas = [
  ...blocos.filter((b) => b.type === 'diagram').map((b) => ({ d: b.diagram, onde: 'diagram' })),
  ...m.useCases.map((u) => ({ d: u.diagram, onde: u.id })).filter((x) => x.d),
];
for (const { d, onde } of diagramas) {
  const rot = `diagrama (${onde}) "${d.title ?? '?'}"`;
  const ids = new Set(d.nodes.map((n) => n.id));
  ok(ids.size === d.nodes.length, `${rot}: ids de nó repetidos`);
  for (const n of d.nodes) {
    ok(n.col >= 0 && n.col + (n.span ?? 1) - 1 < d.cols, `${rot}: nó "${n.id}" fora das colunas (cols=${d.cols})`);
    ok(n.row >= 0 && n.row < d.rows, `${rot}: nó "${n.id}" fora das linhas (rows=${d.rows})`);
    if (n.kind) ok(NODE_KINDS.includes(n.kind), `${rot}: kind de nó inválido "${n.kind}"`);
  }
  for (const e of d.edges ?? []) {
    ok(ids.has(e.from), `${rot}: aresta de "${e.from}" inexistente`);
    ok(ids.has(e.to), `${rot}: aresta para "${e.to}" inexistente`);
  }
  for (const z of d.zones ?? []) {
    if (z.tone) ok(ZONE_TONES.includes(z.tone), `${rot}: zone tone inválido "${z.tone}"`);
    ok(z.col + z.colSpan <= d.cols, `${rot}: zona "${z.id}" excede as colunas`);
    ok(z.row + z.rowSpan <= d.rows, `${rot}: zona "${z.id}" excede as linhas`);
  }
}

for (const b of blocos.filter((x) => x.type === 'flow')) {
  const f = b.flow;
  const ids = new Set(f.lanes.map((l) => l.id));
  ok(ids.size === f.lanes.length, `fluxo "${f.id}": ids de pista repetidos`);
  for (const l of f.lanes) if (l.kind) ok(LANE_KINDS.includes(l.kind), `fluxo "${f.id}": lane kind inválido "${l.kind}"`);
  for (const s of f.steps) {
    ok(ids.has(s.from), `fluxo "${f.id}": passo de "${s.from}" inexistente`);
    ok(ids.has(s.to), `fluxo "${f.id}": passo para "${s.to}" inexistente`);
    if (s.kind) ok(STEP_KINDS.includes(s.kind), `fluxo "${f.id}": step kind inválido "${s.kind}"`);
  }
}

for (const b of blocos) {
  if (b.type === 'callout') ok(TONS.includes(b.tone), `tom de callout inválido: "${b.tone}"`);
  if (b.type === 'code') {
    ok(LANGS.includes(b.lang ?? 'text'), `code: lang inválida "${b.lang}"`);
    ok(b.code.trim().length > 0, 'bloco code vazio');
  }
  if (b.type === 'table') for (const r of b.rows) ok(r.length === b.head.length, `table: linha com ${r.length} células, head tem ${b.head.length}`);
  if (b.type === 'refs') ok(b.items.length >= 2 && b.items.length <= 4, `refs: ${b.items.length} itens (esperado 2 a 4)`);
}

/* =========================================================================== labs */

for (const l of m.labs) {
  for (const c of l.checks) {
    try { new RegExp(c.re, c.flags ?? 'm'); } catch { erros.push(`${l.id}/${c.id}: expressão regular "${c.re}" inválida`); }
  }
  const rsSolucao = correrChecks(l.solution, l.checks);
  const falham = rsSolucao.filter((r) => !r.ok).map((r) => r.id);
  ok(falham.length === 0, `${l.id}: a SOLUÇÃO falha as verificações [${falham.join(', ')}] — corrige a solução ou as expressões`);

  const rsStarter = correrChecks(l.starter, l.checks);
  const starterFalhaAlguma = rsStarter.some((r) => !r.ok);
  ok(starterFalhaAlguma, `${l.id}: o STARTER já passa TODAS as verificações — não sobra nada para o aluno fazer`);
}

/* ============================================================================ refs */

const RE_HTTPS = /^https:\/\//;
const todasAsRefs = [];
for (const b of blocos) {
  if (b.type === 'refs') for (const r of b.items) todasAsRefs.push(r);
}
for (const q of m.quiz) for (const r of q.refs ?? []) todasAsRefs.push(r);
for (const u of m.useCases) for (const r of u.refs ?? []) todasAsRefs.push(r);

for (const r of todasAsRefs) {
  ok(RE_HTTPS.test(r.url), `referência "${r.label}" não usa https: ${r.url}`);
  try {
    const host = new URL(r.url).host;
    ok(dominioOficial(host), `referência "${r.label}": domínio "${host}" não está na lista de domínios permitidos do CONTRATO`);
  } catch {
    erros.push(`referência "${r.label}": URL inválido "${r.url}"`);
  }
}
{
  const contagem = new Map();
  for (const r of todasAsRefs) contagem.set(r.url, (contagem.get(r.url) ?? 0) + 1);
  for (const [url, n] of contagem) ok(n <= 3, `URL repetido ${n} vezes no módulo (máximo 3): ${url}`);
}

/* =========================================================================== texto */

const RE_EMOJI = /\p{Extended_Pictographic}/u;
const RE_VOCE = /(^|[^\p{L}])voc[êe]s?(?!\p{L})/iu;

const textos = [];
const push = (t, onde) => { if (typeof t === 'string' && t.length > 0) textos.push({ t, onde }); };
/** Texto «dentro do mundo» (mensagens de clientes, respostas do assistente): pode tratar por você. */
const pushMundo = (t, onde) => { if (typeof t === 'string' && t.length > 0) textos.push({ t, onde, mundo: true }); };
const pushMd = (t, onde) => { push(t, onde); if (typeof t === 'string') textosMarkdown.push({ t, onde }); };
const textosMarkdown = [];

push(m.title, 'title'); push(m.subtitle, 'subtitle');
m.goals.forEach((g, i) => push(g, `goals[${i}]`));
m.tags.forEach((g, i) => push(g, `tags[${i}]`));

for (const s of m.sections) {
  push(s.title, `${s.id}.title`);
  for (const b of s.blocks) {
    const onde = `${s.id}/${b.type}`;
    switch (b.type) {
      case 'p': pushMd(b.text, onde); break;
      case 'h': push(b.text, onde); break;
      case 'list': b.items.forEach((x) => push(x, onde)); break;
      case 'code': push(b.caption, onde); break;
      case 'table': b.head.forEach((x) => push(x, onde)); b.rows.forEach((r) => r.forEach((x) => push(x, onde))); push(b.caption, onde); break;
      case 'callout': push(b.title, onde); pushMd(b.text, onde); break;
      case 'steps': b.items.forEach((x) => { push(x.title, onde); push(x.text, onde); }); break;
      case 'terms': b.items.forEach((x) => { push(x.term, onde); push(x.def, onde); }); break;
      case 'compare':
        push(b.left.title, onde); b.left.items.forEach((x) => push(x, onde));
        push(b.right.title, onde); b.right.items.forEach((x) => push(x, onde));
        break;
      case 'diagram':
        push(b.diagram.title, onde); push(b.diagram.caption, onde);
        b.diagram.nodes.forEach((n) => { push(n.label, onde); push(n.sub, onde); });
        (b.diagram.edges ?? []).forEach((e) => push(e.label, onde));
        (b.diagram.zones ?? []).forEach((z) => push(z.label, onde));
        break;
      case 'flow':
        push(b.flow.title, onde); push(b.flow.intro, onde); push(b.flow.outro, onde);
        b.flow.lanes.forEach((l) => { push(l.label, onde); push(l.sub, onde); });
        b.flow.steps.forEach((st) => { push(st.label, onde); push(st.detail, onde); });
        break;
      case 'decision':
        push(b.tree.title, onde); push(b.tree.intro, onde);
        b.tree.nodes.forEach((n) => {
          push(n.question, onde); push(n.answer, onde); push(n.detail, onde);
          (n.options ?? []).forEach((o) => { push(o.label, onde); push(o.note, onde); });
        });
        break;
      case 'tools': b.items.forEach((x) => { push(x.name, onde); push(x.role, onde); push(x.badge, onde); }); break;
      case 'refs': b.items.forEach((x) => push(x.label, onde)); break;
      case 'prompt':
        push(b.prompt.title, onde); push(b.prompt.brief, onde); push(b.prompt.note, onde);
        b.prompt.messages.forEach((msg) => { pushMundo(msg.text, onde); push(msg.note, onde); });
        break;
      case 'retrieval':
        push(b.retrieval.title, onde); push(b.retrieval.brief, onde); push(b.retrieval.note, onde);
        pushMundo(b.retrieval.query, onde); b.retrieval.hits.forEach((h) => pushMundo(h.texto, onde));
        break;
      case 'graph':
        push(b.graph.title, onde); push(b.graph.brief, onde); push(b.graph.note, onde);
        b.graph.nodes.forEach((n) => { push(n.label, onde); push(n.sub, onde); });
        b.graph.edges.forEach((e) => push(e.label, onde));
        (b.graph.channels ?? []).forEach((c) => push(c.nota, onde));
        (b.graph.runs ?? []).forEach((r) => { push(r.label, onde); push(r.note, onde); push(r.outcome, onde); });
        break;
      case 'trace':
        push(b.trace.title, onde); push(b.trace.brief, onde); push(b.trace.note, onde);
        b.trace.spans.forEach((sp) => { push(sp.name, onde); push(sp.detail, onde); });
        break;
      case 'eval':
        push(b.eval.title, onde); push(b.eval.brief, onde); push(b.eval.note, onde); push(b.eval.metric, onde);
        b.eval.cases.forEach((c) => { pushMundo(c.input, onde); pushMundo(c.expect, onde); (c.rubric ?? []).forEach((x) => push(x, onde)); pushMundo(c.got, onde); });
        break;
      case 'formula':
        push(b.formula.title, onde); push(b.formula.reading, onde); push(b.formula.note, onde);
        b.formula.where.forEach((w) => push(w.means, onde));
        break;
      default: break;
    }
  }
}

for (const q of m.quiz) {
  push(q.prompt, `${q.id}.prompt`);
  q.options.forEach((o, i) => push(o, `${q.id}.options[${i}]`));
  push(q.explain, `${q.id}.explain`);
  (q.why ?? []).forEach((w, i) => push(w, `${q.id}.why[${i}]`));
}
for (const e of m.exercises) {
  push(e.title, `${e.id}.title`); push(e.statement, `${e.id}.statement`);
  push(e.hint, `${e.id}.hint`); push(e.solution, `${e.id}.solution`);
}
for (const l of m.labs) {
  push(l.title, `${l.id}.title`); push(l.brief, `${l.id}.brief`);
  l.hints.forEach((h, i) => push(h, `${l.id}.hints[${i}]`));
  l.checks.forEach((c) => { push(c.label, `${l.id}.checks`); push(c.why, `${l.id}.checks`); });
}
for (const u of m.useCases) {
  push(u.title, `${u.id}.title`); push(u.scenario, `${u.id}.scenario`);
  u.requirements.forEach((r, i) => push(r, `${u.id}.requirements[${i}]`));
  (u.constraints ?? []).forEach((r, i) => push(r, `${u.id}.constraints[${i}]`));
  u.approach.forEach((a, i) => { push(a.title, `${u.id}.approach[${i}]`); push(a.text, `${u.id}.approach[${i}]`); });
  push(u.solution, `${u.id}.solution`);
  u.takeaways.forEach((r, i) => push(r, `${u.id}.takeaways[${i}]`));
  u.rejected.forEach((r, i) => { push(r.option, `${u.id}.rejected[${i}]`); push(r.why, `${u.id}.rejected[${i}]`); });
  push(u.costNote, `${u.id}.costNote`);
}

for (const { t, onde, mundo } of textos) {
  ok(!RE_EMOJI.test(t), `${onde}: emoji no corpo do texto — «${t.slice(0, 70)}»`);
  if (!mundo) ok(!RE_VOCE.test(t), `${onde}: usa "você" na prosa do tutorial (usa a 2.ª pessoa) — «${t.slice(0, 70)}»`);
}
for (const { t, onde } of textosMarkdown) {
  const semCodigo = t.replace(/`[^`]*`/g, ''); // inline code pode conter #, - ou | sem ser markdown
  ok(!/^\s*#{1,6}\s/m.test(semCodigo), `${onde}: título markdown (#) dentro de texto — «${t.slice(0, 70)}»`);
  ok(!/^\s*[-*]\s/m.test(semCodigo), `${onde}: lista markdown (- ) dentro de texto — «${t.slice(0, 70)}»`);
  ok(!/\|/.test(semCodigo), `${onde}: caractere de tabela markdown (|) dentro de texto — «${t.slice(0, 70)}»`);
}

/* ====================================================== Python: blocos run e labs */

function correrPython(codigo) {
  const f = join(temp, `run-${Math.random().toString(36).slice(2, 8)}.py`);
  writeFileSync(f, codigo, 'utf8');
  try {
    const out = execFileSync('python3', [f], {
      stdio: 'pipe', timeout: 60000,
      env: { ...process.env, PYTHONPATH: 'laboratorio/src', PYTHONHASHSEED: '0', PYTHONIOENCODING: 'utf-8' },
    });
    return { ok: true, saida: out.toString('utf8') };
  } catch (e) {
    return { ok: false, saida: (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '') };
  }
}
const normSaida = (t) => t.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();

if (!process.env.SEM_PYTHON) {
  for (const b of blocos.filter((x) => x.type === 'run')) {
    const r = b.run;
    const res = correrPython(r.code);
    if (!res.ok) { erros.push(`run "${r.id}": o código falha em Python:\n${res.saida.split('\n').slice(-6).join('\n')}`); continue; }
    ok(r.expected !== undefined && r.expected.trim().length > 0, `run "${r.id}": sem \`expected\``);
    if (r.expected && !r.plot) {
      ok(normSaida(res.saida) === normSaida(r.expected),
        `run "${r.id}": \`expected\` não é a saída real.\n    real:     ${JSON.stringify(normSaida(res.saida).slice(0, 400))}\n    expected: ${JSON.stringify(normSaida(r.expected).slice(0, 400))}`);
    }
    for (const pk of r.packages ?? []) ok(['matplotlib', 'pandas', 'scipy', 'scikit-learn', 'pydantic'].includes(pk), `run "${r.id}": pacote "${pk}" não disponível no Pyodide do tutorial`);
    ok(!/\b(requests|httpx|urllib\.request|langchain|langgraph|fastapi|openai|anthropic|ollama)\b/.test(r.code.replace(/#.*$/gm, '')), `run "${r.id}": importa uma biblioteca que não existe no browser — isto é um bloco \`code\`, não \`run\``);
  }
  for (const l of m.labs.filter((x) => x.executavel)) {
    ok(l.lang === 'python', `${l.id}: executavel=true só para labs em python`);
    const res = correrPython(l.solution);
    ok(res.ok, `${l.id}: a solução executável falha em Python:\n${res.saida.split('\n').slice(-6).join('\n')}`);
  }
}

/* ==================================================================================== */

rmSync(temp, { recursive: true, force: true });

for (const a of avisos) console.warn('! ' + a);

if (erros.length === 0) {
  console.log(`✓ ${m.id} — ${m.sections.length} secções, ${blocos.length} blocos, ${m.quiz.length} perguntas, ${m.exercises.length} exercícios, ${m.labs.length} labs, ${m.useCases.length} casos de uso. Contrato cumprido.`);
  process.exit(0);
}
console.error(`✗ ${m.id}: ${erros.length} problema(s)\n` + erros.map((e) => '  - ' + e).join('\n'));
process.exit(1);
