/* Índice da área «Entrevista». O que é leve (TOPICOS_META) carrega no
   arranque; cada tópico, com respostas-modelo e rubricas, só desce quando
   é preciso — um pedaço por tópico.                                     */

import type { PerguntaEntrevista, TopicoEntrevista } from '../types';
import { TOPICOS_META, type PerguntaMeta, type TopicoMeta } from './meta';

export { TOPICOS_META };
export type { PerguntaMeta, TopicoMeta };

const CARREGADORES = import.meta.glob<{ topico: TopicoEntrevista }>(['./topicos/t*.ts', '!./topicos/*.parte-*.ts']);

const porFicheiro: Record<string, () => Promise<{ topico: TopicoEntrevista }>> = {};
for (const [caminho, f] of Object.entries(CARREGADORES)) {
  const nome = caminho.split('/').pop()!.replace(/\.ts$/, '');
  porFicheiro[nome] = f;
}

export const TOPICO_META_DE: Record<string, TopicoMeta> = Object.fromEntries(TOPICOS_META.map((t) => [t.id, t]));

/** Pergunta → tópico a que pertence (meta). */
export const TOPICO_DA_PERGUNTA: Record<string, TopicoMeta> = Object.fromEntries(
  TOPICOS_META.flatMap((t) => t.perguntas.map((p) => [p.id, t] as const)),
);

export const PERGUNTA_META_DE: Record<string, PerguntaMeta> = Object.fromEntries(
  TOPICOS_META.flatMap((t) => t.perguntas.map((p) => [p.id, p] as const)),
);

export const TODAS_PERGUNTAS: PerguntaMeta[] = TOPICOS_META.flatMap((t) => t.perguntas);

const cache = new Map<string, Promise<TopicoEntrevista | undefined>>();

export function carregarTopico(id: string): Promise<TopicoEntrevista | undefined> {
  const meta = TOPICO_META_DE[id];
  if (!meta) return Promise.resolve(undefined);
  let p = cache.get(id);
  if (!p) {
    const f = porFicheiro[meta.ficheiro];
    p = f ? f().then((m) => m.topico) : Promise.resolve(undefined);
    cache.set(id, p);
  }
  return p;
}

/** Carrega as perguntas pedidas, descarregando só os tópicos necessários. */
export async function carregarPerguntas(ids: string[]): Promise<Record<string, PerguntaEntrevista>> {
  const topicos = [...new Set(ids.map((id) => TOPICO_DA_PERGUNTA[id]?.id).filter(Boolean))] as string[];
  const carregados = await Promise.all(topicos.map(carregarTopico));
  const out: Record<string, PerguntaEntrevista> = {};
  for (const t of carregados) for (const p of t?.perguntas ?? []) if (ids.includes(p.id)) out[p.id] = p;
  return out;
}

export async function carregarTodos(): Promise<TopicoEntrevista[]> {
  const ts = await Promise.all(TOPICOS_META.map((t) => carregarTopico(t.id)));
  return ts.filter((t): t is TopicoEntrevista => !!t);
}
