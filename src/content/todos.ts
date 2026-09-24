/* GERADO POR scripts/gerar-indice.mjs — NÃO EDITAR À MÃO. */

import type { Module, UseCase, Question, Lab } from '../types';

import { m01 } from './m01-engenharia-ia';
import { m02 } from './m02-como-funciona-llm';
import { m03 } from './m03-apis-de-modelos';
import { m04 } from './m04-prompt-engineering';
import { m05 } from './m05-tool-calling';
import { m06 } from './m06-escolher-modelo';
import { m07 } from './m07-embeddings';
import { m08 } from './m08-bases-vectoriais';
import { m09 } from './m09-ingestao-chunking';
import { m10 } from './m10-rag-basico';
import { m11 } from './m11-pesquisa-hibrida';
import { m12 } from './m12-rag-avancado';
import { m13 } from './m13-langchain-lcel';
import { m14 } from './m14-langchain-rag';
import { m15 } from './m15-agentes';
import { m16 } from './m16-langgraph';
import { m17 } from './m17-langgraph-persistencia';
import { m18 } from './m18-memoria';
import { m19 } from './m19-multi-agente-mcp';
import { m20 } from './m20-avaliacao-fundamentos';
import { m21 } from './m21-avaliar-rag';
import { m22 } from './m22-llm-como-juiz';
import { m23 } from './m23-avaliar-agentes';
import { m24 } from './m24-guardrails-seguranca';
import { m25 } from './m25-fastapi-servico';
import { m26 } from './m26-git-fluxo';
import { m27 } from './m27-docker';
import { m28 } from './m28-ci-cd';
import { m29 } from './m29-observabilidade-llmops';
import { m30 } from './m30-custo-escala';
import { m31 } from './m31-balcao-ponta-a-ponta';
import { m32 } from './m32-entrevista';

export const MODULOS: Module[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20, m21, m22, m23, m24, m25, m26, m27, m28, m29, m30, m31, m32];

export const TODOS_USE_CASES: UseCase[] = MODULOS.flatMap((m) => m.useCases);
export const TODOS_LABS: Lab[] = MODULOS.flatMap((m) => m.labs);
export const TODAS_PERGUNTAS: Question[] = MODULOS.flatMap((m) => m.quiz);

export const MODULO_DO_CASO: Record<string, Module> = Object.fromEntries(
  MODULOS.flatMap((m) => m.useCases.map((u) => [u.id, m] as const)),
);

export const MODULO_DO_LAB: Record<string, Module> = Object.fromEntries(
  MODULOS.flatMap((m) => m.labs.map((l) => [l.id, m] as const)),
);
