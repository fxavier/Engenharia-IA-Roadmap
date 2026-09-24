import type { Lab, LabCheck } from '../types';

export interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  why?: string;
}

/** Espaco em branco colapsado: torna as expressoes robustas a indentacao e quebras de linha. */
export function normalize(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
}

function matches(code: string, flat: string, c: LabCheck): boolean {
  let re: RegExp;
  try {
    re = new RegExp(c.re, c.flags ?? 'm');
  } catch {
    return false;
  }
  return re.test(code) || re.test(flat);
}

export function runChecks(code: string, checks: LabCheck[]): CheckResult[] {
  const flat = normalize(code);
  return checks.map((c) => {
    const hit = matches(code, flat, c);
    const ok = c.forbid ? !hit : hit;
    return { id: c.id, label: c.label, ok, why: ok ? undefined : c.why };
  });
}

export function labScore(results: CheckResult[]): { passed: number; total: number; done: boolean } {
  const passed = results.filter((r) => r.ok).length;
  return { passed, total: results.length, done: results.length > 0 && passed === results.length };
}

/** Verificacao de sanidade usada pelos testes: a solucao tem de passar as proprias verificacoes. */
export function solutionPasses(lab: Lab): boolean {
  return labScore(runChecks(lab.solution, lab.checks)).done;
}
