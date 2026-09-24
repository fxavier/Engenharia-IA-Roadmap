import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Frame, Field, NumberInput, Slider, Toggle, Stat, Segmented } from './shared';
import { INTENCOES } from '../../data/design';
import { SNAPSHOT } from '../../data/snapshot';
import {
  FUSOES, tokenizar, estimarTokens, comprimento, palavras, PRECOS, CAMBIO_USD_MZN, custoMzn, LOGITS_EXEMPLO,
  distribuicaoAmostragem, amostrar, ESQUEMAS, validarChamada, executarFerramenta,
} from './logica';
import type { Escalao } from './logica';

/* ═══════════════════════════════════════════════════════════════════════════
   Fundamentos — sete widgets da parte 1: a stack, os tokens, a amostragem, o
   custo, a janela de contexto, o esquema de uma ferramenta e a escolha do
   modelo. Os números saem de `src/data/design.ts`, do snapshot do runtime
   `balcao` e da porta em `logica.ts`; o que é ilustrativo di-lo na UI.
   ═══════════════════════════════════════════════════════════════════════════ */

const nf0 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function mzn(x: number): string {
  if (x === 0) return '0 MZN';
  if (Math.abs(x) < 0.01) return `${nf4.format(x)} MZN`;
  if (Math.abs(x) < 1000) return `${nf2.format(x)} MZN`;
  return `${nf0.format(x)} MZN`;
}

const pct = (x: number, casas = 0) => `${(x * 100).toFixed(casas).replace('.', ',')}%`;

/** Etiqueta pequena e arredondada. */
function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

/** Marca de «ilustrativo», para números que não saem do runtime nem do design. */
function Ilustrativo({ children = 'ilustrativo' }: { children?: ReactNode }) {
  return <Chip className="bg-accent-500/15 text-accent-800 dark:text-accent-300">{children}</Chip>;
}

const ESCALOES: Escalao[] = ['pequeno', 'medio', 'grande', 'local'];
const NOME_ESCALAO: Record<Escalao, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande', local: 'Local' };

/* ═══════════════════════════════════════════════════════════ 1. MapaStack */

type CamadaId = 'servico' | 'orquestracao' | 'ferramentas' | 'contexto' | 'modelo' | 'avaliacao' | 'operacao';

const CAMADAS: { id: CamadaId; nome: string; sub: string; modulos: string; transversal?: boolean }[] = [
  { id: 'servico', nome: 'Serviço', sub: 'FastAPI, SSE, autenticação, limites', modulos: 'módulo 25' },
  { id: 'orquestracao', nome: 'Orquestração', sub: 'grafo LangGraph, estado, interrupt, memória', modulos: 'módulos 13–19' },
  { id: 'ferramentas', nome: 'Ferramentas', sub: 'tool calling sobre as APIs do Chega', modulos: 'módulo 5' },
  { id: 'contexto', nome: 'Contexto e RAG', sub: 'prompt, chunks, pesquisa híbrida, citações', modulos: 'módulos 4, 7–12' },
  { id: 'modelo', nome: 'Modelo', sub: 'escalões pequeno / médio / grande, embeddings', modulos: 'módulos 2, 3, 6' },
  { id: 'avaliacao', nome: 'Avaliação e guardrails', sub: 'conjunto dourado, evals, juiz, injecção', modulos: 'módulos 20–24', transversal: true },
  { id: 'operacao', nome: 'Operação', sub: 'Git, Docker, CI/CD, traços, custo', modulos: 'módulos 26–30', transversal: true },
];

/** O que cada camada faz em cada intenção. Ausente = a camada não entra no caminho. */
const USO: Record<string, Partial<Record<CamadaId, string>>> = {
  'onde-esta': {
    servico: 'Resposta em SSE; o TTFT p95 < 1,5 s é o que o cliente sente.',
    orquestracao: 'Caminho curto: classificar → ferramenta → redigir. Sem ciclo.',
    ferramentas: '`ler_pedido` devolve estado e ETA — a resposta está aqui, não nas políticas.',
    modelo: 'Pequeno classifica a intenção; médio redige a frase a partir do JSON.',
    avaliacao: 'Asserção: o estado e o ETA citados são os que a ferramenta devolveu.',
    operacao: 'Latência da ferramenta e taxa de erro no traço de cada turno.',
  },
  compensacao: {
    servico: 'Confirmação explícita do cliente antes de emitir.',
    orquestracao: 'Grafo com `interrupt` acima de 500 MZN; checkpoint antes de emitir.',
    ferramentas: '`calcular_reembolso` decide o valor; `emitir_reembolso` com chave de idempotência.',
    contexto: 'Política de atraso e de reembolso, citada.',
    modelo: 'Médio conduz a conversa; nunca escolhe o valor.',
    avaliacao: 'Dinheiro mal devolvido < 0,5%; trajectória avaliada, não só a resposta.',
    operacao: 'Auditoria de cada acção de escrita, ligada ao traço.',
  },
  politica: {
    servico: 'Streaming da resposta com as citações validadas.',
    orquestracao: 'Um nó de RAG, sem ciclo nem ferramentas.',
    contexto: 'Pesquisa híbrida + re-rank sobre os chunks vigentes e públicos.',
    modelo: 'Médio responde só com base no contexto, com `[fonte]`.',
    avaliacao: 'Faithfulness e recall@k no conjunto dourado.',
    operacao: 'Custo por turno e taxa de recusas no painel.',
  },
  pagamentos: {
    servico: 'Resposta em SSE; nunca expõe dados de pagamento completos.',
    orquestracao: 'Router: política (RAG) ou pedido (ferramenta); suspeita → humano.',
    ferramentas: '`ler_pedido` e `ler_cliente` com autorização na ferramenta.',
    contexto: 'Prazos de reversão por meio de pagamento.',
    modelo: 'Médio redige; pequeno detecta pedido de humano.',
    avaliacao: 'Casos de fraude no red team: escala sem acusar.',
    operacao: 'Alertas de volume anómalo por meio de pagamento.',
  },
  conta: {
    servico: 'Autenticação: só a conta da sessão.',
    orquestracao: 'Handoff para humano com resumo.',
    ferramentas: '`transferir_humano` com o resumo do caso.',
    contexto: 'Explica o processo (verificação de identidade).',
    modelo: 'Pequeno classifica; médio explica.',
    avaliacao: 'Escala quando deve; nunca altera dados sozinho.',
    operacao: 'Fila e tempo de espera do suporte.',
  },
  seguranca: {
    servico: 'Prioridade urgente na fila.',
    orquestracao: 'Guarda de entrada salta directamente para humano.',
    ferramentas: '`transferir_humano` com prioridade urgente.',
    modelo: 'Pequeno como segunda rede depois das regras.',
    avaliacao: 'Zero falsos negativos tolerados no red team.',
    operacao: 'Alerta imediato ao responsável de turno.',
  },
  outros: {
    servico: 'Resposta curta, em streaming.',
    orquestracao: 'Um nó de RAG; sem resultado acima do limiar → recusa.',
    contexto: 'Pesquisa sem resultado relevante é o sinal para recusar.',
    modelo: 'Médio redige a recusa com uma alternativa.',
    avaliacao: 'Recusa correcta ≥ 90%: inventar aqui é a falha mais cara.',
    operacao: 'Deriva de perguntas: tema novo a crescer é um documento em falta.',
  },
};

type TipoAlternativa = 'regra' | 'pesquisa' | 'ml';

const SEM_LLM: Record<string, { tipo: TipoAlternativa; veredicto: string; texto: string }> = {
  'onde-esta': { tipo: 'regra', veredicto: 'Em grande parte, sim', texto: 'Um template por estado («O seu pedido está a caminho, chega em {eta_min} min») cobre a resposta. O que falta é perceber a pergunta em texto livre — e isso é classificação, não geração.' },
  compensacao: { tipo: 'regra', veredicto: 'O valor, sim; a conversa, não', texto: 'O cálculo é regra pura: mais de 20 min de atraso → cupão de 100 MZN, mais de 45 → 200 MZN. Está em `calcular_reembolso`. O LLM conduz a conversa e nunca decide quanto.' },
  politica: { tipo: 'pesquisa', veredicto: 'Parcialmente', texto: 'BM25 sobre as FAQ a mostrar o artigo resolve as perguntas que usam as palavras da política. O LLM ganha quando o cliente diz «estorno no Visa» e a política diz «reembolso no cartão», ou quando a resposta junta duas fontes.' },
  pagamentos: { tipo: 'ml', veredicto: 'A detecção de fraude, sim', texto: 'Sinais de fraude (reembolsos em 30 dias, conta nova com cupões, número de carteira diferente) são features para ML clássico — gradient boosting sobre dados tabulares —, não texto para um LLM ler.' },
  conta: { tipo: 'regra', veredicto: 'Sim, com um humano', texto: 'O fluxo é fixo (Perfil > Privacidade) e a alteração exige verificação de identidade por uma pessoa. O LLM só explica e encaminha.' },
  seguranca: { tipo: 'regra', veredicto: 'Sim: a regra vem primeiro', texto: 'Uma lista de termos (alergia, amendoim, intoxicação, ameaça, roubo) manda para humano antes de qualquer modelo. Um classificador que falha 1 em 100 não serve para isto; a regra falha de forma previsível.' },
  outros: { tipo: 'ml', veredicto: 'A detecção, sim', texto: 'Um classificador de intenção (regressão logística sobre TF-IDF) marca «fora de âmbito» em milissegundos e sem custo por token. O LLM só redige a recusa.' },
};

const ALTERNATIVAS: { tipo: TipoAlternativa; nome: string; quando: string; custo: string }[] = [
  { tipo: 'regra', nome: 'Regra / código', quando: 'O espaço de casos é enumerável e o erro tem de ser previsível (limites de dinheiro, segurança).', custo: '< 1 ms, 0 MZN, testável com casos fixos.' },
  { tipo: 'pesquisa', nome: 'Pesquisa', quando: 'A resposta já existe escrita num documento e o cliente usa as palavras dele.', custo: '≈ 45 ms no PostgreSQL, sem tokens.' },
  { tipo: 'ml', nome: 'ML clássico', quando: 'Há dados etiquetados e uma saída fechada (classe, score): intenção, fraude, prioridade.', custo: 'ms por previsão; precisa de dados e de re-treino.' },
];

const CAMINHO: Record<string, { label: string; cls: string }> = {
  rag: { label: 'RAG', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  ferramenta: { label: 'ferramenta', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  agente: { label: 'agente', cls: 'bg-brand-500/15 text-brand-700 dark:text-brand-300' },
  humano: { label: 'humano', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
};

const TIPO_ALT: Record<TipoAlternativa, string> = { regra: 'regra', pesquisa: 'pesquisa', ml: 'ML clássico' };

export function MapaStack() {
  const [sel, setSel] = useState<string>('compensacao');
  const [semLlm, setSemLlm] = useState(false);
  const it = INTENCOES.find((i) => i.id === sel) ?? INTENCOES[0];
  const uso = USO[it.id] ?? {};
  const cobertura = (c: CamadaId) => INTENCOES.filter((i) => USO[i.id]?.[c]).reduce((a, i) => a + i.peso, 0);
  const alt = SEM_LLM[it.id];

  return (
    <Frame
      title="Mapa da stack de IA"
      hint="As percentagens são o peso de cada intenção em `INTENCOES` (design do «Balcão»). A coluna da direita diz que fracção das conversas passa por cada camada — a avaliação e a operação são 100% porque são transversais."
      aside={<Toggle checked={semLlm} onChange={setSemLlm} label="Seria melhor sem LLM?" />}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Intenções do «Balcão»</p>
          <ul className="space-y-1.5">
            {INTENCOES.map((i) => {
              const on = i.id === it.id;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(i.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${on ? 'border-brand-500 bg-brand-500/10' : 'border-soft hover:bg-[var(--surface-sunken)]'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-strong">{i.nome}</span>
                      <Chip className={CAMINHO[i.caminho].cls}>{CAMINHO[i.caminho].label}</Chip>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full surface-sunken">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(i.peso / 31) * 100}%` }} />
                      </span>
                      <span className="w-10 text-right font-mono text-xs text-muted">{i.peso}%</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Camadas que resolvem «{it.nome}»</p>
          <div className="space-y-1.5">
            {CAMADAS.map((c, idx) => {
              const papel = uso[c.id];
              const cob = cobertura(c.id);
              return (
                <div key={c.id}>
                  {idx === 5 && <p className="mt-3 mb-1.5 text-[0.68rem] font-bold tracking-widest text-muted uppercase">Transversais</p>}
                  <div
                    className={`rounded-xl border px-3 py-2 transition-all duration-300 ${papel ? 'border-brand-500/70 bg-brand-500/8 shadow-card' : 'border-dashed border-soft opacity-55'}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-bold text-strong">
                        <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${papel ? 'bg-brand-500' : 'bg-[var(--border-soft)]'}`} aria-hidden />
                        {c.nome}
                        <span className="ml-2 text-xs font-normal text-muted">{c.modulos}</span>
                      </p>
                      <span className="font-mono text-[0.7rem] text-muted" title="Fracção das conversas que usam esta camada">{cob}% das conversas</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
                    {papel && <p className="mt-1 text-sm text-body animate-fade-up">{papel.replace(/`/g, '')}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Stat label="Peso" value={`${it.peso}% das conversas`} />
        <Stat label="Caminho" value={CAMINHO[it.caminho].label} />
        <Stat label="Resolução alvo" value={it.resolucaoAlvo} tone={it.caminho === 'humano' ? 'warn' : 'good'} />
        <Stat label="Conversas/dia" value={`≈ ${nf0.format((1150 * it.peso) / 100)}`} />
      </div>
      <blockquote className="mt-3 rounded-xl border-l-4 border-brand-500 surface-sunken px-3.5 py-2 text-sm text-body">
        <span className="text-muted">Cliente: </span>«{it.exemplo}»
        <p className="mt-1 text-xs text-muted">{it.nota.replace(/`/g, '')}</p>
      </blockquote>

      {semLlm && (
        <div className="mt-4 animate-fade-up rounded-xl border border-accent-500/40 bg-accent-500/5 p-3.5">
          <p className="text-xs font-bold tracking-wide text-accent-800 uppercase dark:text-accent-300">
            Sem LLM? — {alt.veredicto} ({TIPO_ALT[alt.tipo]})
          </p>
          <p className="mt-1.5 text-sm text-body">{alt.texto.replace(/`/g, '')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {ALTERNATIVAS.map((a) => (
              <div key={a.tipo} className={`rounded-lg border p-2.5 ${a.tipo === alt.tipo ? 'border-accent-500 surface' : 'border-soft surface'}`}>
                <p className="text-sm font-bold text-strong">{a.nome}</p>
                <p className="mt-1 text-xs text-body">{a.quando}</p>
                <p className="mt-1 font-mono text-[0.7rem] text-muted">{a.custo}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Regra prática: o LLM entra onde há texto livre para interpretar ou redigir; o que é cálculo, limite ou classificação fechada fica em código ou ML clássico, à volta dele.
          </p>
        </div>
      )}
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 2. Tokenizador */

const EXEMPLOS_TOKENS: { label: string; texto: string }[] = [
  { label: 'Reembolso', texto: 'O reembolso chega em 24 horas no M-Pesa.' },
  { label: 'Política', texto: 'Um pedido que não foi entregue é reembolsado na totalidade, incluindo a taxa de entrega e a taxa de serviço.' },
  { label: 'Nomes e números', texto: 'Sou a Nhamússua Cossa, do bairro de Chamanculo. O PD-8841273 custou 1 250,50 MZN.' },
  { label: 'WhatsApp', texto: 'boa noite mano, o motoqueiro esqueceu-se de mim 😤 paguei 2x no mpesa!!' },
  { label: 'Changana', texto: 'Khanimambo! A xima com matapa chegou fria.' },
  { label: 'Emoji e símbolos', texto: 'Entrega às 20h30 🛵🍕 — 5 km, taxa de 95 MZN (≈ 1,49 USD).' },
];

const CORES_TOKEN = [
  'bg-violet-200/80 dark:bg-violet-500/30',
  'bg-amber-200/80 dark:bg-amber-500/30',
  'bg-emerald-200/80 dark:bg-emerald-500/30',
  'bg-sky-200/80 dark:bg-sky-500/30',
  'bg-rose-200/80 dark:bg-rose-500/30',
  'bg-lime-200/80 dark:bg-lime-500/30',
];

const VOCAB_BASE = new Set(SNAPSHOT.documentos.flatMap((d) => Array.from(d.texto))).size;

function TokenChip({ t, i }: { t: string; i: number }) {
  const lead = t.startsWith(' ');
  const corpo = (lead ? t.slice(1) : t).replace(/\n/g, '↵');
  return (
    <span className={`inline-flex items-baseline rounded-md px-1 py-0.5 font-mono text-[0.8rem] leading-tight text-strong ${CORES_TOKEN[i % CORES_TOKEN.length]}`}>
      {lead && <span className="text-muted" aria-label="espaço">·</span>}
      {/^\s+$/.test(corpo) ? <span className="text-muted">{corpo.replace(/ /g, '·')}</span> : corpo}
    </span>
  );
}

export function Tokenizador() {
  const [texto, setTexto] = useState(EXEMPLOS_TOKENS[0].texto);
  const [n, setN] = useState(400);
  const [esc, setEsc] = useState<Escalao>('medio');

  const tokens = useMemo(() => tokenizar(texto, n), [texto, n]);
  const chars = comprimento(texto);
  const est = texto.length ? estimarTokens(texto) : 0;
  const nPalavras = palavras(texto).length;
  const custo = (est * PRECOS[esc].entrada * CAMBIO_USD_MZN) / 1_000_000;
  const ultimas = FUSOES.slice(Math.max(0, n - 6), n);

  return (
    <Frame
      title="Tokenizador BPE"
      hint="As 400 fusões foram aprendidas pelo `balcao` sobre os 40 documentos do corpus (`treinar_bpe`). Um vocabulário tão pequeno parte mais do que o de um modelo comercial (≈ 100 k a 200 k tokens), por isso a contagem BPE daqui é por excesso; para orçamentos usa-se a estimativa de ≈ 3,6 caracteres por token em português."
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {EXEMPLOS_TOKENS.map((e) => (
          <button key={e.label} type="button" className="btn btn-ghost btn-sm" onClick={() => setTexto(e.texto)}>
            {e.label}
          </button>
        ))}
      </div>
      <Field label="Texto">
        <textarea className="field min-h-20 resize-y" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label={`Fusões aplicadas: ${n} de ${FUSOES.length} · vocabulário ≈ ${VOCAB_BASE + n} símbolos`}>
          <Slider value={n} onChange={setN} min={0} max={FUSOES.length} />
        </Field>
        <Field label="Escalão para o custo">
          <Segmented value={esc} onChange={setEsc} options={ESCALOES.map((e) => ({ value: e, label: NOME_ESCALAO[e] }))} />
        </Field>
      </div>

      <div className="mt-3 rounded-xl border border-soft surface-sunken p-3" aria-label="Tokens">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted">Escreve alguma coisa.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tokens.map((t, i) => <TokenChip key={i} t={t} i={i} />)}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Tokens BPE" value={nf0.format(tokens.length)} />
        <Stat label="Caracteres" value={nf0.format(chars)} />
        <Stat label="Chars / token" value={tokens.length ? nf2.format(chars / tokens.length) : '—'} />
        <Stat label="Estimativa 3,6" value={nf0.format(est)} />
        <Stat label="Tokens / palavra" value={nPalavras ? nf2.format(tokens.length / nPalavras) : '—'} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-soft p-3">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Últimas fusões aprendidas</p>
          {ultimas.length === 0 ? (
            <p className="mt-1.5 text-sm text-body">Nenhuma: cada carácter é um token. É o ponto de partida do BPE.</p>
          ) : (
            <ol className="mt-1.5 flex flex-wrap gap-1.5" start={n - ultimas.length + 1}>
              {ultimas.map(([a, b], i) => (
                <li key={i} className="rounded-md border border-soft px-1.5 py-0.5 font-mono text-xs text-body">
                  <span className="text-muted">#{n - ultimas.length + i + 1}</span> «{a.replace(/ /g, '·')}» + «{b.replace(/ /g, '·')}» → «{(a + b).replace(/ /g, '·')}»
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-muted">Cada fusão junta o par de símbolos adjacentes mais frequente no corpus. As primeiras são « d», « a», « p» — o espaço colado ao início da palavra.</p>
        </div>
        <div className="rounded-xl border border-soft p-3">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Custo de entrada ({NOME_ESCALAO[esc]})</p>
          <p className="mt-1.5 font-mono text-lg font-bold text-strong">{mzn(custo)}</p>
          <p className="text-xs text-muted">por mensagem, com a estimativa de {nf0.format(est)} tokens a {nf2.format(PRECOS[esc].entrada)} USD por milhão e 1 USD = {nf1.format(CAMBIO_USD_MZN)} MZN</p>
          <p className="mt-2 font-mono text-sm text-body">{mzn(custo * 3900)} <span className="text-xs text-muted">por dia, a ≈ 3 900 mensagens de cliente</span></p>
          <p className="mt-2 text-xs text-muted">Repara nos nomes (Nhamússua, Chamanculo), nos números e no emoji: partem-se em muitos tokens. O custo de uma mensagem do cliente é irrelevante — o que pesa é o prompt de sistema, os esquemas e o contexto RAG que vão em cada turno.</p>
        </div>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════ 3. AmostragemLab */

const PRESETS_AMOSTRAGEM: { label: string; t: number; k: number; p: number }[] = [
  { label: 'Classificador (T = 0)', t: 0, k: 0, p: 1 },
  { label: 'Resposta ao cliente', t: 0.3, k: 0, p: 0.9 },
  { label: 'Por omissão (T = 1)', t: 1, k: 0, p: 1 },
  { label: 'Criativo (T = 1,6)', t: 1.6, k: 0, p: 1 },
];

export function AmostragemLab() {
  const [t, setT] = useState(1);
  const [k, setK] = useState(0);
  const [p, setP] = useState(1);
  const [seed, setSeed] = useState(7);
  const [rodada, setRodada] = useState<number | null>(null);

  const dist = useMemo(() => distribuicaoAmostragem(LOGITS_EXEMPLO, t, k, p), [t, k, p]);
  const amostras = useMemo(() => (rodada === null ? null : amostrar(LOGITS_EXEMPLO, { temperatura: t, topK: k, topP: p, seed: seed + rodada, n: 20 })), [rodada, t, k, p, seed]);
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of amostras ?? []) m.set(a, (m.get(a) ?? 0) + 1);
    return m;
  }, [amostras]);
  const mantidos = dist.filter((d) => d.mantido).length;
  const entropia = -dist.filter((d) => d.pFinal > 0).reduce((a, d) => a + d.pFinal * Math.log2(d.pFinal), 0);
  const maxP = Math.max(...dist.map((d) => Math.max(d.p, d.pFinal)), 0.01);

  return (
    <Frame
      title="Temperatura, top-k e top-p"
      hint="Logits de `balcao.LOGITS_EXEMPLO`. Ordem das operações como em `balcao.amostrar`: temperatura → top-k → top-p → renormalizar → sortear. O sorteio usa um PRNG com semente (mulberry32), não o do numpy: as probabilidades coincidem com o Python, a sequência sorteada não."
    >
      <p className="mb-3 rounded-xl border border-soft surface-sunken px-3.5 py-2.5 font-mono text-sm text-strong">
        O seu pedido está a<span className="ml-0.5 inline-block min-w-16 rounded bg-brand-500/15 px-1 text-brand-700 dark:text-brand-300">{amostras ? amostras[0] : ' ▁▁▁'}</span>
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS_AMOSTRAGEM.map((pr) => (
          <button key={pr.label} type="button" className="btn btn-ghost btn-sm" onClick={() => { setT(pr.t); setK(pr.k); setP(pr.p); }}>
            {pr.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Temperatura: ${nf2.format(t)}${t === 0 ? ' (greedy)' : ''}`}><Slider value={t} onChange={setT} min={0} max={2} step={0.05} /></Field>
        <Field label={`top-k: ${k === 0 ? 'desligado' : k}`}><Slider value={k} onChange={setK} min={0} max={8} /></Field>
        <Field label={`top-p: ${nf2.format(p)}${p === 1 ? ' (desligado)' : ''}`}><Slider value={p} onChange={setP} min={0.05} max={1} step={0.05} /></Field>
      </div>

      <div className="mt-4 space-y-1.5" role="table" aria-label="Distribuição do próximo token">
        {dist.map((d) => (
          <div key={d.token} role="row" className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.2rem] items-center gap-2 sm:grid-cols-[7.5rem_3.2rem_minmax(0,1fr)_4.5rem]">
            <span role="cell" className={`truncate font-mono text-sm ${d.mantido ? 'text-strong' : 'text-muted line-through'}`}>«{d.token.trim()}»</span>
            <span role="cell" className="hidden font-mono text-xs text-muted sm:block">{nf1.format(d.logit)}</span>
            <span role="cell" className="relative h-4 overflow-hidden rounded surface-sunken">
              <span className="absolute inset-y-0 left-0 rounded bg-brand-500/25" style={{ width: `${(d.p / maxP) * 100}%` }} />
              <span className="absolute inset-y-1 left-0 rounded bg-brand-600 transition-all duration-300 dark:bg-brand-400" style={{ width: `${(d.pFinal / maxP) * 100}%` }} />
            </span>
            <span role="cell" className="text-right font-mono text-xs text-body">
              {d.mantido ? pct(d.pFinal, 1) : <span className="text-rose-600 dark:text-rose-400">{d.corte}</span>}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        <span className="mr-1 inline-block h-2 w-4 rounded bg-brand-500/25 align-middle" /> depois da temperatura
        <span className="mr-1 ml-3 inline-block h-2 w-4 rounded bg-brand-600 align-middle dark:bg-brand-400" /> depois dos cortes, renormalizada
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Candidatos" value={`${mantidos} de ${dist.length}`} />
        <Stat label="Entropia" value={`${nf2.format(entropia)} bits`} />
        <Stat label="P(«caminho»)" value={pct(dist.find((d) => d.token === ' caminho')?.pFinal ?? 0, 1)} />
      </div>

      <div className="mt-4 rounded-xl border border-soft p-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Semente"><NumberInput value={seed} onChange={(v) => { setSeed(Math.trunc(v)); setRodada(null); }} min={0} className="w-24" /></Field>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setRodada((r) => (r === null ? 0 : r + 1))}>Amostrar 20 vezes</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRodada(0)} disabled={rodada === null}>Repetir com a semente {seed}</button>
          {rodada !== null && <span className="text-xs text-muted">semente efectiva {seed + rodada}</span>}
        </div>
        {amostras && (
          <div className="mt-3 animate-fade-up">
            <div className="flex flex-wrap gap-1">
              {amostras.map((a, i) => <span key={i} className="rounded-md surface-sunken px-1.5 py-0.5 font-mono text-xs text-body">{a.trim()}</span>)}
            </div>
            <div className="mt-3 space-y-1">
              {dist.filter((d) => d.mantido).map((d) => {
                const c = contagem.get(d.token) ?? 0;
                return (
                  <div key={d.token} className="grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-xs">
                    <span className="truncate font-mono text-body">{d.token.trim()}</span>
                    <span className="relative h-3 rounded surface-sunken">
                      <span className="absolute inset-y-0 left-0 rounded bg-accent-500" style={{ width: `${(c / 20) * 100}%` }} />
                      <span className="absolute inset-y-[-2px] w-0.5" style={{ left: `${d.pFinal * 100}%`, background: 'var(--text-strong)' }} title="esperado" />
                    </span>
                    <span className="text-right font-mono text-muted">{c}/20 · esp. {nf1.format(d.pFinal * 20)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">Com 20 amostras o histograma afasta-se do esperado (a marca vertical): é esta variância que torna uma resposta difícil de testar por igualdade. Com T = 0 as 20 são iguais.</p>
          </div>
        )}
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════════ 4. CustoTokens */

const SEGMENTOS_CUSTO = [
  { id: 'sistema', label: 'Sistema', cor: 'var(--color-brand-600)' },
  { id: 'ferramentas', label: 'Esquemas', cor: 'var(--color-brand-400)' },
  { id: 'rag', label: 'Contexto RAG', cor: 'oklch(0.66 0.13 230)' },
  { id: 'historico', label: 'Histórico', cor: 'oklch(0.70 0.12 160)' },
  { id: 'pergunta', label: 'Pergunta', cor: 'oklch(0.72 0.14 130)' },
  { id: 'saida', label: 'Saída', cor: 'var(--color-accent-500)' },
] as const;

export function CustoTokens() {
  const [turnos, setTurnos] = useState(3);
  const [sistema, setSistema] = useState(900);
  const [esquemas, setEsquemas] = useState(1100);
  const [rag, setRag] = useState(2000);
  const [pergunta, setPergunta] = useState(40);
  const [resFerr, setResFerr] = useState(380);
  const [saida, setSaida] = useState(180);
  const [cachePct, setCachePct] = useState(60);
  const [esc, setEsc] = useState<Escalao>('medio');
  const [classificar, setClassificar] = useState(true);
  const [porDia, setPorDia] = useState(1150);

  const t = Math.max(1, Math.min(20, Math.round(turnos)));
  const linhas = Array.from({ length: t }, (_, i) => {
    const historico = i * (pergunta + saida + resFerr);
    const entrada = sistema + esquemas + rag + pergunta + historico;
    const cache = Math.round((entrada * cachePct) / 100);
    const custo = custoMzn(entrada, saida, esc, cache);
    const classif = classificar ? custoMzn(1000, 5, 'pequeno') : 0;
    return { i, historico, entrada, cache, custo, classif, seg: { sistema, ferramentas: esquemas, rag, historico, pergunta, saida } };
  });
  const porConversa = linhas.reduce((a, l) => a + l.custo + l.classif, 0);
  const dia = porConversa * porDia;
  const mes = dia * 30;
  const maxTot = Math.max(...linhas.map((l) => l.entrada + saida));
  const humano = 42;
  const escaladas = 0.32;
  const custoComBalcao = porDia * (porConversa + escaladas * humano);
  const custoSoHumano = porDia * humano;

  return (
    <Frame
      title="Calculadora de custo por conversa"
      hint="Fórmula de `balcao.custo_mzn`: (entrada − cache) × preço de entrada + cache × preço de leitura de cache + saída × preço de saída, por milhão de tokens, × 63,9 MZN/USD. Preços dos escalões do snapshot; confirma sempre na página de preços do fornecedor. Os valores por omissão seguem o dimensionamento do «Balcão», que estima ≈ 0,66 MZN por conversa com 3,4 turnos em média."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Turnos por conversa" suffix="turnos"><NumberInput value={turnos} onChange={setTurnos} min={1} max={20} /></Field>
        <Field label="Prompt de sistema" suffix="tok"><NumberInput value={sistema} onChange={setSistema} min={0} step={50} /></Field>
        <Field label="Esquemas de ferramentas" suffix="tok"><NumberInput value={esquemas} onChange={setEsquemas} min={0} step={50} /></Field>
        <Field label="Contexto RAG por turno" suffix="tok"><NumberInput value={rag} onChange={setRag} min={0} step={100} /></Field>
        <Field label="Pergunta do cliente" suffix="tok"><NumberInput value={pergunta} onChange={setPergunta} min={0} step={10} /></Field>
        <Field label="Resultados de ferramentas" suffix="tok"><NumberInput value={resFerr} onChange={setResFerr} min={0} step={20} /></Field>
        <Field label="Saída por turno" suffix="tok"><NumberInput value={saida} onChange={setSaida} min={1} step={10} /></Field>
        <Field label="Conversas por dia" suffix="/dia"><NumberInput value={porDia} onChange={setPorDia} min={0} step={50} /></Field>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Field label={`Fracção da entrada lida da cache de prompt: ${cachePct}%`}><Slider value={cachePct} onChange={setCachePct} min={0} max={90} step={5} /></Field>
        <Field label="Escalão da resposta"><Segmented value={esc} onChange={setEsc} options={ESCALOES.map((e) => ({ value: e, label: NOME_ESCALAO[e] }))} /></Field>
      </div>
      <div className="mt-2">
        <Toggle checked={classificar} onChange={setClassificar} label="Classificar a intenção no modelo pequeno em cada turno (≈ 1 000 tokens de entrada, 5 de saída)" />
      </div>

      <div className="mt-4 space-y-2">
        {linhas.map((l) => (
          <div key={l.i} className="grid grid-cols-[3.2rem_minmax(0,1fr)_5.8rem] items-center gap-2">
            <span className="text-xs font-semibold text-muted">Turno {l.i + 1}</span>
            <div className="relative flex h-5 overflow-hidden rounded surface-sunken" title={`${nf0.format(l.entrada)} tokens de entrada, ${nf0.format(saida)} de saída`}>
              {SEGMENTOS_CUSTO.map((s) => {
                const v = l.seg[s.id];
                return v > 0 ? <span key={s.id} style={{ width: `${(v / maxTot) * 100}%`, background: s.cor }} className="h-full border-r border-[var(--surface-raised)] transition-all duration-300" /> : null;
              })}
              <span
                className="pointer-events-none absolute inset-y-0 left-0 border-r-2 border-dashed border-[var(--text-strong)]"
                style={{ width: `${(l.cache / maxTot) * 100}%`, background: 'repeating-linear-gradient(135deg, transparent 0 4px, oklch(1 0 0 / 0.35) 4px 6px)' }}
                aria-hidden
              />
            </div>
            <span className="text-right font-mono text-xs text-body">{mzn(l.custo + l.classif)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {SEGMENTOS_CUSTO.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: s.cor }} />{s.label}</span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-[var(--text-strong)]" />lido da cache</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Por conversa" value={mzn(porConversa)} tone={porConversa < 1 ? 'good' : porConversa < 1.5 ? 'warn' : 'bad'} />
        <Stat label="Por dia" value={mzn(dia)} />
        <Stat label="Por mês (30 dias)" value={mzn(mes)} />
        <Stat label="Por mês em USD" value={`${nf0.format(mes / CAMBIO_USD_MZN)} USD`} />
      </div>
      <div className="mt-3 rounded-xl border border-soft surface-sunken p-3 text-sm text-body">
        <p>
          Uma conversa humana custa <b className="text-strong">42 MZN</b>: {porConversa > 0 ? <>≈ <b className="text-strong">{nf0.format(humano / porConversa)}×</b> o custo de modelo desta configuração.</> : 'o modelo local não tem custo por token (paga-se o hardware).'}
          {' '}Mas o humano não desaparece: com 32% das conversas escaladas, o custo diário passa de {mzn(custoSoHumano)} (só humanos) para {mzn(custoComBalcao)} (modelo em todas + humano nas escaladas).
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Repara no histórico: o turno {t} paga {nf0.format(linhas[t - 1].historico)} tokens de conversa anterior. É por isso que o custo por conversa cresce mais depressa do que o número de turnos — e por isso existem o resumo de histórico e a cache de prompt.
        </p>
      </div>
    </Frame>
  );
}

/* ═════════════════════════════════════════════════════════ 5. ContextoJanela */

const JANELAS: { value: string; label: string; tokens: number }[] = [
  { value: '8000', label: '8 k · laboratório', tokens: 8_000 },
  { value: '32000', label: '32 k · local', tokens: 32_000 },
  { value: '128000', label: '128 k · pequeno', tokens: 128_000 },
  { value: '200000', label: '200 k · médio', tokens: 200_000 },
];

/** Curva em U ilustrativa (forma qualitativa de Liu et al., 2023): acerto vs posição da informação relevante. */
function acertoPorPosicao(x: number): number {
  return 0.56 + 0.3 * (2 * x - 1) ** 2 + 0.06 * x;
}

export function ContextoJanela() {
  const [janelaId, setJanelaId] = useState('8000');
  const [sistema, setSistema] = useState(900);
  const [nFerr, setNFerr] = useState(12);
  const [tokFerr, setTokFerr] = useState(92);
  const [k, setK] = useState(5);
  const [tokChunk, setTokChunk] = useState(400);
  const [turnosHist, setTurnosHist] = useState(4);
  const [tokTurno, setTokTurno] = useState(250);
  const [pergunta, setPergunta] = useState(40);
  const [reserva, setReserva] = useState(1024);
  const [ordem, setOrdem] = useState<'inicio' | 'meio' | 'fim'>('inicio');
  const [ragJuntoPergunta, setRagJuntoPergunta] = useState(false);

  const janela = JANELAS.find((j) => j.value === janelaId)?.tokens ?? 8000;
  const ferramentas = nFerr * tokFerr;
  const ragTot = k * tokChunk;
  const historico = turnosHist * tokTurno;
  const blocos = ragJuntoPergunta
    ? [
        { id: 'sistema', label: 'Sistema', v: sistema, cor: 'var(--color-brand-600)' },
        { id: 'ferramentas', label: 'Ferramentas', v: ferramentas, cor: 'var(--color-brand-400)' },
        { id: 'historico', label: 'Histórico', v: historico, cor: 'oklch(0.70 0.12 160)' },
        { id: 'rag', label: 'Contexto RAG', v: ragTot, cor: 'oklch(0.66 0.13 230)' },
        { id: 'pergunta', label: 'Pergunta', v: pergunta, cor: 'oklch(0.72 0.14 130)' },
      ]
    : [
        { id: 'sistema', label: 'Sistema', v: sistema, cor: 'var(--color-brand-600)' },
        { id: 'ferramentas', label: 'Ferramentas', v: ferramentas, cor: 'var(--color-brand-400)' },
        { id: 'rag', label: 'Contexto RAG', v: ragTot, cor: 'oklch(0.66 0.13 230)' },
        { id: 'historico', label: 'Histórico', v: historico, cor: 'oklch(0.70 0.12 160)' },
        { id: 'pergunta', label: 'Pergunta', v: pergunta, cor: 'oklch(0.72 0.14 130)' },
      ];
  const entrada = blocos.reduce((a, b) => a + b.v, 0);
  const total = entrada + reserva;
  const escala = Math.max(total, janela);
  const excede = total > janela;
  const idxRel = k === 0 ? -1 : ordem === 'inicio' ? 0 : ordem === 'fim' ? k - 1 : Math.floor((k - 1) / 2);
  const inicioRag = blocos.slice(0, blocos.findIndex((b) => b.id === 'rag')).reduce((a, b) => a + b.v, 0);
  const posRel = idxRel < 0 || entrada === 0 ? 0 : (inicioRag + (idxRel + 0.5) * tokChunk) / entrada;
  const acerto = acertoPorPosicao(posRel);

  const W = 320;
  const H = 120;
  const curva = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    return `${i === 0 ? 'M' : 'L'}${(20 + x * (W - 30)).toFixed(1)},${(H - 20 - (acertoPorPosicao(x) - 0.5) * 2 * (H - 35)).toFixed(1)}`;
  }).join(' ');
  const mx = 20 + posRel * (W - 30);
  const my = H - 20 - (acerto - 0.5) * 2 * (H - 35);

  return (
    <Frame
      title="Orçamento da janela de contexto"
      hint="Contagens em tokens de entrada; a reserva é o `max_tokens` da resposta, que também tem de caber na janela. Os valores por omissão são os do «Balcão»: 900 de sistema, 12 ferramentas ≈ 1 100 tokens de esquemas, ≈ 2 000 de contexto RAG."
      aside={<Segmented value={janelaId} onChange={setJanelaId} options={JANELAS.map((j) => ({ value: j.value, label: j.label }))} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={`Prompt de sistema: ${nf0.format(sistema)} tok`}><Slider value={sistema} onChange={setSistema} min={100} max={4000} step={50} /></Field>
        <Field label={`Ferramentas: ${nFerr} × ${tokFerr} tok`}><Slider value={nFerr} onChange={setNFerr} min={0} max={40} /></Field>
        <Field label={`Tokens por esquema: ${tokFerr}`}><Slider value={tokFerr} onChange={setTokFerr} min={40} max={300} step={4} /></Field>
        <Field label={`Chunks recuperados (k): ${k}`}><Slider value={k} onChange={setK} min={0} max={20} /></Field>
        <Field label={`Tokens por chunk: ${tokChunk}`}><Slider value={tokChunk} onChange={setTokChunk} min={100} max={1500} step={50} /></Field>
        <Field label={`Turnos de histórico: ${turnosHist} × ${tokTurno} tok`}><Slider value={turnosHist} onChange={setTurnosHist} min={0} max={30} /></Field>
        <Field label={`Tokens por turno de histórico: ${tokTurno}`}><Slider value={tokTurno} onChange={setTokTurno} min={50} max={1500} step={50} /></Field>
        <Field label={`Pergunta: ${pergunta} tok`}><Slider value={pergunta} onChange={setPergunta} min={5} max={500} step={5} /></Field>
        <Field label={`Reserva para a resposta: ${nf0.format(reserva)} tok`}><Slider value={reserva} onChange={setReserva} min={128} max={8192} step={128} /></Field>
      </div>

      <div className="mt-4">
        <div className="relative flex h-10 overflow-hidden rounded-lg border border-soft surface-sunken" role="img" aria-label={`Janela de ${nf0.format(janela)} tokens, ${nf0.format(total)} usados`}>
          {blocos.map((b) =>
            b.v > 0 ? (
              <span key={b.id} className="relative flex h-full border-r border-[var(--surface-raised)] transition-all duration-300" style={{ width: `${(b.v / escala) * 100}%`, background: b.cor }} title={`${b.label}: ${nf0.format(b.v)} tokens`}>
                {b.id === 'rag' && Array.from({ length: k }, (_, i) => (
                  <span key={i} className={`h-full flex-1 border-r border-white/40 ${i === idxRel ? 'bg-amber-300/90' : ''}`} title={i === idxRel ? 'chunk mais relevante' : `chunk ${i + 1}`} />
                ))}
              </span>
            ) : null,
          )}
          <span className="h-full transition-all duration-300" style={{ width: `${(reserva / escala) * 100}%`, background: 'repeating-linear-gradient(135deg, var(--color-accent-500) 0 5px, transparent 5px 9px)' }} title={`Reserva: ${nf0.format(reserva)}`} />
          {excede && <span className="absolute inset-y-0 border-l-2 border-rose-600" style={{ left: `${(janela / escala) * 100}%` }} aria-hidden />}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {blocos.map((b) => <span key={b.id} className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: b.cor }} />{b.label} {nf0.format(b.v)}</span>)}
          <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-amber-300" />chunk mais relevante</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: 'repeating-linear-gradient(135deg, var(--color-accent-500) 0 3px, transparent 3px 5px)' }} />reserva {nf0.format(reserva)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Entrada" value={`${nf0.format(entrada)} tok`} />
        <Stat label="Com reserva" value={`${nf0.format(total)} tok`} tone={excede ? 'bad' : total > 0.75 * janela ? 'warn' : 'good'} />
        <Stat label="Uso da janela" value={pct(total / janela, 1)} tone={excede ? 'bad' : 'neutral'} />
        <Stat label="Custo de entrada (médio)" value={mzn(custoMzn(entrada, 0, 'medio'))} />
      </div>
      {excede && (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-sm text-rose-700 dark:text-rose-300" role="alert">
          Excede a janela em {nf0.format(total - janela)} tokens. O pedido é recusado pela API (ou, pior, truncado pelo teu código sem aviso). Corta primeiro o que menos vale por token: histórico antigo (resume-o), chunks a mais (baixa o k ou sobe o limiar), esquemas de ferramentas que esta intenção não usa.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Onde pôr o chunk mais relevante</p>
          <div className="mt-2">
            <Segmented value={ordem} onChange={setOrdem} options={[{ value: 'inicio', label: 'primeiro' }, { value: 'meio', label: 'no meio' }, { value: 'fim', label: 'último' }]} />
          </div>
          <div className="mt-2">
            <Toggle checked={ragJuntoPergunta} onChange={setRagJuntoPergunta} label="Contexto RAG depois do histórico (junto à pergunta)" />
          </div>
          <p className="mt-2 text-sm text-body">
            O chunk relevante fica a <b className="text-strong">{pct(posRel)}</b> da entrada. Os modelos usam pior a informação a meio de um contexto comprido do que no início ou no fim — o efeito <i>lost in the middle</i>. Por isso o «Balcão» ordena os chunks por score e põe o contexto perto da pergunta, e prefere k pequeno a k grande.
          </p>
        </div>
        <figure>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva ilustrativa de acerto em função da posição da informação relevante">
            <line x1={20} y1={H - 20} x2={W - 10} y2={H - 20} stroke="var(--border-soft)" />
            <line x1={20} y1={10} x2={20} y2={H - 20} stroke="var(--border-soft)" />
            <path d={curva} fill="none" stroke="var(--color-brand-500)" strokeWidth={2.5} />
            <line x1={mx} y1={H - 20} x2={mx} y2={my} stroke="var(--color-accent-500)" strokeDasharray="3 3" />
            <circle cx={mx} cy={my} r={5} fill="var(--color-accent-500)" />
            <text x={20} y={H - 6} fontSize={9} fill="var(--text-muted)">início</text>
            <text x={W / 2} y={H - 6} fontSize={9} fill="var(--text-muted)" textAnchor="middle">meio</text>
            <text x={W - 10} y={H - 6} fontSize={9} fill="var(--text-muted)" textAnchor="end">fim</text>
            <text x={26} y={16} fontSize={9} fill="var(--text-muted)">acerto</text>
          </svg>
          <figcaption className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Ilustrativo /> Forma qualitativa de Liu et al., 2023 (arXiv:2307.03172); os valores não são do artigo e variam por modelo.
          </figcaption>
        </figure>
      </div>
    </Frame>
  );
}

/* ═════════════════════════════════════════════════════ 6. EsquemaFerramenta */

const EXEMPLOS_CHAMADA: { label: string; tom: 'boa' | 'ma'; json: string; nota: string }[] = [
  { label: 'ler_pedido', tom: 'boa', json: '{"name": "ler_pedido", "arguments": {"pedido_id": "PD-8841273"}}', nota: 'Chamada válida: a ferramenta devolve o estado do pedido sem o campo `cliente`.' },
  { label: 'calcular_reembolso', tom: 'boa', json: '{"name": "calcular_reembolso", "arguments": {"pedido_id": "PD-8841990", "motivo": "atraso"}}', nota: 'O modelo escolhe o motivo; o valor sai da regra dentro da ferramenta.' },
  { label: 'campo em falta', tom: 'ma', json: '{"name": "calcular_reembolso", "arguments": {"pedido_id": "PD-8841990"}}', nota: 'O erro volta ao modelo como resultado da ferramenta: é isso que lhe permite corrigir a chamada no passo seguinte.' },
  { label: 'tipo errado', tom: 'ma', json: '{"name": "emitir_reembolso", "arguments": {"pedido_id": "PD-8841990", "valor_mzn": "300", "chave_idempotencia": "PD-8841990:atraso:1"}}', nota: 'O runtime didáctico só confere nomes de argumentos; um modelo Pydantic (ou a validação do JSON Schema) apanha o "300" em string antes de a ferramenta correr.' },
  { label: 'cliente_id injectado', tom: 'ma', json: '{"name": "ler_pedido", "arguments": {"pedido_id": "PD-8842507", "cliente_id": "CL-40311"}}', nota: 'Um texto malicioso levou o modelo a pôr o cliente de outra pessoa na chamada. `additionalProperties: false` rejeita-o — e, mesmo que passasse, a identidade vem da sessão autenticada, nunca de um argumento que o modelo escreve.' },
  { label: 'ferramenta inventada', tom: 'ma', json: '{"name": "alterar_taxa_entrega", "arguments": {"pedido_id": "PD-8841273", "taxa": 0}}', nota: 'O que não existe no catálogo não pode ser chamado, por mais convincente que seja o pedido.' },
  { label: 'válida mas errada', tom: 'ma', json: '{"name": "calcular_reembolso", "arguments": {"pedido_id": "PD-8841990", "motivo": "fome"}}', nota: 'Passa o esquema (motivo é uma string) e falha dentro da ferramenta. Um `enum: ["atraso", "nao_entregue", "artigo_em_falta"]` no esquema apanhava-o antes.' },
  { label: 'acima do limite', tom: 'ma', json: '{"name": "emitir_reembolso", "arguments": {"pedido_id": "PD-8841990", "valor_mzn": 1152, "chave_idempotencia": "PD-8841990:nao_entregue:1"}}', nota: 'Esquema válido; o limite de 500 MZN vive no código da ferramenta, não no prompt. O grafo pára num interrupt e um humano decide.' },
  { label: 'JSON partido', tom: 'ma', json: '{"name": "ler_pedido", "arguments": {"pedido_id": "PD-8841273",}}', nota: 'Vírgula a mais. Com structured output / tool calling nativo isto é raro; com JSON pedido em texto livre acontece e tem de ser tratado.' },
];

function modeloDeChamada(nome: string): string {
  const e = ESQUEMAS.find((x) => x.name === nome);
  if (!e) return '';
  const exemplo: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(e.input_schema.properties)) {
    if (!e.input_schema.required.includes(k)) continue;
    exemplo[k] = p.type === 'integer' ? 100 : k === 'pedido_id' ? 'PD-8841273' : k === 'cliente_id' ? 'CL-77120' : k === 'motivo' ? 'atraso' : k === 'consulta' ? 'prazo do reembolso no M-Pesa' : k === 'resumo' ? 'Cliente pede reembolso do PD-8841990; atraso de 53 min.' : 'PD-8841990:atraso:1';
  }
  return JSON.stringify({ name: nome, arguments: exemplo });
}

export function EsquemaFerramenta() {
  const [ferr, setFerr] = useState(ESQUEMAS[0].name);
  const [json, setJson] = useState(EXEMPLOS_CHAMADA[0].json);
  const [nota, setNota] = useState<string | null>(EXEMPLOS_CHAMADA[0].nota);

  const v = useMemo(() => validarChamada(json), [json]);
  const nomeNaChamada = useMemo(() => {
    try {
      const d = JSON.parse(json) as { name?: unknown };
      return typeof d?.name === 'string' ? d.name : null;
    } catch {
      return null;
    }
  }, [json]);
  const esquemaVisto = ESQUEMAS.find((e) => e.name === nomeNaChamada) ?? ESQUEMAS.find((e) => e.name === ferr) ?? ESQUEMAS[0];
  const resultado = useMemo(() => {
    if (v.problemas.some((p) => p.tipo === 'json' || p.tipo === 'forma')) return null;
    if (v.erroRuntime) return { erro: v.erroRuntime };
    if (!v.ok) return null;
    return executarFerramenta(JSON.parse(json) as { name?: unknown; arguments?: unknown });
  }, [v, json]);

  return (
    <Frame
      title="Esquema de ferramenta e validação de chamadas"
      hint="Os esquemas são os que `balcao.esquema_json` gera das assinaturas e docstrings (formato `input_schema` comum à Anthropic e à OpenAI). A execução corre contra os pedidos simulados do snapshot, com as mesmas regras de `executar_ferramenta`."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <Field label="Ferramenta">
            <select
              className="field"
              value={ferr}
              onChange={(e) => { setFerr(e.target.value); setJson(modeloDeChamada(e.target.value)); setNota(null); }}
            >
              {ESQUEMAS.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </Field>
          <p className="mt-2 text-sm text-body">{esquemaVisto.description}</p>
          <pre className="scrollbar-thin mt-2 max-h-80 overflow-auto rounded-xl border border-soft surface-sunken p-3 font-mono text-xs leading-relaxed text-body">
            {JSON.stringify({ name: esquemaVisto.name, description: esquemaVisto.description, input_schema: esquemaVisto.input_schema }, null, 2)}
          </pre>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-muted">Exemplos de chamadas do modelo</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {EXEMPLOS_CHAMADA.map((e) => (
              <button
                key={e.label}
                type="button"
                className={`btn btn-sm ${e.tom === 'boa' ? 'btn-ghost border-emerald-500/50' : 'btn-ghost border-rose-500/40'}`}
                onClick={() => { setJson(e.json); setNota(e.nota); }}
              >
                {e.label}
              </button>
            ))}
          </div>
          <Field label="Chamada (JSON emitido pelo modelo)">
            <textarea className="field field-mono min-h-28 resize-y text-xs" value={json} onChange={(e) => { setJson(e.target.value); setNota(null); }} spellCheck={false} rows={5} />
          </Field>

          <div className={`mt-3 rounded-xl border p-3 ${v.ok ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-rose-500/40 bg-rose-500/8'}`} aria-live="polite">
            <p className={`text-sm font-bold ${v.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
              {v.ok ? 'Chamada válida contra o esquema' : `${v.problemas.length} problema${v.problemas.length > 1 ? 's' : ''} na chamada`}
            </p>
            {v.problemas.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-sm text-body">
                {v.problemas.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <Chip className="bg-rose-500/15 text-rose-700 dark:text-rose-300">{p.tipo}</Chip>
                    <span className="font-mono text-xs">{p.msg}</span>
                  </li>
                ))}
              </ul>
            )}
            {!v.ok && !v.erroRuntime && v.problemas.every((p) => p.tipo === 'tipo') && (
              <p className="mt-1.5 text-xs text-muted">O runtime didáctico deixava passar esta chamada (só confere nomes); a validação de tipos é o que o Pydantic acrescenta.</p>
            )}
          </div>

          {resultado && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-muted">O que volta ao modelo (mensagem de ferramenta)</p>
              <pre className={`scrollbar-thin max-h-56 overflow-auto rounded-xl border p-3 font-mono text-xs leading-relaxed ${'erro' in resultado ? 'border-rose-500/40 text-rose-700 dark:text-rose-300' : 'border-soft text-body'} surface-sunken`}>
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          )}
          {nota && <p className="mt-3 rounded-xl border-l-4 border-brand-500 surface-sunken px-3 py-2 text-sm text-body">{nota.replace(/`/g, '')}</p>}
        </div>
      </div>
    </Frame>
  );
}

/* ═══════════════════════════════════════════════════════ 7. EscolherModelo */

/** Latência por escalão. Médio e grande saem de `MODELOS` (design); pequeno e local são ilustrativos. */
const PERF: Record<Escalao, { ttft: number; tokS: number; fonte: string }> = {
  pequeno: { ttft: 170, tokS: 110, fonte: 'ilustrativo, coerente com ≈ 350 ms para 20 tokens (design)' },
  medio: { ttft: 700, tokS: 60, fonte: 'design: ≈ 700 ms até ao primeiro token, ≈ 60 tok/s' },
  grande: { ttft: 1100, tokS: 40, fonte: 'design: ≈ 1,1 s até ao primeiro token; tok/s ilustrativo' },
  local: { ttft: 400, tokS: 25, fonte: 'ilustrativo: 15 a 40 tok/s num portátil (design)' },
};

/** Qualidade no conjunto dourado por intenção (%). ILUSTRATIVA: plausível, não medida. */
const QUALIDADE: Record<string, Record<Escalao, number>> = {
  'onde-esta': { pequeno: 92, medio: 94, grande: 95, local: 80 },
  compensacao: { pequeno: 62, medio: 84, grande: 90, local: 45 },
  politica: { pequeno: 74, medio: 88, grande: 90, local: 60 },
  pagamentos: { pequeno: 60, medio: 82, grande: 87, local: 44 },
  conta: { pequeno: 70, medio: 86, grande: 88, local: 58 },
  seguranca: { pequeno: 90, medio: 95, grande: 96, local: 78 },
  outros: { pequeno: 66, medio: 88, grande: 91, local: 50 },
};

/** Qualidade mínima aceitável por intenção (%): abaixo disto o escalão nem entra na comparação. */
const MINIMO: Record<string, number> = { 'onde-esta': 90, compensacao: 80, politica: 85, pagamentos: 80, conta: 80, seguranca: 95, outros: 85 };

const TOK_ENTRADA = 5200;
const TOK_SAIDA = 180;

function custoTurno(e: Escalao): number {
  return custoMzn(TOK_ENTRADA, TOK_SAIDA, e, Math.round(TOK_ENTRADA * 0.6));
}
function latenciaResposta(e: Escalao): number {
  return PERF[e].ttft + (TOK_SAIDA / PERF[e].tokS) * 1000;
}

export function EscolherModelo() {
  const [wq, setWq] = useState(6);
  const [wl, setWl] = useState(2);
  const [wc, setWc] = useState(2);
  const [comLocal, setComLocal] = useState(false);
  const [fracGrande, setFracGrande] = useState(4);

  const candidatos = ESCALOES.filter((e) => comLocal || e !== 'local');
  const somaW = wq + wl + wc || 1;
  const qMedia = (e: Escalao) => INTENCOES.reduce((a, i) => a + (QUALIDADE[i.id][e] * i.peso) / 100, 0);

  const porIntencao = INTENCOES.map((i) => {
    const qs = candidatos.map((e) => QUALIDADE[i.id][e]);
    const ls = candidatos.map(latenciaResposta);
    const cs = candidatos.map(custoTurno);
    const norm = (x: number, xs: number[], maiorMelhor: boolean) => {
      const mn = Math.min(...xs);
      const mx = Math.max(...xs);
      if (mx === mn) return 1;
      return maiorMelhor ? (x - mn) / (mx - mn) : (mx - x) / (mx - mn);
    };
    const linhas = candidatos.map((e, j) => {
      const q = qs[j];
      const passa = q >= MINIMO[i.id];
      const score = (wq * norm(q, qs, true) + wl * norm(ls[j], ls, false) + wc * norm(cs[j], cs, false)) / somaW;
      return { e, q, passa, score };
    });
    const elegiveis = linhas.filter((l) => l.passa);
    const vencedor = elegiveis.length ? elegiveis.reduce((a, b) => (b.score > a.score ? b : a)).e : null;
    return { i, linhas, vencedor };
  });

  const f = fracGrande / 100;
  const custoCascata = (1 - f) * custoTurno('medio') + f * custoTurno('grande') + custoMzn(1000, 5, 'pequeno');
  const ganho = 1 - (1 - f) ** 6;
  const qCascata = qMedia('medio') + (qMedia('grande') - qMedia('medio')) * ganho;
  const latCascata = (1 - f) * latenciaResposta('medio') + f * latenciaResposta('grande');

  return (
    <Frame
      title="Comparador de modelos"
      hint="Preços e janelas do snapshot (`balcao.MODELOS`); custo por turno com 5 200 tokens de entrada (60% da cache) e 180 de saída, como no dimensionamento do «Balcão». A qualidade por intenção é **ilustrativa**: no teu projecto mede-se no conjunto dourado, com o teu prompt e as tuas ferramentas."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Peso da qualidade: ${wq}`}><Slider value={wq} onChange={setWq} min={0} max={10} /></Field>
        <Field label={`Peso da latência: ${wl}`}><Slider value={wl} onChange={setWl} min={0} max={10} /></Field>
        <Field label={`Peso do custo: ${wc}`}><Slider value={wc} onChange={setWc} min={0} max={10} /></Field>
      </div>
      <div className="mt-2"><Toggle checked={comLocal} onChange={setComLocal} label="Considerar o modelo local em produção" /></div>

      <div className="scrollbar-thin mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {['Escalão', 'USD / M (entr. · saída)', 'Janela', 'TTFT', 'tok/s', 'Resposta 180 tok', 'MZN / turno', 'Qualidade'].map((h) => (
                <th key={h} className="border-b border-soft py-1.5 pr-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ESCALOES.map((e) => (
              <tr key={e} className={candidatos.includes(e) ? '' : 'opacity-45'}>
                <td className="border-b border-soft py-1.5 pr-3 font-semibold text-strong">{NOME_ESCALAO[e]}</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{nf2.format(PRECOS[e].entrada)} · {nf2.format(PRECOS[e].saida)}</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{nf0.format(PRECOS[e].janela / 1000)} k</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap" title={PERF[e].fonte}>{nf0.format(PERF[e].ttft)} ms</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap" title={PERF[e].fonte}>{PERF[e].tokS}</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{nf1.format(latenciaResposta(e) / 1000)} s</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{mzn(custoTurno(e))}</td>
                <td className="border-b border-soft py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{nf1.format(qMedia(e))}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Ilustrativo>qualidade ilustrativa</Ilustrativo> <Ilustrativo>TTFT e tok/s do pequeno e do local ilustrativos</Ilustrativo> Qualidade média ponderada pelo peso de cada intenção; o local tem custo por token 0, mas não o hardware nem a operação.
      </p>

      <div className="mt-4 space-y-2">
        {porIntencao.map(({ i, linhas, vencedor }) => (
          <div key={i.id} className="rounded-xl border border-soft p-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-strong">{i.nome} <span className="font-normal text-muted">· {i.peso}% · mínimo {MINIMO[i.id]}%</span></p>
              <p className="text-xs text-muted">vence: <b className="text-strong">{vencedor ? NOME_ESCALAO[vencedor] : 'nenhum passa o mínimo'}</b></p>
            </div>
            <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${linhas.length}, minmax(0, 1fr))` }}>
              {linhas.map((l) => (
                <div
                  key={l.e}
                  className={`rounded-lg border px-2 py-1 text-xs ${l.e === vencedor ? 'border-brand-500 bg-brand-500/12' : l.passa ? 'border-soft' : 'border-dashed border-soft opacity-50'}`}
                  title={l.passa ? `score ${nf2.format(l.score)}` : 'abaixo do mínimo de qualidade'}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-1"><span className="font-semibold text-strong">{NOME_ESCALAO[l.e]}</span>
                  <span className="font-mono text-muted">{l.q}%</span></span>
                  <span className="mt-0.5 block h-1 overflow-hidden rounded-full surface-sunken">
                    <span className={`block h-full rounded-full ${l.passa ? 'bg-brand-500' : 'bg-rose-400'}`} style={{ width: `${(l.passa ? l.score : 0) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-soft surface-sunken p-3.5">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">Cascata: médio por omissão, grande para os difíceis</p>
        <div className="mt-2">
          <Field label={`Percentagem de turnos enviada ao grande pelo router: ${fracGrande}%`}><Slider value={fracGrande} onChange={setFracGrande} min={0} max={30} /></Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="MZN / turno" value={mzn(custoCascata)} />
          <Stat label="vs só grande" value={pct(custoCascata / custoTurno('grande'))} tone="good" />
          <Stat label="Qualidade" value={`${nf1.format(qCascata)}%`} />
          <Stat label="Resposta média" value={`${nf1.format(latCascata / 1000)} s`} />
        </div>
        <p className="mt-2 text-xs text-muted">
          O «Balcão» envia ≈ 4% ao grande. A qualidade da cascata assume <Ilustrativo>ilustrativo</Ilustrativo> que o router acerta nos casos difíceis, onde está a maior parte da diferença entre médio e grande: por isso os primeiros pontos percentuais valem mais do que os últimos. O custo inclui a classificação no pequeno (o router), que é quase nada.
        </p>
      </div>
    </Frame>
  );
}
