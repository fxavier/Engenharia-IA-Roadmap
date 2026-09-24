import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  REQUISITOS,
  CAPACIDADE,
  ORCAMENTO_LATENCIA,
  TTFT_MS,
  TURNO_TOTAL_MS,
  RISCOS,
  MODELOS,
  POLITICA,
  type RiskItem,
} from '../data/design';
import { ENDPOINTS } from '../data/api';
import { PROJECTO } from '../data/parts';
import { EndpointCard, MethodChip } from '../components/EndpointCard';
import { RichText } from '../components/RichText';
import type { Requirement, PolicyRow } from '../types';

/* =================================================================== apoio */

function Titulo({ id, eyebrow, children }: { id: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mt-14 mb-3 scroll-mt-20 border-t border-soft pt-8">
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <h2 className="text-xl font-black sm:text-2xl">{children}</h2>
    </div>
  );
}

const NUM = new Intl.NumberFormat('pt-PT');
const SEG = (ms: number) => `${(ms / 1000).toFixed(2).replace('.', ',')} s`;

/* ============================================================== requisitos */

type Genero = Requirement['kind'];

const GENEROS: { id: Genero; nome: string; blurb: string }[] = [
  { id: 'funcional', nome: 'Funcionais', blurb: 'O que o sistema faz. Cada um tem uma medida: sem medida, é uma intenção.' },
  { id: 'nao-funcional', nome: 'Não funcionais', blurb: 'Quão bem o faz — latência, custo, privacidade, resistência a prompt injection e auditabilidade. É aqui que estão os números que decidem o desenho.' },
  { id: 'restricao', nome: 'Restrições', blurb: 'O que não se negoceia: o tamanho da equipa, uma só base de dados, e tudo a correr localmente sem chave de API.' },
  { id: 'fora-de-ambito', nome: 'Fora de âmbito', blurb: 'O que o «Balcão» não faz, escrito de propósito. Um âmbito por escrito é a defesa contra o crescimento silencioso.' },
];

const PRIORIDADE: Record<string, string> = {
  must: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  should: 'bg-accent-500/20 text-accent-800 dark:text-accent-300',
  could: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  wont: 'surface-sunken text-muted',
};

const OPCOES_GENERO: ('todos' | Genero)[] = ['todos', ...GENEROS.map((g) => g.id)];

function Requisitos() {
  const [genero, setGenero] = useState<'todos' | Genero>('todos');
  const visiveis = GENEROS.filter((g) => genero === 'todos' || g.id === genero);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Género de requisito">
        {OPCOES_GENERO.map((id) => {
          const nome = id === 'todos' ? 'todos' : GENEROS.find((g) => g.id === id)?.nome ?? id;
          const n = id === 'todos' ? REQUISITOS.length : REQUISITOS.filter((r) => r.kind === id).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setGenero(id)}
              aria-pressed={genero === id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                genero === id
                  ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                  : 'surface-sunken text-muted hover:text-strong'
              }`}
            >
              {nome} <span className="font-mono opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {visiveis.map((g) => {
          const lista = REQUISITOS.filter((r) => r.kind === g.id);
          if (lista.length === 0) return null;
          return (
            <section key={g.id} aria-label={g.nome}>
              <p className="text-[0.7rem] font-bold tracking-widest text-muted uppercase">{g.nome}</p>
              <p className="mt-0.5 mb-2 max-w-3xl text-[0.85rem] leading-relaxed text-muted">{g.blurb}</p>
              <ul className="space-y-2">
                {lista.map((r) => (
                  <li key={r.id} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip surface-sunken font-mono text-muted">{r.id}</span>
                      {r.priority && <span className={`chip ${PRIORIDADE[r.priority] ?? 'surface-sunken text-muted'}`}>{r.priority}</span>}
                    </div>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-strong"><RichText text={r.text} /></p>
                    {r.measure && (
                      <p className="mt-2 border-l-2 border-brand-400 pl-3 text-[0.84rem] leading-relaxed text-muted">
                        <span className="font-bold tracking-widest uppercase">Como se mede · </span>
                        <RichText text={r.measure} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================== capacidade */

function Capacidade() {
  return (
    <ul className="space-y-2">
      {CAPACIDADE.map((c) => (
        <li key={c.label} className="card p-4">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[0.92rem] font-bold text-strong">{c.label}</span>
            <span className="font-mono text-base font-bold text-brand-700 dark:text-brand-300">{c.value}</span>
          </p>
          <p className="mt-1.5 rounded-xl surface-sunken px-3 py-2 text-[0.84rem] leading-relaxed text-muted">
            <RichText text={c.work} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================== modelos */

function Modelos() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MODELOS.map((m) => (
        <article key={m.id} className="card p-4">
          <p className="font-mono text-[0.92rem] font-bold text-brand-700 dark:text-brand-300">{m.nome}</p>
          <p className="mt-1.5 text-[0.85rem] leading-relaxed">{m.papel}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-soft pt-3 text-[0.78rem]">
            <p><span className="text-muted">janela · </span><span className="font-mono">{m.janela}</span></p>
            <p><span className="text-muted">p50 · </span><span className="font-mono">{m.p50}</span></p>
            <p><span className="text-muted">entrada · </span><span className="font-mono">{m.custoEntrada}</span></p>
            <p><span className="text-muted">saída · </span><span className="font-mono">{m.custoSaida}</span></p>
          </div>
          <p className="mt-2.5 text-[0.82rem] leading-relaxed text-muted"><RichText text={m.nota} /></p>
        </article>
      ))}
    </div>
  );
}

/* ============================================================ autonomia */

const AUTONOMIA_COR: Record<PolicyRow['autonomia'], string> = {
  autonomo: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  aprovacao: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  proibido: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

const AUTONOMIA_NOME: Record<PolicyRow['autonomia'], { nome: string; blurb: string; dot: string }> = {
  autonomo: { nome: 'Autónomo', blurb: 'O grafo faz sozinho, dentro do limite.', dot: 'bg-emerald-500' },
  aprovacao: { nome: 'Com aprovação', blurb: 'O grafo pára num interrupt até um humano decidir.', dot: 'bg-amber-500' },
  proibido: { nome: 'Proibido', blurb: 'Não há ferramenta para isto — não se pode pedir por injecção.', dot: 'bg-rose-500' },
};

function Autonomia() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(['autonomo', 'aprovacao', 'proibido'] as const).map((k) => {
        const lista = POLITICA.filter((p) => p.autonomia === k);
        return (
          <section key={k} className="rounded-2xl border border-soft surface-sunken p-3">
            <header className="mb-2.5 px-1">
              <p className="flex items-center gap-2 font-bold text-strong">
                <span aria-hidden className={`size-2.5 rounded-full ${AUTONOMIA_NOME[k].dot}`} />
                {AUTONOMIA_NOME[k].nome}
                <span className="font-mono text-xs text-muted">{lista.length}</span>
              </p>
              <p className="text-[0.78rem] text-muted">{AUTONOMIA_NOME[k].blurb}</p>
            </header>
            <ul className="space-y-2">
              {lista.map((p) => (
                <li key={p.accao} className="rounded-xl border border-soft bg-[var(--surface-raised)] p-3">
                  <p className="text-[0.88rem] font-bold text-strong">{p.accao}</p>
                  {p.limite !== '—' && (
                    <p className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[0.72rem] ${AUTONOMIA_COR[p.autonomia]}`}><RichText text={p.limite} /></p>
                  )}
                  <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted"><RichText text={p.porque} /></p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ========================================================= orçamento de latência */

const CORES_FASE = [
  'oklch(0.60 0.05 240)',
  'oklch(0.62 0.16 300)',
  'oklch(0.66 0.16 60)',
  'oklch(0.64 0.13 260)',
  'oklch(0.64 0.14 200)',
  'oklch(0.60 0.16 330)',
  'var(--color-brand-500)',
  'oklch(0.72 0.12 170)',
  'oklch(0.62 0.15 25)',
  'oklch(0.55 0.04 240)',
];

function Latencia() {
  const [activo, setActivo] = useState<number | null>(null);
  /* O embedding corre em paralelo com a classificação: fica numa pista à parte. */
  const paralelo = ORCAMENTO_LATENCIA.findIndex((x) => /embedding/i.test(x.fase));
  const antesDe = paralelo > 0 ? paralelo - 1 : -1;
  let t = 0;
  const segmentos = ORCAMENTO_LATENCIA.map((x, i) => {
    if (i === paralelo) return null;
    const s = { i, inicio: t, ms: x.ms };
    t += x.ms;
    return s;
  }).filter((x): x is { i: number; inicio: number; ms: number } => x !== null);
  const total = Math.max(TURNO_TOTAL_MS, t);
  const pct = (ms: number) => (ms / total) * 100;
  const inicioParalelo = segmentos.find((s) => s.i === antesDe)?.inicio ?? 0;
  const item = activo !== null ? ORCAMENTO_LATENCIA[activo] : null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-emerald-500/12 px-3 py-2">
          <p className="text-[0.68rem] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">TTFT</p>
          <p className="font-mono text-lg font-black text-strong">{SEG(TTFT_MS)}</p>
          <p className="text-[0.7rem] text-muted">alvo p95 &lt; 1,5 s</p>
        </div>
        <div className="rounded-xl surface-sunken px-3 py-2">
          <p className="text-[0.68rem] font-bold tracking-wider text-muted uppercase">Turno completo</p>
          <p className="font-mono text-lg font-black text-strong">{SEG(TURNO_TOTAL_MS)}</p>
          <p className="text-[0.7rem] text-muted">alvo p95 &lt; 5 s</p>
        </div>
        <div className="rounded-xl surface-sunken px-3 py-2">
          <p className="text-[0.68rem] font-bold tracking-wider text-muted uppercase">Folga no TTFT</p>
          <p className="font-mono text-lg font-black text-strong">{NUM.format(1500 - TTFT_MS)} ms</p>
          <p className="text-[0.7rem] text-muted">para o p95 de 1,5 s</p>
        </div>
      </div>

      <div className="relative pt-7 pb-1">
        {/* marcador do TTFT */}
        <div className="pointer-events-none absolute top-0 bottom-0 z-10" style={{ left: `${pct(TTFT_MS)}%` }}>
          <span className="absolute -top-0.5 -translate-x-1/2 rounded-md bg-emerald-600 px-1.5 py-0.5 font-mono text-[0.62rem] font-bold whitespace-nowrap text-white">
            1.º token · {SEG(TTFT_MS)}
          </span>
          <span className="absolute top-5 bottom-0 w-0.5 -translate-x-1/2 bg-emerald-600" />
        </div>

        <div className="flex h-11 overflow-hidden rounded-xl border border-soft">
          {segmentos.map((sg) => (
            <button
              key={sg.i}
              type="button"
              onMouseEnter={() => setActivo(sg.i)}
              onFocus={() => setActivo(sg.i)}
              onClick={() => setActivo(sg.i)}
              title={`${ORCAMENTO_LATENCIA[sg.i].fase} · ${sg.ms} ms`}
              className={`relative h-full border-r border-[var(--surface-raised)] transition-opacity last:border-r-0 ${activo !== null && activo !== sg.i ? 'opacity-45' : ''}`}
              style={{ width: `${pct(sg.ms)}%`, background: CORES_FASE[sg.i % CORES_FASE.length] }}
            >
              {pct(sg.ms) > 7 && <span className="font-mono text-[0.62rem] font-bold text-white/95">{sg.ms}</span>}
            </button>
          ))}
        </div>

        {paralelo >= 0 && (
          <div className="relative mt-1 h-4">
            <button
              type="button"
              onMouseEnter={() => setActivo(paralelo)}
              onClick={() => setActivo(paralelo)}
              className={`absolute top-0 h-full rounded-md transition-opacity ${activo !== null && activo !== paralelo ? 'opacity-45' : ''}`}
              style={{ left: `${pct(inicioParalelo)}%`, width: `${pct(ORCAMENTO_LATENCIA[paralelo].ms)}%`, background: CORES_FASE[paralelo % CORES_FASE.length] }}
              title={`${ORCAMENTO_LATENCIA[paralelo].fase} · em paralelo`}
            />
            <span className="absolute top-0 text-[0.64rem] whitespace-nowrap text-muted" style={{ left: `calc(${pct(inicioParalelo + ORCAMENTO_LATENCIA[paralelo].ms)}% + 6px)` }}>
              ↳ em paralelo, fora do caminho crítico
            </span>
          </div>
        )}

        <div className="mt-1 flex justify-between font-mono text-[0.62rem] text-muted">
          <span>0</span><span>{SEG(total / 2)}</span><span>{SEG(total)}</span>
        </div>
      </div>

      <div className="mt-3 min-h-[4.5rem] rounded-xl border border-soft surface-sunken px-3.5 py-2.5">
        {item ? (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-strong">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: CORES_FASE[(activo ?? 0) % CORES_FASE.length] }} />
              {item.fase}
              <span className="font-mono text-xs text-muted">{item.ms} ms</span>
              <span className={`chip text-[0.62rem] ${item.antesDoPrimeiroToken ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--surface-raised)] text-muted'}`}>
                {item.antesDoPrimeiroToken ? 'conta para o TTFT' : 'depois do 1.º token ou em paralelo'}
              </span>
            </p>
            <p className="mt-1 text-[0.84rem] leading-relaxed text-muted"><RichText text={item.nota} /></p>
          </>
        ) : (
          <p className="text-[0.84rem] text-muted">Passa o cursor (ou toca) num segmento para ver de onde vem o número.</p>
        )}
      </div>

      <ol className="mt-4 grid gap-1 text-[0.8rem] sm:grid-cols-2">
        {ORCAMENTO_LATENCIA.map((x, i) => (
          <li key={x.fase}>
            <button type="button" onClick={() => setActivo(i)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-[var(--surface-sunken)] ${activo === i ? 'bg-[var(--surface-sunken)]' : ''}`}>
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: CORES_FASE[i % CORES_FASE.length] }} />
              <span className="min-w-0 flex-1 truncate text-body">{x.fase}</span>
              <span className="font-mono text-muted tabular">{x.ms} ms</span>
              {x.antesDoPrimeiroToken && <span aria-label="conta para o TTFT" className="text-emerald-600">●</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ================================================================== riscos */

const PROBABILIDADES: RiskItem['probabilidade'][] = ['baixa', 'media', 'alta'];
/** De cima para baixo: o impacto alto fica na primeira linha da matriz. */
const IMPACTOS: RiskItem['impacto'][] = ['alto', 'medio', 'baixo'];

function severidade(r: RiskItem): number {
  return (PROBABILIDADES.indexOf(r.probabilidade) + 1) * (IMPACTOS.length - IMPACTOS.indexOf(r.impacto));
}

function corDaCelula(p: RiskItem['probabilidade'], i: RiskItem['impacto']): string {
  const s = (PROBABILIDADES.indexOf(p) + 1) * (IMPACTOS.length - IMPACTOS.indexOf(i));
  if (s >= 6) return 'border-rose-300/70 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10';
  if (s >= 3) return 'border-amber-300/70 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10';
  return 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10';
}

function Riscos() {
  const [aberto, setAberto] = useState<string | null>(null);
  const risco = RISCOS.find((r) => r.id === aberto);
  const ordenados = useMemo(() => [...RISCOS].sort((a, b) => severidade(b) - severidade(a)), []);

  return (
    <>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[22rem] border-separate border-spacing-1 text-left">
          <caption className="sr-only">Matriz de riscos do «Balcão»: probabilidade contra impacto</caption>
          <thead>
            <tr>
              <th scope="col" className="w-14 text-[0.68rem] font-bold tracking-widest text-muted uppercase">Impacto</th>
              {PROBABILIDADES.map((p) => (
                <th key={p} scope="col" className="text-[0.68rem] font-bold tracking-widest text-muted uppercase">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IMPACTOS.map((imp) => (
              <tr key={imp}>
                <th scope="row" className="text-[0.68rem] font-bold tracking-widest text-muted uppercase">{imp}</th>
                {PROBABILIDADES.map((prob) => {
                  const nesta = RISCOS.filter((r) => r.probabilidade === prob && r.impacto === imp);
                  return (
                    <td key={prob} className={`min-w-20 rounded-xl border p-1.5 align-top ${corDaCelula(prob, imp)}`}>
                      <div className="flex flex-wrap gap-1">
                        {nesta.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setAberto(aberto === r.id ? null : r.id)}
                            aria-pressed={aberto === r.id}
                            title={r.risco}
                            className={`rounded-md px-1.5 py-0.5 font-mono text-[0.72rem] font-bold transition ${
                              aberto === r.id
                                ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                                : 'surface text-strong hover:bg-[var(--surface-sunken)]'
                            }`}
                          >
                            {r.id.toUpperCase()}
                          </button>
                        ))}
                        {nesta.length === 0 && <span className="text-[0.7rem] text-muted opacity-60">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {risco ? (
        <article className="animate-fade-up mt-4 card p-4">
          <p className="flex flex-wrap items-center gap-2">
            <span className="chip surface-sunken font-mono text-muted">{risco.id.toUpperCase()}</span>
            <span className="chip surface-sunken text-muted">probabilidade {risco.probabilidade}</span>
            <span className="chip surface-sunken text-muted">impacto {risco.impacto}</span>
          </p>
          <p className="mt-2 text-[0.95rem] leading-relaxed font-semibold text-strong">{risco.risco}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-soft surface-sunken p-3">
              <p className="mb-1 text-[0.68rem] font-bold tracking-widest text-muted uppercase">Mitigação</p>
              <p className="text-[0.85rem] leading-relaxed"><RichText text={risco.mitigacao} /></p>
            </div>
            <div className="rounded-xl border border-soft surface-sunken p-3">
              <p className="mb-1 text-[0.68rem] font-bold tracking-widest text-muted uppercase">Como se dá por ele</p>
              <p className="text-[0.85rem] leading-relaxed"><RichText text={risco.deteccao} /></p>
            </div>
          </div>
        </article>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {ordenados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setAberto(r.id)}
                className="flex w-full items-start gap-2.5 rounded-xl border border-soft px-3 py-2 text-left transition hover:bg-[var(--surface-sunken)]"
              >
                <span className="chip surface-sunken shrink-0 font-mono text-muted">{r.id.toUpperCase()}</span>
                <span className="min-w-0 flex-1 text-[0.86rem] leading-relaxed text-body">{r.risco}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ================================================================= página */

export function DesignPage() {
  const [params, setParams] = useSearchParams();
  const ep = params.get('ep');
  const epSpec = ep ? ENDPOINTS.find((e) => e.id === ep) : undefined;

  useEffect(() => {
    if (!ep || typeof document === 'undefined') return;
    const el = document.getElementById('api-t');
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [ep]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="hero-glow rounded-3xl border border-soft p-5 sm:p-8">
        <p className="eyebrow mb-1">System design</p>
        <h1 className="text-2xl font-black sm:text-3xl">O desenho do «{PROJECTO.nome}»</h1>
        <p className="mt-3 max-w-3xl text-[0.97rem] leading-relaxed">
          O documento que se escreve antes da primeira linha de prompt: o que o assistente tem de fazer, quão
          bem, quanto custa, quanto autónomo pode ser, onde se gastam os milissegundos de um turno e o que pode
          correr mal.
        </p>
        <p className="mt-2 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
          Num projecto com LLMs, a tentação é começar pelo prompt e pelo modelo mais recente. O desenho existe
          para impedir isso: sem requisitos medidos, sem orçamento de latência e sem política de autonomia, não
          há forma de saber se uma mudança melhorou ou piorou o sistema.
        </p>
        <nav className="mt-4 flex flex-wrap gap-1.5 text-xs">
          {[['req-t', 'Requisitos'], ['cap-t', 'Capacidade'], ['lat-t', 'Latência'], ['modelos-t', 'Modelos'], ['autonomia-t', 'Autonomia'], ['api-t', 'API'], ['risco-t', 'Riscos']].map(([id, n]) => (
            <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} className="chip border border-soft bg-[var(--surface-raised)]/80 text-muted hover:text-strong">{n}</button>
          ))}
        </nav>
      </header>

      <Titulo id="req-t" eyebrow="O quê e quão bem">Requisitos</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        {REQUISITOS.length} requisitos, com prioridade MoSCoW e — nos que a têm — a medida que diz se estão
        cumpridos. Os não funcionais são os que mandam no desenho: o p95 de 1,5 s até à primeira palavra, o
        custo abaixo de 1 MZN por conversa, nenhum dado pessoal no fornecedor.
      </p>
      <Requisitos />

      <Titulo id="cap-t" eyebrow="Contas de guardanapo">Capacidade</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        Cada linha traz o cálculo por extenso, porque o valor de uma estimativa de capacidade não está no
        número: está em poder refazê-la quando uma premissa mudar. Repara no tamanho do índice — não é um
        problema de escala.
      </p>
      <Capacidade />

      <Titulo id="lat-t" eyebrow="Onde vão os milissegundos">Orçamento de latência de um turno</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        Um turno típico de política, com RAG e sem ferramentas. O que conta para o cliente é o tempo até ao
        primeiro token (TTFT): com streaming, a geração da resposta já não o faz esperar.
      </p>
      <Latencia />

      <Titulo id="modelos-t" eyebrow="Escalões, não marcas">Modelos</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        Um modelo pequeno para classificar, um médio para responder, um grande para julgar, um local para
        desenvolver. Os preços são de referência para comparar escalões — confirma sempre na página oficial
        do fornecedor, porque mudam.
      </p>
      <Modelos />

      <Titulo id="autonomia-t" eyebrow="O que o agente pode fazer sozinho">Política de autonomia</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        O que separa um assistente útil de um assistente perigoso não é o modelo — é esta tabela, aplicada no
        código das ferramentas e não no prompt.
      </p>
      <Autonomia />

      <Titulo id="api-t" eyebrow="FastAPI">O contrato do serviço</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        {ENDPOINTS.length} endpoints do serviço HTTP que envolve o grafo. Clica numa linha para ver o contrato
        completo: parâmetros, respostas, exemplos e notas.
      </p>
      {epSpec && (
        <div className="mb-4">
          <EndpointCard ep={epSpec} />
        </div>
      )}
      <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-soft">
        <table className="w-full text-left text-[0.8rem]">
          <caption className="sr-only">Endpoints do «Balcão»</caption>
          <thead>
            <tr className="surface-sunken">
              <th scope="col" className="border-b border-soft px-3 py-2 font-semibold text-strong">Método</th>
              <th scope="col" className="border-b border-soft px-3 py-2 font-semibold text-strong">Caminho</th>
              <th scope="col" className="border-b border-soft px-3 py-2 font-semibold text-strong">O que faz</th>
              <th scope="col" className="border-b border-soft px-3 py-2 font-semibold text-strong">p95</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr
                key={e.id}
                id={`ep-${e.id}`}
                onClick={() => setParams({ ep: e.id }, { replace: true })}
                className={`cursor-pointer scroll-mt-24 transition hover:bg-brand-500/[0.06] ${ep === e.id ? 'bg-accent-500/10' : 'odd:bg-black/[0.015] dark:odd:bg-white/[0.02]'}`}
              >
                <td className="border-b border-soft/60 px-3 py-2 align-top"><MethodChip method={e.method} /></td>
                <td className="border-b border-soft/60 px-3 py-2 align-top font-mono break-all text-strong">
                  {e.path}
                  {e.stream && <span className="ml-1.5 chip bg-violet-500/15 px-1.5 text-[0.6rem] text-violet-700 dark:text-violet-300">SSE</span>}
                </td>
                <td className="border-b border-soft/60 px-3 py-2 align-top text-muted">
                  {e.summary}
                  <span className="mt-0.5 block font-mono text-[0.72rem] opacity-70">{e.service}</span>
                </td>
                <td className="border-b border-soft/60 px-3 py-2 align-top font-mono whitespace-nowrap text-muted">
                  {e.p95 === undefined ? '—' : `${e.p95} ms`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Titulo id="risco-t" eyebrow="O que pode correr mal">Riscos</Titulo>
      <p className="mb-4 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
        Probabilidade contra impacto, com a mitigação e a forma de dar por cada risco. Clica num risco para o
        abrir. Repara que nenhum dos riscos de impacto alto se resolve com um modelo melhor: resolvem-se com
        recuperação filtrada, limites no código, guardas e avaliação contínua.
      </p>
      <Riscos />

      <footer className="mt-12 flex flex-wrap gap-2 border-t border-soft pt-6">
        <Link to="/projecto" className="btn btn-ghost btn-sm">O projecto e as conversas</Link>
        <Link to="/decisoes" className="btn btn-ghost btn-sm">As decisões por trás disto</Link>
        <Link to="/ferramentas" className="btn btn-ghost btn-sm">O catálogo de ferramentas</Link>
        <Link to="/repositorio" className="btn btn-ghost btn-sm">O código que implementa</Link>
      </footer>
    </div>
  );
}
