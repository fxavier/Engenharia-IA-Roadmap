import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ADRS, ADR_AREAS } from '../data/adr';
import { AdrCard, ADR_ESTADO } from '../components/AdrCard';
import type { Adr, AdrStatus } from '../types';

/* =================================================================== apoio */

function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function num(id: string): string {
  return id.replace('adr-', '');
}

const ESTADOS: AdrStatus[] = ['aceite', 'proposto', 'substituido', 'rejeitado'];

const AREA_COR: Record<string, string> = {
  plataforma: 'oklch(0.60 0.05 240)',
  modelo: 'oklch(0.62 0.17 288)',
  rag: 'oklch(0.66 0.16 200)',
  orquestracao: 'oklch(0.64 0.16 155)',
  avaliacao: 'oklch(0.70 0.16 65)',
  seguranca: 'oklch(0.62 0.19 25)',
  producao: 'oklch(0.58 0.12 250)',
};

/** Ordem de leitura das áreas: a mesma do percurso do tutorial. */
const AREA_ORDEM = ['plataforma', 'modelo', 'rag', 'orquestracao', 'avaliacao', 'seguranca', 'producao'];

function ordenarAreas(as: readonly string[]): string[] {
  return [...as].sort((a, b) => {
    const ia = AREA_ORDEM.indexOf(a);
    const ib = AREA_ORDEM.indexOf(b);
    if (ia === -1 || ib === -1) return a.localeCompare(b, 'pt');
    return ia - ib;
  });
}

function corDaArea(area: string): string {
  return AREA_COR[area] ?? 'var(--text-muted)';
}

/* ============================================================== markdown */

function paraMarkdown(adr: Adr): string {
  const l: string[] = [];
  l.push(`# ADR-${num(adr.id)} — ${adr.title}`, '');
  l.push(`- **Estado:** ${adr.status}`);
  l.push(`- **Data:** ${adr.date}`);
  l.push(`- **Área:** ${adr.area}`);
  l.push(`- **Decisores:** ${adr.deciders.join(', ')}`);
  if (adr.supersedes) l.push(`- **Substitui:** ADR-${num(adr.supersedes)}`);
  l.push('', '## Contexto e problema', '', adr.context, '');
  l.push('## Forças em jogo', '');
  for (const d of adr.drivers) l.push(`- ${d}`);
  l.push('', '## Opções consideradas', '');
  for (const o of adr.options) {
    l.push(`### ${o.name}`, '');
    for (const p of o.pros) l.push(`- (+) ${p}`);
    for (const c of o.cons) l.push(`- (−) ${c}`);
    l.push('');
  }
  l.push('## Decisão', '', adr.decision, '');
  l.push('## Fundamentação', '', adr.rationale, '');
  l.push('## Consequências', '', '### O que ganhamos', '');
  for (const g of adr.consequences.good) l.push(`- ${g}`);
  l.push('', '### O que vai doer', '');
  for (const b of adr.consequences.bad) l.push(`- ${b}`);
  l.push('');
  if (adr.validation) l.push('## Como se sabe que continua certa', '', adr.validation, '');
  if (adr.related?.length) l.push('## Relacionados', '', adr.related.map((r) => `ADR-${num(r)}`).join(', '), '');
  if (adr.refs?.length) {
    l.push('## Referências', '');
    for (const r of adr.refs) l.push(`- [${r.label}](${r.url})`);
    l.push('');
  }
  return l.join('\n');
}

/* ============================================================== linha do tempo */

const MS_DIA = 86_400_000;

function LinhaDoTempo({ onAbrir, aberto }: { onAbrir: (id: string) => void; aberto: string | null }) {
  const ordenados = useMemo(
    () => [...ADRS].sort((a, b) => a.date.localeCompare(b.date)),
    [],
  );

  const t0 = Date.parse(ordenados[0].date);
  const t1 = Date.parse(ordenados[ordenados.length - 1].date);
  const intervalo = Math.max(t1 - t0, MS_DIA);

  const W = 1000;
  const ESQ = 26;
  const LARG = W - ESQ * 2;
  const LINHA = 84;

  const pontos = ordenados.map((a, i) => {
    const x = ESQ + ((Date.parse(a.date) - t0) / intervalo) * LARG;
    const lane = i % 3;
    return { adr: a, x, y: LINHA - 22 + lane * 22 };
  });
  const porId = new Map(pontos.map((p) => [p.adr.id, p]));

  const substituicoes = ordenados
    .filter((a) => a.supersedes)
    .map((a) => ({ de: porId.get(a.id), para: a.supersedes ? porId.get(a.supersedes) : undefined }))
    .filter((s): s is { de: NonNullable<typeof s.de>; para: NonNullable<typeof s.para> } => !!s.de && !!s.para);

  const meses = Array.from(new Set(ordenados.map((a) => a.date.slice(0, 7))));

  return (
    <figure className="rounded-2xl border border-soft surface-sunken p-3 sm:p-4">
      <svg viewBox={`0 0 ${W} 180`} className="w-full" role="img"
        aria-label={`Linha do tempo das ${ADRS.length} decisões, de ${ordenados[0].date} a ${ordenados[ordenados.length - 1].date}`}>
        <defs>
          <marker id="seta-sub" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent-600)" />
          </marker>
        </defs>

        <line x1={ESQ} y1={LINHA + 44} x2={ESQ + LARG} y2={LINHA + 44} stroke="var(--border-soft)" strokeWidth={2} />
        {meses.map((m) => {
          const x = ESQ + ((Date.parse(`${m}-01`) - t0) / intervalo) * LARG;
          if (x < ESQ - 4 || x > ESQ + LARG + 4) return null;
          return (
            <g key={m}>
              <line x1={x} y1={LINHA + 38} x2={x} y2={LINHA + 50} stroke="var(--border-soft)" strokeWidth={1.5} />
              <text x={x} y={LINHA + 68} textAnchor="middle" fontSize="13" fill="var(--text-muted)">{m}</text>
            </g>
          );
        })}

        {substituicoes.map((s) => (
          <path
            key={s.de.adr.id}
            d={`M ${s.de.x} ${s.de.y} C ${s.de.x} ${s.de.y - 46}, ${s.para.x} ${s.para.y - 46}, ${s.para.x} ${s.para.y}`}
            fill="none"
            stroke="var(--color-accent-600)"
            strokeWidth={2}
            strokeDasharray="5 4"
            markerEnd="url(#seta-sub)"
          />
        ))}

        {pontos.map((p) => {
          const activo = aberto === p.adr.id;
          const substituido = p.adr.status === 'substituido';
          return (
            <g key={p.adr.id} className="cursor-pointer" onClick={() => onAbrir(p.adr.id)}>
              <title>{`ADR ${num(p.adr.id)} · ${p.adr.date} · ${p.adr.title}`}</title>
              <line x1={p.x} y1={p.y} x2={p.x} y2={LINHA + 44} stroke="var(--border-soft)" strokeWidth={1} />
              <circle
                cx={p.x}
                cy={p.y}
                r={activo ? 12 : 9.5}
                fill={substituido ? 'var(--surface-raised)' : corDaArea(p.adr.area)}
                stroke={substituido ? 'var(--color-accent-600)' : activo ? 'var(--text-strong)' : 'var(--surface-raised)'}
                strokeWidth={2}
                strokeDasharray={substituido ? '3 2' : undefined}
              />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700"
                fill={substituido ? 'var(--text-muted)' : 'oklch(0.99 0 0)'}>
                {num(p.adr.id)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[0.78rem] leading-relaxed text-muted">
        As decisões por ordem de data, coloridas pela área que tocam. Repara em que as decisões de
        modelo e de RAG vêm quase todas antes das de orquestração e de produção: no «Balcão», como em
        qualquer sistema LLM, o que se decide sobre o modelo, os embeddings e o esquema dos dados fecha
        portas a tudo o que vem depois.
      </figcaption>
    </figure>
  );
}

/* ==================================================================== mapa */

function Mapa({ lista, onAbrir, aberto }: { lista: Adr[]; onAbrir: (id: string) => void; aberto: string | null }) {
  const areas = useMemo(() => ordenarAreas(ADR_AREAS), []);

  const W = 1000;
  const PAD_X = 40;
  const BANDA = 104;
  const TOPO = 40;
  const H = TOPO + areas.length * BANDA + 16;

  const visiveis = new Set(lista.map((a) => a.id));

  const pos = new Map<string, { x: number; y: number; adr: Adr }>();
  areas.forEach((area, b) => {
    const daArea = ADRS.filter((a) => a.area === area).sort((x, y) => x.number - y.number);
    const util = W - PAD_X * 2;
    daArea.forEach((a, i) => {
      const x = PAD_X + ((i + 0.5) * util) / daArea.length;
      const y = TOPO + b * BANDA + 52 + (i % 2 === 0 ? 0 : 26);
      pos.set(a.id, { x, y, adr: a });
    });
  });

  const ligacoes: { a: string; b: string }[] = [];
  const vistas = new Set<string>();
  for (const a of ADRS) {
    for (const r of a.related ?? []) {
      if (!pos.has(r)) continue;
      const chave = [a.id, r].sort().join('|');
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      ligacoes.push({ a: a.id, b: r });
    }
  }

  return (
    <figure className="scrollbar-thin overflow-x-auto rounded-2xl border border-soft surface-sunken p-3 sm:p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[34rem]" role="img"
        aria-label={`Mapa das ${ADRS.length} decisões agrupadas por área, com as ligações entre decisões relacionadas`}>
        {areas.map((area, b) => (
          <g key={area}>
            <rect x={12} y={TOPO + b * BANDA + 4} width={W - 24} height={BANDA - 12} rx={14}
              fill="var(--surface-raised)" stroke="var(--border-soft)" />
            <text x={26} y={TOPO + b * BANDA + 28} fontSize="14" fontWeight="700" fill={corDaArea(area)}>
              {area}
            </text>
            <text x={W - 26} y={TOPO + b * BANDA + 28} textAnchor="end" fontSize="13" fill="var(--text-muted)">
              {ADRS.filter((a) => a.area === area).length} decisões
            </text>
          </g>
        ))}

        {ligacoes.map((l) => {
          const p = pos.get(l.a);
          const q = pos.get(l.b);
          if (!p || !q) return null;
          const destacada = aberto === l.a || aberto === l.b;
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2 - Math.min(70, Math.abs(p.x - q.x) / 3 + 18);
          return (
            <path
              key={`${l.a}|${l.b}`}
              d={`M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`}
              fill="none"
              stroke={destacada ? 'var(--color-brand-500)' : 'var(--border-soft)'}
              strokeWidth={destacada ? 2 : 1}
              opacity={destacada ? 0.95 : 0.55}
            />
          );
        })}

        {[...pos.values()].map(({ x, y, adr }) => {
          const dentro = visiveis.has(adr.id);
          const activo = aberto === adr.id;
          return (
            <g key={adr.id} className="cursor-pointer" onClick={() => onAbrir(adr.id)}>
              <title>{`ADR ${num(adr.id)} · ${adr.title}`}</title>
              <circle
                cx={x}
                cy={y}
                r={activo ? 16 : 13}
                fill={dentro ? corDaArea(adr.area) : 'var(--surface-sunken)'}
                stroke={activo ? 'var(--text-strong)' : dentro ? 'var(--surface-raised)' : 'var(--border-soft)'}
                strokeWidth={2}
                opacity={dentro ? 1 : 0.45}
              />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700"
                fill={dentro ? 'oklch(0.18 0.02 228)' : 'var(--text-muted)'}>
                {num(adr.id)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[0.78rem] leading-relaxed text-muted">
        Cada círculo é uma decisão, agrupada pela área que toca; cada arco é uma relação declarada entre
        duas decisões. Os nós apagados estão fora dos filtros actuais. Clica num nó para abrir a decisão na lista.
      </figcaption>
    </figure>
  );
}

/* =================================================================== página */

export function AdrPage() {
  const [params, setParams] = useSearchParams();
  const alvo = params.get('a');

  const [area, setArea] = useState('todas');
  const [estado, setEstado] = useState<'todos' | AdrStatus>('todos');
  const [q, setQ] = useState('');
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');
  const [copiado, setCopiado] = useState<'nao' | 'sim' | 'falhou'>('nao');

  const contagens = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of ADRS) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, []);

  const areas = useMemo(() => ordenarAreas(ADR_AREAS), []);

  const lista = useMemo(() => {
    const f = fold(q.trim());
    return ADRS.filter((a) => {
      if (area !== 'todas' && a.area !== area) return false;
      if (estado !== 'todos' && a.status !== estado) return false;
      if (!f) return true;
      return fold(`${a.title} ${a.context} ${a.decision}`).includes(f);
    }).sort((a, b) => a.number - b.number);
  }, [area, estado, q]);

  const abrir = (id: string) => {
    setParams({ a: id }, { replace: true });
    setVista('lista');
  };

  useEffect(() => {
    if (!alvo) return;
    const el = typeof document === 'undefined' ? null : document.getElementById(`adr-${alvo}`);
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [alvo, vista, lista]);

  const exportar = async () => {
    const texto = [
      '# Registo de decisões — «Balcão»',
      '',
      `${lista.length} de ${ADRS.length} decisões (filtros: área ${area}, estado ${estado}${q.trim() ? `, pesquisa «${q.trim()}»` : ''}).`,
      '',
      '---',
      '',
      ...lista.map(paraMarkdown),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado('sim');
    } catch {
      setCopiado('falhou');
    }
    setTimeout(() => setCopiado('nao'), 2400);
  };

  const substituido = ADRS.find((a) => a.status === 'substituido');
  const substituto = ADRS.find((a) => a.supersedes && substituido && a.supersedes === substituido.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow mb-1">O projecto · ADR</p>
        <h1 className="text-2xl font-black sm:text-3xl">Decisões do «Balcão»</h1>
        <p className="mt-3 max-w-3xl text-[0.97rem] leading-relaxed">
          Um ADR é o registo curto de uma decisão que custa caro reverter: o contexto numérico que a
          provocou, as opções que estiveram em cima da mesa, o que se escolheu e o que isso passou a doer.
          Num sistema LLM, quase todas as decisões que interessam são destas — RAG ou fine-tuning, que base
          vectorial, como partir os documentos, agente livre ou grafo, o que se autoriza sem humano e o que
          bloqueia um deploy.
        </p>
        <p className="mt-2 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
          As {ADRS.length} decisões do «Balcão», por ordem.
          {substituido && substituto && (
            <> O par <strong className="text-strong">ADR {num(substituido.id)} → ADR {num(substituto.id)}</strong> está
            aqui de propósito: a decisão antiga não se apaga quando deixa de valer, porque o valor do registo
            está em mostrar com que informação nova é que a equipa mudou de ideias.</>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {ESTADOS.filter((e) => contagens[e]).map((e) => (
            <span key={e} className={`chip ${ADR_ESTADO[e].cls}`}>
              {ADR_ESTADO[e].label} <span className="font-mono">{contagens[e]}</span>
            </span>
          ))}
        </div>
      </header>

      <section aria-labelledby="tempo-t" className="mt-8">
        <h2 id="tempo-t" className="mb-3 text-lg font-bold">Linha do tempo</h2>
        <LinhaDoTempo onAbrir={abrir} aberto={alvo} />
      </section>

      <section aria-labelledby="reg-t" className="mt-10">
        <h2 id="reg-t" className="mb-3 text-lg font-bold">O registo</h2>

        <div className="space-y-3 rounded-2xl border border-soft surface-sunken p-3.5">
          <div>
            <label htmlFor="adr-q" className="mb-1 block text-[0.7rem] font-bold tracking-widest text-muted uppercase">
              Pesquisar no título, contexto e decisão
            </label>
            <input
              id="adr-q"
              className="field"
              placeholder="poisson, pinball, conformal, point-in-time…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <div>
              <p className="mb-1 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Área</p>
              <div className="flex flex-wrap gap-1.5">
                {['todas', ...areas].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArea(a)}
                    aria-pressed={area === a}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      area === a
                        ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                        : 'surface text-muted hover:text-strong'
                    }`}
                  >
                    {a}{' '}
                    <span className="font-mono opacity-70">
                      {a === 'todas' ? ADRS.length : ADRS.filter((x) => x.area === a).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[0.7rem] font-bold tracking-widest text-muted uppercase">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {(['todos', ...ESTADOS.filter((e) => contagens[e])] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstado(e)}
                    aria-pressed={estado === e}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      estado === e
                        ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                        : 'surface text-muted hover:text-strong'
                    }`}
                  >
                    {e === 'todos' ? 'todos' : ADR_ESTADO[e].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-soft pt-3">
            <div role="group" aria-label="Vista do registo" className="flex gap-1.5">
              {(['lista', 'mapa'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  aria-pressed={vista === v}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    vista === v
                      ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                      : 'surface text-muted hover:text-strong'
                  }`}
                >
                  {v === 'lista' ? 'Lista' : 'Mapa'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(area !== 'todas' || estado !== 'todos' || q.trim() !== '') && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setArea('todas'); setEstado('todos'); setQ(''); }}>
                  Limpar filtros
                </button>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={exportar} disabled={lista.length === 0}>
                {copiado === 'sim' ? '✓ Copiado' : `Exportar ${lista.length} como Markdown`}
              </button>
            </div>
          </div>

          {copiado === 'falhou' && (
            <p className="text-[0.78rem] text-muted">
              A área de transferência não está disponível neste contexto — o Markdown não foi copiado.
            </p>
          )}
        </div>

        <p className="mt-4 mb-3 text-[0.85rem] text-muted">
          {lista.length} de {ADRS.length} decisões.
        </p>

        {vista === 'mapa' ? (
          <Mapa lista={lista} onAbrir={abrir} aberto={alvo} />
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma decisão corresponde a estes filtros.</p>
        ) : (
          <div>
            {lista.map((a) => (
              <div key={a.id} id={`adr-${a.id}`} className="scroll-mt-24">
                <AdrCard key={`${a.id}-${alvo === a.id}`} adr={a} compact aberto={alvo === a.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-10 flex flex-wrap gap-2 border-t border-soft pt-6">
        <Link to="/desenho" className="btn btn-ghost btn-sm">Ver o desenho</Link>
        <Link to="/projecto" className="btn btn-ghost btn-sm">Ver o projecto</Link>
        <Link to="/repositorio" className="btn btn-ghost btn-sm">Ver o código do laboratório</Link>
      </footer>
    </div>
  );
}
