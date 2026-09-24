import { useMemo } from 'react';
import type { Question } from '../types';
import { RichText } from './RichText';
import { progress, useProgress } from '../lib/progress';

export function isCorrect(q: Question, given: number[] | undefined): boolean {
  if (!given || given.length !== q.answer.length) return false;
  const a = [...given].sort((x, y) => x - y);
  const b = [...q.answer].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

function letter(i: number) { return String.fromCharCode(65 + i); }

export function QuestionCard({
  q, index, given, submitted, onChange,
}: {
  q: Question;
  index: number;
  given: number[] | undefined;
  submitted: boolean;
  onChange: (next: number[]) => void;
}) {
  const multi = q.answer.length > 1;
  const chosen = given ?? [];
  const ok = isCorrect(q, given);

  const toggle = (i: number) => {
    if (submitted) return;
    if (!multi) { onChange([i]); return; }
    onChange(chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i].sort((a, b) => a - b));
  };

  return (
    <li className="card p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="chip bg-brand-500/12 text-brand-700 dark:text-brand-300">Pergunta {index + 1}</span>
        <span className="chip surface-sunken text-muted">{q.topic}</span>
        {multi && <span className="chip bg-accent-500/15 text-accent-700 dark:text-accent-300">Escolhe {q.answer.length}</span>}
        {submitted && (
          <span className={`chip ml-auto ${ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>
            {ok ? '✓ Certo' : '✗ Errado'}
          </span>
        )}
      </div>

      <p className="mb-3 leading-relaxed font-medium text-strong"><RichText text={q.prompt} /></p>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const picked = chosen.includes(i);
          const correct = q.answer.includes(i);
          let cls = 'border-soft surface-sunken';
          if (submitted) {
            if (correct) cls = 'border-emerald-400/70 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10';
            else if (picked) cls = 'border-rose-400/70 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10';
          } else if (picked) {
            cls = 'border-brand-500 bg-brand-500/10';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={submitted}
              aria-pressed={picked}
              className={`flex w-full gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[0.9rem] transition ${cls} ${submitted ? 'cursor-default' : 'hover:border-brand-400'}`}
            >
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center text-xs font-bold ${multi ? 'rounded-md' : 'rounded-full'} ${picked ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'surface text-muted'}`}>
                {letter(i)}
              </span>
              <span className="flex-1">
                <RichText text={opt} />
                {submitted && q.why?.[i] && (
                  <span className="mt-1 block text-xs text-muted"><RichText text={q.why[i]} /></span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="animate-fade-up mt-3 rounded-xl border border-soft surface-sunken p-3.5">
          <p className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">Porquê</p>
          <p className="text-[0.88rem] leading-relaxed"><RichText text={q.explain} /></p>
          {q.refs && q.refs.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-3 text-xs">
              {q.refs.map((r) => (
                <a key={r.url} className="link" href={r.url} target="_blank" rel="noreferrer noopener">{r.label} ↗</a>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function Quiz({ moduleId, questions }: { moduleId: string; questions: Question[] }) {
  const state = useProgress();
  const q = state.quiz[moduleId] ?? { answers: {}, submitted: false };

  const score = useMemo(
    () => questions.reduce((acc, item) => acc + (isCorrect(item, q.answers[item.id]) ? 1 : 0), 0),
    [questions, q.answers],
  );

  const answered = questions.filter((item) => (q.answers[item.id] ?? []).length > 0).length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  if (questions.length === 0) {
    return <p className="text-sm text-muted">Este módulo não tem quiz.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-soft surface-sunken px-4 py-3">
        <p className="text-sm">
          {q.submitted
            ? <><strong className="text-strong">{score}/{questions.length}</strong> correctas · {pct}%</>
            : <>Respondidas <strong className="text-strong">{answered}</strong> de {questions.length}</>}
        </p>
        <div className="flex gap-2">
          {!q.submitted && (
            <button className="btn btn-primary btn-sm" disabled={answered === 0} onClick={() => progress.submitQuiz(moduleId)}>
              Corrigir
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => progress.resetQuiz(moduleId)}>Recomeçar</button>
        </div>
      </div>

      <ol className="space-y-4">
        {questions.map((item, i) => (
          <QuestionCard
            key={item.id}
            q={item}
            index={i}
            given={q.answers[item.id]}
            submitted={q.submitted}
            onChange={(next) => progress.setQuizAnswer(moduleId, item.id, next)}
          />
        ))}
      </ol>
    </div>
  );
}
