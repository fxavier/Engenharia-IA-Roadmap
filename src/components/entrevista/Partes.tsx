import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NivelPergunta, PerguntaEntrevista, TipoPergunta } from '../../types';
import { NIVEIS, TIPOS } from '../../entrevista/blocos';
import { entrevista, NOTAS, useEntrevista, type Nota } from '../../entrevista/progresso';
import { BlockView } from '../Blocks';
import { RichText } from '../RichText';
import { getMeta } from '../../content';

export function TipoChip({ tipo, curto = false }: { tipo: TipoPergunta; curto?: boolean }) {
  const t = TIPOS[tipo];
  return <span className={`chip px-2 text-[0.66rem] font-semibold ${t.cor}`}>{curto ? t.curto : t.nome}</span>;
}

export function NivelChip({ nivel }: { nivel: NivelPergunta }) {
  const cls = nivel === 'staff'
    ? 'border-violet-400/50 text-violet-700 dark:text-violet-300'
    : nivel === 'senior' ? 'border-brand-400/60 text-brand-800 dark:text-brand-200' : 'border-soft text-muted';
  return <span className={`chip border px-2 text-[0.66rem] font-semibold ${cls}`}>{NIVEIS[nivel].nome}</span>;
}

export function formatarTempo(seg: number): string {
  const s = Math.max(0, Math.floor(Math.abs(seg)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${seg < 0 ? '−' : ''}${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** Cronómetro simples: conta segundos enquanto `activo`. */
export function useCronometro(activo: boolean, inicial = 0): [number, (s: number) => void] {
  const [seg, setSeg] = useState(inicial);
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activo]);
  return [seg, setSeg];
}

/** Barra de tempo: verde até ao alvo, âmbar nos últimos 20%, vermelha depois. */
export function BarraTempo({ seg, alvoMin }: { seg: number; alvoMin: number }) {
  const alvo = alvoMin * 60;
  const pct = Math.min(100, (seg / alvo) * 100);
  const passou = seg > alvo;
  const cor = passou ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <span className={`block h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`font-mono text-xs tabular ${passou ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-muted'}`}>
        {formatarTempo(seg)} / {alvoMin}:00
      </span>
    </div>
  );
}

export function RespostaModelo({ p }: { p: PerguntaEntrevista }) {
  return (
    <div className="prose-block min-w-0">
      {p.resposta.map((b, i) => <BlockView key={i} block={b} />)}
    </div>
  );
}

/** Checklist dos critérios + escala de nota + descrição dos níveis. */
export function RubricaPainel({ p, compacta = false, nota: notaFixa, definirNota }: {
  p: PerguntaEntrevista;
  compacta?: boolean;
  /** Quando presentes, a nota vem de fora (ex.: o relatório de uma simulação). */
  nota?: Nota;
  definirNota?: (n: Nota | undefined) => void;
}) {
  const st = useEntrevista();
  const marcados = st.criterios[p.id] ?? [];
  const nota = definirNota ? notaFixa : st.avaliacoes[p.id]?.nota;
  const escolher = (n: Nota) => {
    if (definirNota) definirNota(nota === n ? undefined : n);
    else if (nota === n) entrevista.limparAvaliacao(p.id);
    else entrevista.avaliar(p.id, n);
  };
  const cobertos = marcados.length;
  const sugerida: Nota = cobertos === 0 ? 0 : cobertos / p.rubrica.criterios.length >= 0.99 ? 3 : cobertos / p.rubrica.criterios.length >= 0.6 ? 2 : 1;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-2">O que o entrevistador procura · marca o que disseste</p>
        <ul className="space-y-1.5">
          {p.rubrica.criterios.map((c, i) => {
            const on = marcados.includes(i);
            return (
              <li key={i}>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[0.88rem] leading-snug transition ${on ? 'border-emerald-400/60 bg-emerald-500/8' : 'border-soft hover:bg-[var(--surface-sunken)]'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-emerald-600"
                    checked={on}
                    onChange={(e) => entrevista.marcarCriterio(p.id, i, e.target.checked)}
                  />
                  <span><RichText text={c} /></span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {!compacta && (
        <div className="grid gap-2 sm:grid-cols-3">
          {([['Fraco', p.rubrica.fraco, 'border-rose-300/60 dark:border-rose-500/30'], ['Sólido', p.rubrica.solido, 'border-sky-300/60 dark:border-sky-500/30'], ['Excelente', p.rubrica.excelente, 'border-emerald-300/60 dark:border-emerald-500/30']] as const).map(([n, t, c]) => (
            <div key={n} className={`rounded-xl border px-3 py-2.5 ${c}`}>
              <p className="mb-1 text-[0.7rem] font-bold tracking-wide text-strong uppercase">{n}</p>
              <p className="text-[0.82rem] leading-relaxed"><RichText text={t} /></p>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="eyebrow mb-2">A tua nota {cobertos > 0 && nota === undefined && <span className="ml-1 normal-case tracking-normal text-muted">(sugestão pelos critérios: {NOTAS[sugerida].nome})</span>}</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Auto-avaliação">
          {NOTAS.map((n) => (
            <button
              key={n.valor}
              role="radio"
              aria-checked={nota === n.valor}
              onClick={() => escolher(n.valor)}
              className={`rounded-full border px-3.5 py-1.5 text-[0.8rem] font-semibold transition ${nota === n.valor ? n.cor + ' ring-2 ring-offset-1 ring-offset-[var(--surface-raised)] ring-current/30' : 'border-soft text-muted hover:text-strong'} ${nota !== n.valor && sugerida === n.valor && cobertos > 0 ? 'border-dashed' : ''}`}
            >
              {n.nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SeguimentoEAlarmes({ p }: { p: PerguntaEntrevista }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-soft px-4 py-3">
        <p className="eyebrow mb-2">O entrevistador continua</p>
        <ul className="space-y-1.5 text-[0.88rem] leading-snug">
          {p.seguimento.map((s, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-brand-600">↳</span><span><RichText text={s} /></span></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border border-rose-300/50 bg-rose-50/50 px-4 py-3 dark:border-rose-500/25 dark:bg-rose-500/5">
        <p className="eyebrow mb-2 text-rose-700 dark:text-rose-300">Sinais de alarme</p>
        <ul className="space-y-1.5 text-[0.88rem] leading-snug">
          {p.sinaisAlarme.map((s, i) => <li key={i} className="flex gap-2"><span aria-hidden className="font-black text-rose-500">✕</span><span><RichText text={s} /></span></li>)}
        </ul>
      </div>
    </div>
  );
}

export function ModulosRelacionados({ ids }: { ids?: string[] }) {
  const ms = (ids ?? []).map(getMeta).filter((m): m is NonNullable<typeof m> => !!m);
  if (!ms.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[0.78rem]">
      <span className="text-muted">Rever no tutorial:</span>
      {ms.map((m) => (
        <Link key={m.id} to={`/modulo/${m.id}`} className="chip border border-soft bg-[var(--surface-raised)] px-2 py-0.5 text-body hover:text-strong">
          {m.icon} {m.number}. {m.title}
        </Link>
      ))}
    </div>
  );
}

/** Área de texto que cresce com o conteúdo e grava com atraso. */
export function CaixaResposta({ valor, onChange, placeholder, autoFocus, mono, minLinhas = 6 }: {
  valor: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; mono?: boolean; minLinhas?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 720)}px`;
  }, [valor]);
  return (
    <textarea
      ref={ref}
      value={valor}
      autoFocus={autoFocus}
      rows={minLinhas}
      spellCheck={!mono}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (mono && e.key === 'Tab') {
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: a, selectionEnd: b } = el;
          const novo = valor.slice(0, a) + '    ' + valor.slice(b);
          onChange(novo);
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
        }
      }}
      placeholder={placeholder}
      className={`field w-full resize-none leading-relaxed ${mono ? 'field-mono text-[0.84rem]' : 'text-[0.92rem]'}`}
    />
  );
}

export function contarPalavras(s: string): number {
  return (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}
