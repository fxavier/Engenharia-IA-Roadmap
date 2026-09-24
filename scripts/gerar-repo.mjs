#!/usr/bin/env node
/* Gera src/data/repo/ a partir de laboratorio/ — o laboratório Python do «Balcão»
   (Python 3.13, uv, FastAPI, LangChain/LangGraph, PostgreSQL com pgvector).
   O manifesto é leve (caminhos, linguagem, blurb, grupo) e carrega no arranque;
   o conteúdo dos ficheiros fica em pedaços por grupo, carregados sob procura.
   No fim, confirma que todos os REPO_PATHS de src/data/ids.ts existem.
   Uso: npm run gerar-repo                                                    */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = 'laboratorio';
const SAIDA = 'src/data/repo';

/** Acima disto é artefacto, não é código para ler (o uv.lock tem ≈ 700 KB e fica de fora de qualquer forma). */
const MAX_BYTES = 200 * 1024;

/* ------------------------------------------------------------------ grupos */

const MODULO = (p, ...nomes) => nomes.some((n) => p === `src/balcao/${n}.py`);

const GRUPOS = [
  {
    id: 'projecto',
    title: 'Projecto e configuração',
    blurb:
      'O que faz o laboratório arrancar noutra máquina: `pyproject.toml` com as dependências e a configuração de '
      + 'ruff, mypy e pytest, a versão de Python, as variáveis de ambiente, o Makefile, o LEIA-ME — e as três peças '
      + 'que escolhem o modelo: a configuração tipada, a fábrica de modelos por fornecedor e o modelo simulado.',
    test: (p) =>
      ['README.md', 'pyproject.toml', '.python-version', '.env.example', 'Makefile', '.gitignore', '.pre-commit-config.yaml']
        .includes(p) || MODULO(p, '__init__', 'config', 'modelos', 'simulado'),
  },
  {
    id: 'docker-ci',
    title: 'Docker e CI/CD',
    blurb:
      'Imagem multi-stage com uv e utilizador não-root (adr-0022), o compose com PostgreSQL 18 + pgvector e o Ollama '
      + 'opcional, e os dois workflows: CI com lint, testes, evals como gate e imagem por SHA no GHCR (adr-0024), e a '
      + 'avaliação nocturna contra o modelo real.',
    test: (p) => p.startsWith('docker/') || p.startsWith('.github/') || p === 'docker-compose.yml' || p === '.dockerignore',
  },
  {
    id: 'dados',
    title: 'Dados, SQL e prompts',
    blurb:
      'O esquema do PostgreSQL (vector(768), HNSW, tsvector, a função de pesquisa híbrida com RRF, conversas e '
      + 'aprovações), os prompts versionados com cabeçalho de versão (adr-0023) e o conjunto dourado e os ataques de '
      + 'red team que o gate de CI corre (adr-0018).',
    test: (p) => p.startsWith('sql/') || p.startsWith('prompts/') || p.startsWith('dados/'),
  },
  {
    id: 'didactico',
    title: 'Runtime didáctico',
    blurb:
      'O módulo que corre no browser (Pyodide) e no laboratório: BPE, embeddings por hashing, BM25, IVF, RRF, '
      + 're-ranking, métricas, o modelo simulado, as ferramentas e o mini-grafo — mais o corpus de 40 documentos, as '
      + '30 perguntas douradas e os pedidos simulados.',
    test: (p) => MODULO(p, 'didactico', 'corpus'),
  },
  {
    id: 'rag',
    title: 'RAG: ingestão, recuperação e cadeia',
    blurb:
      'Ingestão idempotente com chunking recursivo e metadados herdados (adr-0008), o retriever híbrido sobre '
      + 'pgvector ou em memória com filtros na base de dados (adr-0009, adr-0010) e a cadeia LCEL com citações '
      + 'validadas e recusa (adr-0011).',
    test: (p) => MODULO(p, 'ingestao', 'recuperacao', 'cadeias'),
  },
  {
    id: 'agente',
    title: 'Agente e grafo',
    blurb:
      'O grafo LangGraph com router, agente com orçamento de ferramentas e interrupt para reembolsos acima de '
      + '500 MZN (adr-0013, adr-0015), as 12 ferramentas com identidade vinda do contexto e limites no código, a '
      + 'memória (janela + resumo), os guardrails e o servidor MCP.',
    test: (p) => MODULO(p, 'ferramentas', 'grafo', 'memoria', 'guardas', 'mcp_servidor'),
  },
  {
    id: 'api',
    title: 'API e observabilidade',
    blurb:
      'FastAPI com lifespan, streaming por Server-Sent Events (adr-0021), erros RFC 9457, papéis por bearer token, '
      + 'aprovações que retomam o grafo com Command(resume=...), persistência em memória ou PostgreSQL, e os traços '
      + '`gen_ai.*` e métricas Prometheus (adr-0025).',
    test: (p) => p.startsWith('src/balcao/api/') || MODULO(p, 'observabilidade'),
  },
  {
    id: 'avaliacao',
    title: 'Avaliação',
    blurb:
      'Métricas com intervalo de confiança por bootstrap, LLM-como-juiz com rubrica e saída estruturada (adr-0019) '
      + 'e o corredor do conjunto dourado com `--gate`, que falha o CI abaixo dos limiares.',
    test: (p) => p.startsWith('src/balcao/avaliacao/'),
  },
  {
    id: 'testes',
    title: 'Testes',
    blurb:
      'pytest offline, com o modelo simulado e o índice em memória: runtime didáctico, recuperação e filtros, '
      + 'ferramentas e limites, grafo (router, interrupt e retoma, limite de passos), guardas, API com SSE e o gate. '
      + 'Os de PostgreSQL saltam sem DATABASE_URL.',
    test: (p) => p.startsWith('tests/'),
  },
  {
    id: 'outros',
    title: 'Outros ficheiros',
    blurb: 'O que não cabe nos grupos anteriores.',
    test: () => true, // catch-all deliberado, por último.
  },
];

/* ---------------------------------------------------------------- extensões */

const LANG = {
  '.py': 'python',
  '.toml': 'toml',
  '.sql': 'sql',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sh': 'bash',
  '.json': 'json',
  '.jsonl': 'json',
  '.txt': 'text',
};

function lang(p) {
  const nome = basename(p);
  if (nome === 'Dockerfile' || nome.startsWith('Dockerfile.')) return 'dockerfile';
  // As receitas de um Makefile são shell; o realce de `bash` (comentários #) serve.
  if (nome === 'Makefile') return 'bash';
  if (nome.startsWith('.env')) return 'bash';
  if (nome === '.gitignore' || nome === '.python-version' || nome === '.dockerignore') return 'text';
  return LANG[extname(p)] ?? 'text';
}

/* ------------------------------------------------- blurb a partir do ficheiro
   Em Python, a primeira linha da docstring do módulo é, por convenção, um
   resumo de uma linha — é exactamente o que esta página quer. Onde não há
   docstring, vale o primeiro comentário; e num Markdown, o primeiro título. */

/** Um separador de secção (`# ---- constantes`) não é um resumo. */
function aproveitavel(t) {
  const limpo = t.replace(/[=*#_-]{3,}/g, '').trim();
  if (limpo.length < 12 || limpo.length > 190) return null;
  if (/^(SPDX|Copyright|ruff|mypy|type:|noqa|pyright|fmt:)/i.test(limpo)) return null;
  return limpo;
}

/** Primeira frase da docstring do módulo, quando o ficheiro começa por uma. Uma
 *  frase partida por várias linhas é juntada até ao ponto final (ou ao fim do
 *  primeiro parágrafo) — senão o resumo fica cortado a meio. */
function docstringDeModulo(texto) {
  const linhas = texto.split('\n');
  const i = linhas.findIndex((l) => l.trim() !== '' && !l.trim().startsWith('#'));
  if (i < 0) return null;
  const m = linhas[i].trim().match(/^(?:r|u|b)?("""|\'\'\')(.*)$/);
  if (!m) return null;
  const partes = [];
  let resto = m[2];
  for (let j = i; j < Math.min(linhas.length, i + 8); j++) {
    const l = (j === i ? resto : linhas[j]).trim();
    const fecha = /("""|\'\'\')\s*$/.test(l);
    const limpa = l.replace(/("""|\'\'\')\s*$/, '').trim();
    if (limpa === '' && partes.length) break;
    if (limpa !== '') partes.push(limpa);
    if (fecha || /[.!?:]$/.test(limpa)) break;
  }
  let junto = partes.join(' ');
  if (junto.includes('. ')) junto = junto.slice(0, junto.indexOf('. ') + 1);
  return aproveitavel(junto);
}

/** Primeiro comentário `#` útil, ignorando shebangs, células e directivas.
 *  Um comentário partido por várias linhas é juntado até à primeira frase
 *  fechada — senão o resumo fica cortado a meio. */
function primeiroCardinal(texto) {
  const linhas = texto.split('\n').slice(0, 20);
  let junto = null;
  for (const bruta of linhas) {
    const l = bruta.trim();
    if (junto === null) {
      if (l === '') continue;
      if (l.startsWith('#!') || /^#\s*%%/.test(l) || /^#\s*-\*-/.test(l)) continue;
      if (/^#\s*(syntax|check|escape)\s*=/.test(l)) continue;
      if (!l.startsWith('#')) return null;
      // Num notebook em formato percent, o texto vem como markdown: `# # Título`.
      const conteudo = l.replace(/^#+\s*/, '').replace(/^#+\s*/, '').trim();
      if (aproveitavel(conteudo) === null) continue;
      junto = conteudo;
    } else {
      if (/[.!?:]$/.test(junto) || junto.length > 150) break;
      if (!l.startsWith('#')) break;
      const cont = l.replace(/^#+\s*/, '').trim();
      if (cont === '' || /^[=*#_-]{3,}$/.test(cont)) break;
      junto = `${junto} ${cont}`;
    }
  }
  if (junto === null) return null;
  // Parou a meio de uma frase: recua até à última que ficou fechada.
  if (!/[.!?]$/.test(junto) && junto.includes('. ')) {
    junto = junto.slice(0, junto.lastIndexOf('. ') + 1);
  }
  return aproveitavel(junto.replace(/[,;]$/, '.'));
}

/** A primeira frase do comentário de bloco `/* ... *\/` com que todo ficheiro `.ts`
 *  deste laboratório começa (a explicação de 3-8 linhas mais a(s) ADR(s) que
 *  implementa) — o equivalente TypeScript da docstring de módulo do Python. */
function primeiroBlocoTS(texto) {
  const m = texto.match(/^\s*\/\*([\s\S]*?)\*\//);
  if (!m) return null;
  const junto = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => l !== '')
    .join(' ')
    .trim();
  if (junto === '') return null;
  const fraseUm = junto.includes('. ') ? junto.slice(0, junto.indexOf('. ') + 1) : junto;
  return aproveitavel(fraseUm);
}

/** Primeiro `# título` de um Markdown. */
function primeiroTitulo(texto) {
  for (const bruta of texto.split('\n').slice(0, 12)) {
    const l = bruta.trim();
    if (l === '') continue;
    const m = l.match(/^#{1,3}\s+(.+)$/);
    if (m) return aproveitavel(m[1]);
  }
  return null;
}

/** Primeiro comentário `--` de um SQL. */
function primeiroTraco(texto) {
  for (const bruta of texto.split('\n').slice(0, 12)) {
    const l = bruta.trim();
    if (l === '') continue;
    if (!l.startsWith('--')) return null;
    const bom = aproveitavel(l.replace(/^-+\s*/, ''));
    if (bom) return bom;
  }
  return null;
}

function blurbAutomatico(texto, p) {
  const ext = extname(p);
  const nome = basename(p);
  if (ext === '.py') return docstringDeModulo(texto) ?? primeiroCardinal(texto);
  if (ext === '.ts') return primeiroBlocoTS(texto);
  if (POR_NOME[p]) return null; // um título como «Balcão — laboratório» não diz o que o ficheiro é
  if (ext === '.md') return primeiroTitulo(texto);
  if (ext === '.sql') return primeiroTraco(texto);
  if (['.yaml', '.yml', '.sh', '.toml'].includes(ext)) return primeiroCardinal(texto);
  if (nome === 'Dockerfile' || nome === 'Makefile' || nome.startsWith('.env') || nome === '.dockerignore') {
    return primeiroCardinal(texto);
  }
  return null;
}

/* --------------------------------------------- blurb a partir do caminho */

const POR_NOME = {
  'README.md': 'Como pôr o laboratório do «Balcão» a correr: com e sem Docker, com Ollama ou sem nada.',
  '.python-version': 'Python 3.13: a versão que o uv instala e que a imagem Docker usa.',
  '.gitignore': 'O que não entra no repositório: o ambiente, as caches, os relatórios e o `.env` com segredos.',
  '.dockerignore': 'O que não entra no contexto de build da imagem: testes, caches e segredos.',
  'dados/dourado.jsonl': 'Conjunto dourado: 30 perguntas de política, 10 fora de âmbito e 8 casos de ferramenta, com a resposta ou a ferramenta esperada.',
  'dados/redteam.jsonl': 'Os 20 ataques de prompt injection (directa, indirecta, codificada, roleplay, exfiltração) e o comportamento esperado.',
};

function blurbDoCaminho(p) {
  const nome = basename(p);
  if (POR_NOME[p]) return POR_NOME[p];
  if (POR_NOME[nome]) return POR_NOME[nome];
  if (p.startsWith('tests/') && nome.startsWith('test_')) return `Testes de \`${nome.replace(/^test_|\.py$/g, '')}\`.`;
  if (nome.endsWith('.py')) return `Módulo \`${p.replace(/^src\//, '').replace(/\.py$/, '').replaceAll('/', '.')}\`.`;
  return `\`${nome}\`.`;
}

/* --------------------------------------------------------------------- lista */

const IGNORAR = [
  '.git/',
  '.venv/',
  '__pycache__/',
  '.pytest_cache/',
  '.ruff_cache/',
  '.mypy_cache/',
  'relatorios/',
  'node_modules/',
];

function excluido(p) {
  if (IGNORAR.some((d) => p === d.slice(0, -1) || p.startsWith(d) || p.includes(`/${d}`))) return true;
  const nome = basename(p);
  if (nome === '.DS_Store' || nome.endsWith('.pyc')) return true;
  // Gerado pelo uv e com ≈ 700 KB: entra no repositório do laboratório, não no tutorial.
  if (nome === 'uv.lock') return true;
  // `.env` real (com segredos), nunca `.env.example` (esse é o ficheiro que entra no repositório).
  if (nome === '.env') return true;
  return false;
}

// `-prune` nas pastas ignoradas: o .venv tem dezenas de milhares de ficheiros e nem se entra nele.
const PODAR = IGNORAR.flatMap((d, i) => [...(i ? ['-o'] : []), '-name', d.slice(0, -1)]);
const lista = execFileSync('find', [RAIZ, '(', '-type', 'd', '(', ...PODAR, ')', '-prune', ')', '-o', '-type', 'f', '-print'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean)
  .map((p) => relative(RAIZ, p))
  .filter((p) => !excluido(p))
  .filter((p) => statSync(join(RAIZ, p)).size <= MAX_BYTES)
  .sort();

if (existsSync(SAIDA)) rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

const manifesto = [];
const porGrupo = new Map(GRUPOS.map((g) => [g.id, []]));
let bytes = 0;

for (const p of lista) {
  const texto = readFileSync(join(RAIZ, p), 'utf8');
  const grupo = GRUPOS.find((g) => g.test(p)).id;
  const auto = blurbAutomatico(texto, p);
  manifesto.push({
    path: p,
    lang: lang(p),
    grupo,
    linhas: texto.split('\n').length,
    bytes: Buffer.byteLength(texto),
    blurb: auto ?? blurbDoCaminho(p),
    auto: auto !== null,
  });
  porGrupo.get(grupo).push([p, texto]);
  bytes += Buffer.byteLength(texto);
}

/* ------------------------------------------------------------- ficheiros TS */

const cab = '/* GERADO POR scripts/gerar-repo.mjs — NÃO EDITAR À MÃO.\n   Corre `npm run gerar-repo` depois de mexer em laboratorio/. */\n\n';

// Um grupo sem ficheiros (o catch-all, quando tudo tem casa) não gera pedaço nem secção.
const USADOS = GRUPOS.filter((g) => porGrupo.get(g.id).length > 0);

for (const g of USADOS) {
  const ficheiros = porGrupo.get(g.id);
  const corpo = ficheiros
    .map(([p, t]) => `  ${JSON.stringify(p)}: ${JSON.stringify(t)},`)
    .join('\n');
  writeFileSync(join(SAIDA, `g-${g.id}.ts`), `${cab}export const FICHEIROS: Record<string, string> = {\n${corpo}\n};\n`, 'utf8');
}

const meta = USADOS.map((g) => ({
  id: g.id,
  title: g.title,
  blurb: g.blurb,
  files: manifesto.filter((m) => m.grupo === g.id).map((m) => m.path),
}));

writeFileSync(join(SAIDA, 'manifesto.ts'), `${cab}export interface RepoEntrada {
  path: string;
  lang: string;
  grupo: string;
  linhas: number;
  bytes: number;
  blurb: string;
}

export interface RepoGrupo {
  id: string;
  title: string;
  blurb: string;
  files: string[];
}

export const MANIFESTO: RepoEntrada[] = ${JSON.stringify(manifesto.map(({ auto, ...r }) => r), null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')};

export const GRUPOS: RepoGrupo[] = ${JSON.stringify(meta, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')};

export const POR_CAMINHO: Record<string, RepoEntrada> = Object.fromEntries(MANIFESTO.map((e) => [e.path, e]));
`, 'utf8');

const casos = USADOS.map((g) => `    case '${g.id}': return (await import('./g-${g.id}')).FICHEIROS;`).join('\n');

writeFileSync(join(SAIDA, 'index.ts'), `${cab}import { MANIFESTO, GRUPOS, POR_CAMINHO, type RepoEntrada, type RepoGrupo } from './manifesto';

export { MANIFESTO, GRUPOS, POR_CAMINHO };
export type { RepoEntrada, RepoGrupo };

const cache = new Map<string, Record<string, string>>();

async function carregarGrupo(id: string): Promise<Record<string, string>> {
  const guardado = cache.get(id);
  if (guardado) return guardado;
  const f = await grupo(id);
  cache.set(id, f);
  return f;
}

async function grupo(id: string): Promise<Record<string, string>> {
  switch (id) {
${casos}
    default: return {};
  }
}

/** Descarrega o conteúdo de um ficheiro do laboratório (e só o pedaço dele). */
export async function carregarFicheiro(path: string): Promise<string | undefined> {
  const e = POR_CAMINHO[path];
  if (!e) return undefined;
  return (await carregarGrupo(e.grupo))[path];
}

export const TOTAIS = {
  ficheiros: MANIFESTO.length,
  linhas: MANIFESTO.reduce((a, m) => a + m.linhas, 0),
  bytes: MANIFESTO.reduce((a, m) => a + m.bytes, 0),
};
`, 'utf8');

const genericos = manifesto.filter((m) => !m.auto).length;
console.log(`✓ ${SAIDA}/ gerado: ${manifesto.length} ficheiros, ${(bytes / 1024).toFixed(0)} KB, ${USADOS.length} pedaços.`);
console.log(`  ${manifesto.length - genericos} blurbs vindos do próprio ficheiro, ${genericos} gerados a partir do caminho.`);

/* ------------------------------------------------ verificação contra ids.ts */

const ids = readFileSync('src/data/ids.ts', 'utf8');
const bloco = ids.match(/export const REPO_PATHS = \[([\s\S]*?)\] as const;/);
if (!bloco) {
  console.error('✗ não encontrei REPO_PATHS em src/data/ids.ts');
  process.exit(1);
}
const esperados = [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const presentes = new Set(manifesto.map((m) => m.path));
const faltam = esperados.filter((p) => !presentes.has(p));
if (faltam.length) {
  console.error(`✗ ${faltam.length} caminho(s) de REPO_PATHS sem ficheiro em ${RAIZ}/:\n  ${faltam.join('\n  ')}`);
  process.exit(1);
}
console.log(`  todos os ${esperados.length} REPO_PATHS estão no manifesto.`);
