import { useEffect, useRef, useState } from 'react';
import type { RunnableSnippet } from '../types';
import { CodeBlock } from './CodeBlock';
import { RichText } from './RichText';
import { correrPython, estadoPyodide, observarPyodide, type ProgressoPyodide, type Resultado } from '../lib/pyodide';

function useProgressoPython(): ProgressoPyodide {
  const [p, setP] = useState<ProgressoPyodide>(() => estadoPyodide());
  useEffect(() => observarPyodide(setP), []);
  return p;
}

function Saida({ texto, rotulo, tom }: { texto: string; rotulo: string; tom: 'esperada' | 'real' | 'erro' }) {
  const cls =
    tom === 'erro'
      ? 'border-rose-300/60 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
      : tom === 'real'
        ? 'border-emerald-300/60 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08]'
        : 'border-soft surface-sunken';
  return (
    <div className={`overflow-hidden rounded-xl border ${cls}`}>
      <p className="border-b border-soft/60 px-3 py-1.5 font-mono text-[0.68rem] font-bold tracking-widest uppercase opacity-70">
        {rotulo}
      </p>
      <pre className="scrollbar-thin max-h-80 overflow-auto px-3 py-2.5 text-[0.78rem] leading-relaxed">
        <code className="font-mono whitespace-pre">{texto}</code>
      </pre>
    </div>
  );
}

/** Editor mínimo: `textarea` com tabulação a quatro espaços e altura automática. */
function Editor({ valor, onChange }: { valor: string; onChange: (s: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`;
  }, [valor]);

  return (
    <textarea
      ref={ref}
      spellCheck={false}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const el = e.currentTarget;
        const { selectionStart: a, selectionEnd: b } = el;
        onChange(`${valor.slice(0, a)}    ${valor.slice(b)}`);
        requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4));
      }}
      className="field field-mono scrollbar-thin min-h-32 resize-y text-[0.8rem] leading-relaxed"
    />
  );
}

export function PythonRunner({ run, compact = false }: { run: RunnableSnippet; compact?: boolean }) {
  const [codigo, setCodigo] = useState(run.code);
  const [editar, setEditar] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [aCorrer, setACorrer] = useState(false);
  const progresso = useProgressoPython();

  const alterado = codigo !== run.code;

  const correr = async () => {
    setACorrer(true);
    try {
      setResultado(await correrPython(codigo, { pacotes: run.packages, figura: run.plot }));
    } catch (e: unknown) {
      setResultado({ saida: '', erro: e instanceof Error ? e.message : String(e), ms: 0 });
    } finally {
      setACorrer(false);
    }
  };

  const indisponivel = progresso.estado === 'indisponivel';

  return (
    <section className={`overflow-hidden rounded-2xl border border-brand-300/50 dark:border-brand-500/25 ${compact ? 'my-3' : 'my-6'}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-soft bg-brand-500/[0.07] px-4 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-strong">
            <span aria-hidden className="font-mono text-[0.7rem] text-brand-700 dark:text-brand-300">▶</span>
            <span className="min-w-0 wrap-anywhere">{run.title}</span>
          </p>
          {run.brief && <p className="mt-0.5 text-[0.82rem] text-muted"><RichText text={run.brief} /></p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditar((v) => !v)}>
            {editar ? 'Ver código' : 'Editar'}
          </button>
          {alterado && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setCodigo(run.code); setResultado(null); }}>
              Repor
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={correr} disabled={aCorrer}>
            {aCorrer ? 'A correr…' : 'Correr'}
          </button>
        </div>
      </header>

      <div className="p-4">
        {editar ? <Editor valor={codigo} onChange={setCodigo} /> : <CodeBlock code={codigo} lang="python" dense caption="python · corre no browser" />}

        {aCorrer && progresso.estado === 'a-carregar' && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="size-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            {progresso.passo} — a primeira execução descarrega o interpretador e os pacotes; as seguintes são imediatas.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {resultado?.erro && <Saida texto={resultado.erro} rotulo="erro" tom="erro" />}
          {resultado && !resultado.erro && (
            <>
              <Saida texto={resultado.saida.length > 0 ? resultado.saida : '(sem saída)'} rotulo={`saída · ${resultado.ms.toFixed(0)} ms`} tom="real" />
              {resultado.imagem && (
                <img
                  src={`data:image/png;base64,${resultado.imagem}`}
                  alt={`Figura produzida por «${run.title}»`}
                  className="mx-auto max-w-full rounded-xl border border-soft bg-white"
                />
              )}
            </>
          )}
          {!resultado && run.expected && <Saida texto={run.expected} rotulo="saída esperada" tom="esperada" />}
        </div>

        {indisponivel && (
          <p className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Não foi possível arrancar o Python no browser ({progresso.erro}). A saída esperada acima é a que este
            código produz — o mesmo excerto corre no laboratório local com <code className="font-mono">uv run python</code>.
          </p>
        )}
      </div>
    </section>
  );
}
