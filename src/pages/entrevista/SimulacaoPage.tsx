import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { NivelPergunta, PerguntaEntrevista, TipoPergunta } from '../../types';
import { carregarPerguntas, PERGUNTA_META_DE, TOPICO_DA_PERGUNTA, TOPICOS_META } from '../../entrevista';
import { BLOCOS, NIVEIS, TIPOS } from '../../entrevista/blocos';
import { entrevista, NOTAS, pontuacao, useEntrevista, type Nota, type Simulacao } from '../../entrevista/progresso';
import { escolherPerguntas, FORMATO_DE, FORMATOS, minutosDe, prng, type FormatoRonda, type ParteRonda } from '../../entrevista/rondas';
import {
  BarraTempo, CaixaResposta, contarPalavras, formatarTempo, ModulosRelacionados, NivelChip,
  RespostaModelo, RubricaPainel, SeguimentoEAlarmes, TipoChip,
} from '../../components/entrevista/Partes';
import { RichText } from '../../components/RichText';

const MIN_SEGUIMENTO = 2;

export function SimulacaoPage() {
  const { id } = useParams();
  const st = useEntrevista();
  if (id) {
    const sim = st.simulacoes.find((s) => s.id === id);
    if (!sim) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-bold">Simulação não encontrada.</p>
          <p className="mt-1 text-sm text-muted">O histórico vive só neste browser.</p>
          <Link to="/entrevista/simulacao" className="btn btn-primary mt-5">Nova simulação</Link>
        </div>
      );
    }
    return <Relatorio sim={sim} />;
  }
  if (st.activa) return <EmCurso sim={st.activa} />;
  return <Configurar />;
}

/* ===================================================================== configurar */

function Configurar() {
  const [params] = useSearchParams();
  const st = useEntrevista();
  const topicosIniciais = (params.get('topicos') ?? '').split(',').filter((t) => TOPICOS_META.some((m) => m.id === t));
  const [formatoId, setFormatoId] = useState<string>(params.get('formato') ?? (topicosIniciais.length ? 'personalizada' : 'aprofundamento'));
  const [nivel, setNivel] = useState<NivelPergunta>('senior');
  const [priorizar, setPriorizar] = useState(true);
  const [topicos, setTopicos] = useState<string[]>(topicosIniciais);
  const [verTopicos, setVerTopicos] = useState(topicosIniciais.length > 0);
  const [tiposP, setTiposP] = useState<TipoPergunta[]>(['conceito', 'tradeoff', 'debug']);
  const [nP, setNP] = useState(5);
  const [seguimentoP, setSeguimentoP] = useState(true);
  const [semente, setSemente] = useState(() => Math.floor(Math.random() * 1e9));

  const formato: FormatoRonda = formatoId === 'personalizada'
    ? {
        id: 'personalizada', nome: 'Ronda personalizada', icon: '✎', descricao: '', comoCorre: 'Tu escolhes os tipos, os tópicos e quantas perguntas.',
        partes: [{ tipos: tiposP, n: nP }], seguimento: seguimentoP,
      }
    : FORMATO_DE[formatoId] ?? FORMATOS[0];

  const notas = useMemo(() => Object.fromEntries(Object.entries(st.avaliacoes).map(([k, v]) => [k, v.nota])), [st.avaliacoes]);
  const ids = useMemo(
    () => escolherPerguntas(TOPICOS_META, { partes: formato.partes, nivel, topicos, notas, priorizarFracas: priorizar, semente }),
    [formato, nivel, topicos, notas, priorizar, semente],
  );
  const minutos = minutosDe(ids, PERGUNTA_META_DE, formato.seguimento);
  const pedidas = formato.partes.reduce((a, p) => a + p.n, 0);
  const semConteudo = TOPICOS_META.length === 0;

  function comecar() {
    const sim: Simulacao = {
      id: `sim-${Date.now().toString(36)}`,
      formato: formato.id,
      nome: formato.nome,
      nivel,
      inicio: new Date().toISOString(),
      minutos,
      perguntas: ids.map((qid) => ({ id: qid, resposta: '', segundos: 0 })),
      indice: 0,
      fase: 'resposta',
      estado: 'a-decorrer',
      comSeguimento: formato.seguimento,
      notas: {},
    };
    entrevista.iniciar(sim);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      <nav className="mb-3 text-xs text-muted"><Link to="/entrevista" className="hover:text-strong">Entrevista</Link> / Simulação</nav>
      <h1 className="text-3xl font-black">Simulação cronometrada</h1>
      <p className="mt-2 max-w-2xl leading-relaxed">
        Uma ronda como as reais: não vês respostas até ao fim, o tempo conta e o entrevistador insiste.
        No fim comparas cada resposta com a resposta-modelo, avalias-te com a rubrica e ficas com um relatório.
      </p>

      <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-strong uppercase">1 · Formato da ronda</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...FORMATOS, { id: 'personalizada', nome: 'Personalizada', icon: '✎', descricao: 'Escolhes tipos, tópicos e número de perguntas.', partes: [] as ParteRonda[] } as unknown as FormatoRonda].map((f) => {
          const on = f.id === formatoId;
          const n = f.partes.reduce((a, p) => a + p.n, 0);
          return (
            <button
              key={f.id}
              onClick={() => setFormatoId(f.id)}
              aria-pressed={on}
              className={`card card-hover flex flex-col items-start gap-1.5 px-4 py-3.5 text-left ${on ? 'border-brand-500 ring-2 ring-brand-500/30' : ''}`}
            >
              <span className="flex w-full items-center gap-2">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-[var(--surface-sunken)] font-mono text-base">{f.icon}</span>
                <span className="font-bold text-strong">{f.nome}</span>
              </span>
              <span className="text-[0.8rem] leading-snug text-muted">{f.descricao}</span>
              {n > 0 && <span className="mt-auto pt-1 font-mono text-[0.66rem] text-muted">{n} {n === 1 ? 'pergunta' : 'perguntas'}{f.seguimento ? ' + seguimento' : ''}</span>}
            </button>
          );
        })}
      </div>

      {formatoId === 'personalizada' && (
        <div className="card mt-4 space-y-4 px-5 py-4">
          <div>
            <p className="eyebrow mb-2">Tipos de pergunta</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TIPOS) as TipoPergunta[]).map((t) => {
                const on = tiposP.includes(t);
                return (
                  <button key={t} onClick={() => setTiposP((xs) => on ? (xs.length > 1 ? xs.filter((x) => x !== t) : xs) : [...xs, t])}
                    className={`rounded-full border px-3 py-1 text-[0.8rem] font-semibold transition ${on ? TIPOS[t].cor + ' border-transparent' : 'border-soft text-muted hover:text-strong'}`}>
                    {TIPOS[t].nome}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-sm">
              <span className="eyebrow">Perguntas</span>
              <input type="range" min={1} max={12} value={nP} onChange={(e) => setNP(+e.target.value)} className="accent-brand-600" />
              <span className="w-6 font-mono font-bold text-strong tabular">{nP}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={seguimentoP} onChange={(e) => setSeguimentoP(e.target.checked)} className="size-4 accent-brand-600" />
              Perguntas de seguimento
            </label>
          </div>
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-strong uppercase">2 · Nível da vaga</h2>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(NIVEIS) as NivelPergunta[]).map((n) => (
          <button key={n} onClick={() => setNivel(n)} aria-pressed={nivel === n}
            className={`btn btn-sm ${nivel === n ? 'btn-primary' : 'btn-ghost'}`}>{NIVEIS[n].nome}</button>
        ))}
        <span className="text-xs text-muted">Pesa perguntas desse nível; aparecem algumas um nível acima, como nas entrevistas reais.</span>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={priorizar} onChange={(e) => setPriorizar(e.target.checked)} className="size-4 accent-brand-600" />
        Dar prioridade a perguntas que nunca fiz e às que avaliei como fracas ou parciais
      </label>

      <div className="mt-6">
        <button className="btn btn-ghost btn-sm" onClick={() => setVerTopicos((v) => !v)} aria-expanded={verTopicos}>
          {verTopicos ? '▾' : '▸'} Limitar a tópicos {topicos.length > 0 && <span className="chip ml-1 bg-brand-500/15 px-1.5 text-[0.65rem] text-brand-800 dark:text-brand-200">{topicos.length}</span>}
        </button>
        {verTopicos && (
          <div className="card mt-3 space-y-4 px-5 py-4">
            {BLOCOS.map((b) => {
              const ts = TOPICOS_META.filter((t) => t.bloco === b.id);
              if (!ts.length) return null;
              return (
                <div key={b.id}>
                  <p className="mb-1.5 flex items-center gap-2 text-[0.78rem] font-semibold text-strong"><span className="size-2 rounded-full" style={{ background: b.accent }} />{b.nome}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ts.map((t) => {
                      const on = topicos.includes(t.id);
                      return (
                        <button key={t.id} onClick={() => setTopicos((xs) => on ? xs.filter((x) => x !== t.id) : [...xs, t.id])}
                          className={`rounded-full border px-2.5 py-1 text-[0.76rem] transition ${on ? 'border-brand-500 bg-brand-500/12 font-semibold text-brand-800 dark:text-brand-200' : 'border-soft text-body hover:text-strong'}`}>
                          {t.icon} {t.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {topicos.length > 0 && <button className="link text-xs" onClick={() => setTopicos([])}>Limpar selecção</button>}
          </div>
        )}
      </div>

      <section className="card mt-8 overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-soft px-5 py-4">
          <div>
            <p className="eyebrow">A tua ronda</p>
            <p className="mt-0.5 text-lg font-bold text-strong">{formato.nome}</p>
          </div>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <span><span className="font-mono text-xl font-black text-strong tabular">{ids.length}</span> <span className="text-muted">perguntas</span></span>
            <span><span className="font-mono text-xl font-black text-strong tabular">≈ {minutos}</span> <span className="text-muted">min</span></span>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[0.9rem] leading-relaxed"><RichText text={formato.comoCorre} /></p>
          {ids.length < pedidas && !semConteudo && (
            <p className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-[0.82rem] dark:border-amber-500/30 dark:bg-amber-500/10">
              Só há {ids.length} de {pedidas} perguntas com estes filtros. Alarga os tópicos ou os tipos.
            </p>
          )}
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {ids.map((qid) => {
              const m = PERGUNTA_META_DE[qid];
              return <li key={qid}><TipoChip tipo={m.tipo} curto /></li>;
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Os enunciados só aparecem quando começares.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-soft surface-sunken px-5 py-3.5">
          <button className="btn btn-primary btn-lg" disabled={!ids.length} onClick={comecar}>⏱ Começar ronda</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSemente(Math.floor(Math.random() * 1e9))}>↻ Sortear outras perguntas</button>
        </div>
      </section>

      <Historico />
    </div>
  );
}

export function Historico({ limite }: { limite?: number }) {
  const st = useEntrevista();
  const lista = limite ? st.simulacoes.slice(0, limite) : st.simulacoes;
  if (!lista.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-strong uppercase">Simulações anteriores</h2>
      <ul className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-2xl border border-soft">
        {lista.map((s) => {
          const notas = Object.values(s.notas ?? {}) as Nota[];
          const pont = pontuacao(notas);
          const dur = s.fim ? Math.round((new Date(s.fim).getTime() - new Date(s.inicio).getTime()) / 60000) : 0;
          return (
            <li key={s.id}>
              <Link to={`/entrevista/simulacao/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[var(--surface-raised)] px-4 py-3 transition hover:bg-[var(--surface-sunken)]">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-strong">{FORMATO_DE[s.formato]?.icon ?? '✎'} {s.nome}</span>
                  <span className="text-xs text-muted">
                    {new Date(s.inicio).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })} · {NIVEIS[s.nivel].nome} · {s.perguntas.length} perguntas · {dur} min
                  </span>
                </span>
                <span className="text-xs text-muted">{notas.length}/{s.perguntas.length} avaliadas</span>
                <span className={`w-14 text-right font-mono text-lg font-black tabular ${pont === null ? 'text-muted' : pont >= 67 ? 'text-emerald-600 dark:text-emerald-400' : pont >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {pont === null ? '—' : pont}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ===================================================================== em curso */

function usePerguntas(ids: string[]): Record<string, PerguntaEntrevista> | null {
  const [mapa, setMapa] = useState<Record<string, PerguntaEntrevista> | null>(null);
  const chave = ids.join(',');
  useEffect(() => {
    let vivo = true;
    carregarPerguntas(ids).then((m) => { if (vivo) setMapa(m); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return mapa;
}

function EmCurso({ sim }: { sim: Simulacao }) {
  const navigate = useNavigate();
  const perguntas = usePerguntas(sim.perguntas.map((p) => p.id));
  const [confirmar, setConfirmar] = useState<'terminar' | 'descartar' | null>(null);
  const actual = sim.perguntas[sim.indice];
  const p = actual ? perguntas?.[actual.id] : undefined;
  const pausada = !!sim.pausada;
  const total = sim.perguntas.reduce((a, x) => a + x.segundos, 0);

  /* relógio: soma um segundo à pergunta em curso */
  useEffect(() => {
    if (pausada || !perguntas) return;
    const t = setInterval(() => {
      entrevista.actualizarActiva((s) => ({
        ...s,
        perguntas: s.perguntas.map((x, i) => (i === s.indice ? { ...x, segundos: x.segundos + 1 } : x)),
      }), true);
    }, 1000);
    return () => clearInterval(t);
  }, [pausada, perguntas]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); avancar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function terminar() {
    const id = entrevista.terminarActiva();
    if (id) navigate(`/entrevista/simulacao/${id}`, { replace: true });
  }

  function avancar(saltar = false) {
    if (!p || !actual) return;
    if (!saltar && sim.comSeguimento && sim.fase === 'resposta' && p.seguimento.length) {
      const r = prng(hash(sim.id + p.id));
      const s = p.seguimento[Math.floor(r() * p.seguimento.length)];
      entrevista.actualizarActiva((x) => ({
        ...x,
        fase: 'seguimento',
        perguntas: x.perguntas.map((q, i) => (i === x.indice ? { ...q, seguimento: s, inicioSeguimento: q.segundos } : q)),
      }));
      return;
    }
    if (saltar) {
      entrevista.actualizarActiva((x) => ({ ...x, perguntas: x.perguntas.map((q, i) => (i === x.indice ? { ...q, saltada: !q.resposta.trim() } : q)) }));
    }
    if (sim.indice >= sim.perguntas.length - 1) { terminar(); return; }
    entrevista.actualizarActiva((x) => ({ ...x, indice: x.indice + 1, fase: 'resposta' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!perguntas) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted">A preparar a ronda…</div>;
  }

  const emSeguimento = sim.fase === 'seguimento';
  const segFase = emSeguimento ? actual.segundos - (actual.inicioSeguimento ?? actual.segundos) : actual.segundos;
  const fases = p?.tipo === 'design' ? (FORMATO_DE[sim.formato]?.fases ?? null) : null;

  return (
    <div className="pb-12">
      <div className="sticky top-14 z-30 border-b border-soft bg-[color-mix(in_oklch,var(--surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="relative flex size-2.5">
            {!pausada && <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-60" />}
            <span className={`relative inline-flex size-2.5 rounded-full ${pausada ? 'bg-amber-500' : 'bg-rose-500'}`} />
          </span>
          <span className="text-sm font-bold text-strong">{sim.nome}</span>
          <span className="font-mono text-xs text-muted">pergunta {sim.indice + 1}/{sim.perguntas.length}</span>
          <span className="ml-auto font-mono text-sm tabular">
            <span className={total > sim.minutos * 60 ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-strong'}>{formatarTempo(total)}</span>
            <span className="text-muted"> / {sim.minutos}:00</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => entrevista.actualizarActiva((s) => ({ ...s, pausada: !s.pausada }))}>
            {pausada ? '▶ Retomar' : '❚❚ Pausa'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmar('terminar')}>Terminar</button>
        </div>
        <div className="flex h-1 w-full">
          {sim.perguntas.map((q, i) => (
            <span key={q.id} className={`h-full flex-1 border-r border-[var(--surface)] ${i < sim.indice ? 'bg-brand-500' : i === sim.indice ? 'bg-brand-500/45' : 'bg-[var(--surface-sunken)]'}`} />
          ))}
        </div>
      </div>

      {confirmar && (
        <div className="mx-auto mt-4 max-w-4xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            {confirmar === 'terminar' ? (
              <>
                <span className="font-semibold text-strong">Terminar agora? As perguntas que faltam ficam como não respondidas.</span>
                <button className="btn btn-primary btn-sm" onClick={terminar}>Terminar e ver relatório</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmar('descartar')}>Descartar sem guardar</button>
              </>
            ) : (
              <>
                <span className="font-semibold text-strong">Descartar a ronda? Nada fica no histórico.</span>
                <button className="btn btn-sm bg-rose-600 text-white" onClick={() => entrevista.descartarActiva()}>Descartar</button>
              </>
            )}
            <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setConfirmar(null)}>Continuar ronda</button>
          </div>
        </div>
      )}

      {!p ? (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-sm text-muted">Esta pergunta já não existe no conteúdo.</p>
          <button className="btn btn-primary mt-4" onClick={() => avancar(true)}>Seguinte</button>
        </div>
      ) : (
        <div className={`mx-auto max-w-4xl space-y-5 px-4 pt-6 sm:px-6 ${pausada ? 'pointer-events-none opacity-40 blur-[3px] select-none' : ''}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <TipoChip tipo={p.tipo} />
            <NivelChip nivel={p.nivel} />
            <span className="text-xs text-muted">{TOPICO_DA_PERGUNTA[p.id]?.titulo}</span>
          </div>

          <div className="card px-5 py-5">
            <p className="eyebrow mb-2">O entrevistador pergunta</p>
            <p className="text-[1.08rem] leading-relaxed font-medium text-strong"><RichText text={p.enunciado} /></p>
            {p.contexto && (
              <p className="mt-4 rounded-xl bg-[var(--surface-sunken)] px-4 py-3 text-[0.9rem] leading-relaxed">
                <span className="mr-1.5 font-semibold text-strong">Contexto:</span><RichText text={p.contexto} />
              </p>
            )}
          </div>

          {fases && !emSeguimento && <Fases fases={fases} minutos={p.minutos} seg={actual.segundos} />}

          {!emSeguimento ? (
            <div>
              <BarraTempo seg={actual.segundos} alvoMin={p.minutos} />
              <div className="mt-3">
                <CaixaResposta
                  key={p.id}
                  autoFocus
                  valor={actual.resposta}
                  mono={p.tipo === 'codigo'}
                  minLinhas={p.tipo === 'codigo' || p.tipo === 'design' ? 14 : 8}
                  onChange={(v) => entrevista.actualizarActiva((s) => ({ ...s, perguntas: s.perguntas.map((q, i) => (i === s.indice ? { ...q, resposta: v } : q)) }), true)}
                  placeholder={p.tipo === 'design' ? 'Requisitos e perguntas de clarificação…\nEstimativas…\nArquitectura (descreve os componentes e o fluxo)…\nAprofundamento…\nAvaliação…\nRiscos e trade-offs…' : p.tipo === 'codigo' ? 'def resolver(...):\n    ...' : 'Escreve como responderias em voz alta…'}
                />
              </div>
            </div>
          ) : (
            <div className="animate-fade-up space-y-3">
              <details className="rounded-2xl border border-soft px-4 py-2.5 text-[0.86rem]">
                <summary className="cursor-pointer text-muted">A tua resposta ({contarPalavras(actual.resposta)} palavras)</summary>
                <p className="mt-2 whitespace-pre-wrap">{actual.resposta || '—'}</p>
              </details>
              <div className="rounded-2xl border-2 border-brand-500/40 bg-brand-500/6 px-5 py-4">
                <p className="eyebrow mb-1.5 text-brand-800 dark:text-brand-200">O entrevistador insiste</p>
                <p className="text-[1.02rem] leading-relaxed font-medium text-strong"><RichText text={actual.seguimento ?? ''} /></p>
              </div>
              <BarraTempo seg={segFase} alvoMin={MIN_SEGUIMENTO} />
              <CaixaResposta
                key={p.id + '-s'}
                autoFocus
                valor={actual.respostaSeguimento ?? ''}
                minLinhas={5}
                onChange={(v) => entrevista.actualizarActiva((s) => ({ ...s, perguntas: s.perguntas.map((q, i) => (i === s.indice ? { ...q, respostaSeguimento: v } : q)) }), true)}
                placeholder="Resposta curta e concreta…"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={() => avancar()}>
              {!emSeguimento && sim.comSeguimento && p.seguimento.length ? 'Responder →' : sim.indice >= sim.perguntas.length - 1 ? 'Terminar ronda ✓' : 'Pergunta seguinte →'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => avancar(true)}>{emSeguimento ? 'Saltar seguimento' : 'Saltar pergunta'}</button>
            <span className="ml-auto hidden text-xs text-muted sm:inline"><kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd> avança</span>
          </div>
        </div>
      )}

      {pausada && (
        <div className="fixed inset-x-0 top-1/3 z-20 flex justify-center px-4">
          <div className="card px-8 py-6 text-center shadow-2xl">
            <p className="text-lg font-black text-strong">Em pausa</p>
            <p className="mt-1 text-sm text-muted">O tempo não conta. Numa entrevista real não há pausas — usa com moderação.</p>
            <button className="btn btn-primary mt-4" onClick={() => entrevista.actualizarActiva((s) => ({ ...s, pausada: false }))}>▶ Retomar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Fases({ fases, minutos, seg }: { fases: { nome: string; pct: number }[]; minutos: number; seg: number }) {
  let acum = 0;
  const total = minutos * 60;
  return (
    <div className="rounded-2xl border border-soft px-4 py-3">
      <p className="eyebrow mb-2">Onde devias estar</p>
      <ol className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {fases.map((f, i) => {
          const ini = acum; acum += (f.pct / 100) * total;
          const fim = acum;
          const estado = seg >= fim ? 'feito' : seg >= ini ? 'agora' : 'depois';
          return (
            <li key={i} className={`rounded-xl border px-2.5 py-2 text-[0.74rem] leading-snug transition ${estado === 'agora' ? 'border-brand-500 bg-brand-500/10 font-semibold text-strong' : estado === 'feito' ? 'border-soft text-muted line-through decoration-1' : 'border-soft text-body'}`}>
              <span className="block font-mono text-[0.62rem] text-muted no-underline">{Math.round(ini / 60)}–{Math.round(fim / 60)} min</span>
              {f.nome}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ===================================================================== relatório */

function Relatorio({ sim }: { sim: Simulacao }) {
  const navigate = useNavigate();
  const perguntas = usePerguntas(sim.perguntas.map((p) => p.id));
  const [aberta, setAberta] = useState<string | null>(sim.perguntas[0]?.id ?? null);
  const [apagar, setApagar] = useState(false);
  const notas = sim.notas ?? {};
  const avaliadas = Object.keys(notas).length;
  const pont = pontuacao(Object.values(notas) as Nota[]);
  const total = sim.perguntas.reduce((a, x) => a + x.segundos, 0);
  const respondidas = sim.perguntas.filter((x) => x.resposta.trim()).length;

  const porTipo = useMemo(() => {
    const m = new Map<TipoPergunta, Nota[]>();
    for (const q of sim.perguntas) {
      const tipo = PERGUNTA_META_DE[q.id]?.tipo;
      const n = notas[q.id];
      if (!tipo || n === undefined) continue;
      m.set(tipo, [...(m.get(tipo) ?? []), n]);
    }
    return [...m.entries()];
  }, [sim, notas]);

  const fracos = sim.perguntas.filter((q) => notas[q.id] !== undefined && notas[q.id] <= 1).map((q) => TOPICO_DA_PERGUNTA[q.id]).filter(Boolean);
  const topicosFracos = [...new Map(fracos.map((t) => [t.id, t])).values()];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      <nav className="mb-3 text-xs text-muted">
        <Link to="/entrevista" className="hover:text-strong">Entrevista</Link> / <Link to="/entrevista/simulacao" className="hover:text-strong">Simulação</Link> / Relatório
      </nav>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-black">{FORMATO_DE[sim.formato]?.icon ?? '✎'} {sim.nome}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Date(sim.inicio).toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short' })} · nível {NIVEIS[sim.nivel].nome}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-5xl font-black tabular ${pont === null ? 'text-muted' : pont >= 67 ? 'text-emerald-600 dark:text-emerald-400' : pont >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{pont ?? '—'}</p>
          <p className="text-xs text-muted">{pont === null ? 'avalia as respostas para ver a nota' : 'de 100, pela tua auto-avaliação'}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Numero v={`${formatarTempo(total)}`} l={`gasto · previsto ${sim.minutos} min`} alerta={total > sim.minutos * 60} />
        <Numero v={`${respondidas}/${sim.perguntas.length}`} l="respondidas" />
        <Numero v={`${avaliadas}/${sim.perguntas.length}`} l="avaliadas" />
        <Numero v={String(sim.perguntas.filter((q) => q.respostaSeguimento?.trim()).length)} l="seguimentos respondidos" />
      </div>

      {avaliadas < sim.perguntas.length && (
        <p className="mt-5 rounded-2xl border border-brand-300/60 bg-brand-50/70 px-4 py-3 text-[0.9rem] dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="font-semibold text-strong">Agora a parte que ensina:</span> abre cada pergunta, compara a tua resposta com a resposta-modelo, marca os critérios que cobriste e dá-te uma nota honesta.
        </p>
      )}

      {porTipo.length > 0 && (
        <div className="card mt-5 px-5 py-4">
          <p className="eyebrow mb-3">Por tipo de pergunta</p>
          <div className="space-y-2">
            {porTipo.map(([tipo, ns]) => {
              const p = pontuacao(ns) ?? 0;
              return (
                <div key={tipo} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0"><TipoChip tipo={tipo} /></span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                    <span className={`block h-full rounded-full ${p >= 67 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(p, 3)}%` }} />
                  </span>
                  <span className="w-10 text-right font-mono font-bold tabular">{p}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {sim.perguntas.map((q, i) => {
          const p = perguntas?.[q.id];
          const meta = PERGUNTA_META_DE[q.id];
          const n = notas[q.id];
          const on = aberta === q.id;
          return (
            <article key={q.id} className="card overflow-hidden">
              <button className="flex w-full items-start gap-3 px-5 py-3.5 text-left" onClick={() => setAberta(on ? null : q.id)} aria-expanded={on}>
                <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-strong">{meta?.titulo ?? q.id}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {meta && <TipoChip tipo={meta.tipo} curto />}
                    <span className={meta && q.segundos > meta.minutos * 60 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{formatarTempo(q.segundos)}{meta ? ` / ${meta.minutos} min` : ''}</span>
                    {!q.resposta.trim() && <span className="chip bg-[var(--surface-sunken)] px-1.5">sem resposta</span>}
                  </span>
                </span>
                {n !== undefined ? <span className={`chip shrink-0 border px-2 text-[0.66rem] font-bold ${NOTAS[n].cor}`}>{NOTAS[n].nome}</span> : <span className="chip shrink-0 border border-dashed border-soft px-2 text-[0.66rem] text-muted">por avaliar</span>}
                <span aria-hidden className={`mt-1 shrink-0 text-[0.65rem] text-muted transition ${on ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {on && (
                <div className="space-y-5 border-t border-soft px-5 py-5">
                  {!p ? <p className="text-sm text-muted">A carregar…</p> : (
                    <>
                      <div className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-3">
                        <p className="text-[0.98rem] leading-relaxed text-strong"><RichText text={p.enunciado} /></p>
                        {p.contexto && <p className="mt-2 text-[0.85rem] leading-relaxed text-muted"><RichText text={p.contexto} /></p>}
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <section className="min-w-0">
                          <p className="eyebrow mb-2">A tua resposta · {contarPalavras(q.resposta)} palavras</p>
                          <div className={`max-h-[34rem] overflow-auto rounded-2xl border border-soft px-4 py-3 text-[0.88rem] leading-relaxed whitespace-pre-wrap scrollbar-thin ${p.tipo === 'codigo' ? 'font-mono text-[0.8rem]' : ''}`}>
                            {q.resposta.trim() || <span className="text-muted italic">Não respondeste.</span>}
                          </div>
                          {q.seguimento && (
                            <div className="mt-3 rounded-2xl border border-brand-400/40 px-4 py-3 text-[0.86rem]">
                              <p className="font-semibold text-strong">↳ <RichText text={q.seguimento} /></p>
                              <p className="mt-1.5 whitespace-pre-wrap">{q.respostaSeguimento?.trim() || <span className="text-muted italic">Sem resposta.</span>}</p>
                            </div>
                          )}
                        </section>
                        <section className="min-w-0">
                          <p className="eyebrow mb-2">Resposta-modelo</p>
                          <div className="max-h-[34rem] overflow-auto rounded-2xl border border-brand-400/40 px-4 py-1 scrollbar-thin">
                            <RespostaModelo p={p} />
                          </div>
                        </section>
                      </div>
                      <div className="rounded-2xl border border-soft px-4 py-4">
                        <RubricaPainel p={p} nota={n} definirNota={(v) => entrevista.notaSimulacao(sim.id, q.id, v)} />
                      </div>
                      <SeguimentoEAlarmes p={p} />
                      <div className="flex flex-wrap items-center gap-3">
                        <ModulosRelacionados ids={p.modulos} />
                        <Link to={`/entrevista/t/${TOPICO_DA_PERGUNTA[q.id]?.id}?p=${q.id}`} className="link ml-auto text-xs">Abrir no tópico →</Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {topicosFracos.length > 0 && (
        <section className="card mt-6 px-5 py-4">
          <p className="eyebrow mb-2">Rever antes da próxima ronda</p>
          <div className="flex flex-wrap gap-1.5">
            {topicosFracos.map((t) => (
              <Link key={t.id} to={`/entrevista/t/${t.id}`} className="chip border border-soft bg-[var(--surface-raised)] px-2.5 py-1 text-[0.8rem] text-body hover:text-strong">{t.icon} {t.titulo}</Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link to={`/entrevista/simulacao?formato=${FORMATO_DE[sim.formato] ? sim.formato : 'aprofundamento'}`} className="btn btn-primary">⏱ Nova ronda deste formato</Link>
        <Link to="/entrevista" className="btn btn-ghost">Voltar à preparação</Link>
        {!apagar ? (
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setApagar(true)}>Apagar do histórico</button>
        ) : (
          <span className="ml-auto flex items-center gap-2 text-sm">
            Apagar mesmo?
            <button className="btn btn-sm bg-rose-600 text-white" onClick={() => { entrevista.apagarSimulacao(sim.id); navigate('/entrevista/simulacao', { replace: true }); }}>Apagar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setApagar(false)}>Não</button>
          </span>
        )}
      </div>
    </div>
  );
}

function Numero({ v, l, alerta }: { v: string; l: string; alerta?: boolean }) {
  return (
    <div className="rounded-2xl border border-soft bg-[var(--surface-raised)] px-3.5 py-3">
      <p className={`font-mono text-xl font-black tabular ${alerta ? 'text-rose-600 dark:text-rose-400' : 'text-strong'}`}>{v}</p>
      <p className="text-[0.72rem] text-muted">{l}</p>
    </div>
  );
}

