import { useMemo, useState } from 'react';
import type { Diagram, DiagramNode, NodeKind, ZoneTone } from '../types';
import { RichText } from './RichText';

const CELL_W = 190;
const CELL_H = 92;
const GAP_X = 36;
const GAP_Y = 80;
const PAD = 30;
const ZONE_INSET = 18;
const ZONE_LABEL = 22;

interface Box { x: number; y: number; w: number; h: number; cx: number; cy: number }

function nodeBox(n: DiagramNode): Box {
  const span = n.span ?? 1;
  const x = PAD + n.col * (CELL_W + GAP_X);
  const y = PAD + n.row * (CELL_H + GAP_Y);
  const w = span * CELL_W + (span - 1) * GAP_X;
  return { x, y, w, h: CELL_H, cx: x + w / 2, cy: y + CELL_H / 2 };
}

const KIND_STYLE: Record<NodeKind, { fill: string; stroke: string; text: string; badge: string }> = {
  service: { fill: 'var(--surface-raised)', stroke: 'var(--color-brand-500)', text: 'var(--text-strong)', badge: 'var(--color-brand-600)' },
  data: { fill: 'var(--surface-raised)', stroke: 'var(--color-accent-600)', text: 'var(--text-strong)', badge: 'var(--color-accent-700)' },
  queue: { fill: 'var(--surface-raised)', stroke: 'oklch(0.62 0.18 300)', text: 'var(--text-strong)', badge: 'oklch(0.52 0.16 300)' },
  user: { fill: 'var(--surface-sunken)', stroke: 'var(--border-soft)', text: 'var(--text-strong)', badge: 'var(--text-muted)' },
  external: { fill: 'var(--surface-sunken)', stroke: 'var(--text-muted)', text: 'var(--text-body)', badge: 'var(--text-muted)' },
  note: { fill: 'transparent', stroke: 'var(--border-soft)', text: 'var(--text-muted)', badge: 'var(--text-muted)' },
  decision: { fill: 'var(--surface-raised)', stroke: 'var(--color-accent-500)', text: 'var(--text-strong)', badge: 'var(--color-accent-600)' },
  model: { fill: 'var(--surface-raised)', stroke: 'oklch(0.62 0.19 320)', text: 'var(--text-strong)', badge: 'oklch(0.50 0.17 320)' },
  agent: { fill: 'color-mix(in oklch, var(--color-brand-500) 10%, var(--surface-raised))', stroke: 'var(--color-brand-600)', text: 'var(--text-strong)', badge: 'var(--color-brand-700)' },
  tool: { fill: 'color-mix(in oklch, var(--color-accent-500) 10%, var(--surface-raised))', stroke: 'var(--color-accent-600)', text: 'var(--text-strong)', badge: 'var(--color-accent-700)' },
  vector: { fill: 'color-mix(in oklch, oklch(0.60 0.14 230) 10%, var(--surface-raised))', stroke: 'oklch(0.60 0.14 230)', text: 'var(--text-strong)', badge: 'oklch(0.50 0.13 230)' },
};

const ZONE_STYLE: Record<ZoneTone, { stroke: string; fill: string; label: string }> = {
  cluster: { stroke: 'var(--text-muted)', fill: 'color-mix(in oklch, var(--text-muted) 5%, transparent)', label: 'var(--text-muted)' },
  namespace: { stroke: 'var(--color-brand-400)', fill: 'color-mix(in oklch, var(--color-brand-500) 6%, transparent)', label: 'var(--color-brand-700)' },
  service: { stroke: 'var(--color-brand-600)', fill: 'color-mix(in oklch, var(--color-brand-600) 8%, transparent)', label: 'var(--color-brand-700)' },
  data: { stroke: 'var(--color-accent-600)', fill: 'color-mix(in oklch, var(--color-accent-500) 8%, transparent)', label: 'var(--color-accent-700)' },
  async: { stroke: 'oklch(0.62 0.18 300)', fill: 'color-mix(in oklch, oklch(0.62 0.18 300) 8%, transparent)', label: 'oklch(0.50 0.16 300)' },
  edge: { stroke: 'var(--color-accent-400)', fill: 'color-mix(in oklch, var(--color-accent-400) 6%, transparent)', label: 'var(--color-accent-700)' },
  external: { stroke: 'var(--text-muted)', fill: 'color-mix(in oklch, var(--text-muted) 7%, transparent)', label: 'var(--text-muted)' },
  neutral: { stroke: 'var(--border-soft)', fill: 'transparent', label: 'var(--text-muted)' },
  agente: { stroke: 'var(--color-brand-600)', fill: 'color-mix(in oklch, var(--color-brand-500) 8%, transparent)', label: 'var(--color-brand-700)' },
  rag: { stroke: 'oklch(0.60 0.14 230)', fill: 'color-mix(in oklch, oklch(0.60 0.14 230) 7%, transparent)', label: 'oklch(0.48 0.13 230)' },
  ci: { stroke: 'oklch(0.60 0.15 150)', fill: 'color-mix(in oklch, oklch(0.60 0.15 150) 7%, transparent)', label: 'oklch(0.46 0.13 150)' },
};

interface Grid {
  cells: Set<string>;
  cellOf: Map<string, { col: number; row: number; span: number }>;
}

function buildGrid(diagram: Diagram): Grid {
  const cells = new Set<string>();
  const cellOf = new Map<string, { col: number; row: number; span: number }>();
  for (const n of diagram.nodes) {
    const span = n.span ?? 1;
    cellOf.set(n.id, { col: n.col, row: n.row, span });
    for (let c = n.col; c < n.col + span; c++) cells.add(`${c}:${n.row}`);
  }
  return { cells, cellOf };
}

/** Há algum nó entre duas colunas, na mesma linha, sem contar com as pontas? */
function rowClear(grid: Grid, row: number, colA: number, colB: number): boolean {
  const lo = Math.min(colA, colB);
  const hi = Math.max(colA, colB);
  for (let c = lo + 1; c < hi; c++) if (grid.cells.has(`${c}:${row}`)) return false;
  return true;
}

function colClear(grid: Grid, col: number, rowA: number, rowB: number): boolean {
  const lo = Math.min(rowA, rowB);
  const hi = Math.max(rowA, rowB);
  for (let r = lo + 1; r < hi; r++) if (grid.cells.has(`${col}:${r}`)) return false;
  return true;
}

/**
 * Encaminhamento ortogonal simples com consciência da grelha: os troços
 * horizontais passam pelas goteiras entre linhas, que são sempre livres de nós,
 * em vez de atravessarem caixas.
 */
function route(a: Box, b: Box, from: { col: number; row: number; span: number }, to: { col: number; row: number; span: number }, grid: Grid): { points: [number, number][]; label: [number, number] } {
  let pts: [number, number][];

  if (from.row === to.row && rowClear(grid, from.row, from.col + from.span - 1, to.col)) {
    const right = b.cx > a.cx;
    pts = [[right ? a.x + a.w : a.x, a.cy], [right ? b.x : b.x + b.w, b.cy]];
  } else if (from.col === to.col && from.span === to.span && colClear(grid, from.col, from.row, to.row)) {
    const down = b.cy > a.cy;
    pts = [[a.cx, down ? a.y + a.h : a.y], [b.cx, down ? b.y : b.y + b.h]];
  } else {
    // Sai na vertical para a goteira adjacente, corre na horizontal por lá,
    // e entra na vertical no destino.
    const down = to.row > from.row || (to.row === from.row && from.row < 1);
    const exitY = down ? a.y + a.h : a.y;
    // A banda reservada à etiqueta de uma zona ocupa ZONE_INSET + ZONE_LABEL
    // acima da primeira linha da zona. A goteira é escolhida para nunca lá cair.
    const gutter = exitY + (down ? GAP_Y * 0.28 : -GAP_Y * 0.62);
    const entryY = to.row === from.row
      ? (down ? b.y + b.h : b.y)
      : (to.row > from.row ? b.y : b.y + b.h);
    pts = [[a.cx, exitY], [a.cx, gutter], [b.cx, gutter], [b.cx, entryY]];
  }

  // Etiqueta no troço mais longo. Em troços verticais fica junto à origem, para
  // não cair na banda reservada à etiqueta da zona de destino.
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
    if (len > bestLen) { bestLen = len; best = i; }
  }
  const p0 = pts[best];
  const p1 = pts[best + 1];
  const vertical = Math.abs(p1[0] - p0[0]) < 1;
  // Num troço vertical a etiqueta afasta-se da banda de etiqueta da zona:
  // a descer fica junto à origem, a subir fica mais perto do destino.
  const t = vertical ? (p1[1] > p0[1] ? 0.28 : 0.62) : 0.5;
  return { points: pts, label: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t] };
}

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export function DiagramView({ diagram }: { diagram: Diagram }) {
  const [hover, setHover] = useState<string | null>(null);

  const { width, height, boxes, routes } = useMemo(() => {
    const boxes = new Map<string, Box>();
    for (const n of diagram.nodes) boxes.set(n.id, nodeBox(n));
    const grid = buildGrid(diagram);
    const routes = (diagram.edges ?? []).flatMap((e, i) => {
      const a = boxes.get(e.from);
      const b = boxes.get(e.to);
      const fc = grid.cellOf.get(e.from);
      const tc = grid.cellOf.get(e.to);
      if (!a || !b || !fc || !tc) return [];
      const r = route(a, b, fc, tc, grid);
      return [{ key: i, edge: e, ...r }];
    });
    return {
      width: PAD * 2 + diagram.cols * CELL_W + (diagram.cols - 1) * GAP_X,
      height: PAD * 2 + diagram.rows * CELL_H + (diagram.rows - 1) * GAP_Y,
      boxes,
      routes,
    };
  }, [diagram]);

  const uid = useMemo(() => 'dg' + Math.random().toString(36).slice(2, 8), []);
  const zones = diagram.zones ?? [];

  const zoneRect = (z: (typeof zones)[number]) => ({
    x: PAD + z.col * (CELL_W + GAP_X) - ZONE_INSET,
    y: PAD + z.row * (CELL_H + GAP_Y) - ZONE_INSET - ZONE_LABEL,
    w: z.colSpan * CELL_W + (z.colSpan - 1) * GAP_X + ZONE_INSET * 2,
    h: z.rowSpan * CELL_H + (z.rowSpan - 1) * GAP_Y + ZONE_INSET * 2 + ZONE_LABEL,
  });

  const dim = (id: string) => hover !== null && hover !== id;

  return (
    <figure className="my-6">
      {diagram.title && <figcaption className="mb-2 text-sm font-bold text-strong">{diagram.title}</figcaption>}
      <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-soft surface p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          style={{ minWidth: Math.min(width, 720) }}
          role="img"
          aria-label={diagram.title ?? 'Diagrama de arquitectura'}
        >
          <defs>
            <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
            </marker>
            <marker id={`${uid}-arrow-hi`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-brand-500)" />
            </marker>
          </defs>

          {/* 1. fundos das zonas */}
          {zones.map((z) => {
            const st = ZONE_STYLE[z.tone ?? 'neutral'];
            const r = zoneRect(z);
            return <rect key={z.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={16} fill={st.fill} stroke={st.stroke} strokeWidth={1.4} strokeDasharray="7 5" />;
          })}

          {/* 2. linhas */}
          {routes.map(({ key, edge, points }) => {
            const hi = hover === edge.from || hover === edge.to;
            const d = points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
            const dr = edge.dir ?? 'fwd';
            return (
              <path
                key={key}
                d={d}
                fill="none"
                stroke={hi ? 'var(--color-brand-500)' : 'var(--text-muted)'}
                strokeWidth={hi ? 2.2 : 1.6}
                strokeLinejoin="round"
                strokeDasharray={edge.style === 'dashed' ? '6 5' : undefined}
                markerEnd={dr === 'none' ? undefined : `url(#${uid}-arrow${hi ? '-hi' : ''})`}
                markerStart={dr === 'both' ? `url(#${uid}-arrow${hi ? '-hi' : ''})` : undefined}
                opacity={hover && !hi ? 0.22 : 1}
              />
            );
          })}

          {/* 3. etiquetas das zonas, por cima das linhas */}
          {zones.map((z) => {
            const st = ZONE_STYLE[z.tone ?? 'neutral'];
            const r = zoneRect(z);
            const text = z.label.toUpperCase();
            return (
              <g key={`${z.id}-label`}>
                <rect x={r.x + 9} y={r.y + 4} width={text.length * 6.4 + 14} height={18} rx={5} fill="var(--surface)" />
                <text x={r.x + 16} y={r.y + 17} fontSize={11} fontWeight={700} fill={st.label} letterSpacing="0.04em">{text}</text>
              </g>
            );
          })}

          {/* 4. nós */}
          {diagram.nodes.map((n) => {
            const b = boxes.get(n.id)!;
            const st = KIND_STYLE[n.kind ?? 'service'];
            const lines = wrap(n.label, 22);
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                opacity={dim(n.id) ? 0.5 : 1}
                style={{ cursor: 'default', transition: 'opacity .15s' }}
              >
                <rect
                  x={b.x} y={b.y} width={b.w} height={b.h}
                  rx={n.kind === 'user' || n.kind === 'external' ? 26 : 12}
                  fill={st.fill}
                  stroke={hover === n.id ? 'var(--color-brand-500)' : st.stroke}
                  strokeWidth={hover === n.id ? 2.2 : 1.6}
                  strokeDasharray={n.kind === 'note' ? '5 4' : undefined}
                />
                {n.kind === 'vector' && (
                  <g stroke={st.stroke} strokeWidth={1.2} fill="none" opacity={0.7}>
                    <path d={`M ${b.x + 10} ${b.y + 11} Q ${b.cx} ${b.y + 23} ${b.x + b.w - 10} ${b.y + 11}`} />
                    <path d={`M ${b.x + b.w - 26} ${b.y + b.h - 12} h 4 M ${b.x + b.w - 20} ${b.y + b.h - 12} h 8`} strokeLinecap="round" />
                  </g>
                )}
                {lines.map((l, i) => (
                  <text
                    key={i}
                    x={b.cx}
                    y={b.cy - (n.sub ? 6 : 0) - (lines.length - 1) * 8 + i * 16}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill={st.text}
                  >
                    {l}
                  </text>
                ))}
                {n.sub && (
                  <text x={b.cx} y={b.y + b.h - 16} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)" fontWeight={600}>
                    {n.sub.length > 30 ? n.sub.slice(0, 29) + '…' : n.sub}
                  </text>
                )}
              </g>
            );
          })}

          {/* 5. etiquetas das linhas, sempre por cima */}
          {routes.map(({ key, edge, label }) => {
            if (!edge.label) return null;
            const hi = hover === edge.from || hover === edge.to;
            const text = edge.label.length > 24 ? edge.label.slice(0, 23) + '…' : edge.label;
            const w = text.length * 6.1 + 12;
            return (
              <g key={`${key}-label`} opacity={hover && !hi ? 0.22 : 1}>
                <rect x={label[0] - w / 2} y={label[1] - 9.5} width={w} height={19} rx={6} fill="var(--surface)" stroke="var(--border-soft)" />
                <text x={label[0]} y={label[1] + 4} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)" fontWeight={600}>{text}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {diagram.caption && (
        <p className="mt-2 text-xs text-muted"><RichText text={diagram.caption} /></p>
      )}
    </figure>
  );
}
