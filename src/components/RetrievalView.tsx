import { useState } from 'react';
import type { RetrievalMethod, RetrievalSpec } from '../types';
import { RichText } from './RichText';

export const METODO: Record<RetrievalMethod, { nome: string; sub: string; cor: string }> = {
  bm25: { nome: 'BM25', sub: 'lexical, por termos', cor: 'oklch(0.66 0.15 60)' },
  denso: { nome: 'Denso', sub: 'cosseno entre embeddings', cor: 'oklch(0.62 0.14 230)' },
  hibrido: { nome: 'Híbrido (RRF)', sub: 'fusão BM25 + denso', cor: 'var(--color-brand-600)' },
  rerank: { nome: 'Híbrido + re-rank', sub: 'RRF e re-ranking dos 20 primeiros', cor: 'oklch(0.58 0.16 300)' },
};

/** Seta de mudança de posição: `antes` é a posição (1-based) antes da fusão ou do re-ranking. */
export function Mudanca({ antes, agora }: { antes?: number; agora: number }) {
  if (antes === undefined) return null;
  const d = antes - agora;
  if (d === 0) return <span className="chip surface-sunken px-1.5 font-mono text-[0.62rem] text-muted" title={`Já estava em ${antes}.º`}>=</span>;
  const sobe = d > 0;
  return (
    <span
      className={`chip px-1.5 font-mono text-[0.62rem] ${sobe ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'}`}
      title={`Estava em ${antes}.º`}
    >
      {sobe ? '▲' : '▼'} {Math.abs(d)}
    </span>
  );
}

export function RetrievalView({ retrieval }: { retrieval: RetrievalSpec }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const m = METODO[retrieval.method];
  const max = Math.max(...retrieval.hits.map((h) => h.score), 1e-9);
  const anotados = retrieval.hits.filter((h) => h.relevante !== undefined);
  const relevantes = retrieval.hits.filter((h) => h.relevante).length;
  const topoK = retrieval.hits.slice(0, retrieval.k);
  const relevantesTopo = topoK.filter((h) => h.relevante).length;

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-soft surface shadow-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <span className="chip text-white" style={{ background: m.cor }}>Recuperação</span>
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{retrieval.title}</p>
        <span className="chip surface font-mono text-[0.68rem] text-muted" title={m.sub}>{m.nome}</span>
        <span className="chip surface font-mono text-[0.68rem] text-muted">k = {retrieval.k}</span>
        {anotados.length > 0 && (
          <span
            className={`chip font-mono text-[0.68rem] ${relevantesTopo > 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'}`}
            title="Chunks relevantes no top-k, segundo o conjunto dourado"
          >
            {relevantesTopo}/{Math.min(retrieval.k, retrieval.hits.length)} relevantes no top-{retrieval.k}
          </span>
        )}
      </header>

      <div className="px-4 pt-3.5">
        {retrieval.brief && <p className="mb-3 text-[0.9rem] leading-relaxed"><RichText text={retrieval.brief} /></p>}
        <div className="flex items-start gap-3 rounded-xl border border-soft surface-sunken px-3.5 py-2.5">
          <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm text-brand-700 dark:text-brand-300">⌕</span>
          <div className="min-w-0">
            <p className="eyebrow">Consulta</p>
            <p className="text-[0.95rem] font-medium text-strong wrap-anywhere">«{retrieval.query}»</p>
          </div>
        </div>
      </div>

      <ol className="space-y-1.5 p-3 sm:p-4">
        {retrieval.hits.map((h, i) => {
          const pos = i + 1;
          const dentro = pos <= retrieval.k;
          const pct = Math.max(3, (h.score / max) * 100);
          const abertoAqui = aberto === i;
          return (
            <li key={`${h.doc}-${i}`} className={`rounded-xl border transition ${dentro ? 'border-soft surface' : 'border-dashed border-soft opacity-60'} ${h.relevante ? 'shadow-[inset_3px_0_0_oklch(0.65_0.15_155)]' : ''}`}>
              <button className="flex w-full items-start gap-3 px-3 py-2.5 text-left" onClick={() => setAberto(abertoAqui ? null : i)} aria-expanded={abertoAqui}>
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${dentro ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'surface-sunken text-muted'}`}>
                  {pos}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <code className="font-mono text-[0.8rem] font-semibold text-strong">{h.doc}</code>
                    <Mudanca antes={h.antes} agora={pos} />
                    {h.relevante === true && <span className="chip bg-emerald-500/15 text-[0.62rem] text-emerald-700 dark:text-emerald-300">✓ relevante</span>}
                    {h.relevante === false && <span className="chip surface-sunken text-[0.62rem] text-muted">ruído</span>}
                  </span>
                  <span className={`mt-1 block text-[0.85rem] leading-relaxed text-body ${abertoAqui ? '' : 'line-clamp-2'}`}>
                    <RichText text={h.texto} />
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full surface-sunken">
                      <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: h.relevante === false ? 'var(--text-muted)' : m.cor }} />
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono text-[0.7rem] text-muted tabular">{h.score.toFixed(4)}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {(retrieval.note || anotados.length > 0) && (
        <figcaption className="border-t border-soft surface-sunken px-4 py-2 text-xs leading-relaxed text-muted">
          {anotados.length > 0 && <span className="mr-1">{relevantes} de {retrieval.hits.length} resultados marcados como relevantes no conjunto dourado. Os que ficam abaixo de k aparecem esbatidos: não entram no contexto.</span>}
          {retrieval.note && <RichText text={retrieval.note} />}
        </figcaption>
      )}
    </figure>
  );
}
