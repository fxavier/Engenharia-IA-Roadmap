/* Lógica pura dos widgets de Orquestração, Avaliação e Produção.
   Portas em TypeScript de funções de `laboratorio/src/balcao/didactico.py` (a fonte de verdade):
   custo_mzn, estimar_tokens, recall_at_k, precisao_at_k, mrr, ndcg_at_k, cohen_kappa,
   bootstrap_ic (com outro gerador pseudo-aleatório: os limites diferem nas casas decimais do
   numpy, a ideia não) e detectar_injeccao. Sem React, sem efeitos. */

import { SNAPSHOT } from '../../data/snapshot';
import type { Linha } from '../../data/snapshot';

/* ================================================================ formatação */

const fmtCache = new Map<number, Intl.NumberFormat>();
/** Número em pt-PT com `d` casas decimais fixas (espaço como separador de milhares). */
export function fmt(n: number, d = 0): string {
  let f = fmtCache.get(d);
  if (!f) {
    f = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true });
    fmtCache.set(d, f);
  }
  return f.format(n);
}

export function pct(x: number, d = 0): string {
  return `${fmt(x * 100, d)}%`;
}

export function ms(n: number): string {
  return n >= 1000 ? `${fmt(n / 1000, 2)} s` : `${fmt(n)} ms`;
}

/* ===================================================================== custo */

export type Escalao = 'pequeno' | 'medio' | 'grande' | 'local';
export const CAMBIO = SNAPSHOT.cambio;

/** Porta de `custo_mzn`: meticais de uma chamada, com tokens de entrada lidos da cache de prompt. */
export function custoMzn(entrada: number, saida: number, modelo: Escalao = 'medio', cache = 0): number {
  const p = SNAPSHOT.modelos[modelo];
  const usd = ((entrada - cache) * p.entrada + cache * p.cache_leitura + saida * p.saida) / 1_000_000;
  return usd * CAMBIO;
}

/** Porta de `estimar_tokens`: ≈ 3,6 caracteres por token em português. */
export function estimarTokens(texto: string): number {
  return Math.max(1, Math.ceil(texto.length / 3.6));
}

/* ======================================================= aleatório com semente */

/** mulberry32: pequeno, rápido e determinista. Serve para simulação, não para criptografia. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniforme em [0,1) derivado de uma string (FNV-1a): o mesmo item dá sempre o mesmo valor. */
export function hashUnit(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

function quantil(ordenados: number[], q: number): number {
  const pos = (ordenados.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (pos - lo);
}

/** Porta de `bootstrap_ic`: média e IC por percentis de `n` reamostragens com reposição. */
export function bootstrapIc(valores: number[], n = 2000, nivel = 0.95, seed = 7): { media: number; lo: number; hi: number } {
  const len = valores.length;
  const media = valores.reduce((a, b) => a + b, 0) / Math.max(1, len);
  if (len === 0) return { media: 0, lo: 0, hi: 0 };
  const r = rng(seed);
  const medias: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < len; j++) s += valores[Math.floor(r() * len)];
    medias.push(s / len);
  }
  medias.sort((a, b) => a - b);
  const a = (1 - nivel) / 2;
  return { media, lo: quantil(medias, a), hi: quantil(medias, 1 - a) };
}

/* ========================================================= métricas de ranking */

export function recallAtK(rec: string[], rel: Iterable<string>, k: number): number {
  const r = new Set(rel);
  if (r.size === 0) return 0;
  const topo = new Set(rec.slice(0, k));
  let n = 0;
  r.forEach((d) => { if (topo.has(d)) n++; });
  return n / r.size;
}

export function precisaoAtK(rec: string[], rel: Iterable<string>, k: number): number {
  const r = new Set(rel);
  return k ? rec.slice(0, k).filter((d) => r.has(d)).length / k : 0;
}

/** MRR de uma pergunta: 1 / posição do primeiro relevante (0 se nenhum). */
export function rr(rec: string[], rel: Iterable<string>): number {
  const r = new Set(rel);
  const i = rec.findIndex((d) => r.has(d));
  return i < 0 ? 0 : 1 / (i + 1);
}

export function ndcgAtK(rec: string[], rel: Iterable<string>, k: number): number {
  const r = new Set(rel);
  let dcg = 0;
  rec.slice(0, k).forEach((d, i) => { if (r.has(d)) dcg += 1 / Math.log2(i + 2); });
  let ideal = 0;
  for (let i = 1; i <= Math.min(k, r.size); i++) ideal += 1 / Math.log2(i + 1);
  return ideal ? dcg / ideal : 0;
}

/** Documentos únicos pela ordem em que aparecem (o `_docs_unicos` do Python). */
export function docsUnicos(linhas: Linha[]): string[] {
  const v: string[] = [];
  for (const [, doc] of linhas) if (!v.includes(doc)) v.push(doc);
  return v;
}

export type Metodo = 'bm25' | 'denso' | 'hibrido' | 'rerank';

/** Métrica de uma pergunta dourada com um método, a partir do ranking real do snapshot. */
export function metricaPergunta(id: string, metodo: Metodo, metrica: 'recall' | 'mrr' | 'ndcg', k: number): number {
  const p = SNAPSHOT.perguntas.find((x) => x.id === id);
  if (!p) return 0;
  const docs = docsUnicos(SNAPSHOT.rankings[id][metodo]);
  if (metrica === 'recall') return recallAtK(docs, p.relevantes, k);
  if (metrica === 'mrr') return rr(docs.slice(0, k), p.relevantes);
  return ndcgAtK(docs, p.relevantes, k);
}

/* ================================================================== kappa */

export interface Kappa { po: number; pe: number; kappa: number; n: number }

/** Porta de `cohen_kappa`, com os passos intermédios. */
export function cohenKappa<T>(a: T[], b: T[]): Kappa {
  const n = a.length;
  if (n === 0 || n !== b.length) return { po: 0, pe: 0, kappa: 0, n };
  const cats = Array.from(new Set([...a, ...b]));
  const po = a.filter((x, i) => x === b[i]).length / n;
  const pe = cats.reduce((s, c) => s + (a.filter((x) => x === c).length / n) * (b.filter((x) => x === c).length / n), 0);
  return { po, pe, kappa: pe < 1 ? (po - pe) / (1 - pe) : 1, n };
}

/* =========================================================== guardrails */

export function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');
}

/** Os mesmos padrões e pesos de `_INJ` em `didactico.py`. */
export const PADROES_INJECCAO: [string, number, string][] = [
  ['ignor\\w* (as |todas as )?(instru|regras|ordens)', 0.6, 'ignorar instruções'],
  ['ignore (all |the )?(previous|prior) (instructions|rules)', 0.6, 'ignore instructions (inglês)'],
  ['(prompt|mensagem) (de )?sistema|system prompt', 0.45, 'menciona o prompt de sistema'],
  ['a partir de agora (és|es|vais ser)|you are now', 0.45, 'troca de papel'],
  ['modo (de )?(programador|developer|admin)|developer mode', 0.4, 'modo programador'],
  ['(revela|mostra|repete) (as )?(tuas )?(instru|regras)', 0.45, 'pede as instruções'],
  ['(emite|aprova|faz) (um )?(reembolso|cup[aã]o) de \\d{4,}', 0.5, 'ordem de reembolso de 4+ dígitos'],
  ['</?(contexto|system|instructions?)>', 0.35, 'etiquetas de delimitação'],
  ['[A-Za-z0-9+/]{60,}={0,2}', 0.25, 'bloco tipo base64'],
];

export interface Deteccao { score: number; bloquear: boolean; sinais: string[] }

/** Porta de `detectar_injeccao`: pontuação heurística de 0 a 1; bloqueia a partir de 0,5. */
export function detectarInjeccao(texto: string): Deteccao {
  const t = normalizar(texto);
  const sinais: string[] = [];
  let score = 0;
  for (const [p, w, nome] of PADROES_INJECCAO) {
    if (new RegExp(p).test(t)) {
      sinais.push(nome);
      score += w;
    }
  }
  score = Math.min(1, Math.round(score * 100) / 100);
  return { score, bloquear: score >= 0.5, sinais };
}

/* ============================================================ pequenos úteis */

export function mover<T>(xs: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= xs.length) return xs;
  const c = xs.slice();
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

export function moverPara<T>(xs: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || para < 0 || de >= xs.length || para >= xs.length) return xs;
  const c = xs.slice();
  const [x] = c.splice(de, 1);
  c.splice(para, 0, x);
  return c;
}

export function soma(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function textoChunk(id: string): string {
  return SNAPSHOT.chunks.recursivo.find((c) => c.id === id)?.texto ?? '';
}

export function tituloDoc(id: string): string {
  return SNAPSHOT.documentos.find((d) => d.id === id)?.titulo ?? id;
}
