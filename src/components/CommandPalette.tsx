import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResult } from '../lib/search';

/** O índice puxa o conteúdo todo e o glossário: só carrega quando abres a pesquisa. */
type SearchFn = (q: string, limit?: number) => SearchResult[];
let searchFn: SearchFn | null = null;

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  modulo: 'Módulo',
  seccao: 'Secção',
  caso: 'Caso',
  termo: 'Glossário',
  simulador: 'Simulador',
  ferramenta: 'Ferramenta',
  adr: 'Decisão',
  endpoint: 'Endpoint',
  lab: 'Laboratório',
};

const SUGESTOES = ['RRF', 'pgvector', 'interrupt', 'faithfulness', 'reembolso', 'SSE', 'Dockerfile', 'prompt injection'];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(searchFn !== null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || searchFn) return;
    let alive = true;
    import('../lib/search').then(async (m) => {
      await m.prepararIndice();
      searchFn = m.search;
      if (alive) setReady(true);
    });
    return () => { alive = false; };
  }, [open]);

  const results = useMemo(() => (open && ready && searchFn ? searchFn(q) : []), [q, open, ready]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  if (!open) return null;

  const go = (r: SearchResult) => {
    window.location.hash = r.href.replace(/^#/, '');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-soft surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pesquisar"
      >
        <div className="flex items-center gap-3 border-b border-soft px-4 py-3">
          <span aria-hidden className="text-muted">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
            }}
            placeholder="Pesquisar módulos, secções, decisões, ferramentas, termos…"
            className="w-full bg-transparent text-[0.95rem] outline-none placeholder:text-muted"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-soft px-1.5 py-0.5 font-mono text-[0.65rem] text-muted sm:block">Esc</kbd>
        </div>

        <div className="scrollbar-thin max-h-[52vh] overflow-y-auto">
          {!ready && (
            <p className="px-4 py-6 text-center text-sm text-muted">A preparar o índice de pesquisa…</p>
          )}
          {ready && q.trim().length < 2 && (
            <div className="px-4 py-5">
              <p className="eyebrow mb-2">Experimenta</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="chip surface-sunken text-body hover:text-strong">{s}</button>
                ))}
              </div>
            </div>
          )}
          {ready && q.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">Sem resultados para “{q}”.</p>
          )}
          <ul>
            {results.map((r, i) => (
              <li key={r.href + i}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-brand-500/10' : ''}`}
                >
                  <span className="chip mt-0.5 shrink-0 surface-sunken text-muted">{KIND_LABEL[r.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-strong">{r.title}</span>
                    <span className="block truncate text-xs text-muted">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 border-t border-soft surface-sunken px-4 py-2 text-[0.7rem] text-muted">
          <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navegar</span>
          <span><kbd className="kbd">↵</kbd> abrir</span>
          <span><kbd className="kbd">Esc</kbd> fechar</span>
          {ready && q.trim().length >= 2 && <span className="ml-auto tabular">{results.length} resultados</span>}
        </div>
      </div>
    </div>
  );
}
