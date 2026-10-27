import { EntrevistaBanner } from '../components/entrevista/EntrevistaBanner';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BY_PART, TOTAL, partStats, carregarAgregados } from '../content';
import { PARTS, PROJECTO } from '../data/parts';
import { isCorrect } from '../components/Quiz';
import { progress, useProgress } from '../lib/progress';
import type { Lab, Module, PartId } from '../types';

function Bar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'accent' | 'good' | 'bad' }) {
  const bg = { brand: 'bg-brand-500', accent: 'bg-accent-500', good: 'bg-emerald-500', bad: 'bg-rose-500' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full surface-sunken">
      <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

interface QuizFeito { m: Module; certas: number; total: number }
interface PorTopico { topico: string; certas: number; total: number }

export function ProgressPage() {
  const state = useProgress();
  const [modulos, setModulos] = useState<Module[] | null>(null);
  const [labs, setLabs] = useState<Lab[] | null>(null);
  const [moduloDoLab, setModuloDoLab] = useState<Record<string, Module>>({});

  useEffect(() => {
    let vivo = true;
    carregarAgregados().then((a) => {
      if (!vivo) return;
      setModulos(a.modulos);
      setLabs(a.labs);
      setModuloDoLab(a.moduloDoLab);
    });
    return () => { vivo = false; };
  }, []);

  const seccoes = Object.values(state.sections).reduce((a, s) => a + s.length, 0);
  const labsFeitos = Object.values(state.labsDone).filter(Boolean).length;
  const exerciciosFeitos = Object.values(state.exercises).filter(Boolean).length;
  const casosFeitos = Object.values(state.useCases).filter(Boolean).length;

  const quizzes = useMemo<QuizFeito[]>(() => (modulos ?? []).map((m) => {
    const q = state.quiz[m.id];
    if (!q?.submitted || m.quiz.length === 0) return null;
    const certas = m.quiz.filter((item) => isCorrect(item, q.answers[item.id])).length;
    return { m, certas, total: m.quiz.length };
  }).filter((x): x is QuizFeito => x !== null), [modulos, state.quiz]);

  const totalQuizCertas = quizzes.reduce((a, q) => a + q.certas, 0);
  const totalQuizFeitas = quizzes.reduce((a, q) => a + q.total, 0);

  /* Por tópico é a vista que interessa: diz o que é preciso reler, e não
     apenas em que módulo se falhou. */
  const porTopico = useMemo<PorTopico[]>(() => {
    const acc = new Map<string, { certas: number; total: number }>();
    for (const m of modulos ?? []) {
      const q = state.quiz[m.id];
      if (!q?.submitted) continue;
      for (const item of m.quiz) {
        const cur = acc.get(item.topic) ?? { certas: 0, total: 0 };
        cur.total += 1;
        if (isCorrect(item, q.answers[item.id])) cur.certas += 1;
        acc.set(item.topic, cur);
      }
    }
    return [...acc.entries()]
      .map(([topico, v]) => ({ topico, ...v }))
      .sort((a, b) => a.certas / a.total - b.certas / b.total || b.total - a.total);
  }, [modulos, state.quiz]);

  /* O que falta: por módulo, o que ainda não está marcado. Ordenado pela
     ordem do tutorial, para dar um caminho e não uma lista de culpas. */
  const emFalta = useMemo(() => {
    if (!modulos) return [];
    return modulos.map((m) => {
      const lidas = (state.sections[m.id] ?? []).length;
      const quizFeito = state.quiz[m.id]?.submitted === true;
      const labsPorFazer = m.labs.filter((l) => !state.labsDone[l.id]).length;
      const casosPorVer = m.useCases.filter((u) => !state.useCases[u.id]).length;
      const falta = (m.sections.length - lidas) + (quizFeito || m.quiz.length === 0 ? 0 : 1) + labsPorFazer + casosPorVer;
      return { m, lidas, quizFeito, labsPorFazer, casosPorVer, falta };
    }).filter((x) => x.falta > 0);
  }, [modulos, state]);

  const cartoes: { label: string; feito: number; total: number; tone: 'brand' | 'accent' | 'good' | 'bad' }[] = [
    { label: 'Secções lidas', feito: seccoes, total: TOTAL.sections, tone: 'brand' },
    { label: 'Laboratórios resolvidos', feito: labsFeitos, total: TOTAL.labs, tone: 'good' },
    { label: 'Exercícios marcados', feito: exerciciosFeitos, total: TOTAL.exercises, tone: 'accent' },
    { label: 'Casos de uso trabalhados', feito: casosFeitos, total: TOTAL.useCases, tone: 'accent' },
    { label: 'Quizzes corrigidos', feito: quizzes.length, total: TOTAL.modules, tone: 'brand' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="eyebrow mb-1">Praticar</p>
      <h1 className="text-2xl font-black sm:text-3xl">Progresso</h1>
      <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
        Quanto do «{PROJECTO.nome}» já construíste — secções lidas, laboratórios resolvidos, quizzes corrigidos e
        os tópicos onde convém voltar atrás. Fica guardado apenas no teu browser, neste dispositivo: nada sai
        daqui e não há conta nenhuma por trás.
      </p>

      <div className="mt-6"><EntrevistaBanner variante="compacta" /></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cartoes.map((x) => (
          <div key={x.label} className="card p-4">
            <p className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-strong">{x.label}</span>
              <span className="font-mono text-sm text-muted">{x.feito}/{x.total}</span>
            </p>
            <Bar pct={x.total ? (x.feito / x.total) * 100 : 0} tone={x.tone} />
          </div>
        ))}
      </div>

      {/* ================================================================ partes */}
      <h2 className="mt-10 mb-3 text-xl font-bold">Por parte</h2>
      <div className="space-y-2.5">
        {PARTS.map((p) => {
          const st = partStats(p.id as PartId);
          const mods = BY_PART[p.id] ?? [];
          const feitas = mods.reduce((a, m) => a + (state.sections[m.id] ?? []).length, 0);
          const pct = st.sections ? Math.round((feitas / st.sections) * 100) : 0;
          return (
            <div key={p.id} className="card p-4">
              <p className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-strong">{p.name}</span>
                <span className="font-mono text-sm text-muted">{feitas}/{st.sections} secções · {pct}%</span>
              </p>
              <Bar pct={pct} />
              <p className="mt-1.5 text-xs text-muted">{p.blurb}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {mods.map((m) => {
                  const mp = m.sections.length ? Math.round(((state.sections[m.id] ?? []).length / m.sections.length) * 100) : 0;
                  return (
                    <Link
                      key={m.id}
                      to={`/modulo/${m.id}`}
                      className={`chip transition ${
                        mp === 100 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : mp > 0 ? 'bg-brand-500/12 text-brand-700 dark:text-brand-300'
                          : 'surface-sunken text-muted'
                      }`}
                    >
                      {m.icon} {m.title}{mp > 0 && mp < 100 ? ` · ${mp}%` : ''}
                    </Link>
                  );
                })}
                {mods.length === 0 && <span className="text-xs text-muted">Sem módulos publicados nesta parte.</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* =============================================================== quizzes */}
      <h2 className="mt-10 mb-3 text-xl font-bold">Quizzes</h2>
      {!modulos ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-muted">Ainda não corrigiste nenhum quiz. Faz o do primeiro módulo e volta aqui.</p>
      ) : (
        <>
          <p className="mb-3 text-sm">
            <strong className="text-strong">{totalQuizCertas}/{totalQuizFeitas}</strong> correctas
            {' '}({Math.round((totalQuizCertas / (totalQuizFeitas || 1)) * 100)} %) em {quizzes.length}{' '}
            {quizzes.length === 1 ? 'módulo corrigido' : 'módulos corrigidos'}.
          </p>

          <h3 className="mt-5 mb-2 text-sm font-bold text-strong">Por tópico</h3>
          <p className="mb-2 text-xs text-muted">
            Ordenado do que corre pior para o que corre melhor. É esta lista que diz o que reler.
          </p>
          <ul className="mb-6 space-y-1.5">
            {porTopico.map((t) => {
              const pct = Math.round((t.certas / t.total) * 100);
              return (
                <li key={t.topico} className="flex flex-wrap items-center gap-3 rounded-xl border border-soft px-3.5 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-strong">{t.topico}</span>
                  <span className="w-32"><Bar pct={pct} tone={pct >= 70 ? 'good' : pct >= 40 ? 'accent' : 'bad'} /></span>
                  <span className="font-mono text-xs text-muted">{t.certas}/{t.total}</span>
                </li>
              );
            })}
          </ul>

          <h3 className="mb-2 text-sm font-bold text-strong">Por módulo</h3>
          <ul className="space-y-1.5">
            {quizzes.map(({ m, certas, total }) => {
              const pct = Math.round((certas / total) * 100);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-soft px-3.5 py-2">
                  <Link to={`/modulo/${m.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-strong hover:underline">
                    {m.icon} {m.title}
                  </Link>
                  <span className="w-32"><Bar pct={pct} tone={pct >= 70 ? 'good' : 'accent'} /></span>
                  <span className="font-mono text-xs text-muted">{certas}/{total}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ========================================================== laboratórios */}
      <h2 className="mt-10 mb-3 text-xl font-bold">Laboratórios</h2>
      {!labs ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : labs.length === 0 ? (
        <p className="text-sm text-muted">Ainda não há laboratórios publicados.</p>
      ) : (
        <ul className="space-y-1.5">
          {labs.map((l) => {
            const feito = state.labsDone[l.id] === true;
            const comecado = typeof state.labCode[l.id] === 'string' && state.labCode[l.id] !== '';
            const mod = moduloDoLab[l.id];
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-soft px-3.5 py-2">
                <span className={`chip ${feito ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : comecado ? 'bg-accent-500/15 text-accent-700 dark:text-accent-300' : 'surface-sunken text-muted'}`}>
                  {feito ? '✓ resolvido' : comecado ? 'começado' : 'por fazer'}
                </span>
                <Link to={`/laboratorios?l=${l.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-strong hover:underline">
                  {l.title}
                </Link>
                <span className="chip surface-sunken font-mono text-muted">{l.lang}</span>
                {mod && <span className="hidden text-xs text-muted sm:inline">{mod.icon} {mod.title}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {/* ============================================================ o que falta */}
      <h2 className="mt-10 mb-3 text-xl font-bold">O que falta</h2>
      {!modulos ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : emFalta.length === 0 ? (
        <p className="rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          Está tudo marcado. Resta a parte que este site não pode fazer por ti: correr o laboratório de ponta a
          ponta, treinar os dois modelos com os teus próprios dados e ver o primeiro drift chegar — de
          preferência num ambiente que não seja produção.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            {emFalta.length} {emFalta.length === 1 ? 'módulo' : 'módulos'} com trabalho por terminar, pela ordem do tutorial.
          </p>
          <ul className="space-y-1.5">
            {emFalta.slice(0, 12).map(({ m, lidas, quizFeito, labsPorFazer, casosPorVer }) => (
              <li key={m.id} className="rounded-xl border border-soft px-3.5 py-2">
                <Link to={`/modulo/${m.id}`} className="text-sm font-semibold text-strong hover:underline">
                  <span className="mr-1.5 font-mono text-xs text-muted">{m.number}</span>{m.icon} {m.title}
                </Link>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {lidas < m.sections.length && (
                    <span className="chip surface-sunken text-muted">{m.sections.length - lidas} secções por ler</span>
                  )}
                  {labsPorFazer > 0 && <span className="chip surface-sunken text-muted">{labsPorFazer} laboratórios</span>}
                  {casosPorVer > 0 && <span className="chip surface-sunken text-muted">{casosPorVer} casos de uso</span>}
                  {!quizFeito && m.quiz.length > 0 && <span className="chip surface-sunken text-muted">quiz por corrigir</span>}
                </p>
              </li>
            ))}
          </ul>
          {emFalta.length > 12 && (
            <p className="mt-2 text-xs text-muted">e mais {emFalta.length - 12} módulos.</p>
          )}
        </>
      )}

      <div className="mt-10 rounded-2xl border border-rose-300/60 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="mb-2 text-sm font-bold text-strong">Recomeçar do zero</p>
        <p className="mb-3 text-[0.87rem]">
          Apaga secções lidas, respostas de quiz, código dos laboratórios e os casos de uso marcados. Não há
          forma de desfazer.
        </p>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          onClick={() => { if (window.confirm('Apagar todo o progresso?')) progress.resetAll(); }}
        >
          Apagar todo o progresso
        </button>
      </div>
    </div>
  );
}
