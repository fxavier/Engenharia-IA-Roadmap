/* Invariantes GLOBAIS do conteúdo do tutorial «Balcão».
 *
 * `scripts/verificar.mjs` olha para UM módulo de cada vez (volume, forma, blocos
 * `run` executados em Python). Estes testes olham para o CONJUNTO: numeração,
 * partes, unicidade global de ids, coerência entre os ficheiros de dados e o
 * contrato (`ids.ts`), glossário, laboratórios e o índice leve.
 *
 * Usa o bundle que `npm run pretest` produz em `.tmp/`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

import { MODULOS } from '../.tmp/content/todos.mjs';
import { META } from '../.tmp/content/meta.mjs';
import { ENDPOINTS } from '../.tmp/data/api.mjs';
import { ADRS } from '../.tmp/data/adr.mjs';
import { FERRAMENTAS } from '../.tmp/data/ferramentas.mjs';
import { GLOSSARY } from '../.tmp/data/glossary.mjs';
import { ORCAMENTO_LATENCIA, TTFT_MS, TURNO_TOTAL_MS, INTENCOES, CONVERSAS } from '../.tmp/data/design.mjs';
import { ADR_TITULOS, TOOL_IDS, ENDPOINT_IDS, REPO_PATHS, DOC_IDS } from '../.tmp/data/ids.mjs';
import { POR_CAMINHO } from '../.tmp/data/repo/manifesto.mjs';
import { solutionPasses } from '../.tmp/lib/labs.mjs';

const POR_PARTE = { fundamentos: 6, rag: 6, orquestracao: 7, avaliacao: 5, producao: 6, balcao: 2 };
const blocos = (m) => m.sections.flatMap((s) => s.blocks);
const todos = () => MODULOS.flatMap((m) => blocos(m).map((b) => ({ m, b })));

function unicos(pares, rotulo) {
  const vistos = new Map();
  for (const [id, onde] of pares) {
    assert.equal(vistos.get(id), undefined, `${rotulo}: "${id}" repetido (${vistos.get(id)} e ${onde})`);
    vistos.set(id, onde);
  }
}

test('32 módulos numerados de 1 a 32, na ordem dos ficheiros', () => {
  assert.equal(MODULOS.length, 32);
  MODULOS.forEach((m, i) => assert.equal(m.number, i + 1, `${m.id}`));
  const ficheiros = readdirSync('src/content').filter((f) => /^m\d\d-.+\.ts$/.test(f) && !/\.parte-[a-z]\.ts$/.test(f));
  assert.equal(ficheiros.length, 32);
});

test('contagem por parte e partes contíguas', () => {
  const conta = {};
  for (const m of MODULOS) conta[m.part] = (conta[m.part] ?? 0) + 1;
  assert.deepEqual(conta, POR_PARTE);
  const ordem = MODULOS.map((m) => m.part).filter((p, i, a) => i === 0 || a[i - 1] !== p);
  assert.deepEqual(ordem, Object.keys(POR_PARTE));
});

test('ids únicos em todo o tutorial', () => {
  unicos(MODULOS.map((m) => [m.id, m.number]), 'módulo');
  unicos(MODULOS.flatMap((m) => m.quiz.map((q) => [q.id, m.id])), 'pergunta');
  unicos(MODULOS.flatMap((m) => m.exercises.map((e) => [e.id, m.id])), 'exercício');
  unicos(MODULOS.flatMap((m) => m.labs.map((l) => [l.id, m.id])), 'lab');
  unicos(MODULOS.flatMap((m) => m.useCases.map((u) => [u.id, m.id])), 'caso de uso');
  const chave = { run: 'run', flow: 'flow', graph: 'graph', trace: 'trace', eval: 'eval', prompt: 'prompt', retrieval: 'retrieval', formula: 'formula', decision: 'tree' };
  unicos(todos().filter(({ b }) => chave[b.type]).map(({ m, b }) => [b[chave[b.type]].id, m.id]), 'bloco');
});

test('o índice leve (meta) está sincronizado com os módulos', () => {
  assert.equal(META.length, MODULOS.length);
  for (const m of MODULOS) {
    const x = META.find((y) => y.id === m.id);
    assert.ok(x, m.id);
    assert.equal(x.title, m.title);
    assert.equal(x.sections.length, m.sections.length);
  }
});

test('ficheiros de dados cumprem ids.ts', () => {
  assert.deepEqual(ADRS.map((a) => a.id).sort(), Object.keys(ADR_TITULOS).sort());
  for (const a of ADRS) assert.equal(a.title, ADR_TITULOS[a.id], a.id);
  assert.deepEqual(FERRAMENTAS.map((f) => f.id).sort(), [...TOOL_IDS].sort());
  assert.deepEqual(ENDPOINTS.map((e) => e.id).sort(), [...ENDPOINT_IDS].sort());
  for (const p of REPO_PATHS) assert.ok(POR_CAMINHO[p], `REPO_PATH ausente do repositório gerado: ${p}`);
});

test('referências cruzadas dos módulos existem', () => {
  const adr = new Set(ADRS.map((a) => a.id));
  const tools = new Set(TOOL_IDS);
  const eps = new Set(ENDPOINT_IDS);
  const docs = new Set(DOC_IDS);
  for (const { m, b } of todos()) {
    if (b.type === 'adr') assert.ok(adr.has(b.ref), `${m.id}: ${b.ref}`);
    if (b.type === 'tool') assert.ok(tools.has(b.ref), `${m.id}: ${b.ref}`);
    if (b.type === 'endpoint') assert.ok(eps.has(b.ref), `${m.id}: ${b.ref}`);
    if (b.type === 'file') assert.ok(POR_CAMINHO[b.ref], `${m.id}: ${b.ref}`);
    if (b.type === 'retrieval') for (const h of b.retrieval.hits) assert.ok(docs.has(h.doc), `${m.id}: ${h.doc}`);
  }
});

test('cada ADR é referenciado por pelo menos um módulo', () => {
  const usados = new Set(todos().filter(({ b }) => b.type === 'adr').map(({ b }) => b.ref));
  const orfaos = ADRS.map((a) => a.id).filter((id) => !usados.has(id));
  assert.deepEqual(orfaos, [], `ADRs sem módulo: ${orfaos.join(', ')}`);
});

test('as soluções de todos os laboratórios passam as próprias verificações', () => {
  for (const m of MODULOS) for (const l of m.labs) assert.ok(solutionPasses(l), `${l.id}`);
});

test('glossário: termos únicos, «see» válidos, módulos válidos, ≥ 220 entradas', () => {
  assert.ok(GLOSSARY.length >= 220);
  const termos = new Set(GLOSSARY.map((g) => g.term.toLowerCase()));
  assert.equal(termos.size, GLOSSARY.length);
  const slugs = new Set(MODULOS.map((m) => m.id));
  for (const g of GLOSSARY) {
    for (const s of g.see ?? []) assert.ok(termos.has(s.toLowerCase()), `${g.term} → ${s}`);
    if (g.module) assert.ok(slugs.has(g.module), `${g.term}: módulo ${g.module}`);
  }
});

test('design: orçamento de latência e intenções coerentes', () => {
  assert.equal(TTFT_MS, ORCAMENTO_LATENCIA.filter((x) => x.antesDoPrimeiroToken).reduce((a, x) => a + x.ms, 0));
  assert.ok(TTFT_MS < 1500, `TTFT ${TTFT_MS} ms viola RNF-01`);
  assert.ok(TURNO_TOTAL_MS < 5000, `turno ${TURNO_TOTAL_MS} ms viola RNF-01`);
  assert.equal(INTENCOES.reduce((a, i) => a + i.peso, 0), 100);
  const tools = new Set(TOOL_IDS);
  const docs = new Set(DOC_IDS);
  for (const c of CONVERSAS) {
    for (const f of c.ferramentas) assert.ok(tools.has(f), `${c.id}: ${f}`);
    for (const d of c.docs) assert.ok(docs.has(d), `${c.id}: ${d}`);
  }
});

test('cada widget aparece exactamente num módulo', async () => {
  const vistos = new Map();
  for (const { m, b } of todos()) {
    if (b.type !== 'widget') continue;
    const antes = vistos.get(b.id);
    assert.ok(antes === undefined || antes === m.id, `${b.id} em ${antes} e ${m.id}`);
    vistos.set(b.id, m.id);
  }
  assert.equal(vistos.size, 29);
});
