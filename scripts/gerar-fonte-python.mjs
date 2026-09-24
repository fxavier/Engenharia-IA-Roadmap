#!/usr/bin/env node
/* Gera src/data/balcao-fonte.ts a partir de laboratorio/src/balcao/{__init__,corpus,didactico}.py.

   O Pyodide escreve estes três ficheiros como o pacote `balcao` no seu sistema
   de ficheiros, para que o código que o leitor corre no browser use exactamente
   o mesmo runtime que o laboratório local usa. Um só código, duas execuções.

   Uso: npm run gerar-fonte                                                   */

import { readFileSync, writeFileSync } from 'node:fs';

const RAIZ = 'laboratorio/src/balcao';
const FICHEIROS = ['__init__.py', 'corpus.py', 'didactico.py'];
const DESTINO = 'src/data/balcao-fonte.ts';

/* Base64 em vez de template string: o código tem crases, `${`, aspas triplas e
   acentos, e qualquer escape manual seria uma fonte de erros silenciosos. */
const entradas = FICHEIROS.map((nome) => {
  const fonte = readFileSync(`${RAIZ}/${nome}`, 'utf8');
  const b64 = Buffer.from(fonte, 'utf8').toString('base64');
  return { nome, linhas: fonte.split('\n').length, pedacos: b64.match(/.{1,110}/g) ?? [] };
});

const conteudo = `/* GERADO POR scripts/gerar-fonte-python.mjs — NÃO EDITAR À MÃO.
   Origem: ${RAIZ}/{${FICHEIROS.join(',')}}.
   Corre \`npm run gerar-fonte\` depois de mexer no runtime. */

function decodificar(b64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

/** Os ficheiros do pacote \`balcao\`, tal como são escritos no sistema de ficheiros do Pyodide. */
export const BALCAO_PY: { nome: string; linhas: number; fonte: () => string }[] = [
${entradas.map((e) => `  {
    nome: '${e.nome}',
    linhas: ${e.linhas},
    fonte: () => decodificar([
${e.pedacos.map((p) => `      '${p}',`).join('\n')}
    ].join('')),
  },`).join('\n')}
];

export const BALCAO_PY_LINHAS = ${entradas.reduce((a, e) => a + e.linhas, 0)};
`;

writeFileSync(DESTINO, conteudo, 'utf8');
console.log(`✓ ${DESTINO}: ${entradas.map((e) => `${e.nome} (${e.linhas} linhas)`).join(', ')}`);
