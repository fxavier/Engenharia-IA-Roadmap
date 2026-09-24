import { Link, useSearchParams } from 'react-router-dom';
import { WIDGETS } from '../components/widgets';
import { SimuladoresGaleria } from '../components/SimuladoresGaleria';
import type { WidgetId } from '../types';

export function ToolsPage() {
  const [params, setParams] = useSearchParams();
  const w = params.get('w') as WidgetId | null;
  const activo = w && WIDGETS[w] ? w : null;
  const total = Object.keys(WIDGETS).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow mb-1">Praticar</p>
        <h1 className="text-2xl font-black sm:text-3xl">Simuladores</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-muted">
          Os {total} simuladores que aparecem dentro dos módulos, reunidos aqui e agrupados pela parte do tutorial
          que explicam. Foram feitos para mexeres nos números até a intuição mudar — é isso que uma tabela não faz.
          Nenhum chama a rede nem um modelo a sério: as contas são locais e deterministas, sobre os resultados do
          runtime <code className="font-mono">balcao</code>. Para correr Python de verdade, vai ao{' '}
          <Link to="/playground" className="link">Playground</Link>; para as ferramentas que o agente chama, ao{' '}
          <Link to="/ferramentas" className="link">catálogo de ferramentas</Link>.
        </p>
      </header>

      <SimuladoresGaleria
        activo={activo}
        onActivo={(id) => setParams(id ? { w: id } : {}, { replace: true })}
      />
    </div>
  );
}
