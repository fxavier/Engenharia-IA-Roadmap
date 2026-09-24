import { useEffect, useMemo, useState } from 'react';
import type { Lab } from '../types';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';
import { runChecks, labScore } from '../lib/labs';
import { progress, useProgress } from '../lib/progress';
import { correrPython, type Resultado } from '../lib/pyodide';

const RODAPE: Record<string, string> = {
  python: 'A verificação é estrutural: procura as construções certas no teu código, não o executa. No laboratório local, confirma com `uv run pytest` e `uv run ruff check`.',
  yaml: 'A verificação é estrutural. Valida o ficheiro no teu ambiente (por exemplo `docker compose config` ou o `actionlint` para workflows do GitHub Actions).',
  dockerfile: 'A verificação é estrutural. Confirma com `docker build` no laboratório e inspecciona as camadas com `docker history`.',
  sql: 'A verificação é estrutural. Corre o SQL contra o PostgreSQL do laboratório (`docker compose up db`) para a confirmação final.',
  bash: 'A verificação é estrutural. Corre o script no laboratório, de preferência com `set -euo pipefail`.',
};

function rodape(lang: string): string {
  return RODAPE[lang] ?? 'A verificação é estrutural: procura as construções certas no teu código. Confirma no laboratório local.';
}

export function CodeLab({ lab, compact = false }: { lab: Lab; compact?: boolean }) {
  const state = useProgress();
  const saved = state.labCode[lab.id];
  const [code, setCode] = useState(saved ?? lab.starter);
  const [ran, setRan] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [execucao, setExecucao] = useState<Resultado | null>(null);
  const [aCorrer, setACorrer] = useState(false);
  const [origem, setOrigem] = useState<'aluno' | 'solucao'>('aluno');

  useEffect(() => {
    setCode(progress.get().labCode[lab.id] ?? lab.starter);
    setRan(false);
    setHintIdx(0);
    setShowSolution(false);
    setExecucao(null);
  }, [lab.id, lab.starter]);

  const results = useMemo(() => runChecks(code, lab.checks), [code, lab.checks]);
  const score = labScore(results);
  const done = state.labsDone[lab.id] ?? false;
  const executavel = lab.executavel === true && lab.lang === 'python';

  const executar = async (fonte: string, de: 'aluno' | 'solucao') => {
    setOrigem(de);
    setACorrer(true);
    setExecucao(null);
    try {
      setExecucao(await correrPython(fonte));
    } catch (e: unknown) {
      setExecucao({ saida: '', erro: `Não foi possível arrancar o Python no browser: ${e instanceof Error ? e.message : String(e)}`, ms: 0 });
    } finally {
      setACorrer(false);
    }
  };

  const verify = () => {
    setRan(true);
    progress.saveLab(lab.id, code);
    if (score.done) {
      if (!executavel) progress.markLab(lab.id, true);
      else void executar(code, 'aluno');
    }
  };

  /* Num laboratório executável, só conta como resolvido se também correr sem erro. */
  useEffect(() => {
    if (executavel && ran && score.done && origem === 'aluno' && execucao && !execucao.erro) progress.markLab(lab.id, true);
  }, [executavel, ran, score.done, origem, execucao, lab.id]);

  const reset = () => {
    setCode(lab.starter);
    setRan(false);
    setExecucao(null);
    progress.saveLab(lab.id, lab.starter);
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-soft surface shadow-card ${compact ? 'my-6' : ''}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-3">
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">Laboratório</span>
        <span className="chip surface text-accent-600" title={`Dificuldade ${lab.difficulty} de 3`}>{'★'.repeat(lab.difficulty)}<span className="text-muted opacity-50">{'★'.repeat(3 - lab.difficulty)}</span></span>
        <span className="chip surface font-mono text-muted">{lab.lang}</span>
        {executavel && <span className="chip bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" title="Depois de passar as verificações, o código corre em Pyodide com o pacote balcao">▶ corre no browser</span>}
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{lab.title}</p>
        {done && <span className="chip bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">✓ Resolvido</span>}
      </header>

      <div className="px-4 py-3">
        <p className="text-[0.91rem] leading-relaxed"><RichText text={lab.brief} /></p>
      </div>

      <div className="px-4 pb-3">
        <textarea
          className="field field-mono scrollbar-thin min-h-[15rem] resize-y text-[0.8rem] leading-[1.65]"
          spellCheck={false}
          value={code}
          onChange={(e) => { setCode(e.target.value); setRan(false); setExecucao(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const el = e.currentTarget;
              const s = el.selectionStart;
              const ind = lab.lang === 'yaml' ? '  ' : '    ';
              const next = code.slice(0, s) + ind + code.slice(el.selectionEnd);
              setCode(next);
              requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + ind.length; });
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); verify(); }
          }}
          aria-label="Editor de código do laboratório"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <button className="btn btn-primary btn-sm" onClick={verify} disabled={aCorrer} title="Ctrl+Enter">
          {executavel ? 'Verificar e correr' : 'Verificar'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={reset}>Recomeçar</button>
        {lab.hints.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setHintIdx((i) => Math.min(i + 1, lab.hints.length))} disabled={hintIdx >= lab.hints.length}>
            Pista {hintIdx > 0 ? `${hintIdx}/${lab.hints.length}` : ''}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSolution((v) => !v)}>
          {showSolution ? 'Esconder solução' : 'Ver solução'}
        </button>
        {ran && (
          <span className={`chip animate-pop ml-auto ${score.done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
            {score.passed}/{score.total} verificações
          </span>
        )}
      </div>

      {hintIdx > 0 && (
        <ul className="animate-fade-up mx-4 mb-3 space-y-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[0.86rem] dark:border-amber-500/30 dark:bg-amber-500/10">
          {lab.hints.slice(0, hintIdx).map((h, i) => (
            <li key={i} className="flex gap-2"><span aria-hidden className="text-amber-600">›</span><span><RichText text={h} /></span></li>
          ))}
        </ul>
      )}

      {ran && (
        <ul className="animate-fade-up mx-4 mb-3 space-y-1.5">
          {results.map((r) => (
            <li
              key={r.id}
              className={`flex gap-2.5 rounded-xl border px-3.5 py-2 text-[0.86rem] ${
                r.ok
                  ? 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                  : 'border-rose-300/60 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
              }`}
            >
              <span aria-hidden className={r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{r.ok ? '✓' : '✗'}</span>
              <span>
                <RichText text={r.label} />
                {!r.ok && r.why && <span className="mt-0.5 block text-xs text-muted"><RichText text={r.why} /></span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {executavel && (aCorrer || execucao) && (
        <div className="animate-fade-up mx-4 mb-3 overflow-hidden rounded-xl border border-soft">
          <p className="flex items-center gap-2 border-b border-soft surface-sunken px-3 py-1.5 font-mono text-[0.68rem] font-bold tracking-widest text-muted uppercase">
            {aCorrer ? (
              <><span className="size-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /> a correr em Pyodide…</>
            ) : `${origem === 'solucao' ? 'solução · ' : ''}${execucao?.erro ? 'erro de execução' : `saída · ${execucao?.ms.toFixed(0)} ms`}`}
          </p>
          {execucao && (
            <pre className={`scrollbar-thin max-h-72 overflow-auto px-3 py-2.5 text-[0.78rem] leading-relaxed ${execucao.erro ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-emerald-50/60 dark:bg-emerald-500/[0.07]'}`}>
              <code className="font-mono whitespace-pre">{execucao.erro ? `${execucao.saida ? execucao.saida + '\n' : ''}${execucao.erro}` : execucao.saida || '(sem saída)'}</code>
            </pre>
          )}
        </div>
      )}

      {showSolution && (
        <div className="animate-fade-up border-t border-soft px-4 py-2">
          <CodeBlock code={lab.solution} lang={lab.lang} caption="solução de referência" />
          {executavel && (
            <button className="btn btn-ghost btn-sm mb-2" onClick={() => void executar(lab.solution, 'solucao')} disabled={aCorrer}>
              ▶ Correr a solução
            </button>
          )}
        </div>
      )}

      <p className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted">
        <RichText text={rodape(lab.lang) + (executavel ? ' Este laboratório também corre no browser (Pyodide, com `numpy` e o pacote `balcao`) quando passa as verificações.' : '')} />
      </p>
    </section>
  );
}
