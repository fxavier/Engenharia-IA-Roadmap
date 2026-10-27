import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ModulePage } from './pages/ModulePage';

/* Paginas com dados proprios pesados so descarregam quando o utilizador la vai. */
const ProjectPage = lazy(() => import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })));
const DesignPage = lazy(() => import('./pages/DesignPage').then((m) => ({ default: m.DesignPage })));
const AdrPage = lazy(() => import('./pages/AdrPage').then((m) => ({ default: m.AdrPage })));
const RepoPage = lazy(() => import('./pages/RepoPage').then((m) => ({ default: m.RepoPage })));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })));
const LabsPage = lazy(() => import('./pages/LabsPage').then((m) => ({ default: m.LabsPage })));
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage })));
const FerramentasPage = lazy(() => import('./pages/FerramentasPage').then((m) => ({ default: m.FerramentasPage })));
const CasesPage = lazy(() => import('./pages/CasesPage').then((m) => ({ default: m.CasesPage })));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage').then((m) => ({ default: m.GlossaryPage })));
const EntrevistaHome = lazy(() => import('./pages/entrevista/EntrevistaHome').then((m) => ({ default: m.EntrevistaHome })));
const TopicoPage = lazy(() => import('./pages/entrevista/TopicoPage').then((m) => ({ default: m.TopicoPage })));
const SimulacaoPage = lazy(() => import('./pages/entrevista/SimulacaoPage').then((m) => ({ default: m.SimulacaoPage })));
const CabulaPage = lazy(() => import('./pages/entrevista/CabulaPage').then((m) => ({ default: m.CabulaPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        A carregar…
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/modulo/:id" element={<ModulePage />} />
          <Route path="/projecto" element={<ProjectPage />} />
          <Route path="/desenho" element={<DesignPage />} />
          <Route path="/decisoes" element={<AdrPage />} />
          <Route path="/repositorio" element={<RepoPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/laboratorios" element={<LabsPage />} />
          <Route path="/simuladores" element={<ToolsPage />} />
          <Route path="/ferramentas" element={<FerramentasPage />} />
          <Route path="/ferramentas-agente" element={<Navigate to="/ferramentas" replace />} />
          <Route path="/casos" element={<CasesPage />} />
          <Route path="/glossario" element={<GlossaryPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="/entrevista" element={<EntrevistaHome />} />
          <Route path="/entrevista/t/:id" element={<TopicoPage />} />
          <Route path="/entrevista/simulacao" element={<SimulacaoPage />} />
          <Route path="/entrevista/simulacao/:id" element={<SimulacaoPage />} />
          <Route path="/entrevista/cabula" element={<CabulaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
