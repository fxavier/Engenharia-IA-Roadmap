import { useState } from 'react';
import type { ToolEffect, ToolSpec } from '../types';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';

const EFEITO: Record<ToolEffect, { nome: string; cls: string }> = {
  leitura: { nome: 'leitura', cls: 'bg-brand-500/15 text-brand-700 dark:text-brand-300' },
  escrita: { nome: 'escrita interna', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  externo: { nome: 'efeito externo', cls: 'bg-accent-500/20 text-accent-800 dark:text-accent-300' },
  humano: { nome: 'humano', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
};

const APROVACAO: Record<ToolSpec['approval'], string> = {
  nunca: 'sem aprovação',
  condicional: 'aprovação condicional',
  sempre: 'aprovação sempre',
};

export function ToolCard({ tool, compact = false }: { tool: ToolSpec; compact?: boolean }) {
  const [aberto, setAberto] = useState(!compact);
  const e = EFEITO[tool.effect];

  return (
    <section className={`overflow-hidden rounded-2xl border border-soft surface ${compact ? 'my-5' : ''}`}>
      <button
        className="flex w-full flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-3 text-left"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span className="chip bg-brand-700/10 font-mono text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">{tool.name}</span>
        <span className={`chip ${e.cls}`}>{e.nome}</span>
        <span className="chip surface text-muted">risco {'●'.repeat(tool.risk)}{'○'.repeat(3 - tool.risk)}</span>
        {tool.idempotent && <span className="chip surface text-muted">idempotente</span>}
        {tool.approval !== 'nunca' && <span className="chip bg-rose-500/12 text-rose-700 dark:text-rose-300">{APROVACAO[tool.approval]}</span>}
        {tool.p95 && <span className="chip surface font-mono text-[0.66rem] text-muted">p95 {tool.p95} ms</span>}
        <span className="w-full text-[0.9rem] text-body sm:w-auto sm:flex-1"><RichText text={tool.summary} /></span>
        <span aria-hidden className="shrink-0 text-muted">{aberto ? '−' : '+'}</span>
      </button>

      {aberto && (
        <div className="animate-fade-up px-4 py-3">
          <p className="text-[0.9rem] leading-relaxed"><RichText text={tool.description} /></p>

          <h4 className="mt-4 mb-1.5 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Argumentos</h4>
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-soft">
            <table className="w-full border-collapse text-left text-[0.83rem]">
              <thead>
                <tr className="surface-sunken">
                  {['nome', 'tipo', 'obrig.', 'descrição'].map((h) => (
                    <th key={h} className="border-b border-soft px-3 py-1.5 font-semibold whitespace-nowrap text-strong">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tool.params.map((p) => (
                  <tr key={p.name} className="odd:bg-black/[0.015] dark:odd:bg-white/[0.02]">
                    <td className="border-b border-soft/60 px-3 py-1.5 font-mono whitespace-nowrap">{p.name}</td>
                    <td className="border-b border-soft/60 px-3 py-1.5 font-mono text-muted">{p.type}</td>
                    <td className="border-b border-soft/60 px-3 py-1.5 text-center">{p.required ? '✓' : '—'}</td>
                    <td className="border-b border-soft/60 px-3 py-1.5"><RichText text={p.desc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[0.85rem]"><span className="font-semibold text-strong">Devolve:</span> <RichText text={tool.returns} /></p>

          {tool.schema && (
            <>
              <h4 className="mt-4 mb-1.5 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Esquema entregue ao modelo</h4>
              <CodeBlock code={tool.schema} lang="json" dense />
            </>
          )}

          {tool.sample && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div>
                <p className="mb-1 font-mono text-[0.68rem] tracking-widest text-muted uppercase">chamada</p>
                <pre className="scrollbar-thin overflow-x-auto rounded-xl border border-soft surface-sunken p-2.5 font-mono text-[0.74rem]">{tool.sample.args}</pre>
              </div>
              <div>
                <p className="mb-1 font-mono text-[0.68rem] tracking-widest text-muted uppercase">resposta</p>
                <pre className="scrollbar-thin overflow-x-auto rounded-xl border border-soft surface-sunken p-2.5 font-mono text-[0.74rem]">{tool.sample.result}</pre>
              </div>
            </div>
          )}

          {tool.errors && tool.errors.length > 0 && (
            <>
              <h4 className="mt-4 mb-1.5 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Erros e o que fazer com eles</h4>
              <ul className="space-y-1.5">
                {tool.errors.map((err) => (
                  <li key={err.code} className="rounded-xl border border-soft px-3 py-2 text-[0.84rem]">
                    <p className="font-mono text-[0.78rem] font-bold text-rose-700 dark:text-rose-300">{err.code}</p>
                    <p className="mt-0.5"><span className="text-muted">quando:</span> <RichText text={err.when} /></p>
                    <p><span className="text-muted">tratamento:</span> <RichText text={err.handling} /></p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tool.notes && tool.notes.length > 0 && (
            <ul className="mt-3 ml-5 list-disc space-y-1 text-[0.85rem]">
              {tool.notes.map((nota, i) => <li key={i}><RichText text={nota} /></li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
