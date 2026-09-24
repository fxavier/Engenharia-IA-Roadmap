import type { Module } from '../types';
import { seccoesGitB, quizM26, exerciciosM26, labsM26, casosM26 } from './m26-git-fluxo.parte-a';

export const m26: Module = {
  id: 'git-fluxo',
  number: 26,
  part: 'producao',
  title: 'Git para equipas de IA',
  subtitle: 'Quando um prompt, um conjunto dourado e o código mudam juntos, o commit é a unidade de verdade',
  icon: '🌿',
  minutes: 85,
  tags: ['git', 'trunk-based', 'conventional commits', 'semver', 'bisect'],
  goals: [
    'Raciocinar sobre Git como um grafo de commits imutáveis e ponteiros móveis, e escolher entre merge, rebase e squash pelo histórico que deixam.',
    'Trabalhar em trunk-based com PRs pequenos e de vida curta, em que prompt, conjunto dourado e código mudam no mesmo commit.',
    'Escrever Conventional Commits e derivar deles a versão SemVer de um prompt, sabendo o que é uma quebra de contrato num prompt.',
    'Decidir onde vivem notebooks, ficheiros grandes e dados anotados (Git, LFS, DVC ou armazenamento externo) e manter segredos fora do histórico com pre-commit.',
    'Encontrar o commit que partiu uma métrica de qualidade com `git bisect run` e um script de avaliação determinista.',
  ],
  sections: [
    /* ============================================================ 1 */
    {
      id: 'modelo',
      title: 'O modelo de commits: um grafo imutável e ponteiros que se movem',
      blocks: [
        {
          type: 'p',
          text:
            'Numa equipa de engenharia de IA, o Git guarda mais do que código. No repositório do «Balcão» estão o prompt de sistema (`prompts/sistema.md`), o prompt de classificação, as 48 perguntas douradas e os 20 ataques de red team do laboratório (`dados/*.jsonl`), o esquema SQL, os workflows de CI e o `uv.lock`. Uma resposta errada em produção tem de ser atribuível a uma combinação exacta de todos estes ficheiros — e é o SHA de um commit que dá essa combinação. Antes de discutir fluxos de trabalho, vale a pena ter o modelo mental certo do que um commit é.',
        },
        {
          type: 'p',
          text:
            'Um commit é um objecto imutável identificado pelo hash do seu conteúdo: aponta para uma árvore (o estado completo dos ficheiros, não um diff), para os commits pais, e tem autor, data e mensagem. Mudar qualquer coisa — um byte do prompt, a mensagem, um pai — dá outro hash. Um branch é só um ficheiro com um SHA lá dentro, que avança quando fazes commit; `HEAD` aponta para o branch em que estás. Um rebase não «move» commits: cria commits novos, com pais novos e hashes novos, e move o ponteiro. Com isto na cabeça, quase todas as operações perigosas do Git ficam previsíveis.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'O mesmo trabalho, três formas de o integrar na main',
            caption:
              'Merge preserva a forma real do trabalho (e o commit de merge); rebase reescreve os commits do branch sobre a main; squash junta tudo num commit só. No «Balcão», os PRs entram por squash: um PR, um commit, uma entrada no changelog.',
            cols: 6,
            rows: 3,
            zones: [
              { id: 'zm', label: 'main', col: 0, row: 0, colSpan: 6, rowSpan: 1, tone: 'service' },
              { id: 'zb', label: 'feat/cupao-antes-reembolso', col: 2, row: 1, colSpan: 3, rowSpan: 1, tone: 'async' },
              { id: 'zs', label: 'Depois do squash merge', col: 0, row: 2, colSpan: 6, rowSpan: 1, tone: 'neutral' },
            ],
            nodes: [
              { id: 'a', label: 'a1f3', sub: 'fix: limiar de recusa', col: 0, row: 0, kind: 'data' },
              { id: 'b', label: 'b7c2', sub: 'test: +4 douradas', col: 1, row: 0, kind: 'data' },
              { id: 'c', label: 'c90e', sub: 'feat: rate limit', col: 3, row: 0, kind: 'data' },
              { id: 'x', label: 'x1', sub: 'prompt 1.5.0 (rascunho)', col: 2, row: 1, kind: 'note' },
              { id: 'y', label: 'x2', sub: '+ 3 casos douradas', col: 3, row: 1, kind: 'note' },
              { id: 'z', label: 'x3', sub: 'corrige revisão', col: 4, row: 1, kind: 'note' },
              { id: 'm', label: 'd44a', sub: 'feat(prompt-sistema): cupão antes de reembolso (#212)', col: 5, row: 0, kind: 'service' },
              { id: 's1', label: 'b7c2', col: 1, row: 2, kind: 'data' },
              { id: 's2', label: 'c90e', col: 3, row: 2, kind: 'data' },
              { id: 's3', label: 'd44a', sub: 'um commit com x1+x2+x3', col: 5, row: 2, kind: 'service' },
            ],
            edges: [
              { from: 'a', to: 'b' },
              { from: 'b', to: 'c' },
              { from: 'b', to: 'x', style: 'dashed', label: 'git switch -c' },
              { from: 'x', to: 'y' },
              { from: 'y', to: 'z' },
              { from: 'c', to: 'm' },
              { from: 'z', to: 'm', label: 'squash' },
              { from: 's1', to: 's2' },
              { from: 's2', to: 's3' },
            ],
          },
        },
        { type: 'widget', id: 'git-grafo' },
        {
          type: 'table',
          head: ['Integração', 'Histórico da main', 'Vantagem', 'Custo'],
          rows: [
            ['Merge commit', 'Grafo com bifurcações e commits de merge', 'Preserva o que aconteceu; nada reescrito', 'Bisect e leitura do log mais difíceis; commits «wip» na main'],
            ['Rebase + fast-forward', 'Linear, com os commits do branch', 'Cada commit pequeno fica visível', 'Cada commit tem de passar os testes sozinho, senão o bisect tropeça'],
            ['Squash merge', 'Linear, um commit por PR', 'Um PR = um commit = uma linha de changelog; revert trivial', 'Perde-se o detalhe dos commits intermédios (fica no PR)'],
          ],
          caption: 'Para um repositório onde cada commit da main tem de ter evals verdes, o squash é o que dá a propriedade mais útil: todos os commits da main passaram o gate.',
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'Ver o modelo por dentro. Um commit aponta para uma árvore completa; o prompt em vigor num commit antigo lê-se sem checkout.',
          code: `git cat-file -p HEAD                       # tree, parent, author, mensagem
git log --oneline --graph --decorate -12    # o grafo, com os ponteiros (branches, tags)

# que versão do prompt estava em produção no commit que o traço regista?
git show 3f9c2e1:prompts/sistema.md | head -8

# que commits mudaram o prompt, com o diff de cada um
git log -p --follow -- prompts/sistema.md

# quem escreveu esta regra do prompt, e em que PR
git blame -L '/Oferece cupão/,+2' prompts/sistema.md`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: rebase de um branch que outra pessoa já puxou',
          text:
            'Rebasear um branch cria commits novos. Se um colega já tinha os antigos e continuou a trabalhar em cima deles, o próximo `git pull` dele junta as duas versões e aparecem os mesmos commits em duplicado, com conflitos que ninguém percebe. Pior ainda é o `git push --force` para resolver: apaga do remoto o que o colega entretanto empurrou. A regra: rebase só em branches teus e ainda não partilhados; quando tens de reescrever um branch remoto, `git push --force-with-lease`, que recusa se o remoto tiver avançado desde o teu último fetch.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Pro Git — Git Internals: Git Objects', url: 'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects' },
            { label: 'Pro Git — Rebasing (os perigos do rebase)', url: 'https://git-scm.com/book/en/v2/Git-Branching-Rebasing' },
            { label: 'git-push — --force-with-lease', url: 'https://git-scm.com/docs/git-push' },
          ],
        },
      ],
    },

    /* ============================================================ 2 */
    {
      id: 'trunk',
      title: 'Trunk-based e PRs pequenos: prompt, evals e código no mesmo commit',
      blocks: [
        {
          type: 'p',
          text:
            'O adr-0023 escolheu trunk-based development: toda a gente integra na `main` pelo menos uma vez por dia ou dois, através de branches de vida curta e PRs pequenos. A razão é específica de sistemas LLM. Num branch que vive três semanas, o prompt muda, e entretanto o conjunto dourado na main ganha 12 perguntas novas e o re-ranker muda de limiar. Quando o branch volta, as evals que passaram no branch já não dizem nada sobre a main. Um branch longo não só acumula conflitos de texto: acumula divergência de avaliação.',
        },
        { type: 'adr', ref: 'adr-0023' },
        {
          type: 'flow',
          flow: {
            id: 'fl-git-fluxo-01',
            title: 'A vida de um PR que muda o prompt de sistema',
            intro: 'Um pedido do suporte: «ofereçam primeiro um cupão, e só depois o reembolso, nos atrasos». Do branch ao deploy, em menos de um dia.',
            lanes: [
              { id: 'dev', label: 'Engenheira', sub: 'portátil', kind: 'human' },
              { id: 'hook', label: 'pre-commit', sub: 'hooks locais', kind: 'infra' },
              { id: 'gh', label: 'GitHub', sub: 'PR + regras da main', kind: 'service' },
              { id: 'ci', label: 'CI', sub: 'lint, testes, evals', kind: 'infra' },
              { id: 'rev', label: 'Revisão', sub: 'suporte + engenharia', kind: 'human' },
              { id: 'main', label: 'main', sub: 'imagem por SHA', kind: 'store' },
            ],
            steps: [
              { from: 'dev', to: 'dev', label: 'git switch -c feat/cupao-antes-reembolso', kind: 'self', code: 'git switch main && git pull --ff-only\ngit switch -c feat/cupao-antes-reembolso', lang: 'bash' },
              { from: 'dev', to: 'dev', label: 'edita prompt 1.4.0 → 1.5.0 e acrescenta 3 perguntas douradas', detail: 'No mesmo commit: o comportamento novo e a prova de que funciona.', kind: 'self' },
              { from: 'dev', to: 'hook', label: 'git commit', kind: 'req' },
              { from: 'hook', to: 'dev', label: 'ruff, check-yaml, detect-private-key: ok', kind: 'res', ms: 3000 },
              { from: 'dev', to: 'gh', label: 'git push -u; abre PR «feat(prompt-sistema): …»', kind: 'req' },
              { from: 'gh', to: 'ci', label: 'workflow CI em pull_request', kind: 'async' },
              { from: 'ci', to: 'gh', label: 'lint ✓ testes ✓ evals: gate passa, relatório no resumo', detail: 'O relatório por intenção fica no resumo do job: é ele que os revisores lêem.', kind: 'res', ms: 420000 },
              { from: 'gh', to: 'rev', label: 'pede revisão (CODEOWNERS de prompts/)', kind: 'req' },
              { from: 'rev', to: 'gh', label: 'suporte aprova o tom; engenharia aprova as evals', kind: 'res' },
              { from: 'gh', to: 'main', label: 'squash merge: um commit na main', kind: 'req' },
              { from: 'main', to: 'ci', label: 'push na main: build da imagem sha-…', detail: 'A partir daqui, o módulo 28: imagem imutável, canário, promoção.', kind: 'async' },
            ],
            outro: 'O suporte não precisa de saber Git para rever: lê o diff do prompt e o relatório de avaliação no PR. O que não pode acontecer é o prompt mudar sem as perguntas douradas mudarem com ele.',
          },
        },
        {
          type: 'table',
          head: ['', 'Git flow (develop, release/*, hotfix/*)', 'Trunk-based (a escolha)'],
          rows: [
            ['Vida de um branch', 'Dias a semanas', 'Horas a dois dias'],
            ['Onde correm as evals', 'No branch de release, tarde', 'Em cada PR, contra a main de hoje'],
            ['Tamanho típico de um PR', 'Centenas de linhas', 'Um comportamento, com os seus casos dourados'],
            ['Trabalho incompleto', 'Fica no branch', 'Entra desligado: prompt candidato atrás de uma flag'],
            ['Release', 'Merge de release/* para main', 'Qualquer commit verde da main é deployável'],
            ['Hotfix de prompt', 'Branch hotfix/* e dois merges', 'Um PR pequeno, pelo mesmo gate'],
          ],
          caption: 'O git flow resolve releases agendados de software instalado. Um serviço com deploy contínuo e evals por PR não tem esse problema.',
        },
        {
          type: 'p',
          text:
            'Trabalho grande em trunk-based entra aos bocados, desligado. Para prompts isto é natural: o prompt candidato vive em `prompts/sistema-candidato.md` com a sua própria versão, a configuração decide qual se carrega, e as evals nocturnas correm os dois. Quando o candidato ganha, um PR de uma linha troca a configuração e o antigo sai num PR seguinte. Nunca há um branch de três semanas com «o prompt novo».',
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'O ciclo diário de quem trabalha em trunk-based: branch curto, rebase sobre a main, push com lease, apagar no fim.',
          code: `git switch main && git pull --ff-only          # nunca um merge acidental na main local
git switch -c fix/recusa-cobranca-duplicada

# ... commits pequenos; antes de pedir revisão, apanhar a main de hoje
git fetch origin
git rebase origin/main                           # o branch é só teu: rebase é seguro
uv run pytest -q && make evals-gate              # o gate que o CI vai correr, antes de o CI o correr

git push --force-with-lease -u origin HEAD       # recusa se alguém mexeu no remoto entretanto
gh pr create --fill --draft                      # PR em rascunho enquanto as evals correm

# depois do squash merge
git switch main && git pull --ff-only && git branch -d fix/recusa-cobranca-duplicada`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Regras da main que tornam isto seguro',
          text:
            'Na main do «Balcão»: merge só por PR, verificações `lint`, `testes` e `evals` obrigatórias, branch actualizado com a main antes do merge, squash como único método, e `CODEOWNERS` que exige o suporte ao cliente em `prompts/` e a engenharia de IA em `dados/`. O painel da plataforma mostra PRs abertos há mais de 2 dias — é a métrica de validação do adr-0023. Quando o volume de PRs cresce, uma merge queue evita que dois PRs verdes em separado fiquem vermelhos juntos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Trunk Based Development — Short-lived feature branches', url: 'https://trunkbaseddevelopment.com/short-lived-feature-branches/' },
            { label: 'GitHub — About protected branches', url: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches' },
            { label: 'GitHub — About code owners', url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners' },
          ],
        },
      ],
    },

    /* ============================================================ 3 */
    {
      id: 'commits-semver',
      title: 'Conventional Commits e SemVer — também para prompts',
      blocks: [
        {
          type: 'p',
          text:
            'Conventional Commits é uma convenção para a primeira linha da mensagem: `tipo(âmbito)!: descrição`, com um corpo opcional e rodapés como `BREAKING CHANGE: ...`. Os tipos `feat` e `fix` têm significado definido pela especificação (funcionalidade nova e correcção); os outros (`docs`, `test`, `refactor`, `ci`, `chore`, `perf`) são convenção comum. O `!` depois do tipo ou do âmbito, ou um rodapé `BREAKING CHANGE`, marca uma quebra de compatibilidade. O valor não é estético: uma mensagem estruturada deixa uma máquina decidir a próxima versão e escrever o changelog.',
        },
        {
          type: 'code',
          lang: 'text',
          caption: 'Um commit do «Balcão» completo. O âmbito diz que artefacto mudou; o corpo diz porquê e com que evidência.',
          code: `feat(prompt-sistema): oferecer cupão antes de reembolso em atrasos

O suporte pediu que, em atrasos acima de 45 minutos, o assistente ofereça
primeiro o cupão de 200 MZN e só depois o reembolso da taxa de entrega, como
diz pol-atraso-compensacao. Antes, oferecia os dois em simultâneo e 70% dos
clientes escolhia o reembolso.

Evals (make evals-gate): recall_at_5 0,983; fidelidade 1,000; acerto de
ferramentas 1,000; 3 perguntas douradas novas (g46-g48), todas a passar.

Refs: SUP-418
Prompt: sistema 1.4.0 -> 1.5.0`,
        },
        {
          type: 'run',
          run: {
            id: 'run-git-fluxo-01',
            title: 'De mensagens de commit à próxima versão do prompt',
            brief:
              'Um parser de Conventional Commits com uma expressão regular, e a regra SemVer: a maior mudança manda. Um commit fora do formato não conta — e num repositório a sério nem entraria (há um hook para isso).',
            code: String.raw`import re

RE_CC = re.compile(r"^(?P<tipo>[a-z]+)(?:\((?P<ambito>[a-z0-9-]+)\))?(?P<quebra>!)?: (?P<descricao>.+)$")
PESO = {"major": 3, "minor": 2, "patch": 1, None: 0}

def classificar(mensagem: str):
    cabecalho, _, corpo = mensagem.partition("\n")
    m = RE_CC.match(cabecalho)
    if not m:
        return None, "invalido"
    if m["quebra"] or "BREAKING CHANGE:" in corpo:
        return "major", m["tipo"]
    if m["tipo"] == "feat":
        return "minor", m["tipo"]
    if m["tipo"] in ("fix", "perf"):
        return "patch", m["tipo"]
    return None, m["tipo"]            # docs, test, chore, ci, refactor: não mudam a versão

def proxima(versao: str, commits: list[str]) -> str:
    salto = max((classificar(c)[0] for c in commits), key=lambda s: PESO[s])
    ma, mi, pa = map(int, versao.split("."))
    if salto == "major":
        return f"{ma + 1}.0.0"
    if salto == "minor":
        return f"{ma}.{mi + 1}.0"
    if salto == "patch":
        return f"{ma}.{mi}.{pa + 1}"
    return versao

commits = [
    "fix(prompt-sistema): recusar valores de reembolso sem ferramenta",
    "test(dourado): +4 perguntas de cobrança duplicada",
    "feat(prompt-sistema): oferecer cupão antes de reembolso em atrasos",
    "Actualizei o prompt",
    "feat(prompt-sistema)!: citações passam a [id#secção]\n\nBREAKING CHANGE: o validador de citações antigo rejeita-as",
]
for c in commits:
    salto, tipo = classificar(c)
    print(f"{str(salto):<6} {tipo:<9} <- {c.splitlines()[0][:60]}")
print("sistema 1.4.0 ->", proxima("1.4.0", commits[:3]), "(três primeiros commits)")
print("sistema 1.4.0 ->", proxima("1.4.0", commits), "(todos, o inválido ignorado)")`,
            expected: `patch  fix       <- fix(prompt-sistema): recusar valores de reembolso sem ferram
None   test      <- test(dourado): +4 perguntas de cobrança duplicada
minor  feat      <- feat(prompt-sistema): oferecer cupão antes de reembolso em a
None   invalido  <- Actualizei o prompt
major  feat      <- feat(prompt-sistema)!: citações passam a [id#secção]
sistema 1.4.0 -> 1.5.0 (três primeiros commits)
sistema 1.4.0 -> 2.0.0 (todos, o inválido ignorado)`,
          },
        },
        {
          type: 'p',
          text:
            'SemVer define `MAJOR.MINOR.PATCH` para uma API pública: MAJOR para mudanças incompatíveis, MINOR para funcionalidade compatível, PATCH para correcções compatíveis. Para aplicar isto a um prompt, tens de dizer qual é a «API pública» de um prompt. No «Balcão» é o contrato que o código à volta assume: o formato das citações que a guarda de saída valida, as ferramentas que o prompt manda usar, o tom e as recusas que o conjunto dourado verifica. A versão do prompt vai em cada traço como `sistema@1.4.0` (RNF-06), e o relatório de avaliação regista-a.',
        },
        {
          type: 'table',
          head: ['Mudança no prompt', 'Versão', 'Porquê'],
          rows: [
            ['Corrigir um erro de concordância; reformular sem mudar regras', 'PATCH', 'Nenhuma pergunta dourada deve mudar de resultado'],
            ['Regra nova («oferecer cupão antes de reembolso»)', 'MINOR', 'Comportamento novo, compatível com o código e com as guardas'],
            ['Novo formato de citação `[id#secção]`', 'MAJOR', 'A guarda de saída antiga rejeita-o: código e prompt têm de mudar juntos'],
            ['Deixar de usar uma ferramenta que o grafo espera', 'MAJOR', 'Muda o contrato com o grafo e com as evals de trajectória'],
            ['Trocar o modelo de escalão médio', 'Não é versão do prompt', 'É outra dimensão do traço (`gen_ai.request.model`); tem gate próprio (RI-07)'],
          ],
          caption: 'Uma PATCH que muda resultados no conjunto dourado não é uma PATCH: é o sinal de que a mudança era maior do que parecia.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Com squash merge, só o título do PR tem de ser convencional',
          text:
            'Os commits intermédios de um branch («wip», «corrige revisão») desaparecem no squash; o que fica na main é o título do PR. Configura o repositório para usar o título do PR como mensagem do commit de squash e valida o título no CI — é uma verificação de uma linha, muito menos atrito do que exigir o formato em cada commit local.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A versão do prompt não é a versão do serviço',
          text:
            'O serviço tem a sua versão (a imagem por SHA, e uma tag SemVer para humanos); cada prompt tem a sua, no cabeçalho do ficheiro; o conjunto dourado tem a sua (o hash do ficheiro, no relatório). São três eixos e o traço regista os três. Colapsá-los numa só versão esconde exactamente a pergunta que um incidente faz: mudou o código, o prompt, ou os dados contra os quais foi avaliado?',
        },
        {
          type: 'refs',
          items: [
            { label: 'Conventional Commits 1.0.0', url: 'https://www.conventionalcommits.org/en/v1.0.0/' },
            { label: 'Semantic Versioning 2.0.0', url: 'https://semver.org/' },
          ],
        },
      ],
    },
    ...seccoesGitB,
  ],
  quiz: quizM26,
  exercises: exerciciosM26,
  labs: labsM26,
  useCases: casosM26,
};
