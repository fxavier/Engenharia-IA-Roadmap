import { useState } from 'react';
import type { PerguntaEntrevista } from '../../types';
import { entrevista, NOTAS, useEntrevista } from '../../entrevista/progresso';
import { RichText } from '../RichText';
import {
  BarraTempo, CaixaResposta, contarPalavras, ModulosRelacionados, NivelChip, RespostaModelo,
  RubricaPainel, SeguimentoEAlarmes, TipoChip, useCronometro,
} from './Partes';

/** Uma pergunta no modo de prática: respondes, revelas, auto-avalias. */
export function PerguntaCartao({ p, indice, abertaInicial = false }: { p: PerguntaEntrevista; indice: number; abertaInicial?: boolean }) {
  const st = useEntrevista();
  const [aberta, setAberta] = useState(abertaInicial);
  const [revelada, setRevelada] = useState(false);
  const [dica, setDica] = useState(false);
  const [aCorrer, setACorrer] = useState(false);
  const [seg, setSeg] = useCronometro(aCorrer);
  const resposta = st.respostas[p.id] ?? '';
  const nota = st.avaliacoes[p.id]?.nota;
  const marcada = !!st.marcadas[p.id];
  const codigo = p.tipo === 'codigo';

  return (
    <article id={p.id} className={`card scroll-mt-20 overflow-hidden transition ${aberta ? 'shadow-card' : ''}`}>
      <button
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-muted tabular">{String(indice).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-strong">{p.titulo}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TipoChip tipo={p.tipo} />
            <NivelChip nivel={p.nivel} />
            <span className="font-mono text-[0.66rem] text-muted">{p.minutos} min</span>
            {marcada && <span className="chip bg-accent-500/14 px-2 text-[0.66rem] font-semibold text-accent-800 dark:text-accent-300">★ para rever</span>}
          </span>
        </span>
        {nota !== undefined && (
          <span className={`chip shrink-0 border px-2 text-[0.66rem] font-bold ${NOTAS[nota].cor}`}>{NOTAS[nota].nome}</span>
        )}
        <span aria-hidden className={`mt-1 shrink-0 text-[0.65rem] text-muted transition ${aberta ? 'rotate-90' : ''}`}>▶</span>
      </button>

      {aberta && (
        <div className="space-y-5 border-t border-soft px-4 py-5 sm:px-5">
          <div className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-3.5">
            <p className="eyebrow mb-1.5">O entrevistador pergunta</p>
            <p className="text-[1rem] leading-relaxed text-strong"><RichText text={p.enunciado} /></p>
            {p.contexto && (
              <p className="mt-3 border-t border-soft pt-3 text-[0.88rem] leading-relaxed">
                <span className="mr-1.5 font-semibold text-strong">Contexto:</span><RichText text={p.contexto} />
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={`btn btn-sm ${aCorrer ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setACorrer((v) => !v)}>
              {aCorrer ? '❚❚ Pausa' : seg ? '▶ Continuar' : '▶ Cronometrar'}
            </button>
            {seg > 0 && <button className="btn btn-ghost btn-sm" onClick={() => { setACorrer(false); setSeg(0); }}>↺</button>}
            {p.dica && (
              <button className="btn btn-ghost btn-sm" onClick={() => setDica((v) => !v)} aria-expanded={dica}>
                {dica ? 'Esconder pista' : 'Pista'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm ml-auto" onClick={() => entrevista.alternarMarca(p.id)} aria-pressed={marcada}>
              {marcada ? '★ Marcada' : '☆ Marcar para rever'}
            </button>
          </div>
          {(aCorrer || seg > 0) && <BarraTempo seg={seg} alvoMin={p.minutos} />}
          {dica && p.dica && (
            <p className="rounded-xl border border-amber-300/60 bg-amber-50/70 px-3.5 py-2 text-[0.88rem] dark:border-amber-500/30 dark:bg-amber-500/10">
              <span className="font-semibold text-strong">Pista: </span><RichText text={p.dica} />
            </p>
          )}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={`r-${p.id}`} className="eyebrow">A tua resposta {codigo ? '(código e explicação)' : '(escreve como a dirias)'}</label>
              <span className="font-mono text-[0.66rem] text-muted">{contarPalavras(resposta)} palavras · guardado no browser</span>
            </div>
            <CaixaResposta
              valor={resposta}
              onChange={(v) => { entrevista.guardarResposta(p.id, v); if (!aCorrer && !seg && v.length === 1) setACorrer(true); }}
              mono={codigo}
              minLinhas={codigo ? 10 : 5}
              placeholder={codigo ? 'def resolver(...):\n    ...' : 'Resposta directa primeiro; depois o mecanismo, os trade-offs e o que farias em produção…'}
            />
          </div>

          {!revelada ? (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-accent" onClick={() => { setRevelada(true); setACorrer(false); }}>Revelar resposta-modelo</button>
              {!resposta.trim() && <span className="text-xs text-muted">Tenta responder primeiro — mesmo em tópicos. É assim que fica.</span>}
            </div>
          ) : (
            <div className="animate-fade-up space-y-6">
              <section>
                <div className="mb-1 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-brand-500" />
                  <h4 className="text-sm font-bold tracking-wide text-strong uppercase">Resposta-modelo</h4>
                </div>
                <RespostaModelo p={p} />
              </section>
              <section className="rounded-2xl border border-soft px-4 py-4">
                <RubricaPainel p={p} />
              </section>
              <SeguimentoEAlarmes p={p} />
              <ModulosRelacionados ids={p.modulos} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
