import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Frame, Field, Slider, Toggle, Stat, Segmented, NumberInput } from './shared';
import { RichText } from '../RichText';
import { ORCAMENTO_LATENCIA, TTFT_MS, CONVERSAS } from '../../data/design';
import { fmt, ms, custoMzn, estimarTokens, hashUnit, mover, moverPara, soma, CAMBIO } from './logica-b';
import type { Escalao } from './logica-b';

/* Produção — streaming SSE, Git, Docker, CI/CD, traços OpenTelemetry e o
   planeador de custo. Tempos e tokens saem de ORCAMENTO_LATENCIA, CAPACIDADE e
   MODELOS (`design.ts`); preços de modelo do snapshot, câmbio 63,9. */

const TONS = {
  brand: 'bg-brand-500/12 text-brand-700 dark:text-brand-300',
  accent: 'bg-accent-500/15 text-accent-800 dark:text-accent-300',
  good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  bad: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  muted: 'surface-sunken text-muted border border-soft',
} as const;
type Tom = keyof typeof TONS;

function Ic({ children }: { children: ReactNode }) {
  return <code className="rounded-md border border-soft surface-sunken px-1 py-px font-mono text-[0.85em] text-brand-700 dark:text-brand-300">{children}</code>;
}

function Chip({ tom = 'muted', children }: { tom?: Tom; children: ReactNode }) {
  return <span className={`chip ${TONS[tom]}`}>{children}</span>;
}

function Pre({ children, className = '', label, wrap = false }: { children: ReactNode; className?: string; label?: string; wrap?: boolean }) {
  return (
    <pre aria-label={label} className={`scrollbar-thin overflow-x-auto rounded-xl border border-soft surface-sunken p-3 font-mono text-[0.72rem] leading-relaxed text-body ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} ${className}`}>{children}</pre>
  );
}

function Nota({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-muted">{children}</p>;
}

const L = (...linhas: string[]) => linhas.join('\n');
const ORC = (fase: string) => ORCAMENTO_LATENCIA.find((x) => x.fase.startsWith(fase))?.ms ?? 0;
const TOK_POR_S = 60; // modelo médio: ≈ 60 tokens por segundo (MODELOS em design.ts)

/* ═══════════════════════════════════════════════════════════ 1. StreamingSse */

type CenarioS = 'rag' | 'ferramenta' | 'erro';
interface EventoS { t: number; tipo: 'token' | 'citacao' | 'ferramenta' | 'fim' | 'erro'; data: Record<string, unknown>; tokens: number }

const RESPOSTA_RAG =
  'Depende do meio de pagamento. No M-Pesa, o reembolso chega em até 24 horas depois de aprovado [pol-reembolso-prazos]. ' +
  'No cartão Visa demora 5 a 10 dias úteis, conforme o banco [pol-pagamento-cartao]. ' +
  'O pedido de reembolso tem de ser feito até 48 horas depois da entrega [pol-reembolso]. ' +
  'Se o valor não aparecer no tempo indicado, diga-me o número do pedido e verifico o estado.';
const RESPOSTA_FERR = CONVERSAS.find((c) => c.id === 'atraso-compensacao')?.turnos[1]?.texto ?? '';
const TITULOS_S: Record<string, string> = {
  'pol-reembolso-prazos': 'Prazos de reembolso por meio de pagamento',
  'pol-pagamento-cartao': 'Pagar com cartão',
  'pol-reembolso': 'Política de reembolsos',
  'pol-atraso-compensacao': 'Compensação por atraso',
};

function eventosS(c: CenarioS): { eventos: EventoS[]; fim: number; tokensTotal: number; entrada: number } {
  const texto = c === 'ferramenta' ? RESPOSTA_FERR : RESPOSTA_RAG;
  const ev: EventoS[] = [];
  let t = TTFT_MS;
  if (c === 'ferramenta') {
    // Classificação (435 ms), 1.ª chamada ao modelo decide ler_pedido, 2.ª decide calcular_reembolso; a 3.ª gera.
    ev.push({ t: 1802, tipo: 'ferramenta', data: { nome: 'ler_pedido', estado: 'inicio' }, tokens: 0 });
    ev.push({ t: 1922, tipo: 'ferramenta', data: { nome: 'ler_pedido', estado: 'fim', ok: true }, tokens: 0 });
    ev.push({ t: 2889, tipo: 'ferramenta', data: { nome: 'calcular_reembolso', estado: 'inicio' }, tokens: 0 });
    ev.push({ t: 2949, tipo: 'ferramenta', data: { nome: 'calcular_reembolso', estado: 'fim', ok: true }, tokens: 0 });
    t = 3174 + 700;
  }
  const palavras = texto.split(/(?<=\s)/);
  const total = palavras.length;
  let emitidos = 0;
  palavras.forEach((p, i) => {
    const n = estimarTokens(p.trim() || ' ');
    if (c === 'erro' && i > total * 0.42) return;
    ev.push({ t, tipo: 'token', data: { texto: p }, tokens: n });
    emitidos += n;
    const m = /\[([a-z0-9-]+)\]/.exec(p);
    if (m) ev.push({ t: t + 30, tipo: 'citacao', data: { doc: m[1], titulo: TITULOS_S[m[1]] ?? m[1] }, tokens: 0 });
    t += (n / TOK_POR_S) * 1000;
  });
  if (c === 'erro') {
    t += 400;
    ev.push({ t, tipo: 'erro', data: { type: '/problemas/modelo-indisponivel', title: 'Modelo indisponível', status: 503, detail: 'O fornecedor do modelo falhou a meio da resposta. Pode tentar outra vez.', instance: '/v1/conversas/cv-01K5T2M8QZ/mensagens' }, tokens: 0 });
  } else {
    t += ORC('Guardas de saída') + ORC('Persistir');
    const entrada = c === 'ferramenta' ? 4900 : 5200;
    ev.push({ t, tipo: 'fim', data: { mensagem_id: 'mg-01K5T2P4VA', tokens_entrada: entrada, tokens_saida: emitidos, tokens_cache: Math.round(entrada * 0.6), ttft_ms: Math.round(ev.find((e) => e.tipo === 'token')?.t ?? 0) }, tokens: 0 });
  }
  ev.sort((a, b) => a.t - b.t);
  return { eventos: ev, fim: t, tokensTotal: soma(palavras.map((p) => estimarTokens(p.trim() || ' '))), entrada: c === 'ferramenta' ? 4900 : 5200 };
}

function linhaSse(e: EventoS, id: number): string {
  return `event: ${e.tipo}\nid: ${id}\ndata: ${JSON.stringify(e.data)}\n`;
}

export function StreamingSse() {
  const [cen, setCen] = useState<CenarioS>('rag');
  const [t, setT] = useState(0);
  const [aCorrer, setACorrer] = useState(false);
  const [cancelAt, setCancelAt] = useState<number | null>(null);
  const [detecta, setDetecta] = useState(true);
  const [vel, setVel] = useState<'1' | '0.25'>('1');
  const raf = useRef<number | null>(null);

  const { eventos, fim, tokensTotal, entrada } = useMemo(() => eventosS(cen), [cen]);

  useEffect(() => { setT(0); setACorrer(false); setCancelAt(null); }, [cen]);
  useEffect(() => {
    if (!aCorrer) return;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      const dt = (agora - ultimo) * Number(vel);
      ultimo = agora;
      let parar = false;
      setT((x) => {
        const n = Math.min(fim, x + dt);
        if (n >= fim) parar = true;
        return n;
      });
      if (parar) setACorrer(false);
      else raf.current = requestAnimationFrame(passo);
    };
    raf.current = requestAnimationFrame(passo);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [aCorrer, fim, vel]);

  const corte = cancelAt ?? Infinity;
  const recebidos = eventos.filter((e) => e.t <= t && e.t <= corte);
  const texto = recebidos.filter((e) => e.tipo === 'token').map((e) => String(e.data.texto)).join('');
  const cites = recebidos.filter((e) => e.tipo === 'citacao');
  const ferrs = recebidos.filter((e) => e.tipo === 'ferramenta');
  const erro = recebidos.find((e) => e.tipo === 'erro');
  const acabou = recebidos.some((e) => e.tipo === 'fim' || e.tipo === 'erro');
  const tokensEmitidos = soma(recebidos.map((e) => e.tokens));
  const primeiro = eventos.find((e) => e.tipo === 'token')?.t ?? 0;
  const geradosAte = (lim: number) => soma(eventos.filter((e) => e.t <= lim).map((e) => e.tokens));
  const tokensPagos = cancelAt !== null ? (detecta ? geradosAte(cancelAt + 1000 / TOK_POR_S) : geradosAte(fim)) : geradosAte(Math.max(t, cen === 'erro' ? fim : t));
  const custoSaida = custoMzn(0, tokensPagos, 'medio');
  const desperdicio = Math.max(0, tokensPagos - tokensEmitidos);
  const naoStreaming = fim;

  const W = 400;
  const X = (v: number) => 12 + (v / fim) * (W - 24);
  const corTipo: Record<EventoS['tipo'], string> = { token: 'var(--color-brand-500)', citacao: 'rgb(16 185 129)', ferramenta: 'var(--color-accent-500)', fim: 'var(--text-strong)', erro: 'rgb(244 63 94)' };
  const cru = (recebidos.length > 10 ? ': … eventos anteriores\n\n' : '') + recebidos.map((e, i) => linhaSse(e, i + 1)).slice(-10).join('\n');

  const comecar = () => { setT(0); setCancelAt(null); setACorrer(true); };
  const cancelar = () => { if (aCorrer && !acabou) { setCancelAt(t); setACorrer(detecta ? false : true); } };

  return (
    <Frame
      title="Streaming por SSE"
      hint="Simulação de `POST /v1/conversas/{id}/mensagens` com `Accept: text/event-stream`, no formato de eventos da API do «Balcão». Tempos de `ORCAMENTO_LATENCIA` (primeiro token aos 1,36 s num turno RAG) e ≈ 60 tokens por segundo do modelo médio."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Turno">
          <Segmented value={cen} onChange={setCen} options={[{ value: 'rag', label: 'RAG (política)' }, { value: 'ferramenta', label: 'com ferramentas' }, { value: 'erro', label: 'erro a meio' }]} />
        </Field>
        <Field label="Velocidade">
          <Segmented value={vel} onChange={setVel} options={[{ value: '1', label: 'tempo real' }, { value: '0.25', label: '4× mais lento' }]} />
        </Field>
        <button type="button" className="btn btn-primary btn-sm" onClick={comecar}>Enviar mensagem</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelar} disabled={!aCorrer || acabou || cancelAt !== null}>Cancelar (cliente fecha a app)</button>
      </div>
      <div className="mt-2">
        <Toggle checked={detecta} onChange={setDetecta} label="o servidor verifica await request.is_disconnected() entre eventos" />
      </div>

      <svg viewBox={`0 0 ${W} 58`} className="mt-3 mx-auto block w-full max-w-3xl" role="img" aria-label="Linha temporal dos eventos SSE">
        <line x1={12} x2={W - 12} y1={22} y2={22} stroke="var(--border-soft)" strokeWidth={6} strokeLinecap="round" />
        <line x1={12} x2={X(Math.min(t, fim))} y1={22} y2={22} stroke="var(--color-brand-500)" strokeOpacity={0.35} strokeWidth={6} strokeLinecap="round" />
        {eventos.map((e, i) => (
          <line key={i} x1={X(e.t)} x2={X(e.t)} y1={e.tipo === 'token' ? 17 : 12} y2={e.tipo === 'token' ? 27 : 32} stroke={corTipo[e.tipo]} strokeWidth={e.tipo === 'token' ? 1 : 2} opacity={e.t <= t && e.t <= corte ? 1 : 0.3} />
        ))}
        <line x1={X(primeiro)} x2={X(primeiro)} y1={4} y2={40} stroke="var(--color-brand-500)" strokeDasharray="2 2" />
        <text x={X(primeiro)} y={50} fontSize={8} textAnchor="middle" fill="var(--text-muted)">TTFT {ms(primeiro)}</text>
        {cancelAt !== null && (
          <g>
            <line x1={X(cancelAt)} x2={X(cancelAt)} y1={4} y2={40} stroke="rgb(244 63 94)" strokeWidth={1.5} />
            <text x={Math.min(W - 30, X(cancelAt) + 3)} y={10} fontSize={8} fill="rgb(244 63 94)">cancelado</text>
          </g>
        )}
        <text x={W - 12} y={50} fontSize={8} textAnchor="end" fill="var(--text-muted)">{ms(fim)}</text>
        <circle cx={X(Math.min(t, fim))} cy={22} r={4} fill="var(--color-brand-600)" />
      </svg>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-muted">O que o cliente vê</p>
          <div className="min-h-32 rounded-xl border border-soft surface-sunken p-3 text-sm" aria-live="polite">
            <div className="flex flex-wrap gap-1.5">
              {ferrs.map((f, i) => <Chip key={i} tom="accent">{String(f.data.nome)} · {String(f.data.estado)}</Chip>)}
            </div>
            {t > 0 && !texto && !erro && cancelAt === null && <p className="mt-1 text-xs text-muted">a escrever…</p>}
            <p className="mt-1 text-body">{texto}{aCorrer && !acabou && cancelAt === null && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />}</p>
            {cites.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{cites.map((c, i) => <Chip key={i} tom="good">{String(c.data.titulo)}</Chip>)}</div>}
            {erro && <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-xs text-rose-700 dark:text-rose-300">{String(erro.data.detail)}</p>}
            {cancelAt !== null && <p className="mt-2 text-xs text-muted">Ligação fechada aos {ms(cancelAt)}.</p>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stat label="TTFT" value={ms(primeiro)} tone={primeiro <= 1500 ? 'good' : 'warn'} />
            <Stat label="Duração do turno" value={ms(fim)} />
            <Stat label="Tokens entregues" value={fmt(tokensEmitidos)} />
            <Stat label="Tokens pagos (saída)" value={`${fmt(tokensPagos)} · ${fmt(custoSaida, 4)} MZN`} tone={desperdicio > 0 ? 'bad' : 'neutral'} />
          </div>
          {cancelAt !== null && (
            <Nota>
              {detecta
                ? `O servidor viu a desconexão no evento seguinte, fechou o stream do fornecedor e parou: pagaste ${fmt(tokensPagos)} de ${fmt(tokensTotal)} tokens de saída.`
                : `Sem verificar a desconexão, o servidor continua a consumir o stream do fornecedor até ao fim: ${fmt(desperdicio)} tokens pagos que ninguém lê. A escala do «Balcão», são milhares por dia.`}
            </Nota>
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-muted">O que passa no fio (text/event-stream)</p>
          <Pre className="h-64 overflow-y-auto" label="Fluxo SSE recebido">{cru || '(à espera do primeiro byte…)'}</Pre>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-muted">Streaming contra resposta inteira (entrada de {fmt(entrada)} tokens, os mesmos em ambos)</p>
        <svg viewBox={`0 0 ${W} 44`} className="mx-auto block w-full max-w-3xl" role="img" aria-label="Comparação do momento em que o cliente vê texto, com e sem streaming">
          <text x={0} y={12} fontSize={8} fill="var(--text-muted)">SSE</text>
          <rect x={40} y={4} width={(primeiro / naoStreaming) * (W - 50)} height={10} rx={3} fill="var(--border-soft)" />
          <rect x={40 + (primeiro / naoStreaming) * (W - 50)} y={4} width={(1 - primeiro / naoStreaming) * (W - 50)} height={10} rx={3} fill="var(--color-brand-500)" opacity={0.75} />
          <text x={0} y={34} fontSize={8} fill="var(--text-muted)">JSON</text>
          <rect x={40} y={26} width={W - 50} height={10} rx={3} fill="var(--border-soft)" />
          <circle cx={W - 10} cy={31} r={4} fill="var(--color-accent-500)" />
        </svg>
        <p className="text-xs text-muted">Sem streaming o custo em tokens é igual, mas o cliente olha para um indicador de espera durante {ms(naoStreaming)} em vez de {ms(primeiro)}. O conector de WhatsApp usa JSON porque não consegue mostrar texto parcial.</p>
      </div>

      <div className="scrollbar-thin mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="text-muted"><tr><th className="py-1 pr-2" /><th className="pr-2">SSE</th><th className="pr-2">WebSocket</th><th>JSON (sem streaming)</th></tr></thead>
          <tbody className="text-body">
            <tr className="border-t border-soft"><td className="py-1 pr-2 font-semibold text-strong">Direcção</td><td className="pr-2">servidor → cliente (o pedido é um POST normal)</td><td className="pr-2">bidireccional</td><td>pedido → resposta</td></tr>
            <tr className="border-t border-soft"><td className="py-1 pr-2 font-semibold text-strong">Infra</td><td className="pr-2">HTTP comum; atenção ao buffering de proxies</td><td className="pr-2">upgrade de protocolo, ligação com estado, balanceamento mais difícil</td><td>trivial</td></tr>
            <tr className="border-t border-soft"><td className="py-1 pr-2 font-semibold text-strong">Retomar</td><td className="pr-2"><Ic>id</Ic> + <Ic>Last-Event-ID</Ic> (o servidor decide se suporta)</td><td className="pr-2">protocolo próprio</td><td><Ic>Idempotency-Key</Ic></td></tr>
            <tr className="border-t border-soft"><td className="py-1 pr-2 font-semibold text-strong">Quando</td><td className="pr-2">texto gerado por um modelo: o caso do «Balcão»</td><td className="pr-2">voz, co-edição, o cliente a interromper a meio</td><td>integrações que só querem o resultado</td></tr>
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 2. GitGrafo */

interface CommitG { id: string; msg: string; x: number; y: number; pais: string[]; orfao?: boolean }
type ModoGit = 'inicial' | 'merge' | 'rebase' | 'squash';

function sha(s: string): string {
  return Math.floor(hashUnit(s) * 0xfffffff).toString(16).padStart(7, '0');
}

const DX = 54;
const Y_MAIN = 62;
const Y_FEAT = 118;

function grafoGit(modo: ModoGit, breaking: boolean): { commits: CommitG[]; main: string; feat: string | null } {
  const f1msg = breaking ? 'feat(api)!: citações por frase no evento SSE' : 'feat(rag): re-ranking dos 20 primeiros';
  const base: CommitG[] = [
    { id: 'c1', msg: 'feat(rag): pesquisa híbrida com RRF', x: 0, y: Y_MAIN, pais: [] },
    { id: 'c2', msg: 'fix(api): cancelar a geração quando o cliente desliga', x: 1, y: Y_MAIN, pais: ['c1'] },
    { id: 'f1', msg: f1msg, x: 2, y: Y_FEAT, pais: ['c2'] },
    { id: 'c3', msg: 'chore(deps): actualizar langgraph para 1.0.x', x: 3, y: Y_MAIN, pais: ['c2'] },
    { id: 'f2', msg: 'prompt(sistema): pedir citação por frase', x: 4, y: Y_FEAT, pais: ['f1'] },
    { id: 'c4', msg: 'fix(guardas): mascarar NUIT nos logs', x: 5, y: Y_MAIN, pais: ['c3'] },
    { id: 'f3', msg: 'test(evals): 12 perguntas douradas de compensação', x: 6, y: Y_FEAT, pais: ['f2'] },
  ];
  if (modo === 'inicial') return { commits: base, main: 'c4', feat: 'f3' };
  if (modo === 'merge') return { commits: [...base, { id: 'm1', msg: 'Merge pull request #142 from feat/re-rank', x: 7, y: Y_MAIN, pais: ['c4', 'f3'] }], main: 'm1', feat: 'f3' };
  if (modo === 'squash') {
    return {
      commits: [...base.map((c) => (c.id.startsWith('f') ? { ...c, orfao: true } : c)), { id: 's1', msg: `${f1msg} (#142)`, x: 7, y: Y_MAIN, pais: ['c4'] }],
      main: 's1',
      feat: null,
    };
  }
  const velhos = base.map((c) => (c.id.startsWith('f') ? { ...c, orfao: true } : c));
  return {
    commits: [
      ...velhos,
      { id: "f1'", msg: f1msg, x: 7, y: Y_MAIN, pais: ['c4'] },
      { id: "f2'", msg: 'prompt(sistema): pedir citação por frase', x: 8, y: Y_MAIN, pais: ["f1'"] },
      { id: "f3'", msg: 'test(evals): 12 perguntas douradas de compensação', x: 9, y: Y_MAIN, pais: ["f2'"] },
    ],
    main: "f3'",
    feat: "f3'",
  };
}

function proximaVersao(msgs: string[]): { v: string; porque: string } {
  if (msgs.some((m) => /^\w+(\(.+\))?!:/.test(m) || /BREAKING CHANGE/.test(m))) return { v: 'v2.0.0', porque: 'há um commit com `!` (breaking change): sobe o MAJOR' };
  if (msgs.some((m) => /^feat(\(.+\))?:/.test(m))) return { v: 'v1.4.0', porque: 'há pelo menos um `feat`: sobe o MINOR e o PATCH volta a 0' };
  if (msgs.some((m) => /^fix(\(.+\))?:/.test(m))) return { v: 'v1.3.1', porque: 'só `fix` (e `chore`/`docs`, que não contam): sobe o PATCH' };
  return { v: 'v1.3.0', porque: 'nada que mude a versão' };
}

interface CommitB { msg: string; recall: number }
const HIST_B: CommitB[] = [
  { msg: 'feat(rag): pesquisa híbrida com RRF', recall: 0.95 },
  { msg: 'fix(api): cancelar a geração quando o cliente desliga', recall: 0.95 },
  { msg: 'docs: guia de ingestão incremental', recall: 0.95 },
  { msg: 'chore(deps): actualizar langgraph para 1.0.x', recall: 0.95 },
  { msg: 'feat(guardas): detector de injecção nos resultados de ferramentas', recall: 0.95 },
  { msg: 'prompt(sistema): pedir citação por frase', recall: 0.95 },
  { msg: 'refactor(ingestao): max_palavras de 80 para 200 no chunk_recursivo', recall: 0.87 },
  { msg: 'test(evals): 12 perguntas douradas de compensação', recall: 0.87 },
  { msg: 'fix(api): Idempotency-Key obrigatória no POST de mensagens', recall: 0.87 },
  { msg: 'chore(ci): cache do uv no GitHub Actions', recall: 0.87 },
  { msg: 'feat(memoria): resumo incremental no modelo pequeno', recall: 0.87 },
  { msg: 'fix(guardas): mascarar NUIT nos logs', recall: 0.87 },
  { msg: 'perf(recuperacao): ef_search de 40 para 64', recall: 0.87 },
];

interface EstadoB { bom: number; mau: number; testado: Record<number, 'good' | 'bad'>; medido: Record<number, boolean>; log: string[] }
const B_INICIAL: EstadoB = { bom: 0, mau: HIST_B.length - 1, testado: { 0: 'good', [HIST_B.length - 1]: 'bad' }, medido: {}, log: ['git bisect start', 'git bisect bad HEAD', 'git bisect good v1.3.0'] };

export function GitGrafo() {
  const [aba, setAba] = useState<'fluxo' | 'bisect'>('fluxo');
  const [modo, setModo] = useState<ModoGit>('inicial');
  const [breaking, setBreaking] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [b, setB] = useState<EstadoB>(B_INICIAL);

  const g = grafoGit(modo, breaking);
  const porId = Object.fromEntries(g.commits.map((c) => [c.id, c]));
  const maxX = Math.max(...g.commits.map((c) => c.x));
  const W = Math.max(400, 96 + (maxX + 1) * DX);
  const px = (x: number) => 88 + x * DX;
  // commits no main desde v1.3.0 (c1), seguindo os pais
  const noMain: string[] = [];
  const visitar = (id: string) => { if (id === 'c1' || noMain.includes(id)) return; noMain.push(id); porId[id]?.pais.forEach(visitar); };
  visitar(g.main);
  const msgsMain = noMain.map((id) => porId[id]?.msg ?? '').filter((m) => !m.startsWith('Merge'));
  const prox = proximaVersao(msgsMain);

  const comandos: Record<ModoGit, string> = {
    inicial: L('git switch -c feat/re-rank main   # há dois dias', '# ... três commits no ramo, dois novos no main entretanto'),
    merge: L('git switch main', 'git merge --no-ff feat/re-rank   # cria o commit de merge com dois pais'),
    rebase: L('git switch feat/re-rank', 'git rebase main                 # reescreve f1, f2, f3 em cima de c4 (novos SHA)', 'git switch main', 'git merge --ff-only feat/re-rank'),
    squash: L('gh pr merge 142 --squash        # um só commit no main, com a mensagem do PR'),
  };

  const mid = Math.floor((b.bom + b.mau) / 2);
  const acabou = b.mau - b.bom <= 1;
  const marcar = (r: 'good' | 'bad') => {
    if (acabou) return;
    setB((s) => {
      const bom = r === 'good' ? mid : s.bom;
      const mau = r === 'bad' ? mid : s.mau;
      const log = [...s.log, `git bisect ${r}   # ${sha(HIST_B[mid].msg)}`];
      if (mau - bom <= 1) log.push(`${sha(HIST_B[mau].msg)} is the first bad commit`, `    ${HIST_B[mau].msg}`);
      return { ...s, bom, mau, testado: { ...s.testado, [mid]: r }, log };
    });
  };
  const correrAuto = () => {
    let s = { ...B_INICIAL, log: [...B_INICIAL.log, 'git bisect run uv run python -m balcao.avaliacao.correr --metrica recall@5 --minimo 0.95'] };
    while (s.mau - s.bom > 1) {
      const m = Math.floor((s.bom + s.mau) / 2);
      const r: 'good' | 'bad' = HIST_B[m].recall >= 0.95 ? 'good' : 'bad';
      s = { ...s, bom: r === 'good' ? m : s.bom, mau: r === 'bad' ? m : s.mau, testado: { ...s.testado, [m]: r }, medido: { ...s.medido, [m]: true }, log: [...s.log, `running … recall@5 = ${fmt(HIST_B[m].recall, 2)} → exit ${r === 'good' ? 0 : 1}`] };
    }
    s.log.push(`${sha(HIST_B[s.mau].msg)} is the first bad commit`, `    ${HIST_B[s.mau].msg}`, 'bisect found first bad commit');
    setB(s);
  };
  const passosTeoricos = Math.ceil(Math.log2(HIST_B.length - 1));
  const passosFeitos = Object.keys(b.testado).length - 2;

  return (
    <Frame
      title="Git visual: trunk-based, SemVer e bisect"
      hint="Histórico ilustrativo do repositório do «Balcão». Os SHA são curtos e fictícios; as mensagens seguem Conventional Commits (com `prompt` como tipo próprio da equipa, para alterações de prompts)."
      aside={<Segmented value={aba} onChange={setAba} options={[{ value: 'fluxo', label: 'merge e rebase' }, { value: 'bisect', label: 'git bisect' }]} />}
    >
      {aba === 'fluxo' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setModo('inicial'); setTag(null); }}>Estado inicial</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setModo('merge'); setTag(null); }}>merge --no-ff</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setModo('rebase'); setTag(null); }}>rebase + fast-forward</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setModo('squash'); setTag(null); }}>squash merge</button>
            <Toggle checked={breaking} onChange={(v) => { setBreaking(v); setTag(null); }} label="f1 é uma breaking change (feat!)" />
          </div>

          <div className="scrollbar-thin mt-3 overflow-x-auto">
            <svg viewBox={`0 0 ${W} 160`} style={{ minWidth: Math.min(W, 560) }} className="w-full" role="img" aria-label={`Grafo de commits, modo ${modo}`}>
              <text x={4} y={Y_MAIN + 3} fontSize={9} fontWeight={700} fill="var(--text-muted)">main</text>
              {g.feat && <text x={4} y={Y_FEAT + 3} fontSize={9} fontWeight={700} fill="var(--text-muted)">feat/re-rank</text>}
              {g.commits.flatMap((c) => c.pais.map((p) => {
                const a = porId[p];
                if (!a) return null;
                const x1 = px(a.x); const x2 = px(c.x);
                const d = a.y === c.y ? `M${x1},${a.y} L${x2},${c.y}` : `M${x1},${a.y} C${x1 + DX * 0.6},${a.y} ${x2 - DX * 0.6},${c.y} ${x2},${c.y}`;
                return <path key={`${p}-${c.id}`} d={d} fill="none" stroke={c.orfao ? 'var(--border-soft)' : c.y === Y_FEAT ? 'var(--color-accent-500)' : 'var(--color-brand-500)'} strokeWidth={2} strokeDasharray={c.orfao ? '4 3' : undefined} />;
              }))}
              {g.commits.map((c) => {
                const tipo = c.msg.split(/[(:!]/)[0];
                const main = c.id === g.main;
                return (
                  <g key={c.id} style={{ transform: `translate(${px(c.x)}px, ${c.y}px)`, transition: 'transform .6s ease, opacity .6s' }} opacity={c.orfao ? 0.35 : 1}>
                    <title>{`${sha(c.id + c.msg)} ${c.msg}`}</title>
                    <circle r={main ? 9 : 7} className={c.y === Y_FEAT ? 'fill-accent-500' : 'fill-brand-500'} stroke="var(--surface-raised)" strokeWidth={2} />
                    <text y={c.y === Y_MAIN ? -14 : 22} fontSize={8} textAnchor="middle" className="font-mono" fill="var(--text-strong)">{tipo}</text>
                    <text y={3} fontSize={6.5} textAnchor="middle" fill="white" className="font-mono">{c.id.replace("'", '′')}</text>
                    {c.id === 'c1' && <g transform="translate(0,-34)"><rect x={-20} y={-8} width={40} height={12} rx={3} className="fill-emerald-500/20" /><text fontSize={8} y={1} textAnchor="middle" fill="var(--text-strong)">v1.3.0</text></g>}
                    {main && tag && <g transform="translate(0,-34)"><rect x={-20} y={-8} width={40} height={12} rx={3} className="fill-accent-500/30" /><text fontSize={8} y={1} textAnchor="middle" fill="var(--text-strong)">{tag}</text></g>}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <Pre wrap>{comandos[modo]}</Pre>
              <p className="mt-2 text-xs text-body">
                {modo === 'merge' && 'O histórico guarda a forma real do trabalho (o ramo e o merge), à custa de um grafo mais difícil de ler e de `git bisect` a passar por commits intermédios que nunca estiveram no main.'}
                {modo === 'rebase' && 'Os commits do ramo são reescritos em cima do main: novos SHA, histórico linear. Os antigos (tracejado) ficam órfãos. Nunca faças rebase de um ramo que outra pessoa já puxou.'}
                {modo === 'squash' && 'Um PR = um commit no main. É o que o «Balcão» usa em trunk-based: cada commit do main passou o CI inteiro e pode ir para produção, e um revert desfaz o PR todo.'}
                {modo === 'inicial' && 'Um ramo curto (dois dias) a partir do main, que entretanto avançou. Em trunk-based, o ramo vive horas ou poucos dias; quanto mais vive, mais doloroso é integrar.'}
              </p>
            </div>
            <div className="rounded-xl border border-soft p-3">
              <p className="text-xs font-semibold text-muted">Commits no main desde v1.3.0</p>
              <ul className="mt-1 space-y-0.5 font-mono text-[0.7rem] text-body">
                {msgsMain.slice().reverse().map((m, i) => <li key={i}>{sha(m)} {m}</li>)}
              </ul>
              <p className="mt-2 text-sm text-body">Próxima versão: <strong className="font-mono text-strong">{prox.v}</strong> — <RichText text={prox.porque} />.</p>
              <button type="button" className="btn btn-accent btn-sm mt-2" onClick={() => setTag(prox.v)} disabled={tag === prox.v}>git tag -a {prox.v} -m "…"</button>
              {tag && <Nota>A tag aponta para o commit no main, e é dela que o CI constrói a imagem <Ic>ghcr.io/chega/balcao:{tag.slice(1)}</Ic> (além da imagem por SHA de cada commit).</Nota>}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-body">A recall@5 do conjunto dourado desceu de 0,95 (v1.3.0) para 0,87 (HEAD). Há {HIST_B.length - 1} commits entre os dois. Corre as evals no commit que o bisect escolhe e marca-o.</p>
          <ol className="mt-3 space-y-1">
            {HIST_B.map((c, i) => {
              const est = b.testado[i];
              const fora = i < b.bom || i > b.mau;
              const cur = !acabou && i === mid;
              const culpado = acabou && i === b.mau;
              return (
                <li key={i} className={`flex items-center gap-2 rounded-lg border px-2 py-1 font-mono text-[0.7rem] transition ${culpado ? 'border-rose-500 bg-rose-500/10' : cur ? 'border-brand-500 bg-brand-500/10' : 'border-soft'} ${fora && !est ? 'opacity-40' : ''}`}>
                  <span className="text-muted">{sha(c.msg)}</span>
                  <span className="min-w-0 flex-1 truncate text-body">{c.msg}{i === 0 ? '  (v1.3.0)' : i === HIST_B.length - 1 ? '  (HEAD)' : ''}</span>
                  {(b.medido[i] || i === 0 || i === HIST_B.length - 1) && <span className="text-muted">{fmt(c.recall, 2)}</span>}
                  {est && <Chip tom={est === 'good' ? 'good' : 'bad'}>{est}</Chip>}
                  {cur && <Chip tom="brand">a testar</Chip>}
                  {culpado && <Chip tom="bad">first bad commit</Chip>}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={acabou || b.medido[mid]} onClick={() => setB((s) => ({ ...s, medido: { ...s.medido, [mid]: true }, log: [...s.log, `uv run python -m balcao.avaliacao.correr --metrica recall@5   # recall@5 = ${fmt(HIST_B[mid].recall, 2)}`] }))}>Correr evals neste commit</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={acabou} onClick={() => marcar('good')}>git bisect good</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={acabou} onClick={() => marcar('bad')}>git bisect bad</button>
            <button type="button" className="btn btn-accent btn-sm" onClick={correrAuto}>git bisect run (automático)</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setB(B_INICIAL)}>git bisect reset</button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr]">
            <Pre wrap className="max-h-56">{b.log.join('\n')}</Pre>
            <div className="space-y-2">
              <Stat label="Passos" value={`${Math.max(0, passosFeitos)} (máximo ⌈log₂ ${HIST_B.length - 1}⌉ = ${passosTeoricos})`} />
              <p className="text-xs text-muted">
                Para o bisect ser automático, a avaliação tem de ser determinista e ter um limiar: com o modelo real, dois correr seguidos dão números diferentes e um commit bom pode sair «bad». Por isso o «Balcão» faz bisect da recuperação (determinista) e só depois da geração, com várias corridas por commit.
              </p>
            </div>
          </div>
        </>
      )}
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 3. DockerCamadas */

type InstrId = 'from' | 'uv' | 'workdir' | 'lock' | 'deps' | 'src' | 'proj' | 'useradd' | 'env' | 'user' | 'health' | 'cmd' | 'segredo' | 'tudo' | 'apt';
type Mudanca = 'codigo' | 'deps' | 'notebook' | 'nada';
interface InstrD { linha: string; mb: number; s: number; dep?: Exclude<Mudanca, 'nada'>[]; venv?: boolean; final?: boolean; nota: string }

const INSTR: Record<InstrId, InstrD> = {
  from: { linha: 'FROM python:3.13-slim', mb: 125, s: 0, nota: 'Imagem base Debian slim com Python 3.13 (≈ 125 MB descomprimida, ilustrativo).' },
  uv: { linha: 'COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /uvx /bin/', mb: 42, s: 2, nota: 'Só o binário do uv, sem pip install.' },
  workdir: { linha: 'WORKDIR /app', mb: 0, s: 0, nota: '' },
  lock: { linha: 'COPY pyproject.toml uv.lock ./', mb: 0.3, s: 0.2, dep: ['deps'], nota: 'Só os ficheiros de dependências: a camada seguinte só se invalida quando eles mudam.' },
  deps: { linha: 'RUN uv sync --frozen --no-dev --no-install-project', mb: 190, s: 45, venv: true, nota: 'Instala as dependências (FastAPI, LangChain, LangGraph, psycopg, numpy…) no .venv.' },
  src: { linha: 'COPY src/ ./src/', mb: 1.2, s: 0.3, dep: ['codigo'], nota: 'O código muda a cada commit: vem depois das dependências.' },
  proj: { linha: 'RUN uv sync --frozen --no-dev', mb: 0.4, s: 3, venv: true, nota: 'Instala o próprio projecto (rápido: as dependências já lá estão).' },
  useradd: { linha: 'RUN useradd --uid 10001 --no-create-home balcao', mb: 0.1, s: 1, final: true, nota: '' },
  env: { linha: 'ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1', mb: 0, s: 0, final: true, nota: '' },
  user: { linha: 'USER balcao', mb: 0, s: 0, final: true, nota: 'Não-root: um RCE na app não é root no contentor.' },
  health: { linha: 'HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request as u; u.urlopen(\'http://localhost:8000/healthz\')"', mb: 0, s: 0, final: true, nota: 'O compose espera por healthy antes de arrancar quem depende da API.' },
  cmd: { linha: 'CMD ["uvicorn", "balcao.api.app:app", "--host", "0.0.0.0", "--port", "8000"]', mb: 0, s: 0, final: true, nota: '' },
  segredo: { linha: 'ENV ANTHROPIC_API_KEY=sk-ant-api03-…', mb: 0, s: 0, final: true, nota: 'Segredo gravado na imagem.' },
  tudo: { linha: 'COPY . .', mb: 1.2, s: 1, dep: ['codigo', 'deps', 'notebook'], nota: 'Copia o contexto inteiro.' },
  apt: { linha: 'RUN apt-get update && apt-get install -y --no-install-recommends build-essential', mb: 240, s: 40, nota: 'Compiladores para dependências sem wheel. Só fazem falta no build.' },
};
const ORDEM_BOA: InstrId[] = ['from', 'uv', 'workdir', 'lock', 'deps', 'src', 'proj', 'useradd', 'env', 'user', 'health', 'cmd'];
const OPCIONAIS: InstrId[] = ['apt', 'tudo', 'segredo', 'useradd', 'user', 'health'];
const LIXO_CONTEXTO = 350; // .git, .venv local, notebooks e dados, sem .dockerignore (ilustrativo)

export function DockerCamadas() {
  const [ordem, setOrdem] = useState<InstrId[]>(['from', 'uv', 'workdir', 'tudo', 'deps', 'proj', 'env', 'cmd']);
  const [multi, setMulti] = useState(false);
  const [ignore, setIgnore] = useState(false);
  const [mud, setMud] = useState<Mudanca>('codigo');
  const [arr, setArr] = useState<number | null>(null);

  const mb = (id: InstrId) => (id === 'tudo' && !ignore ? INSTR.tudo.mb + LIXO_CONTEXTO : INSTR[id].mb);
  const builder = multi ? ordem.filter((i) => !INSTR[i].final) : ordem;
  const finais = multi ? ordem.filter((i) => INSTR[i].final) : [];

  // erros de build e cache
  const erros: Record<number, string> = {};
  const vistos = new Set<InstrId>();
  builder.forEach((id, i) => {
    if (i === 0 && id !== 'from') erros[i] = 'o Dockerfile tem de começar em FROM';
    if ((id === 'deps' || id === 'proj') && !vistos.has('uv')) erros[i] = '/bin/sh: 1: uv: not found';
    else if (id === 'deps' && !vistos.has('lock') && !vistos.has('tudo')) erros[i] = 'error: No `pyproject.toml` found in current directory';
    else if (id === 'proj' && !vistos.has('src') && !vistos.has('tudo')) erros[i] = 'o pacote balcao não existe em src/: o build falha';
    if (id === 'user' && !vistos.has('useradd')) erros[i] = 'unable to find user balcao: no matching entries in passwd file (ao arrancar)';
    vistos.add(id);
  });
  if (multi) {
    const vf = new Set<InstrId>();
    finais.forEach((id) => {
      if (id === 'user' && !vf.has('useradd')) erros[100 + finais.indexOf(id)] = 'unable to find user balcao (ao arrancar)';
      vf.add(id);
    });
  }
  const temErro = Object.keys(erros).length > 0;

  let invalido = false;
  const estadoB = builder.map((id) => {
    const d = INSTR[id].dep ?? [];
    const toca = mud !== 'nada' && d.includes(mud) && !(mud === 'notebook' && ignore);
    if (toca) invalido = true;
    return invalido ? 'rebuild' : 'cached';
  });
  const venvMudou = builder.some((id, i) => INSTR[id].venv && estadoB[i] === 'rebuild');
  const srcMudou = builder.some((id, i) => (id === 'src' || id === 'tudo') && estadoB[i] === 'rebuild');
  let invalidoF = false;
  const linhasFinais: { linha: string; mb: number; s: number; estado: string }[] = multi
    ? [
        { linha: 'FROM python:3.13-slim', mb: 125, s: 0, estado: 'cached' },
        { linha: 'WORKDIR /app', mb: 0, s: 0, estado: 'cached' },
        { linha: 'COPY --from=builder /app/.venv /app/.venv', mb: soma(builder.filter((i) => INSTR[i].venv).map((i) => INSTR[i].mb)), s: 2, estado: venvMudou ? 'rebuild' : 'cached' },
        { linha: 'COPY --from=builder /app/src /app/src', mb: 1.2, s: 0.3, estado: srcMudou || venvMudou ? 'rebuild' : 'cached' },
        ...finais.map((id) => ({ linha: INSTR[id].linha, mb: INSTR[id].mb, s: INSTR[id].s, estado: '' })),
      ].map((l) => {
        if (l.estado === 'rebuild') invalidoF = true;
        return { ...l, estado: invalidoF ? 'rebuild' : 'cached' };
      })
    : [];

  const tamanho = multi ? soma(linhasFinais.map((l) => l.mb)) : soma(ordem.map(mb));
  const tempo = soma(builder.map((id, i) => (estadoB[i] === 'rebuild' ? INSTR[id].s : 0))) + soma(linhasFinais.map((l) => (l.estado === 'rebuild' ? l.s : 0)));
  const reconstruidas = estadoB.filter((e) => e === 'rebuild').length + linhasFinais.filter((l) => l.estado === 'rebuild').length;

  const idx = (id: InstrId) => ordem.indexOf(id);
  const alertas: { tom: 'bad' | 'warn'; txt: string }[] = [];
  if (ordem.includes('segredo')) alertas.push({ tom: 'bad', txt: `Segredo em \`ENV\`: fica nos metadados da imagem${multi ? ' (aqui no estágio final)' : ''} e aparece em \`docker history\` e \`docker inspect\`. Passa-o em runtime (variável de ambiente do orquestrador) ou, no build, com \`RUN --mount=type=secret\`.` });
  if (!ordem.includes('user')) alertas.push({ tom: 'bad', txt: 'Sem `USER`: o processo corre como root dentro do contentor.' });
  if (!ordem.includes('health')) alertas.push({ tom: 'warn', txt: 'Sem `HEALTHCHECK`: o `depends_on: condition: service_healthy` do compose não tem o que esperar.' });
  if (ordem.includes('tudo') && !ignore) alertas.push({ tom: 'bad', txt: `\`COPY . .\` sem \`.dockerignore\`: .git, .venv local, notebooks e \`.env\` entram no contexto (+${LIXO_CONTEXTO} MB) e qualquer alteração invalida a cache.` });
  const primeiroCodigo = Math.min(...(['src', 'tudo'] as InstrId[]).map(idx).filter((i) => i >= 0));
  if (idx('deps') > primeiroCodigo) alertas.push({ tom: 'warn', txt: 'O código é copiado antes de `uv sync` das dependências: cada alteração de código reinstala tudo (45 s).' });
  if (ordem.includes('apt') && !multi) alertas.push({ tom: 'warn', txt: '`build-essential` numa imagem de um só estágio: +240 MB de compiladores em produção, e mais superfície para CVEs.' });

  const juntar = (id: InstrId) => setOrdem((o) => {
    if (o.includes(id)) return o;
    const c = o.slice();
    const pos = id === 'apt' ? 1 : id === 'tudo' ? Math.max(1, c.indexOf('deps')) : Math.max(1, c.indexOf('cmd'));
    c.splice(pos < 0 ? c.length : pos, 0, id);
    return c;
  });

  const corEstado = (e: string, err?: string) => (err ? 'border-rose-400/70 bg-rose-500/8' : e === 'rebuild' ? 'border-amber-400/70 bg-amber-500/8' : 'border-soft');

  return (
    <Frame
      title="Camadas de uma imagem"
      hint="Cada instrução que muda o sistema de ficheiros é uma camada; a cache de build reaproveita camadas até à primeira cuja entrada mudou, e reconstrói tudo o que vem depois. Tamanhos e tempos ilustrativos, na ordem de grandeza de uma imagem Python com as dependências do «Balcão»."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Alteração a simular">
          <Segmented value={mud} onChange={setMud} options={[{ value: 'codigo', label: 'src/balcao/grafo.py' }, { value: 'deps', label: 'uv.lock' }, { value: 'notebook', label: 'notebooks/analise.ipynb' }, { value: 'nada', label: 'nada' }]} />
        </Field>
        <Toggle checked={multi} onChange={setMulti} label="multi-stage" />
        <Toggle checked={ignore} onChange={setIgnore} label=".dockerignore" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOrdem(ORDEM_BOA)}>Ordem recomendada</button>
        {OPCIONAIS.filter((id) => !ordem.includes(id)).map((id) => (
          <button key={id} type="button" className="btn btn-ghost btn-sm font-mono" onClick={() => juntar(id)}>+ {INSTR[id].linha.split(' ').slice(0, 2).join(' ')}</button>
        ))}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          {multi && <p className="mb-1 font-mono text-[0.7rem] text-muted"># estágio 1 · FROM python:3.13-slim AS builder</p>}
          <ol className="space-y-1" aria-label="Instruções do Dockerfile por ordem">
            {builder.map((id, i) => {
              const gi = ordem.indexOf(id);
              const err = erros[i];
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => setArr(gi)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (arr !== null) setOrdem((o) => moverPara(o, arr, gi)); setArr(null); }}
                  className={`flex cursor-grab items-center gap-1.5 rounded-lg border px-2 py-1 ${corEstado(estadoB[i], err)}`}
                >
                  <span className="w-4 text-right font-mono text-[0.65rem] text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[0.7rem] text-strong" title={INSTR[id].linha}>{id === 'from' && multi ? `${INSTR[id].linha} AS builder` : INSTR[id].linha}</p>
                    {err ? <p className="font-mono text-[0.62rem] text-rose-700 dark:text-rose-300">{err}</p> : <p className="text-[0.62rem] text-muted">{estadoB[i] === 'rebuild' ? `reconstrói · ${fmt(INSTR[id].s, 1)} s` : 'CACHED'}{mb(id) ? ` · ${fmt(mb(id), 1)} MB` : ''}</p>}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm px-1.5 py-0.5" aria-label={`Subir ${INSTR[id].linha}`} disabled={gi === 0} onClick={() => setOrdem((o) => mover(o, gi, -1))}>↑</button>
                  <button type="button" className="btn btn-ghost btn-sm px-1.5 py-0.5" aria-label={`Descer ${INSTR[id].linha}`} disabled={gi === ordem.length - 1} onClick={() => setOrdem((o) => mover(o, gi, 1))}>↓</button>
                  <button type="button" className="btn btn-ghost btn-sm px-1.5 py-0.5" aria-label={`Remover ${INSTR[id].linha}`} onClick={() => setOrdem((o) => o.filter((x) => x !== id))}>✕</button>
                </li>
              );
            })}
          </ol>
          {multi && (
            <>
              <p className="mt-3 mb-1 font-mono text-[0.7rem] text-muted"># estágio 2 · imagem final (só o que corre em produção)</p>
              <ol className="space-y-1">
                {linhasFinais.map((l, i) => {
                  const err = erros[100 + i - 4];
                  return (
                    <li key={i} className={`rounded-lg border px-2 py-1 ${corEstado(l.estado, i >= 4 ? err : undefined)}`}>
                      <p className="truncate font-mono text-[0.7rem] text-strong" title={l.linha}>{l.linha}</p>
                      <p className="text-[0.62rem] text-muted">{l.estado === 'rebuild' ? 'reconstrói' : 'CACHED'}{l.mb ? ` · ${fmt(l.mb, 1)} MB` : ''}</p>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Imagem final" value={`${fmt(tamanho)} MB`} tone={tamanho > 500 ? 'bad' : tamanho > 330 ? 'warn' : 'good'} />
            <Stat label="Rebuild" value={temErro ? 'falha' : `${fmt(tempo, 1)} s`} tone={temErro ? 'bad' : tempo > 30 ? 'warn' : 'good'} />
            <Stat label="Camadas reconstruídas" value={String(reconstruidas)} />
            <Stat label="Camadas com dados" value={String((multi ? linhasFinais.filter((l) => l.mb > 0) : ordem.filter((i) => mb(i) > 0)).length)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted">Tamanho por camada {multi ? '(imagem final)' : ''}</p>
            <ul className="space-y-1">
              {(multi ? linhasFinais.map((l) => ({ nome: l.linha, v: l.mb })) : ordem.map((id) => ({ nome: INSTR[id].linha, v: mb(id) }))).filter((x) => x.v > 0).map((x, i) => (
                <li key={i} className="text-[0.66rem]">
                  <div className="flex justify-between gap-2"><span className="truncate font-mono text-body">{x.nome}</span><span className="font-mono text-muted">{fmt(x.v, 1)} MB</span></div>
                  <div className="h-1.5 rounded-full surface-sunken"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(x.v / Math.max(tamanho, 1)) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          {alertas.length > 0 && (
            <ul className="space-y-1.5">
              {alertas.map((a, i) => (
                <li key={i} className={`rounded-lg border px-2.5 py-1.5 text-xs ${a.tom === 'bad' ? 'border-rose-400/60 bg-rose-500/8 text-rose-800 dark:text-rose-200' : 'border-amber-400/60 bg-amber-500/8 text-amber-800 dark:text-amber-200'}`}><RichText text={a.txt} /></li>
              ))}
            </ul>
          )}
          {!alertas.length && !temErro && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/8 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-200">Sem alertas: dependências antes do código, não-root, healthcheck, sem segredos.</p>}
        </div>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 4. PipelineCi */

type JobId = 'lint' | 'tipos' | 'testes' | 'evals' | 'build' | 'push' | 'canario' | 'promover' | 'rollback';
type CenarioP = 'verde' | 'teste' | 'eval' | 'canario';
type EstadoJob = 'espera' | 'a correr' | 'ok' | 'falhou' | 'saltado';
interface JobP { id: JobId; nome: string; dur: number; deps: JobId[]; runner: boolean }

const JOBS: JobP[] = [
  { id: 'lint', nome: 'lint (ruff)', dur: 25, deps: [], runner: true },
  { id: 'tipos', nome: 'tipos (mypy)', dur: 70, deps: [], runner: true },
  { id: 'testes', nome: 'testes (pytest + pgvector)', dur: 150, deps: [], runner: true },
  { id: 'evals', nome: 'evals (240 perguntas, gate por intenção)', dur: 480, deps: ['lint', 'tipos', 'testes'], runner: true },
  { id: 'build', nome: 'build da imagem (SHA)', dur: 180, deps: ['evals'], runner: true },
  { id: 'push', nome: 'push para o GHCR', dur: 40, deps: ['build'], runner: true },
  { id: 'canario', nome: 'deploy canário 10%', dur: 90, deps: ['push'], runner: true },
  { id: 'promover', nome: 'promover a 100%', dur: 45, deps: ['canario'], runner: true },
  { id: 'rollback', nome: 'rollback', dur: 30, deps: ['canario'], runner: true },
];

const FALHA_EM: Record<CenarioP, JobId | null> = { verde: null, teste: 'testes', eval: 'evals', canario: 'canario' };
const PRECO_MIN_USD = 0.006; // ilustrativo: runner Linux de 2 núcleos; confirma a tabela actual do GitHub

const EVAL_INT: { id: string; base: number; nova: number }[] = [
  { id: 'onde-esta', base: 0.91, nova: 0.93 },
  { id: 'compensacao', base: 0.84, nova: 0.78 },
  { id: 'politica', base: 0.86, nova: 0.9 },
  { id: 'pagamentos', base: 0.71, nova: 0.74 },
  { id: 'conta', base: 0.62, nova: 0.64 },
  { id: 'seguranca', base: 1.0, nova: 1.0 },
  { id: 'outros', base: 0.9, nova: 0.92 },
];

const SETUP = ['      - uses: actions/checkout@v5', '      - uses: astral-sh/setup-uv@v6', '        with:', '          enable-cache: true', '      - run: uv sync --frozen'];
const YAML: Record<JobId, string> = {
  lint: L('  lint:', '    runs-on: ubuntu-latest', '    steps:', ...SETUP, '      - run: uv run ruff check .', '      - run: uv run ruff format --check .'),
  tipos: L('  tipos:', '    runs-on: ubuntu-latest', '    steps:', ...SETUP, '      - run: uv run mypy src'),
  testes: L(
    '  testes:',
    '    runs-on: ubuntu-latest',
    '    services:',
    '      postgres:',
    '        image: pgvector/pgvector:pg18',
    '        env:',
    '          POSTGRES_PASSWORD: teste',
    '        ports: ["5432:5432"]',
    '        options: >-',
    '          --health-cmd "pg_isready -U postgres"',
    '          --health-interval 5s --health-retries 10',
    '    steps:',
    ...SETUP,
    '      - run: uv run pytest -q     # sem rede: modelo simulado',
    '        env:',
    '          DATABASE_URL: postgresql://postgres:teste@localhost:5432/postgres',
  ),
  evals: L(
    '  evals:',
    '    needs: [lint, tipos, testes]',
    '    runs-on: ubuntu-latest',
    '    environment: evals',
    '    steps:',
    ...SETUP,
    '      - name: Evals no conjunto dourado',
    '        run: uv run python -m balcao.avaliacao.correr --conjunto dados/dourado.jsonl --saida relatorio.json',
    '        env:',
    '          BALCAO_MODELO_MEDIO: ${{ vars.BALCAO_MODELO_MEDIO }}',
    '          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
    '      - name: Gate por intenção contra o main',
    '        run: uv run python -m balcao.avaliacao.correr --gate relatorio.json --base main --queda-maxima 0.03',
    '      - uses: actions/upload-artifact@v4',
    '        with: { name: relatorio-evals, path: relatorio.json }',
  ),
  build: L(
    '  imagem:',
    '    needs: evals',
    '    runs-on: ubuntu-latest',
    '    permissions: { contents: read, packages: write }',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '      - uses: docker/setup-buildx-action@v3',
    '      - uses: docker/login-action@v3',
    '        with:',
    '          registry: ghcr.io',
    '          username: ${{ github.actor }}',
    '          password: ${{ secrets.GITHUB_TOKEN }}',
    '      - uses: docker/build-push-action@v6   # build + push no mesmo passo',
    '        with:',
    '          file: docker/Dockerfile',
    '          push: true',
    '          tags: ghcr.io/chega/balcao:${{ github.sha }}',
    '          cache-from: type=gha',
    '          cache-to: type=gha,mode=max',
  ),
  push: '',
  canario: L(
    '  canario:',
    '    needs: imagem',
    '    runs-on: ubuntu-latest',
    '    environment: producao-canario',
    '    permissions: { contents: read, id-token: write }   # OIDC, sem segredos longos',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '      - run: ./deploy/canario.sh ghcr.io/chega/balcao:${{ github.sha }} --peso 10',
    '      - name: Observar 5xx, TTFT p95 e custo por conversa',
    '        run: ./deploy/observar.sh --janela 30m --max-5xx 1% --max-ttft-p95 1500',
  ),
  promover: L(
    '  promover:',
    '    needs: canario',
    '    runs-on: ubuntu-latest',
    '    environment: producao        # aprovação obrigatória configurada no ambiente',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '      - run: ./deploy/promover.sh ghcr.io/chega/balcao:${{ github.sha }}',
  ),
  rollback: L(
    '  rollback:',
    '    needs: canario',
    '    if: failure()',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '      - run: ./deploy/canario.sh --peso 0   # o tráfego volta todo à imagem anterior',
  ),
};
YAML.push = YAML.build;

const SAIDA_FALHA: Partial<Record<JobId, string>> = {
  testes: L(
    '$ uv run pytest -q',
    '..........................F.........',
    'FAILED tests/test_ferramentas.py::test_emitir_reembolso_acima_do_limite',
    "  AssertionError: esperado {'codigo': 'APROVACAO_NECESSARIA'}, obtido {'estado': 'aprovado', ...}",
    '1 failed, 35 passed in 41.2s',
    'Error: Process completed with exit code 1.',
  ),
  canario: L(
    'canário ghcr.io/chega/balcao:3f9c2a1 com 10% do tráfego',
    '  5xx:           2,4%  (produção: 0,3%; limite 1%)',
    '  TTFT p95:      1 410 ms',
    '  custo/conversa 0,81 MZN',
    'Erro: taxa de 5xx acima do limite ao minuto 9 — a abortar',
    'Error: Process completed with exit code 1.',
  ),
};

export function PipelineCi() {
  const [cen, setCen] = useState<CenarioP>('eval');
  const [t, setT] = useState(0);
  const [aCorrer, setACorrer] = useState(false);
  const [sel, setSel] = useState<JobId>('evals');

  const plano = useMemo(() => {
    const falha = FALHA_EM[cen];
    const inicio: Record<string, number> = {};
    const fimJ: Record<string, number> = {};
    const res: Record<string, 'ok' | 'falhou' | 'saltado'> = {};
    for (const j of JOBS) {
      const depsFalharam = j.deps.some((d) => res[d] !== 'ok');
      let r: 'ok' | 'falhou' | 'saltado';
      if (j.id === 'rollback') r = res.canario === 'falhou' ? 'ok' : 'saltado';
      else if (depsFalharam) r = 'saltado';
      else r = j.id === falha ? 'falhou' : 'ok';
      if (j.id === 'rollback' && res.canario === 'falhou') {
        inicio[j.id] = fimJ.canario;
      } else inicio[j.id] = j.deps.length ? Math.max(...j.deps.map((d) => fimJ[d] ?? 0)) : 0;
      const dur = r === 'saltado' ? 0 : j.id === falha && j.id === 'testes' ? 95 : j.id === falha && j.id === 'canario' ? 60 : j.dur;
      fimJ[j.id] = inicio[j.id] + dur;
      res[j.id] = r;
    }
    const total = Math.max(...JOBS.map((j) => fimJ[j.id]));
    return { inicio, fimJ, res, total };
  }, [cen]);

  useEffect(() => { setT(0); setACorrer(false); setSel(FALHA_EM[cen] ?? 'evals'); }, [cen]);
  useEffect(() => {
    if (!aCorrer) return;
    const id = window.setInterval(() => {
      setT((x) => {
        const n = x + plano.total / 60;
        if (n >= plano.total) { setACorrer(false); return plano.total; }
        return n;
      });
    }, 70);
    return () => window.clearInterval(id);
  }, [aCorrer, plano.total]);

  const estado = (j: JobP): EstadoJob => {
    const r = plano.res[j.id];
    if (r === 'saltado') return t >= plano.total || (j.deps.some((d) => plano.res[d] !== 'ok' && t >= plano.fimJ[d])) ? 'saltado' : 'espera';
    if (t < plano.inicio[j.id]) return 'espera';
    if (t < plano.fimJ[j.id]) return 'a correr';
    return r === 'ok' ? 'ok' : 'falhou';
  };

  const minutosFacturados = soma(JOBS.filter((j) => plano.res[j.id] !== 'saltado').map((j) => Math.ceil((plano.fimJ[j.id] - plano.inicio[j.id]) / 60)));
  const custoRunner = minutosFacturados * PRECO_MIN_USD * CAMBIO;
  const evalsCorreu = plano.res.evals !== 'saltado';
  // 240 perguntas no modelo médio (5 200 tokens de entrada, 180 de saída, 60% de cache) + juiz no grande
  const custoEvals = evalsCorreu ? 240 * (custoMzn(5200, 180, 'medio', 3120) + custoMzn(1500, 60, 'grande')) : 0;
  const W = 400;
  const X = (v: number) => 110 + (v / plano.total) * (W - 118);
  const rotuloEstado: Record<EstadoJob, Tom> = { espera: 'muted', 'a correr': 'brand', ok: 'good', falhou: 'bad', saltado: 'muted' };

  const mediaBase = EVAL_INT.reduce((a, x) => a + x.base, 0) / EVAL_INT.length;
  const mediaNova = EVAL_INT.reduce((a, x) => a + x.nova, 0) / EVAL_INT.length;

  return (
    <Frame
      title="Pipeline de CI/CD"
      hint="Um PR do «Balcão» a atravessar o workflow `.github/workflows/ci.yml`. Durações ilustrativas; custo de runner a um preço ilustrativo de 0,006 USD por minuto (o GitHub arredonda cada job ao minuto — confirma a tabela actual); custo das evals com os preços dos escalões médio e grande."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cenário">
          <Segmented value={cen} onChange={setCen} options={[{ value: 'verde', label: 'tudo verde' }, { value: 'teste', label: 'teste falha' }, { value: 'eval', label: 'eval baixa compensacao' }, { value: 'canario', label: 'canário com 5xx' }]} />
        </Field>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setT(0); setACorrer(true); }}>Abrir o PR</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setACorrer(false); setT(plano.total); }}>Saltar para o fim</button>
      </div>

      <svg viewBox={`0 0 ${W} ${JOBS.length * 22 + 20}`} className="mt-3 mx-auto block w-full max-w-3xl" role="img" aria-label="Diagrama de Gantt dos jobs do pipeline">
        {JOBS.map((j, i) => {
          const e = estado(j);
          const y = i * 22 + 4;
          const x0 = X(plano.inicio[j.id]);
          const x1 = X(Math.min(t, plano.fimJ[j.id]));
          const cor = e === 'falhou' ? 'rgb(244 63 94)' : e === 'ok' ? 'rgb(16 185 129)' : 'var(--color-brand-500)';
          return (
            <g key={j.id} className="cursor-pointer" onClick={() => setSel(j.id)} role="button" aria-label={`${j.nome}: ${e}`}>
              <rect x={0} y={y - 2} width={W} height={20} fill={sel === j.id ? 'color-mix(in oklch, var(--color-brand-500) 10%, transparent)' : 'transparent'} rx={4} />
              <text x={4} y={y + 11} fontSize={8.5} fill={plano.res[j.id] === 'saltado' ? 'var(--text-muted)' : 'var(--text-strong)'} className="font-mono">{j.id}</text>
              <rect x={x0} y={y + 2} width={Math.max(1, X(plano.fimJ[j.id]) - x0)} height={12} rx={3} fill="var(--border-soft)" opacity={plano.res[j.id] === 'saltado' ? 0.3 : 1} />
              {t > plano.inicio[j.id] && plano.res[j.id] !== 'saltado' && <rect x={x0} y={y + 2} width={Math.max(1, x1 - x0)} height={12} rx={3} fill={cor} opacity={0.85} />}
              {e === 'saltado' && <text x={Math.min(x0 + 4, W - 40)} y={y + 11} fontSize={7.5} fill="var(--text-muted)">saltado</text>}
            </g>
          );
        })}
        <line x1={X(Math.min(t, plano.total))} x2={X(Math.min(t, plano.total))} y1={0} y2={JOBS.length * 22 + 4} stroke="var(--color-accent-500)" />
        <text x={X(plano.total)} y={JOBS.length * 22 + 16} fontSize={8} textAnchor="end" fill="var(--text-muted)">{fmt(plano.total / 60, 1)} min</text>
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tempo até ao fim" value={`${fmt(plano.total / 60, 1)} min`} />
        <Stat label="Minutos de runner" value={`${minutosFacturados} · ${fmt(custoRunner, 1)} MZN`} />
        <Stat label="Custo das evals (modelo)" value={`${fmt(custoEvals, 1)} MZN`} tone={custoEvals > 0 ? 'warn' : 'neutral'} />
        <Stat label="Resultado" value={cen === 'verde' ? 'em produção' : cen === 'canario' ? 'rollback' : 'PR bloqueado'} tone={cen === 'verde' ? 'good' : 'bad'} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-strong">{JOBS.find((j) => j.id === sel)?.nome}</span>
            <Chip tom={rotuloEstado[estado(JOBS.find((j) => j.id === sel) ?? JOBS[0])]}>{estado(JOBS.find((j) => j.id === sel) ?? JOBS[0])}</Chip>
          </div>
          <Pre label="YAML do job">{YAML[sel]}</Pre>
          {sel === 'push' && <Nota>No workflow, build e push são o mesmo passo do <Ic>docker/build-push-action</Ic>: a imagem só é publicada depois das evals, e sempre com a tag do SHA — nunca <Ic>latest</Ic>.</Nota>}
        </div>
        <div className="min-w-0 space-y-2">
          {cen === 'eval' && (sel === 'evals' || sel === 'build') && (
            <div className="rounded-xl border border-soft p-3">
              <p className="text-xs font-semibold text-muted">relatorio.json · resolução correcta por intenção (ilustrativo)</p>
              <table className="mt-1 w-full text-xs">
                <thead className="text-muted"><tr><th className="text-left">intenção</th><th className="text-right">main</th><th className="text-right">PR</th><th className="text-right">Δ</th></tr></thead>
                <tbody className="font-mono">
                  {EVAL_INT.map((x) => {
                    const d = (x.nova - x.base) * 100;
                    const mau = d < -3;
                    return (
                      <tr key={x.id} className={mau ? 'text-rose-700 dark:text-rose-300' : 'text-body'}>
                        <td>{x.id}</td><td className="text-right">{fmt(x.base, 2)}</td><td className="text-right">{fmt(x.nova, 2)}</td><td className="text-right">{d > 0 ? '+' : ''}{fmt(d)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-soft font-bold text-strong"><td>média</td><td className="text-right">{fmt(mediaBase, 3)}</td><td className="text-right">{fmt(mediaNova, 3)}</td><td className="text-right">+{fmt((mediaNova - mediaBase) * 100, 1)}</td></tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">Gate: <Ic>compensacao</Ic> desce 6 pontos (limite 3). A média sobe, mas o PR fica bloqueado — e com ele o build, o push e o deploy.</p>
            </div>
          )}
          {SAIDA_FALHA[sel] && FALHA_EM[cen] === sel && <Pre className="text-rose-700 dark:text-rose-300">{SAIDA_FALHA[sel]}</Pre>}
          <p className="text-xs text-muted">
            {cen === 'verde' && 'Tudo verde: a imagem com o SHA do commit vai a 10% do tráfego, é observada, e só depois de aprovada no ambiente `producao` vai a 100%.'}
            {cen === 'teste' && 'Um teste falha: lint e tipos acabam (correm em paralelo), mas as evals nem arrancam — não se gasta um metical de modelo num PR que já está partido.'}
            {cen === 'eval' && 'Evals caras (modelo real) só depois dos testes baratos. É o gate que apanha o que os testes não vêem: uma intenção a piorar enquanto a média melhora.'}
            {cen === 'canario' && 'O canário apanhou o que nenhum teste apanhou (um 5xx com tráfego real). O rollback é pôr o peso a 0: a imagem anterior nunca deixou de estar a correr.'}
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 5. TraceExplorador */

type KindT = 'pedido' | 'no' | 'llm' | 'ferramenta' | 'retriever' | 'embedding' | 'guarda' | 'retry';
interface SpanT { id: string; pai?: string; nome: string; kind: KindT; ini: number; dur: number; modelo?: Escalao | 'embeddings'; tin?: number; tout?: number; cache?: number; erro?: boolean; attrs: [string, string][] }
type TracoId = 'rag' | 'ferramentas' | 'erro';

const MS_REDE = ORC('Rede');
const MS_GUARDA = ORC('Guardas de entrada');
const MS_CLS = ORC('Classificar');
const MS_EMB = ORC('Embedding');
const MS_PESQ = ORC('Pesquisa');
const MS_RR = ORC('Re-ranking');
const MS_TTFT_LLM = ORC('Montar prompt');
const MS_GER = ORC('Gerar');
const MS_GS = ORC('Guardas de saída');
const MS_PERS = ORC('Persistir');

function chat(id: string, pai: string, ini: number, modelo: Escalao, tin: number, tout: number, extra: [string, string][] = [], erro = false, dur?: number): SpanT {
  const d = dur ?? (modelo === 'pequeno' ? MS_CLS : MS_TTFT_LLM + Math.round((tout / TOK_POR_S) * 1000));
  const cache = modelo === 'medio' && !erro ? Math.round(tin * 0.6) : 0;
  return {
    id, pai, nome: `chat ${modelo}`, kind: 'llm', ini, dur: d, modelo, tin: erro ? undefined : tin, tout: erro ? undefined : tout, cache, erro,
    attrs: [
      ['gen_ai.operation.name', 'chat'],
      ['gen_ai.request.model', modelo],
      ['gen_ai.request.temperature', '0'],
      ...(erro ? [['error.type', 'InternalServerError'], ['http.response.status_code', '503']] as [string, string][] : [
        ['gen_ai.usage.input_tokens', String(tin)],
        ['gen_ai.usage.output_tokens', String(tout)],
        ['gen_ai.response.finish_reasons', extra.some(([k]) => k === 'balcao.tool_calls') ? '["tool_calls"]' : '["stop"]'],
      ] as [string, string][]),
      ...extra,
    ],
  };
}

function inicioTraco(raiz: string): SpanT[] {
  return [
    { id: 'carregar', pai: raiz, nome: 'carregar conversa', kind: 'no', ini: 0, dur: MS_REDE, attrs: [['db.system.name', 'postgresql'], ['balcao.historico.mensagens', '4']] },
    { id: 'guarda', pai: raiz, nome: 'guarda_entrada', kind: 'guarda', ini: MS_REDE, dur: MS_GUARDA, attrs: [['balcao.pii.mascarados', '0'], ['balcao.injeccao.score', '0.0']] },
    chat('classificar', raiz, MS_REDE + MS_GUARDA, 'pequeno', 650, 20, [['balcao.intencao', 'politica']]),
    { id: 'emb', pai: raiz, nome: 'embeddings', kind: 'embedding', ini: MS_REDE + MS_GUARDA, dur: MS_EMB, modelo: 'embeddings', tin: 18, attrs: [['gen_ai.operation.name', 'embeddings'], ['gen_ai.request.model', 'embeddings-768'], ['gen_ai.usage.input_tokens', '18']] },
  ];
}

function tracos(): Record<TracoId, { spans: SpanT[]; titulo: string; nota: string }> {
  const t0 = MS_REDE + MS_GUARDA + MS_CLS;
  const raiz = (dur: number, extra: [string, string][] = []): SpanT => ({ id: 'raiz', nome: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ini: 0, dur, attrs: [['http.request.method', 'POST'], ['http.route', '/v1/conversas/{conversa_id}/mensagens'], ['http.response.status_code', '200'], ...extra] });

  // RAG normal: os números de ORCAMENTO_LATENCIA
  const rag: SpanT[] = [...inicioTraco('raiz')];
  rag.push({ id: 'pesq', pai: 'raiz', nome: 'pesquisa híbrida', kind: 'retriever', ini: t0, dur: MS_PESQ, attrs: [['db.system.name', 'postgresql'], ['db.operation.name', 'SELECT'], ['balcao.k', '20'], ['balcao.filtro', 'vigente = true']] });
  rag.push({ id: 'rr', pai: 'raiz', nome: 're-rank', kind: 'retriever', ini: t0 + MS_PESQ, dur: MS_RR, attrs: [['balcao.candidatos', '20'], ['balcao.k', '3']] });
  const tLlm = t0 + MS_PESQ + MS_RR;
  rag.push(chat('llm', 'raiz', tLlm, 'medio', 5200, 180, [['gen_ai.request.max_tokens', '400'], ['balcao.stream', 'true']]));
  const tFim = tLlm + MS_TTFT_LLM + MS_GER;
  rag.push({ id: 'gs', pai: 'raiz', nome: 'guarda_saida', kind: 'guarda', ini: tFim, dur: MS_GS, attrs: [['balcao.citacoes.validas', '2'], ['balcao.citacoes.invalidas', '0']] });
  rag.push({ id: 'pers', pai: 'raiz', nome: 'persistir mensagem, checkpoint e traço', kind: 'no', ini: tFim + MS_GS, dur: MS_PERS, attrs: [['db.system.name', 'postgresql']] });
  rag.unshift(raiz(tFim + MS_GS + MS_PERS, [['balcao.intencao', 'politica'], ['balcao.ttft_ms', String(tLlm + MS_TTFT_LLM)]]));

  // Com ferramentas: três chamadas ao modelo médio (a última em stream)
  const fe: SpanT[] = [...inicioTraco('raiz')].map((s) => (s.id === 'classificar' ? { ...s, attrs: s.attrs.map(([k, v]) => [k, k === 'balcao.intencao' ? 'compensacao' : v] as [string, string]) } : s));
  const c1 = chat('llm1', 'raiz', t0, 'medio', 4300, 40, [['balcao.tool_calls', 'ler_pedido']]);
  fe.push(c1);
  const tt1 = c1.ini + c1.dur;
  fe.push({ id: 'tool1', pai: 'raiz', nome: 'execute_tool ler_pedido', kind: 'ferramenta', ini: tt1, dur: 120, attrs: [['gen_ai.operation.name', 'execute_tool'], ['gen_ai.tool.name', 'ler_pedido'], ['gen_ai.tool.call.id', 'toolu_01'], ['balcao.pedido', 'PD-8841990']] });
  const c2 = chat('llm2', 'raiz', tt1 + 120, 'medio', 4480, 58, [['balcao.tool_calls', 'calcular_reembolso, pesquisar_conhecimento']]);
  fe.push(c2);
  const tt2 = c2.ini + c2.dur;
  fe.push({ id: 'tool2', pai: 'raiz', nome: 'execute_tool calcular_reembolso', kind: 'ferramenta', ini: tt2, dur: 60, attrs: [['gen_ai.operation.name', 'execute_tool'], ['gen_ai.tool.name', 'calcular_reembolso'], ['gen_ai.tool.call.id', 'toolu_02'], ['balcao.valor_mzn', '200']] });
  fe.push({ id: 'tool3', pai: 'raiz', nome: 'execute_tool pesquisar_conhecimento', kind: 'ferramenta', ini: tt2, dur: MS_EMB + MS_PESQ + MS_RR, attrs: [['gen_ai.operation.name', 'execute_tool'], ['gen_ai.tool.name', 'pesquisar_conhecimento'], ['gen_ai.tool.call.id', 'toolu_03']] });
  fe.push({ id: 'emb3', pai: 'tool3', nome: 'embeddings', kind: 'embedding', ini: tt2, dur: MS_EMB, modelo: 'embeddings', tin: 9, attrs: [['gen_ai.operation.name', 'embeddings'], ['gen_ai.request.model', 'embeddings-768'], ['gen_ai.usage.input_tokens', '9']] });
  fe.push({ id: 'pesq3', pai: 'tool3', nome: 'pesquisa híbrida', kind: 'retriever', ini: tt2 + MS_EMB, dur: MS_PESQ, attrs: [['db.system.name', 'postgresql'], ['balcao.k', '20']] });
  fe.push({ id: 'rr3', pai: 'tool3', nome: 're-rank', kind: 'retriever', ini: tt2 + MS_EMB + MS_PESQ, dur: MS_RR, attrs: [['balcao.k', '2']] });
  const tt3 = tt2 + MS_EMB + MS_PESQ + MS_RR;
  const c3 = chat('llm3', 'raiz', tt3, 'medio', 4900, 70, [['balcao.stream', 'true']]);
  fe.push(c3);
  const tf = c3.ini + c3.dur;
  fe.push({ id: 'gs', pai: 'raiz', nome: 'guarda_saida', kind: 'guarda', ini: tf, dur: MS_GS, attrs: [['balcao.citacoes.validas', '1']] });
  fe.push({ id: 'pers', pai: 'raiz', nome: 'persistir mensagem, checkpoint e traço', kind: 'no', ini: tf + MS_GS, dur: MS_PERS, attrs: [['db.system.name', 'postgresql'], ['balcao.checkpoints', '9']] });
  fe.unshift(raiz(tf + MS_GS + MS_PERS, [['balcao.intencao', 'compensacao'], ['balcao.ttft_ms', String(tt3 + MS_TTFT_LLM)]]));

  // Erro e retry: a 1.ª chamada ao médio falha com 503 ao fim de 800 ms; backoff de 500 ms.
  const er: SpanT[] = rag.filter((s) => !['raiz', 'llm', 'gs', 'pers'].includes(s.id)).map((s) => ({ ...s }));
  er.push(chat('llm-a', 'raiz', tLlm, 'medio', 5200, 0, [['balcao.tentativa', '1']], true, 800));
  er.push({ id: 'retry', pai: 'raiz', nome: 'backoff', kind: 'retry', ini: tLlm + 800, dur: 500, attrs: [['balcao.tentativa', '1'], ['balcao.espera_ms', '500 (exponencial com jitter)']] });
  const tl2 = tLlm + 1300;
  er.push(chat('llm-b', 'raiz', tl2, 'medio', 5200, 180, [['balcao.tentativa', '2'], ['balcao.stream', 'true']]));
  const tfe = tl2 + MS_TTFT_LLM + MS_GER;
  er.push({ id: 'gs', pai: 'raiz', nome: 'guarda_saida', kind: 'guarda', ini: tfe, dur: MS_GS, attrs: [['balcao.citacoes.validas', '2']] });
  er.push({ id: 'pers', pai: 'raiz', nome: 'persistir mensagem, checkpoint e traço', kind: 'no', ini: tfe + MS_GS, dur: MS_PERS, attrs: [['db.system.name', 'postgresql']] });
  er.unshift(raiz(tfe + MS_GS + MS_PERS, [['balcao.intencao', 'politica'], ['balcao.ttft_ms', String(tl2 + MS_TTFT_LLM)], ['balcao.retentativas', '1']]));

  return {
    rag: { spans: rag, titulo: 'RAG normal', nota: 'O caminho crítico é o de `ORCAMENTO_LATENCIA`: o embedding corre em paralelo com a classificação e não soma. O primeiro token sai aos 1,36 s; a geração domina a duração e o custo.' },
    ferramentas: { spans: fe, titulo: 'Com ferramentas', nota: 'Três chamadas ao modelo em série: o TTFT passa o alvo de 1,5 s. É por isso que a API emite `event: ferramenta` — o cliente vê progresso antes do primeiro token.' },
    erro: { spans: er, titulo: 'Erro e retry', nota: 'O 503 do fornecedor custa 800 ms de espera e 500 ms de backoff, mas não tokens (um pedido que falha antes de gerar normalmente não é cobrado — confirma no teu fornecedor). O traço mostra a retentativa; sem ele, só verias um p95 pior.' },
  };
}

const COR_KIND: Record<KindT, string> = {
  pedido: 'var(--text-muted)',
  no: 'rgb(100 116 139)',
  llm: 'var(--color-brand-500)',
  ferramenta: 'var(--color-accent-500)',
  retriever: 'rgb(14 165 233)',
  embedding: 'rgb(45 212 191)',
  guarda: 'rgb(16 185 129)',
  retry: 'rgb(244 63 94)',
};

function custoSpan(s: SpanT): number {
  if (!s.modelo || s.erro) return 0;
  if (s.modelo === 'embeddings') return ((s.tin ?? 0) * 0.02 * CAMBIO) / 1_000_000;
  return custoMzn(s.tin ?? 0, s.tout ?? 0, s.modelo, s.cache ?? 0);
}

export function TraceExplorador() {
  const [tid, setTid] = useState<TracoId>('rag');
  const [sel, setSel] = useState<string>('llm');
  const T = useMemo(tracos, []);
  const tr = T[tid];
  const raiz = tr.spans[0];
  const total = raiz.dur;
  const ttft = Number(raiz.attrs.find(([k]) => k === 'balcao.ttft_ms')?.[1] ?? 0);
  const prof = (s: SpanT): number => (s.pai ? 1 + prof(tr.spans.find((x) => x.id === s.pai) ?? raiz) : 0);
  const ordenados = [raiz, ...tr.spans.slice(1).sort((a, b) => a.ini - b.ini || prof(a) - prof(b))];
  // filhos logo a seguir ao pai
  const arvore: SpanT[] = [];
  const pore = (id: string) => ordenados.filter((s) => s.pai === id);
  const andar = (s: SpanT) => { arvore.push(s); pore(s.id).forEach(andar); };
  andar(raiz);
  const custoTotal = soma(tr.spans.map(custoSpan));
  const tokIn = soma(tr.spans.filter((s) => s.kind === 'llm').map((s) => s.tin ?? 0));
  const tokOut = soma(tr.spans.filter((s) => s.kind === 'llm').map((s) => s.tout ?? 0));
  const activo = tr.spans.find((s) => s.id === sel) ?? tr.spans.find((s) => s.kind === 'llm') ?? raiz;
  const maisCaro = tr.spans.reduce((a, s) => (custoSpan(s) > custoSpan(a) ? s : a), raiz);

  const W = 520;
  const LBL = 150;
  const X = (v: number) => LBL + (v / total) * (W - LBL - 8);
  const H = arvore.length * 19 + 22;

  return (
    <Frame
      title="Explorador de traços"
      hint="Um turno do «Balcão» em spans OpenTelemetry com atributos `gen_ai.*` (semconv de GenAI: `gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.usage.*`, `gen_ai.tool.name`). Os atributos `balcao.*` são próprios do serviço. `gen_ai.request.model` mostra o escalão; em produção leva o id fixado do modelo."
    >
      <Segmented value={tid} onChange={(v) => { setTid(v); setSel(v === 'erro' ? 'llm-a' : v === 'ferramentas' ? 'llm1' : 'llm'); }} options={[{ value: 'rag', label: 'RAG normal' }, { value: 'ferramentas', label: 'com ferramentas' }, { value: 'erro', label: 'erro e retry' }]} />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Duração" value={ms(total)} />
        <Stat label="TTFT" value={ms(ttft)} tone={ttft <= 1500 ? 'good' : 'warn'} />
        <Stat label="Tokens (entrada / saída)" value={`${fmt(tokIn)} / ${fmt(tokOut)}`} />
        <Stat label="Custo do turno" value={`${fmt(custoTotal, 4)} MZN`} />
      </div>

      <div className="scrollbar-thin mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-3xl min-w-[26rem]" role="img" aria-label={`Cascata de spans do traço ${tr.titulo}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={X(total * f)} x2={X(total * f)} y1={0} y2={H - 14} stroke="var(--border-soft)" />
              <text x={X(total * f)} y={H - 3} fontSize={7.5} textAnchor={f === 1 ? 'end' : 'middle'} fill="var(--text-muted)">{ms(total * f)}</text>
            </g>
          ))}
          <line x1={X(ttft)} x2={X(ttft)} y1={0} y2={H - 14} stroke="var(--color-brand-500)" strokeDasharray="3 2" />
          <text x={X(ttft) + 2} y={8} fontSize={7.5} fill="var(--color-brand-600)">TTFT</text>
          {arvore.map((s, i) => {
            const y = i * 19 + 10;
            const x = X(s.ini);
            const w = Math.max(2, X(s.ini + s.dur) - x);
            const on = activo.id === s.id;
            return (
              <g key={s.id} className="cursor-pointer" onClick={() => setSel(s.id)} role="button" aria-label={`${s.nome}, ${s.dur} ms`}>
                {on && <rect x={0} y={y - 2} width={W} height={17} rx={3} fill="color-mix(in oklch, var(--color-brand-500) 10%, transparent)" />}
                <text x={4 + prof(s) * 7} y={y + 10} fontSize={7.8} fill={s.erro ? 'rgb(225 29 72)' : 'var(--text-strong)'} className="font-mono">{s.nome.length > 22 - prof(s) ? `${s.nome.slice(0, 21 - prof(s))}…` : s.nome}</text>
                <rect x={x} y={y + 1} width={w} height={11} rx={2.5} fill={COR_KIND[s.kind]} opacity={s.kind === 'pedido' ? 0.35 : on ? 1 : 0.78} stroke={s.erro ? 'rgb(225 29 72)' : 'none'} strokeWidth={1.2} />
                {s.kind === 'llm' && !s.erro && s.modelo === 'medio' && <rect x={x} y={y + 1} width={Math.max(1, X(s.ini + MS_TTFT_LLM) - x)} height={11} rx={2.5} fill="white" opacity={0.25} />}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-[0.65rem] text-muted">
        {(Object.keys(COR_KIND) as KindT[]).map((k) => <span key={k} className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: COR_KIND[k] }} />{k}</span>)}
        <span>· nas chamadas ao médio, a parte clara é o tempo até ao primeiro token</span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 rounded-xl border border-soft p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-strong">{activo.nome}</span>
            <Chip tom={activo.erro ? 'bad' : 'muted'}>{activo.erro ? 'status ERROR' : 'status OK'}</Chip>
            <span className="font-mono text-xs text-muted">{ms(activo.dur)} · início {ms(activo.ini)}</span>
          </div>
          <table className="mt-2 w-full text-left font-mono text-[0.68rem]">
            <tbody>
              {activo.attrs.map(([k, v]) => (
                <tr key={k} className="border-t border-soft"><td className={`py-0.5 pr-2 ${k.startsWith('gen_ai') ? 'text-brand-700 dark:text-brand-300' : 'text-muted'}`}>{k}</td><td className="break-all text-body">{v}</td></tr>
              ))}
            </tbody>
          </table>
          {custoSpan(activo) > 0 && (
            <p className="mt-2 text-xs text-body">
              Custo: <strong className="text-strong">{fmt(custoSpan(activo), 4)} MZN</strong>
              {activo.cache ? ` (${fmt(activo.cache)} tokens de entrada lidos da cache de prompt)` : ''}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Stat label="Span mais caro" value={`${maisCaro.nome} · ${fmt(custoSpan(maisCaro), 4)} MZN`} />
          <p className="text-xs text-body"><RichText text={tr.nota} /></p>
          <p className="text-xs text-muted"><RichText text="O custo não é um atributo da semconv: calcula-se a partir de `gen_ai.usage.*` e da tabela de preços, no colector ou no painel. Guardá-lo no span congela o preço do dia." /></p>
        </div>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 6. CustoEscala */

const TOK_CLS_IN = 650;
const TOK_CLS_OUT = 20;

/** `custo_conversa` do `balcao`, estendido a turnos fraccionários: a entrada cresce (saída + 120) por turno. */
function custoConversa(turnos: number, entrada: number, saida: number, modelo: Escalao, cache: number): number {
  let total = 0;
  const n = Math.ceil(turnos);
  for (let t = 0; t < n; t++) {
    const peso = t < Math.floor(turnos) ? 1 : turnos - Math.floor(turnos);
    const e = entrada + t * (saida + 120);
    total += peso * custoMzn(e, saida, modelo, Math.round(e * cache));
  }
  return total;
}

export function CustoEscala() {
  const [conv, setConv] = useState(1150);
  const [pico, setPico] = useState(190);
  const [turnos, setTurnos] = useState(3.4);
  const [tin, setTin] = useState(5200);
  const [tout, setTout] = useState(180);
  const [cacheP, setCacheP] = useState(60);
  const [cacheS, setCacheS] = useState(0);
  const [pPeq, setPPeq] = useState(0);
  const [pGr, setPGr] = useState(0);
  const [extra, setExtra] = useState(0);
  const [rpm, setRpm] = useState(50);
  const [tpm, setTpm] = useState(160_000);

  const pMed = Math.max(0, 100 - pPeq - pGr);
  const c = useMemo(() => {
    const h = cacheS / 100;
    const fc = cacheP / 100;
    const porModelo = (m: Escalao) => custoConversa(turnos, tin, tout, m, fc) * (1 + extra);
    const resposta = (1 - h) * ((pMed / 100) * porModelo('medio') + (pPeq / 100) * porModelo('pequeno') + (pGr / 100) * porModelo('grande'));
    const classif = (1 - h) * turnos * custoMzn(TOK_CLS_IN, TOK_CLS_OUT, 'pequeno');
    const porConversa = resposta + classif;
    const semNada = custoConversa(turnos, tin, tout, 'medio', 0) * (1 + extra) + turnos * custoMzn(TOK_CLS_IN, TOK_CLS_OUT, 'pequeno');
    const dia = porConversa * conv;
    // pico: turnos por minuto e chamadas ao modelo médio
    const turnosMin = (pico * turnos) / 60;
    const rpmMed = turnosMin * (1 - h) * (1 + extra) * (pMed / 100);
    const entradaMedia = tin + ((Math.ceil(turnos) - 1) / 2) * (tout + 120);
    const tpmMed = rpmMed * (entradaMedia + tout);
    const mensagensDia = conv * turnos;
    const concorrentes = (turnosMin / 60) * (TTFT_MS + 3000 + 55) / 1000;
    return { porConversa, resposta, classif, semNada, dia, mes: dia * 30, turnosMin, rpmMed, tpmMed, mensagensDia, concorrentes };
  }, [conv, pico, turnos, tin, tout, cacheP, cacheS, pPeq, pGr, extra, pMed]);

  const MARGEM = 3;
  const gargRpm = c.rpmMed * MARGEM > rpm;
  const gargTpm = c.tpmMed * MARGEM > tpm;
  const referencia = custoConversa(3, 5200, 180, 'medio', 0.6);

  const campo = (label: string, v: number, set: (n: number) => void, min: number, max: number, step = 1, suf?: string) => (
    <Field label={label} suffix={suf}>
      <NumberInput value={v} onChange={(n) => set(Math.max(min, Math.min(max, n)))} min={min} max={max} step={step} className="py-1 text-sm" />
    </Field>
  );

  return (
    <Frame
      title="Planeador de custo e escala"
      hint="Valores iniciais de `CAPACIDADE` e `MODELOS` (`design.ts`); preços dos escalões do snapshot a 63,9 MZN/USD. O custo por conversa é o `custo_conversa` do `balcao` (o histórico cresce saída + 120 tokens por turno), mais a classificação no modelo pequeno (650 → 20 tokens, ilustrativo). Os limites RPM/TPM são ilustrativos: os teus dependem do escalão de conta no fornecedor."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {campo('Conversas por dia', conv, setConv, 0, 1_000_000, 50)}
            {campo('Conversas por hora no pico', pico, setPico, 0, 100_000, 10)}
            {campo('Turnos por conversa', turnos, setTurnos, 1, 20, 0.1)}
            {campo('Tokens de entrada por turno', tin, setTin, 100, 200_000, 100)}
            {campo('Tokens de saída por turno', tout, setTout, 10, 8000, 10)}
            {campo('Chamadas extra por turno', extra, setExtra, 0, 5, 0.1, 'ferramentas')}
          </div>
          <Field label={`Cache de prompt: ${cacheP}% da entrada`}><Slider value={cacheP} onChange={setCacheP} min={0} max={90} step={5} /></Field>
          <Field label={`Acerto da cache semântica: ${cacheS}% dos turnos`}><Slider value={cacheS} onChange={setCacheS} min={0} max={40} step={1} /></Field>
          <Field label={`Routing da resposta — pequeno ${pPeq}% · médio ${pMed}% · grande ${pGr}%`}>
            <div className="grid w-full grid-cols-2 gap-2">
              <Slider value={pPeq} onChange={(v) => setPPeq(Math.min(v, 100 - pGr))} min={0} max={100} step={1} />
              <Slider value={pGr} onChange={(v) => setPGr(Math.min(v, 100 - pPeq))} min={0} max={30} step={1} />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {campo('RPM do modelo médio', rpm, setRpm, 1, 100_000, 10)}
            {campo('TPM do modelo médio', tpm, setTpm, 1000, 100_000_000, 10_000)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Custo por conversa" value={`${fmt(c.porConversa, 3)} MZN`} tone={c.porConversa < 1 ? 'good' : c.porConversa < 1.2 ? 'warn' : 'bad'} />
            <Stat label="Por mês (30 dias)" value={`${fmt(c.mes)} MZN`} />
            <Stat label="Por dia" value={`${fmt(c.dia)} MZN`} />
            <Stat label="Contra 42 MZN humanos" value={`${fmt(42 / Math.max(0.001, c.porConversa))}× mais barato`} tone="good" />
          </div>
          <div className="rounded-xl border border-soft p-3">
            <p className="text-xs font-semibold text-muted">Para onde vai o dinheiro (por conversa)</p>
            {[
              { nome: 'resposta e ferramentas', v: c.resposta, cor: 'bg-brand-500' },
              { nome: 'classificação (pequeno)', v: c.classif, cor: 'bg-accent-500' },
            ].map((x) => (
              <div key={x.nome} className="mt-1.5 text-xs">
                <div className="flex justify-between"><span className="text-body">{x.nome}</span><span className="font-mono text-muted">{fmt(x.v, 3)} MZN</span></div>
                <div className="h-2 rounded-full surface-sunken"><div className={`h-full rounded-full ${x.cor}`} style={{ width: `${(x.v / Math.max(c.semNada, 0.0001)) * 100}%` }} /></div>
              </div>
            ))}
            <p className="mt-2 text-xs text-muted">Sem cache nenhuma e tudo no médio: {fmt(c.semNada, 3)} MZN por conversa. Poupança actual: {fmt((1 - c.porConversa / Math.max(c.semNada, 0.0001)) * 100)}%.</p>
          </div>

          <div className="rounded-xl border border-soft p-3">
            <p className="text-xs font-semibold text-muted">Capacidade no pico (margem {MARGEM}×)</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Stat label="Turnos por minuto" value={fmt(c.turnosMin, 1)} />
              <Stat label="Streams em simultâneo" value={fmt(c.concorrentes, 1)} />
              <Stat label={`RPM médio × ${MARGEM} / limite`} value={`${fmt(c.rpmMed * MARGEM)} / ${fmt(rpm)}`} tone={gargRpm ? 'bad' : 'good'} />
              <Stat label={`TPM médio × ${MARGEM} / limite`} value={`${fmt(c.tpmMed * MARGEM)} / ${fmt(tpm)}`} tone={gargTpm ? 'bad' : 'good'} />
            </div>
            {(gargRpm || gargTpm) ? (
              <p className="mt-2 rounded-lg border border-rose-400/60 bg-rose-500/8 px-2.5 py-1.5 text-xs text-rose-800 dark:text-rose-200">
                O gargalo é o fornecedor, não o teu serviço: no pico com margem {MARGEM}× precisas de {gargTpm ? `${fmt(c.tpmMed * MARGEM)} TPM` : ''}{gargTpm && gargRpm ? ' e ' : ''}{gargRpm ? `${fmt(c.rpmMed * MARGEM)} RPM` : ''}. Pede o aumento de escalão antes do pico, reparte por um segundo fornecedor (<Ic>with_fallbacks</Ic>), e põe uma fila com backpressure à frente do modelo — um 429 no pico é uma sexta-feira às 20h sem assistente.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">Os limites aguentam o pico com margem. Repara que o serviço em si tem {fmt(c.concorrentes, 1)} streams abertos em média no pico (lei de Little: chegada × duração) — um único worker async chega.</p>
            )}
            <p className="mt-1 text-[0.68rem] text-muted">Alguns fornecedores não contam os tokens lidos da cache no limite de entrada; confirma na página de rate limits do teu.</p>
          </div>
          <p className="text-xs text-muted">
            Referência de <Ic>design.ts</Ic>: {fmt(referencia, 2)} MZN por conversa = <Ic>custo_conversa(3 turnos, 5 200, 180, médio, 60% de cache)</Ic>. Com 3,4 turnos e a classificação, o planeador dá {fmt(custoConversa(3.4, 5200, 180, 'medio', 0.6) + 3.4 * custoMzn(TOK_CLS_IN, TOK_CLS_OUT, 'pequeno'), 2)} MZN — continua abaixo do alvo de 1,00 MZN.
          </p>
        </div>
      </div>
    </Frame>
  );
}
