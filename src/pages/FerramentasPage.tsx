import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FERRAMENTAS, GRUPOS_FERRAMENTAS } from '../data/ferramentas';
import { ToolCard } from '../components/ToolCard';
import type { ToolEffect } from '../types';

const EFEITOS: { id: 'todos' | ToolEffect; nome: string }[] = [
  { id: 'todos', nome: 'todos os efeitos' },
  { id: 'leitura', nome: 'leitura' },
  { id: 'escrita', nome: 'escrita interna' },
  { id: 'externo', nome: 'efeito externo' },
  { id: 'humano', nome: 'humano' },
];

export function FerramentasPage() {
  const [params] = useSearchParams();
  const [grupo, setGrupo] = useState<'todos' | string>('todos');
  const [efeito, setEfeito] = useState<'todos' | ToolEffect>('todos');

  const alvo = params.get('f');

  useEffect(() => {
    if (!alvo || typeof document === 'undefined') return;
    const el = document.getElementById(`ft-${alvo}`);
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    return () => clearTimeout(t);
  }, [alvo]);

  const visiveis = useMemo(
    () => FERRAMENTAS.filter((t) => (grupo === 'todos' || t.group === grupo) && (efeito === 'todos' || t.effect === efeito)),
    [grupo, efeito],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="eyebrow mb-1">O projecto</p>
      <h1 className="text-2xl font-black sm:text-3xl">Ferramentas do agente</h1>
      <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
        As {FERRAMENTAS.length} ferramentas que o «Balcão» pode chamar são a fronteira de segurança do sistema:
        o modelo escolhe entre elas, mas só pode fazer o que está aqui, com os argumentos que estão aqui, dentro
        dos limites que estão aqui. A política de autonomia — o que corre sozinho, o que pede aprovação, o que é
        proibido — vive fora do prompt, no código que executa cada chamada. Os esquemas JSON são os que seguem
        no pedido ao modelo; os exemplos de resultado são os do pacote <code className="font-mono">balcao</code>.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { n: FERRAMENTAS.filter((t) => t.effect === 'leitura').length, l: 'só leitura' },
          { n: FERRAMENTAS.filter((t) => t.effect !== 'leitura').length, l: 'com efeito' },
          { n: FERRAMENTAS.filter((t) => t.approval !== 'nunca').length, l: 'podem pedir aprovação' },
          { n: FERRAMENTAS.filter((t) => t.idempotent).length, l: 'idempotentes' },
        ].map((x) => (
          <div key={x.l} className="card px-3.5 py-3">
            <p className="font-mono text-2xl font-black text-strong tabular">{x.n}</p>
            <p className="text-xs text-muted">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="my-6 space-y-3">
        <div>
          <p className="mb-1.5 text-[0.65rem] font-bold tracking-widest text-muted uppercase">Grupo</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Grupo de ferramentas">
            <button
              type="button"
              onClick={() => setGrupo('todos')}
              aria-pressed={grupo === 'todos'}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                grupo === 'todos'
                  ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                  : 'surface-sunken text-muted hover:text-strong'
              }`}
            >
              todos <span className="font-mono opacity-70">{FERRAMENTAS.length}</span>
            </button>
            {GRUPOS_FERRAMENTAS.map((g) => {
              const n = FERRAMENTAS.filter((t) => t.group === g.id).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrupo(g.id)}
                  aria-pressed={grupo === g.id}
                  title={g.blurb}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    grupo === g.id
                      ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                      : 'surface-sunken text-muted hover:text-strong'
                  }`}
                >
                  {g.nome} <span className="font-mono opacity-70">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[0.65rem] font-bold tracking-widest text-muted uppercase">Efeito</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Efeito da ferramenta">
            {EFEITOS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEfeito(e.id)}
                aria-pressed={efeito === e.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  efeito === e.id
                    ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                    : 'surface-sunken text-muted hover:text-strong'
                }`}
              >
                {e.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visiveis.length === 0 && (
        <p className="rounded-2xl border border-soft surface-sunken px-4 py-6 text-center text-sm text-muted">
          Nenhuma ferramenta corresponde a este filtro.
        </p>
      )}

      <div className="space-y-8">
        {[...GRUPOS_FERRAMENTAS, { id: '__outros', nome: 'Outras', blurb: '' }].map((g) => {
          const doGrupo = visiveis.filter((t) => (g.id === '__outros' ? !GRUPOS_FERRAMENTAS.some((x) => x.id === t.group) : t.group === g.id));
          if (doGrupo.length === 0) return null;
          return (
            <section key={g.id}>
              <div className="mb-2 flex items-baseline gap-2 border-b border-soft pb-1.5">
                <h2 className="text-lg font-bold">{g.nome}</h2>
                <span className="font-mono text-xs text-muted">{doGrupo.length}</span>
              </div>
              {g.blurb && <p className="mb-3 max-w-3xl text-[0.86rem] text-muted">{g.blurb}</p>}
              <div className="space-y-3">
                {doGrupo.map((t) => (
                  <div key={t.id} id={`ft-${t.id}`} className="scroll-mt-24">
                    <ToolCard tool={t} compact={t.id !== alvo} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
