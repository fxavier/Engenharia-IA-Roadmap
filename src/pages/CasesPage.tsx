import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carregarAgregados } from '../content';
import { UseCaseView } from '../components/UseCaseView';
import type { UseCase } from '../types';

export function CasesPage() {
  const [params] = useSearchParams();
  const [casos, setCasos] = useState<UseCase[] | null>(null);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [area, setArea] = useState<string>('todas');
  const alvo = params.get('c');

  useEffect(() => {
    let vivo = true;
    carregarAgregados().then((a) => {
      if (!vivo) return;
      setCasos(a.useCases);
      setTitulos(Object.fromEntries(Object.entries(a.moduloDoCaso).map(([k, m]) => [k, `${m.icon} ${m.title}`])));
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (alvo && casos) {
      const el = document.getElementById(`uc-${alvo}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [alvo, casos]);

  const areas = useMemo(() => Array.from(new Set((casos ?? []).map((u) => u.area))), [casos]);
  const lista = area === 'todas' ? (casos ?? []) : (casos ?? []).filter((u) => u.area === area);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="eyebrow mb-1">Praticar</p>
      <h1 className="text-2xl font-black sm:text-3xl">Casos de uso resolvidos</h1>
      <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
        Problemas reais de sistemas LLM — no «Balcão» e noutras empresas do mesmo mundo: uma farmácia online, um
        banco móvel, uma seguradora, um operador de telecomunicações —, com o raciocínio passo a passo, o desenho,
        as alternativas rejeitadas e a razão técnica de cada rejeição. Desenha a tua solução antes de abrir a
        resolução: é aí que se aprende a decidir.
      </p>

      {!casos && (
        <p className="mt-8 flex items-center gap-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          A carregar os casos…
        </p>
      )}

      {casos && (
        <>
          <div className="my-6 flex flex-wrap gap-1.5">
            {['todas', ...areas].map((a) => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${area === a ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]' : 'surface-sunken text-muted hover:text-strong'}`}
              >
                {a} <span className="font-mono opacity-70">{a === 'todas' ? casos.length : casos.filter((u) => u.area === a).length}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {lista.map((uc) => (
              <div key={uc.id} id={`uc-${uc.id}`} className="scroll-mt-24">
                <p className="mb-1.5 text-xs text-muted">{titulos[uc.id]}</p>
                <UseCaseView uc={uc} defaultOpen={alvo === uc.id} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
