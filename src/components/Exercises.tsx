import { useState } from 'react';
import type { Exercise } from '../types';
import { RichText } from './RichText';
import { progress, useProgress } from '../lib/progress';

function normalize(s: string): string {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

const KIND: Record<Exercise['kind'], { label: string; cls: string }> = {
  input: { label: 'Resposta curta', cls: 'bg-brand-500/12 text-brand-700 dark:text-brand-300' },
  open: { label: 'Discussão', cls: 'bg-accent-500/15 text-accent-700 dark:text-accent-300' },
  design: { label: 'Desenho de arquitectura', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  code: { label: 'Código / CLI', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
};

function ExerciseCard({ ex }: { ex: Exercise }) {
  const state = useProgress();
  const done = state.exercises[ex.id] ?? false;
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<'idle' | 'ok' | 'no'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const check = () => {
    const accepted = (ex.accept ?? []).map(normalize);
    const got = normalize(value);
    const ok = accepted.some((a) => a === got || (a.length > 6 && got.includes(a)));
    setVerdict(ok ? 'ok' : 'no');
    if (ok) progress.markExercise(ex.id, true);
  };

  return (
    <li className="card p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`chip ${KIND[ex.kind].cls}`}>{KIND[ex.kind].label}</span>
        <span className="chip surface-sunken text-muted">{'★'.repeat(ex.difficulty)}{'☆'.repeat(3 - ex.difficulty)}</span>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => progress.markExercise(ex.id, e.target.checked)}
            className="size-4 accent-brand-600"
          />
          Resolvido
        </label>
      </div>

      <h4 className="font-bold text-strong">{ex.title}</h4>
      <p className="mt-1.5 text-[0.92rem] leading-relaxed"><RichText text={ex.statement} /></p>

      {ex.kind === 'input' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="field field-mono max-w-md flex-1"
            value={value}
            placeholder="A tua resposta…"
            onChange={(e) => { setValue(e.target.value); setVerdict('idle'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
          />
          <button className="btn btn-primary btn-sm" onClick={check} disabled={!value.trim()}>Verificar</button>
          {verdict === 'ok' && <span className="chip animate-pop bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">✓ Correcto</span>}
          {verdict === 'no' && <span className="chip animate-pop bg-rose-500/15 text-rose-700 dark:text-rose-300">✗ Tenta outra vez</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {ex.hint && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHint((v) => !v)}>
            {showHint ? 'Esconder pista' : '💡 Pista'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSolution((v) => !v)}>
          {showSolution ? 'Esconder resolução' : 'Ver resolução'}
        </button>
      </div>

      {showHint && ex.hint && (
        <p className="animate-fade-up mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[0.88rem] dark:border-amber-500/30 dark:bg-amber-500/10">
          <RichText text={ex.hint} />
        </p>
      )}

      {showSolution && (
        <div className="animate-fade-up mt-3 rounded-xl border border-soft surface-sunken p-3.5">
          <p className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">Resolução</p>
          <div className="space-y-2 text-[0.88rem] leading-relaxed">
            {ex.solution.split('\n\n').map((para, i) => (
              para.startsWith('```')
                ? <pre key={i} className="scrollbar-thin overflow-x-auto rounded-lg border border-soft surface p-3 font-mono text-[0.78rem]">{para.replace(/```\w*\n?/g, '')}</pre>
                : <p key={i}><RichText text={para} /></p>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export function Exercises({ exercises }: { exercises: Exercise[] }) {
  if (exercises.length === 0) return <p className="text-sm text-muted">Este módulo não tem exercícios.</p>;
  return <ol className="space-y-4">{exercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}</ol>;
}
