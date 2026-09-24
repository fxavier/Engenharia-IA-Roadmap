/* GERADO POR scripts/gerar-repo.mjs — NÃO EDITAR À MÃO.
   Corre `npm run gerar-repo` depois de mexer em laboratorio/. */

import { MANIFESTO, GRUPOS, POR_CAMINHO, type RepoEntrada, type RepoGrupo } from './manifesto';

export { MANIFESTO, GRUPOS, POR_CAMINHO };
export type { RepoEntrada, RepoGrupo };

const cache = new Map<string, Record<string, string>>();

async function carregarGrupo(id: string): Promise<Record<string, string>> {
  const guardado = cache.get(id);
  if (guardado) return guardado;
  const f = await grupo(id);
  cache.set(id, f);
  return f;
}

async function grupo(id: string): Promise<Record<string, string>> {
  switch (id) {
    case 'projecto': return (await import('./g-projecto')).FICHEIROS;
    case 'docker-ci': return (await import('./g-docker-ci')).FICHEIROS;
    case 'dados': return (await import('./g-dados')).FICHEIROS;
    case 'didactico': return (await import('./g-didactico')).FICHEIROS;
    case 'rag': return (await import('./g-rag')).FICHEIROS;
    case 'agente': return (await import('./g-agente')).FICHEIROS;
    case 'api': return (await import('./g-api')).FICHEIROS;
    case 'avaliacao': return (await import('./g-avaliacao')).FICHEIROS;
    case 'testes': return (await import('./g-testes')).FICHEIROS;
    default: return {};
  }
}

/** Descarrega o conteúdo de um ficheiro do laboratório (e só o pedaço dele). */
export async function carregarFicheiro(path: string): Promise<string | undefined> {
  const e = POR_CAMINHO[path];
  if (!e) return undefined;
  return (await carregarGrupo(e.grupo))[path];
}

export const TOTAIS = {
  ficheiros: MANIFESTO.length,
  linhas: MANIFESTO.reduce((a, m) => a + m.linhas, 0),
  bytes: MANIFESTO.reduce((a, m) => a + m.bytes, 0),
};
