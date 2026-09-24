import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { WIDGETS } from './widgets';
import { getMeta } from '../content';
import type { WidgetId } from '../types';
import { GRUPOS_SIMULADORES, MODULO_DO_WIDGET } from '../data/simuladores';

type Entrada = [WidgetId, (typeof WIDGETS)[WidgetId]];

/** Galeria de todos os simuladores, por grupo. Abre um de cada vez, por baixo
 *  do grupo a que pertence, para a página não montar 29 componentes pesados. */
export function SimuladoresGaleria({ activo, onActivo }: { activo: WidgetId | null; onActivo: (id: WidgetId | null) => void }) {
  const entradas = useMemo(() => Object.entries(WIDGETS) as Entrada[], []);
  const painel = useRef<HTMLDivElement>(null);
  const [filtro, setFiltro] = useState('todos');

  const grupos = useMemo(() => {
    const presentes = Array.from(new Set(entradas.map(([, w]) => w.group)));
    const conhecidos = GRUPOS_SIMULADORES.filter((g) => presentes.includes(g.nome));
    const extra = presentes
      .filter((n) => !GRUPOS_SIMULADORES.some((g) => g.nome === n))
      .map((nome) => ({ nome, blurb: '', accent: 'var(--color-brand-500)' }));
    return [...conhecidos, ...extra];
  }, [entradas]);

  useEffect(() => {
    if (!activo || !painel.current) return;
    const t = setTimeout(() => painel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [activo]);

  const visiveis = grupos.filter((g) => filtro === 'todos' || g.nome === filtro);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Grupos de simuladores">
        {['todos', ...grupos.map((g) => g.nome)].map((n) => (
          <button
            key={n}
            role="tab"
            aria-selected={filtro === n}
            onClick={() => setFiltro(n)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filtro === n ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'border border-soft surface text-muted hover:text-strong'
            }`}
          >
            {n === 'todos' ? `Todos · ${entradas.length}` : `${n} · ${entradas.filter(([, w]) => w.group === n).length}`}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {visiveis.map((g) => {
          const doGrupo = entradas.filter(([, w]) => w.group === g.nome);
          const activoAqui = activo && WIDGETS[activo]?.group === g.nome ? activo : null;
          return (
            <section key={g.nome} aria-labelledby={`g-${g.nome}`}>
              <div className="mb-3 flex items-start gap-3">
                <span aria-hidden className="mt-1.5 h-8 w-1.5 shrink-0 rounded-full" style={{ background: g.accent }} />
                <div className="min-w-0">
                  <h2 id={`g-${g.nome}`} className="text-lg font-bold">{g.nome}</h2>
                  {g.blurb && <p className="max-w-3xl text-[0.86rem] text-muted">{g.blurb}</p>}
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {doGrupo.map(([id, w]) => {
                  const on = activo === id;
                  return (
                    <button
                      key={id}
                      onClick={() => onActivo(on ? null : id)}
                      aria-pressed={on}
                      className={`card card-hover group flex flex-col items-start gap-1.5 p-3.5 text-left ${on ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      <span className="flex w-full items-center gap-2">
                        <span aria-hidden className="flex size-7 items-center justify-center rounded-lg text-[0.7rem] font-black text-white" style={{ background: g.accent }}>
                          {w.name.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-bold text-strong">{w.name}</span>
                        <span aria-hidden className={`text-xs transition ${on ? 'text-brand-600' : 'text-muted group-hover:text-strong'}`}>{on ? '−' : '+'}</span>
                      </span>
                      <span className="text-[0.82rem] leading-relaxed text-muted">{w.blurb}</span>
                    </button>
                  );
                })}
              </div>

              {activoAqui && (
                <div ref={painel} className="animate-fade-up mt-4 scroll-mt-20 rounded-2xl border border-brand-300/60 bg-brand-500/[0.04] p-2 sm:p-4 dark:border-brand-500/30">
                  <div className="flex flex-wrap items-center gap-2 px-2 pt-1">
                    <p className="text-sm font-bold text-strong">{WIDGETS[activoAqui].name}</p>
                    <PaginaDoModulo id={activoAqui} />
                    <button className="btn btn-ghost btn-sm ml-auto" onClick={() => onActivo(null)}>Fechar</button>
                  </div>
                  {WIDGETS[activoAqui].render()}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PaginaDoModulo({ id }: { id: WidgetId }) {
  const m = getMeta(MODULO_DO_WIDGET[id]);
  if (!m) return <span className="chip surface-sunken text-muted">módulo {MODULO_DO_WIDGET[id]}</span>;
  return (
    <Link to={`/modulo/${m.id}`} className="chip bg-brand-500/12 text-brand-700 hover:underline dark:text-brand-300">
      {m.icon} Módulo {m.number} · {m.title}
    </Link>
  );
}
