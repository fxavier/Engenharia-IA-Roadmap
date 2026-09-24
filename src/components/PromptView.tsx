import { useState } from 'react';
import type { Message, PromptSpec, Role } from '../types';
import { RichText } from './RichText';

const PAPEL: Record<Role, { nome: string; cls: string; icone: string }> = {
  sistema: { nome: 'sistema', cls: 'border-brand-400/60 bg-brand-500/[0.08]', icone: '⚙' },
  utilizador: { nome: 'utilizador', cls: 'border-soft surface-sunken', icone: '▤' },
  assistente: { nome: 'assistente', cls: 'border-emerald-400/50 bg-emerald-500/[0.07]', icone: '◆' },
  ferramenta: { nome: 'ferramenta', cls: 'border-accent-500/50 bg-accent-500/[0.07]', icone: '⚒' },
};

function Bolha({ m }: { m: Message }) {
  const p = PAPEL[m.role];
  return (
    <li className={`rounded-xl border px-3.5 py-2.5 ${p.cls} ${m.untrusted ? 'ring-2 ring-rose-400/50 ring-offset-2 ring-offset-[var(--surface)]' : ''}`}>
      <p className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[0.66rem] tracking-widest uppercase">
        <span aria-hidden>{p.icone}</span>
        <span className="font-bold">{p.nome}{m.name ? `:${m.name}` : ''}</span>
        {m.untrusted && <span className="chip bg-rose-500/15 text-[0.6rem] tracking-normal text-rose-700 normal-case dark:text-rose-300">conteúdo não confiável — dados, nunca instruções</span>}
        {m.tokens !== undefined && <span className="ml-auto text-muted">{m.tokens} tok</span>}
      </p>
      <p className="text-[0.87rem] leading-relaxed whitespace-pre-wrap"><RichText text={m.text} /></p>
      {m.call && (
        <div className="mt-2 rounded-lg border border-soft surface px-2.5 py-1.5">
          <p className="font-mono text-[0.68rem] text-muted">tool_use → <span className="font-bold text-strong">{m.call.tool}</span></p>
          <pre className="scrollbar-thin mt-1 overflow-x-auto font-mono text-[0.74rem]">{m.call.args}</pre>
        </div>
      )}
      {m.note && <p className="mt-1.5 border-l-2 border-brand-400/50 pl-2 text-[0.78rem] text-muted italic"><RichText text={m.note} /></p>}
    </li>
  );
}

export function PromptView({ prompt }: { prompt: PromptSpec }) {
  const [json, setJson] = useState(false);
  const total = prompt.messages.reduce((a, m) => a + (m.tokens ?? 0), 0);

  const comoJson = JSON.stringify(
    prompt.messages.map((m) => ({
      role: m.role === 'sistema' ? 'system' : m.role === 'utilizador' ? 'user' : m.role === 'assistente' ? 'assistant' : 'tool',
      ...(m.name ? { name: m.name } : {}),
      content: m.call ? [{ type: 'text', text: m.text }, { type: 'tool_use', name: m.call.tool, input: JSON.parse(m.call.args || '{}') }] : m.text,
    })),
    null,
    2,
  );

  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">Janela de contexto</span>
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{prompt.title}</p>
        {total > 0 && <span className="chip surface font-mono text-[0.68rem] text-muted">{total.toLocaleString('pt-PT')} tok</span>}
        <button className="btn btn-ghost btn-sm" onClick={() => setJson((v) => !v)}>{json ? 'Ver anotado' : 'Ver como pedido'}</button>
      </header>

      {prompt.brief && <p className="px-4 pt-3 text-[0.9rem] leading-relaxed"><RichText text={prompt.brief} /></p>}

      {json ? (
        <pre className="scrollbar-thin m-4 max-h-96 overflow-auto rounded-xl border border-soft surface-sunken p-3 font-mono text-[0.74rem] leading-relaxed">{comoJson}</pre>
      ) : (
        <ul className="space-y-2 p-4">
          {prompt.messages.map((m, i) => <Bolha key={i} m={m} />)}
        </ul>
      )}

      {prompt.note && <p className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted"><RichText text={prompt.note} /></p>}
    </section>
  );
}
