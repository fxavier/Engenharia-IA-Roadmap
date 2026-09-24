import { useMemo, useState } from 'react';
import type { Span, SpanKind, TraceSpec } from '../types';
import { RichText } from './RichText';
import { custoMzn, formatarMzn } from '../lib/custo';

const ESTILO: Record<SpanKind, { cor: string; etiqueta: string }> = {
  pedido: { cor: 'var(--color-brand-700)', etiqueta: 'http' },
  no: { cor: 'oklch(0.58 0.14 300)', etiqueta: 'node' },
  retriever: { cor: 'oklch(0.62 0.15 230)', etiqueta: 'retrieval' },
  embedding: { cor: 'oklch(0.64 0.13 260)', etiqueta: 'embeddings' },
  llm: { cor: 'var(--color-brand-500)', etiqueta: 'chat' },
  ferramenta: { cor: 'var(--color-accent-600)', etiqueta: 'execute_tool' },
  humano: { cor: 'oklch(0.60 0.16 25)', etiqueta: 'human_approval' },
  retry: { cor: 'oklch(0.62 0.19 20)', etiqueta: 'retry' },
  guarda: { cor: 'oklch(0.62 0.16 155)', etiqueta: 'policy_check' },
};

interface Linha {
  span: Span;
  nivel: number;
  inicio: number;
}

/** Ordena os spans em árvore e calcula o início de cada um, em série dentro do pai. */
function achatar(spans: Span[]): { linhas: Linha[]; total: number } {
  const filhos = new Map<string | undefined, Span[]>();
  for (const s of spans) {
    const lista = filhos.get(s.parent) ?? [];
    lista.push(s);
    filhos.set(s.parent, lista);
  }
  const linhas: Linha[] = [];
  const visitar = (pai: string | undefined, nivel: number, offset: number): number => {
    let t = offset;
    for (const s of filhos.get(pai) ?? []) {
      linhas.push({ span: s, nivel, inicio: t });
      const fim = visitar(s.id, nivel + 1, t);
      t = Math.max(t + s.ms, fim);
    }
    return t;
  };
  const total = visitar(undefined, 0, 0);
  return { linhas, total: total || 1 };
}

export function TraceView({ trace }: { trace: TraceSpec }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const { linhas, total } = useMemo(() => achatar(trace.spans), [trace.spans]);

  const tokensEntrada = trace.spans.reduce((a, s) => a + (s.tokensIn ?? 0), 0);
  const tokensSaida = trace.spans.reduce((a, s) => a + (s.tokensOut ?? 0), 0);
  const erros = trace.spans.filter((s) => s.status === 'erro').length;

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">Traço</span>
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{trace.title}</p>
        <span className="chip surface font-mono text-[0.68rem] text-muted">{total} ms</span>
        <span className="chip surface font-mono text-[0.68rem] text-muted">{(tokensEntrada + tokensSaida).toLocaleString('pt-PT')} tok</span>
        <span className="chip bg-accent-500/15 font-mono text-[0.68rem] text-accent-800 dark:text-accent-300" title="Estimativa com os preços do escalão médio e câmbio de 63,9 MZN/USD, sem cache">≈ {formatarMzn(custoMzn(tokensEntrada, tokensSaida))}</span>
        {erros > 0 && <span className="chip bg-rose-500/15 text-[0.68rem] text-rose-700 dark:text-rose-300">{erros} erro(s)</span>}
      </header>

      {trace.brief && <p className="px-4 pt-3 text-[0.9rem] leading-relaxed"><RichText text={trace.brief} /></p>}

      <ul className="p-3">
        {linhas.map(({ span, nivel, inicio }) => {
          const e = ESTILO[span.kind];
          const largura = Math.max(1.2, (span.ms / total) * 100);
          const esquerda = (inicio / total) * 100;
          const abertoAqui = aberto === span.id;
          return (
            <li key={span.id} className="group">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-[var(--surface-sunken)]"
                onClick={() => setAberto(abertoAqui ? null : span.id)}
                aria-expanded={abertoAqui}
              >
                <span className="min-w-0 shrink-0" style={{ paddingLeft: Math.min(nivel, 4) * 12, width: '44%' }}>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[0.62rem] tracking-wider uppercase" style={{ color: e.cor }}>{e.etiqueta}</span>
                    <span className={`truncate text-[0.84rem] font-medium ${span.status === 'erro' ? 'text-rose-700 dark:text-rose-300' : 'text-strong'}`}>{span.name}</span>
                  </span>
                </span>
                <span className="relative h-3.5 min-w-0 flex-1 overflow-hidden rounded-full surface-sunken">
                  <span
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${esquerda}%`,
                      width: `${largura}%`,
                      background: span.status === 'erro' ? 'oklch(0.62 0.19 20)' : e.cor,
                      opacity: span.status === 'cancelado' ? 0.35 : 0.9,
                    }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[0.66rem] text-muted sm:w-24">
                  {span.ms} ms
                  {span.tokensIn || span.tokensOut ? <span className="block">{((span.tokensIn ?? 0) + (span.tokensOut ?? 0)).toLocaleString('pt-PT')} tok</span> : null}
                </span>
              </button>

              {abertoAqui && (
                <div className="animate-fade-up mx-1.5 mb-2 rounded-xl border border-soft surface-sunken px-3 py-2 text-[0.82rem]">
                  {span.detail && <p className="mb-1.5 leading-relaxed"><RichText text={span.detail} /></p>}
                  <dl className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    <div className="flex gap-2"><dt className="font-mono text-muted">gen_ai.operation.name</dt><dd className="font-mono">{e.etiqueta}</dd></div>
                    {span.status && <div className="flex gap-2"><dt className="font-mono text-muted">status</dt><dd className="font-mono">{span.status}</dd></div>}
                    {span.tokensIn !== undefined && <div className="flex gap-2"><dt className="font-mono text-muted">gen_ai.usage.input_tokens</dt><dd className="font-mono">{span.tokensIn}</dd></div>}
                    {span.tokensOut !== undefined && <div className="flex gap-2"><dt className="font-mono text-muted">gen_ai.usage.output_tokens</dt><dd className="font-mono">{span.tokensOut}</dd></div>}
                    {(span.attrs ?? []).map(([k, v]) => (
                      <div key={k} className="flex gap-2"><dt className="font-mono text-muted">{k}</dt><dd className="min-w-0 font-mono wrap-anywhere">{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {trace.note && <figcaption className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted"><RichText text={trace.note} /></figcaption>}
    </figure>
  );
}
