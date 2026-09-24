import { useEffect, useMemo, useRef, useState } from 'react';
import { CONVERSAS } from '../data/design';
import { SNAPSHOT } from '../data/snapshot';
import {
  FORNECEDORES,
  SISTEMA_BALCAO,
  SISTEMA_SEM_RAG,
  explicarErro,
  gerar,
  montarMensagem,
  recuperarNoBrowser,
  type ChunkUsado,
  type Fornecedor,
  type MensagemChat,
  type Uso,
} from '../lib/chat';
import { custoMzn, estimarTokens, formatarMzn } from '../lib/custo';
import { estadoPyodide, observarPyodide, prepararPython, type ProgressoPyodide } from '../lib/pyodide';

/* ============================================================ preferências */

const PREFS = 'balcao:chat:prefs';

interface Prefs {
  fornecedor: Fornecedor;
  modelos: Partial<Record<Fornecedor, string>>;
  rag: boolean;
  k: number;
  urlOllama: string;
  lembrar: boolean;
}

const PREFS_OMISSAO: Prefs = { fornecedor: 'simulado', modelos: {}, rag: true, k: 3, urlOllama: 'http://localhost:11434', lembrar: false };

function lerPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS);
    return raw ? { ...PREFS_OMISSAO, ...(JSON.parse(raw) as Partial<Prefs>) } : PREFS_OMISSAO;
  } catch {
    return PREFS_OMISSAO;
  }
}

function guardarPrefs(p: Prefs) {
  try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* modo privado */ }
}

const chaveDe = (f: Fornecedor) => `balcao:chave:${f}`;

function lerChave(f: Fornecedor): string {
  try {
    return sessionStorage.getItem(chaveDe(f)) ?? localStorage.getItem(chaveDe(f)) ?? '';
  } catch {
    return '';
  }
}

function guardarChave(f: Fornecedor, valor: string, lembrar: boolean) {
  try {
    sessionStorage.removeItem(chaveDe(f));
    localStorage.removeItem(chaveDe(f));
    if (!valor) return;
    (lembrar ? localStorage : sessionStorage).setItem(chaveDe(f), valor);
  } catch { /* armazenamento indisponível: a chave fica só em memória */ }
}

/* ================================================================= tipos */

interface Metricas {
  fornecedor: Fornecedor;
  modelo: string;
  recuperacaoMs?: number;
  ttftMs?: number;
  totalMs?: number;
  uso?: Uso;
}

interface Turno {
  id: number;
  role: 'user' | 'assistant';
  texto: string;
  chunks?: ChunkUsado[] | null;
  metricas?: Metricas;
  erro?: string;
  fase?: 'a preparar o Python' | 'a recuperar' | 'a gerar' | null;
}

/* ================================================================= apoio */

function useProgressoPython(): ProgressoPyodide {
  const [p, setP] = useState<ProgressoPyodide>(() => estadoPyodide());
  useEffect(() => observarPyodide(setP), []);
  return p;
}

const ms = (x?: number) => (x === undefined ? '—' : x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(2).replace('.', ',')} s`);

/** Texto do assistente com as citações `[doc-id]` como chips; uma citação que
 *  não está nos chunks usados é marcada — é o que a guarda de saída verifica. */
function ComCitacoes({ texto, docs }: { texto: string; docs: Set<string> | null }) {
  const partes = texto.split(/(\[[a-z0-9-]+\])/g);
  return (
    <>
      {partes.map((p, i) => {
        if (!/^\[[a-z0-9-]+\]$/.test(p)) return <span key={i}>{p}</span>;
        const id = p.slice(1, -1);
        const valida = !docs || docs.has(id);
        return (
          <span
            key={i}
            title={valida ? 'Fonte citada, presente no contexto' : 'Citação que não está no contexto recuperado'}
            className={`mx-0.5 inline-flex rounded-md px-1.5 align-baseline font-mono text-[0.68rem] ${
              valida ? 'bg-accent-500/15 text-accent-800 dark:text-accent-300' : 'bg-rose-500/15 text-rose-700 line-through dark:text-rose-300'
            }`}
          >
            {id}
          </span>
        );
      })}
    </>
  );
}

function ChunksUsados({ chunks }: { chunks: ChunkUsado[] }) {
  const [aberto, setAberto] = useState(false);
  const max = Math.max(...chunks.map((c) => c.score), 1e-9);
  return (
    <div className="mt-2 rounded-xl border border-soft bg-[var(--surface-sunken)]">
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.72rem] text-muted" aria-expanded={aberto}>
        <span aria-hidden>⌕</span>
        <span className="flex-1">
          Contexto recuperado · {chunks.length} chunk{chunks.length === 1 ? '' : 's'} · re-rank, só vigentes e públicos
        </span>
        <span aria-hidden className={`transition ${aberto ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {!aberto ? (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {chunks.map((c) => (
            <span key={c.id} className="chip border border-soft bg-[var(--surface-raised)] font-mono text-[0.64rem] text-muted">
              {c.doc} · {c.score.toFixed(3)}
            </span>
          ))}
        </div>
      ) : (
        <ol className="space-y-1.5 px-3 pb-3">
          {chunks.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-soft bg-[var(--surface-raised)] p-2.5">
              <p className="flex items-center gap-2 text-[0.72rem]">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 font-mono text-[0.6rem] font-bold text-white">{i + 1}</span>
                <code className="font-mono font-semibold text-strong">{c.doc}</code>
                {c.titulo && <span className="min-w-0 truncate text-muted">{c.titulo}</span>}
                <span className="ml-auto font-mono text-muted">{c.score.toFixed(4)}</span>
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.score / max) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-body">{c.texto}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LinhaMetricas({ m }: { m: Metricas }) {
  const local = m.fornecedor === 'simulado' || m.fornecedor === 'ollama';
  const custo = m.uso ? custoMzn(m.uso.entrada, m.uso.saida, 'medio') : undefined;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.66rem] text-muted">
      <span className="chip bg-[var(--surface-sunken)] font-mono">{FORNECEDORES[m.fornecedor].nome.split(' (')[0]} · {m.modelo}</span>
      {m.recuperacaoMs !== undefined && <span className="chip bg-[var(--surface-sunken)] font-mono" title="Tempo da recuperação no browser (Pyodide)">recuperação {ms(m.recuperacaoMs)}</span>}
      {m.ttftMs !== undefined && <span className="chip bg-emerald-500/12 font-mono text-emerald-700 dark:text-emerald-300" title="Do envio ao primeiro token visível, incluindo a recuperação">TTFT {ms(m.ttftMs)}</span>}
      {m.totalMs !== undefined && <span className="chip bg-[var(--surface-sunken)] font-mono">total {ms(m.totalMs)}</span>}
      {m.uso && (
        <span className="chip bg-[var(--surface-sunken)] font-mono" title={m.uso.medido ? 'Tokens reportados pelo fornecedor' : 'Tokens estimados (≈ 3,6 caracteres por token)'}>
          {m.uso.medido ? '' : '≈ '}{m.uso.entrada} → {m.uso.saida} tok
        </span>
      )}
      {custo !== undefined && (
        <span className="chip bg-accent-500/12 font-mono text-accent-800 dark:text-accent-300" title="Preços de referência do escalão médio (design.ts), câmbio 63,9 MZN/USD, sem cache de prompt">
          {local ? `0 MZN local · ≈ ${formatarMzn(custo)} no escalão médio` : `≈ ${formatarMzn(custo)}`}
        </span>
      )}
    </div>
  );
}

/* ============================================================ componente */

export function ChatBalcao() {
  const [prefs, setPrefsState] = useState<Prefs>(lerPrefs);
  const [chave, setChave] = useState(() => lerChave(lerPrefs().fornecedor));
  const [mostrarChave, setMostrarChave] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState('');
  const [aCorrer, setACorrer] = useState(false);
  const [verPrompt, setVerPrompt] = useState(false);
  const [definicoes, setDefinicoes] = useState(false);
  const controlo = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const contador = useRef(0);
  const progresso = useProgressoPython();

  const f = FORNECEDORES[prefs.fornecedor];
  const modelo = prefs.modelos[prefs.fornecedor] ?? f.modeloPorOmissao;
  const precisaPython = prefs.fornecedor === 'simulado' || prefs.rag;

  const setPrefs = (p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const novo = { ...cur, ...p };
      guardarPrefs(novo);
      return novo;
    });
  };

  useEffect(() => { setChave(lerChave(prefs.fornecedor)); }, [prefs.fornecedor]);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turnos]);
  useEffect(() => () => controlo.current?.abort(), []);

  const sugestoes = useMemo(() => {
    const deConversas = CONVERSAS.map((c) => c.turnos.find((t) => t.quem === 'cliente')?.texto).filter((x): x is string => !!x);
    const douradas = SNAPSHOT.perguntas.map((p) => p.pergunta);
    return [...deConversas.slice(0, 4), ...douradas.filter((_, i) => i % 5 === 0)].slice(0, 10);
  }, []);

  const actualizar = (id: number, fn: (t: Turno) => Turno) => setTurnos((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  const enviar = async (pergunta: string) => {
    const q = pergunta.trim();
    if (!q || aCorrer) return;
    if (f.precisaChave && !chave) {
      setDefinicoes(true);
      return;
    }
    const historico: MensagemChat[] = turnos
      .filter((t) => !t.erro && t.texto)
      .slice(-6)
      .map((t) => ({ role: t.role, content: t.texto }));

    const idU = ++contador.current;
    const idA = ++contador.current;
    const metricas: Metricas = { fornecedor: prefs.fornecedor, modelo };
    setTurnos((ts) => [
      ...ts,
      { id: idU, role: 'user', texto: q },
      { id: idA, role: 'assistant', texto: '', metricas, fase: precisaPython && estadoPyodide().estado !== 'pronto' ? 'a preparar o Python' : prefs.rag ? 'a recuperar' : 'a gerar' },
    ]);
    setTexto('');
    setACorrer(true);
    const ac = new AbortController();
    controlo.current = ac;
    const t0 = performance.now();

    try {
      if (precisaPython) await prepararPython();
      let chunks: ChunkUsado[] | null = null;
      if (prefs.rag) {
        actualizar(idA, (t) => ({ ...t, fase: 'a recuperar' }));
        const tr = performance.now();
        chunks = await recuperarNoBrowser(q, prefs.k);
        metricas.recuperacaoMs = performance.now() - tr;
        actualizar(idA, (t) => ({ ...t, chunks, metricas: { ...metricas }, fase: 'a gerar' }));
      } else {
        actualizar(idA, (t) => ({ ...t, fase: 'a gerar' }));
      }

      const sistema = prefs.rag ? SISTEMA_BALCAO : SISTEMA_SEM_RAG;
      const mensagem = montarMensagem(q, chunks);
      let saida = '';
      const uso = await gerar({
        fornecedor: prefs.fornecedor,
        modelo,
        chave,
        urlOllama: prefs.urlOllama,
        sistema,
        historico,
        mensagem,
        pergunta: q,
        chunks: chunks ?? [],
        maxTokens: 600,
        sinal: ac.signal,
        aoToken: (tk) => {
          if (!saida) metricas.ttftMs = performance.now() - t0;
          saida += tk;
          actualizar(idA, (t) => ({ ...t, texto: saida, fase: null, metricas: { ...metricas } }));
        },
      });
      metricas.totalMs = performance.now() - t0;
      const entradaEstimada = estimarTokens(sistema) + historico.reduce((a, m) => a + estimarTokens(m.content), 0) + estimarTokens(mensagem);
      metricas.uso = uso.entrada > 0 || uso.saida > 0
        ? { entrada: uso.entrada || entradaEstimada, saida: uso.saida || estimarTokens(saida), medido: uso.medido }
        : { entrada: entradaEstimada, saida: estimarTokens(saida), medido: false };
      actualizar(idA, (t) => ({ ...t, texto: saida || '(resposta vazia)', fase: null, metricas: { ...metricas } }));
    } catch (e: unknown) {
      const interrompido = e instanceof DOMException && e.name === 'AbortError';
      metricas.totalMs = performance.now() - t0;
      actualizar(idA, (t) => ({
        ...t,
        fase: null,
        metricas: { ...metricas },
        erro: interrompido ? (t.texto ? undefined : 'Interrompido.') : explicarErro(e, prefs.fornecedor),
      }));
    } finally {
      setACorrer(false);
      controlo.current = null;
    }
  };

  const aquecer = () => { prepararPython().catch(() => { /* o estado mostra a falha */ }); };

  /* ------------------------------------------------------------- painel */
  const painel = (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-2">Fornecedor</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(FORNECEDORES) as Fornecedor[]).map((id) => (
            <button
              key={id}
              onClick={() => setPrefs({ fornecedor: id })}
              aria-pressed={prefs.fornecedor === id}
              className={`rounded-xl border px-2.5 py-2 text-left text-[0.78rem] font-semibold transition ${
                prefs.fornecedor === id ? 'border-brand-500 bg-brand-500/10 text-strong' : 'border-soft bg-[var(--surface-raised)] text-muted hover:text-strong'
              }`}
            >
              {FORNECEDORES[id].nome}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.74rem] leading-relaxed text-muted">{f.sub}</p>
      </div>

      {prefs.fornecedor !== 'simulado' && (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Modelo</span>
          <input
            className="field field-mono py-1.5 text-[0.82rem]"
            value={modelo}
            onChange={(e) => setPrefs({ modelos: { ...prefs.modelos, [prefs.fornecedor]: e.target.value } })}
            spellCheck={false}
          />
          <span className="mt-1 block text-[0.7rem] leading-relaxed text-muted">
            Valor por omissão para começar. Os nomes dos modelos mudam: confirma o identificador exacto na{' '}
            {f.documentacao ? <a className="link" href={f.documentacao} target="_blank" rel="noreferrer noopener">documentação do fornecedor</a> : 'documentação do fornecedor'}.
          </span>
        </label>
      )}

      {prefs.fornecedor === 'ollama' && (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Endereço do Ollama</span>
            <input className="field field-mono py-1.5 text-[0.82rem]" value={prefs.urlOllama} onChange={(e) => setPrefs({ urlOllama: e.target.value })} spellCheck={false} />
          </label>
          <div className="rounded-xl border border-sky-300/60 bg-sky-50/70 p-3 text-[0.74rem] leading-relaxed dark:border-sky-500/30 dark:bg-sky-500/10">
            <p className="mb-1 font-semibold text-strong">Para o browser poder falar com o Ollama</p>
            <p className="text-body">
              O Ollama só aceita pedidos de origens autorizadas. Arranca-o com esta página em{' '}
              <code className="font-mono">OLLAMA_ORIGINS</code>:
            </p>
            <pre className="scrollbar-thin mt-1.5 overflow-x-auto rounded-lg bg-[var(--surface-raised)] px-2 py-1.5 font-mono text-[0.7rem] text-strong">
              OLLAMA_ORIGINS="{typeof window !== 'undefined' ? window.location.origin : '*'}" ollama serve{'\n'}ollama pull {modelo}
            </pre>
            <p className="mt-1.5 text-muted">
              Alguns browsers bloqueiam pedidos de uma página https para http://localhost; se falhar, corre o
              tutorial localmente (<code className="font-mono">npm run dev</code>).
            </p>
          </div>
        </div>
      )}

      {f.precisaChave && (
        <div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Chave de API</span>
            <span className="flex gap-1.5">
              <input
                className="field field-mono py-1.5 text-[0.82rem]"
                type={mostrarChave ? 'text' : 'password'}
                value={chave}
                autoComplete="off"
                spellCheck={false}
                placeholder={prefs.fornecedor === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                onChange={(e) => { setChave(e.target.value); guardarChave(prefs.fornecedor, e.target.value, prefs.lembrar); }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => setMostrarChave((v) => !v)} aria-label={mostrarChave ? 'Esconder a chave' : 'Mostrar a chave'}>
                {mostrarChave ? 'Esconder' : 'Ver'}
              </button>
            </span>
          </label>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-[0.74rem] text-muted">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 accent-brand-600"
              checked={prefs.lembrar}
              onChange={(e) => { setPrefs({ lembrar: e.target.checked }); guardarChave(prefs.fornecedor, chave, e.target.checked); }}
            />
            <span>Lembrar neste browser (localStorage). Por omissão, a chave fica só em sessionStorage e desaparece quando fechas o separador.</span>
          </label>
          {chave && (
            <button className="link mt-1 text-[0.74rem]" onClick={() => { setChave(''); guardarChave(prefs.fornecedor, '', false); }}>
              Apagar a chave guardada
            </button>
          )}
          <div className="mt-2.5 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3 text-[0.74rem] leading-relaxed dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="mb-1 font-semibold text-amber-800 dark:text-amber-200">Aviso de segurança</p>
            <p className="text-body">
              O pedido vai directamente deste browser para o fornecedor, com a tua chave no cabeçalho. Qualquer
              extensão ou script nesta página a pode ler. Usa uma chave de teste, com limite de gastos, e
              revoga-a no fim. Em produção a chave nunca chega ao browser: fica no servidor FastAPI.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-soft bg-[var(--surface-raised)] p-3">
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <span>
            <span className="block text-sm font-semibold text-strong">Usar RAG</span>
            <span className="block text-[0.72rem] text-muted">recuperar no browser e citar as fontes</span>
          </span>
          <button
            role="switch"
            aria-checked={prefs.rag}
            onClick={() => setPrefs({ rag: !prefs.rag })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${prefs.rag ? 'bg-brand-600' : 'bg-[var(--border-soft)]'}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${prefs.rag ? 'left-[1.375rem]' : 'left-0.5'}`} />
          </button>
        </label>
        {prefs.rag && (
          <label className="mt-3 block">
            <span className="flex items-center justify-between text-xs text-muted">
              <span>k (chunks no contexto)</span>
              <span className="font-mono font-bold text-strong">{prefs.k}</span>
            </span>
            <input type="range" min={1} max={8} value={prefs.k} onChange={(e) => setPrefs({ k: Number(e.target.value) })} className="w-full accent-brand-600" />
          </label>
        )}
        <p className="mt-2 font-mono text-[0.66rem] leading-relaxed text-muted">
          {prefs.rag ? `recuperar(pergunta, ${prefs.k}, "rerank", filtro={"vigente": True, "publico": "cliente"})` : 'sem contexto: o modelo responde só com o que traz dos pesos'}
        </p>
      </div>

      <button className="link text-[0.78rem]" onClick={() => setVerPrompt((v) => !v)}>
        {verPrompt ? 'Esconder o prompt de sistema' : 'Ver o prompt de sistema'}
      </button>
      {verPrompt && (
        <pre className="scrollbar-thin max-h-72 overflow-auto rounded-xl border border-soft bg-[var(--surface-sunken)] p-3 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap text-body">
          {prefs.rag ? SISTEMA_BALCAO : SISTEMA_SEM_RAG}
          {prefs.rag && '\n\n— mensagem do cliente —\n<contexto>\n[doc-id] texto do chunk…\n</contexto>\n\nPergunta: …'}
        </pre>
      )}
    </div>
  );

  const pythonAviso = precisaPython && progresso.estado !== 'pronto';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* ================================================================ chat */}
      <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-soft bg-[var(--surface-raised)] shadow-card lg:h-[calc(100vh-11rem)] lg:min-h-[36rem]">
        <header className="flex items-center gap-3 border-b border-soft px-4 py-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
            B
            <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--surface-raised)] ${aCorrer ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-strong">Balcão</p>
            <p className="truncate text-[0.7rem] text-muted">
              {f.nome}{prefs.fornecedor !== 'simulado' ? ` · ${modelo}` : ''} · {prefs.rag ? `RAG k=${prefs.k}` : 'sem RAG'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setDefinicoes((v) => !v)} aria-expanded={definicoes}>
            ⚙ Definições
          </button>
          {turnos.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { controlo.current?.abort(); setTurnos([]); }} disabled={aCorrer}>
              Limpar
            </button>
          )}
        </header>

        {definicoes && <div className="border-b border-soft p-4 lg:hidden">{painel}</div>}

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-[var(--surface-sunken)] px-3 py-4 sm:px-5">
          {turnos.length === 0 && (
            <div className="mx-auto max-w-lg py-6 text-center">
              <p className="text-lg font-bold text-strong">Pergunta ao «Balcão»</p>
              <p className="mt-1 text-[0.86rem] text-muted">
                Com o fornecedor simulado, tudo corre no teu browser: o Python recupera os chunks do corpus e o
                modelo simulado responde por extracção, com a fonte citada. Troca de fornecedor para comparar com
                um modelo real, com e sem RAG.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {sugestoes.map((s) => (
                  <button key={s} onClick={() => void enviar(s)} className="rounded-full border border-soft bg-[var(--surface-raised)] px-3 py-1.5 text-left text-[0.78rem] text-body transition hover:border-brand-400 hover:text-strong">
                    {s}
                  </button>
                ))}
              </div>
              {pythonAviso && (
                <p className="mt-5 text-[0.74rem] text-muted">
                  {progresso.estado === 'a-carregar' ? (
                    <>A carregar o Python · {progresso.passo}…</>
                  ) : progresso.estado === 'indisponivel' ? (
                    <span className="text-rose-600 dark:text-rose-300">Sem Python no browser ({progresso.erro}). Desliga o RAG e usa o Ollama ou uma API.</span>
                  ) : (
                    <>A primeira pergunta descarrega o interpretador (≈ 10 MB). <button className="link" onClick={aquecer}>Carregar já</button></>
                  )}
                </p>
              )}
            </div>
          )}

          {turnos.map((t) =>
            t.role === 'user' ? (
              <div key={t.id} className="animate-fade-up flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-[0.9rem] leading-relaxed whitespace-pre-wrap text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]">
                  {t.texto}
                </p>
              </div>
            ) : (
              <div key={t.id} className="animate-fade-up flex gap-2.5">
                <span aria-hidden className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.7rem] font-black text-white">B</span>
                <div className="min-w-0 max-w-[88%] flex-1">
                  <div className="rounded-2xl rounded-tl-md border border-soft bg-[var(--surface-raised)] px-3.5 py-2.5 text-[0.9rem] leading-relaxed whitespace-pre-wrap text-body">
                    {t.fase && !t.texto && (
                      <span className="flex items-center gap-2 text-[0.8rem] text-muted">
                        <span className="flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-brand-500" />
                        </span>
                        {t.fase}…
                      </span>
                    )}
                    {t.texto && <ComCitacoes texto={t.texto} docs={t.chunks ? new Set(t.chunks.map((c) => c.doc)) : null} />}
                    {aCorrer && t.texto && !t.metricas?.totalMs && <span className="animate-caret ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-brand-500" />}
                    {t.erro && (
                      <span className="mt-1 block rounded-lg border border-rose-300/60 bg-rose-50 px-2.5 py-1.5 text-[0.8rem] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        {t.erro}
                      </span>
                    )}
                  </div>
                  {t.chunks && t.chunks.length > 0 && <ChunksUsados chunks={t.chunks} />}
                  {t.chunks && t.chunks.length === 0 && <p className="mt-1.5 text-[0.72rem] text-muted">Nenhum chunk passou o filtro: o modelo não tem contexto.</p>}
                  {t.metricas && (t.metricas.totalMs !== undefined || t.metricas.ttftMs !== undefined) && <LinhaMetricas m={t.metricas} />}
                </div>
              </div>
            ),
          )}
          <div ref={fim} />
        </div>

        <form
          className="border-t border-soft p-3"
          onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}
        >
          <div className="flex items-end gap-2">
            <textarea
              className="field scrollbar-thin max-h-40 min-h-[2.75rem] resize-none py-2.5 text-[0.9rem]"
              rows={1}
              value={texto}
              placeholder="Escreve como um cliente escreveria…"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto); }
              }}
              aria-label="Mensagem para o Balcão"
            />
            {aCorrer ? (
              <button type="button" className="btn btn-ghost h-[2.75rem]" onClick={() => controlo.current?.abort()}>Parar</button>
            ) : (
              <button type="submit" className="btn btn-primary h-[2.75rem]" disabled={!texto.trim()}>Enviar</button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-[0.68rem] text-muted">
            Enter envia · Shift+Enter muda de linha · tokens estimados a ≈ 3,6 caracteres por token quando o fornecedor não os reporta
          </p>
        </form>
      </section>

      {/* ============================================================ definições */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-3xl border border-soft bg-[var(--surface-raised)] p-4">
          {painel}
        </div>
      </aside>
    </div>
  );
}
