import { useEffect, useMemo, useState } from 'react';
import type { GraphEdge, GraphNode, GraphNodeKind, GraphSpec } from '../types';
import { RichText } from './RichText';

const CELL_W = 172;
const CELL_H = 80;
const GAP_X = 44;
const GAP_Y = 64;
const PAD = 26;

interface Box { x: number; y: number; w: number; h: number; cx: number; cy: number }

function caixa(n: GraphNode): Box {
  const x = PAD + n.col * (CELL_W + GAP_X);
  const y = PAD + n.row * (CELL_H + GAP_Y);
  return { x, y, w: CELL_W, h: CELL_H, cx: x + CELL_W / 2, cy: y + CELL_H / 2 };
}

const ESTILO: Record<GraphNodeKind, { stroke: string; fill: string; etiqueta: string; forma: 'caixa' | 'pilula' | 'losango' | 'cilindro' }> = {
  inicio: { stroke: 'var(--text-muted)', fill: 'var(--surface-sunken)', etiqueta: 'entrada', forma: 'pilula' },
  fim: { stroke: 'var(--text-muted)', fill: 'var(--surface-sunken)', etiqueta: 'fim', forma: 'pilula' },
  llm: { stroke: 'var(--color-brand-500)', fill: 'color-mix(in oklch, var(--color-brand-500) 10%, var(--surface-raised))', etiqueta: 'modelo', forma: 'caixa' },
  ferramenta: { stroke: 'var(--color-accent-600)', fill: 'color-mix(in oklch, var(--color-accent-500) 10%, var(--surface-raised))', etiqueta: 'ferramenta', forma: 'caixa' },
  router: { stroke: 'oklch(0.62 0.17 200)', fill: 'var(--surface-raised)', etiqueta: 'router', forma: 'losango' },
  humano: { stroke: 'oklch(0.60 0.16 25)', fill: 'color-mix(in oklch, oklch(0.60 0.16 25) 9%, var(--surface-raised))', etiqueta: 'humano', forma: 'caixa' },
  subgrafo: { stroke: 'var(--color-brand-700)', fill: 'var(--surface-raised)', etiqueta: 'subgrafo', forma: 'caixa' },
  reducer: { stroke: 'oklch(0.62 0.16 155)', fill: 'color-mix(in oklch, oklch(0.62 0.16 155) 9%, var(--surface-raised))', etiqueta: 'reducer', forma: 'caixa' },
  guarda: { stroke: 'oklch(0.58 0.14 300)', fill: 'var(--surface-raised)', etiqueta: 'guarda', forma: 'caixa' },
  retriever: { stroke: 'oklch(0.60 0.14 230)', fill: 'color-mix(in oklch, oklch(0.60 0.14 230) 10%, var(--surface-raised))', etiqueta: 'retriever', forma: 'cilindro' },
};

function rota(a: Box, b: Box): { d: string; meio: [number, number] } {
  const mesmaLinha = Math.abs(a.cy - b.cy) < 2;
  if (mesmaLinha) {
    const direita = b.cx > a.cx;
    const x1 = direita ? a.x + a.w : a.x;
    const x2 = direita ? b.x : b.x + b.w;
    return { d: `M ${x1} ${a.cy} L ${x2} ${b.cy}`, meio: [(x1 + x2) / 2, a.cy - 9] };
  }
  const mesmaColuna = Math.abs(a.cx - b.cx) < 2;
  if (mesmaColuna) {
    const baixo = b.cy > a.cy;
    const y1 = baixo ? a.y + a.h : a.y;
    const y2 = baixo ? b.y : b.y + b.h;
    return { d: `M ${a.cx} ${y1} L ${b.cx} ${y2}`, meio: [a.cx + 8, (y1 + y2) / 2] };
  }
  const baixo = b.cy > a.cy;
  const y1 = baixo ? a.y + a.h : a.y;
  const goteira = y1 + (baixo ? GAP_Y * 0.45 : -GAP_Y * 0.45);
  const y2 = baixo ? b.y : b.y + b.h;
  return {
    d: `M ${a.cx} ${y1} L ${a.cx} ${goteira} L ${b.cx} ${goteira} L ${b.cx} ${y2}`,
    meio: [(a.cx + b.cx) / 2, goteira - 9],
  };
}

function No({ n, activo, feito }: { n: GraphNode; activo: boolean; feito: boolean }) {
  const b = caixa(n);
  const e = ESTILO[n.kind];
  const raio = e.forma === 'pilula' ? CELL_H / 2 : 14;
  const opacidade = activo ? 1 : feito ? 0.92 : 0.5;
  return (
    <g opacity={opacidade} className="transition-opacity duration-300">
      {e.forma === 'losango' ? (
        <polygon
          points={`${b.cx},${b.y} ${b.x + b.w},${b.cy} ${b.cx},${b.y + b.h} ${b.x},${b.cy}`}
          fill={e.fill}
          stroke={activo ? 'var(--color-brand-600)' : e.stroke}
          strokeWidth={activo ? 3 : 1.6}
        />
      ) : e.forma === 'cilindro' ? (
        <g stroke={activo ? 'var(--color-brand-600)' : e.stroke} strokeWidth={activo ? 3 : 1.6} fill={e.fill}>
          <path d={`M ${b.x} ${b.y + 9} L ${b.x} ${b.y + b.h - 9} A ${b.w / 2} 9 0 0 0 ${b.x + b.w} ${b.y + b.h - 9} L ${b.x + b.w} ${b.y + 9}`} />
          <ellipse cx={b.cx} cy={b.y + 9} rx={b.w / 2} ry={9} />
        </g>
      ) : (
        <rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={raio}
          fill={e.fill}
          stroke={activo ? 'var(--color-brand-600)' : e.stroke}
          strokeWidth={activo ? 3 : 1.6}
          strokeDasharray={n.kind === 'guarda' ? '6 4' : undefined}
        />
      )}
      {activo && <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx={raio + 6} fill="none" stroke="var(--color-brand-500)" strokeWidth={1} opacity={0.45} />}
      <text x={b.cx} y={b.y + (e.forma === 'cilindro' ? 30 : 20)} textAnchor="middle" fontSize={9} fill={e.stroke} fontFamily="var(--font-mono)" letterSpacing={0.6}>
        {e.etiqueta.toUpperCase()}
      </text>
      <text x={b.cx} y={b.cy + 4} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--text-strong)">
        {n.label}
      </text>
      {n.sub && (
        <text x={b.cx} y={b.cy + 20} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)">
          {n.sub}
        </text>
      )}
      {(n.ms || n.tokens) && (
        <text x={b.x + b.w - 8} y={b.y + b.h - 7} textAnchor="end" fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {[n.ms ? `${n.ms}ms` : null, n.tokens ? `${n.tokens}tok` : null].filter(Boolean).join(' · ')}
        </text>
      )}
    </g>
  );
}

export function GraphView({ graph }: { graph: GraphSpec }) {
  const [corrida, setCorrida] = useState(0);
  const [passo, setPasso] = useState(-1);
  const [aTocar, setATocar] = useState(false);

  const run = graph.runs?.[corrida];
  const grupos = run?.path ?? [];

  useEffect(() => { setPasso(-1); setATocar(false); }, [corrida, graph.id]);

  useEffect(() => {
    if (!aTocar) return;
    if (passo >= grupos.length - 1) { setATocar(false); return; }
    const t = setTimeout(() => setPasso((p) => p + 1), 900);
    return () => clearTimeout(t);
  }, [aTocar, passo, grupos.length]);

  const { largura, altura } = useMemo(() => {
    const cols = Math.max(...graph.nodes.map((n) => n.col)) + 1;
    const rows = Math.max(...graph.nodes.map((n) => n.row)) + 1;
    return { largura: PAD * 2 + cols * CELL_W + (cols - 1) * GAP_X, altura: PAD * 2 + rows * CELL_H + (rows - 1) * GAP_Y };
  }, [graph.nodes]);

  const porId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const activos = new Set(passo >= 0 ? grupos[passo] ?? [] : []);
  const feitos = new Set(grupos.slice(0, Math.max(0, passo)).flat());

  const arestaActiva = (e: GraphEdge) => passo > 0 && (grupos[passo - 1] ?? []).includes(e.from) && activos.has(e.to);

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">Grafo</span>
        <p className="w-full text-sm font-bold text-strong sm:w-auto sm:flex-1">{graph.title}</p>
        {graph.runs && graph.runs.length > 1 && (
          <select className="field field-mono max-w-[16rem] py-1 text-[0.78rem]" value={corrida} onChange={(e) => setCorrida(Number(e.target.value))}>
            {graph.runs.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
          </select>
        )}
        {grupos.length > 0 && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setPasso((p) => Math.max(-1, p - 1))} disabled={passo < 0}>◀</button>
            <button className="btn btn-primary btn-sm" onClick={() => { if (passo >= grupos.length - 1) setPasso(-1); setATocar((v) => !v); }}>
              {aTocar ? '❚❚ pausa' : '▷ correr'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPasso((p) => Math.min(grupos.length - 1, p + 1))} disabled={passo >= grupos.length - 1}>▶</button>
            <span className="chip surface font-mono text-[0.68rem] text-muted">superstep {passo < 0 ? 0 : passo + 1}/{grupos.length}</span>
          </>
        )}
      </header>

      {graph.brief && <p className="px-4 pt-3 text-[0.9rem] leading-relaxed"><RichText text={graph.brief} /></p>}

      <div className="scrollbar-thin overflow-x-auto p-3">
        <svg viewBox={`0 0 ${largura} ${altura}`} width={largura} height={altura} className="max-w-full" role="img" aria-label={graph.title}>
          <defs>
            <marker id={`g-seta-${graph.id}`} markerWidth={9} markerHeight={9} refX={7.5} refY={3} orient="auto">
              <path d="M0,0 L7,3 L0,6 z" fill="var(--text-muted)" />
            </marker>
            <marker id={`g-seta-on-${graph.id}`} markerWidth={9} markerHeight={9} refX={7.5} refY={3} orient="auto">
              <path d="M0,0 L7,3 L0,6 z" fill="var(--color-brand-600)" />
            </marker>
          </defs>

          {graph.edges.map((e, i) => {
            const a = porId.get(e.from);
            const b = porId.get(e.to);
            if (!a || !b) return null;
            const { d, meio } = rota(caixa(a), caixa(b));
            const on = arestaActiva(e);
            return (
              <g key={i} opacity={on ? 1 : 0.55}>
                <path
                  d={d}
                  fill="none"
                  stroke={on ? 'var(--color-brand-600)' : 'var(--text-muted)'}
                  strokeWidth={on ? 2.4 : 1.3}
                  strokeDasharray={e.cond || e.style === 'dashed' ? '7 5' : undefined}
                  markerEnd={`url(#g-seta${on ? '-on' : ''}-${graph.id})`}
                  className={on ? 'animate-dash' : undefined}
                />
                {(e.label || e.cond) && (
                  <text x={meio[0]} y={meio[1]} textAnchor="middle" fontSize={10} fill={on ? 'var(--color-brand-700)' : 'var(--text-muted)'} fontFamily={e.cond ? 'var(--font-mono)' : undefined}>
                    {e.cond ? `[${e.cond}]` : e.label}
                  </text>
                )}
              </g>
            );
          })}

          {graph.nodes.map((n) => (
            <No key={n.id} n={n} activo={activos.has(n.id)} feito={feitos.has(n.id) || passo < 0} />
          ))}
        </svg>
      </div>

      {run && (
        <div className="border-t border-soft px-4 py-2.5 text-[0.85rem]">
          {passo >= 0 && (
            <p className="mb-1">
              <span className="chip bg-brand-500/15 font-mono text-[0.68rem] text-brand-700 dark:text-brand-300">superstep {passo + 1}</span>{' '}
              a correr: {(grupos[passo] ?? []).map((id) => <code key={id} className="mx-0.5 font-mono">{id}</code>)}
              {(grupos[passo]?.length ?? 0) > 1 && <span className="text-muted"> — em paralelo, com o mesmo estado de entrada</span>}
            </p>
          )}
          {run.note && <p className="leading-relaxed text-muted"><RichText text={run.note} /></p>}
          {run.outcome && passo >= grupos.length - 1 && (
            <p className="mt-1 animate-fade-up leading-relaxed"><strong className="text-strong">Resultado:</strong> <RichText text={run.outcome} /></p>
          )}
        </div>
      )}

      {graph.channels && graph.channels.length > 0 && (
        <div className="scrollbar-thin overflow-x-auto border-t border-soft">
          <table className="w-full border-collapse text-left text-[0.82rem]">
            <thead>
              <tr className="surface-sunken">
                {['canal', 'tipo', 'reducer', 'porquê'].map((h) => (
                  <th key={h} className="border-b border-soft px-3.5 py-2 font-semibold whitespace-nowrap text-strong">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graph.channels.map((c) => (
                <tr key={c.canal} className="odd:bg-black/[0.015] dark:odd:bg-white/[0.02]">
                  <td className="border-b border-soft/60 px-3.5 py-2 font-mono whitespace-nowrap">{c.canal}</td>
                  <td className="border-b border-soft/60 px-3.5 py-2 font-mono text-muted">{c.tipo}</td>
                  <td className="border-b border-soft/60 px-3.5 py-2 font-mono">{c.reducer}</td>
                  <td className="border-b border-soft/60 px-3.5 py-2"><RichText text={c.nota} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {graph.note && <figcaption className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted"><RichText text={graph.note} /></figcaption>}
    </figure>
  );
}
