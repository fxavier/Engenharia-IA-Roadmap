import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GLOSSARY } from '../data/glossary';
import { getMeta } from '../content';
import { RichText } from '../components/RichText';
import type { GlossaryEntry } from '../types';

function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slug(termo: string): string {
  return fold(termo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Letra do índice alfabético. Tudo o que não começa por letra cai em «#»
 *  — as anotações (`@Blocking`) e os números vivem lá. */
function inicial(termo: string): string {
  const c = fold(termo).charAt(0);
  return /[a-z]/.test(c) ? c.toUpperCase() : '#';
}

const NOME_CAT: Record<string, string> = {
  llm: 'LLMs',
  rag: 'RAG',
  vectores: 'Vectores',
  agentes: 'Agentes',
  langchain: 'LangChain',
  langgraph: 'LangGraph',
  avaliacao: 'Avaliação',
  seguranca: 'Segurança',
  fastapi: 'FastAPI',
  docker: 'Docker',
  git: 'Git',
  cicd: 'CI/CD',
  operacao: 'Operação',
  outros: 'Outros',
};

/** Ordem das categorias: a do percurso do tutorial. */
const ORDEM_CAT = Object.keys(NOME_CAT);

function nomeCat(c: string): string {
  return NOME_CAT[c] ?? c;
}

export function GlossaryPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('todas');
  const [destaque, setDestaque] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => () => { if (temporizador.current !== null) window.clearTimeout(temporizador.current); }, []);

  const porTermo = useMemo(() => {
    const m = new Map<string, GlossaryEntry>();
    for (const g of GLOSSARY) m.set(fold(g.term), g);
    return m;
  }, []);

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const g of GLOSSARY) {
      const c = g.cat ?? 'outros';
      contagem.set(c, (contagem.get(c) ?? 0) + 1);
    }
    const pos = (c: string) => { const i = ORDEM_CAT.indexOf(c); return i < 0 ? 99 : i; };
    return [...contagem.entries()].sort((a, b) => pos(a[0]) - pos(b[0]) || nomeCat(a[0]).localeCompare(nomeCat(b[0]), 'pt'));
  }, []);

  const ordenados = useMemo(
    () => [...GLOSSARY].sort((a, b) => fold(a.term).localeCompare(fold(b.term), 'pt')),
    [],
  );

  const lista = useMemo(() => {
    const f = fold(q.trim());
    return ordenados.filter((g) => {
      if (cat !== 'todas' && (g.cat ?? 'outros') !== cat) return false;
      if (!f) return true;
      return fold(g.term).includes(f) || fold(g.def).includes(f);
    });
  }, [ordenados, q, cat]);

  const letras = useMemo(() => Array.from(new Set(lista.map((g) => inicial(g.term)))), [lista]);

  /** Leva a atenção até um termo: limpa filtros que o escondam, marca-o e
   *  faz scroll. Serve tanto o `?t=` como as ligações `see`. */
  const irPara = (termo: string) => {
    const alvo = porTermo.get(fold(termo));
    if (!alvo) return;
    setQ('');
    setCat('todas');
    setDestaque(alvo.term);
    setParams({ t: alvo.term }, { replace: true });
    if (typeof document === 'undefined') return;
    window.setTimeout(() => {
      const el = document.getElementById(`t-${slug(alvo.term)}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setDestaque(null), 2800);
  };

  /* O `?t=` é lido uma vez: a partir daí quem manda é o estado da página. */
  const inicialFeita = useRef(false);
  useEffect(() => {
    if (inicialFeita.current) return;
    inicialFeita.current = true;
    const t = params.get('t');
    if (!t) return;
    const alvo = porTermo.get(fold(t));
    if (alvo) {
      setDestaque(alvo.term);
      if (typeof document === 'undefined') return;
      window.setTimeout(() => {
        const el = document.getElementById(`t-${slug(alvo.term)}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    } else {
      setQ(t);
    }
  }, [params, porTermo]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="eyebrow mb-1">Referência</p>
      <h1 className="text-2xl font-black sm:text-3xl">Glossário</h1>
      <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
        {GLOSSARY.length} termos que aparecem ao longo do tutorial, cada um com a ligação para o módulo onde é
        tratado a sério e para os termos vizinhos — porque quase nenhum destes conceitos se percebe sozinho. Os
        termos técnicos ficam em inglês quando é assim que se dizem: <em>embedding</em>, <em>chunk</em>,{' '}
        <em>re-ranking</em>, <em>faithfulness</em>, <em>checkpoint</em>.
      </p>

      <label className="mt-5 block">
        <span className="mb-1 block text-xs font-semibold text-muted">Filtrar por texto</span>
        <input
          className="field"
          placeholder="HNSW, RRF, reducer, TTFT…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">Categoria</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCat('todas')}
            aria-pressed={cat === 'todas'}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              cat === 'todas' ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'surface-sunken text-muted hover:text-strong'
            }`}
          >
            todas <span className="font-mono opacity-70">{GLOSSARY.length}</span>
          </button>
          {categorias.map(([c, n]) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                cat === c ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'surface-sunken text-muted hover:text-strong'
              }`}
            >
              {nomeCat(c)} <span className="font-mono opacity-70">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <nav aria-label="Navegação alfabética" className="scrollbar-thin mt-4 flex flex-wrap gap-1 border-y border-soft py-2">
        {['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((l) => {
          const activa = letras.includes(l);
          return (
            <a
              key={l}
              href={activa ? `#letra-${l === '#' ? 'simbolos' : l}` : undefined}
              aria-disabled={!activa}
              className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold transition ${
                activa ? 'text-brand-700 hover:bg-brand-500/15 dark:text-brand-300' : 'text-muted opacity-40'
              }`}
            >
              {l}
            </a>
          );
        })}
      </nav>

      <p className="mt-3 text-xs text-muted">
        {lista.length} {lista.length === 1 ? 'termo' : 'termos'}
        {cat !== 'todas' && <> na categoria <strong className="text-strong">{nomeCat(cat)}</strong></>}
        {q.trim() && <> com «{q.trim()}»</>}.
      </p>

      <dl className="mt-4 space-y-2.5">
        {lista.map((g, i) => {
          const m = g.module ? getMeta(g.module) : undefined;
          const letra = inicial(g.term);
          const primeiraDaLetra = i === 0 || inicial(lista[i - 1].term) !== letra;
          const activo = destaque === g.term;
          return (
            <div key={g.term}>
              {primeiraDaLetra && (
                <h2
                  id={`letra-${letra === '#' ? 'simbolos' : letra}`}
                  className="scroll-mt-24 pt-3 pb-1 font-mono text-sm font-bold text-muted"
                >
                  {letra}
                </h2>
              )}
              <div
                id={`t-${slug(g.term)}`}
                className={`scroll-mt-24 rounded-2xl border p-4 transition ${
                  activo ? 'border-accent-500 bg-accent-500/10' : 'border-soft surface'
                }`}
              >
                <dt className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-brand-700 dark:text-brand-300">{g.term}</span>
                  {g.cat && (
                    <button
                      type="button"
                      onClick={() => setCat(g.cat ?? 'todas')}
                      className="chip surface-sunken text-muted transition hover:text-strong"
                    >
                      {nomeCat(g.cat)}
                    </button>
                  )}
                  {m && (
                    <Link to={`/modulo/${m.id}`} className="chip surface-sunken text-muted hover:text-strong">
                      {m.icon} {m.title}
                    </Link>
                  )}
                </dt>
                <dd className="mt-1.5 text-[0.9rem] leading-relaxed"><RichText text={g.def} /></dd>
                {g.see && g.see.length > 0 && (
                  <dd className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[0.7rem] font-bold tracking-widest text-muted uppercase">ver também</span>
                    {g.see.map((s) => {
                      const existe = porTermo.has(fold(s));
                      return existe ? (
                        <button
                          key={s}
                          type="button"
                          onClick={() => irPara(s)}
                          className="chip bg-brand-500/12 font-mono text-brand-700 transition hover:bg-brand-500/25 dark:text-brand-300"
                        >
                          {s}
                        </button>
                      ) : (
                        <span key={s} className="chip surface-sunken font-mono text-muted">{s}</span>
                      );
                    })}
                  </dd>
                )}
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <p className="text-sm text-muted">
            Sem resultados. <button type="button" className="link" onClick={() => { setQ(''); setCat('todas'); }}>Limpar os filtros</button>.
          </p>
        )}
      </dl>
    </div>
  );
}
