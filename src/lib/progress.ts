import { useSyncExternalStore } from 'react';

const KEY = 'balcao:progress:v1';

export interface QuizState { answers: Record<string, number[]>; submitted: boolean }

export interface ProgressState {
  sections: Record<string, string[]>;
  quiz: Record<string, QuizState>;
  exercises: Record<string, boolean>;
  useCases: Record<string, boolean>;
  /** id do laboratorio -> codigo submetido pelo utilizador. */
  labCode: Record<string, string>;
  /** id do laboratorio -> passou todas as verificacoes. */
  labsDone: Record<string, boolean>;
  /** id da ferramenta ou endpoint -> ja experimentado no playground. */
  endpointsTried: Record<string, boolean>;
  lastModule?: string;
  lastVisit?: string;
}

const empty: ProgressState = {
  sections: {}, quiz: {}, exercises: {}, useCases: {}, labCode: {}, labsDone: {}, endpointsTried: {},
};

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...empty,
      ...p,
      sections: p.sections ?? {},
      quiz: p.quiz ?? {},
      exercises: p.exercises ?? {},
      useCases: p.useCases ?? {},
      labCode: p.labCode ?? {},
      labsDone: p.labsDone ?? {},
      endpointsTried: p.endpointsTried ?? {},
    };
  } catch {
    return empty;
  }
}

let state: ProgressState = typeof localStorage === 'undefined' ? empty : read();
const listeners = new Set<() => void>();

function commit(next: ProgressState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* modo privado */ }
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },

  toggleSection(moduleId: string, sectionId: string, done?: boolean) {
    const cur = state.sections[moduleId] ?? [];
    const has = cur.includes(sectionId);
    const want = done ?? !has;
    if (want === has) return;
    const next = want ? [...cur, sectionId] : cur.filter((s) => s !== sectionId);
    commit({ ...state, sections: { ...state.sections, [moduleId]: next } });
  },

  setQuizAnswer(moduleId: string, qid: string, options: number[]) {
    const q = state.quiz[moduleId] ?? { answers: {}, submitted: false };
    if (q.submitted) return;
    commit({ ...state, quiz: { ...state.quiz, [moduleId]: { ...q, answers: { ...q.answers, [qid]: options } } } });
  },

  submitQuiz(moduleId: string) {
    const q = state.quiz[moduleId] ?? { answers: {}, submitted: false };
    commit({ ...state, quiz: { ...state.quiz, [moduleId]: { ...q, submitted: true } } });
  },

  resetQuiz(moduleId: string) {
    commit({ ...state, quiz: { ...state.quiz, [moduleId]: { answers: {}, submitted: false } } });
  },

  markExercise(id: string, done: boolean) {
    commit({ ...state, exercises: { ...state.exercises, [id]: done } });
  },

  markUseCase(id: string, done: boolean) {
    commit({ ...state, useCases: { ...state.useCases, [id]: done } });
  },

  saveLab(id: string, code: string) {
    commit({ ...state, labCode: { ...state.labCode, [id]: code } });
  },

  markLab(id: string, done: boolean) {
    commit({ ...state, labsDone: { ...state.labsDone, [id]: done } });
  },

  markEndpoint(id: string) {
    if (state.endpointsTried[id]) return;
    commit({ ...state, endpointsTried: { ...state.endpointsTried, [id]: true } });
  },

  visit(moduleId: string) {
    if (state.lastModule === moduleId) return;
    commit({ ...state, lastModule: moduleId, lastVisit: new Date().toISOString() });
  },

  resetAll() { commit(empty); },
};

export function useProgress(): ProgressState {
  return useSyncExternalStore(progress.subscribe, progress.get, () => empty);
}

/* ------------------------------------------------------------------ tema */

const THEME_KEY = 'balcao:theme';
export type Theme = 'light' | 'dark';

let theme: Theme = (() => {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
})();
const themeListeners = new Set<() => void>();

export const themeStore = {
  get: () => theme,
  subscribe(l: () => void) { themeListeners.add(l); return () => { themeListeners.delete(l); }; },
  toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignora */ }
    themeListeners.forEach((l) => l());
  },
};

export function useTheme(): Theme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get, () => 'light' as Theme);
}
