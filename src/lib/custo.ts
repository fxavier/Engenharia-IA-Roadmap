/* Custo de tokens em meticais, com os preços de referência dos escalões de
   `design.ts` (os mesmos de `balcao.MODELOS`). São preços didácticos: confirma
   sempre na página de preços do fornecedor. */

import { MODELO_DE } from '../data/design';

/** Câmbio de referência USD → MZN, o mesmo de `balcao.CAMBIO_USD_MZN`. */
export const CAMBIO_USD_MZN = 63.9;

export type Escalao = 'pequeno' | 'medio' | 'grande' | 'local';

/** Lê «1,00 USD / M tokens» → 1.0. Devolve 0 quando não há número. */
function precoPorMilhao(texto: string | undefined): number {
  const m = texto?.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : 0;
}

export function precos(escalao: Escalao = 'medio'): { entrada: number; saida: number } {
  const m = MODELO_DE[escalao];
  return { entrada: precoPorMilhao(m?.custoEntrada), saida: precoPorMilhao(m?.custoSaida) };
}

/** Custo em MZN de uma chamada com `entrada` e `saida` tokens. */
export function custoMzn(entrada: number, saida: number, escalao: Escalao = 'medio'): number {
  const p = precos(escalao);
  return ((entrada * p.entrada + saida * p.saida) / 1_000_000) * CAMBIO_USD_MZN;
}

/** Estimativa rápida para português (≈ 3,6 caracteres por token), a mesma de `balcao.estimar_tokens`. */
export function estimarTokens(texto: string): number {
  return Math.max(1, Math.ceil(texto.length / 3.6));
}

export function formatarMzn(v: number): string {
  if (v === 0) return '0 MZN';
  if (v < 0.01) return `${v.toFixed(4).replace('.', ',')} MZN`;
  return `${v.toFixed(v < 1 ? 3 : 2).replace('.', ',')} MZN`;
}
