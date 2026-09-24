#!/usr/bin/env node
/* Gera src/content/todos.ts e o mapa de carregadores de src/content/index.ts a
   partir dos ficheiros mNN-slug.ts que existem. Corre-se sempre que um módulo
   novo entra; não há lista para manter à mão.
   Uso: npm run gerar-indice                                                  */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'src/content';

const ficheiros = readdirSync(DIR)
  .filter((f) => /^m\d\d-.+\.ts$/.test(f) && !/\.parte-[a-z]\.ts$/.test(f))
  .sort();

if (ficheiros.length === 0) {
  console.warn('! nenhum módulo em src/content/ — gero listas vazias.');
}

const modulos = ficheiros.map((f) => {
  const numero = f.slice(1, 3);
  const slug = f.replace(/^m\d\d-/, '').replace(/\.ts$/, '');
  const nome = `m${numero}`;
  const fonte = readFileSync(`${DIR}/${f}`, 'utf8');
  if (!new RegExp(`export const ${nome}\\b`).test(fonte)) {
    console.error(`✗ ${f} não exporta "${nome}"`);
    process.exit(1);
  }
  const idDeclarado = fonte.match(/\bid:\s*'([^']+)'/)?.[1];
  if (idDeclarado !== slug) {
    console.error(`✗ ${f}: o id declarado é "${idDeclarado}" e o nome do ficheiro diz "${slug}"`);
    process.exit(1);
  }
  return { nome, slug, ficheiro: f.replace(/\.ts$/, '') };
});

/* ------------------------------------------------------------------ todos.ts */

const todos = `/* GERADO POR scripts/gerar-indice.mjs — NÃO EDITAR À MÃO. */

import type { Module, UseCase, Question, Lab } from '../types';

${modulos.map((m) => `import { ${m.nome} } from './${m.ficheiro}';`).join('\n')}${modulos.length ? '\n\n' : ''}export const MODULOS: Module[] = [${modulos.map((m) => m.nome).join(', ')}];

export const TODOS_USE_CASES: UseCase[] = MODULOS.flatMap((m) => m.useCases);
export const TODOS_LABS: Lab[] = MODULOS.flatMap((m) => m.labs);
export const TODAS_PERGUNTAS: Question[] = MODULOS.flatMap((m) => m.quiz);

export const MODULO_DO_CASO: Record<string, Module> = Object.fromEntries(
  MODULOS.flatMap((m) => m.useCases.map((u) => [u.id, m] as const)),
);

export const MODULO_DO_LAB: Record<string, Module> = Object.fromEntries(
  MODULOS.flatMap((m) => m.labs.map((l) => [l.id, m] as const)),
);
`;

writeFileSync(`${DIR}/todos.ts`, todos, 'utf8');

/* ------------------------------------------------------------------ index.ts */

const indice = readFileSync(`${DIR}/index.ts`, 'utf8');
const inicio = indice.indexOf('const CARREGADORES');
const fim = indice.indexOf('};', inicio);
if (inicio < 0 || fim < 0) {
  console.error('✗ não encontrei o mapa CARREGADORES em src/content/index.ts');
  process.exit(1);
}

const mapa =
  'const CARREGADORES: Record<string, Carregador> = {\n' +
  modulos.map((m) => `  '${m.slug}': () => import('./${m.ficheiro}').then((x) => x.${m.nome}),\n`).join('');

writeFileSync(`${DIR}/index.ts`, indice.slice(0, inicio) + mapa + indice.slice(fim), 'utf8');

console.log(`✓ todos.ts e index.ts gerados com ${modulos.length} módulos: ${modulos.map((m) => m.slug).join(', ')}`);
