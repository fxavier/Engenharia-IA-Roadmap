/* Execução de Python no browser, com o pacote `balcao` já carregado.
 *
 * O núcleo do Pyodide é servido do próprio tutorial (`public/pyodide/`), por
 * isso a aplicação arranca sem rede. Os pacotes científicos — numpy, pandas,
 * matplotlib — são wheels grandes: vêm do CDN da Pyodide, a não
 * ser que tenham sido descarregados para `public/pyodide/` com
 * `npm run vendor-pyodide`, caso em que tudo corre offline.
 *
 * Sem rede e sem wheels locais, o playground não corre: os blocos do tutorial
 * mostram então a saída pré-calculada, que é a mesma que o código produz.
 */

import { PYODIDE_CDN } from '../data/pyodide-versao';

export type EstadoPyodide = 'inactivo' | 'a-carregar' | 'pronto' | 'indisponivel';

export interface ProgressoPyodide {
  estado: EstadoPyodide;
  passo: string;
  /** 0 a 1; indefinido quando o passo não tem progresso mensurável. */
  fraccao?: number;
  erro?: string;
}

export interface Resultado {
  saida: string;
  erro?: string;
  /** PNG em base64, quando o código desenhou uma figura. */
  imagem?: string;
  ms: number;
}

interface PyodideApi {
  runPythonAsync(code: string): Promise<unknown>;
  loadPackage(nomes: string[]): Promise<void>;
  setStdout(opcoes: { batched: (s: string) => void }): void;
  setStderr(opcoes: { batched: (s: string) => void }): void;
  FS: { writeFile(caminho: string, dados: string, opcoes?: { encoding: string }): void; mkdirTree(caminho: string): void };
  globals: { get(nome: string): unknown };
}

type Carregador = (opcoes: {
  indexURL: string;
  packageBaseUrl?: string;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
}) => Promise<PyodideApi>;

/** Base do CDN, fixada na versão do núcleo servido em `public/pyodide/`. */
export { PYODIDE_CDN };

const BASE_LOCAL = new URL('pyodide/', document.baseURI).href;

/** Pacotes que o ambiente base do playground carrega sempre. */
export const PACOTES_BASE = ['numpy'];

let api: PyodideApi | null = null;
let aCarregar: Promise<PyodideApi> | null = null;
const carregados = new Set<string>();
let ultimoErro: string | undefined;

const ouvintes = new Set<(p: ProgressoPyodide) => void>();
let progresso: ProgressoPyodide = { estado: 'inactivo', passo: '' };

function emitir(p: ProgressoPyodide) {
  progresso = p;
  ouvintes.forEach((l) => l(p));
}

export function observarPyodide(l: (p: ProgressoPyodide) => void): () => void {
  ouvintes.add(l);
  l(progresso);
  return () => { ouvintes.delete(l); };
}

export function estadoPyodide(): ProgressoPyodide {
  return progresso;
}

function carregarScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`não foi possível carregar ${url}`));
    document.head.appendChild(s);
  });
}

async function existe(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

/** Preferir wheels locais quando existem; senão, o CDN. */
async function baseDosPacotes(): Promise<string> {
  return (await existe(`${BASE_LOCAL}numpy-marcador.json`)) ? BASE_LOCAL : PYODIDE_CDN;
}

async function arrancar(): Promise<PyodideApi> {
  emitir({ estado: 'a-carregar', passo: 'a carregar o interpretador' });

  const temLocal = await existe(`${BASE_LOCAL}pyodide.js`);
  const indexURL = temLocal ? BASE_LOCAL : PYODIDE_CDN;
  await carregarScript(`${indexURL}pyodide.js`);

  const janela = window as unknown as { loadPyodide?: Carregador };
  if (!janela.loadPyodide) throw new Error('o núcleo do Pyodide carregou mas não se registou');

  const py = await janela.loadPyodide({ indexURL, packageBaseUrl: await baseDosPacotes() });

  emitir({ estado: 'a-carregar', passo: 'a carregar numpy' });
  await py.loadPackage(PACOTES_BASE);
  PACOTES_BASE.forEach((p) => carregados.add(p));

  emitir({ estado: 'a-carregar', passo: 'a preparar o pacote «balcao»' });
  /* A fonte do pacote (≈ 130 kB) só desce quando o Python arranca. */
  const { BALCAO_PY } = await import('../data/balcao-fonte');
  py.FS.mkdirTree('/home/pyodide/balcao');
  for (const f of BALCAO_PY) py.FS.writeFile(`/home/pyodide/balcao/${f.nome}`, f.fonte(), { encoding: 'utf8' });
  await py.runPythonAsync([
    'import sys',
    'if "/home/pyodide" not in sys.path: sys.path.insert(0, "/home/pyodide")',
    'import balcao',
  ].join('\n'));

  api = py;
  emitir({ estado: 'pronto', passo: 'pronto' });
  return py;
}

/** Arranca o Pyodide (uma só vez) e garante os pacotes pedidos. */
export async function prepararPython(pacotes: string[] = []): Promise<PyodideApi> {
  if (!api) {
    aCarregar ??= arrancar().catch((e: unknown) => {
      aCarregar = null;
      ultimoErro = e instanceof Error ? e.message : String(e);
      emitir({ estado: 'indisponivel', passo: 'sem Python no browser', erro: ultimoErro });
      throw e;
    });
    await aCarregar;
  }
  const py = api;
  if (!py) throw new Error(ultimoErro ?? 'Pyodide indisponível');

  const faltam = pacotes.filter((p) => !carregados.has(p));
  if (faltam.length > 0) {
    emitir({ estado: 'a-carregar', passo: `a carregar ${faltam.join(', ')}` });
    await py.loadPackage(faltam);
    faltam.forEach((p) => carregados.add(p));
    emitir({ estado: 'pronto', passo: 'pronto' });
  }
  return py;
}

const PREAMBULO_FIGURA = [
  'import matplotlib',
  'matplotlib.use("AGG")',
  'import matplotlib.pyplot as plt',
  'plt.close("all")',
].join('\n');

const RECOLHER_FIGURA = [
  'import base64 as _b64, io as _io',
  '_fig_b64 = ""',
  'if plt.get_fignums():',
  '    _buf = _io.BytesIO()',
  '    plt.gcf().savefig(_buf, format="png", dpi=118, bbox_inches="tight")',
  '    _fig_b64 = _b64.b64encode(_buf.getvalue()).decode()',
  '    plt.close("all")',
].join('\n');

/** Indenta um bloco para poder viver dentro de um `try:` gerado. */
function indentar(codigo: string): string {
  return codigo
    .split('\n')
    .map((l) => (l.length > 0 ? `    ${l}` : l))
    .join('\n');
}

/**
 * Corre um excerto. O `traceback` é devolvido como erro em vez de rebentar,
 * porque no tutorial um erro de Python é conteúdo, não avaria.
 */
export async function correrPython(
  codigo: string,
  opcoes: { pacotes?: string[]; figura?: boolean } = {},
): Promise<Resultado> {
  const pacotes = [...(opcoes.pacotes ?? [])];
  if (opcoes.figura && !pacotes.includes('matplotlib')) pacotes.push('matplotlib');

  const py = await prepararPython(pacotes);
  const linhas: string[] = [];
  py.setStdout({ batched: (s) => linhas.push(s) });
  py.setStderr({ batched: (s) => linhas.push(s) });

  const inicio = performance.now();
  const envolvido = [
    'import traceback as _tb',
    '_erro = ""',
    opcoes.figura ? PREAMBULO_FIGURA : '',
    'try:',
    indentar(codigo),
    'except BaseException:',
    '    _erro = _tb.format_exc()',
    opcoes.figura ? RECOLHER_FIGURA : '_fig_b64 = ""',
  ]
    .filter((l) => l !== '')
    .join('\n');

  try {
    await py.runPythonAsync(envolvido);
  } catch (e: unknown) {
    return { saida: linhas.join('\n'), erro: e instanceof Error ? e.message : String(e), ms: performance.now() - inicio };
  }

  const erro = String(py.globals.get('_erro') ?? '');
  const imagem = String(py.globals.get('_fig_b64') ?? '');
  return {
    saida: linhas.join('\n').replace(/\n+$/, ''),
    erro: erro.length > 0 ? erro.trim() : undefined,
    imagem: imagem.length > 0 ? imagem : undefined,
    ms: performance.now() - inicio,
  };
}
