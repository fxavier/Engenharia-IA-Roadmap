import type { ReactNode } from 'react';
import { RichText } from '../RichText';

export function Frame({ title, hint, children, aside }: { title: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-soft surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-soft surface-sunken px-4 py-2.5">
        <p className="text-sm font-bold text-strong">{title}</p>
        {aside}
      </header>
      <div className="p-4">{children}</div>
      {hint && (
        <p className="border-t border-soft surface-sunken px-4 py-2 text-xs text-muted">
          <RichText text={hint} />
        </p>
      )}
    </section>
  );
}

export function Field({ label, suffix, children }: { label: string; suffix?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <span className="flex items-center gap-2">
        {children}
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export function NumberInput({ value, onChange, min, max, step = 1, className = '' }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; className?: string;
}) {
  return (
    <input
      type="number"
      className={`field field-mono ${className}`}
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function Slider({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (n: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <input
      type="range"
      className="w-full accent-brand-600"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-600" />
      <span className="text-body">{label}</span>
    </label>
  );
}

export function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const cls = {
    neutral: 'surface-sunken text-strong',
    good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    bad: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  }[tone];
  return (
    <div className={`rounded-xl border border-soft px-3.5 py-2.5 ${cls}`}>
      <p className="text-[0.68rem] font-bold tracking-widest uppercase opacity-70">{label}</p>
      <p className="font-mono text-base font-bold">{value}</p>
    </div>
  );
}

export function Bar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'accent' | 'good' | 'bad' }) {
  const bg = { brand: 'bg-brand-500', accent: 'bg-accent-500', good: 'bg-emerald-500', bad: 'bg-rose-500' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full surface-sunken">
      <div className={`h-full rounded-full ${bg} transition-all duration-300`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-soft surface-sunken p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'bg-brand-600 text-white' : 'text-muted hover:text-strong'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
