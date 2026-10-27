import { Link } from 'react-router-dom';
import { META, BY_PART, TOTAL, getMeta, partStats } from '../content';
import { PARTS, PROJECTO, VERSOES } from '../data/parts';
import { INTENCOES, CONVERSAS, TTFT_MS } from '../data/design';
import { ADR_IDS, TOOL_IDS, DOC_IDS } from '../data/ids';
import { TOTAL_SIMULADORES } from '../data/simuladores';
import { useProgress } from '../lib/progress';
import { RichText } from '../components/RichText';
import type { IntencaoSpec } from '../types';
import { Bolha, CAMINHO } from '../components/Conversa';
import { EntrevistaBanner } from '../components/entrevista/EntrevistaBanner';

const NUM = new Intl.NumberFormat('pt-PT');

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-soft bg-[var(--surface-raised)]/80 px-3.5 py-3 backdrop-blur">
      <p className="font-mono text-2xl font-black text-strong tabular">{value}</p>
      <p className="text-[0.72rem] text-muted">{label}</p>
    </div>
  );
}

function ChatDemo() {
  const c = CONVERSAS[0];
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500/25 via-transparent to-accent-500/20 blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-soft bg-[var(--surface-raised)] shadow-card">
        <div className="flex items-center gap-2.5 border-b border-soft px-4 py-3">
          <span className="relative flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
            B
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--surface-raised)] bg-emerald-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-strong">Balcão · suporte «Chega»</p>
            <p className="truncate text-[0.7rem] text-muted">{c.nome} · RAG + ferramentas</p>
          </div>
          <span className="chip bg-emerald-500/12 font-mono text-[0.62rem] text-emerald-700 dark:text-emerald-300">TTFT {NUM.format(TTFT_MS)} ms</span>
        </div>
        <div className="space-y-2 surface-sunken px-3 py-4 sm:px-4">
          {c.turnos.map((t, i) => (
            <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
              <Bolha quem={t.quem} texto={t.texto} pequena />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-soft px-4 py-2.5 text-[0.68rem] text-muted">
          <span>ferramentas:</span>
          {c.ferramentas.map((f) => <code key={f} className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono">{f}</code>)}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const state = useProgress();
  const last = state.lastModule ? getMeta(state.lastModule) : undefined;
  const seccoesFeitas = Object.values(state.sections).reduce((a, s) => a + s.length, 0);
  const pct = TOTAL.sections ? Math.round((seccoesFeitas / TOTAL.sections) * 100) : 0;
  const horas = Math.max(1, Math.round(TOTAL.minutes / 60));
  const primeiro = [...META].sort((a, b) => a.number - b.number)[0];
  const maxPeso = Math.max(...INTENCOES.map((i) => i.peso));

  return (
    <div className="pb-8">
      {/* ================================================================ herói */}
      <section className="hero-glow relative overflow-hidden border-b border-soft">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
          <div className="min-w-0">
            <p className="chip mb-4 border border-soft bg-[var(--surface-raised)]/80 text-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Tutorial interactivo · Python · português europeu
            </p>
            <h1 className="text-[2rem] leading-[1.1] font-black tracking-tight sm:text-5xl">
              Engenharia de IA,
              <br />
              <span className="text-gradient">a construir o «{PROJECTO.nome}»</span>
            </h1>
            <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-body">
              {PARTS.length} partes e {TOTAL.modules > 0 ? TOTAL.modules : 32} módulos que constroem uma coisa só: o
              assistente de suporte ao cliente do «{PROJECTO.marketplace}», um marketplace de entregas em Maputo e
              Matola. LLMs, RAG, bases vectoriais, LangChain, LangGraph, agentes, avaliação, FastAPI, Git, Docker e
              CI/CD — cada peça com o número que a justifica e a alternativa que ficou de fora.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {last ? (
                <Link to={`/modulo/${last.id}`} className="btn btn-primary btn-lg">Continuar: {last.icon} {last.title}</Link>
              ) : primeiro ? (
                <Link to={`/modulo/${primeiro.id}`} className="btn btn-primary btn-lg">Começar pelo módulo 1 →</Link>
              ) : (
                <Link to="/projecto" className="btn btn-primary btn-lg">Conhecer o projecto →</Link>
              )}
              <Link to="/playground" className="btn btn-ghost btn-lg bg-[var(--surface-raised)]/70">▶ Conversar com o «Balcão»</Link>
            </div>

            {pct > 0 && (
              <div className="mt-6 flex max-w-md items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <span className="block h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                </span>
                <span className="font-mono text-xs text-muted">{pct}% lido</span>
              </div>
            )}
          </div>

          <ChatDemo />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ============================================================ números */}
        <section className="-mt-px py-10">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <Metric value={String(TOTAL.modules)} label="módulos" />
            <Metric value={String(TOTAL.sections)} label="secções" />
            <Metric value={String(TOTAL.labs)} label="laboratórios" />
            <Metric value={String(TOTAL.questions)} label="perguntas de quiz" />
            <Metric value={String(ADR_IDS.length)} label="decisões (ADR)" />
            <Metric value={String(TOTAL_SIMULADORES)} label="simuladores" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Mais {TOTAL.useCases} casos de uso resolvidos, {TOTAL.exercises} exercícios, {TOOL_IDS.length} ferramentas do
            agente e um corpus de {DOC_IDS.length} documentos que corre no teu browser com Python (Pyodide).
            {TOTAL.minutes > 0 && <> Cerca de {horas} horas de leitura e prática.</>}
          </p>
        </section>

        {/* ============================================================== partes */}
        <section className="pb-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow mb-1">O percurso</p>
              <h2 className="text-2xl font-black">Seis partes, um sistema</h2>
            </div>
            <Link to="/progresso" className="link text-sm">Ver o teu progresso →</Link>
          </div>
          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {PARTS.map((p, idx) => {
              const mods = BY_PART[p.id] ?? [];
              const st = partStats(p.id);
              const feitos = mods.filter((m) => (state.sections[m.id] ?? []).length >= m.sections.length && m.sections.length > 0).length;
              return (
                <article key={p.id} className="card card-hover relative flex flex-col overflow-hidden p-5">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: p.accent }} />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.7rem] font-bold" style={{ color: p.accent }}>PARTE {idx + 1}</span>
                    {mods.length > 0 && <span className="font-mono text-[0.68rem] text-muted">{feitos}/{mods.length} · ≈ {Math.round(st.minutes / 60)} h</span>}
                  </div>
                  <h3 className="text-[1.05rem] leading-snug font-bold">{p.name.replace(/^[IVX]+ · /, '')}</h3>
                  <p className="mt-1.5 line-clamp-4 text-[0.84rem] leading-relaxed text-muted">{p.blurb}</p>
                  {mods.length > 0 ? (
                    <ul className="mt-3 space-y-0.5 border-t border-soft pt-3">
                      {mods.slice(0, 6).map((m) => (
                        <li key={m.id}>
                          <Link to={`/modulo/${m.id}`} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-[0.82rem] hover:bg-[var(--surface-sunken)]">
                            <span aria-hidden className="w-5 text-center">{m.icon}</span>
                            <span className="min-w-0 flex-1 truncate text-body">{m.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-soft pt-3 text-xs text-muted italic">Módulos em preparação.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <div className="pb-14"><EntrevistaBanner /></div>

        {/* ============================================================ intenções */}
        <section className="grid gap-8 pb-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow mb-1">O problema</p>
            <h2 className="text-2xl font-black">Porque é que os clientes escrevem</h2>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">
              {PROJECTO.factos[1]?.value} conversas por dia, sete intenções. Cada uma tem um caminho de resolução
              diferente — e é daqui que sai a arquitectura: nem tudo precisa de RAG, nem tudo pode ser autónomo.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(Object.keys(CAMINHO) as IntencaoSpec['caminho'][]).map((k) => (
                <span key={k} className={`chip ${CAMINHO[k].cls}`}>
                  {CAMINHO[k].nome} · {INTENCOES.filter((i) => i.caminho === k).reduce((a, i) => a + i.peso, 0)}%
                </span>
              ))}
            </div>
            <Link to="/projecto" className="btn btn-ghost mt-5">O projecto em detalhe →</Link>
          </div>
          <ul className="space-y-2">
            {INTENCOES.map((i) => (
              <li key={i.id} className="card px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-strong">{i.nome}</span>
                  <span className={`chip text-[0.64rem] ${CAMINHO[i.caminho].cls}`}>{CAMINHO[i.caminho].nome}</span>
                  <span className="w-10 text-right font-mono text-sm font-bold text-strong tabular">{i.peso}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full surface-sunken">
                  <div className="h-full rounded-full" style={{ width: `${(i.peso / maxPeso) * 100}%`, background: CAMINHO[i.caminho].cor }} />
                </div>
                <p className="mt-1.5 truncate text-[0.78rem] text-muted">«{i.exemplo}»</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================ conversas */}
        <section className="pb-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow mb-1">Conversas de referência</p>
              <h2 className="text-2xl font-black">O comportamento certo e a armadilha</h2>
            </div>
            <Link to="/projecto#conversas" className="link text-sm">Todas as {CONVERSAS.length} conversas →</Link>
          </div>
          <div className="grid gap-3.5 md:grid-cols-3">
            {CONVERSAS.filter((c) => ['reembolso-acima-limite', 'injeccao-nota', 'fora-de-ambito'].includes(c.id)).map((c) => (
              <article key={c.id} className="card flex flex-col overflow-hidden">
                <header className="border-b border-soft px-4 py-2.5">
                  <p className="text-sm font-bold text-strong">{c.nome}</p>
                </header>
                <div className="flex-1 space-y-2 surface-sunken px-3 py-3">
                  {c.turnos.slice(0, 2).map((t, i) => <Bolha key={i} quem={t.quem} texto={t.texto} pequena />)}
                </div>
                <p className="border-t border-soft px-4 py-2.5 text-[0.78rem] leading-relaxed text-muted">
                  <span className="font-semibold text-rose-600 dark:text-rose-300">Armadilha: </span>
                  <RichText text={c.armadilha} />
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================== praticar */}
        <section className="pb-14">
          <p className="eyebrow mb-1">Mãos na massa</p>
          <h2 className="mb-5 text-2xl font-black">Aprender a fazer, não só a ler</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: '/playground', t: 'Playground', d: 'Python no browser com o pacote `balcao`, e um chat com RAG que fala com um modelo simulado, com o Ollama local ou com a API de um fornecedor.', i: '▶' },
              { to: '/simuladores', t: 'Simuladores', d: `${TOTAL_SIMULADORES} simuladores: tokenizador, HNSW, chunking, RRF, grafo, checkpoints, juiz, injecção, SSE, Docker, CI/CD.`, i: '◎' },
              { to: '/laboratorios', t: 'Laboratórios', d: 'Código com verificação imediata; os de Python correm no browser quando passam.', i: '⌨' },
              { to: '/decisoes', t: 'Decisões', d: `${ADR_IDS.length} ADRs com contexto, opções, consequências e o que as validaria.`, i: '§' },
              { to: '/desenho', t: 'Desenho do sistema', d: 'Requisitos, capacidade, política de autonomia, modelos, orçamento de latência e riscos.', i: '▦' },
              { to: '/glossario', t: 'Glossário', d: 'Os termos do tutorial, de BPE a canário, com ligação ao módulo onde se aprofundam.', i: 'Aa' },
            ].map((x) => (
              <Link key={x.to} to={x.to} className="card card-hover group flex gap-3.5 p-4">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/12 font-mono text-sm font-bold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white dark:text-brand-300">
                  {x.i}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-strong">{x.t}</span>
                  <span className="block text-[0.84rem] leading-relaxed text-muted"><RichText text={x.d} /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ================================================================ stack */}
        <section className="rounded-3xl border border-soft surface-sunken p-5 sm:p-7">
          <p className="eyebrow mb-1">Versões de referência · Setembro de 2026</p>
          <h2 className="mb-4 text-xl font-black">A stack do laboratório</h2>
          <div className="flex flex-wrap gap-2">
            {VERSOES.map((v) => (
              <span key={v.peca} className="inline-flex items-center gap-1.5 rounded-xl border border-soft bg-[var(--surface-raised)] px-3 py-1.5 text-[0.8rem]" title={v.nota.replace(/`/g, '')}>
                <span className="font-semibold text-strong"><RichText text={v.peca} /></span>
                <span className="font-mono text-[0.72rem] text-muted"><RichText text={v.versao} /></span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Números de versão que mudam depressa escrevem-se como ordem de grandeza. Os preços e nomes de modelos
            comerciais mudam ainda mais depressa: o tutorial usa escalões (pequeno, médio, grande, local) e remete
            sempre para a página oficial do fornecedor.
          </p>
        </section>
      </div>
    </div>
  );
}
