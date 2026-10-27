import { Link } from 'react-router-dom';
import type { TipoPergunta } from '../../types';
import { PERGUNTA_META_DE, TODAS_PERGUNTAS, TOPICO_DA_PERGUNTA, TOPICOS_META } from '../../entrevista';
import { BLOCOS, TIPOS } from '../../entrevista/blocos';
import { NOTAS, pontuacao, useEntrevista, type Nota } from '../../entrevista/progresso';
import { FORMATOS } from '../../entrevista/rondas';
import { Historico } from './SimulacaoPage';
import { TipoChip } from '../../components/entrevista/Partes';

const PLANO = [
  { semana: 'Semana 1', foco: 'Fundamentos que caem na triagem', texto: 'Blocos I e II: como funciona um LLM, APIs, prompts, tool calling, embeddings e RAG. Uma ronda de triagem no fim da semana.' },
  { semana: 'Semana 2', foco: 'Agentes, avaliação e segurança', texto: 'Blocos III e IV. Pratica as perguntas de trade-off em voz alta e faz duas rondas de aprofundamento.' },
  { semana: 'Semana 3', foco: 'Produção e código', texto: 'Bloco V e o tópico de código ao vivo: escreve cada solução sem olhar, depois compara. Uma ronda de debugging.' },
  { semana: 'Semana 4', foco: 'Rondas completas', texto: 'Dois system designs por dia, histórias comportamentais com números, e um loop completo a meio da semana. Revê só o que ficou fraco.' },
];

export function EntrevistaHome() {
  const st = useEntrevista();
  const total = TODAS_PERGUNTAS.length;
  const notas = Object.entries(st.avaliacoes).filter(([id]) => PERGUNTA_META_DE[id]).map(([, a]) => a.nota);
  const media = pontuacao(notas);
  const porTipo = (Object.keys(TIPOS) as TipoPergunta[]).map((t) => [t, TODAS_PERGUNTAS.filter((p) => p.tipo === t).length] as const).filter(([, n]) => n > 0);
  const paraRever = Object.keys(PERGUNTA_META_DE)
    .filter((id) => st.marcadas[id] || (st.avaliacoes[id] && st.avaliacoes[id].nota <= 1))
    .slice(0, 12);
  const pct = total ? Math.round((notas.length / total) * 100) : 0;

  return (
    <div className="pb-10">
      <section className="hero-glow relative overflow-hidden border-b border-soft">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <p className="chip mb-4 border border-soft bg-[var(--surface-raised)]/80 text-muted backdrop-blur">
            <span className="size-1.5 rounded-full bg-rose-500" /> Preparação para entrevista · AI engineer aplicado
          </p>
          <h1 className="max-w-3xl text-[2rem] leading-[1.1] font-black tracking-tight sm:text-5xl">
            Entra na entrevista <span className="text-gradient">como quem já pôs isto em produção</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed">
            {TOPICOS_META.length} tópicos e {total} perguntas reais de entrevista — conceitos, trade-offs, system design de
            sistemas LLM, código ao vivo, debugging e comportamental — cada uma com resposta-modelo, rubrica de
            auto-avaliação, perguntas de seguimento e os sinais que custam a vaga. Pratica por tópico ou faz uma ronda
            cronometrada sem rede.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {st.activa ? (
              <Link to="/entrevista/simulacao" className="btn btn-primary btn-lg">⏱ Continuar ronda em curso ({st.activa.indice + 1}/{st.activa.perguntas.length})</Link>
            ) : (
              <Link to="/entrevista/simulacao" className="btn btn-primary btn-lg">⏱ Começar uma simulação</Link>
            )}
            <a href="#topicos" className="btn btn-ghost btn-lg bg-[var(--surface-raised)]/70">Praticar por tópico ↓</a>
            <Link to="/entrevista/cabula" className="btn btn-ghost btn-lg bg-[var(--surface-raised)]/70">Cábula</Link>
          </div>

          <div className="mt-8 grid max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Metrica v={String(total)} l="perguntas com resposta-modelo" />
            <Metrica v={`${notas.length}`} l={`avaliadas por ti (${pct}%)`} />
            <Metrica v={media === null ? '—' : String(media)} l="média das tuas notas /100" />
            <Metrica v={String(st.simulacoes.length)} l="simulações feitas" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {porTipo.map(([t, n]) => <span key={t} className="flex items-center gap-1"><TipoChip tipo={t} /><span className="font-mono text-[0.68rem] text-muted">{n}</span></span>)}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-10">
          <p className="eyebrow mb-1">Como usar</p>
          <h2 className="mb-5 text-2xl font-black">Três modos, um objectivo: responder sem hesitar</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['1', 'Lê a cábula do tópico', 'Seis a dez factos, fórmulas e frases que tens de saber dizer de cor. Cinco minutos por tópico.'],
              ['2', 'Pratica com rubrica', 'Responde por escrito (ou em voz alta com o cronómetro), revela a resposta-modelo e marca os critérios que cobriste. A nota fica guardada.'],
              ['3', 'Simula a ronda', 'Sem respostas à vista, com tempo e perguntas de seguimento. No fim, um relatório lado a lado e o que rever.'],
            ].map(([n, t, d]) => (
              <div key={n} className="card px-5 py-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-500/15 font-mono font-black text-brand-800 dark:text-brand-200">{n}</span>
                <p className="mt-3 font-bold text-strong">{t}</p>
                <p className="mt-1 text-[0.88rem] leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow mb-1">Simulação</p>
              <h2 className="text-2xl font-black">Escolhe a ronda</h2>
            </div>
            <Link to="/entrevista/simulacao?formato=personalizada" className="link text-sm">Ronda personalizada →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATOS.map((f) => (
              <Link key={f.id} to={`/entrevista/simulacao?formato=${f.id}`} className="card card-hover flex flex-col gap-1.5 px-4 py-3.5">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-[var(--surface-sunken)] font-mono">{f.icon}</span>
                  <span className="font-bold text-strong">{f.nome}</span>
                </span>
                <span className="text-[0.8rem] leading-snug text-muted">{f.descricao}</span>
              </Link>
            ))}
          </div>
        </section>

        {paraRever.length > 0 && (
          <section className="pb-10">
            <p className="eyebrow mb-1">Para rever</p>
            <h2 className="mb-4 text-2xl font-black">O que ficou fraco ou marcaste</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {paraRever.map((id) => {
                const m = PERGUNTA_META_DE[id];
                const t = TOPICO_DA_PERGUNTA[id];
                const n = st.avaliacoes[id]?.nota as Nota | undefined;
                return (
                  <li key={id}>
                    <Link to={`/entrevista/t/${t.id}?p=${id}`} className="card card-hover flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] font-semibold text-strong">{m.titulo}</span>
                        <span className="text-xs text-muted">{t.icon} {t.titulo}</span>
                      </span>
                      {st.marcadas[id] && <span className="text-accent-600">★</span>}
                      {n !== undefined && <span className={`chip border px-2 text-[0.64rem] font-bold ${NOTAS[n].cor}`}>{NOTAS[n].nome}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section id="topicos" className="scroll-mt-20 pb-10">
          <p className="eyebrow mb-1">Praticar por tópico</p>
          <h2 className="mb-6 text-2xl font-black">Seis blocos, {TOPICOS_META.length} tópicos</h2>
          {TOPICOS_META.length === 0 && <p className="text-sm text-muted">O conteúdo ainda está a ser gerado.</p>}
          <div className="space-y-9">
            {BLOCOS.map((b) => {
              const ts = TOPICOS_META.filter((t) => t.bloco === b.id);
              if (!ts.length) return null;
              return (
                <div key={b.id}>
                  <div className="mb-3 flex items-start gap-3">
                    <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: b.accent }} />
                    <div>
                      <h3 className="text-lg font-black">{b.nome}</h3>
                      <p className="max-w-3xl text-[0.88rem] leading-relaxed text-muted">{b.blurb}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ts.map((t) => {
                      const ns = t.perguntas.map((p) => st.avaliacoes[p.id]?.nota).filter((n): n is Nota => n !== undefined);
                      const pc = Math.round((ns.length / t.perguntas.length) * 100);
                      const md = pontuacao(ns);
                      return (
                        <Link key={t.id} to={`/entrevista/t/${t.id}`} className="card card-hover group flex flex-col px-4 py-3.5">
                          <span className="flex items-start gap-3">
                            <span aria-hidden className="text-2xl">{t.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="font-mono text-[0.66rem] text-muted">{String(t.numero).padStart(2, '0')}</span>
                              <span className="block leading-snug font-bold text-strong group-hover:text-brand-800 dark:group-hover:text-brand-200">{t.titulo}</span>
                            </span>
                            {md !== null && (
                              <span className={`font-mono text-sm font-black tabular ${md >= 67 ? 'text-emerald-600 dark:text-emerald-400' : md >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{md}</span>
                            )}
                          </span>
                          <span className="mt-2 line-clamp-2 text-[0.8rem] leading-snug text-muted">{t.resumo}</span>
                          <span className="mt-auto flex items-center gap-2 pt-3">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                              <span className="block h-full rounded-full transition-all" style={{ width: `${pc}%`, background: b.accent }} />
                            </span>
                            <span className="font-mono text-[0.66rem] text-muted">{ns.length}/{t.perguntas.length}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pb-6">
          <p className="eyebrow mb-1">Plano sugerido</p>
          <h2 className="mb-4 text-2xl font-black">Quatro semanas até à entrevista</h2>
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {PLANO.map((p) => (
              <li key={p.semana} className="card px-4 py-3.5">
                <p className="font-mono text-[0.7rem] text-muted">{p.semana}</p>
                <p className="mt-0.5 font-bold text-strong">{p.foco}</p>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-muted">{p.texto}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            O módulo <Link to="/modulo/entrevista" className="link">32 · Preparação para entrevista de AI engineer</Link> resolve
            dois system designs de ponta a ponta com o «Balcão» — lê-o antes da semana 4.
          </p>
        </section>

        <Historico limite={6} />
      </div>
    </div>
  );
}

function Metrica({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl border border-soft bg-[var(--surface-raised)]/80 px-3.5 py-3 backdrop-blur">
      <p className="font-mono text-2xl font-black text-strong tabular">{v}</p>
      <p className="text-[0.72rem] text-muted">{l}</p>
    </div>
  );
}
