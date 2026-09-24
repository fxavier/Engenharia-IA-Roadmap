import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from './CodeBlock';
import { POR_CAMINHO, carregarFicheiro } from '../data/repo';

function recortar(texto: string, lines?: [number, number]): { code: string; recortado: boolean } {
  if (!lines) return { code: texto, recortado: false };
  const todas = texto.split('\n');
  const [a, b] = lines;
  return { code: todas.slice(Math.max(0, a - 1), b).join('\n'), recortado: true };
}

/** Mostra um ficheiro real do laboratório. O conteúdo vive num pedaço
 *  separado e só desce quando este bloco aparece. */
export function FileView({ path, lines }: { path: string; lines?: [number, number] }) {
  const entrada = POR_CAMINHO[path];
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    setTexto(null);
    setErro(false);
    carregarFicheiro(path)
      .then((t) => { if (vivo) { if (t === undefined) setErro(true); else setTexto(t); } })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [path]);

  if (!entrada || erro) {
    return (
      <p className="my-4 rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        Ficheiro desconhecido no laboratório: {path}
      </p>
    );
  }

  const { code, recortado } = texto ? recortar(texto, lines) : { code: '', recortado: false };

  return (
    <figure className="my-5 overflow-hidden rounded-2xl border border-soft">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-soft surface-sunken px-3.5 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.78rem] font-semibold text-strong">
            laboratorio/{entrada.path}
            {recortado && lines && <span className="ml-2 text-muted">linhas {lines[0]}–{lines[1]}</span>}
          </p>
          <p className="truncate text-[0.75rem] text-muted">{entrada.blurb}</p>
        </div>
        <Link to={`/repositorio?f=${encodeURIComponent(entrada.path)}`} className="btn btn-ghost btn-sm shrink-0">
          Ver inteiro
        </Link>
      </header>
      {texto === null ? (
        <p className="px-3.5 py-6 text-center text-sm text-muted">A carregar o ficheiro…</p>
      ) : (
        <CodeBlock code={code} lang={entrada.lang} dense />
      )}
    </figure>
  );
}
