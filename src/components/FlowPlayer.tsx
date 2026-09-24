import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flow, LaneKind, StepKind } from '../types';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';

const LANE_W = 168;
const HEAD_H = 62;
const ROW_H = 58;
const PAD_X = 18;
const PAD_B = 26;

const LANE_STYLE: Record<LaneKind, { stroke: string; fill: string; text: string }> = {
  client: { stroke: 'var(--border-soft)', fill: 'var(--surface-sunken)', text: 'var(--text-strong)' },
  service: { stroke: 'var(--color-brand-500)', fill: 'var(--surface-raised)', text: 'var(--text-strong)' },
  store: { stroke: 'var(--color-accent-600)', fill: 'var(--surface-raised)', text: 'var(--text-strong)' },
  broker: { stroke: 'oklch(0.62 0.18 300)', fill: 'var(--surface-raised)', text: 'var(--text-strong)' },
  external: { stroke: 'var(--text-muted)', fill: 'var(--surface-sunken)', text: 'var(--text-body)' },
  infra: { stroke: 'oklch(0.62 0.14 150)', fill: 'var(--surface-raised)', text: 'var(--text-strong)' },
  model: { stroke: 'oklch(0.62 0.19 320)', fill: 'var(--surface-raised)', text: 'var(--text-strong)' },
  human: { stroke: 'var(--color-accent-500)', fill: 'var(--surface-sunken)', text: 'var(--text-strong)' },
  agent: { stroke: 'var(--color-brand-600)', fill: 'color-mix(in oklch, var(--color-brand-500) 10%, var(--surface-raised))', text: 'var(--text-strong)' },
};

const STEP_STYLE: Record<StepKind, { color: string; dash?: string; label: string }> = {
  req: { color: 'var(--color-brand-600)', label: 'pedido' },
  res: { color: 'oklch(0.55 0.14 150)', dash: '7 5', label: 'resposta' },
  async: { color: 'oklch(0.58 0.18 300)', dash: '3 6', label: 'assíncrono' },
  err: { color: 'oklch(0.58 0.19 22)', label: 'erro' },
  self: { color: 'var(--text-muted)', label: 'interno' },
  note: { color: 'var(--text-muted)', dash: '2 4', label: 'nota' },
};

export function FlowPlayer({ flow }: { flow: Flow }) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | null>(null);

  const laneIndex = useMemo(
    () => new Map(flow.lanes.map((l, i) => [l.id, i])),
    [flow.lanes],
  );

  const total = flow.steps.length;
  const width = PAD_X * 2 + flow.lanes.length * LANE_W;
  const height = HEAD_H + total * ROW_H + PAD_B;
  const laneX = (id: string) => PAD_X + (laneIndex.get(id) ?? 0) * LANE_W + LANE_W / 2;

  useEffect(() => {
    if (!playing) return;
    if (cursor >= total) { setPlaying(false); return; }
    timer.current = window.setTimeout(() => setCursor((c) => c + 1), 1500 / speed);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [playing, cursor, total, speed]);

  useEffect(() => { setCursor(0); setPlaying(false); }, [flow.id]);

  const current = cursor > 0 ? flow.steps[cursor - 1] : undefined;
  const elapsed = flow.steps.slice(0, cursor).reduce((a, s) => a + (s.ms ?? 0), 0);
  const budget = flow.steps.reduce((a, s) => a + (s.ms ?? 0), 0);
  const uid = useMemo(() => 'fl' + Math.random().toString(36).slice(2, 7), []);

  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-soft surface-sunken px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-strong">▶ {flow.title}</p>
          {flow.intro && <p className="mt-0.5 text-xs text-muted"><RichText text={flow.intro} /></p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button className="btn btn-ghost btn-sm" onClick={() => { setPlaying(false); setCursor((c) => Math.max(0, c - 1)); }} disabled={cursor === 0} aria-label="Passo anterior">◀</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { if (cursor >= total) setCursor(0); setPlaying((p) => !p); }}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
          >
            {playing ? '❙❙ Pausa' : cursor >= total ? '↺ Repetir' : '▶ Reproduzir'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setPlaying(false); setCursor((c) => Math.min(total, c + 1)); }} disabled={cursor >= total} aria-label="Passo seguinte">▶</button>
          <select
            className="field w-auto px-2 py-1 text-xs"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Velocidade"
          >
            <option value={0.5}>0,5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </div>
      </header>

      <div className="flex items-center gap-3 border-b border-soft px-4 py-2">
        <input
          type="range"
          className="flex-1 accent-brand-600"
          min={0}
          max={total}
          value={cursor}
          onChange={(e) => { setPlaying(false); setCursor(Number(e.target.value)); }}
          aria-label="Posição no fluxo"
        />
        <span className="shrink-0 font-mono text-xs text-muted">{cursor}/{total}</span>
        {budget > 0 && (
          <span className="chip shrink-0 surface-sunken text-muted" title="Latência acumulada simulada">
            {elapsed} / {budget} ms
          </span>
        )}
      </div>

      <div className="border-b border-soft px-4 py-3">
        {!current && (
          <p className="text-sm text-muted">
            Carrega em <strong className="text-strong">Reproduzir</strong> para seguir o fluxo passo a passo, ou avança manualmente com ▶.
          </p>
        )}
        {current && (
          <div className="animate-fade-up">
            <p className="mb-1 flex flex-wrap items-center gap-2">
              <span className="chip surface-sunken text-muted">passo {cursor}</span>
              <span className="chip" style={{ background: 'color-mix(in oklch, ' + STEP_STYLE[current.kind ?? 'req'].color + ' 16%, transparent)', color: STEP_STYLE[current.kind ?? 'req'].color }}>
                {STEP_STYLE[current.kind ?? 'req'].label}
              </span>
              {current.ms !== undefined && <span className="chip surface-sunken text-muted">{current.ms} ms</span>}
              <span className="text-sm font-bold text-strong">{current.label}</span>
            </p>
            {current.detail && <p className="text-[0.89rem] leading-relaxed"><RichText text={current.detail} /></p>}
            {current.code && <CodeBlock code={current.code} lang={current.lang ?? 'text'} dense />}
          </div>
        )}
        {cursor >= total && flow.outro && (
          <p className="mt-3 rounded-xl border border-brand-300/60 bg-brand-50 px-3.5 py-2.5 text-[0.88rem] dark:border-brand-500/30 dark:bg-brand-500/10">
            <RichText text={flow.outro} />
          </p>
        )}
      </div>

      <div className="scrollbar-thin overflow-x-auto p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" style={{ minWidth: Math.min(width, 640) }} role="img" aria-label={flow.title}>
          <defs>
            {Object.entries(STEP_STYLE).map(([k, v]) => (
              <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={v.color} />
              </marker>
            ))}
          </defs>

          {/* linhas de vida */}
          {flow.lanes.map((l) => (
            <line
              key={`life-${l.id}`}
              x1={laneX(l.id)} y1={HEAD_H} x2={laneX(l.id)} y2={height - 8}
              stroke="var(--border-soft)" strokeWidth={1.4} strokeDasharray="4 6"
            />
          ))}

          {/* cabecalhos das pistas */}
          {flow.lanes.map((l) => {
            const st = LANE_STYLE[l.kind ?? 'service'];
            const x = laneX(l.id);
            const w = LANE_W - 16;
            return (
              <g key={l.id}>
                <rect x={x - w / 2} y={8} width={w} height={HEAD_H - 22} rx={10} fill={st.fill} stroke={st.stroke} strokeWidth={1.6} />
                <text x={x} y={l.sub ? 30 : 34} textAnchor="middle" fontSize={12} fontWeight={700} fill={st.text}>
                  {l.label.length > 20 ? l.label.slice(0, 19) + '…' : l.label}
                </text>
                {l.sub && (
                  <text x={x} y={43} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="var(--text-muted)">
                    {l.sub.length > 24 ? l.sub.slice(0, 23) + '…' : l.sub}
                  </text>
                )}
              </g>
            );
          })}

          {/* passos */}
          {flow.steps.map((s, i) => {
            if (i >= cursor) return null;
            const active = i === cursor - 1;
            const st = STEP_STYLE[s.kind ?? 'req'];
            const y = HEAD_H + i * ROW_H + ROW_H / 2;
            const x1 = laneX(s.from);
            const x2 = laneX(s.to);
            const self = s.from === s.to;
            const text = s.label.length > 30 ? s.label.slice(0, 29) + '…' : s.label;
            const tw = text.length * 5.9 + 14;
            const op = active ? 1 : 0.42;

            if (self) {
              const d = `M ${x1} ${y - 14} C ${x1 + 48} ${y - 16}, ${x1 + 48} ${y + 14}, ${x1 + 6} ${y + 12}`;
              return (
                <g key={i} opacity={op} className={active ? 'animate-slide-in' : undefined}>
                  <path d={d} fill="none" stroke={st.color} strokeWidth={active ? 2.2 : 1.5} strokeDasharray={st.dash} markerEnd={`url(#${uid}-${s.kind ?? 'req'})`} />
                  <rect x={x1 + 56} y={y - 10} width={tw} height={20} rx={6} fill="var(--surface)" stroke="var(--border-soft)" />
                  <text x={x1 + 56 + tw / 2} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={active ? 'var(--text-strong)' : 'var(--text-muted)'}>{text}</text>
                </g>
              );
            }

            const dir = x2 > x1 ? 1 : -1;
            return (
              <g key={i} opacity={op} className={active ? 'animate-slide-in' : undefined}>
                <line x1={x1 + dir * 4} y1={y} x2={x2 - dir * 8} y2={y} stroke={st.color} strokeWidth={active ? 2.4 : 1.5} strokeDasharray={st.dash} markerEnd={`url(#${uid}-${s.kind ?? 'req'})`} />
                <rect x={(x1 + x2) / 2 - tw / 2} y={y - 22} width={tw} height={19} rx={6} fill="var(--surface)" stroke={active ? st.color : 'var(--border-soft)'} />
                <text x={(x1 + x2) / 2} y={y - 8.5} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={active ? 'var(--text-strong)' : 'var(--text-muted)'}>{text}</text>
                {active && <circle cx={x2 - dir * 10} cy={y} r={5} fill={st.color} className="animate-ring" />}
              </g>
            );
          })}
        </svg>
      </div>

    </section>
  );
}
