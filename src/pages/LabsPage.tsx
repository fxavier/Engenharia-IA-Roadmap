import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carregarAgregados } from '../content';
import { CodeLab } from '../components/CodeLab';
import { RichText } from '../components/RichText';
import { useProgress } from '../lib/progress';
import type { Lab } from '../types';

export function LabsPage() {
  const [params, setParams] = useSearchParams();
  const state = useProgress();
  const [labs, setLabs] = useState<Lab[] | null>(null);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(params.get('l'));
  const [lang, setLang] = useState('todas');

  useEffect(() => {
    let vivo = true;
    carregarAgregados().then((a) => {
      if (!vivo) return;
      setLabs(a.labs);
      setTitulos(Object.fromEntries(Object.entries(a.moduloDoLab).map(([k, m]) => [k, `${m.icon} ${m.title}`])));
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => { setActiveId(params.get('l')); }, [params]);

  const feitos = useMemo(() => (labs ?? []).filter((l) => state.labsDone[l.id]).length, [labs, state.labsDone]);
  const active = (labs ?? []).find((l) => l.id === activeId);
  const linguagens = useMemo(() => Array.from(new Set((labs ?? []).map((l) => (l.executavel && l.lang === 'python' ? 'browser' : l.lang)))), [labs]);
  const filtrados = (labs ?? []).filter((l) => lang === 'todas' || (lang === 'browser' ? l.executavel && l.lang === 'python' : l.lang === lang));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="eyebrow mb-1">Praticar</p>
      <h1 className="text-2xl font-black sm:text-3xl">Laboratórios de código</h1>
      <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
        Exercícios de código do «Balcão», com verificação imediata: um prompt RAG com citações, um retriever
        híbrido com RRF, um grafo LangGraph com interrupt, uma guarda contra prompt injection, um Dockerfile
        multi-stage, um workflow de CI com evals como gate. A verificação é estrutural — procura as construções
        certas no que escreves. Os laboratórios marcados «corre no browser» também executam em Pyodide, com o
        pacote <code className="font-mono">balcao</code>; os restantes confirmam-se no laboratório local com{' '}
        <code className="font-mono">uv run pytest</code>.
      </p>

      {!labs && (
        <p className="mt-8 flex items-center gap-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          A carregar os laboratórios…
        </p>
      )}

      {labs && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full surface-sunken">
              <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(feitos / labs.length) * 100}%` }} />
            </span>
            <span className="font-mono text-xs text-muted">{feitos}/{labs.length}</span>
          </div>

          {active ? (
            <div className="mt-6">
              <button className="btn btn-ghost btn-sm mb-3" onClick={() => { setActiveId(null); setParams({}, { replace: true }); }}>
                ← Todos os laboratórios
              </button>
              <p className="mb-2 text-xs text-muted">{titulos[active.id]}</p>
              <CodeLab lab={active} />
            </div>
          ) : (
            <>
            {labs.length === 0 && (
              <p className="mt-6 rounded-2xl border border-dashed border-soft px-4 py-8 text-center text-sm text-muted">
                Os laboratórios aparecem aqui à medida que os módulos são publicados.
              </p>
            )}
            {linguagens.length > 1 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {['todas', ...linguagens].map((x) => (
                  <button
                    key={x}
                    onClick={() => setLang(x)}
                    aria-pressed={lang === x}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === x ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'border border-soft surface text-muted hover:text-strong'}`}
                  >
                    {x === 'todas' ? 'todas' : x === 'browser' ? '▶ correm no browser' : x}
                  </button>
                ))}
              </div>
            )}
            <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
              {filtrados.map((l) => {
                const done = state.labsDone[l.id];
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => { setActiveId(l.id); setParams({ l: l.id }, { replace: true }); }}
                      className="card card-hover h-full w-full p-4 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip surface-sunken font-mono text-muted">{l.lang}</span>
                        <span className="chip surface-sunken text-muted">{'★'.repeat(l.difficulty)}{'☆'.repeat(3 - l.difficulty)}</span>
                        <span className="chip surface-sunken text-muted">{l.checks.length} verificações</span>
                        {l.executavel && l.lang === 'python' && <span className="chip bg-brand-500/12 text-brand-700 dark:text-brand-300">▶ browser</span>}
                        {done && <span className="chip bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">✓ Resolvido</span>}
                      </div>
                      <p className="mt-1.5 font-bold text-strong">{l.title}</p>
                      <p className="mt-0.5 line-clamp-3 text-[0.87rem] text-muted"><RichText text={l.brief} /></p>
                      <p className="mt-1 text-xs text-muted">{titulos[l.id]}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
