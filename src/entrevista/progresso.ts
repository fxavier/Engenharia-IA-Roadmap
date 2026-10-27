import { useSyncExternalStore } from 'react';
import type { NivelPergunta } from '../types';

/* Estado da área «Entrevista», só no browser (localStorage), separado do
   progresso dos módulos para não o inflacionar nem o partir.            */

const KEY = 'balcao:entrevista:v1';
const MAX_HISTORICO = 40;

/** 0 fraco · 1 parcial · 2 sólido · 3 excelente. */
export type Nota = 0 | 1 | 2 | 3;

export const NOTAS: { valor: Nota; nome: string; cor: string; barra: string }[] = [
  { valor: 0, nome: 'Fraco', cor: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-400/50', barra: 'bg-rose-500' },
  { valor: 1, nome: 'Parcial', cor: 'bg-amber-500/14 text-amber-800 dark:text-amber-300 border-amber-400/50', barra: 'bg-amber-500' },
  { valor: 2, nome: 'Sólido', cor: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-400/50', barra: 'bg-sky-500' },
  { valor: 3, nome: 'Excelente', cor: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-400/50', barra: 'bg-emerald-500' },
];

export interface Avaliacao {
  nota: Nota;
  em: string;
}

export interface PerguntaSimulada {
  id: string;
  resposta: string;
  /** Pergunta de seguimento sorteada, se a ronda as tiver. */
  seguimento?: string;
  respostaSeguimento?: string;
  /** Segundos já gastos quando o seguimento apareceu. */
  inicioSeguimento?: number;
  /** Segundos gastos nesta pergunta (incluindo o seguimento). */
  segundos: number;
  saltada?: boolean;
}

export interface Simulacao {
  id: string;
  formato: string;
  nome: string;
  nivel: NivelPergunta;
  inicio: string;
  fim?: string;
  /** Tempo total previsto, em minutos. */
  minutos: number;
  perguntas: PerguntaSimulada[];
  /** Pergunta em curso (durante a ronda). */
  indice: number;
  /** Fase dentro da pergunta em curso. */
  fase: 'resposta' | 'seguimento';
  estado: 'a-decorrer' | 'terminada';
  /** Ronda com perguntas de seguimento. */
  comSeguimento: boolean;
  /** Notas dadas no relatório desta simulação. */
  notas: Record<string, Nota>;
  pausada?: boolean;
}

export interface EstadoEntrevista {
  /** Rascunho da resposta no modo de prática, por pergunta. */
  respostas: Record<string, string>;
  avaliacoes: Record<string, Avaliacao>;
  /** Índices dos critérios da rubrica que a resposta cobriu, por pergunta. */
  criterios: Record<string, number[]>;
  marcadas: Record<string, boolean>;
  simulacoes: Simulacao[];
  activa?: Simulacao;
}

const vazio: EstadoEntrevista = { respostas: {}, avaliacoes: {}, criterios: {}, marcadas: {}, simulacoes: [] };

function ler(): EstadoEntrevista {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return vazio;
    const p = JSON.parse(raw) as Partial<EstadoEntrevista>;
    return {
      respostas: p.respostas ?? {},
      avaliacoes: p.avaliacoes ?? {},
      criterios: p.criterios ?? {},
      marcadas: p.marcadas ?? {},
      simulacoes: Array.isArray(p.simulacoes) ? p.simulacoes : [],
      activa: p.activa,
    };
  } catch {
    return vazio;
  }
}

let estado: EstadoEntrevista = typeof localStorage === 'undefined' ? vazio : ler();
const ouvintes = new Set<() => void>();
let gravarPendente: ReturnType<typeof setTimeout> | null = null;

function gravar() {
  try { localStorage.setItem(KEY, JSON.stringify(estado)); } catch { /* modo privado ou quota */ }
}

function commit(next: EstadoEntrevista, adiar = false) {
  estado = next;
  if (adiar) {
    if (gravarPendente) clearTimeout(gravarPendente);
    gravarPendente = setTimeout(() => { gravarPendente = null; gravar(); }, 400);
  } else {
    if (gravarPendente) { clearTimeout(gravarPendente); gravarPendente = null; }
    gravar();
  }
  ouvintes.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { if (gravarPendente) gravar(); });
}

export const entrevista = {
  get: () => estado,
  subscribe(l: () => void) { ouvintes.add(l); return () => { ouvintes.delete(l); }; },

  guardarResposta(id: string, texto: string) {
    commit({ ...estado, respostas: { ...estado.respostas, [id]: texto } }, true);
  },

  avaliar(id: string, nota: Nota) {
    commit({ ...estado, avaliacoes: { ...estado.avaliacoes, [id]: { nota, em: new Date().toISOString() } } });
  },

  marcarCriterio(id: string, indice: number, ligado: boolean) {
    const base = estado.criterios[id] ?? [];
    const lista = ligado ? [...new Set([...base, indice])].sort((x, y) => x - y) : base.filter((c) => c !== indice);
    commit({ ...estado, criterios: { ...estado.criterios, [id]: lista } });
  },

  limparAvaliacao(id: string) {
    const { [id]: _a, ...avaliacoes } = estado.avaliacoes;
    const { [id]: _c, ...criterios } = estado.criterios;
    commit({ ...estado, avaliacoes, criterios });
  },

  alternarMarca(id: string) {
    const { [id]: tinha, ...resto } = estado.marcadas;
    commit({ ...estado, marcadas: tinha ? resto : { ...estado.marcadas, [id]: true } });
  },

  /* ----------------------------------------------------------- simulação */

  iniciar(sim: Simulacao) {
    commit({ ...estado, activa: sim });
  },

  actualizarActiva(f: (s: Simulacao) => Simulacao, adiar = false) {
    if (!estado.activa) return;
    commit({ ...estado, activa: f(estado.activa) }, adiar);
  },

  terminarActiva() {
    const s = estado.activa;
    if (!s) return;
    const fechada: Simulacao = { ...s, estado: 'terminada', fim: new Date().toISOString() };
    commit({ ...estado, activa: undefined, simulacoes: [fechada, ...estado.simulacoes].slice(0, MAX_HISTORICO) });
    return fechada.id;
  },

  descartarActiva() {
    commit({ ...estado, activa: undefined });
  },

  notaSimulacao(simId: string, perguntaId: string, nota: Nota | undefined) {
    const simulacoes = estado.simulacoes.map((s) => {
      if (s.id !== simId) return s;
      const { [perguntaId]: _, ...resto } = s.notas ?? {};
      return { ...s, notas: nota === undefined ? resto : { ...resto, [perguntaId]: nota } };
    });
    let avaliacoes = estado.avaliacoes;
    if (nota !== undefined) avaliacoes = { ...avaliacoes, [perguntaId]: { nota, em: new Date().toISOString() } };
    commit({ ...estado, simulacoes, avaliacoes });
  },

  apagarSimulacao(id: string) {
    commit({ ...estado, simulacoes: estado.simulacoes.filter((s) => s.id !== id) });
  },

  repor() {
    commit(vazio);
  },
};

export function useEntrevista(): EstadoEntrevista {
  return useSyncExternalStore(entrevista.subscribe, entrevista.get, () => vazio);
}

/** Pontuação 0–100 a partir de notas 0–3. */
export function pontuacao(notas: Nota[]): number | null {
  if (!notas.length) return null;
  return Math.round((notas.reduce<number>((a, n) => a + n, 0) / (notas.length * 3)) * 100);
}
