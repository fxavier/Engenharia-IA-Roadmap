import { carregarAgregados } from '../content';
import { carregarTodos as carregarTopicosEntrevista } from '../entrevista';
import { TIPOS } from '../entrevista/blocos';
import type { TopicoEntrevista } from '../types';
import { GLOSSARY } from '../data/glossary';
import { ENDPOINTS } from '../data/api';
import { ADRS } from '../data/adr';
import { FERRAMENTAS, FERRAMENTA_DE } from '../data/ferramentas';
import { WIDGETS } from '../components/widgets';
import type { Block, WidgetId } from '../types';

export type ResultKind = 'modulo' | 'seccao' | 'caso' | 'termo' | 'simulador' | 'ferramenta' | 'endpoint' | 'lab' | 'adr' | 'topico' | 'pergunta';

export interface SearchResult {
  kind: ResultKind;
  title: string;
  sub: string;
  href: string;
  score: number;
}

export function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface Entry { kind: ResultKind; title: string; sub: string; href: string; hay: string; titleFolded: string }

let index: Entry[] | null = null;

/** Constrói o índice, descarregando o conteúdo todo. Chamado uma vez, quando
 *  o leitor abre a pesquisa — não no arranque da aplicação. */
export async function prepararIndice(): Promise<void> {
  if (index) return;
  const [a, ts] = await Promise.all([carregarAgregados(), carregarTopicosEntrevista()]);
  index = [...build(a), ...construirEntrevista(ts)];
}

type Agregados = Awaited<ReturnType<typeof carregarAgregados>>;

/** O texto pesquisável de um bloco. */
function textoDoBloco(b: Block): string {
  switch (b.type) {
    case 'p': case 'h': return b.text;
    case 'list': return b.items.join(' ');
    case 'callout': return (b.title ?? '') + ' ' + b.text;
    case 'terms': return b.items.map((t) => t.term + ' ' + t.def).join(' ');
    case 'steps': return b.items.map((t) => t.title + ' ' + t.text).join(' ');
    case 'table': return b.head.join(' ') + ' ' + b.rows.flat().join(' ');
    case 'tools': return b.items.map((x) => x.name + ' ' + x.role).join(' ');
    case 'compare': return b.left.title + ' ' + b.left.items.join(' ') + ' ' + b.right.title + ' ' + b.right.items.join(' ');
    case 'code': return (b.caption ?? '') + ' ' + b.code.slice(0, 600);
    case 'run': return [b.run.title, b.run.brief ?? '', b.run.code].join(' ');
    case 'formula': return [
      b.formula.title, b.formula.expr, b.formula.reading, b.formula.note ?? '',
      ...b.formula.where.map((w) => `${w.sym} ${w.means}`),
    ].join(' ');
    case 'diagram': return (b.diagram.title ?? '') + ' ' + b.diagram.nodes.map((n) => n.label).join(' ');
    case 'flow': return b.flow.title + ' ' + b.flow.steps.map((x) => x.label).join(' ');
    case 'decision': return b.tree.title + ' ' + b.tree.nodes.map((n) => n.question ?? n.answer ?? '').join(' ');
    case 'tool': return [b.ref, FERRAMENTA_DE[b.ref]?.name ?? '', FERRAMENTA_DE[b.ref]?.summary ?? ''].join(' ');
    case 'prompt': return [b.prompt.title, b.prompt.brief ?? '', ...b.prompt.messages.map((m) => m.text)].join(' ');
    case 'graph': return [
      b.graph.title, b.graph.brief ?? '',
      ...b.graph.nodes.map((n) => n.label),
      ...(b.graph.channels ?? []).map((c) => c.canal),
    ].join(' ');
    case 'trace': return [b.trace.title, b.trace.brief ?? '', ...b.trace.spans.map((s) => s.name)].join(' ');
    case 'eval': return [b.eval.title, b.eval.brief ?? '', b.eval.metric, ...b.eval.cases.map((c) => c.input)].join(' ');
    case 'retrieval': return [
      b.retrieval.title, b.retrieval.brief ?? '', b.retrieval.query, b.retrieval.method,
      ...b.retrieval.hits.map((h) => `${h.doc} ${h.texto}`),
    ].join(' ');
    case 'adr': case 'endpoint': case 'file': return b.ref;
    default: return '';
  }
}

function entrada(kind: ResultKind, title: string, sub: string, href: string, hay: string): Entry {
  return { kind, title, sub, href, hay: fold(hay), titleFolded: fold(title) };
}

function build(a: Agregados): Entry[] {
  const out: Entry[] = [];
  for (const m of a.modulos) {
    out.push(entrada('modulo', `${m.icon} ${m.title}`, `Módulo ${m.number} · ${m.subtitle}`, `#/modulo/${m.id}`,
      [m.title, m.subtitle, ...m.goals, ...m.tags].join(' ')));
    for (const s of m.sections) {
      out.push(entrada('seccao', s.title, `${m.number}. ${m.title}`, `#/modulo/${m.id}?s=${s.id}`,
        s.title + ' ' + s.blocks.map(textoDoBloco).join(' ')));
    }
  }
  for (const u of a.useCases) {
    const m = a.moduloDoCaso[u.id];
    out.push(entrada('caso', u.title, `Caso de uso · ${m?.title ?? u.area}`, `#/casos?c=${u.id}`,
      [u.title, u.area, u.scenario, ...u.requirements, ...u.takeaways, ...u.tools.map((s) => s.name)].join(' ')));
  }
  for (const l of a.labs) {
    const m = a.moduloDoLab[l.id];
    out.push(entrada('lab', l.title, `Laboratório · ${m?.title ?? ''}`, `#/laboratorios?l=${l.id}`, l.title + ' ' + l.brief + ' ' + l.lang));
  }
  for (const d of ADRS) {
    out.push(entrada('adr', `${d.id.toUpperCase()} · ${d.title}`, `Decisão · ${d.area} · ${d.status}`, `#/decisoes?a=${d.id}`,
      [d.id, d.title, d.area, d.context, d.decision, ...d.drivers, ...d.options.map((o) => o.name)].join(' ')));
  }
  for (const e of ENDPOINTS) {
    out.push(entrada('endpoint', `${e.method} ${e.path}`, `${e.service} · ${e.summary}`, `#/desenho?ep=${e.id}`,
      [e.id, e.method, e.path, e.summary, e.description, e.service].join(' ')));
  }
  for (const t of FERRAMENTAS) {
    out.push(entrada('ferramenta', t.name, `Ferramenta do agente · ${t.summary}`, `#/ferramentas?f=${t.id}`,
      [t.id, t.name, t.summary, t.description, t.group].join(' ')));
  }
  for (const g of GLOSSARY) {
    out.push(entrada('termo', g.term, g.def, `#/glossario?t=${encodeURIComponent(g.term)}`, g.term + ' ' + g.def + ' ' + (g.cat ?? '')));
  }
  for (const [id, w] of Object.entries(WIDGETS) as [WidgetId, { name: string; group: string; blurb: string }][]) {
    out.push(entrada('simulador', w.name, `Simulador · ${w.group} · ${w.blurb}`, `#/simuladores?w=${id}`, `${id} ${w.name} ${w.group} ${w.blurb}`));
  }
  return out;
}

function construirEntrevista(ts: TopicoEntrevista[]): Entry[] {
  const out: Entry[] = [];
  for (const t of ts) {
    out.push(entrada('topico', `${t.icon} ${t.titulo}`, `Entrevista · tópico ${t.numero} · ${t.resumo}`, `#/entrevista/t/${t.id}`,
      [t.titulo, t.resumo, ...t.essencial].join(' ')));
    for (const p of t.perguntas) {
      out.push(entrada('pergunta', p.titulo, `${TIPOS[p.tipo].nome} · ${t.titulo}`, `#/entrevista/t/${t.id}?p=${p.id}`,
        [p.titulo, p.enunciado, p.contexto ?? '', ...p.rubrica.criterios, ...p.resposta.map(textoDoBloco)].join(' ')));
    }
  }
  return out;
}

const WEIGHT: Record<ResultKind, number> = {
  topico: 2.6, pergunta: 2.1,
  modulo: 3, seccao: 2, caso: 2.4, lab: 2.4, adr: 2.4, endpoint: 2.2, simulador: 2, ferramenta: 2.2, termo: 1.6,
};

export function search(query: string, limit = 30): SearchResult[] {
  const q = fold(query.trim());
  if (q.length < 2 || !index) return [];
  const terms = q.split(/\s+/);
  const results: SearchResult[] = [];
  for (const e of index) {
    let score = 0;
    for (const t of terms) {
      if (!e.hay.includes(t) && !e.titleFolded.includes(t)) { score = 0; break; }
      score += 1;
      if (e.titleFolded.includes(t)) score += 2;
      if (e.titleFolded.startsWith(t)) score += 2;
    }
    if (score > 0) results.push({ kind: e.kind, title: e.title, sub: e.sub, href: e.href, score: score * WEIGHT[e.kind] });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
