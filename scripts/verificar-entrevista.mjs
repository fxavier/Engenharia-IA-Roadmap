#!/usr/bin/env node
/* Verifica tópicos da área «Entrevista» contra o CONTRATO-ENTREVISTA.md.
   Uso: node scripts/verificar-entrevista.mjs src/entrevista/topicos/t13-hibrida-rerank.ts [...]
        node scripts/verificar-entrevista.mjs --todos
   Erros fazem sair com código 1; avisos não.                                  */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'verif-ent-'));

function empacotar(ficheiro) {
  const saida = join(temp, basename(ficheiro).replace(/\.tsx?$/, '') + '-' + Math.random().toString(36).slice(2, 8) + '.mjs');
  execFileSync(join(RAIZ, 'node_modules/.bin/esbuild'), [ficheiro, '--bundle', '--format=esm', `--outfile=${saida}`, '--log-level=error'], { stdio: 'pipe' });
  return saida;
}

const { TABELA_TOPICOS, ficheiroDoTopico } = await import(pathToFileURL(empacotar(join(RAIZ, 'src/entrevista/blocos.ts'))).href);
const { ADR_IDS } = await import(pathToFileURL(empacotar(join(RAIZ, 'src/data/ids.ts'))).href);

const MODULOS = new Set([
  'engenharia-ia', 'como-funciona-llm', 'apis-de-modelos', 'prompt-engineering', 'tool-calling', 'escolher-modelo',
  'embeddings', 'bases-vectoriais', 'ingestao-chunking', 'rag-basico', 'pesquisa-hibrida', 'rag-avancado',
  'langchain-lcel', 'langchain-rag', 'agentes', 'langgraph', 'langgraph-persistencia', 'memoria', 'multi-agente-mcp',
  'avaliacao-fundamentos', 'avaliar-rag', 'llm-como-juiz', 'avaliar-agentes', 'guardrails-seguranca',
  'fastapi-servico', 'git-fluxo', 'docker', 'ci-cd', 'observabilidade-llmops', 'custo-escala',
  'balcao-ponta-a-ponta', 'entrevista',
]);
const TIPOS = ['conceito', 'tradeoff', 'design', 'codigo', 'debug', 'comportamental'];
const NIVEIS = ['pleno', 'senior', 'staff'];
const BLOCOS_OK = ['p', 'h', 'list', 'code', 'table', 'callout', 'steps', 'compare', 'terms', 'diagram', 'adr', 'refs'];
const TONS = ['info', 'tip', 'warn', 'key', 'trap', 'prod'];
const LANGS = ['python', 'bash', 'sql', 'yaml', 'toml', 'json', 'http', 'dockerfile', 'text', 'ts', 'java', 'ini', 'diff', 'markdown', 'go'];
const NODE_KINDS = ['service', 'user', 'data', 'external', 'note', 'queue', 'decision', 'model', 'agent', 'tool', 'vector'];
const ZONE_TONES = ['cluster', 'namespace', 'service', 'data', 'edge', 'external', 'async', 'neutral', 'agente', 'rag', 'ci'];

export const DOMINIOS = [
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
  'sre.google', 'artificialintelligenceact.eu', 'eur-lex.europa.eu', 'json-schema.org', 'yaml.org',
  'scikit-learn.org', 'pytorch.org', 'docs.vllm.ai', 'mlflow.org', 'developers.google.com', 'research.google',
  'cnpd.pt', 'edpb.europa.eu', 'docs.aws.amazon.com', 'aws.amazon.com', 'martinfowler.com', 'dl.acm.org', 'developers.openai.com',
];
const dominioOk = (host) => DOMINIOS.some((d) => host === d || host.endsWith(`.${d}`));

const EMOJI = /\p{Extended_Pictographic}/u;
const palavras = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) ?? []).length;

function textoBloco(b) {
  switch (b.type) {
    case 'p': case 'h': return b.text;
    case 'list': return b.items.join(' ');
    case 'callout': return (b.title ?? '') + ' ' + b.text;
    case 'steps': return b.items.map((i) => i.title + ' ' + i.text).join(' ');
    case 'terms': return b.items.map((i) => i.term + ' ' + i.def).join(' ');
    case 'table': return [...b.head, ...b.rows.flat()].join(' ');
    case 'compare': return [b.left.title, ...b.left.items, b.right.title, ...b.right.items].join(' ');
    case 'diagram': return [b.diagram.title ?? '', b.diagram.caption ?? '', ...b.diagram.nodes.map((n) => n.label + ' ' + (n.sub ?? ''))].join(' ');
    default: return '';
  }
}

/** Todos os campos de texto (para marcação, links e emojis). */
function textosBloco(b) {
  switch (b.type) {
    case 'p': case 'h': return [b.text];
    case 'list': return b.items;
    case 'callout': return [b.title ?? '', b.text];
    case 'steps': return b.items.flatMap((i) => [i.title, i.text]);
    case 'terms': return b.items.flatMap((i) => [i.term, i.def]);
    case 'table': return [...b.head, ...b.rows.flat(), b.caption ?? ''];
    case 'compare': return [b.left.title, ...b.left.items, b.right.title, ...b.right.items];
    case 'diagram': return [b.diagram.title ?? '', b.diagram.caption ?? '', ...b.diagram.nodes.flatMap((n) => [n.label, n.sub ?? ''])];
    case 'refs': return b.items.map((r) => r.label);
    case 'code': return [b.caption ?? ''];
    default: return [];
  }
}

const ALVO_PALAVRAS = {
  conceito: [150, 450], tradeoff: [250, 600], debug: [250, 700], codigo: [120, 500],
  design: [350, 900], designGrande: [900, 2200], comportamental: [200, 500],
};
const ALVO_MIN = {
  conceito: [3, 6], tradeoff: [5, 10], debug: [6, 15], codigo: [12, 35], design: [12, 20], designGrande: [40, 50], comportamental: [4, 8],
};

export async function verificar(ficheiro) {
  const erros = [];
  const avisos = [];
  const ok = (c, m) => { if (!c) erros.push(m); };
  const av = (c, m) => { if (!c) avisos.push(m); };

  let mod;
  try {
    mod = await import(pathToFileURL(empacotar(ficheiro)).href);
  } catch (e) {
    return { erros: [`não compila: ${String(e.stderr ?? e.message).slice(0, 800)}`], avisos, stats: null };
  }
  const t = mod.topico;
  if (!t) return { erros: ['o ficheiro não exporta `topico`'], avisos, stats: null };

  const linha = TABELA_TOPICOS.find((x) => x.id === t.id);
  ok(!!linha, `id de tópico desconhecido: ${t.id}`);
  if (linha) {
    ok(t.numero === linha.numero, `numero ${t.numero} ≠ ${linha.numero}`);
    ok(t.bloco === linha.bloco, `bloco ${t.bloco} ≠ ${linha.bloco}`);
    ok(t.titulo === linha.titulo, `titulo «${t.titulo}» ≠ «${linha.titulo}»`);
    ok(basename(ficheiro) === ficheiroDoTopico(linha.numero, linha.id), `nome de ficheiro deve ser ${ficheiroDoTopico(linha.numero, linha.id)}`);
  }
  ok(typeof t.resumo === 'string' && t.resumo.length > 40, 'resumo em falta ou curto');
  ok(typeof t.icon === 'string' && EMOJI.test(t.icon) && [...t.icon].length <= 3, 'icon deve ser um emoji');
  ok(Array.isArray(t.modulos) && t.modulos.length >= 1, 'modulos do tópico em falta');
  for (const m of t.modulos ?? []) ok(MODULOS.has(m), `módulo desconhecido no tópico: ${m}`);
  ok(Array.isArray(t.essencial) && t.essencial.length >= 6 && t.essencial.length <= 10, `essencial: 6 a 10 linhas (tem ${t.essencial?.length})`);
  for (const e of t.essencial ?? []) av(e.length <= 240, `linha de essencial longa (${e.length}): ${e.slice(0, 60)}…`);

  const n = t.numero;
  const grandeDesign = n === 29 || n === 30;
  const ps = t.perguntas ?? [];
  const esperado = grandeDesign ? 6 : 10;
  ok(ps.length === esperado, `perguntas: ${esperado} (tem ${ps.length})`);

  const cont = Object.fromEntries(TIPOS.map((x) => [x, 0]));
  const niv = Object.fromEntries(NIVEIS.map((x) => [x, 0]));
  const ids = new Set();
  const titulos = new Set();
  let totalPalavras = 0;

  ps.forEach((p, i) => {
    const onde = `${p.id ?? `#${i + 1}`}`;
    const idEsperado = `p-${t.id}-${String(i + 1).padStart(2, '0')}`;
    ok(p.id === idEsperado, `${onde}: id deve ser ${idEsperado}`);
    ok(!ids.has(p.id), `${onde}: id repetido`); ids.add(p.id);
    ok(TIPOS.includes(p.tipo), `${onde}: tipo inválido ${p.tipo}`);
    ok(NIVEIS.includes(p.nivel), `${onde}: nivel inválido ${p.nivel}`);
    cont[p.tipo] = (cont[p.tipo] ?? 0) + 1;
    niv[p.nivel] = (niv[p.nivel] ?? 0) + 1;
    ok(typeof p.titulo === 'string' && p.titulo.length > 5 && p.titulo.length <= 90, `${onde}: titulo vazio ou > 90 caracteres`);
    ok(!/\.$/.test(p.titulo ?? ''), `${onde}: titulo não termina em ponto`);
    ok(!titulos.has(p.titulo), `${onde}: titulo repetido`); titulos.add(p.titulo);
    ok(typeof p.enunciado === 'string' && p.enunciado.length > 20, `${onde}: enunciado curto`);
    if (['design', 'debug', 'codigo'].includes(p.tipo)) ok(typeof p.contexto === 'string' && p.contexto.length > 40, `${onde}: contexto obrigatório em ${p.tipo}`);

    const chaveAlvo = p.tipo === 'design' && grandeDesign ? 'designGrande' : p.tipo;
    const [mn, mx] = ALVO_MIN[chaveAlvo] ?? [1, 60];
    ok(Number.isFinite(p.minutos) && p.minutos >= mn && p.minutos <= mx, `${onde}: minutos ${p.minutos} fora de ${mn}–${mx} para ${chaveAlvo}`);

    const r = p.rubrica ?? {};
    ok(Array.isArray(r.criterios) && r.criterios.length >= 3 && r.criterios.length <= 6, `${onde}: rubrica.criterios 3 a 6`);
    for (const k of ['fraco', 'solido', 'excelente']) ok(typeof r[k] === 'string' && r[k].length > 20, `${onde}: rubrica.${k} em falta`);
    ok(Array.isArray(p.seguimento) && p.seguimento.length >= 2 && p.seguimento.length <= 4, `${onde}: seguimento 2 a 4`);
    for (const s of p.seguimento ?? []) av(/\?\s*$/.test(s), `${onde}: seguimento sem «?»: ${s.slice(0, 50)}`);
    ok(Array.isArray(p.sinaisAlarme) && p.sinaisAlarme.length >= 2 && p.sinaisAlarme.length <= 4, `${onde}: sinaisAlarme 2 a 4`);
    ok(Array.isArray(p.modulos) && p.modulos.length >= 1 && p.modulos.length <= 3, `${onde}: modulos 1 a 3`);
    for (const m of p.modulos ?? []) ok(MODULOS.has(m), `${onde}: módulo desconhecido ${m}`);

    const blocos = p.resposta ?? [];
    ok(blocos.length >= 2, `${onde}: resposta com menos de 2 blocos`);
    ok(blocos[0]?.type === 'p', `${onde}: o primeiro bloco da resposta deve ser um «p» com a resposta directa`);
    let pal = 0;
    let temRefs = false; let temDiagram = false; let temTable = false; let temCode = false;
    for (const b of blocos) {
      ok(BLOCOS_OK.includes(b.type), `${onde}: bloco não permitido: ${b.type}`);
      pal += palavras(textoBloco(b));
      if (b.type === 'refs') {
        temRefs = true;
        ok(b.items.length >= 1 && b.items.length <= 4, `${onde}: refs 1 a 4`);
        for (const it of b.items) {
          let host = '';
          try { host = new URL(it.url).host; } catch { ok(false, `${onde}: URL inválido ${it.url}`); continue; }
          ok(it.url.startsWith('https://'), `${onde}: URL sem https: ${it.url}`);
          ok(dominioOk(host), `${onde}: domínio não permitido: ${host}`);
          ok(typeof it.label === 'string' && it.label.length > 2, `${onde}: ref sem label`);
        }
      }
      if (b.type === 'callout') ok(TONS.includes(b.tone), `${onde}: tom inválido ${b.tone}`);
      if (b.type === 'code') {
        temCode = true;
        ok(!b.lang || LANGS.includes(b.lang), `${onde}: lang inválida ${b.lang}`);
        ok(typeof b.code === 'string' && b.code.trim().length > 0, `${onde}: code vazio`);
      }
      if (b.type === 'table') {
        temTable = true;
        for (const row of b.rows) ok(row.length === b.head.length, `${onde}: linha de tabela com ${row.length} colunas, cabeçalho tem ${b.head.length}`);
      }
      if (b.type === 'adr') ok(ADR_IDS.includes(b.ref), `${onde}: ADR desconhecido ${b.ref}`);
      if (b.type === 'list') ok(b.items.length >= 2, `${onde}: lista com menos de 2 itens`);
      if (b.type === 'diagram') {
        temDiagram = true;
        const d = b.diagram;
        const nids = new Set();
        for (const no of d.nodes) {
          ok(!nids.has(no.id), `${onde}: nó de diagrama repetido ${no.id}`); nids.add(no.id);
          ok(no.col >= 0 && no.col + (no.span ?? 1) <= d.cols, `${onde}: nó ${no.id} fora das colunas`);
          ok(no.row >= 0 && no.row < d.rows, `${onde}: nó ${no.id} fora das linhas`);
          ok(!no.kind || NODE_KINDS.includes(no.kind), `${onde}: kind de nó inválido ${no.kind}`);
        }
        const ocup = new Set();
        for (const no of d.nodes) for (let c = no.col; c < no.col + (no.span ?? 1); c++) {
          const k = `${c},${no.row}`; ok(!ocup.has(k), `${onde}: nós sobrepostos na célula ${k}`); ocup.add(k);
        }
        for (const z of d.zones ?? []) {
          ok(!z.tone || ZONE_TONES.includes(z.tone), `${onde}: tone de zona inválido ${z.tone}`);
          ok(z.col >= 0 && z.col + z.colSpan <= d.cols && z.row >= 0 && z.row + z.rowSpan <= d.rows, `${onde}: zona ${z.id} fora da grelha`);
        }
        for (const e of d.edges ?? []) ok(nids.has(e.from) && nids.has(e.to), `${onde}: aresta com nó inexistente ${e.from}→${e.to}`);
        av(d.cols <= 7 && d.rows <= 7, `${onde}: diagrama grande (${d.cols}×${d.rows})`);
      }
      for (const s of textosBloco(b)) {
        ok(!EMOJI.test(s), `${onde}: emoji no texto: ${s.slice(0, 40)}`);
        ok(!/^\s*(#{1,6}\s|[-*]\s|\d+\.\s)/m.test(s) || b.type === 'code', `${onde}: marcação markdown de lista/título dentro de texto: ${s.slice(0, 50)}`);
        ok(!s.includes('|') || b.type === 'code', `${onde}: «|» dentro de texto (usa uma table)`);
        ok(!/\bvocê\b/i.test(s), `${onde}: «você» na prosa`);
        for (const m of s.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
          let host = ''; try { host = new URL(m[1]).host; } catch { ok(false, `${onde}: link inline inválido ${m[1]}`); continue; }
          ok(dominioOk(host), `${onde}: domínio não permitido em link inline: ${host}`);
        }
      }
    }
    for (const s of [p.titulo, p.enunciado, p.contexto ?? '', p.dica ?? '', ...(p.seguimento ?? []), ...(p.sinaisAlarme ?? []), ...(r.criterios ?? []), r.fraco ?? '', r.solido ?? '', r.excelente ?? '']) {
      ok(!EMOJI.test(s), `${onde}: emoji: ${s.slice(0, 40)}`);
      ok(!/\bvocê\b/i.test(s), `${onde}: «você»: ${s.slice(0, 50)}`);
    }
    if (p.tipo !== 'comportamental') ok(temRefs, `${onde}: falta bloco refs`);
    if (p.tipo === 'codigo') ok(temCode, `${onde}: pergunta de código sem bloco code`);
    if (p.tipo === 'design' && grandeDesign) {
      ok(temDiagram, `${onde}: design grande sem diagram`);
      ok(temTable, `${onde}: design grande sem table`);
    }
    const [pmn, pmx] = ALVO_PALAVRAS[chaveAlvo];
    av(pal >= pmn * 0.85, `${onde}: resposta curta (${pal} palavras; alvo ${pmn}–${pmx})`);
    av(pal <= pmx * 1.25, `${onde}: resposta longa (${pal} palavras; alvo ${pmn}–${pmx})`);
    if (pal < pmn * 0.6) erros.push(`${onde}: resposta demasiado curta (${pal} palavras; mínimo ${pmn})`);
    totalPalavras += pal;
  });

  /* mistura */
  if (n <= 28) {
    ok(cont.conceito >= 4, `mistura: ≥ 4 conceito (tem ${cont.conceito})`);
    ok(cont.tradeoff >= 2, `mistura: ≥ 2 tradeoff (tem ${cont.tradeoff})`);
    ok(cont.debug >= 1, `mistura: ≥ 1 debug (tem ${cont.debug})`);
    ok(cont.design + cont.codigo >= 1, 'mistura: ≥ 1 design ou codigo');
    ok(niv.pleno >= 2 && niv.senior >= 4 && niv.staff >= 1, `níveis: ≥2 pleno, ≥4 senior, ≥1 staff (tem ${JSON.stringify(niv)})`);
  } else if (grandeDesign) {
    ok(cont.design === ps.length, 'tópicos 29–30: todas as perguntas são design');
    ok(niv.senior >= 2 && niv.staff >= 2, `níveis: ≥2 senior e ≥2 staff (tem ${JSON.stringify(niv)})`);
  } else if (n === 31) {
    ok(cont.codigo === ps.length, 'tópico 31: todas codigo');
  } else if (n === 32) {
    ok(cont.debug === ps.length, 'tópico 32: todas debug');
  } else if (n === 33) {
    ok(cont.comportamental >= 7 && cont.comportamental + cont.tradeoff === ps.length, 'tópico 33: ≥7 comportamental, resto tradeoff');
  }
  if (n >= 31) ok(niv.pleno >= 2 && niv.senior >= 4 && niv.staff >= 1, `níveis: ≥2 pleno, ≥4 senior, ≥1 staff (tem ${JSON.stringify(niv)})`);

  return { erros, avisos, stats: { perguntas: ps.length, tipos: cont, niveis: niv, palavras: totalPalavras } };
}

/* ==================================================================== CLI */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  let alvos = process.argv.slice(2);
  if (alvos[0] === '--todos') {
    const dir = join(RAIZ, 'src/entrevista/topicos');
    alvos = readdirSync(dir).filter((f) => /^t\d\d-[a-z0-9-]+\.ts$/.test(f)).sort().map((f) => join(dir, f));
  }
  if (!alvos.length) { console.error('uso: node scripts/verificar-entrevista.mjs <ficheiro.ts> | --todos'); process.exit(2); }
  let falhou = false;
  let totalP = 0; let totalW = 0;
  for (const f of alvos) {
    const { erros, avisos, stats } = await verificar(f);
    const nome = basename(f);
    if (stats) { totalP += stats.perguntas; totalW += stats.palavras; }
    console.log(`\n${erros.length ? '✗' : '✓'} ${nome}${stats ? `  — ${stats.perguntas} perguntas, ${stats.palavras} palavras, tipos ${JSON.stringify(stats.tipos)}, níveis ${JSON.stringify(stats.niveis)}` : ''}`);
    for (const e of erros) console.log(`  ERRO  ${e}`);
    for (const a of avisos) console.log(`  aviso ${a}`);
    if (erros.length) falhou = true;
  }
  if (alvos.length > 1) console.log(`\nTotal: ${alvos.length} tópicos, ${totalP} perguntas, ${totalW} palavras.`);
  rmSync(temp, { recursive: true, force: true });
  process.exit(falhou ? 1 : 0);
}
