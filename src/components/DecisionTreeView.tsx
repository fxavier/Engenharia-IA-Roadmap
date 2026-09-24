import { useMemo, useState } from 'react';
import type { DecisionTree } from '../types';
import { RichText } from './RichText';

export function DecisionTreeView({ tree }: { tree: DecisionTree }) {
  const byId = useMemo(() => new Map(tree.nodes.map((n) => [n.id, n])), [tree]);
  const [path, setPath] = useState<{ node: string; chose?: string }[]>([{ node: tree.start }]);

  const current = byId.get(path[path.length - 1].node);
  const answered = path.slice(0, -1);

  const choose = (next: string, label: string) => {
    setPath((p) => [...p.slice(0, -1), { ...p[p.length - 1], chose: label }, { node: next }]);
  };

  const back = () => setPath((p) => (p.length > 1 ? p.slice(0, -1).map((x, i, arr) => (i === arr.length - 1 ? { node: x.node } : x)) : p));
  const restart = () => setPath([{ node: tree.start }]);

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-soft surface-sunken px-4 py-3">
        <div>
          <p className="text-sm font-bold text-strong">🌳 {tree.title}</p>
          {tree.intro && <p className="mt-0.5 text-xs text-muted"><RichText text={tree.intro} /></p>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={back} disabled={path.length === 1}>← Voltar</button>
          <button className="btn btn-ghost btn-sm" onClick={restart} disabled={path.length === 1}>Reiniciar</button>
        </div>
      </header>

      {answered.length > 0 && (
        <ol className="border-b border-soft px-4 py-3 text-xs">
          {answered.map((step, i) => {
            const n = byId.get(step.node);
            return (
              <li key={i} className="flex gap-2 py-0.5 text-muted">
                <span className="font-mono text-[0.65rem] opacity-60">{i + 1}.</span>
                <span className="flex-1">{n?.question}</span>
                <span className="font-semibold text-brand-600 dark:text-brand-300">{step.chose}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="p-4">
        {!current && <p className="text-sm text-muted">Nó inexistente: verifica a árvore.</p>}

        {current?.question && (
          <>
            <p className="mb-3 font-semibold text-strong"><RichText text={current.question} /></p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(current.options ?? []).map((o) => (
                <button
                  key={o.label}
                  onClick={() => choose(o.next, o.label)}
                  className="card card-hover p-3 text-left text-sm"
                >
                  <span className="font-semibold text-strong">{o.label}</span>
                  {o.note && <span className="mt-1 block text-xs text-muted"><RichText text={o.note} /></span>}
                </button>
              ))}
            </div>
          </>
        )}

        {current?.answer && (
          <div className="animate-pop rounded-2xl border border-emerald-400/50 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">Recomendação</p>
            <p className="mt-1 text-lg font-bold text-strong"><RichText text={current.answer} /></p>
            {current.detail && <p className="mt-2 text-sm leading-relaxed"><RichText text={current.detail} /></p>}
          </div>
        )}
      </div>
    </div>
  );
}
