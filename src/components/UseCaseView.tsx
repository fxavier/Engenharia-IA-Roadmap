import { useState } from 'react';
import type { UseCase } from '../types';
import { RichText } from './RichText';
import { DiagramView } from './Diagram';
import { ToolGrid, RefList } from './Blocks';
import { progress, useProgress } from '../lib/progress';

export function UseCaseView({ uc, defaultOpen = false }: { uc: UseCase; defaultOpen?: boolean }) {
  const state = useProgress();
  const [revealed, setRevealed] = useState(defaultOpen);
  const done = state.useCases[uc.id] ?? false;

  return (
    <article className="card overflow-hidden">
      <header className="border-b border-soft surface-sunken px-4 py-3.5 sm:px-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="chip bg-accent-500/15 text-accent-700 dark:text-accent-300">Caso de uso</span>
          <span className="chip surface text-muted">{uc.area}</span>
          <span className="chip surface text-muted">{'●'.repeat(uc.level)}{'○'.repeat(3 - uc.level)} nível {uc.level}</span>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={done} onChange={(e) => progress.markUseCase(uc.id, e.target.checked)} className="size-4 accent-brand-600" />
            Estudado
          </label>
        </div>
        <h3 className="text-lg font-bold">{uc.title}</h3>
      </header>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-[0.94rem] leading-relaxed"><RichText text={uc.scenario} /></p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-soft p-3.5">
            <p className="mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">Requisitos</p>
            <ul className="ml-4 list-disc space-y-1 text-[0.87rem] marker:text-brand-500">
              {uc.requirements.map((r, i) => <li key={i}><RichText text={r} /></li>)}
            </ul>
          </div>
          {uc.constraints && uc.constraints.length > 0 && (
            <div className="rounded-xl border border-soft p-3.5">
              <p className="mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">Restrições</p>
              <ul className="ml-4 list-disc space-y-1 text-[0.87rem] marker:text-accent-500">
                {uc.constraints.map((r, i) => <li key={i}><RichText text={r} /></li>)}
              </ul>
            </div>
          )}
        </div>

        {!revealed ? (
          <div className="mt-5 rounded-2xl border border-dashed border-soft p-6 text-center">
            <p className="mb-3 text-sm text-muted">Desenha a tua solução antes de comparar. Que peças escolhes, e porquê?</p>
            <button className="btn btn-primary" onClick={() => setRevealed(true)}>Ver resolução comentada</button>
          </div>
        ) : (
          <div className="animate-fade-up mt-5">
            <h4 className="mb-2 text-sm font-bold tracking-widest text-muted uppercase">Raciocínio</h4>
            <ol className="space-y-3">
              {uc.approach.map((s, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-600 text-xs font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-strong"><RichText text={s.title} /></p>
                    <p className="text-[0.9rem] leading-relaxed"><RichText text={s.text} /></p>
                  </div>
                </li>
              ))}
            </ol>

            {uc.diagram && <DiagramView diagram={uc.diagram} />}

            <div className="my-5 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="mb-1 text-xs font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">Solução</p>
              <p className="text-[0.93rem] leading-relaxed"><RichText text={uc.solution} /></p>
            </div>

            <h4 className="mt-6 mb-1 text-sm font-bold tracking-widest text-muted uppercase">Peças e o papel de cada uma</h4>
            <ToolGrid items={uc.tools} />

            <h4 className="mt-6 mb-2 text-sm font-bold tracking-widest text-muted uppercase">Alternativas rejeitadas</h4>
            <ul className="space-y-2">
              {uc.rejected.map((r, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-rose-300/50 bg-rose-50/60 px-3.5 py-2.5 text-[0.88rem] dark:border-rose-500/25 dark:bg-rose-500/[0.07]">
                  <span aria-hidden className="text-rose-600 dark:text-rose-400">✘</span>
                  <span><strong className="text-strong">{r.option}</strong> — <RichText text={r.why} /></span>
                </li>
              ))}
            </ul>

            {uc.costNote && (
              <div className="mt-5 rounded-2xl border border-soft surface-sunken p-4">
                <p className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">Nota de custo e operação</p>
                <p className="text-[0.88rem] leading-relaxed"><RichText text={uc.costNote} /></p>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-accent-400/60 bg-accent-50 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
              <p className="mb-1.5 text-xs font-bold tracking-widest text-accent-700 uppercase dark:text-accent-300">🎯 Levar daqui</p>
              <ul className="ml-4 list-disc space-y-1 text-[0.88rem] marker:text-accent-600">
                {uc.takeaways.map((t, i) => <li key={i}><RichText text={t} /></li>)}
              </ul>
            </div>

            {uc.refs && uc.refs.length > 0 && <RefList items={uc.refs} />}
          </div>
        )}
      </div>
    </article>
  );
}
