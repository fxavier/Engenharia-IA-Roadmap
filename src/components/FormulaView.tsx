import type { Formula } from '../types';
import { RichText } from './RichText';

/** Uma fórmula com a leitura em palavras e o significado de cada símbolo no «Balcão». */
export function FormulaView({ formula }: { formula: Formula }) {
  return (
    <figure className="my-5 overflow-hidden rounded-2xl border border-accent-400/50 dark:border-accent-500/25">
      <figcaption className="border-b border-soft bg-accent-500/[0.09] px-4 py-2 text-sm font-bold text-strong">
        {formula.title}
      </figcaption>

      <div className="scrollbar-thin overflow-x-auto px-4 py-4 text-center">
        <code className="font-mono text-[1.05rem] leading-relaxed font-semibold whitespace-pre text-strong">
          {formula.expr}
        </code>
      </div>

      <div className="border-t border-soft px-4 py-3">
        <p className="text-[0.9rem] leading-relaxed">
          <span className="font-semibold text-strong">Em palavras: </span>
          <RichText text={formula.reading} />
        </p>
        <dl className="mt-2.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {formula.where.map((w) => (
            <div key={w.sym} className="flex gap-2 text-[0.85rem]">
              <dt className="shrink-0 font-mono font-bold text-accent-700 dark:text-accent-300">{w.sym}</dt>
              <dd className="min-w-0 text-muted"><RichText text={w.means} /></dd>
            </div>
          ))}
        </dl>
        {formula.note && (
          <p className="mt-2.5 border-t border-soft pt-2.5 text-[0.83rem] text-muted">
            <RichText text={formula.note} />
          </p>
        )}
      </div>
    </figure>
  );
}
