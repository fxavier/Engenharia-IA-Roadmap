/* Estatísticas do tutorial. Uso: npm run pretest && node scripts/estatisticas.mjs
   Calcula tudo a partir de `content/todos.mjs` — não depende de `content/index.mjs`
   (esse ficheiro não entra no bundle do `pretest`, só a app o usa em runtime). */
import { MODULOS, TODOS_LABS, TODOS_USE_CASES, TODAS_PERGUNTAS } from '../.tmp/content/todos.mjs';

const PARTES = ['fundamentos', 'loop', 'grafo', 'agentic', 'sentinela', 'producao'];

const secoes = MODULOS.flatMap((m) => m.sections);
const blocos = secoes.flatMap((s) => s.blocks);
const conta = (t) => blocos.filter((x) => x.type === t).length;
const minutos = MODULOS.reduce((a, m) => a + m.minutes, 0);
const exercicios = MODULOS.reduce((a, m) => a + m.exercises.length, 0);

console.log('módulos      ', MODULOS.length);
console.log('secções      ', secoes.length);
console.log('blocos       ', blocos.length);
console.log('perguntas    ', TODAS_PERGUNTAS.length, '· resposta múltipla', TODAS_PERGUNTAS.filter((q) => q.answer.length > 1).length);
console.log('exercícios   ', exercicios);
console.log('laboratórios ', TODOS_LABS.length, '· verificações', TODOS_LABS.reduce((a, l) => a + l.checks.length, 0));
console.log('casos de uso ', TODOS_USE_CASES.length);
console.log('fluxos       ', conta('flow'), '· passos', blocos.filter((x) => x.type === 'flow').reduce((a, x) => a + x.flow.steps.length, 0));
console.log('diagramas    ', conta('diagram') + TODOS_USE_CASES.filter((u) => u.diagram).length);
console.log('código       ', conta('code'), '· blocos run', conta('run'));
console.log('tabelas      ', conta('table'), '· árvores', conta('decision'), '· widgets', conta('widget'));
console.log('prompts      ', conta('prompt'), '· loops', conta('loop'), '· graphs', conta('graph'));
console.log('traces       ', conta('trace'), '· evals', conta('eval'), '· fórmulas', conta('formula'));
console.log('ferramentas  ', conta('tool'), '· adrs', conta('adr'), '· endpoints', conta('endpoint'), '· ficheiros', conta('file'));
console.log('callouts     ', conta('callout'), '· trap', blocos.filter((b) => b.type === 'callout' && b.tone === 'trap').length,
  '· prod', blocos.filter((b) => b.type === 'callout' && b.tone === 'prod').length);
console.log('referências  ', blocos.filter((x) => x.type === 'refs').reduce((a, x) => a + x.items.length, 0));
console.log('horas        ', (minutos / 60).toFixed(1));
console.log('---');
for (const p of PARTES) {
  const ms = MODULOS.filter((m) => m.part === p);
  console.log(p.padEnd(12), ms.length, 'módulos ·', ms.reduce((a, m) => a + m.minutes, 0), 'min');
}
