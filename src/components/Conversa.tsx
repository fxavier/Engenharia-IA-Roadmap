import type { IntencaoSpec } from '../types';

export const CAMINHO: Record<IntencaoSpec['caminho'], { nome: string; cls: string; cor: string }> = {
  rag: { nome: 'RAG', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', cor: 'oklch(0.66 0.14 220)' },
  ferramenta: { nome: 'ferramenta', cls: 'bg-brand-500/15 text-brand-700 dark:text-brand-300', cor: 'var(--color-brand-500)' },
  agente: { nome: 'agente', cls: 'bg-accent-500/15 text-accent-700 dark:text-accent-300', cor: 'var(--color-accent-500)' },
  humano: { nome: 'humano', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', cor: 'oklch(0.64 0.18 20)' },
};

/** Uma bolha de conversa, com as citações `[doc-id]` transformadas em chips. */
export function Bolha({ quem, texto, pequena = false }: { quem: 'cliente' | 'balcao'; texto: string; pequena?: boolean }) {
  const partes = texto.split(/(\[[a-z0-9-]+\])/g);
  const cliente = quem === 'cliente';
  return (
    <div className={`flex ${cliente ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2 leading-relaxed ${pequena ? 'text-[0.8rem]' : 'text-[0.88rem]'} ${
          cliente
            ? 'rounded-br-md bg-brand-600 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
            : 'rounded-bl-md border border-soft bg-[var(--surface-raised)] text-body'
        }`}
      >
        {partes.map((p, i) =>
          /^\[[a-z0-9-]+\]$/.test(p) ? (
            <span key={i} className="mx-0.5 inline-flex rounded-md bg-accent-500/15 px-1.5 font-mono text-[0.68rem] text-accent-800 dark:text-accent-300">
              {p.slice(1, -1)}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </div>
    </div>
  );
}
