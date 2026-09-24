import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { carregarModulo, moduleNeighbours } from '../content';
import { ModuloContexto } from '../components/ModuloContexto';
import type { Module } from '../types';
import { PART_OF } from '../data/parts';
import { BlockView } from '../components/Blocks';
import { Quiz } from '../components/Quiz';
import { Exercises } from '../components/Exercises';
import { CodeLab } from '../components/CodeLab';
import { UseCaseView } from '../components/UseCaseView';
import { progress, useProgress } from '../lib/progress';
import { RichText } from '../components/RichText';
import { ADRS } from '../data/adr';
import { POR_CAMINHO } from '../data/repo';

type Tab = 'materia' | 'labs' | 'exercicios' | 'quiz' | 'casos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'materia', label: 'Matéria' },
  { id: 'labs', label: 'Laboratórios' },
  { id: 'exercicios', label: 'Exercícios' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'casos', label: 'Casos de uso' },
];

export function ModulePage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const state = useProgress();
  const [tab, setTab] = useState<Tab>('materia');
  const [module, setModule] = useState<Module | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    setModule(null);
    setErro(false);
    carregarModulo(id).then((m) => {
      if (!vivo) return;
      if (m) { setModule(m); progress.visit(m.id); } else setErro(true);
    });
    return () => { vivo = false; };
  }, [id]);
  useEffect(() => { setTab('materia'); }, [id]);

  useEffect(() => {
    const s = params.get('s');
    if (s) {
      const el = document.getElementById(`sec-${s}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, [params]);

  const { prev, next } = useMemo(() => moduleNeighbours(id), [id]);
  const doneSections = state.sections[id] ?? [];

  /* Barra de contexto: as decisões que este módulo desenvolve e os ficheiros
     do repositório do laboratório que ele mostra. Sai do próprio conteúdo —
     não há nenhuma lista a manter à mão. */
  const adrsDoModulo = useMemo(() => ADRS.filter((a) => a.module === id), [id]);
  const ficheiros = useMemo(() => {
    const vistos: string[] = [];
    for (const s of module?.sections ?? []) {
      for (const b of s.blocks) {
        if (b.type === 'file' && !vistos.includes(b.ref)) vistos.push(b.ref);
      }
    }
    return vistos;
  }, [module]);

  if (erro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-bold">Módulo não encontrado</p>
        <Link to="/" className="link mt-2 inline-block">Voltar ao início</Link>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
        <span className="flex items-center gap-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          A carregar o módulo…
        </span>
      </div>
    );
  }

  const pct = Math.round((doneSections.length / module.sections.length) * 100);
  const part = PART_OF[module.part];

  return (
    <ModuloContexto.Provider value={module}>
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div
          className="relative mb-5 overflow-hidden rounded-3xl border border-soft p-5 sm:p-7"
          style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${part.accent} 16%, var(--surface-raised)), var(--surface-raised) 65%)` }}
        >
          <span aria-hidden className="pointer-events-none absolute -top-6 -right-4 text-[7rem] leading-none opacity-[0.13] select-none sm:text-[9rem]">{module.icon}</span>
          <div className="relative mb-3 flex flex-wrap items-center gap-2">
            <span className="chip text-white" style={{ background: part.accent }}>Módulo {module.number}</span>
            <span className="chip bg-[var(--surface-raised)]/80 text-muted">{part.name}</span>
            <span className="chip bg-[var(--surface-raised)]/80 font-mono text-muted">≈ {module.minutes} min</span>
          </div>
          <h1 className="relative flex items-start gap-3 text-2xl leading-tight font-black sm:text-[2rem]">
            <span aria-hidden className="shrink-0">{module.icon}</span>
            <span className="min-w-0 wrap-anywhere">{module.title}</span>
          </h1>
          <p className="relative mt-2 max-w-2xl text-[1rem] leading-relaxed text-body"><RichText text={module.subtitle} /></p>
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {module.tags.map((t) => <span key={t} className="chip border border-soft bg-[var(--surface-raised)]/70 text-[0.68rem] text-muted">#{t}</span>)}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-soft surface-sunken p-4">
          <p className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">No fim deste módulo sabes</p>
          <ul className="ml-4 list-disc space-y-1 text-[0.88rem] marker:text-brand-500">
            {module.goals.map((g, i) => <li key={i}><RichText text={g} /></li>)}
          </ul>
        </div>

        {(adrsDoModulo.length > 0 || ficheiros.length > 0) && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-soft surface p-4 sm:grid-cols-2">
            {adrsDoModulo.length > 0 && (
              <div className="min-w-0">
                <p className="mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">Decisões deste módulo</p>
                <ul className="space-y-1">
                  {adrsDoModulo.map((a) => (
                    <li key={a.id}>
                      <Link to={`/decisoes?a=${a.id}`} className="flex flex-wrap items-center gap-1.5 text-[0.82rem] hover:underline">
                        <span className="chip bg-brand-500/15 font-mono text-brand-700 dark:text-brand-300">
                          ADR-{String(a.number).padStart(4, '0')}
                        </span>
                        <span className="min-w-0 text-strong">{a.title}</span>
                        <span className="chip surface-sunken text-muted">{a.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ficheiros.length > 0 && (
              <div className="min-w-0">
                <p className="mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">Ficheiros do laboratório</p>
                <ul className="space-y-1">
                  {ficheiros.map((f) => {
                    const meta = POR_CAMINHO[f];
                    return (
                      <li key={f}>
                        <Link to={`/repositorio?f=${encodeURIComponent(f)}`} className="block text-[0.82rem] hover:underline">
                          <code className="font-mono break-all text-brand-700 dark:text-brand-300">{f}</code>
                          {meta && <span className="ml-1.5 text-muted">· {meta.linhas} linhas</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-muted">Progresso</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full surface-sunken">
            <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: part.accent }} />
          </span>
          <span className="font-mono text-xs text-muted tabular">{doneSections.length}/{module.sections.length} secções</span>
        </div>
      </header>

      <nav className="sticky top-14 z-30 -mx-4 mb-6 border-y border-soft bg-[color-mix(in_oklch,var(--surface)_88%,transparent)] px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const count =
              t.id === 'casos' ? module.useCases.length :
              t.id === 'exercicios' ? module.exercises.length :
              t.id === 'quiz' ? module.quiz.length :
              t.id === 'labs' ? module.labs.length :
              module.sections.length;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setParams({}, { replace: true }); }}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${tab === t.id ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'text-muted hover:text-strong'}`}
              >
                {t.label} <span className="font-mono text-[0.7rem] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {tab === 'materia' && (
        <div className="animate-fade-up">
          <details className="mb-8 rounded-2xl border border-soft surface p-4 [&[open]>summary>span:last-child]:rotate-90">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-strong">
              <span>Índice do módulo</span>
              <span aria-hidden className="text-xs text-muted transition">▶</span>
            </summary>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2">
              {module.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#sec-${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="flex items-baseline gap-2 rounded-lg px-2 py-1 text-[0.86rem] hover:bg-[var(--surface-sunken)]">
                    <span className="font-mono text-[0.7rem] text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className={doneSections.includes(s.id) ? 'text-muted line-through decoration-emerald-500/60' : 'text-body'}>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </details>
          {module.sections.map((s, i) => {
            const done = doneSections.includes(s.id);
            return (
              <section key={s.id} id={`sec-${s.id}`} className="mb-10 scroll-mt-32">
                <div className="mb-3 flex items-start justify-between gap-3 border-b border-soft pb-2">
                  <h2 className="min-w-0 wrap-anywhere text-xl font-bold">
                    <span className="mr-2 font-mono text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  <button
                    onClick={() => progress.toggleSection(module.id, s.id)}
                    className={`btn btn-sm shrink-0 ${done ? 'btn-accent' : 'btn-ghost'}`}
                    aria-pressed={done}
                  >
                    {done ? '✓ Concluída' : 'Marcar'}
                  </button>
                </div>
                <div className="prose-block">
                  {s.blocks.map((b, j) => <BlockView key={j} block={b} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'labs' && (
        <div className="animate-fade-up space-y-6">
          {module.labs.length === 0 && <p className="text-sm text-muted">Este módulo não tem laboratórios.</p>}
          {module.labs.map((l) => <CodeLab key={l.id} lab={l} />)}
        </div>
      )}

      {tab === 'exercicios' && <div className="animate-fade-up"><Exercises exercises={module.exercises} /></div>}

      {tab === 'quiz' && <div className="animate-fade-up"><Quiz moduleId={module.id} questions={module.quiz} /></div>}

      {tab === 'casos' && (
        <div className="animate-fade-up space-y-6">
          {module.useCases.length === 0 && <p className="text-sm text-muted">Este módulo não tem casos de uso.</p>}
          {module.useCases.map((uc) => <UseCaseView key={uc.id} uc={uc} />)}
        </div>
      )}

      <nav className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-soft pt-6">
        {prev ? <Link to={`/modulo/${prev.id}`} className="btn btn-ghost max-w-full whitespace-normal text-left">← {prev.icon} {prev.title}</Link> : <span />}
        {next
          ? <Link to={`/modulo/${next.id}`} className="btn btn-primary max-w-full whitespace-normal text-left">{next.icon} {next.title} →</Link>
          : <Link to="/progresso" className="btn btn-accent">Ver o teu progresso →</Link>}
      </nav>
    </div>
    </ModuloContexto.Provider>
  );
}
