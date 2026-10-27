/* Testes da área «Entrevista»: escolha de perguntas e contrato de todos os tópicos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp = mkdtempSync(join(tmpdir(), 'teste-ent-'));
const pacote = (f) => {
  const out = join(temp, f.split('/').pop().replace(/\.ts$/, '.mjs'));
  execFileSync('node_modules/.bin/esbuild', [f, '--bundle', '--format=esm', `--outfile=${out}`, '--log-level=error']);
  return import(pathToFileURL(out).href);
};

const { escolherPerguntas, FORMATOS } = await pacote('src/entrevista/rondas.ts');
const { TABELA_TOPICOS } = await pacote('src/entrevista/blocos.ts');
const { verificar } = await import(pathToFileURL(join(process.cwd(), 'scripts/verificar-entrevista.mjs')).href);

const meta = (id, bloco, perguntas) => ({ id, numero: 1, bloco, titulo: id, resumo: '', icon: 'x', modulos: [], ficheiro: id, perguntas });
const P = (id, tipo, nivel = 'senior') => ({ id, tipo, nivel, titulo: id, minutos: 5 });
const TOPICOS = [
  meta('a', 'llm', [P('a1', 'conceito'), P('a2', 'conceito', 'pleno'), P('a3', 'tradeoff'), P('a4', 'debug')]),
  meta('b', 'rag', [P('b1', 'conceito'), P('b2', 'conceito', 'staff'), P('b3', 'tradeoff'), P('b4', 'codigo')]),
  meta('c', 'rondas', [P('c1', 'design', 'staff'), P('c2', 'design')]),
];

test('a escolha é determinista para a mesma semente', () => {
  const pedido = { partes: [{ tipos: ['conceito'], n: 3 }], nivel: 'senior', semente: 42 };
  assert.deepEqual(escolherPerguntas(TOPICOS, pedido), escolherPerguntas(TOPICOS, pedido));
});

test('respeita tipos, número e não repete perguntas', () => {
  const ids = escolherPerguntas(TOPICOS, { partes: [{ tipos: ['conceito'], n: 3 }, { tipos: ['tradeoff'], n: 2 }], nivel: 'senior', semente: 7 });
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.ok(ids.slice(3).every((i) => ['a3', 'b3'].includes(i)));
});

test('design restrito ao bloco de rondas e filtro de tópicos', () => {
  assert.ok(['c1', 'c2'].includes(escolherPerguntas(TOPICOS, { partes: [{ tipos: ['design'], n: 1, blocos: ['rondas'] }], nivel: 'staff', semente: 1 })[0]));
  const so = escolherPerguntas(TOPICOS, { partes: [{ tipos: ['conceito'], n: 4 }], nivel: 'senior', topicos: ['a'], semente: 3 });
  assert.deepEqual([...so].sort(), ['a1', 'a2']);
});

test('todos os formatos têm partes válidas', () => {
  for (const f of FORMATOS) assert.ok(f.partes.length > 0 && f.partes.every((p) => p.n > 0 && p.tipos.length), f.id);
});

test('existe um ficheiro por tópico da tabela e todos cumprem o contrato', async () => {
  const fic = readdirSync('src/entrevista/topicos').filter((f) => /^t\d\d-[a-z0-9-]+\.ts$/.test(f));
  assert.equal(fic.length, TABELA_TOPICOS.length, 'número de tópicos');
  for (const f of fic) {
    const { erros } = await verificar(join('src/entrevista/topicos', f));
    assert.deepEqual(erros, [], f);
  }
});
