import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GRUPOS, MANIFESTO, POR_CAMINHO, TOTAIS, carregarFicheiro } from '../data/repo';
import { CodeBlock } from '../components/CodeBlock';
import { RichText } from '../components/RichText';

/* ======================================================== percursos guiados */

interface Paragem {
  path: string;
  porque: string;
}

interface Percurso {
  id: string;
  titulo: string;
  blurb: string;
  paragens: Paragem[];
}

/** Leituras transversais do repositório, pela ordem em que o sistema se
 *  constrói. Os caminhos são os de `REPO_PATHS` (`src/data/ids.ts`); uma
 *  paragem cujo ficheiro não exista no manifesto é omitida. */
const PERCURSOS_BASE: Percurso[] = [
  {
    id: 'comecar',
    titulo: 'Por onde começar',
    blurb:
      'Os ficheiros que se lêem antes de correr seja o que for: o que o laboratório é, as dependências fixadas, '
      + 'a configuração por variáveis de ambiente e os comandos para o pôr de pé.',
    paragens: [
      { path: 'README.md', porque: 'O mapa do laboratório: o que corre, como se corre sem chave de API (modelo simulado ou Ollama) e o que cada pasta contém.' },
      { path: 'pyproject.toml', porque: 'Dependências e ferramentas (ruff, mypy, pytest) num só sítio; com o `uv.lock`, é o que torna o ambiente reprodutível.' },
      { path: '.python-version', porque: 'Python 3.13 fixado: o `uv` usa esta versão em desenvolvimento, em CI e dentro da imagem.' },
      { path: '.env.example', porque: 'Todas as variáveis de configuração, com valores seguros por omissão. Copia para `.env`; o `.env` nunca vai para o Git.' },
      { path: 'Makefile', porque: 'Os comandos do dia-a-dia com nome: instalar, testar, ingerir, avaliar, subir o `docker compose`.' },
      { path: 'src/balcao/config.py', porque: 'A configuração tipada com `pydantic-settings`: o único sítio que lê variáveis de ambiente.' },
    ],
  },
  {
    id: 'rag',
    titulo: 'RAG: da ingestão à resposta citada',
    blurb:
      'O caminho de um documento de política até uma resposta com a fonte citada: esquema SQL com pgvector, '
      + 'ingestão com chunking e metadados, pesquisa híbrida com re-ranking e o prompt RAG.',
    paragens: [
      { path: 'sql/001_esquema.sql', porque: 'Documentos, chunks com `vector(768)`, `tsvector` e metadados (`vigente`, `publico`), o índice HNSW — tudo no mesmo PostgreSQL (ADR-0005, ADR-0006).' },
      { path: 'src/balcao/ingestao.py', porque: 'Carregar, limpar, partir e indexar, de forma idempotente por hash de conteúdo — reingerir não duplica nada (ADR-0008).' },
      { path: 'src/balcao/recuperacao.py', porque: 'Pesquisa densa e lexical, fusão RRF e re-ranking dos 20 primeiros, com os filtros aplicados na base de dados (ADR-0009, ADR-0010).' },
      { path: 'prompts/sistema.md', porque: 'O prompt de sistema versionado como código: regras, tom, formato das citações e a instrução de recusa (ADR-0011).' },
      { path: 'src/balcao/cadeias.py', porque: 'A cadeia RAG em LCEL: recuperar, montar o contexto delimitado, gerar com streaming e validar as citações.' },
      { path: 'src/balcao/modelos.py', porque: 'A interface própria sobre o fornecedor (`init_chat_model`), com os escalões pequeno, médio e grande e o Ollama local por omissão (ADR-0003, ADR-0004).' },
      { path: 'src/balcao/simulado.py', porque: 'O modelo simulado determinista que deixa correr os testes e a CI sem rede e sem chave.' },
    ],
  },
  {
    id: 'grafo',
    titulo: 'O grafo, as ferramentas e as guardas',
    blurb:
      'A orquestração com LangGraph: classificar, recuperar, chamar ferramentas, pedir aprovação humana e '
      + 'responder — com as guardas de entrada, de ferramenta e de saída à volta.',
    paragens: [
      { path: 'prompts/classificar.md', porque: 'O prompt do modelo pequeno que decide a intenção — a primeira aresta condicional do grafo.' },
      { path: 'src/balcao/ferramentas.py', porque: 'As 12 ferramentas com `@tool`, esquemas Pydantic e autorização dentro da ferramenta: o modelo escolhe, o código decide se pode.' },
      { path: 'src/balcao/grafo.py', porque: 'O `StateGraph` do «Balcão»: estado com reducers, router por intenção, `interrupt` acima de 500 MZN e checkpoints no PostgreSQL (ADR-0013, ADR-0014, ADR-0015).' },
      { path: 'src/balcao/memoria.py', porque: 'Janela recente mais resumo incremental, sem memória pessoal de longo prazo (ADR-0016).' },
      { path: 'src/balcao/guardas.py', porque: 'Mascarar PII, pontuar injecção e validar a saída — guardrails em camadas, nunca uma só (ADR-0020, ADR-0028).' },
      { path: 'src/balcao/mcp_servidor.py', porque: 'As mesmas ferramentas expostas por MCP com `FastMCP`, para outros agentes internos (ADR-0017).' },
    ],
  },
  {
    id: 'producao',
    titulo: 'Serviço, avaliação e entrega',
    blurb:
      'O que transforma um protótipo num serviço: FastAPI com SSE, traços `gen_ai`, conjunto dourado e juiz, '
      + 'testes sem rede, a imagem Docker e os workflows de CI/CD com as evals como gate.',
    paragens: [
      { path: 'src/balcao/api/app.py', porque: 'A app FastAPI com `lifespan`: pool de ligações, grafo compilado e checkpointer criados uma vez no arranque.' },
      { path: 'src/balcao/api/rotas.py', porque: 'As rotas, com a resposta em streaming por Server-Sent Events e o cancelamento quando o cliente desliga (ADR-0021).' },
      { path: 'src/balcao/api/esquemas.py', porque: 'Os esquemas Pydantic da API: o contrato de `src/data/api.ts`, em código.' },
      { path: 'src/balcao/observabilidade.py', porque: 'Spans OpenTelemetry com os atributos `gen_ai.*`, sem PII (ADR-0025).' },
      { path: 'dados/dourado.jsonl', porque: 'O conjunto dourado versionado no repositório: cada linha é uma pergunta, os documentos relevantes e a resposta esperada (ADR-0018).' },
      { path: 'src/balcao/avaliacao/correr.py', porque: 'Corre o conjunto dourado, calcula as métricas por intenção e falha com código diferente de zero em regressão.' },
      { path: 'src/balcao/avaliacao/juiz.py', porque: 'LLM-como-juiz com rubrica, modelo diferente do que respondeu e calibração contra anotação humana (ADR-0019).' },
      { path: 'tests/test_grafo.py', porque: 'Testes do grafo com o modelo simulado: o caminho certo por intenção, o interrupt e a retoma.' },
      { path: 'docker/Dockerfile', porque: 'Multi-stage com `uv`, dependências fixadas, utilizador não-root e `HEALTHCHECK` (ADR-0022).' },
      { path: 'docker-compose.yml', porque: 'A API, o PostgreSQL com pgvector e o Ollama, com `depends_on` à espera de saúde.' },
      { path: '.github/workflows/ci.yml', porque: 'Lint, tipos, testes, evals como gate por intenção e build da imagem por SHA (ADR-0024).' },
      { path: '.github/workflows/evals-nocturnas.yml', porque: 'As evals com modelo real, todas as noites, fora do caminho crítico de um pull request.' },
    ],
  },
  {
    id: 'didactico',
    titulo: 'O runtime didáctico do browser',
    blurb:
      'O pacote que corre nos blocos «Correr» e no playground, em Pyodide: corpus, perguntas douradas, embeddings '
      + 'por hashing, BM25, RRF, métricas, modelo simulado e um grafo mínimo — tudo determinista.',
    paragens: [
      { path: 'src/balcao/corpus.py', porque: 'Os 40 documentos, as 30 perguntas douradas e os pedidos e clientes simulados.' },
      { path: 'src/balcao/didactico.py', porque: 'Tokenização, embeddings, chunking, pesquisa, avaliação, modelo simulado, ferramentas e `GrafoEstado` — a versão pedagógica de cada peça.' },
      { path: 'src/balcao/__init__.py', porque: 'O que `import balcao` expõe, com as docstrings que o tutorial cita.' },
      { path: 'tests/test_didactico.py', porque: 'Os testes que fixam os números do tutorial: se o runtime mudar, é aqui que se nota.' },
    ],
  },
];

const PERCURSOS: Percurso[] = PERCURSOS_BASE
  .map((p) => ({ ...p, paragens: p.paragens.filter((x) => POR_CAMINHO[x.path]) }))
  .filter((p) => p.paragens.length > 0);

/* =================================================================== apoio */

function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const NUM = new Intl.NumberFormat('pt-PT');

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const LINHAS_POR_GRUPO: Record<string, number> = MANIFESTO.reduce<Record<string, number>>((a, e) => {
  a[e.grupo] = (a[e.grupo] ?? 0) + e.linhas;
  return a;
}, {});

/* ================================================================== painel */

function Ficheiro({ path }: { path: string }) {
  const entrada = POR_CAMINHO[path];
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    setTexto(null);
    setErro(false);
    carregarFicheiro(path)
      .then((t) => { if (!vivo) return; if (t === undefined) setErro(true); else setTexto(t); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [path]);

  const copiar = async () => {
    if (texto === null) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* área de transferência indisponível */ }
  };

  if (!entrada || erro) {
    return (
      <p className="rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        Ficheiro desconhecido no laboratório: {path}
      </p>
    );
  }

  return (
    <article className="animate-fade-up min-w-0">
      <header className="rounded-2xl border border-soft surface p-4">
        <p className="text-[0.95rem] leading-relaxed text-strong"><RichText text={entrada.blurb} /></p>
        <p className="mt-2 font-mono text-[0.8rem] break-all text-brand-700 dark:text-brand-300">
          laboratorio/{entrada.path}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="chip surface-sunken text-muted">{entrada.lang}</span>
          <span className="chip surface-sunken text-muted">{NUM.format(entrada.linhas)} linhas</span>
          <span className="chip surface-sunken text-muted">{tamanho(entrada.bytes)}</span>
          <span className="chip surface-sunken text-muted">grupo {entrada.grupo}</span>
          <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={copiar} disabled={texto === null}>
            {copiado ? '✓ Copiado' : 'Copiar ficheiro'}
          </button>
        </div>
      </header>

      {texto === null ? (
        <p className="mt-5 flex items-center gap-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          A descarregar o ficheiro…
        </p>
      ) : (
        <CodeBlock code={texto} lang={entrada.lang} caption={entrada.path.split('/').pop()} />
      )}
    </article>
  );
}

/* =================================================================== página */

export function RepoPage() {
  const [params, setParams] = useSearchParams();
  const alvo = params.get('f');
  const path = alvo && POR_CAMINHO[alvo] ? alvo : null;

  const [filtro, setFiltro] = useState('');
  const [fechados, setFechados] = useState<string[]>(() => GRUPOS.map((g) => g.id).slice(1));
  const [percurso, setPercurso] = useState<string | null>(PERCURSOS[0]?.id ?? null);

  const abrir = (p: string) => setParams({ f: p }, { replace: true });

  const f = fold(filtro.trim());
  const visiveis = useMemo(() => {
    if (!f) return null;
    return new Set(MANIFESTO.filter((e) => fold(e.path).includes(f) || fold(e.blurb).includes(f)).map((e) => e.path));
  }, [f]);

  const p = PERCURSOS.find((x) => x.id === percurso);
  const indiceNoPercurso = p && path ? p.paragens.findIndex((x) => x.path === path) : -1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow mb-1">O projecto · laboratório</p>
        <h1 className="text-2xl font-black sm:text-3xl">O repositório do «Balcão»</h1>
        <p className="mt-3 max-w-3xl text-[0.97rem] leading-relaxed">
          Isto não são excertos escritos para o tutorial: são os {NUM.format(TOTAIS.ficheiros)} ficheiros
          e {NUM.format(TOTAIS.linhas)} linhas do laboratório — o serviço FastAPI, o RAG sobre PostgreSQL com
          pgvector, o grafo LangGraph, as avaliações, a imagem Docker e os workflows de CI/CD.
        </p>
        <p className="mt-2 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
          Clona o laboratório e corre <code className="rounded-md border border-soft surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700 dark:text-brand-300">uv sync</code> e{' '}
          <code className="rounded-md border border-soft surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700 dark:text-brand-300">uv run pytest</code>:
          por omissão tudo corre com o modelo simulado, sem rede e sem chave de API. Com{' '}
          <code className="rounded-md border border-soft surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700 dark:text-brand-300">docker compose up</code>{' '}
          sobem a API, o PostgreSQL e o Ollama.
        </p>
      </header>

      <section aria-labelledby="perc-t" className="mt-8">
        <h2 id="perc-t" className="mb-1 text-lg font-bold">Percursos guiados</h2>
        <p className="mb-3 max-w-3xl text-[0.9rem] text-muted">
          Ler um repositório por ordem alfabética não ensina nada. Estes percursos atravessam-no pela ordem
          em que um sistema LLM se constrói, e cada paragem diz porque é que se olha para aquele ficheiro a
          seguir. Se é a primeira vez, começa por «Por onde começar».
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PERCURSOS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setPercurso(percurso === x.id ? null : x.id)}
              aria-pressed={percurso === x.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                percurso === x.id
                  ? 'bg-brand-700 text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]'
                  : 'surface-sunken text-muted hover:text-strong'
              }`}
            >
              {x.titulo} <span className="font-mono opacity-70">{x.paragens.length}</span>
            </button>
          ))}
        </div>

        {p && (
          <div className="animate-fade-up mt-3 rounded-2xl border border-soft surface-sunken p-4">
            <p className="text-[0.9rem] leading-relaxed">{p.blurb}</p>
            <ol className="mt-3 space-y-1.5">
              {p.paragens.map((par, i) => {
                const activo = par.path === path;
                return (
                  <li key={par.path}>
                    <button
                      type="button"
                      onClick={() => abrir(par.path)}
                      aria-current={activo ? 'true' : undefined}
                      className={`flex w-full gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        activo ? 'border-brand-400 surface' : 'border-soft hover:surface'
                      }`}
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[0.7rem] font-bold text-white dark:bg-brand-500 dark:text-[oklch(0.16_0.03_200)]">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[0.78rem] font-semibold text-strong">{par.path}</span>
                        <span className="block text-[0.83rem] leading-relaxed text-muted">{par.porque}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {indiceNoPercurso >= 0 && indiceNoPercurso < p.paragens.length - 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                onClick={() => abrir(p.paragens[indiceNoPercurso + 1].path)}
              >
                Paragem seguinte ({indiceNoPercurso + 2}/{p.paragens.length}) →
              </button>
            )}
          </div>
        )}
      </section>

      <div className="mt-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Árvore do repositório" className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <label htmlFor="repo-filtro" className="mb-1 block text-[0.7rem] font-bold tracking-widest text-muted uppercase">
              Filtrar por nome
            </label>
            <input
              id="repo-filtro"
              className="field field-mono"
              placeholder="features, conformal, drift, hpa…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              spellCheck={false}
            />

            <div className="scrollbar-thin mt-3 max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {GRUPOS.map((g) => {
                const ficheiros = visiveis ? g.files.filter((x) => visiveis.has(x)) : g.files;
                if (visiveis && ficheiros.length === 0) return null;
                const fechado = !visiveis && fechados.includes(g.id);
                return (
                  <div key={g.id} className="rounded-xl border border-soft">
                    <button
                      type="button"
                      onClick={() => setFechados((v) => (v.includes(g.id) ? v.filter((x) => x !== g.id) : [...v, g.id]))}
                      aria-expanded={!fechado}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:surface-sunken"
                    >
                      <span aria-hidden className="text-[0.7rem] text-muted">{fechado ? '▸' : '▾'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.85rem] font-semibold text-strong">{g.title}</span>
                        <span className="block font-mono text-[0.7rem] text-muted">
                          {ficheiros.length} ficheiros · {NUM.format(LINHAS_POR_GRUPO[g.id] ?? 0)} linhas
                        </span>
                      </span>
                    </button>
                    {!fechado && (
                      <ul className="border-t border-soft px-1.5 py-1.5">
                        {ficheiros.map((fp) => (
                          <li key={fp}>
                            <button
                              type="button"
                              onClick={() => abrir(fp)}
                              aria-current={fp === path ? 'true' : undefined}
                              title={fp}
                              className={`block w-full truncate rounded-lg px-2 py-1 text-left font-mono text-[0.72rem] transition ${
                                fp === path
                                  ? 'bg-brand-500/12 font-semibold text-brand-700 dark:text-brand-300'
                                  : 'text-muted hover:surface-sunken hover:text-strong'
                              }`}
                            >
                              {fp.split('/').pop()}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              {visiveis && visiveis.size === 0 && (
                <p className="px-1 text-sm text-muted">Nenhum ficheiro corresponde a «{filtro}».</p>
              )}
            </div>
          </div>
        </nav>

        <main className="mt-6 min-w-0 lg:mt-0">
          {path ? (
            <Ficheiro path={path} />
          ) : (
            <div className="card p-5">
              <h2 className="text-lg font-bold">Escolhe um ficheiro</h2>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">
                Na barra lateral, ou por um dos percursos guiados acima. O conteúdo de cada grupo só é
                descarregado quando abres o primeiro ficheiro dele — por isso é que esta página abre depressa
                apesar de ter {NUM.format(TOTAIS.linhas)} linhas de código atrás.
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {GRUPOS.map((g) => (
                  <div key={g.id} className="rounded-xl border border-soft surface-sunken p-3.5">
                    <p className="text-[0.88rem] font-bold text-strong">{g.title}</p>
                    <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">{g.blurb}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/desenho" className="btn btn-ghost btn-sm max-w-full whitespace-normal text-left">O desenho que este código implementa</Link>
                <Link to="/decisoes" className="btn btn-ghost btn-sm">As decisões por trás dele</Link>
                <Link to="/playground" className="btn btn-ghost btn-sm">Correr Python no browser</Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
