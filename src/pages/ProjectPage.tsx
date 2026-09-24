import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PROJECTO } from '../data/parts';
import { INTENCOES, CONVERSAS, FONTES, METRICAS } from '../data/design';
import { RichText } from '../components/RichText';
import { Bolha, CAMINHO } from '../components/Conversa';
import type { FonteSpec } from '../types';

const CONFIANCA: Record<FonteSpec['confianca'], string> = {
  alta: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  media: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  baixa: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

function Titulo({ id, eyebrow, titulo, children }: { id: string; eyebrow: string; titulo: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="mb-5 scroll-mt-20">
      <p className="eyebrow mb-1">{eyebrow}</p>
      <h2 className="text-xl font-black sm:text-2xl">{titulo}</h2>
      {children && <p className="mt-1.5 max-w-3xl text-[0.92rem] leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export function ProjectPage() {
  const location = useLocation();
  const [conversa, setConversa] = useState(CONVERSAS[0]?.id ?? '');
  const c = CONVERSAS.find((x) => x.id === conversa) ?? CONVERSAS[0];
  const maxPeso = Math.max(...INTENCOES.map((i) => i.peso));

  useEffect(() => {
    const alvo = location.hash.replace('#', '');
    if (!alvo) return;
    const t = setTimeout(() => document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* =============================================================== topo */}
      <header className="hero-glow relative mb-10 overflow-hidden rounded-3xl border border-soft p-5 sm:p-8">
        <p className="eyebrow mb-2">O projecto</p>
        <h1 className="text-3xl leading-tight font-black sm:text-4xl">
          «{PROJECTO.nome}» <span className="text-gradient">· {PROJECTO.tagline.toLowerCase()}</span>
        </h1>
        <p className="mt-4 max-w-3xl text-[0.97rem] leading-relaxed text-body"><RichText text={PROJECTO.resumo} /></p>
        <nav className="mt-5 flex flex-wrap gap-1.5 text-xs">
          {[
            ['numeros', 'Números'], ['equipa', 'Equipa'], ['intencoes', 'Intenções'], ['conversas', 'Conversas'],
            ['fontes', 'Fontes'], ['metricas', 'Métricas'],
          ].map(([id, n]) => (
            <a key={id} href={`#/projecto#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }} className="chip border border-soft bg-[var(--surface-raised)]/80 text-muted hover:text-strong">
              {n}
            </a>
          ))}
        </nav>
      </header>

      {/* ============================================================= factos */}
      <section className="mb-14">
        <Titulo id="numeros" eyebrow="Em números" titulo="O «Balcão» em oito números">
          Todos os módulos usam estes valores. Quando um número aparece num exemplo, vem daqui ou do pacote{' '}
          <code className="font-mono">balcao</code> — não se inventam outros.
        </Titulo>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROJECTO.factos.map((f) => (
            <div key={f.label} className="card p-4">
              <p className="text-xs font-semibold text-muted">{f.label}</p>
              <p className="mt-1 text-lg leading-tight font-black text-strong">{f.value}</p>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-muted"><RichText text={f.note} /></p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================= equipa */}
      <section className="mb-14">
        <Titulo id="equipa" eyebrow="Quem decide" titulo="A equipa à volta do sistema">
          Um assistente de suporte não é um projecto de IA: é um projecto de suporte, pagamentos e privacidade que
          usa IA. Cada decisão tem um dono fora da equipa de engenharia.
        </Titulo>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTO.equipa.map((p) => (
            <div key={p.nome} className="flex gap-3 rounded-2xl border border-soft surface p-4">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500/12 text-sm font-black text-brand-700 dark:text-brand-300">
                {p.nome.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-strong">{p.nome}</p>
                <p className="text-[0.84rem] leading-relaxed text-muted">{p.papel}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================== intenções */}
      <section className="mb-14">
        <Titulo id="intencoes" eyebrow="Porque escrevem os clientes" titulo="Intenções e caminhos de resolução">
          O peso de cada intenção decide onde se investe. Um terço das conversas resolve-se com uma chamada de
          ferramenta — RAG aí seria desperdício; os casos de saúde e fraude nunca ficam com o assistente.
        </Titulo>
        <div className="mb-4 flex h-4 overflow-hidden rounded-full" role="img" aria-label="Distribuição das conversas por intenção">
          {INTENCOES.map((i) => (
            <div key={i.id} title={`${i.nome}: ${i.peso}%`} style={{ width: `${i.peso}%`, background: CAMINHO[i.caminho].cor }} className="border-r-2 border-[var(--surface)] last:border-r-0" />
          ))}
        </div>
        <div className="space-y-2.5">
          {INTENCOES.map((i) => (
            <article key={i.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-bold text-strong">{i.nome}</p>
                <span className={`chip ${CAMINHO[i.caminho].cls}`}>{CAMINHO[i.caminho].nome}</span>
                <span className="chip surface-sunken text-muted">resolução alvo: {i.resolucaoAlvo}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full surface-sunken">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(i.peso / maxPeso) * 100}%`, background: CAMINHO[i.caminho].cor }} />
                </div>
                <span className="w-12 text-right font-mono text-sm font-bold text-strong tabular">{i.peso}%</span>
              </div>
              <p className="mt-2 text-[0.85rem] text-body italic">«{i.exemplo}»</p>
              <p className="mt-1 text-[0.84rem] leading-relaxed text-muted"><RichText text={i.nota} /></p>
            </article>
          ))}
        </div>
      </section>

      {/* ========================================================== conversas */}
      <section className="mb-14">
        <Titulo id="conversas" eyebrow="Conversas de referência" titulo="O que o sistema tem de fazer — e onde falha">
          Cada conversa é um teste: o comportamento certo, a armadilha em que um sistema ingénuo cai, os documentos
          que sustentam a resposta e as ferramentas que ela usa. Estão todas no conjunto dourado.
        </Titulo>
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <ul className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" role="tablist" aria-label="Conversas">
            {CONVERSAS.map((x) => (
              <li key={x.id} className="shrink-0">
                <button
                  role="tab"
                  aria-selected={x.id === c?.id}
                  onClick={() => setConversa(x.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-[0.84rem] transition ${
                    x.id === c?.id ? 'border-brand-400 bg-brand-500/10 font-semibold text-strong' : 'border-soft surface text-body hover:text-strong'
                  }`}
                >
                  {x.nome}
                  <span className="block text-[0.7rem] font-normal text-muted">{INTENCOES.find((i) => i.id === x.intencao)?.nome ?? x.intencao}</span>
                </button>
              </li>
            ))}
          </ul>

          {c && (
            <article key={c.id} className="animate-fade-up overflow-hidden rounded-2xl border border-soft surface shadow-card">
              <header className="border-b border-soft px-4 py-3">
                <p className="font-bold text-strong">{c.nome}</p>
                <p className="text-[0.84rem] text-muted"><RichText text={c.resumo} /></p>
              </header>
              <div className="space-y-2.5 surface-sunken px-3 py-4 sm:px-5">
                {c.turnos.map((t, i) => (
                  <div key={i}>
                    <p className={`mb-0.5 text-[0.65rem] font-semibold tracking-wider text-muted uppercase ${t.quem === 'cliente' ? 'text-right' : ''}`}>
                      {t.quem === 'cliente' ? 'cliente' : 'balcão'}
                    </p>
                    <Bolha quem={t.quem} texto={t.texto} />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="mb-1 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">Comportamento certo</p>
                  <p className="text-[0.86rem] leading-relaxed"><RichText text={c.comportamentoCerto} /></p>
                </div>
                <div className="rounded-xl border border-rose-300/60 bg-rose-50/70 p-3.5 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <p className="mb-1 text-xs font-bold tracking-wider text-rose-700 uppercase dark:text-rose-300">Armadilha</p>
                  <p className="text-[0.86rem] leading-relaxed"><RichText text={c.armadilha} /></p>
                </div>
              </div>
              <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-soft px-4 py-3 text-[0.78rem]">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted">documentos:</span>
                  {c.docs.length === 0 ? <span className="text-muted italic">nenhum</span> : c.docs.map((d) => (
                    <code key={d} className="rounded-md bg-accent-500/12 px-1.5 py-0.5 font-mono text-accent-800 dark:text-accent-300">{d}</code>
                  ))}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted">ferramentas:</span>
                  {c.ferramentas.map((f) => (
                    <Link key={f} to={`/ferramentas?f=${f}`} className="rounded-md bg-brand-500/12 px-1.5 py-0.5 font-mono text-brand-700 hover:underline dark:text-brand-300">{f}</Link>
                  ))}
                </span>
              </footer>
            </article>
          )}
        </div>
      </section>

      {/* ============================================================= fontes */}
      <section className="mb-14">
        <Titulo id="fontes" eyebrow="Base de conhecimento" titulo="De onde vem o que o «Balcão» sabe">
          Nem tudo o que o assistente consulta vai para o índice vectorial. O que muda em minutos, ou tem dados
          pessoais, lê-se por ferramenta.
        </Titulo>
        <div className="grid gap-3 md:grid-cols-2">
          {FONTES.map((f) => (
            <article key={f.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-bold text-strong">{f.nome}</p>
                <span className={`chip ${CONFIANCA[f.confianca]}`}>confiança {f.confianca === 'media' ? 'média' : f.confianca}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.8rem]">
                <dt className="text-muted">dono</dt><dd className="text-body">{f.dono}</dd>
                <dt className="text-muted">formato</dt><dd className="text-body">{f.formato}</dd>
                <dt className="text-muted">volume</dt><dd className="font-mono text-body">{f.volume}</dd>
                <dt className="text-muted">actualização</dt><dd className="text-body">{f.actualizacao}</dd>
              </dl>
              <p className="mt-2 border-t border-soft pt-2 text-[0.82rem] leading-relaxed text-muted"><RichText text={f.nota} /></p>
            </article>
          ))}
        </div>
      </section>

      {/* ============================================================ métricas */}
      <section className="mb-10">
        <Titulo id="metricas" eyebrow="Do negócio ao sistema" titulo="Métricas que interessam">
          Cada métrica de negócio tem uma métrica de sistema que a antecipa e um alvo com número. Sem essa
          ligação, as evals medem o que é fácil de medir, não o que importa.
        </Titulo>
        <div className="space-y-2.5">
          {METRICAS.map((m) => (
            <article key={m.negocio} className="grid gap-3 rounded-2xl border border-soft surface p-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold tracking-wider text-muted uppercase">Negócio</p>
                <p className="font-bold text-strong">{m.negocio}</p>
                <p className="text-[0.8rem] text-muted"><RichText text={m.definicao} /></p>
              </div>
              <span aria-hidden className="hidden text-muted md:block">→</span>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold tracking-wider text-muted uppercase">Sistema</p>
                <p className="font-semibold text-body"><RichText text={m.sistema} /></p>
                <p className="text-[0.8rem] text-muted"><RichText text={m.porque} /></p>
              </div>
              <span className="chip justify-self-start bg-brand-500/12 font-mono text-[0.72rem] text-brand-700 md:justify-self-end dark:text-brand-300"><RichText text={m.alvo} /></span>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-soft pt-6">
        <Link to="/desenho" className="btn btn-primary">Desenho do sistema →</Link>
        <Link to="/decisoes" className="btn btn-ghost">As decisões (ADR)</Link>
        <Link to="/playground" className="btn btn-ghost">Conversar com o «Balcão»</Link>
      </div>
    </div>
  );
}
