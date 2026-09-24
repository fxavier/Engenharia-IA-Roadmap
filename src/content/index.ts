/* Índice do conteúdo: o que é leve (META) carrega no arranque; os módulos
   inteiros, com todos os blocos, só descem quando o leitor os abre.

   `meta.ts` e `todos.ts` são gerados: `npm run gerar-indice` refaz o mapa de
   carregadores e a lista, `npm run gerar-meta` refaz o índice leve. */

import type { Lab, Module, PartId, UseCase } from '../types';
import { META, type ModuleMeta } from './meta';

export { META };
export type { ModuleMeta };

const PARTES: PartId[] = ['fundamentos', 'rag', 'orquestracao', 'avaliacao', 'producao', 'balcao'];

function porParte(): Record<PartId, ModuleMeta[]> {
  const vazio: Record<PartId, ModuleMeta[]> = {
    fundamentos: [], rag: [], orquestracao: [], avaliacao: [], producao: [], balcao: [],
  };
  for (const p of PARTES) vazio[p] = META.filter((m) => m.part === p).sort((a, b) => a.number - b.number);
  return vazio;
}

export const BY_PART: Record<PartId, ModuleMeta[]> = porParte();

export interface Estatisticas {
  modules: number;
  sections: number;
  labs: number;
  questions: number;
  exercises: number;
  useCases: number;
  blocks: number;
  minutes: number;
}

function somar(lista: ModuleMeta[]): Estatisticas {
  return {
    modules: lista.length,
    sections: lista.reduce((a, m) => a + m.sections.length, 0),
    labs: lista.reduce((a, m) => a + m.counts.labs, 0),
    questions: lista.reduce((a, m) => a + m.counts.quiz, 0),
    exercises: lista.reduce((a, m) => a + m.counts.exercises, 0),
    useCases: lista.reduce((a, m) => a + m.counts.useCases, 0),
    blocks: lista.reduce((a, m) => a + m.counts.blocks, 0),
    minutes: lista.reduce((a, m) => a + m.minutes, 0),
  };
}

export const TOTAL: Estatisticas = somar(META);

export function getMeta(id: string): ModuleMeta | undefined {
  return META.find((m) => m.id === id);
}

export function partStats(part: PartId): Estatisticas {
  return somar(BY_PART[part] ?? []);
}

/** Módulo anterior e seguinte pela ordem de leitura (o número do módulo). */
export function moduleNeighbours(id: string): { prev?: ModuleMeta; next?: ModuleMeta } {
  const ordenados = [...META].sort((a, b) => a.number - b.number);
  const i = ordenados.findIndex((m) => m.id === id);
  if (i < 0) return {};
  return { prev: ordenados[i - 1], next: ordenados[i + 1] };
}

/* --------------------------------------------------------- carga sob procura
   Cada módulo é um import dinâmico e fica no seu próprio pedaço: abrir um
   módulo não descarrega os outros 31. O mapa é gerado por
   `scripts/gerar-indice.mjs` — não se edita à mão. */

type Carregador = () => Promise<Module>;

const CARREGADORES: Record<string, Carregador> = {
  'engenharia-ia': () => import('./m01-engenharia-ia').then((x) => x.m01),
  'como-funciona-llm': () => import('./m02-como-funciona-llm').then((x) => x.m02),
  'apis-de-modelos': () => import('./m03-apis-de-modelos').then((x) => x.m03),
  'prompt-engineering': () => import('./m04-prompt-engineering').then((x) => x.m04),
  'tool-calling': () => import('./m05-tool-calling').then((x) => x.m05),
  'escolher-modelo': () => import('./m06-escolher-modelo').then((x) => x.m06),
  'embeddings': () => import('./m07-embeddings').then((x) => x.m07),
  'bases-vectoriais': () => import('./m08-bases-vectoriais').then((x) => x.m08),
  'ingestao-chunking': () => import('./m09-ingestao-chunking').then((x) => x.m09),
  'rag-basico': () => import('./m10-rag-basico').then((x) => x.m10),
  'pesquisa-hibrida': () => import('./m11-pesquisa-hibrida').then((x) => x.m11),
  'rag-avancado': () => import('./m12-rag-avancado').then((x) => x.m12),
  'langchain-lcel': () => import('./m13-langchain-lcel').then((x) => x.m13),
  'langchain-rag': () => import('./m14-langchain-rag').then((x) => x.m14),
  'agentes': () => import('./m15-agentes').then((x) => x.m15),
  'langgraph': () => import('./m16-langgraph').then((x) => x.m16),
  'langgraph-persistencia': () => import('./m17-langgraph-persistencia').then((x) => x.m17),
  'memoria': () => import('./m18-memoria').then((x) => x.m18),
  'multi-agente-mcp': () => import('./m19-multi-agente-mcp').then((x) => x.m19),
  'avaliacao-fundamentos': () => import('./m20-avaliacao-fundamentos').then((x) => x.m20),
  'avaliar-rag': () => import('./m21-avaliar-rag').then((x) => x.m21),
  'llm-como-juiz': () => import('./m22-llm-como-juiz').then((x) => x.m22),
  'avaliar-agentes': () => import('./m23-avaliar-agentes').then((x) => x.m23),
  'guardrails-seguranca': () => import('./m24-guardrails-seguranca').then((x) => x.m24),
  'fastapi-servico': () => import('./m25-fastapi-servico').then((x) => x.m25),
  'git-fluxo': () => import('./m26-git-fluxo').then((x) => x.m26),
  'docker': () => import('./m27-docker').then((x) => x.m27),
  'ci-cd': () => import('./m28-ci-cd').then((x) => x.m28),
  'observabilidade-llmops': () => import('./m29-observabilidade-llmops').then((x) => x.m29),
  'custo-escala': () => import('./m30-custo-escala').then((x) => x.m30),
  'balcao-ponta-a-ponta': () => import('./m31-balcao-ponta-a-ponta').then((x) => x.m31),
  'entrevista': () => import('./m32-entrevista').then((x) => x.m32),
};

const cacheModulo = new Map<string, Module>();
let cache: Module[] | null = null;

async function todos(): Promise<Module[]> {
  if (!cache) {
    cache = (await import('./todos')).MODULOS;
    for (const m of cache) cacheModulo.set(m.id, m);
  }
  return cache;
}

export async function carregarModulo(id: string): Promise<Module | null> {
  const guardado = cacheModulo.get(id);
  if (guardado) return guardado;
  const carregar = CARREGADORES[id];
  if (!carregar) return null;
  const m = await carregar();
  cacheModulo.set(id, m);
  return m;
}

export interface Agregados {
  modulos: Module[];
  labs: Lab[];
  moduloDoLab: Record<string, Module>;
  useCases: UseCase[];
  moduloDoCaso: Record<string, Module>;
}

/** Tudo descarregado de uma vez: só as páginas que precisam do conteúdo
 *  completo (laboratórios, casos, progresso, pesquisa) chamam isto. */
export async function carregarAgregados(): Promise<Agregados> {
  const modulos = [...(await todos())].sort((a, b) => a.number - b.number);
  const labs: Lab[] = [];
  const useCases: UseCase[] = [];
  const moduloDoLab: Record<string, Module> = {};
  const moduloDoCaso: Record<string, Module> = {};

  for (const m of modulos) {
    for (const l of m.labs) {
      labs.push(l);
      moduloDoLab[l.id] = m;
    }
    for (const u of m.useCases) {
      useCases.push(u);
      moduloDoCaso[u.id] = m;
    }
  }

  return { modulos, labs, moduloDoLab, useCases, moduloDoCaso };
}
