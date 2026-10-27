import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { NivelPergunta, TipoPergunta, TopicoEntrevista } from '../../types';
import { carregarTopico, TOPICO_META_DE, TOPICOS_META } from '../../entrevista';
import { BLOCO_DE, NIVEIS, TIPOS } from '../../entrevista/blocos';
import { pontuacao, useEntrevista, type Nota } from '../../entrevista/progresso';
import { PerguntaCartao } from '../../components/entrevista/PerguntaCartao';
import { ModulosRelacionados } from '../../components/entrevista/Partes';
import { RichText } from '../../components/RichText';

type Estado = 'todas' | 'por-fazer' | 'fracas' | 'marcadas';

export function TopicoPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const alvo = params.get('p');
  const meta = TOPICO_META_DE[id];
  const [topico, setTopico] = useState<TopicoEntrevista | null | undefined>(undefined);
  const st = useEntrevista();
  const [tipo, setTipo] = useState<TipoPergunta | 'todos'>('todos');
  const [nivel, setNivel] = useState<NivelPergunta | 'todos'>('todos');
  const [estado, setEstado] = useState<Estado>('todas');

  useEffect(() => {
    let vivo = true;
    setTopico(undefined);
    carregarTopico(id).then((t) => { if (vivo) setTopico(t ?? null); });
    return () => { vivo = false; };
  }, [id]);

  useEffect(() => {
    if (!topico || !alvo) return;
    requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [topico, alvo]);

  const ordenados = useMemo(() => [...TOPICOS_META].sort((a, b) => a.numero - b.numero), []);
  const pos = ordenados.findIndex((t) => t.id === id);
  const ant = pos > 0 ? ordenados[pos - 1] : undefined;
  const seg = pos >= 0 && pos < ordenados.length - 1 ? ordenados[pos + 1] : undefined;

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-bold">Tópico não encontrado.</p>
        <Link to="/entrevista" className="link mt-3 inline-block">← Voltar à preparação para entrevista</Link>
      </div>
    );
  }

  const bloco = BLOCO_DE[meta.bloco];
  const perguntas = topico?.perguntas ?? [];
  const notas = perguntas.map((p) => st.avaliacoes[p.id]?.nota).filter((n): n is Nota => n !== undefined);
  const media = pontuacao(notas);
  const tiposPresentes = [...new Set(meta.perguntas.map((p) => p.tipo))];

  const visiveis = perguntas.filter((p) => {
    if (tipo !== 'todos' && p.tipo !== tipo) return false;
    if (nivel !== 'todos' && p.nivel !== nivel) return false;
    const n = st.avaliacoes[p.id]?.nota;
    if (estado === 'por-fazer' && n !== undefined) return false;
    if (estado === 'fracas' && !(n !== undefined && n <= 1)) return false;
    if (estado === 'marcadas' && !st.marcadas[p.id]) return false;
    return true;
  });

  return (
    <div className="pb-10">
      <header className="border-b border-soft">
        <div className="mx-auto max-w-4xl px-4 pt-6 pb-7 sm:px-6">
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="Trilho">
            <Link to="/entrevista" className="hover:text-strong">Entrevista</Link>
            <span aria-hidden>/</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: bloco.accent }} />{bloco.nome}</span>
          </nav>
          <div className="flex items-start gap-4">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-soft bg-[var(--surface-raised)] text-3xl shadow-card">{meta.icon}</span>
            <div className="min-w-0">
              <p className="eyebrow">Tópico {meta.numero} de {TOPICOS_META.length}</p>
              <h1 className="mt-1 text-2xl leading-tight font-black sm:text-3xl">{meta.titulo}</h1>
              <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed"><RichText text={meta.resumo} /></p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span><span className="font-mono font-bold text-strong tabular">{notas.length}</span><span className="text-muted">/{meta.perguntas.length} avaliadas</span></span>
            {media !== null && <span><span className="font-mono font-bold text-strong tabular">{media}</span><span className="text-muted">/100 de média</span></span>}
            <span className="text-muted">≈ {meta.perguntas.reduce((a, p) => a + p.minutos, 0)} min a responder tudo</span>
            <Link to={`/entrevista/simulacao?topicos=${meta.id}`} className="btn btn-ghost btn-sm ml-auto">⏱ Simular só este tópico</Link>
          </div>
          <div className="mt-4"><ModulosRelacionados ids={meta.modulos} /></div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-7 sm:px-6">
        {topico === undefined && <p className="text-sm text-muted">A carregar perguntas…</p>}
        {topico === null && <p className="text-sm text-muted">Este tópico ainda não tem conteúdo.</p>}

        {topico && (
          <>
            <details className="card group overflow-hidden" open={!alvo}>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5">
                <span className="size-2 rounded-full bg-accent-500" />
                <span className="font-bold text-strong">Cábula — o que tens de saber dizer</span>
                <span aria-hidden className="ml-auto text-[0.65rem] text-muted transition group-open:rotate-90">▶</span>
              </summary>
              <ul className="space-y-2 border-t border-soft px-5 py-4 text-[0.9rem] leading-relaxed">
                {topico.essencial.map((e, i) => (
                  <li key={i} className="flex gap-2.5"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" /><span><RichText text={e} /></span></li>
                ))}
              </ul>
            </details>

            <div className="flex flex-wrap items-center gap-2">
              <Filtro valor={tipo} onChange={setTipo} opcoes={[['todos', 'Todos os tipos'], ...tiposPresentes.map((t) => [t, TIPOS[t].nome] as [TipoPergunta, string])]} />
              <Filtro valor={nivel} onChange={setNivel} opcoes={[['todos', 'Todos os níveis'], ...(Object.keys(NIVEIS) as NivelPergunta[]).map((n) => [n, NIVEIS[n].nome] as [NivelPergunta, string])]} />
              <Filtro valor={estado} onChange={setEstado} opcoes={[['todas', 'Todas'], ['por-fazer', 'Por avaliar'], ['fracas', 'Fracas ou parciais'], ['marcadas', 'Marcadas']]} />
              <span className="ml-auto font-mono text-xs text-muted">{visiveis.length} de {perguntas.length}</span>
            </div>

            <div className="space-y-3">
              {visiveis.map((p) => (
                <PerguntaCartao key={p.id} p={p} indice={perguntas.indexOf(p) + 1} abertaInicial={p.id === alvo} />
              ))}
              {!visiveis.length && <p className="rounded-2xl border border-dashed border-soft px-4 py-8 text-center text-sm text-muted">Nenhuma pergunta com estes filtros.</p>}
            </div>
          </>
        )}

        <nav className="flex flex-col gap-3 border-t border-soft pt-6 sm:flex-row sm:justify-between" aria-label="Tópicos vizinhos">
          {ant ? (
            <Link to={`/entrevista/t/${ant.id}`} className="card card-hover px-4 py-3 sm:max-w-[48%]">
              <span className="text-xs text-muted">← Tópico {ant.numero}</span>
              <span className="block font-semibold text-strong">{ant.icon} {ant.titulo}</span>
            </Link>
          ) : <span />}
          {seg && (
            <Link to={`/entrevista/t/${seg.id}`} className="card card-hover px-4 py-3 text-right sm:max-w-[48%]">
              <span className="text-xs text-muted">Tópico {seg.numero} →</span>
              <span className="block font-semibold text-strong">{seg.icon} {seg.titulo}</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

function Filtro<T extends string>({ valor, onChange, opcoes }: { valor: T; onChange: (v: T) => void; opcoes: [T, string][] }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value as T)} className="field h-9 w-auto py-1 pr-8 text-[0.82rem]">
      {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
