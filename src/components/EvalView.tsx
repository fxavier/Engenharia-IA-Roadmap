import { useState } from 'react';
import type { EvalSpec } from '../types';
import { RichText } from './RichText';

export function EvalView({ spec }: { spec: EvalSpec }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const comResultado = spec.cases.filter((c) => c.pass !== undefined);
  const passou = comResultado.filter((c) => c.pass).length;

  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">Avaliação</span>
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{spec.title}</p>
        <span className="chip surface font-mono text-[0.68rem] text-muted">{spec.metric}</span>
        {comResultado.length > 0 && (
          <span className={`chip ${passou === comResultado.length ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
            {passou}/{comResultado.length}
          </span>
        )}
      </header>

      {spec.brief && <p className="px-4 pt-3 text-[0.9rem] leading-relaxed"><RichText text={spec.brief} /></p>}

      <ul className="divide-y divide-[var(--border-soft)]">
        {spec.cases.map((c) => {
          const abertoAqui = aberto === c.id;
          return (
            <li key={c.id}>
              <button className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:surface-sunken" onClick={() => setAberto(abertoAqui ? null : c.id)} aria-expanded={abertoAqui}>
                <span aria-hidden className={`mt-0.5 shrink-0 font-bold ${c.pass === undefined ? 'text-muted' : c.pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {c.pass === undefined ? '·' : c.pass ? '✓' : '✗'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[0.68rem] text-muted">{c.id}</span>
                  <span className="block text-[0.87rem] leading-relaxed"><RichText text={c.input} /></span>
                </span>
                <span aria-hidden className="shrink-0 text-muted">{abertoAqui ? '−' : '+'}</span>
              </button>
              {abertoAqui && (
                <div className="animate-fade-up mx-4 mb-3 rounded-xl border border-soft surface-sunken px-3 py-2 text-[0.84rem]">
                  <p><span className="font-semibold text-strong">Esperado:</span> <RichText text={c.expect} /></p>
                  {c.got && <p className="mt-0.5"><span className="font-semibold text-strong">Obtido:</span> <RichText text={c.got} /></p>}
                  {c.rubric && c.rubric.length > 0 && (
                    <>
                      <p className="mt-1.5 font-semibold text-strong">Rubrica</p>
                      <ul className="ml-5 list-disc space-y-0.5">
                        {c.rubric.map((r, i) => <li key={i}><RichText text={r} /></li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {spec.runs && spec.runs.length > 0 && (
        <div className="scrollbar-thin overflow-x-auto border-t border-soft">
          <table className="w-full border-collapse text-left text-[0.82rem]">
            <thead>
              <tr className="surface-sunken">
                {['versão', 'passou', 'nota'].map((h) => (
                  <th key={h} className="border-b border-soft px-3.5 py-2 font-semibold whitespace-nowrap text-strong">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.runs.map((r) => (
                <tr key={r.versao} className="odd:bg-black/[0.015] dark:odd:bg-white/[0.02]">
                  <td className="border-b border-soft/60 px-3.5 py-2 font-mono whitespace-nowrap">{r.versao}</td>
                  <td className="border-b border-soft/60 px-3.5 py-2 font-mono">
                    {r.passou}/{r.total}
                    <span className="ml-2 text-muted">{((r.passou / r.total) * 100).toFixed(0)}%</span>
                  </td>
                  <td className="border-b border-soft/60 px-3.5 py-2"><RichText text={r.nota} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spec.note && <p className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted"><RichText text={spec.note} /></p>}
    </section>
  );
}
