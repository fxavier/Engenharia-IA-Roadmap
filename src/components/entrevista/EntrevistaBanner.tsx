import { Link } from 'react-router-dom';
import { TODAS_PERGUNTAS, TOPICOS_META } from '../../entrevista';
import { pontuacao, useEntrevista } from '../../entrevista/progresso';

/** Chamada para a área «Entrevista», usada no início, no progresso e no módulo 32. */
export function EntrevistaBanner({ variante = 'larga' }: { variante?: 'larga' | 'compacta' }) {
  const st = useEntrevista();
  const total = TODAS_PERGUNTAS.length;
  const notas = Object.values(st.avaliacoes).map((a) => a.nota);
  const media = pontuacao(notas);
  if (!total) return null;

  if (variante === 'compacta') {
    return (
      <Link to="/entrevista" className="card card-hover flex items-center gap-4 px-5 py-4">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/12 text-xl">🎯</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-strong">Preparação para entrevista</span>
          <span className="text-[0.84rem] text-muted">
            {notas.length}/{total} perguntas avaliadas{media !== null && <> · média {media}/100</>} · {st.simulacoes.length} simulações
          </span>
        </span>
        <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{st.activa ? 'Continuar ronda →' : 'Abrir →'}</span>
      </Link>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-soft p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, color-mix(in oklch, oklch(0.62 0.19 25) 14%, var(--surface-raised)), var(--surface-raised) 60%)' }}>
      <span aria-hidden className="pointer-events-none absolute -top-8 -right-2 text-[8rem] leading-none opacity-[0.12] select-none">🎯</span>
      <p className="eyebrow mb-1">Novo · preparação para entrevista</p>
      <h2 className="relative max-w-2xl text-2xl leading-tight font-black sm:text-3xl">Vais a entrevistas de AI engineer? Treina como se fosse a sério.</h2>
      <p className="relative mt-3 max-w-2xl text-[0.95rem] leading-relaxed">
        {total} perguntas em {TOPICOS_META.length} tópicos — conceitos, trade-offs, system design de sistemas LLM, código ao vivo,
        debugging e comportamental — com resposta-modelo, rubrica para te avaliares e um simulador de rondas cronometradas.
      </p>
      <div className="relative mt-5 flex flex-wrap gap-2.5">
        <Link to="/entrevista" className="btn btn-primary">Começar a preparação →</Link>
        <Link to="/entrevista/simulacao" className="btn btn-ghost bg-[var(--surface-raised)]/70">⏱ {st.activa ? 'Continuar ronda' : 'Simular uma ronda'}</Link>
      </div>
    </section>
  );
}
