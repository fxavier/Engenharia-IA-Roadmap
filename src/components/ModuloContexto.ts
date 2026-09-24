import { createContext, useContext } from 'react';
import type { Module } from '../types';

/** O módulo actualmente aberto. Os blocos `lab` resolvem a referência aqui,
 *  em vez de dependerem de um índice global que obrigaria a carregar tudo. */
export const ModuloContexto = createContext<Module | null>(null);

export function useModulo(): Module | null {
  return useContext(ModuloContexto);
}
