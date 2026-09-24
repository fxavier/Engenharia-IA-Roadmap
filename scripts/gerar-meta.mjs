#!/usr/bin/env node
/* Gera src/content/meta.ts a partir dos módulos.
   O ficheiro gerado é leve (sem blocos de conteúdo) e é o que a barra lateral,
   a página inicial e o progresso carregam — os módulos em si só descarregam
   quando o leitor os abre.
   Uso: npm run gerar-meta                                                   */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'meta-'));
const saida = join(dir, 'conteudo.mjs');
execFileSync('npx', ['esbuild', 'src/content/todos.ts', '--bundle', '--format=esm', `--outfile=${saida}`, '--log-level=error'], { stdio: 'inherit' });
const { MODULOS } = await import(pathToFileURL(saida).href);
rmSync(dir, { recursive: true, force: true });

const meta = MODULOS.map((m) => ({
  id: m.id,
  number: m.number,
  part: m.part,
  title: m.title,
  subtitle: m.subtitle,
  icon: m.icon,
  minutes: m.minutes,
  tags: m.tags,
  goals: m.goals,
  sections: m.sections.map((s) => ({ id: s.id, title: s.title })),
  counts: {
    quiz: m.quiz.length,
    exercises: m.exercises.length,
    labs: m.labs.length,
    useCases: m.useCases.length,
    blocks: m.sections.reduce((a, s) => a + s.blocks.length, 0),
  },
}));

const conteudo = `/* GERADO POR scripts/gerar-meta.mjs — NÃO EDITAR À MÃO.
   Corre \`npm run gerar-meta\` depois de mexer em qualquer módulo. */

import type { PartId } from '../types';

export interface ModuleMeta {
  id: string;
  number: number;
  part: PartId;
  title: string;
  subtitle: string;
  icon: string;
  minutes: number;
  tags: string[];
  goals: string[];
  sections: { id: string; title: string }[];
  counts: { quiz: number; exercises: number; labs: number; useCases: number; blocks: number };
}

export const META: ModuleMeta[] = ${JSON.stringify(meta, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')};
`;

writeFileSync('src/content/meta.ts', conteudo, 'utf8');
console.log(`✓ src/content/meta.ts gerado com ${meta.length} módulos.`);
