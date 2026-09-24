import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { META, BY_PART } from '../content';
import { PARTS } from '../data/parts';
import { useProgress, themeStore, useTheme } from '../lib/progress';
import { CommandPalette } from './CommandPalette';

interface NavItem { to: string; label: string; icon: string }

const NAV_PROJECTO: NavItem[] = [
  { to: '/projecto', label: 'Projecto «Balcão»', icon: '◆' },
  { to: '/desenho', label: 'Desenho do sistema', icon: '▦' },
  { to: '/decisoes', label: 'Decisões (ADR)', icon: '§' },
  { to: '/ferramentas', label: 'Ferramentas do agente', icon: '⛭' },
  { to: '/repositorio', label: 'Repositório', icon: '⌗' },
];

const NAV_PRATICA: NavItem[] = [
  { to: '/playground', label: 'Playground', icon: '▶' },
  { to: '/simuladores', label: 'Simuladores', icon: '◎' },
  { to: '/laboratorios', label: 'Laboratórios', icon: '⌨' },
  { to: '/casos', label: 'Casos de uso', icon: '◇' },
  { to: '/glossario', label: 'Glossário', icon: 'Aa' },
  { to: '/progresso', label: 'Progresso', icon: '▲' },
];

function linkCls(isActive: boolean) {
  return `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
    isActive
      ? 'bg-brand-500/12 font-semibold text-brand-800 shadow-[inset_2px_0_0_var(--color-brand-500)] dark:text-brand-200'
      : 'text-body hover:bg-[var(--surface-sunken)] hover:text-strong'
  }`;
}

function NavGroup({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div>
      <p className="eyebrow mb-1.5 px-2.5">{title}</p>
      <ul className="space-y-0.5">
        {items.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} onClick={onNavigate} className={({ isActive }) => linkCls(isActive)}>
              <span aria-hidden className="w-4 text-center font-mono text-[0.72rem] opacity-60">{n.icon}</span>
              {n.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const state = useProgress();
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const actual = location.pathname.startsWith('/modulo/') ? location.pathname.slice(8) : '';
  const parteActual = META.find((m) => m.id === actual)?.part;

  const doneOf = (id: string) => {
    const m = META.find((x) => x.id === id);
    if (!m) return 0;
    const done = (state.sections[id] ?? []).length;
    return m.sections.length ? Math.round((done / m.sections.length) * 100) : 0;
  };

  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto scrollbar-thin p-4" aria-label="Navegação principal">
      <NavLink to="/" end onClick={onNavigate} className={({ isActive }) => linkCls(isActive)}>
        <span aria-hidden className="w-4 text-center font-mono text-[0.72rem] opacity-60">◈</span>
        Início
      </NavLink>
      <NavGroup title="O projecto" items={NAV_PROJECTO} onNavigate={onNavigate} />
      <NavGroup title="Praticar" items={NAV_PRATICA} onNavigate={onNavigate} />

      <div>
        <p className="eyebrow mb-1.5 px-2.5">Módulos</p>
        <div className="space-y-1">
          {PARTS.map((part) => {
            const mods = BY_PART[part.id] ?? [];
            const aberta = abertas[part.id] ?? (parteActual ? parteActual === part.id : true);
            const feitos = mods.filter((m) => doneOf(m.id) === 100).length;
            return (
              <div key={part.id}>
                <button
                  onClick={() => setAbertas((a) => ({ ...a, [part.id]: !aberta }))}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[0.78rem] font-semibold text-strong hover:bg-[var(--surface-sunken)]"
                  aria-expanded={aberta}
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: part.accent }} />
                  <span className="min-w-0 flex-1 truncate">{part.name}</span>
                  {mods.length > 0 && <span className="font-mono text-[0.62rem] text-muted tabular">{feitos}/{mods.length}</span>}
                  <span aria-hidden className={`text-[0.6rem] text-muted transition ${aberta ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {aberta && (
                  <ul className="mt-0.5 mb-1 ml-3.5 space-y-0.5 border-l border-soft pl-2">
                    {mods.length === 0 && <li className="px-2.5 py-1 text-xs text-muted italic">Em preparação</li>}
                    {mods.map((m) => {
                      const pct = doneOf(m.id);
                      return (
                        <li key={m.id}>
                          <NavLink
                            to={`/modulo/${m.id}`}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                              `group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.82rem] transition ${
                                isActive ? 'bg-brand-500/12 font-semibold text-brand-800 dark:text-brand-200' : 'text-body hover:bg-[var(--surface-sunken)] hover:text-strong'
                              }`
                            }
                          >
                            <span aria-hidden className="w-5 shrink-0 text-right font-mono text-[0.66rem] text-muted tabular">{m.number}</span>
                            <span className="min-w-0 flex-1 truncate">{m.title}</span>
                            {pct > 0 && (
                              <span className={`chip shrink-0 px-1.5 text-[0.58rem] ${pct === 100 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--surface-sunken)] text-muted'}`}>
                                {pct === 100 ? '✓' : `${pct}%`}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-soft surface-sunken">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[0.82rem] text-muted sm:px-6">
        <p>
          <span className="font-semibold text-strong">Copyright 2026</span>, Feito por Xavier Francisco
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Engenharia de IA — o projecto «Balcão»</span>
          <span aria-hidden className="opacity-40">·</span>
          <span>O progresso fica só no teu browser</span>
        </p>
      </div>
    </footer>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-brand-400)" />
          <stop offset="1" stopColor="var(--color-brand-700)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <path d="M16 20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H30l-9 8v-8h1a6 6 0 0 1-6-6z" fill="#fff" />
      <circle cx="25" cy="27" r="2.6" fill="var(--color-brand-700)" />
      <circle cx="32" cy="27" r="2.6" fill="var(--color-brand-700)" />
      <circle cx="39" cy="27" r="2.6" fill="var(--color-accent-500)" />
    </svg>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const theme = useTheme();
  const location = useLocation();

  useEffect(() => { setMenu(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
      const alvo = e.target as HTMLElement | null;
      if (e.key === '/' && !/input|textarea|select/i.test(alvo?.tagName ?? '') && !alvo?.isContentEditable) {
        e.preventDefault(); setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white">
        Saltar para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-soft bg-[color-mix(in_oklch,var(--surface)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setMenu((v) => !v)} aria-label="Abrir menu" aria-expanded={menu}>
            ☰
          </button>

          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm leading-tight font-bold text-strong">Engenharia de IA</span>
              <span className="block truncate text-[0.68rem] leading-tight text-muted">o projecto «Balcão» · LLMs, RAG, agentes, produção</span>
            </span>
          </Link>

          <button
            onClick={() => setPalette(true)}
            className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-xl border border-soft surface-sunken px-3 text-sm text-muted transition hover:text-strong md:ml-6 md:w-72 lg:w-80"
            aria-label="Pesquisar (Ctrl+K)"
          >
            <span aria-hidden>⌕</span>
            <span className="hidden truncate md:inline">Pesquisar no tutorial…</span>
            <kbd className="kbd ml-auto hidden md:inline-flex">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-1.5 md:ml-auto">
            <Link to="/playground" className="btn btn-primary btn-sm hidden sm:inline-flex">▶ Playground</Link>
            <Link to="/decisoes" className="btn btn-ghost btn-sm hidden xl:inline-flex">§ Decisões</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => themeStore.toggle()} aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-soft lg:block">
          <Sidebar />
        </aside>

        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMenu(false)} role="presentation" />
            <div className="animate-slide-in absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-soft surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-soft px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-strong"><Logo /> Balcão</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setMenu(false)} aria-label="Fechar menu">✕</button>
              </div>
              <div className="min-h-0 flex-1">
                <Sidebar onNavigate={() => setMenu(false)} />
              </div>
            </div>
          </div>
        )}

        <main id="conteudo" className="min-w-0 flex-1">{children}</main>
      </div>

      <Footer />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
