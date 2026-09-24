import { useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Frame, Field, Slider, Toggle, Stat, Segmented } from './shared';
import { SNAPSHOT } from '../../data/snapshot';
import type { SnapshotChunk } from '../../data/snapshot';
import {
  DOC_DE, embed, indices, pca2d, projectar, normalizar, radicais, estimarTokens, custoMzn,
  gerarPontos, construirHnsw, pesquisarHnsw, knnExacto, recallAnn, construirIvf, pesquisarIvf, criarRng,
  chunkar, chunkarCorpus, intervalosDePalavras, recuperar, docsUnicos, recallAtK, mrr, rrf,
  montarPromptRag, responderExtractivo, SINONIMOS, palavras,
} from './logica';
import type { Estrategia, Metodo, Resultado } from './logica';

/* ═══════════════════════════════════════════════════════════════════════════
   RAG — seis widgets da parte 2: o espaço de embeddings, os índices ANN, o
   chunking, o pipeline de ponta a ponta, a fusão RRF e a reescrita de
   consulta. Tudo o que é pesquisa corre na porta TypeScript do `balcao`
   (`logica.ts`), que dá os mesmos rankings do snapshot; os rankings das 30
   perguntas douradas vêm do snapshot.
   ═══════════════════════════════════════════════════════════════════════════ */

const nf0 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf4 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pct = (x: number, casas = 0) => `${(x * 100).toFixed(casas).replace('.', ',')}%`;

const CHUNKS = SNAPSHOT.chunks.recursivo;
const CHUNK_DE: Record<string, SnapshotChunk> = Object.fromEntries(CHUNKS.map((c) => [c.id, c]));
const PERGUNTAS = SNAPSHOT.perguntas;

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

const CHIP_REL = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
const CHIP_MAU = 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
const CHIP_NEUTRO = 'surface-sunken text-muted';

function Ilustrativo({ children = 'ilustrativo' }: { children?: ReactNode }) {
  return <Chip className="bg-accent-500/15 text-accent-800 dark:text-accent-300">{children}</Chip>;
}

/** O chunk pode ser mostrado a um cliente? (vigente e público) */
function citavel(doc: string): boolean {
  const d = DOC_DE[doc];
  return !!d && d.vigente && d.publico === 'cliente';
}

function motivoFiltro(doc: string): string | null {
  const d = DOC_DE[doc];
  if (!d) return 'desconhecido';
  if (!d.vigente) return 'substituído';
  if (d.publico !== 'cliente') return 'interno';
  return null;
}

/* Grupos de categorias, para colorir o espaço de embeddings. */
const GRUPOS: { id: string; nome: string; cor: string; cats: string[] }[] = [
  { id: 'reemb', nome: 'Reembolsos, atrasos, cupões', cor: 'oklch(0.62 0.17 295)', cats: ['reembolsos', 'atrasos', 'cupoes', 'cancelamentos'] },
  { id: 'prob', nome: 'Problemas no pedido', cor: 'oklch(0.65 0.18 28)', cats: ['problemas-pedido', 'qualidade', 'seguranca-alimentar'] },
  { id: 'pag', nome: 'Pagamentos', cor: 'oklch(0.66 0.15 150)', cats: ['pagamentos'] },
  { id: 'taxas', nome: 'Taxas e subscrição', cor: 'oklch(0.74 0.15 75)', cats: ['taxas', 'subscricao'] },
  { id: 'entr', nome: 'Entregas e pedidos', cor: 'oklch(0.63 0.14 240)', cats: ['entregas', 'pedidos'] },
  { id: 'conta', nome: 'Conta e segurança', cor: 'oklch(0.64 0.16 345)', cats: ['conta', 'seguranca'] },
  { id: 'farm', nome: 'Farmácia e restrições', cor: 'oklch(0.68 0.12 195)', cats: ['farmacia', 'restricoes'] },
  { id: 'int', nome: 'Procedimentos internos', cor: 'oklch(0.58 0.03 280)', cats: ['procedimentos'] },
];

function grupoDoc(doc: string) {
  const cat = DOC_DE[doc]?.categoria ?? '';
  return GRUPOS.find((g) => g.cats.includes(cat)) ?? GRUPOS[GRUPOS.length - 1];
}

/* ═════════════════════════════════════════════════════════ 1. Embeddings2d */

export function Embeddings2d() {
  const [sel, setSel] = useState<string>('g24');
  const [hover, setHover] = useState<string | null>(null);
  const [texto, setTexto] = useState('o estafeta não tinha troco para 2000');
  const [consulta, setConsulta] = useState<string | null>(null);

  const proj = SNAPSHOT.projeccao;
  const pca = useMemo(() => pca2d([...CHUNKS.map((c) => embed(c.texto)), ...PERGUNTAS.map((p) => embed(p.pergunta))]), []);
  const variancia = useMemo(() => {
    let tot = 0;
    for (const v of [...CHUNKS.map((c) => embed(c.texto)), ...PERGUNTAS.map((p) => embed(p.pergunta))]) for (let j = 0; j < v.length; j++) tot += (v[j] - pca.media[j]) ** 2;
    const exp = pca.pontos.reduce((a, [x, y]) => a + x * x + y * y, 0);
    return tot > 0 ? exp / tot : 0;
  }, [pca]);

  const novo = useMemo(() => {
    if (!consulta?.trim()) return null;
    const v = embed(consulta);
    return { xy: projectar(pca, v), viz: indices().denso.procurarVector(v, 5) };
  }, [consulta, pca]);

  const xs = [...proj.chunks.map((c) => c[1]), ...proj.perguntas.map((p) => p[1]), ...(novo ? [novo.xy[0]] : [])];
  const ys = [...proj.chunks.map((c) => c[2]), ...proj.perguntas.map((p) => p[2]), ...(novo ? [novo.xy[1]] : [])];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const W = 600;
  const H = 420;
  const P = 24;
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const posChunk = Object.fromEntries(proj.chunks.map(([id, x, y]) => [id, [sx(x), sy(y)] as [number, number]]));
  const posPerg = Object.fromEntries(proj.perguntas.map(([id, x, y]) => [id, [sx(x), sy(y)] as [number, number]]));

  const pergSel = PERGUNTAS.find((p) => p.id === sel) ?? null;
  const vizinhos = sel ? SNAPSHOT.rankings[sel].denso.slice(0, 5) : [];
  const vizIds = new Set([...vizinhos.map((l) => l[0]), ...(novo ? novo.viz.map((r) => r.chunk.id) : [])]);
  const foco = !!pergSel || !!novo;

  const infoHover = hover
    ? hover.startsWith('g')
      ? { titulo: `Pergunta ${hover}`, texto: PERGUNTAS.find((p) => p.id === hover)?.pergunta ?? '' }
      : { titulo: `${hover} · ${DOC_DE[CHUNK_DE[hover]?.doc]?.titulo ?? ''}`, texto: CHUNK_DE[hover]?.texto ?? '' }
    : null;

  return (
    <Frame
      title="Espaço de embeddings"
      hint={`Os 46 chunks recursivos e as 30 perguntas douradas, com o embedding didáctico do \`balcao\` (hashing de radicais e trigramas, 256 dimensões) projectado em 2D por PCA. Os dois eixos explicam só ${pct(variancia)} da variância: dois pontos próximos no desenho podem estar longe em 256 dimensões. Os vizinhos são sempre calculados por cosseno no espaço original, nunca no desenho.`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Pergunta dourada">
          <select className="field" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">— nenhuma —</option>
            {PERGUNTAS.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.pergunta}</option>)}
          </select>
        </Field>
        <form
          onSubmit={(e) => { e.preventDefault(); setConsulta(texto); }}
          className="flex items-end gap-2"
        >
          <Field label="Pergunta nova (embedding calculado aqui)">
            <input className="field" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary btn-sm mb-0.5">Projectar</button>
        </form>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-soft surface-sunken">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Projecção 2D dos chunks e das perguntas">
          {pergSel && vizinhos.map(([cid], i) => {
            const a = posPerg[pergSel.id];
            const b = posChunk[cid];
            return b ? <line key={cid} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--color-brand-500)" strokeWidth={3.2 - i * 0.5} strokeOpacity={0.75} /> : null;
          })}
          {novo && novo.viz.map((r, i) => {
            const b = posChunk[r.chunk.id];
            return b ? <line key={r.chunk.id} x1={sx(novo.xy[0])} y1={sy(novo.xy[1])} x2={b[0]} y2={b[1]} stroke="var(--color-accent-500)" strokeWidth={3.2 - i * 0.5} strokeDasharray="5 3" /> : null;
          })}
          {proj.chunks.map(([id]) => {
            const [cx, cy] = posChunk[id];
            const c = CHUNK_DE[id];
            const g = grupoDoc(c.doc);
            const rel = pergSel?.relevantes.includes(c.doc);
            const dim = foco && !vizIds.has(id) && !rel;
            return (
              <g key={id} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }} opacity={dim ? 0.28 : 1}>
                {rel && <circle cx={cx} cy={cy} r={10} fill="none" stroke="oklch(0.62 0.15 150)" strokeWidth={2} />}
                <circle cx={cx} cy={cy} r={hover === id ? 8 : 5.5} fill={g.cor} stroke="var(--surface-raised)" strokeWidth={1.2} />
              </g>
            );
          })}
          {proj.perguntas.map(([id]) => {
            const [cx, cy] = posPerg[id];
            const on = id === sel;
            const s = on ? 8 : 5;
            return (
              <g key={id} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} onClick={() => setSel(on ? '' : id)} style={{ cursor: 'pointer' }} opacity={foco && !on ? 0.4 : 1}>
                <rect x={cx - s} y={cy - s} width={2 * s} height={2 * s} transform={`rotate(45 ${cx} ${cy})`} fill={on ? 'var(--color-brand-600)' : 'var(--surface-raised)'} stroke="var(--color-brand-600)" strokeWidth={1.6} />
                {on && <text x={cx + 11} y={cy - 9} fontSize={12} fontWeight={700} fill="var(--text-strong)">{id}</text>}
              </g>
            );
          })}
          {novo && (
            <g>
              <circle cx={sx(novo.xy[0])} cy={sy(novo.xy[1])} r={11} fill="var(--color-accent-500)" opacity={0.25} className="animate-ring" style={{ transformOrigin: `${sx(novo.xy[0])}px ${sy(novo.xy[1])}px` }} />
              <path d={`M${sx(novo.xy[0])},${sy(novo.xy[1]) - 9} L${sx(novo.xy[0]) + 3},${sy(novo.xy[1]) - 3} L${sx(novo.xy[0]) + 9},${sy(novo.xy[1])} L${sx(novo.xy[0]) + 3},${sy(novo.xy[1]) + 3} L${sx(novo.xy[0])},${sy(novo.xy[1]) + 9} L${sx(novo.xy[0]) - 3},${sy(novo.xy[1]) + 3} L${sx(novo.xy[0]) - 9},${sy(novo.xy[1])} L${sx(novo.xy[0]) - 3},${sy(novo.xy[1]) - 3} Z`} fill="var(--color-accent-500)" stroke="var(--surface-raised)" />
            </g>
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {GRUPOS.map((g) => <span key={g.id} className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: g.cor }} />{g.nome}</span>)}
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rotate-45 border border-brand-600" />pergunta</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full border-2 border-emerald-600" />relevante (golden set)</span>
      </div>

      <div className="mt-3 min-h-16 rounded-xl border border-soft px-3 py-2 text-sm" aria-live="polite">
        {infoHover ? (
          <>
            <p className="text-xs font-bold text-strong">{infoHover.titulo}</p>
            <p className="mt-0.5 text-body">{infoHover.texto}</p>
          </>
        ) : (
          <p className="text-muted">Passa o rato por um ponto para ver o texto; clica num losango para escolher a pergunta.</p>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {pergSel && (
          <div className="rounded-xl border border-soft p-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Top-5 por cosseno · {pergSel.id}</p>
            <p className="mt-1 text-sm text-strong">«{pergSel.pergunta}»</p>
            <ol className="mt-2 space-y-1 text-sm">
              {vizinhos.map(([cid, doc, s], i) => (
                <li key={cid} className="flex items-center gap-2">
                  <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
                  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: grupoDoc(doc).cor }} />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-body">{cid}</span>
                  {pergSel.relevantes.includes(doc) && <Chip className={CHIP_REL}>relevante</Chip>}
                  <span className="font-mono text-xs text-strong">{nf3.format(s)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {novo && consulta && (
          <div className="rounded-xl border border-accent-500/40 p-3">
            <p className="text-xs font-bold tracking-wide text-accent-800 uppercase dark:text-accent-300">Vizinhos da pergunta nova</p>
            <p className="mt-1 text-sm text-strong">«{consulta}»</p>
            <p className="mt-0.5 font-mono text-[0.7rem] text-muted">radicais: {radicais(consulta).join(' · ') || '—'}</p>
            <ol className="mt-2 space-y-1 text-sm">
              {novo.viz.map((r, i) => (
                <li key={r.chunk.id} className="flex items-center gap-2">
                  <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
                  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: grupoDoc(r.chunk.doc).cor }} />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-body" title={r.chunk.texto}>{r.chunk.id}</span>
                  <span className="font-mono text-xs text-strong">{nf3.format(r.score)}</span>
                </li>
              ))}
            </ol>
            {novo.viz[0] && novo.viz[0].score < 0.2 && <p className="mt-2 text-xs text-muted">Cosseno baixo em todos: este embedding só «conhece» os radicais e os sinónimos da tabela. Um modelo neuronal generalizava melhor — e também se enganava com mais confiança.</p>}
          </div>
        )}
      </div>
    </Frame>
  );
}

/* ═════════════════════════════════════════════════════════════ 2. HnswLab */

const PONTOS = gerarPontos(40, 11);
const CONSULTAS_TESTE = (() => {
  const r = criarRng(99);
  return Array.from({ length: 30 }, () => ({ x: 0.05 + 0.9 * r(), y: 0.05 + 0.9 * r() }));
})();
const K_ANN = 5;
const CORES_CAMADA = ['oklch(0.66 0.15 150)', 'var(--color-brand-500)', 'var(--color-accent-500)', 'oklch(0.65 0.18 28)', 'oklch(0.63 0.14 240)'];
const CORES_LISTA = ['oklch(0.62 0.17 295)', 'oklch(0.65 0.18 28)', 'oklch(0.66 0.15 150)', 'oklch(0.74 0.15 75)', 'oklch(0.63 0.14 240)', 'oklch(0.64 0.16 345)', 'oklch(0.68 0.12 195)', 'oklch(0.58 0.03 280)', 'oklch(0.7 0.15 110)', 'oklch(0.55 0.12 260)'];

const VW = 400;
const px = (v: number) => 16 + v * (VW - 32);

/** Pequeno gráfico de linhas: recall (0..1) e fracção de comparações (0..1) em função de um parâmetro. */
function CurvaTroca({ pontos, atual, rotuloX }: { pontos: { x: number; recall: number; custo: number }[]; atual: number; rotuloX: string }) {
  const W = 320;
  const H = 130;
  const xs = pontos.map((p) => p.x);
  const [a, b] = [Math.min(...xs), Math.max(...xs)];
  const gx = (x: number) => 30 + ((x - a) / (b - a || 1)) * (W - 45);
  const gy = (y: number) => H - 22 - y * (H - 35);
  const linha = (f: (p: { recall: number; custo: number }) => number) => pontos.map((p, i) => `${i ? 'L' : 'M'}${gx(p.x).toFixed(1)},${gy(f(p)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Recall e comparações em função de ${rotuloX}`}>
      {[0, 0.5, 1].map((y) => (
        <g key={y}>
          <line x1={30} x2={W - 15} y1={gy(y)} y2={gy(y)} stroke="var(--border-soft)" strokeDasharray={y ? '2 3' : undefined} />
          <text x={25} y={gy(y) + 3} fontSize={9} textAnchor="end" fill="var(--text-muted)">{y * 100}%</text>
        </g>
      ))}
      <line x1={gx(atual)} x2={gx(atual)} y1={10} y2={H - 22} stroke="var(--text-muted)" strokeDasharray="3 3" />
      <path d={linha((p) => p.custo)} fill="none" stroke="var(--color-accent-500)" strokeWidth={2} />
      <path d={linha((p) => p.recall)} fill="none" stroke="var(--color-brand-500)" strokeWidth={2.5} />
      {pontos.map((p) => <circle key={p.x} cx={gx(p.x)} cy={gy(p.recall)} r={p.x === atual ? 4 : 2} fill="var(--color-brand-500)" />)}
      <text x={W - 15} y={H - 6} fontSize={9} textAnchor="end" fill="var(--text-muted)">{rotuloX} →</text>
      <text x={34} y={12} fontSize={9} fill="var(--color-brand-600)">recall@5</text>
      <text x={110} y={12} fontSize={9} fill="var(--color-accent-600)">comparações / 40</text>
    </svg>
  );
}

export function HnswLab() {
  const [aba, setAba] = useState<'hnsw' | 'ivf'>('hnsw');
  const [q, setQ] = useState({ x: 0.52, y: 0.47 });
  const [M, setM] = useState(3);
  const [efC, setEfC] = useState(8);
  const [efS, setEfS] = useState(6);
  const [camadaVista, setCamadaVista] = useState(0);
  const [passo, setPasso] = useState<number | null>(null);
  const [nListas, setNListas] = useState(6);
  const [nSondas, setNSondas] = useState(1);

  const h = useMemo(() => construirHnsw(PONTOS, M, efC), [M, efC]);
  const res = useMemo(() => pesquisarHnsw(h, q, K_ANN, efS), [h, q, efS]);
  const exacto = useMemo(() => knnExacto(PONTOS, q, K_ANN), [q]);
  const varrimentoHnsw = useMemo(() => [1, 2, 3, 4, 6, 8, 12, 16, 24].map((ef) => {
    let r = 0;
    let c = 0;
    for (const t of CONSULTAS_TESTE) {
      const o = pesquisarHnsw(h, t, K_ANN, ef);
      r += recallAnn(o.resultados, knnExacto(PONTOS, t, K_ANN));
      c += o.distancias;
    }
    return { x: ef, recall: r / CONSULTAS_TESTE.length, custo: c / CONSULTAS_TESTE.length / PONTOS.length };
  }), [h]);

  const ivf = useMemo(() => construirIvf(PONTOS, nListas), [nListas]);
  const sondas = Math.min(nSondas, nListas);
  const resIvf = useMemo(() => pesquisarIvf(ivf, PONTOS, q, K_ANN, sondas), [ivf, q, sondas]);
  const varrimentoIvf = useMemo(() => Array.from({ length: nListas }, (_, i) => i + 1).map((ns) => {
    let r = 0;
    let c = 0;
    for (const t of CONSULTAS_TESTE) {
      const o = pesquisarIvf(ivf, PONTOS, t, K_ANN, ns);
      r += recallAnn(o.resultados, knnExacto(PONTOS, t, K_ANN));
      c += o.comparacoes;
    }
    return { x: ns, recall: r / CONSULTAS_TESTE.length, custo: Math.min(1, c / CONSULTAS_TESTE.length / PONTOS.length) };
  }), [ivf, nListas]);

  const nCamadas = h.camadas.length;
  const camada = Math.min(camadaVista, nCamadas - 1);
  const visiveis = passo === null ? res.passos : res.passos.slice(0, passo + 1);
  const passoAtual = passo === null ? null : res.passos[passo];
  const visitadosAte = new Set(visiveis.flatMap((p) => p.visitados));
  const final = passo === null || passo === res.passos.length - 1;

  const clicar = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * VW - 16) / (VW - 32);
    const y = 1 - (((e.clientY - r.top) / r.height) * VW - 16) / (VW - 32);
    setQ({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
    setPasso(null);
  };
  const py = (v: number) => VW - px(v);
  const consultaSvg = (
    <g aria-hidden>
      <line x1={px(q.x) - 8} y1={py(q.y)} x2={px(q.x) + 8} y2={py(q.y)} stroke="var(--text-strong)" strokeWidth={2.5} />
      <line x1={px(q.x)} y1={py(q.y) - 8} x2={px(q.x)} y2={py(q.y) + 8} stroke="var(--text-strong)" strokeWidth={2.5} />
    </g>
  );

  return (
    <Frame
      title="HNSW e IVF por dentro"
      hint="40 pontos em 2D (distância euclidiana) em vez de 1 870 vectores de 768 dimensões: a mecânica é a mesma, o desenho é que é possível. Clica no gráfico para mudar a consulta. No pgvector os valores por omissão são `m = 16`, `ef_construction = 64` e `hnsw.ef_search = 40` (HNSW), e `ivfflat.probes = 1` (IVF)."
      aside={<Segmented value={aba} onChange={setAba} options={[{ value: 'hnsw', label: 'HNSW' }, { value: 'ivf', label: 'IVF' }]} />}
    >
      {aba === 'hnsw' ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <svg viewBox={`0 0 ${VW} ${VW}`} className="block w-full cursor-crosshair rounded-xl border border-soft surface-sunken" onClick={clicar} role="img" aria-label="Grafo HNSW e percurso da pesquisa">
              {[...(h.camadas[camada]?.entries() ?? [])].flatMap(([a, vs]) => vs.filter((b) => a < b || !(h.camadas[camada].get(b) ?? []).includes(a)).map((b) => (
                <line key={`${a}-${b}`} x1={px(PONTOS[a].x)} y1={py(PONTOS[a].y)} x2={px(PONTOS[b].x)} y2={py(PONTOS[b].y)} stroke={CORES_CAMADA[camada]} strokeOpacity={0.3} strokeWidth={camada ? 1.6 : 1} />
              )))}
              {visiveis.map((p) => p.caminho.slice(1).map((b, i) => {
                const a = p.caminho[i];
                return <line key={`${p.camada}-${a}-${b}`} x1={px(PONTOS[a].x)} y1={py(PONTOS[a].y)} x2={px(PONTOS[b].x)} y2={py(PONTOS[b].y)} stroke={CORES_CAMADA[p.camada]} strokeWidth={p.camada === 0 ? 2 : 3.2} strokeLinecap="round" markerEnd="" opacity={0.95} />;
              }))}
              {PONTOS.map((p) => {
                const lv = h.nivel[p.id];
                const vis = visitadosAte.has(p.id);
                const nosRes = final && res.resultados.includes(p.id);
                const noExacto = exacto.includes(p.id);
                return (
                  <g key={p.id}>
                    {noExacto && <circle cx={px(p.x)} cy={py(p.y)} r={12} fill="none" stroke="var(--text-muted)" strokeDasharray="2 2" />}
                    {Array.from({ length: lv }, (_, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r={6 + 2.6 * (i + 1)} fill="none" stroke={CORES_CAMADA[i + 1]} strokeWidth={1.4} />)}
                    <circle cx={px(p.x)} cy={py(p.y)} r={nosRes ? 6.5 : 5} fill={nosRes ? 'oklch(0.66 0.15 150)' : vis ? 'var(--color-accent-500)' : 'var(--surface-raised)'} stroke="var(--text-muted)" strokeWidth={1} />
                  </g>
                );
              })}
              {consultaSvg}
            </svg>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-accent-500" />distância calculada</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: 'oklch(0.66 0.15 150)' }} />resultado HNSW</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-full border border-dashed border-[var(--text-muted)]" />5 vizinhos exactos</span>
              {Array.from({ length: nCamadas - 1 }, (_, i) => <span key={i} className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-full border-2" style={{ borderColor: CORES_CAMADA[i + 1] }} />nó na camada {i + 1}</span>)}
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Field label={`M (vizinhos por nó): ${M}`}><Slider value={M} onChange={(v) => { setM(v); setPasso(null); }} min={2} max={8} /></Field>
              <Field label={`ef_construction: ${efC}`}><Slider value={efC} onChange={(v) => { setEfC(v); setPasso(null); }} min={2} max={40} /></Field>
              <Field label={`ef_search: ${efS}${efS < K_ANN ? ` (< k = ${K_ANN}: devolve só ${efS})` : ''}`}><Slider value={efS} onChange={(v) => { setEfS(v); setPasso(null); }} min={1} max={24} /></Field>
            </div>
            <Field label="Arestas a mostrar">
              <Segmented value={String(camada)} onChange={(v) => setCamadaVista(Number(v))} options={Array.from({ length: nCamadas }, (_, i) => ({ value: String(nCamadas - 1 - i), label: `camada ${nCamadas - 1 - i} · ${h.camadas[nCamadas - 1 - i].size} nós` }))} />
            </Field>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasso(0)}>Do início</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={passo === null || passo === 0} onClick={() => setPasso((p) => Math.max(0, (p ?? 0) - 1))}>Anterior</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={passo === null || passo >= res.passos.length - 1} onClick={() => setPasso((p) => Math.min(res.passos.length - 1, (p ?? 0) + 1))}>Camada seguinte</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasso(null)}>Tudo</button>
            </div>
            <div className="rounded-xl border border-soft surface-sunken p-3 text-sm text-body" aria-live="polite">
              {passoAtual ? (
                <p>
                  <b className="text-strong">Camada {passoAtual.camada}</b>:{' '}
                  {passoAtual.camada > 0
                    ? `greedy a partir do nó ${passoAtual.caminho[0]} — salta para o vizinho mais perto da consulta enquanto houver um, ${passoAtual.caminho.length - 1} salto(s), ${passoAtual.visitados.length} distâncias. O último nó é a entrada da camada de baixo.`
                    : `pesquisa em feixe com ef_search = ${efS} candidatos a partir do nó ${passoAtual.caminho[0]}; ${passoAtual.visitados.length} distâncias calculadas nesta camada.`}
                </p>
              ) : (
                <p>A pesquisa entra no nó {h.entrada} (o de nível mais alto), desce greedy pelas camadas esparsas e só alarga a busca na camada 0. Carrega em «Do início» para ver camada a camada.</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Distâncias" value={`${res.distancias} / 40`} />
              <Stat label="Recall@5" value={pct(recallAnn(res.resultados, exacto))} tone={recallAnn(res.resultados, exacto) === 1 ? 'good' : 'warn'} />
              <Stat label="Camadas" value={String(nCamadas)} />
            </div>
            <figure className="rounded-xl border border-soft p-2">
              <CurvaTroca pontos={varrimentoHnsw} atual={[1, 2, 3, 4, 6, 8, 12, 16, 24].reduce((a, b) => (Math.abs(b - efS) < Math.abs(a - efS) ? b : a))} rotuloX="ef_search" />
              <figcaption className="text-xs text-muted">Média de 30 consultas: subir ef_search compra recall com mais distâncias calculadas. Com 40 pontos, a força bruta custa 40; com 1 870 vectores a diferença é a razão de existir do índice.</figcaption>
            </figure>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <svg viewBox={`0 0 ${VW} ${VW}`} className="block w-full cursor-crosshair rounded-xl border border-soft surface-sunken" onClick={clicar} role="img" aria-label="Células IVF e pesquisa">
              {resIvf.sondas.map((j) => (
                <circle key={`s${j}`} cx={px(ivf.centroides[j].x)} cy={py(ivf.centroides[j].y)} r={12} fill={CORES_LISTA[j % CORES_LISTA.length]} opacity={0.18} />
              ))}
              {PONTOS.map((p, i) => {
                const lista = ivf.atrib[i];
                const aberta = resIvf.sondas.includes(lista);
                const nosRes = resIvf.resultados.includes(p.id);
                return (
                  <g key={p.id} opacity={aberta ? 1 : 0.35}>
                    {exacto.includes(p.id) && <circle cx={px(p.x)} cy={py(p.y)} r={12} fill="none" stroke="var(--text-muted)" strokeDasharray="2 2" />}
                    <circle cx={px(p.x)} cy={py(p.y)} r={nosRes ? 7 : 5} fill={CORES_LISTA[lista % CORES_LISTA.length]} stroke={nosRes ? 'var(--text-strong)' : 'var(--surface-raised)'} strokeWidth={nosRes ? 2 : 1} />
                  </g>
                );
              })}
              {ivf.centroides.map((c, j) => (
                <g key={j} stroke={CORES_LISTA[j % CORES_LISTA.length]} strokeWidth={3}>
                  <line x1={px(c.x) - 7} y1={py(c.y) - 7} x2={px(c.x) + 7} y2={py(c.y) + 7} />
                  <line x1={px(c.x) - 7} y1={py(c.y) + 7} x2={px(c.x) + 7} y2={py(c.y) - 7} />
                </g>
              ))}
              {consultaSvg}
            </svg>
            <p className="mt-2 text-xs text-muted">As cruzes são os centróides (k-means); a cor de cada ponto é a lista a que pertence. As listas abertas pela consulta ficam a cheio.</p>
          </div>
          <div className="min-w-0 space-y-3">
            <Field label={`Listas (n_listas): ${nListas}`}><Slider value={nListas} onChange={(v) => { setNListas(v); setNSondas((s) => Math.min(s, v)); }} min={2} max={10} /></Field>
            <Field label={`Sondas (probes): ${sondas}`}><Slider value={sondas} onChange={setNSondas} min={1} max={nListas} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Comparações" value={`${resIvf.comparacoes}`} />
              <Stat label="Recall@5" value={pct(recallAnn(resIvf.resultados, exacto))} tone={recallAnn(resIvf.resultados, exacto) === 1 ? 'good' : 'warn'} />
              <Stat label="Candidatos" value={`${resIvf.candidatos.length} / 40`} />
            </div>
            <p className="text-sm text-body">
              Comparações = {ivf.centroides.length} centróides + {resIvf.candidatos.length} membros das listas abertas. Uma consulta perto da fronteira entre células perde vizinhos que estão na célula ao lado — é por isso que se abrem várias sondas.
            </p>
            <figure className="rounded-xl border border-soft p-2">
              <CurvaTroca pontos={varrimentoIvf} atual={sondas} rotuloX="sondas" />
              <figcaption className="text-xs text-muted">Média de 30 consultas. Com todas as sondas o IVF é uma pesquisa exacta mais cara do que a força bruta (compara também os centróides).</figcaption>
            </figure>
          </div>
        </div>
      )}
    </Frame>
  );
}

/* ══════════════════════════════════════════════════════════ 3. ChunkingLab */

const CORES_CHUNK = [
  'bg-violet-200/80 dark:bg-violet-500/30',
  'bg-amber-200/80 dark:bg-amber-500/30',
  'bg-emerald-200/80 dark:bg-emerald-500/30',
  'bg-sky-200/80 dark:bg-sky-500/30',
  'bg-rose-200/80 dark:bg-rose-500/30',
  'bg-lime-200/80 dark:bg-lime-500/30',
];

function cortes(c: string, i: number): { fim: boolean; inicio: boolean } {
  const t = c.trim();
  const fim = !/[.!?]["»)]?$/.test(t);
  const primeiro = t.charAt(0);
  const inicio = i > 0 && primeiro !== '' && primeiro === primeiro.toLowerCase() && primeiro !== primeiro.toUpperCase();
  return { fim, inicio };
}

export function ChunkingLab() {
  const [docId, setDocId] = useState('pol-reembolso');
  const [est, setEst] = useState<Estrategia>('fixo');
  const [tamanho, setTamanho] = useState(40);
  const [sobre, setSobre] = useState(8);
  const [maxFrases, setMaxFrases] = useState(3);
  const [maxPalavras, setMaxPalavras] = useState(80);
  const [foco, setFoco] = useState<number | null>(null);

  const doc = DOC_DE[docId];
  const sobreposicao = Math.min(sobre, tamanho - 1);
  const opts = useMemo(() => ({ tamanho, sobreposicao, maxFrases, maxPalavras }), [tamanho, sobreposicao, maxFrases, maxPalavras]);
  const chunks = useMemo(() => chunkar(doc.texto, est, opts), [doc, est, opts]);
  const intervalos = useMemo(() => intervalosDePalavras(chunks, est === 'fixo' ? tamanho - sobreposicao : undefined), [chunks, est, tamanho, sobreposicao]);
  const corpus = useMemo(() => chunkarCorpus(est, opts), [est, opts]);
  const aval = useMemo(() => {
    let rd = 0;
    let rh = 0;
    for (const p of PERGUNTAS) {
      rd += recallAtK(docsUnicos(recuperar(p.pergunta, 30, 'denso', null, corpus)), p.relevantes, 3);
      rh += recallAtK(docsUnicos(recuperar(p.pergunta, 30, 'hibrido', null, corpus)), p.relevantes, 3);
    }
    return { denso: rd / PERGUNTAS.length, hibrido: rh / PERGUNTAS.length };
  }, [corpus]);

  const tokensCorpus = corpus.reduce((a, c) => a + estimarTokens(c.texto), 0);
  const tokensOriginal = SNAPSHOT.documentos.reduce((a, d) => a + estimarTokens(d.texto), 0);
  const cortados = chunks.filter((c, i) => { const k = cortes(c, i); return k.fim || k.inicio; }).length;
  const tamanhos = chunks.map((c) => c.split(/\s+/).filter(Boolean).length);

  // Texto original, palavra a palavra, com o(s) chunk(s) que cobrem cada palavra.
  const pecas = useMemo(() => {
    const out: { t: string; w: number | null }[] = [];
    let w = 0;
    for (const s of doc.texto.split(/(\s+)/)) {
      if (!s) continue;
      if (/^\s+$/.test(s)) out.push({ t: s, w: null });
      else out.push({ t: s, w: w++ });
    }
    return out;
  }, [doc]);
  const donos = (w: number) => intervalos.map((iv, i) => (w >= iv[0] && w < iv[1] ? i : -1)).filter((i) => i >= 0);

  return (
    <Frame
      title="Laboratório de chunking"
      hint="Os chunkers são a porta de `balcao.chunk_fixo`, `chunk_frases` e `chunk_recursivo` (tamanhos em palavras). O recall@3 é calculado ao vivo sobre as 30 perguntas douradas, ao nível do documento, re-indexando o corpus inteiro com os parâmetros escolhidos — com o recursivo a 80 palavras dá os 0,900 (denso) e 0,933 (híbrido) do snapshot."
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Documento">
          <select className="field" value={docId} onChange={(e) => { setDocId(e.target.value); setFoco(null); }}>
            {SNAPSHOT.documentos.map((d) => <option key={d.id} value={d.id}>{d.titulo} ({d.id}, {d.texto.split(/\s+/).length} palavras)</option>)}
          </select>
        </Field>
        <Field label="Estratégia">
          <Segmented value={est} onChange={(v) => { setEst(v); setFoco(null); }} options={[{ value: 'fixo', label: 'fixo' }, { value: 'frases', label: 'frases' }, { value: 'recursivo', label: 'recursivo' }]} />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {est === 'fixo' && (
          <>
            <Field label={`Tamanho: ${tamanho} palavras`}><Slider value={tamanho} onChange={setTamanho} min={10} max={120} step={2} /></Field>
            <Field label={`Sobreposição: ${sobreposicao} palavras`}><Slider value={sobreposicao} onChange={setSobre} min={0} max={Math.max(0, tamanho - 1)} /></Field>
          </>
        )}
        {est === 'frases' && <Field label={`Frases por chunk: ${maxFrases}`}><Slider value={maxFrases} onChange={setMaxFrases} min={1} max={6} /></Field>}
        {est === 'recursivo' && <Field label={`Máximo de palavras: ${maxPalavras}`}><Slider value={maxPalavras} onChange={setMaxPalavras} min={10} max={150} step={5} /></Field>}
      </div>

      <div className="mt-4 rounded-xl border border-soft surface-sunken p-3 text-[0.92rem] leading-8 text-body">
        {pecas.map((p, i) => {
          if (p.w === null) return p.t.includes('\n\n') ? <span key={i} className="block h-3" /> : <span key={i}> </span>;
          const ds = donos(p.w);
          const c = ds[0] ?? -1;
          const sobreposta = ds.length > 1;
          const apagado = foco !== null && !ds.includes(foco);
          return (
            <span
              key={i}
              className={`rounded px-0.5 py-0.5 transition ${c >= 0 ? CORES_CHUNK[c % CORES_CHUNK.length] : ''} ${sobreposta ? 'underline decoration-2 decoration-[var(--color-accent-600)] underline-offset-4' : ''} ${apagado ? 'opacity-30' : ''}`}
              title={ds.length ? `chunk ${ds.map((d) => d + 1).join(' e ')}` : undefined}
            >
              {p.t}
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">Cada cor é um chunk; as palavras sublinhadas estão em dois chunks (sobreposição). Passa o rato pela lista para isolar um chunk.</p>

      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2" onMouseLeave={() => setFoco(null)}>
        {chunks.map((c, i) => {
          const k = cortes(c, i);
          return (
            <li key={i}>
              <button type="button" onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)} onClick={() => setFoco(foco === i ? null : i)} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${foco === i ? 'border-brand-500' : 'border-soft'}`}>
                <span className={`inline-block size-3 shrink-0 rounded ${CORES_CHUNK[i % CORES_CHUNK.length]}`} />
                <span className="font-mono text-strong">#{i}</span>
                <span className="text-muted">{tamanhos[i]} pal. · ≈ {estimarTokens(c)} tok</span>
                <span className="ml-auto flex gap-1">
                  {k.inicio && <Chip className={CHIP_MAU}>começa a meio</Chip>}
                  {k.fim && <Chip className={CHIP_MAU}>acaba a meio</Chip>}
                  {!k.inicio && !k.fim && <Chip className={CHIP_REL}>frases inteiras</Chip>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Chunks neste doc." value={`${chunks.length} · ${cortados} cortado${cortados === 1 ? '' : 's'}`} tone={cortados ? 'warn' : 'good'} />
        <Stat label="Chunks no corpus (40 doc.)" value={nf0.format(corpus.length)} />
        <Stat label="Tokens indexados" value={`${nf0.format(tokensCorpus)} (${tokensCorpus >= tokensOriginal ? '+' : ''}${pct(tokensCorpus / tokensOriginal - 1)})`} />
        <Stat label="Recall@3 denso · híbrido" value={`${nf3.format(aval.denso)} · ${nf3.format(aval.hibrido)}`} tone={aval.hibrido >= 0.93 ? 'good' : aval.hibrido >= 0.85 ? 'warn' : 'bad'} />
      </div>
      <p className="mt-2 text-xs text-muted">
        Chunks pequenos dão vectores mais «puros» mas perdem o contexto da frase ao lado; chunks grandes diluem o embedding e gastam contexto no prompt. A sobreposição remedeia os cortes do fixo à custa de indexar (e pagar) o mesmo texto duas vezes. Com 30 perguntas, diferenças de 0,03 no recall são uma pergunta — não conclusões.
      </p>
    </Frame>
  );
}

/* ═════════════════════════════════════════════════════════ 4. RagPipeline */

const METODOS: { value: Metodo; label: string }[] = [
  { value: 'bm25', label: 'BM25' },
  { value: 'denso', label: 'denso' },
  { value: 'hibrido', label: 'híbrido' },
  { value: 'rerank', label: 're-rank' },
];

function Passo({ n, titulo, tokens, children, tom = 'normal' }: { n: number; titulo: string; tokens?: string; children: ReactNode; tom?: 'normal' | 'bom' | 'mau' }) {
  const borda = tom === 'bom' ? 'border-emerald-500/50' : tom === 'mau' ? 'border-rose-500/50' : 'border-soft';
  return (
    <li className="relative pl-10">
      <span className="absolute top-0 left-0 grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.02_300)]">{n}</span>
      <div className={`rounded-xl border ${borda} p-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-strong">{titulo}</p>
          {tokens && <span className="font-mono text-xs text-muted">{tokens}</span>}
        </div>
        <div className="mt-1.5 text-sm text-body">{children}</div>
      </div>
    </li>
  );
}

export function RagPipeline() {
  const [pid, setPid] = useState('g02');
  const [livre, setLivre] = useState('Posso pagar com M-Pesa de outro número?');
  const [metodo, setMetodo] = useState<Metodo>('rerank');
  const [k, setK] = useState(3);
  const [filtrar, setFiltrar] = useState(true);
  const [limiar, setLimiar] = useState(0.3);

  const dourada = PERGUNTAS.find((p) => p.id === pid) ?? null;
  const pergunta = dourada ? dourada.pergunta : livre;
  const ranking: Resultado[] = useMemo(() => {
    if (dourada) return SNAPSHOT.rankings[dourada.id][metodo].map(([cid, , s]) => ({ chunk: CHUNK_DE[cid], score: s }));
    return pergunta.trim() ? recuperar(pergunta, 10, metodo) : [];
  }, [dourada, metodo, pergunta]);
  const removidos = filtrar ? ranking.filter((r) => !citavel(r.chunk.doc)) : [];
  const filtrado = filtrar ? ranking.filter((r) => citavel(r.chunk.doc)) : ranking;
  const topk = filtrado.slice(0, k);
  const msgs = montarPromptRag(pergunta, topk);
  const resp = useMemo(() => responderExtractivo(pergunta, topk, limiar), [pergunta, topk, limiar]);
  const v = useMemo(() => embed(pergunta), [pergunta]);

  const tokPergunta = estimarTokens(pergunta);
  const tokSistema = estimarTokens(msgs[0].content);
  const tokUser = estimarTokens(msgs[1].content);
  const tokResp = estimarTokens(resp.texto);
  const custo = custoMzn(tokSistema + tokUser, tokResp, 'medio');
  const rel = (doc: string) => !!dourada?.relevantes.includes(doc);

  let diag: { tom: 'bom' | 'mau' | 'normal'; texto: string } | null = null;
  if (dourada) {
    const recOk = topk.some((r) => rel(r.chunk.doc));
    const citOk = resp.usadas.some((u) => rel(u.fonte));
    if (resp.recusou) diag = recOk
      ? { tom: 'mau', texto: 'Recusa indevida: o documento certo estava no contexto, mas nenhuma frase passou o limiar de sobreposição. Baixar o limiar resolve esta e faz aparecer respostas inventadas noutras.' }
      : { tom: 'normal', texto: 'Recusa perante uma recuperação falhada: melhor do que inventar, mas a falha é da pesquisa, não do modelo.' };
    else if (!recOk) diag = { tom: 'mau', texto: `Falha de recuperação: nenhum documento relevante (${dourada.relevantes.join(', ')}) chegou ao top-${k}. A resposta cita uma fonte real e está errada — o pior tipo de erro, porque parece sustentado.` };
    else if (!citOk) diag = { tom: 'mau', texto: `Falha de geração: ${dourada.relevantes.join(', ')} estava no contexto, mas a frase escolhida veio de ${resp.usadas.map((u) => u.fonte).join(', ')}. Recall@k perfeito não garante resposta certa — mede-se a faithfulness e a correcção à parte.` };
    else diag = { tom: 'bom', texto: `Resposta sustentada: cita ${[...new Set(resp.usadas.map((u) => u.fonte))].join(', ')}, que é relevante para ${dourada.id}.` };
  }

  return (
    <Frame
      title="Pipeline RAG passo a passo"
      hint="Rankings das perguntas douradas do snapshot (`balcao.recuperar`, top-10, chunking recursivo); para uma pergunta tua, calculados ao vivo pela porta. A resposta é a do `ModeloSimulado` (extracção por sobreposição de radicais, com recusa abaixo do limiar) — mostra a forma do sistema, não o que um modelo real diria. Tokens pela estimativa de 3,6 caracteres por token."
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Field label="Pergunta">
          <select className="field" value={pid} onChange={(e) => setPid(e.target.value)}>
            {PERGUNTAS.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.pergunta}</option>)}
            <option value="">— escrever a minha —</option>
          </select>
        </Field>
        <Field label="Método de pesquisa">
          <Segmented value={metodo} onChange={setMetodo} options={METODOS} />
        </Field>
      </div>
      {!dourada && (
        <div className="mt-2">
          <Field label="A tua pergunta"><input className="field" value={livre} onChange={(e) => setLivre(e.target.value)} /></Field>
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label={`k (chunks no prompt): ${k}`}><Slider value={k} onChange={setK} min={1} max={5} /></Field>
        <Field label={`Limiar de resposta: ${nf2.format(limiar)}`}><Slider value={limiar} onChange={setLimiar} min={0.1} max={0.7} step={0.05} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={filtrar} onChange={setFiltrar} label="Filtrar vigente e público" /></div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        Casos para ver:
        {[['g02', 'geração'], ['g10', 'geração'], ['g21', 'recusa'], ['g30', 'recuperação'], ['g08', 'certo']].map(([id, o]) => (
          <button key={id} type="button" className="btn btn-ghost btn-sm" onClick={() => { setPid(id); setMetodo('rerank'); setK(3); setLimiar(0.3); setFiltrar(true); }}>{id} · {o}</button>
        ))}
      </div>

      <ol className="mt-4 space-y-3 border-l-2 border-dashed border-soft pl-0 [&>li]:ml-[-0.9rem]">
        <Passo n={1} titulo="Normalizar" tokens={`${tokPergunta} tok`}>
          <p className="font-mono text-xs">{normalizar(pergunta)}</p>
          <p className="mt-1 text-xs text-muted">radicais (com sinónimos): <span className="font-mono text-body">{radicais(pergunta).join(' · ') || '—'}</span></p>
        </Passo>
        <Passo n={2} titulo="Embedding da pergunta" tokens={`${tokPergunta} tok no modelo de embeddings`}>
          <svg viewBox="0 0 256 40" className="h-10 w-full" preserveAspectRatio="none" role="img" aria-label="As 256 componentes do vector">
            <line x1={0} x2={256} y1={20} y2={20} stroke="var(--border-soft)" />
            {Array.from(v).map((x, i) => (x !== 0 ? <rect key={i} x={i} width={1} y={x > 0 ? 20 - x * 40 : 20} height={Math.abs(x) * 40} fill={x > 0 ? 'var(--color-brand-500)' : 'var(--color-accent-500)'} /> : null))}
          </svg>
          <p className="mt-1 text-xs text-muted">{Array.from(v).filter((x) => x !== 0).length} de 256 componentes diferentes de zero · norma 1 (o cosseno passa a ser um produto interno)</p>
        </Passo>
        <Passo n={3} titulo={`Pesquisa (${METODOS.find((m) => m.value === metodo)?.label}, top-10)`} tokens="0 tok · ≈ 45 ms no PostgreSQL">
          <ol className="space-y-0.5">
            {ranking.map((r, i) => (
              <li key={r.chunk.id} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-mono text-muted">{i + 1}</span>
                <span className={`min-w-0 flex-1 truncate font-mono ${filtrar && !citavel(r.chunk.doc) ? 'text-muted line-through' : 'text-body'}`} title={r.chunk.texto}>{r.chunk.id}</span>
                {rel(r.chunk.doc) && <Chip className={CHIP_REL}>relevante</Chip>}
                {motivoFiltro(r.chunk.doc) && <Chip className={CHIP_NEUTRO}>{motivoFiltro(r.chunk.doc)}</Chip>}
                <span className="font-mono text-strong">{nf4.format(r.score)}</span>
              </li>
            ))}
          </ol>
        </Passo>
        <Passo n={4} titulo="Filtro de metadados" tokens={`${removidos.length} removido${removidos.length === 1 ? '' : 's'}`}>
          {!filtrar ? (
            <p className="text-rose-700 dark:text-rose-300">Sem filtro: documentos internos e políticas substituídas podem chegar ao prompt — e ser citados ao cliente.</p>
          ) : removidos.length ? (
            <p>Retirados depois da pesquisa (pós-filtro): {removidos.map((r) => `${r.chunk.id} (${motivoFiltro(r.chunk.doc)})`).join(', ')}. Em produção o filtro vai dentro da consulta SQL (pré-filtro), para não ficares com menos de k resultados.</p>
          ) : (
            <p>Nada a retirar: o top-10 só tem documentos vigentes e públicos.</p>
          )}
        </Passo>
        <Passo n={5} titulo={`Top-${k} para o contexto`}>
          <ul className="space-y-1">
            {topk.map((r) => (
              <li key={r.chunk.id} className="text-xs"><span className="font-mono font-semibold text-strong">[{r.chunk.doc}]</span> {r.chunk.texto.slice(0, 140)}{r.chunk.texto.length > 140 ? '…' : ''} {rel(r.chunk.doc) && <Chip className={CHIP_REL}>relevante</Chip>}</li>
            ))}
            {topk.length === 0 && <li className="text-xs text-muted">Nenhum chunk: o contexto vai vazio.</li>}
          </ul>
        </Passo>
        <Passo n={6} titulo="Prompt montado" tokens={`${tokSistema} + ${tokUser} tok de entrada`}>
          <pre className="scrollbar-thin max-h-60 overflow-auto rounded-lg surface-sunken p-2.5 font-mono text-[0.72rem] leading-relaxed whitespace-pre-wrap text-body">
            <span className="font-bold text-brand-700 dark:text-brand-300">system: </span>{msgs[0].content}{'\n\n'}
            <span className="font-bold text-brand-700 dark:text-brand-300">user: </span>{msgs[1].content}
          </pre>
        </Passo>
        <Passo n={7} titulo={resp.recusou ? 'Resposta: recusa' : 'Resposta com citações'} tokens={`${tokResp} tok de saída · ${nf4.format(custo)} MZN (médio, sem cache)`} tom={diag?.tom === 'bom' ? 'bom' : diag?.tom === 'mau' ? 'mau' : 'normal'}>
          <p className="rounded-lg surface-sunken px-2.5 py-2 text-strong">{resp.texto}</p>
          {dourada && <p className="mt-1.5 text-xs text-muted">Resposta de referência (golden set): <span className="text-body">{dourada.resposta}</span></p>}
          <p className="mt-2 text-xs font-semibold text-muted">Frases candidatas (score de sobreposição com a pergunta; linha = limiar)</p>
          <ul className="mt-1 space-y-1">
            {resp.candidatas.slice(0, 5).map((c, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-2 text-xs">
                <span className="truncate" title={c.frase}><span className="font-mono text-muted">[{c.fonte}]</span> {c.frase}</span>
                <span className="relative h-2.5 rounded surface-sunken">
                  <span className={`absolute inset-y-0 left-0 rounded ${c.score >= limiar ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${Math.min(1, c.score) * 100}%` }} />
                  <span className="absolute inset-y-[-3px] w-0.5" style={{ left: `${limiar * 100}%`, background: 'var(--text-strong)' }} />
                </span>
              </li>
            ))}
          </ul>
        </Passo>
      </ol>

      {diag && (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${diag.tom === 'bom' ? 'border-emerald-500/50 bg-emerald-500/8' : diag.tom === 'mau' ? 'border-rose-500/50 bg-rose-500/8' : 'border-soft surface-sunken'}`} aria-live="polite">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Diagnóstico · {dourada?.id}</p>
          <p className="mt-1 text-body">{diag.texto}</p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Entrada" value={`${tokSistema + tokUser} tok`} />
        <Stat label="Saída" value={`${tokResp} tok`} />
        <Stat label="Contexto RAG" value={`${estimarTokens(topk.map((r) => r.chunk.texto).join('\n'))} tok`} />
        <Stat label="Custo (médio)" value={`${nf4.format(custo)} MZN`} />
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════════ 5. RrfLab */

interface Listas { bm25: Resultado[]; denso: Resultado[] }

const LISTAS: Record<string, Listas> = {};
function listasDe(pid: string): Listas {
  if (!LISTAS[pid]) {
    const p = PERGUNTAS.find((x) => x.id === pid);
    const { denso, lexical } = indices();
    LISTAS[pid] = p ? { bm25: lexical.procurar(p.pergunta, 50).slice(0, 20), denso: denso.procurar(p.pergunta, 20) } : { bm25: [], denso: [] };
  }
  return LISTAS[pid];
}

function metricas(res: { chunk: { doc: string } }[] | { doc: string }[], relevantes: string[]) {
  const docs = docsUnicos(res as { chunk?: SnapshotChunk; doc?: string }[]);
  return { recall: recallAtK(docs, relevantes, 3), mrr: mrr(docs.slice(0, 3), relevantes) };
}

function ColunaRanking({ titulo, itens, relevantes, hover, setHover, extra, m }: {
  titulo: string; itens: { id: string; doc: string; score: number; nota?: string }[]; relevantes: string[];
  hover: string | null; setHover: (s: string | null) => void; extra?: ReactNode; m: { recall: number; mrr: number };
}) {
  return (
    <div className="min-w-0 rounded-xl border border-soft p-2.5">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{titulo}</p>
      <p className="mt-0.5 font-mono text-[0.7rem] text-muted">recall@3 {nf2.format(m.recall)} · MRR {nf2.format(m.mrr)}</p>
      {extra}
      <ol className="mt-1.5 space-y-0.5">
        {itens.map((it, i) => (
          <li
            key={it.id}
            onMouseEnter={() => setHover(it.id)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-xs transition ${hover === it.id ? 'bg-brand-500/15' : ''} ${relevantes.includes(it.doc) ? 'font-semibold' : ''}`}
          >
            <span className="w-4 shrink-0 font-mono text-muted">{i + 1}</span>
            <span className={`inline-block size-2 shrink-0 rounded-full ${relevantes.includes(it.doc) ? 'bg-emerald-500' : 'bg-[var(--border-soft)]'}`} />
            <span className="min-w-0 flex-1 truncate font-mono text-body" title={CHUNK_DE[it.id]?.texto}>{it.id}</span>
            {it.nota && <span className="shrink-0 font-mono text-[0.65rem] text-muted">{it.nota}</span>}
            <span className="shrink-0 font-mono text-strong">{it.score < 0.1 ? nf4.format(it.score) : nf3.format(it.score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const KS_RRF = [1, 2, 5, 10, 20, 40, 60, 80, 100];

export function RrfLab() {
  const [pid, setPid] = useState('g24');
  const [kRrf, setKRrf] = useState(60);
  const [hover, setHover] = useState<string | null>(null);

  const p = PERGUNTAS.find((x) => x.id === pid) ?? PERGUNTAS[0];
  const l = listasDe(p.id);
  const fundida = rrf([l.denso, l.bm25], kRrf);
  const posB = new Map(l.bm25.map((r, i) => [r.chunk.id, i + 1]));
  const posD = new Map(l.denso.map((r, i) => [r.chunk.id, i + 1]));
  const rr = SNAPSHOT.rankings[p.id].rerank;

  const agregado = useMemo(() => {
    const calc = (k: number) => {
      let r = 0;
      let m = 0;
      for (const q of PERGUNTAS) {
        const ls = listasDe(q.id);
        const x = metricas(rrf([ls.denso, ls.bm25], k).slice(0, 30), q.relevantes);
        r += x.recall;
        m += x.mrr;
      }
      return { recall: r / PERGUNTAS.length, mrr: m / PERGUNTAS.length };
    };
    return { atual: calc(kRrf), curva: KS_RRF.map((k) => ({ k, ...calc(k) })) };
  }, [kRrf]);
  const av = SNAPSHOT.avaliacao;

  const W = 320;
  const H = 120;
  const gx = (k: number) => 30 + (Math.log(k) / Math.log(100)) * (W - 45);
  const ys = agregado.curva.flatMap((c) => [c.recall, c.mrr]);
  const [lo, hi] = [Math.min(...ys, 0.7) - 0.02, Math.max(...ys, 0.95) + 0.02];
  const gy = (y: number) => H - 20 - ((y - lo) / (hi - lo)) * (H - 32);
  const linha = (f: (c: { recall: number; mrr: number }) => number) => agregado.curva.map((c, i) => `${i ? 'L' : 'M'}${gx(c.k).toFixed(1)},${gy(f(c)).toFixed(1)}`).join(' ');

  return (
    <Frame
      title="Fusão híbrida (RRF)"
      hint="RRF(d) = Σ 1 / (k + posição de d em cada lista). BM25 e denso são os top-20 da porta do `balcao` (iguais ao snapshot); a fusão é recalculada ao vivo com o k escolhido. O re-rank é o do snapshot (k = 60, re-ranking dos 20 primeiros). Métricas ao nível do documento, como em `avaliar_recuperacao`."
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Pergunta dourada">
          <select className="field" value={pid} onChange={(e) => setPid(e.target.value)}>
            {PERGUNTAS.map((q) => <option key={q.id} value={q.id}>{q.id} · {q.pergunta}</option>)}
          </select>
        </Field>
        <Field label={`k do RRF: ${kRrf}`}><Slider value={kRrf} onChange={setKRrf} min={1} max={100} /></Field>
      </div>
      <p className="mt-2 text-sm text-body">Relevantes: {p.relevantes.map((d) => <Chip key={d} className={`${CHIP_REL} mr-1`}>{d}</Chip>)}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ColunaRanking titulo="BM25" itens={l.bm25.slice(0, 10).map((r) => ({ id: r.chunk.id, doc: r.chunk.doc, score: r.score }))} relevantes={p.relevantes} hover={hover} setHover={setHover} m={metricas(l.bm25, p.relevantes)} />
        <ColunaRanking titulo="Denso (cosseno)" itens={l.denso.slice(0, 10).map((r) => ({ id: r.chunk.id, doc: r.chunk.doc, score: r.score }))} relevantes={p.relevantes} hover={hover} setHover={setHover} m={metricas(l.denso, p.relevantes)} />
        <ColunaRanking
          titulo={`Fundida (RRF, k = ${kRrf})`}
          itens={fundida.slice(0, 10).map((r) => ({ id: r.chunk.id, doc: r.chunk.doc, score: r.score, nota: `b${posB.get(r.chunk.id) ?? '–'} d${posD.get(r.chunk.id) ?? '–'}` }))}
          relevantes={p.relevantes} hover={hover} setHover={setHover} m={metricas(fundida.slice(0, 30), p.relevantes)}
        />
        <ColunaRanking titulo="Re-rank (snapshot)" itens={rr.map(([id, doc, s]) => ({ id, doc, score: s }))} relevantes={p.relevantes} hover={hover} setHover={setHover} m={metricas(rr.map(([, doc]) => ({ doc })), p.relevantes)} />
      </div>
      {hover && (
        <p className="mt-2 rounded-lg surface-sunken px-3 py-1.5 font-mono text-xs text-body">
          {hover}: BM25 #{posB.get(hover) ?? 'fora do top-20'} · denso #{posD.get(hover) ?? 'fora do top-20'} → {' '}
          {[posB.get(hover), posD.get(hover)].filter((x): x is number => !!x).map((x) => `1/(${kRrf}+${x})`).join(' + ') || '—'}
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label={`Recall@3 · 30 perg. · k=${kRrf}`} value={nf3.format(agregado.atual.recall)} />
          <Stat label={`MRR@3 · 30 perg. · k=${kRrf}`} value={nf3.format(agregado.atual.mrr)} />
          <Stat label="BM25 · denso (recall@3)" value={`${nf3.format(av.bm25['3'].recall)} · ${nf3.format(av.denso['3'].recall)}`} />
          <Stat label="Re-rank (recall · MRR)" value={`${nf3.format(av.rerank['3'].recall)} · ${nf3.format(av.rerank['3'].mrr)}`} tone="good" />
        </div>
        <figure className="rounded-xl border border-soft p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Recall@3 e MRR@3 em função do k do RRF">
            {[lo + 0.02, (lo + hi) / 2, hi - 0.02].map((y) => (
              <g key={y}>
                <line x1={30} x2={W - 15} y1={gy(y)} y2={gy(y)} stroke="var(--border-soft)" strokeDasharray="2 3" />
                <text x={26} y={gy(y) + 3} fontSize={9} textAnchor="end" fill="var(--text-muted)">{y.toFixed(2).replace('.', ',')}</text>
              </g>
            ))}
            <line x1={gx(kRrf)} x2={gx(kRrf)} y1={8} y2={H - 20} stroke="var(--text-muted)" strokeDasharray="3 3" />
            <path d={linha((c) => c.recall)} fill="none" stroke="var(--color-brand-500)" strokeWidth={2.5} />
            <path d={linha((c) => c.mrr)} fill="none" stroke="var(--color-accent-500)" strokeWidth={2} />
            {KS_RRF.filter((k) => k !== 80).map((k) => <text key={k} x={gx(k)} y={H - 6} fontSize={8.5} textAnchor="middle" fill="var(--text-muted)">{k}</text>)}
            <text x={34} y={12} fontSize={9} fill="var(--color-brand-600)">recall@3</text>
            <text x={82} y={12} fontSize={9} fill="var(--color-accent-600)">MRR@3</text>
          </svg>
          <figcaption className="text-xs text-muted">k pequeno dá peso quase todo ao 1.º lugar de cada lista; k grande achata as diferenças de posição. 60 é o valor do artigo original (Cormack et al., 2009) e raramente é o que decide o resultado.</figcaption>
        </figure>
      </div>
    </Frame>
  );
}

/* ═════════════════════════════════════════════════════ 6. ReescritaConsulta */

type Tecnica = 'original' | 'multi' | 'hyde' | 'decomposicao' | 'sinonimos';

interface CasoReescrita {
  pergunta: string;
  relevantes: string[];
  multi: string[];
  hyde: string;
  decomposicao: string[];
}

const CASOS: CasoReescrita[] = [
  {
    pergunta: 'o motoqueiro esqueceu-se de mim',
    relevantes: ['faq-rastrear-pedido', 'pol-atraso-compensacao'],
    multi: ['o estafeta ainda não chegou com o meu pedido', 'estado do pedido e tempo estimado de chegada', 'compensação por atraso na entrega'],
    hyde: 'Se o estafeta ainda não recolheu o pedido, o estado aparece na aplicação e o tempo estimado de chegada é recalculado. Se a entrega chegar mais de 20 minutos depois do tempo prometido, o cliente recebe um cupão de 100 MZN.',
    decomposicao: ['estado do pedido e tempo estimado de chegada', 'compensação por atraso na entrega'],
  },
  {
    pergunta: 'fui roubado 2x no mpesa',
    relevantes: ['pol-cobranca-duplicada'],
    multi: ['cobrança duplicada no M-Pesa', 'o mesmo pedido foi cobrado duas vezes', 'como reverter uma cobrança repetida no M-Pesa?'],
    hyde: 'Se o mesmo pedido aparecer cobrado duas vezes no M-Pesa, a segunda cobrança é detectada e revertida automaticamente em até 72 horas.',
    decomposicao: ['fui cobrado duas vezes pelo mesmo pedido', 'pagamento M-Pesa'],
  },
  {
    pergunta: 'quanto tempo o visa devolve?',
    relevantes: ['pol-reembolso-prazos', 'pol-pagamento-cartao'],
    multi: ['prazo do reembolso no cartão Visa', 'quantos dias demora o estorno no cartão?', 'quando é libertado o valor cativo no cartão?'],
    hyde: 'Depois de aprovado, o reembolso no cartão Visa ou Mastercard chega em 5 a 10 dias úteis, dependendo do banco emissor.',
    decomposicao: ['prazo de reembolso no cartão Visa'],
  },
  {
    pergunta: 'pago em dinheiro e uso dois cupões, dá?',
    relevantes: ['pol-pagamento-numerario', 'pol-cupoes'],
    multi: ['posso pagar em numerário e usar cupões?', 'pagamento em dinheiro com cupão de desconto', 'quantos cupões posso usar por pedido?'],
    hyde: 'O pagamento em numerário é feito ao estafeta, no momento da entrega. Só se pode usar um cupão por pedido e os cupões não são acumuláveis.',
    decomposicao: ['posso pagar em numerário ao estafeta?', 'posso juntar dois cupões no mesmo pedido?'],
  },
  {
    pergunta: 'a pizza veio gelada e sem a coca',
    relevantes: ['pol-qualidade-comida', 'pol-itens-em-falta'],
    multi: ['a comida chegou fria', 'faltou uma bebida no pedido', 'reembolso por comida fria e artigo em falta'],
    hyde: 'Se a comida chegar fria, o cliente envia uma fotografia até 2 horas depois da entrega. Se faltar um artigo no saco, o cliente deve reportar na aplicação até 48 horas depois da entrega.',
    decomposicao: ['a comida chegou fria', 'faltou uma bebida no saco'],
  },
];

/** Dicionário de domínio para a expansão (ilustrativo), além dos sinónimos do `balcao`. */
const DICIONARIO: Record<string, string[]> = {
  roubado: ['cobrança', 'indevida'], '2x': ['duas', 'vezes'], gelada: ['fria'], coca: ['bebida', 'falta'],
  devolve: ['reembolso', 'prazo'], dinheiro: ['numerário'], 'esqueceu-se': ['atraso', 'entrega'],
};

function expandir(q: string): { texto: string; termos: string[] } {
  const termos: string[] = [];
  for (const p of palavras(q)) {
    const s = SINONIMOS[p];
    if (s && s !== p && !termos.includes(s)) termos.push(s);
    for (const t of DICIONARIO[p] ?? []) if (!termos.includes(t)) termos.push(t);
  }
  return { texto: termos.length ? `${q} ${termos.join(' ')}` : q, termos };
}

function intercalar(listas: Resultado[][]): Resultado[] {
  const out: Resultado[] = [];
  const vistos = new Set<string>();
  const n = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < n; i++) for (const l of listas) {
    const r = l[i];
    if (r && !vistos.has(r.chunk.id)) { vistos.add(r.chunk.id); out.push(r); }
  }
  return out;
}

/** Latência ilustrativa do modelo pequeno: ≈ 170 ms até ao 1.º token + 110 tok/s (≈ 350 ms para 20 tokens, como no design). */
const latPequeno = (saida: number) => 170 + (saida / 110) * 1000;
const INSTRUCOES_REESCRITA = 120;
const PESQUISAS_DIA = 3100;

interface ResultadoTecnica {
  tecnica: Tecnica;
  nome: string;
  variantes: string[];
  lista: Resultado[];
  chamadas: number;
  tokIn: number;
  tokOut: number;
  latencia: number;
  pesquisas: number;
  nota: string;
}

function correr(caso: CasoReescrita, t: Tecnica): ResultadoTecnica {
  const H = (q: string) => recuperar(q, 20, 'hibrido');
  const q = caso.pergunta;
  const tokQ = estimarTokens(q);
  const modelo = (saida: string[]) => {
    const out = estimarTokens(saida.join('\n'));
    return { chamadas: 1, tokIn: INSTRUCOES_REESCRITA + tokQ, tokOut: out, latencia: latPequeno(out) + 45 };
  };
  if (t === 'multi') {
    return { tecnica: t, nome: 'Multi-query', variantes: caso.multi, lista: rrf([H(q), ...caso.multi.map(H)]), pesquisas: 1 + caso.multi.length, ...modelo(caso.multi), nota: 'O modelo pequeno escreve 3 reformulações; pesquisa-se cada uma (em paralelo) e funde-se tudo por RRF com a original. O que aparece em várias listas sobe — incluindo o ruído comum.' };
  }
  if (t === 'hyde') {
    const { denso, lexical } = indices();
    return { tecnica: t, nome: 'HyDE', variantes: [caso.hyde], lista: rrf([denso.procurar(caso.hyde, 20), lexical.procurar(q, 50).slice(0, 20)]), pesquisas: 2, ...modelo([caso.hyde]), nota: 'O modelo escreve uma resposta hipotética com as palavras de uma política; pesquisa-se o seu embedding (o BM25 continua com a pergunta original) e funde-se por RRF. Os factos da resposta hipotética podem estar errados — só serve para pesquisar, nunca para responder.' };
  }
  if (t === 'decomposicao') {
    return { tecnica: t, nome: 'Decomposição', variantes: caso.decomposicao, lista: intercalar(caso.decomposicao.map(H)), pesquisas: caso.decomposicao.length, ...modelo(caso.decomposicao), nota: 'Parte a pergunta em sub-perguntas e intercala os resultados de cada uma (o 1.º de cada, depois o 2.º…). Fundir sub-perguntas por RRF seria um erro: sobe o que é comum às duas, que costuma ser ruído.' };
  }
  if (t === 'sinonimos') {
    const e = expandir(q);
    return { tecnica: t, nome: 'Sinónimos', variantes: [e.texto], lista: H(e.texto), chamadas: 0, tokIn: 0, tokOut: 0, latencia: 1, pesquisas: 1, nota: `Acrescenta termos de um dicionário (${e.termos.join(', ') || 'nenhum'}): sem modelo e sem latência, mas às cegas — o dicionário não sabe o que o cliente quis dizer.` };
  }
  return { tecnica: t, nome: 'Original', variantes: [q], lista: H(q), chamadas: 0, tokIn: 0, tokOut: 0, latencia: 0, pesquisas: 1, nota: 'A pergunta tal como o cliente a escreveu, na pesquisa híbrida (denso + BM25, RRF k = 60).' };
}

const TECNICAS: { value: Tecnica; label: string }[] = [
  { value: 'multi', label: 'multi-query' },
  { value: 'hyde', label: 'HyDE' },
  { value: 'decomposicao', label: 'decomposição' },
  { value: 'sinonimos', label: 'sinónimos' },
];

export function ReescritaConsulta() {
  const [ci, setCi] = useState(0);
  const [tec, setTec] = useState<Tecnica>('hyde');
  const caso = CASOS[ci];

  const todos = useMemo(() => (['original', 'multi', 'hyde', 'decomposicao', 'sinonimos'] as Tecnica[]).map((t) => correr(caso, t)), [caso]);
  const orig = todos[0];
  const atual = todos.find((r) => r.tecnica === tec) ?? orig;
  const docsOrig = docsUnicos(orig.lista).slice(0, 5);
  const docsAtual = docsUnicos(atual.lista).slice(0, 5);
  const met = (r: ResultadoTecnica) => metricas(r.lista.slice(0, 30), caso.relevantes);
  const custoDia = (r: ResultadoTecnica) => custoMzn(r.tokIn, r.tokOut, 'pequeno') * PESQUISAS_DIA;

  const lista = (docs: string[], base?: string[]) => (
    <ol className="space-y-1">
      {docs.map((d, i) => {
        const antes = base ? base.indexOf(d) : -1;
        const mov = !base ? null : antes < 0 ? 'novo' : antes > i ? `↑${antes - i}` : antes < i ? `↓${i - antes}` : '=';
        const relevante = caso.relevantes.includes(d);
        return (
          <li key={d} className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${relevante ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-soft'}`}>
            <span className="w-4 font-mono text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-body" title={DOC_DE[d]?.titulo}>{d}</span>
            {relevante && <Chip className={CHIP_REL}>relevante</Chip>}
            {mov && <span className={`w-9 text-right font-mono ${mov.startsWith('↑') || mov === 'novo' ? 'text-emerald-600 dark:text-emerald-400' : mov.startsWith('↓') ? 'text-rose-600 dark:text-rose-400' : 'text-muted'}`}>{mov}</span>}
          </li>
        );
      })}
    </ol>
  );

  return (
    <Frame
      title="Reescrita de consulta"
      hint="Pesquisa híbrida da porta do `balcao` (denso + BM25, RRF k = 60) sobre os 46 chunks recursivos, calculada ao vivo para cada variante. As reformulações e as respostas hipotéticas estão escritas à mão, como as escreveria um modelo pequeno; a relevância destes exemplos foi anotada para o widget. Latência e custo por dia são **ilustrativos** (modelo pequeno, ≈ 3 100 pesquisas por dia)."
    >
      <div className="flex flex-wrap gap-1.5">
        {CASOS.map((c, i) => (
          <button key={c.pergunta} type="button" aria-pressed={i === ci} className={`btn btn-sm ${i === ci ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCi(i)}>«{c.pergunta}»</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-body">Relevantes: {caso.relevantes.map((d) => <Chip key={d} className={`${CHIP_REL} mr-1`}>{d}</Chip>)}</p>
      <div className="mt-3"><Segmented value={tec} onChange={setTec} options={TECNICAS} /></div>

      <div className="mt-3 rounded-xl border border-soft surface-sunken p-3">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">{atual.nome}: o que vai para a pesquisa</p>
        <ul className="mt-1.5 space-y-1">
          {atual.variantes.map((vv) => {
            const top = atual.tecnica === 'hyde' ? indices().denso.procurar(vv, 1)[0] : recuperar(vv, 1, 'hibrido')[0];
            return (
              <li key={vv} className="text-sm text-strong">
                «{vv}»
                {top && <span className="ml-2 font-mono text-[0.7rem] text-muted">→ 1.º {top.chunk.doc}{caso.relevantes.includes(top.chunk.doc) ? ' (relevante)' : ''}</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">{atual.nota}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">Original · recall@3 {nf2.format(met(orig).recall)} · MRR {nf2.format(met(orig).mrr)}</p>
          {lista(docsOrig)}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">{atual.nome} · recall@3 {nf2.format(met(atual).recall)} · MRR {nf2.format(met(atual).mrr)}</p>
          {lista(docsAtual, docsOrig)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Chamadas ao modelo" value={`+${atual.chamadas}`} />
        <Stat label="Tokens (entr. · saída)" value={`${atual.tokIn} · ${atual.tokOut}`} />
        <Stat label="Latência extra" value={atual.latencia ? `+${nf0.format(atual.latencia)} ms` : '0 ms'} tone={atual.latencia > 600 ? 'warn' : 'neutral'} />
        <Stat label="Pesquisas" value={`${atual.pesquisas}`} />
      </div>

      <div className="scrollbar-thin mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {['Técnica', 'recall@3', 'MRR@3', 'Latência extra', 'MZN / dia extra', 'Pesquisas'].map((hd) => <th key={hd} className="border-b border-soft py-1.5 pr-3 font-semibold">{hd}</th>)}
            </tr>
          </thead>
          <tbody>
            {todos.map((r) => {
              const m = met(r);
              const mo = met(orig);
              return (
                <tr key={r.tecnica} className={r.tecnica === tec ? 'bg-brand-500/10' : ''}>
                  <td className="border-b border-soft py-1.5 pr-3 font-semibold text-strong">{r.nome}</td>
                  <td className={`border-b border-soft py-1.5 pr-3 font-mono text-xs ${m.recall > mo.recall ? 'text-emerald-600 dark:text-emerald-400' : m.recall < mo.recall ? 'text-rose-600 dark:text-rose-400' : ''}`}>{nf2.format(m.recall)}</td>
                  <td className={`border-b border-soft py-1.5 pr-3 font-mono text-xs ${m.mrr > mo.mrr ? 'text-emerald-600 dark:text-emerald-400' : m.mrr < mo.mrr ? 'text-rose-600 dark:text-rose-400' : ''}`}>{nf2.format(m.mrr)}</td>
                  <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs">{r.latencia ? `+${nf0.format(r.latencia)} ms` : '—'}</td>
                  <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs">{r.chamadas ? nf2.format(custoDia(r)) : '—'}</td>
                  <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs">{r.pesquisas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Ilustrativo /> Nenhuma técnica ganha sempre: a reescrita custa uma chamada ao modelo antes da pesquisa, no caminho crítico do TTFT. Mede no golden set e activa-a só onde ajuda (por exemplo, quando o melhor score da pesquisa original fica abaixo de um limiar).
      </p>
    </Frame>
  );
}

