import { Link } from 'react-router-dom';
import type { Endpoint } from '../types';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';

const AUTH_LABEL: Record<Endpoint['auth'], string> = {
  none: 'público',
  bearer: 'Bearer',
  'bearer:cliente': 'Bearer · cliente',
  'bearer:suporte': 'Bearer · suporte',
  'bearer:admin': 'Bearer · administração',
  'bearer:servico': 'Bearer · serviço',
};

function statusTone(s: number): string {
  if (s < 300) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (s < 400) return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
  if (s < 500) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
}

export function MethodChip({ method }: { method: string }) {
  return <span className={`chip font-mono m-${method}`}>{method}</span>;
}

export function EndpointCard({ ep, compact = false }: { ep: Endpoint; compact?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-soft surface ${compact ? 'my-5' : ''}`}>
      <header className="border-b border-soft surface-sunken px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <MethodChip method={ep.method} />
          <code className="font-mono text-[0.86rem] font-semibold break-all text-strong">{ep.path}</code>
          <span className="chip surface text-muted">{ep.service}</span>
          <span className={`chip ${ep.auth === 'none' ? 'surface text-muted' : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'}`}>
            {AUTH_LABEL[ep.auth] ?? ep.auth}
          </span>
          {ep.idempotent && <span className="chip bg-accent-500/15 text-accent-700 dark:text-accent-300">idempotente</span>}
          {ep.stream && <span className="chip bg-violet-500/15 text-violet-700 dark:text-violet-300">streaming</span>}
          {ep.p95 !== undefined && (
            <span className="chip surface-sunken font-mono text-muted">p95 &lt; {ep.p95} ms</span>
          )}
        </div>
        <p className="mt-1.5 text-sm font-bold text-strong">{ep.summary}</p>
      </header>

      <div className="px-4 py-3">
        <p className="text-[0.9rem] leading-relaxed"><RichText text={ep.description} /></p>

        {ep.params.length > 0 && (
          <div className="scrollbar-thin mt-4 overflow-x-auto rounded-xl border border-soft">
            <table className="w-full border-collapse text-left text-[0.82rem]">
              <thead>
                <tr className="surface-sunken">
                  <th className="border-b border-soft px-3 py-2 font-semibold text-strong">Parâmetro</th>
                  <th className="border-b border-soft px-3 py-2 font-semibold text-strong">Em</th>
                  <th className="border-b border-soft px-3 py-2 font-semibold text-strong">Tipo</th>
                  <th className="border-b border-soft px-3 py-2 font-semibold text-strong">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {ep.params.map((p) => (
                  <tr key={p.name + p.in} className="odd:bg-black/[0.015] dark:odd:bg-white/[0.02]">
                    <td className="border-b border-soft/60 px-3 py-2 font-mono font-semibold whitespace-nowrap">
                      {p.name}{p.required && <span className="ml-1 text-rose-500">*</span>}
                    </td>
                    <td className="border-b border-soft/60 px-3 py-2 text-muted">{p.in}</td>
                    <td className="border-b border-soft/60 px-3 py-2 font-mono text-muted">{p.type}</td>
                    <td className="border-b border-soft/60 px-3 py-2"><RichText text={p.desc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ep.requestSample && <CodeBlock code={ep.requestSample} lang={ep.path.endsWith('/token') ? 'text' : 'json'} caption="corpo do pedido" />}

        <div className="mt-4 space-y-1.5">
          {ep.responses.map((r) => (
            <div key={r.status} className="rounded-xl border border-soft px-3.5 py-2 text-[0.85rem]">
              <p className="flex items-center gap-2">
                <span className={`chip font-mono ${statusTone(r.status)}`}>{r.status}</span>
                <span><RichText text={r.desc} /></span>
              </p>
              {r.sample && <pre className="scrollbar-thin mt-1.5 overflow-x-auto rounded-lg surface-sunken p-2 font-mono text-[0.74rem]">{r.sample}</pre>}
            </div>
          ))}
        </div>

        {ep.notes && ep.notes.length > 0 && (
          <ul className="mt-3 ml-4 list-disc space-y-1 text-[0.85rem] text-muted marker:text-brand-500">
            {ep.notes.map((n, i) => <li key={i}><RichText text={n} /></li>)}
          </ul>
        )}

        <Link to="/desenho" className="btn btn-ghost btn-sm mt-4">
          Ver o orçamento de latência →
        </Link>
      </div>
    </article>
  );
}
