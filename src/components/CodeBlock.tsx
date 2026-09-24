import { useState } from 'react';

const PYTHON = [
  'import', 'from', 'as', 'def', 'class', 'return', 'yield', 'if', 'elif', 'else', 'for', 'while',
  'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'try', 'except', 'finally', 'raise',
  'with', 'lambda', 'pass', 'break', 'continue', 'global', 'nonlocal', 'assert', 'del', 'async',
  'await', 'match', 'case', 'self', 'cls', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set',
  'tuple', 'len', 'range', 'print', 'enumerate', 'zip', 'sum', 'min', 'max', 'abs', 'round',
  'sorted', 'isinstance', 'type', 'np', 'json', 'b', 'balcao', 'Annotated', 'Optional', 'TypedDict', 'BaseModel', 'Field',
];

const KEYWORDS: Record<string, string[]> = {
  python: PYTHON,
  json: ['true', 'false', 'null'],
  http: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HTTP/1.1', 'HTTP/2'],
  yaml: ['true', 'false', 'null', 'on', 'jobs', 'steps', 'uses', 'with', 'run', 'runs-on', 'needs', 'env', 'services', 'image', 'build', 'ports', 'volumes', 'depends_on', 'healthcheck', 'environment', 'profiles', 'permissions', 'strategy', 'matrix'],
  toml: ['true', 'false', 'dependencies', 'project', 'name', 'version', 'requires-python', 'tool', 'dependency-groups'],
  dockerfile: ['FROM', 'RUN', 'COPY', 'WORKDIR', 'ENV', 'EXPOSE', 'CMD', 'ENTRYPOINT', 'ARG', 'USER', 'AS', 'HEALTHCHECK'],
  bash: ['uv', 'python', 'pip', 'docker', 'git', 'ollama', 'make', 'pytest', 'ruff', 'mypy', 'uvicorn', 'curl', 'jq', 'export', 'if', 'then', 'fi', 'for', 'do', 'done', 'echo', 'cat', 'grep', 'psql', 'gh'],
  sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'INNER', 'LATERAL', 'ON', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'WITH', 'AS', 'RETURNING', 'CONFLICT', 'PRIMARY', 'KEY', 'REFERENCES', 'NOT', 'NULL', 'UNIQUE', 'BETWEEN', 'OVER', 'PARTITION', 'EXPLAIN', 'ANALYZE'],
  text: [],
};

const LABEL: Record<string, string> = {
  python: 'python', json: 'json', http: 'http', yaml: 'yaml', toml: 'toml',
  dockerfile: 'dockerfile', bash: 'shell', sql: 'sql', text: 'texto', ts: 'typescript', java: 'java',
  ini: 'ini', diff: 'diff', markdown: 'markdown',
};

function highlight(code: string, lang: string) {
  const kws = new Set(KEYWORDS[lang] ?? []);
  const tokenRe = /(\/\/.*$|#.*$|--.*$|`[^`]*`|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[A-Za-zÀ-ÿ_$][A-Za-zÀ-ÿ0-9_:$.\-/]*)/gm;
  const out: { t: string; c: string }[] = [];
  let last = 0;
  for (const m of code.matchAll(tokenRe)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ t: code.slice(last, idx), c: '' });
    const tok = m[0];
    let cls = '';
    const isComment =
      tok.startsWith('//') ||
      ((lang === 'python' || lang === 'bash' || lang === 'yaml' || lang === 'toml' || lang === 'dockerfile') && tok.startsWith('#')) ||
      (lang === 'sql' && tok.startsWith('--'));
    if (isComment) cls = 'text-emerald-600 dark:text-emerald-400 italic';
    else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) cls = 'text-amber-600 dark:text-amber-300';
    else if (/^\d/.test(tok)) cls = 'text-sky-600 dark:text-sky-300';
    else if (kws.has(tok) || kws.has(tok.toUpperCase())) cls = 'text-violet-600 dark:text-violet-300 font-semibold';
    else if (lang === 'python' && /^[a-z_]+\.[a-z_]/.test(tok)) cls = 'text-brand-700 dark:text-brand-300';
    else if (lang === 'python' && tok.startsWith('@')) cls = 'text-accent-600 dark:text-accent-300';
    else if (lang === 'json' && tok.endsWith(':')) cls = 'text-brand-700 dark:text-brand-300';
    out.push({ t: tok, c: cls });
    last = idx + tok.length;
  }
  if (last < code.length) out.push({ t: code.slice(last), c: '' });
  return out;
}

export function CodeBlock({ code, lang = 'text', caption, dense = false }: {
  code: string; lang?: string; caption?: string; dense?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const tokens = highlight(code, lang);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard indisponivel */ }
  };

  return (
    <figure className={`overflow-hidden rounded-2xl border border-soft surface-sunken ${dense ? 'my-2' : 'my-5'}`}>
      <div className="flex items-center justify-between border-b border-soft px-4 py-2">
        <span className="font-mono text-[0.7rem] font-semibold tracking-widest text-muted uppercase">
          {caption ?? LABEL[lang] ?? lang}
        </span>
        <button onClick={copy} className="btn btn-ghost btn-sm" aria-label="Copiar código">
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 text-[0.83rem] leading-relaxed">
        <code className="font-mono">
          {tokens.map((t, i) => (t.c ? <span key={i} className={t.c}>{t.t}</span> : <span key={i}>{t.t}</span>))}
        </code>
      </pre>
    </figure>
  );
}
