#!/usr/bin/env node
/* Gera src/entrevista/meta.ts — o índice leve da área «Entrevista»: tópicos e
   a lista de perguntas (id, tipo, nível, título, minutos), sem respostas.
   A aplicação carrega este índice no arranque e só descarrega um tópico
   inteiro quando o leitor o abre ou quando uma simulação precisa dele.     */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'src/entrevista/topicos');
const temp = mkdtempSync(join(tmpdir(), 'meta-ent-'));

const ficheiros = readdirSync(DIR).filter((f) => /^t\d\d-[a-z0-9-]+\.ts$/.test(f)).sort();
const topicos = [];
for (const f of ficheiros) {
  const saida = join(temp, f.replace(/\.ts$/, '.mjs'));
  let t;
  try {
    execFileSync(join(RAIZ, 'node_modules/.bin/esbuild'), [join(DIR, f), '--bundle', '--format=esm', `--outfile=${saida}`, '--log-level=error'], { stdio: 'pipe' });
    ({ topico: t } = await import(pathToFileURL(saida).href));
  } catch (e) {
    console.warn(`  ${f}: não carrega (${String(e.message).split('\n')[0]}) — ignorado`);
    if (process.env.ESTRITO) process.exit(1);
    continue;
  }
  if (!t) { console.warn(`  ${f}: sem export «topico» — ignorado`); continue; }
  topicos.push({
    id: t.id,
    numero: t.numero,
    bloco: t.bloco,
    titulo: t.titulo,
    resumo: t.resumo,
    icon: t.icon,
    modulos: t.modulos,
    ficheiro: f.replace(/\.ts$/, ''),
    perguntas: t.perguntas.map((p) => ({ id: p.id, tipo: p.tipo, nivel: p.nivel, titulo: p.titulo, minutos: p.minutos })),
  });
}
topicos.sort((a, b) => a.numero - b.numero);
rmSync(temp, { recursive: true, force: true });

const corpo = `/* GERADO por scripts/gerar-meta-entrevista.mjs — não editar à mão. */

import type { BlocoEntrevistaId, NivelPergunta, TipoPergunta } from '../types';

export interface PerguntaMeta {
  id: string;
  tipo: TipoPergunta;
  nivel: NivelPergunta;
  titulo: string;
  minutos: number;
}

export interface TopicoMeta {
  id: string;
  numero: number;
  bloco: BlocoEntrevistaId;
  titulo: string;
  resumo: string;
  icon: string;
  modulos: string[];
  ficheiro: string;
  perguntas: PerguntaMeta[];
}

export const TOPICOS_META: TopicoMeta[] = ${JSON.stringify(topicos, null, 2)};
`;
writeFileSync(join(RAIZ, 'src/entrevista/meta.ts'), corpo);
const total = topicos.reduce((a, t) => a + t.perguntas.length, 0);
console.log(`meta da entrevista: ${topicos.length} tópicos, ${total} perguntas`);
