import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Adr, AdrStatus } from '../types';
import { RichText } from './RichText';

export const ADR_ESTADO: Record<AdrStatus, { label: string; cls: string }> = {
  aceite: { label: 'Aceite', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  proposto: { label: 'Proposto', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  substituido: { label: 'Substituído', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  rejeitado: { label: 'Rejeitado', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
};

function numero(id: string): string {
  return id.replace('adr-', '');
}

/** Cartão de decisão. `compact` é o que aparece dentro de um módulo: mostra o
 *  essencial e abre o resto a pedido, para não interromper a leitura. */
export function AdrCard({ adr, compact = false, aberto = false }: { adr: Adr; compact?: boolean; aberto?: boolean }) {
  const [expandido, setExpandido] = useState(aberto || !compact);
  const e = ADR_ESTADO[adr.status];

  return (
    <article className="my-5 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-soft surface-sunken px-4 py-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-brand-700 px-2 py-1 font-mono text-[0.7rem] font-black text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]">
          ADR {numero(adr.id)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] leading-snug font-bold text-strong">{adr.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted">
            <span className={`chip ${e.cls}`}>{e.label}</span>
            <span className="chip surface-sunken">{adr.area}</span>
            <span>{adr.date}</span>
            {adr.supersedes && <span className="chip bg-amber-500/15 text-amber-700 dark:text-amber-300">substitui ADR {numero(adr.supersedes)}</span>}
          </p>
        </div>
        {compact && (
          <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setExpandido((v) => !v)} aria-expanded={expandido}>
            {expandido ? 'Fechar' : 'Ler a decisão'}
          </button>
        )}
      </header>

      <div className="px-4 py-3.5">
        <p className="rounded-xl border border-brand-300/70 bg-brand-50 px-3.5 py-2.5 text-[0.92rem] leading-relaxed font-semibold text-strong dark:border-brand-500/30 dark:bg-brand-500/10">
          <RichText text={adr.decision} />
        </p>

        {expandido && (
          <div className="animate-fade-up mt-4 space-y-4 text-[0.9rem] leading-relaxed">
            <Seccao titulo="Contexto"><RichText text={adr.context} /></Seccao>

            <Seccao titulo="Forças em jogo">
              <ul className="ml-5 list-disc space-y-1 marker:text-brand-500">
                {adr.drivers.map((d, i) => <li key={i}><RichText text={d} /></li>)}
              </ul>
            </Seccao>

            <Seccao titulo="Opções consideradas">
              <div className="grid gap-3 md:grid-cols-2">
                {adr.options.map((o) => {
                  const escolhida = adr.decision.toLowerCase().includes(o.name.toLowerCase().split(' ')[0]);
                  return (
                    <div key={o.name} className={`rounded-xl border p-3 ${escolhida ? 'border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/[0.07]' : 'border-soft surface-sunken'}`}>
                      <p className="mb-1.5 text-[0.88rem] font-bold text-strong">{o.name}</p>
                      <ul className="space-y-1 text-[0.83rem]">
                        {o.pros.map((p, i) => (
                          <li key={`p${i}`} className="flex gap-1.5"><span aria-hidden className="text-emerald-600 dark:text-emerald-400">+</span><span><RichText text={p} /></span></li>
                        ))}
                        {o.cons.map((c, i) => (
                          <li key={`c${i}`} className="flex gap-1.5"><span aria-hidden className="text-rose-600 dark:text-rose-400">−</span><span><RichText text={c} /></span></li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Seccao>

            <Seccao titulo="Porquê"><RichText text={adr.rationale} /></Seccao>

            <Seccao titulo="Consequências">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/[0.07]">
                  <p className="mb-1.5 text-[0.8rem] font-bold tracking-wide text-strong uppercase">O que ganhamos</p>
                  <ul className="ml-4 list-disc space-y-1 text-[0.85rem] marker:text-emerald-500">
                    {adr.consequences.good.map((g, i) => <li key={i}><RichText text={g} /></li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-rose-300/60 bg-rose-50/60 p-3 dark:border-rose-500/30 dark:bg-rose-500/[0.07]">
                  <p className="mb-1.5 text-[0.8rem] font-bold tracking-wide text-strong uppercase">O que vai doer</p>
                  <ul className="ml-4 list-disc space-y-1 text-[0.85rem] marker:text-rose-500">
                    {adr.consequences.bad.map((b, i) => <li key={i}><RichText text={b} /></li>)}
                  </ul>
                </div>
              </div>
            </Seccao>

            {adr.validation && (
              <Seccao titulo="Como se sabe que continua certa">
                <p className="rounded-xl border border-accent-400/70 bg-accent-50 px-3.5 py-2.5 dark:border-accent-500/30 dark:bg-accent-500/10">
                  <RichText text={adr.validation} />
                </p>
              </Seccao>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-soft pt-3 text-[0.8rem] text-muted">
              <span>Decidido por: {adr.deciders.join(', ')}</span>
              {adr.related && adr.related.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5">
                  Relacionados:
                  {adr.related.map((r) => (
                    <Link key={r} to={`/decisoes?a=${r}`} className="chip surface-sunken hover:text-strong">ADR {numero(r)}</Link>
                  ))}
                </span>
              )}
              {adr.module && <Link to={`/modulo/${adr.module}`} className="link">Ver o módulo onde isto se aprofunda →</Link>}
            </div>

            {adr.refs && adr.refs.length > 0 && (
              <div className="rounded-xl border border-soft surface-sunken p-3.5">
                <p className="mb-1.5 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Fontes</p>
                <ul className="space-y-1 text-[0.85rem]">
                  {adr.refs.map((r) => (
                    <li key={r.url} className="flex gap-2">
                      <span aria-hidden className="text-muted">↗</span>
                      <a className="link" href={r.url} target="_blank" rel="noreferrer noopener">{r.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-[0.7rem] font-bold tracking-widest text-muted uppercase">{titulo}</p>
      {children}
    </section>
  );
}
