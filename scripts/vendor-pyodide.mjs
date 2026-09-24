#!/usr/bin/env node
/* Põe o Pyodide em public/pyodide/ para o playground correr sem rede.
 *
 *   npm run vendor-pyodide              núcleo do interpretador (13 MB)
 *   npm run vendor-pyodide -- --wheels  núcleo + numpy, pandas, matplotlib e
 *                                       scikit-learn com as dependências (≈ 90 MB)
 *   npm run vendor-pyodide -- --dry-run mostra o que seria descarregado
 *
 * O núcleo vem de `node_modules/pyodide`, por isso a versão está sempre de
 * acordo com o `package.json`. Os wheels científicos são compilados para
 * WebAssembly e só existem no CDN da Pyodide — vêm de lá, com o sha256 do
 * `pyodide-lock.json` verificado ficheiro a ficheiro.
 *
 * Sem `--wheels`, o interpretador carrega localmente e os wheels descem do CDN
 * na primeira execução: a aplicação abre offline, o playground precisa de rede
 * uma vez. Com `--wheels`, tudo corre offline.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGEM = 'node_modules/pyodide';
const DESTINO = 'public/pyodide';

/** O que o playground carrega: ver `PACOTES_BASE` e os `packages` dos blocos `run`. */
const PACOTES = ['numpy', 'matplotlib'];

const FICHEIROS_NUCLEO = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

const argumentos = new Set(process.argv.slice(2));
const comWheels = argumentos.has('--wheels');
const simulacao = argumentos.has('--dry-run');

if (!existsSync(ORIGEM)) {
  console.error('✗ falta o pacote `pyodide`. Corre `npm install` primeiro.');
  process.exit(1);
}

const versao = JSON.parse(readFileSync(join(ORIGEM, 'package.json'), 'utf8')).version;
const CDN = `https://cdn.jsdelivr.net/pyodide/v${versao}/full/`;
const bloqueio = JSON.parse(readFileSync(join(ORIGEM, 'pyodide-lock.json'), 'utf8'));

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* ------------------------------------------------------------------ núcleo */

function copiarNucleo() {
  mkdirSync(DESTINO, { recursive: true });
  let bytes = 0;
  let copiados = 0;
  for (const f of FICHEIROS_NUCLEO) {
    const de = join(ORIGEM, f);
    if (!existsSync(de)) continue;
    if (!simulacao) copyFileSync(de, join(DESTINO, f));
    bytes += statSync(de).size;
    copiados += 1;
  }
  return { copiados, bytes };
}

/* ------------------------------------------------------- fecho transitivo */

/** Resolve as dependências declaradas no `pyodide-lock.json`, em profundidade. */
function fecho(nomes) {
  const pacotes = bloqueio.packages;
  const visto = new Set();
  const fila = [...nomes];
  const faltam = [];

  while (fila.length > 0) {
    const nome = fila.pop();
    if (visto.has(nome)) continue;
    const p = pacotes[nome];
    if (!p) {
      faltam.push(nome);
      continue;
    }
    visto.add(nome);
    for (const d of p.depends ?? []) fila.push(d);
  }
  return { nomes: [...visto].sort(), faltam };
}

/* ------------------------------------------------------------------ wheels */

async function descarregar(nome) {
  const p = bloqueio.packages[nome];
  const url = CDN + p.file_name;
  const alvo = join(DESTINO, p.file_name);

  if (existsSync(alvo)) {
    const sha = createHash('sha256').update(readFileSync(alvo)).digest('hex');
    if (sha === p.sha256) return { nome, estado: 'já estava', bytes: statSync(alvo).size };
  }

  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${nome}: HTTP ${resposta.status} em ${url}`);
  const dados = Buffer.from(await resposta.arrayBuffer());

  const sha = createHash('sha256').update(dados).digest('hex');
  if (sha !== p.sha256) {
    throw new Error(`${nome}: sha256 não bate certo com o pyodide-lock.json — descarga corrompida`);
  }

  writeFileSync(alvo, dados);
  return { nome, estado: 'descarregado', bytes: dados.length };
}

/* --------------------------------------------------------------------- main */

const nucleo = copiarNucleo();

if (!simulacao) {
  writeFileSync(
    'src/data/pyodide-versao.ts',
    '/* GERADO POR scripts/vendor-pyodide.mjs — NÃO EDITAR À MÃO. */\n\n' +
      `export const PYODIDE_VERSAO = '${versao}';\n` +
      `export const PYODIDE_CDN = '${CDN}';\n`,
    'utf8',
  );
}

console.log(`Pyodide ${versao}`);
console.log(`  núcleo: ${nucleo.copiados} ficheiros, ${mb(nucleo.bytes)}${simulacao ? ' (simulação)' : ''}`);

if (!comWheels) {
  console.log(`  wheels: do CDN à primeira execução (${CDN})`);
  console.log('\nPara correr também os pacotes offline:  npm run vendor-pyodide -- --wheels');
  process.exit(0);
}

const { nomes, faltam } = fecho(PACOTES);
if (faltam.length > 0) {
  console.error(`✗ pacotes que não existem nesta versão do Pyodide: ${faltam.join(', ')}`);
  process.exit(1);
}

const total = nomes.reduce((a, n) => a + (bloqueio.packages[n].file_size ?? 0), 0);
console.log(`  wheels: ${nomes.length} pacotes${total > 0 ? `, ${mb(total)}` : ''}`);
console.log(`    ${nomes.join(', ')}`);

if (simulacao) {
  console.log('\n(simulação: nada foi escrito)');
  process.exit(0);
}

let bytes = 0;
const falhas = [];
for (const nome of nomes) {
  try {
    const r = await descarregar(nome);
    bytes += r.bytes;
    process.stdout.write(`  · ${nome} ${r.estado} (${mb(r.bytes)})\n`);
  } catch (e) {
    falhas.push(`${nome}: ${e.message}`);
  }
}

if (falhas.length > 0) {
  console.error(`\n✗ ${falhas.length} pacote(s) não desceram:`);
  for (const f of falhas) console.error(`  ${f}`);
  console.error(
    '\nO CDN da Pyodide tem de estar acessível a partir desta máquina. Se estiveres atrás de um\n' +
      'proxy ou de uma lista de domínios permitidos, acrescenta cdn.jsdelivr.net e corre outra vez.\n' +
      'Sem os wheels locais, o playground continua a funcionar — vai buscá-los ao CDN no browser.',
  );
  process.exit(1);
}

/* O marcador é o que `src/lib/pyodide.ts` consulta para decidir entre local e CDN. */
writeFileSync(
  join(DESTINO, 'numpy-marcador.json'),
  `${JSON.stringify({ versao, pacotes: nomes, bytes, gerado: new Date().toISOString() }, null, 2)}\n`,
  'utf8',
);

console.log(`\n✓ ${nomes.length} wheels (${mb(bytes)}) em ${DESTINO}/. O playground corre offline.`);
