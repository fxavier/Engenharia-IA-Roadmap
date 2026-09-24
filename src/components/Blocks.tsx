import type { Block, Tone } from '../types';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';
import { DiagramView } from './Diagram';
import { DecisionTreeView } from './DecisionTreeView';
import { FlowPlayer } from './FlowPlayer';
import { EndpointCard } from './EndpointCard';
import { CodeLab } from './CodeLab';
import { Widget } from './widgets';
import { ENDPOINT_BY_ID } from '../data/api';
import { ADR_BY_ID } from '../data/adr';
import { AdrCard } from './AdrCard';
import { FileView } from './FileView';
import { PythonRunner } from './PythonRunner';
import { FormulaView } from './FormulaView';
import { PromptView } from './PromptView';
import { ToolCard } from './ToolCard';
import { RetrievalView } from './RetrievalView';
import { GraphView } from './GraphView';
import { TraceView } from './TraceView';
import { EvalView } from './EvalView';
import { FERRAMENTA_DE } from '../data/ferramentas';
import { useModulo } from './ModuloContexto';

const TONES: Record<Tone, { label: string; icon: string; cls: string; dot: string }> = {
  info: { label: 'Nota', icon: 'i', cls: 'border-sky-300/60 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/10', dot: 'bg-sky-500' },
  tip: { label: 'Dica', icon: '✦', cls: 'border-emerald-300/60 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
  warn: { label: 'Atenção', icon: '!', cls: 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10', dot: 'bg-amber-500' },
  key: { label: 'Ideia-chave', icon: '◆', cls: 'border-brand-300/70 bg-brand-50/80 dark:border-brand-500/30 dark:bg-brand-500/10', dot: 'bg-brand-600' },
  trap: { label: 'Erro comum', icon: '✕', cls: 'border-rose-300/70 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10', dot: 'bg-rose-500' },
  prod: { label: 'Em produção', icon: '▲', cls: 'border-accent-400/70 bg-accent-50/80 dark:border-accent-500/30 dark:bg-accent-500/10', dot: 'bg-accent-600' },
};

export function Callout({ tone, title, text }: { tone: Tone; title?: string; text: string }) {
  const t = TONES[tone];
  return (
    <aside className={`my-5 flex gap-3 rounded-2xl border px-4 py-3.5 ${t.cls}`}>
      <span aria-hidden className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-black text-white ${t.dot}`}>{t.icon}</span>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-bold text-strong wrap-anywhere">
          {title ? <><span className="mr-1.5 eyebrow">{t.label}</span>{title}</> : t.label}
        </p>
        <p className="text-[0.925rem] leading-relaxed"><RichText text={text} /></p>
      </div>
    </aside>
  );
}

function DataTable({ head, rows, caption }: { head: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="my-5">
      <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-soft">
        <table className="w-full border-collapse text-left text-[0.87rem]">
          <thead>
            <tr className="surface-sunken">
              {head.map((h, i) => (
                <th key={i} className="border-b border-soft px-3.5 py-2.5 font-semibold whitespace-nowrap text-strong">
                  <RichText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-black/[0.015] dark:odd:bg-white/[0.02]">
                {r.map((c, j) => (
                  <td key={j} className="border-b border-soft/60 px-3.5 py-2.5 align-top">
                    <RichText text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="mt-2 text-xs text-muted"><RichText text={caption} /></figcaption>}
    </figure>
  );
}

function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="my-5 space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]">{i + 1}</span>
          <div className="min-w-0">
            <p className="font-semibold text-strong"><RichText text={s.title} /></p>
            <p className="text-[0.9rem] leading-relaxed"><RichText text={s.text} /></p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Terms({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="my-5 grid gap-3 sm:grid-cols-2">
      {items.map((t) => (
        <div key={t.term} className="card p-3.5">
          <dt className="font-mono text-sm font-bold text-brand-700 dark:text-brand-300">{t.term}</dt>
          <dd className="mt-1 text-[0.87rem] leading-relaxed"><RichText text={t.def} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Compare({ left, right }: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }) {
  return (
    <div className="my-5 grid gap-4 md:grid-cols-2">
      {[left, right].map((side, i) => (
        <div key={i} className={`rounded-2xl border p-4 ${i === 0 ? 'border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/[0.07]' : 'border-rose-300/60 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/[0.07]'}`}>
          <p className="mb-2 font-bold text-strong">{side.title}</p>
          <ul className="space-y-1.5 text-[0.88rem]">
            {side.items.map((it, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="text-muted">{i === 0 ? '✔' : '✘'}</span>
                <span><RichText text={it} /></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ToolGrid({ items }: { items: { name: string; role: string; badge?: string }[] }) {
  return (
    <div className="my-5 grid gap-2.5 sm:grid-cols-2">
      {items.map((s) => (
        <div key={s.name} className="flex gap-3 rounded-xl border border-soft surface-sunken p-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-700 dark:text-brand-300">
            {s.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-strong">
              {s.name}
              {s.badge && <span className="chip ml-2 bg-accent-500/15 text-accent-700 dark:text-accent-300">{s.badge}</span>}
            </p>
            <p className="text-[0.83rem] leading-relaxed text-muted"><RichText text={s.role} /></p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RefList({ items }: { items: { label: string; url: string }[] }) {
  return (
    <div className="my-5 rounded-2xl border border-soft surface-sunken p-4">
      <p className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">Fontes oficiais</p>
      <ul className="space-y-1.5 text-sm">
        {items.map((r) => (
          <li key={r.url} className="flex gap-2">
            <span aria-hidden className="text-muted">↗</span>
            <a className="link" href={r.url} target="_blank" rel="noreferrer noopener">{r.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LabRef({ refId }: { refId: string }) {
  const modulo = useModulo();
  const lab = modulo?.labs.find((l) => l.id === refId);
  return lab ? <CodeLab lab={lab} compact /> : <Missing what={`Laboratório desconhecido: ${refId}`} />;
}

function Missing({ what }: { what: string }) {
  return <p className="my-4 rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{what}</p>;
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="my-3.5 text-[0.95rem] leading-[1.8]"><RichText text={block.text} /></p>;
    case 'h':
      return <h3 className="mt-8 mb-2 text-lg font-bold">{block.text}</h3>;
    case 'list':
      return block.ordered ? (
        <ol className="my-4 ml-5 list-decimal space-y-1.5 text-[0.93rem] leading-relaxed marker:font-semibold marker:text-brand-600">
          {block.items.map((it, i) => <li key={i}><RichText text={it} /></li>)}
        </ol>
      ) : (
        <ul className="my-4 ml-5 list-disc space-y-1.5 text-[0.93rem] leading-relaxed marker:text-brand-500">
          {block.items.map((it, i) => <li key={i}><RichText text={it} /></li>)}
        </ul>
      );
    case 'code':
      return <CodeBlock code={block.code} lang={block.lang} caption={block.caption} />;
    case 'run':
      return <PythonRunner run={block.run} />;
    case 'formula':
      return <FormulaView formula={block.formula} />;
    case 'table':
      return <DataTable head={block.head} rows={block.rows} caption={block.caption} />;
    case 'callout':
      return <Callout tone={block.tone} title={block.title} text={block.text} />;
    case 'steps':
      return <Steps items={block.items} />;
    case 'terms':
      return <Terms items={block.items} />;
    case 'compare':
      return <Compare left={block.left} right={block.right} />;
    case 'diagram':
      return <DiagramView diagram={block.diagram} />;
    case 'flow':
      return <FlowPlayer flow={block.flow} />;
    case 'decision':
      return <DecisionTreeView tree={block.tree} />;
    case 'tools':
      return <ToolGrid items={block.items} />;
    case 'prompt':
      return <PromptView prompt={block.prompt} />;
    case 'retrieval':
      return <RetrievalView retrieval={block.retrieval} />;
    case 'graph':
      return <GraphView graph={block.graph} />;
    case 'trace':
      return <TraceView trace={block.trace} />;
    case 'eval':
      return <EvalView spec={block.eval} />;
    case 'tool': {
      const t = FERRAMENTA_DE[block.ref];
      return t ? <ToolCard tool={t} compact /> : <Missing what={`Ferramenta desconhecida: ${block.ref}`} />;
    }
    case 'endpoint': {
      const ep = ENDPOINT_BY_ID[block.ref];
      return ep ? <EndpointCard ep={ep} compact /> : <Missing what={`Endpoint desconhecido: ${block.ref}`} />;
    }
    case 'lab':
      return <LabRef refId={block.ref} />;
    case 'adr': {
      const adr = ADR_BY_ID[block.ref];
      return adr ? <AdrCard adr={adr} compact /> : <Missing what={`Decisão desconhecida: ${block.ref}`} />;
    }
    case 'file':
      return <FileView path={block.ref} lines={block.lines} />;
    case 'refs':
      return <RefList items={block.items} />;
    case 'widget':
      return <Widget id={block.id} props={block.props} />;
  }
}
