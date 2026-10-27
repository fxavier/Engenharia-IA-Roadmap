import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TopicoEntrevista } from '../../types';
import { carregarTodos } from '../../entrevista';
import { BLOCOS } from '../../entrevista/blocos';
import { RichText } from '../../components/RichText';

/** Todas as cábulas numa página — para a revisão da véspera (e para imprimir). */
export function CabulaPage() {
  const [topicos, setTopicos] = useState<TopicoEntrevista[] | null>(null);
  useEffect(() => { carregarTodos().then(setTopicos); }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      <nav className="mb-3 text-xs text-muted print:hidden"><Link to="/entrevista" className="hover:text-strong">Entrevista</Link> / Cábula</nav>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-black">Cábula da véspera</h1>
          <p className="mt-2 max-w-2xl leading-relaxed">Os factos, fórmulas e frases de todos os tópicos, numa página. Lê de cima a baixo na noite anterior; se uma linha não te soa óbvia, abre o tópico.</p>
        </div>
        <button className="btn btn-ghost btn-sm print:hidden" onClick={() => window.print()}>⎙ Imprimir</button>
      </div>

      {!topicos && <p className="mt-8 text-sm text-muted">A carregar…</p>}
      {topicos && BLOCOS.map((b) => {
        const ts = topicos.filter((t) => t.bloco === b.id).sort((x, y) => x.numero - y.numero);
        if (!ts.length) return null;
        return (
          <section key={b.id} className="mt-10 break-inside-avoid-page">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><span className="size-3 rounded-full" style={{ background: b.accent }} />{b.nome}</h2>
            <div className="columns-1 gap-4 md:columns-2">
              {ts.map((t) => (
                <article key={t.id} className="card mb-4 break-inside-avoid px-4 py-3.5">
                  <Link to={`/entrevista/t/${t.id}`} className="font-bold text-strong hover:text-brand-700">{t.icon} {t.numero}. {t.titulo}</Link>
                  <ul className="mt-2 space-y-1.5 text-[0.84rem] leading-relaxed">
                    {t.essencial.map((e, i) => (
                      <li key={i} className="flex gap-2"><span aria-hidden className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-brand-500" /><span><RichText text={e} /></span></li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
