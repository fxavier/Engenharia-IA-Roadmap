import type { BlocoEntrevistaId, NivelPergunta, TipoPergunta } from '../types';
import type { PerguntaMeta, TopicoMeta } from './meta';

/* Formatos de ronda para a simulação e o algoritmo de escolha de perguntas.
   Funções puras: o mesmo pedido com a mesma semente dá a mesma ronda.   */

export interface ParteRonda {
  tipos: TipoPergunta[];
  n: number;
  /** Restringe a blocos (por exemplo, os enunciados grandes de system design). */
  blocos?: BlocoEntrevistaId[];
  /** Tópicos preferidos: usados primeiro, se houver perguntas suficientes. */
  preferir?: string[];
}

export interface FormatoRonda {
  id: string;
  nome: string;
  icon: string;
  descricao: string;
  /** Como é que esta ronda costuma correr numa entrevista real. */
  comoCorre: string;
  partes: ParteRonda[];
  /** O entrevistador faz uma pergunta de seguimento depois de cada resposta. */
  seguimento: boolean;
  /** Divisão sugerida do tempo, para rondas de design. */
  fases?: { nome: string; pct: number }[];
}

export const FASES_DESIGN = [
  { nome: 'Clarificar requisitos e limites', pct: 12 },
  { nome: 'Estimativas (tráfego, tokens, custo)', pct: 10 },
  { nome: 'Arquitectura de alto nível', pct: 22 },
  { nome: 'Aprofundar 2–3 componentes', pct: 28 },
  { nome: 'Avaliação e métricas', pct: 14 },
  { nome: 'Falhas, segurança, trade-offs', pct: 14 },
];

export const FORMATOS: FormatoRonda[] = [
  {
    id: 'triagem',
    nome: 'Triagem técnica',
    icon: '☎',
    descricao: 'Perguntas conceptuais rápidas, como numa primeira chamada com um engenheiro.',
    comoCorre: 'Seis perguntas curtas. O entrevistador quer respostas directas com o mecanismo certo — não monólogos. Se passas de 5 minutos numa, está a correr mal.',
    partes: [{ tipos: ['conceito'], n: 5 }, { tipos: ['tradeoff'], n: 1 }],
    seguimento: false,
  },
  {
    id: 'aprofundamento',
    nome: 'Aprofundamento técnico',
    icon: '⌖',
    descricao: 'Conceitos e trade-offs com perguntas de seguimento que vão até ao fundo.',
    comoCorre: 'Cinco perguntas e, depois de cada uma, o entrevistador insiste. É aqui que se vê se sabes porquê, quanto custa e quando não usar.',
    partes: [{ tipos: ['conceito'], n: 2 }, { tipos: ['tradeoff'], n: 2 }, { tipos: ['debug'], n: 1 }],
    seguimento: true,
  },
  {
    id: 'system-design',
    nome: 'GenAI system design',
    icon: '▦',
    descricao: 'Um enunciado grande de 45 minutos: requisitos, estimativas, arquitectura, avaliação e trade-offs.',
    comoCorre: 'Um só problema aberto. Conduz tu: clarifica, estima, desenha, aprofunda o que é crítico e fecha com avaliação e riscos. O cronómetro mostra a fase em que devias estar.',
    partes: [{ tipos: ['design'], n: 1, blocos: ['rondas'] }],
    seguimento: true,
    fases: FASES_DESIGN,
  },
  {
    id: 'codigo',
    nome: 'Código ao vivo',
    icon: '⌨',
    descricao: 'Dois exercícios de implementação típicos de AI engineering (pesquisa, métricas, retries, agentes).',
    comoCorre: 'Pensa em voz alta, diz a complexidade, escreve código que corre e trata os casos-limite. Escreve aqui o código como o escreverias no editor partilhado.',
    partes: [{ tipos: ['codigo'], n: 2, preferir: ['codigo-ao-vivo'] }],
    seguimento: true,
  },
  {
    id: 'debugging',
    nome: 'Debugging de produção',
    icon: '⚠',
    descricao: 'Três incidentes com sintomas e números: hipóteses, o que medir, causa, correcção e prevenção.',
    comoCorre: 'Não saltes para a correcção. Ordena hipóteses por probabilidade e custo de verificar, diz o que olhavas primeiro e como impedes que volte.',
    partes: [{ tipos: ['debug'], n: 3, preferir: ['debugging'] }],
    seguimento: true,
  },
  {
    id: 'comportamental',
    nome: 'Comportamental',
    icon: '◎',
    descricao: 'Histórias STAR sobre produção, falhas, desacordos e decisões — o que decide o nível.',
    comoCorre: 'Situação, tarefa, acção, resultado — com números. Fala do que *tu* fizeste. O entrevistador procura dono do problema, juízo e impacto.',
    partes: [{ tipos: ['comportamental'], n: 3 }, { tipos: ['tradeoff'], n: 1, preferir: ['comportamental'] }],
    seguimento: true,
  },
  {
    id: 'loop',
    nome: 'Loop completo',
    icon: '⟳',
    descricao: 'Um dia de entrevistas comprimido: triagem, debugging, código, system design e comportamental.',
    comoCorre: 'Cerca de duas horas e meia seguidas. Faz pausas só entre perguntas. No fim tens um relatório por tipo de ronda.',
    partes: [
      { tipos: ['conceito'], n: 3 },
      { tipos: ['tradeoff'], n: 1 },
      { tipos: ['debug'], n: 1, preferir: ['debugging'] },
      { tipos: ['codigo'], n: 1, preferir: ['codigo-ao-vivo'] },
      { tipos: ['design'], n: 1, blocos: ['rondas'] },
      { tipos: ['comportamental'], n: 2 },
    ],
    seguimento: true,
  },
];

export const FORMATO_DE: Record<string, FormatoRonda> = Object.fromEntries(FORMATOS.map((f) => [f.id, f]));

export interface PedidoRonda {
  partes: ParteRonda[];
  nivel: NivelPergunta;
  /** Limita a estes tópicos (vazio = todos). */
  topicos?: string[];
  /** Notas anteriores (0–3) por pergunta: dá prioridade ao que correu mal e ao que nunca viste. */
  notas?: Record<string, number>;
  priorizarFracas?: boolean;
  semente: number;
}

const ORDEM: Record<NivelPergunta, number> = { pleno: 0, senior: 1, staff: 2 };

/** PRNG pequeno e determinista (mulberry32). */
export function prng(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Escolhe as perguntas de uma ronda. Devolve ids pela ordem das partes. */
export function escolherPerguntas(topicos: TopicoMeta[], pedido: PedidoRonda): string[] {
  const rnd = prng(pedido.semente);
  const filtro = pedido.topicos?.length ? new Set(pedido.topicos) : null;
  const escolhidas: string[] = [];
  const topicosUsados = new Map<string, number>();

  const candidatos = topicos.flatMap((t) =>
    (filtro && !filtro.has(t.id) ? [] : t.perguntas).map((p) => ({ p, t })),
  );

  for (const parte of pedido.partes) {
    let pool = candidatos.filter(({ p, t }) =>
      parte.tipos.includes(p.tipo) &&
      (!parte.blocos || parte.blocos.includes(t.bloco)) &&
      !escolhidas.includes(p.id),
    );
    /* Sem enunciados no bloco pedido (ex.: filtro de tópicos), aceita qualquer bloco. */
    if (!pool.length && parte.blocos) {
      pool = candidatos.filter(({ p }) => parte.tipos.includes(p.tipo) && !escolhidas.includes(p.id));
    }
    for (let i = 0; i < parte.n && pool.length; i++) {
      const pesos = pool.map(({ p, t }) => peso(p, t, parte, pedido, topicosUsados));
      const total = pesos.reduce((a, b) => a + b, 0);
      let r = rnd() * total;
      let k = 0;
      while (k < pool.length - 1 && r >= pesos[k]) { r -= pesos[k]; k++; }
      const { p, t } = pool[k];
      escolhidas.push(p.id);
      topicosUsados.set(t.id, (topicosUsados.get(t.id) ?? 0) + 1);
      pool = pool.filter((x) => x.p.id !== p.id);
    }
  }
  return escolhidas;
}

function peso(p: PerguntaMeta, t: TopicoMeta, parte: ParteRonda, pedido: PedidoRonda, usados: Map<string, number>): number {
  const d = ORDEM[p.nivel] - ORDEM[pedido.nivel];
  /* Nível pedido pesa mais; um acima ainda aparece (é assim nas entrevistas); dois acima quase nunca. */
  let w = d === 0 ? 4 : d === -1 ? 1.5 : d === 1 ? 1 : d === -2 ? 0.6 : 0.15;
  if (parte.preferir?.includes(t.id)) w *= 6;
  const vezes = usados.get(t.id) ?? 0;
  w /= 1 + vezes * 3; // variedade de tópicos
  if (pedido.priorizarFracas && pedido.notas) {
    const n = pedido.notas[p.id];
    if (n === undefined) w *= 1.6;
    else if (n <= 1) w *= 3;
    else if (n === 3) w *= 0.3;
  }
  return Math.max(w, 0.0001);
}

export function minutosDe(ids: string[], meta: Record<string, PerguntaMeta>, seguimento: boolean): number {
  return ids.reduce((a, id) => a + (meta[id]?.minutos ?? 5) + (seguimento ? 2 : 0), 0);
}
