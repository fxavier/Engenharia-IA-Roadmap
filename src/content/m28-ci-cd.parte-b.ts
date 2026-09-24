import type { Exercise, Lab, Question, UseCase } from '../types';

export const quizM28: Question[] = [
  {
    id: 'q-ci-cd-01',
    topic: 'cicd',
    prompt: 'Um PR troca a pesquisa híbrida por BM25. O recall global passa de 0,950 para 0,833 e o limiar absoluto é 0,80. O que deve acontecer?',
    options: [
      'Passa: a métrica está acima do limiar.',
      'Deve ser bloqueado se o gate comparar com a produção por intenção: três intenções caem para metade.',
      'Passa, e o canário apanha o resto.',
      'É bloqueado pelo mypy.',
    ],
    answer: [1],
    explain:
      'Um limiar absoluto global esconde intenções que pioram (RI-04). O gate que compara com a versão em produção, intenção a intenção, com um mínimo de casos, apanha a regressão. O canário, com 115 conversas, dificilmente veria uma queda destas na qualidade.',
  },
  {
    id: 'q-ci-cd-02',
    topic: 'cicd',
    prompt: 'Porque é que o CI de cada PR usa o modelo simulado e não o modelo real?',
    options: [
      'Porque o resultado é determinista: o mesmo commit dá sempre o mesmo veredicto.',
      'Porque não precisa de chave no CI nem gasta tokens em cada push.',
      'Porque o modelo simulado é mais preciso do que o real.',
      'Porque o GitHub Actions não permite pedidos HTTP para fora.',
    ],
    answer: [0, 1],
    explain:
      'Um gate que bloqueia merges tem de ser determinista e barato. O modelo simulado não é mais preciso — é cego ao que só o modelo real faz, e é por isso que existem as nocturnas.',
  },
  {
    id: 'q-ci-cd-03',
    topic: 'cicd',
    prompt: 'O deploy usa `ghcr.io/chega/balcao:latest`. Que problemas tem isto?',
    options: [
      'Não se sabe que commit está em produção sem consultar o registo no momento.',
      'Um rollback «para a versão anterior» não tem etiqueta para onde voltar.',
      'Duas réplicas podem correr imagens diferentes se o registo mudou entre os pulls.',
      'O GHCR não aceita a etiqueta `latest`.',
    ],
    answer: [0, 1, 2],
    explain:
      '`latest` é um ponteiro móvel. A etiqueta pelo SHA, e melhor ainda o digest, liga cada réplica, cada traço e cada relatório a um commit, e torna o rollback trivial.',
  },
  {
    id: 'q-ci-cd-04',
    topic: 'cicd',
    prompt: 'Com 115 conversas num canário de 24 h, uma queda da resolução de 0,68 para 0,63 é detectada em cerca de 29% dos canários. Qual a conclusão certa?',
    options: [
      'O canário é inútil e deve ser removido.',
      'A qualidade fina tem de ser verificada antes do deploy (evals), e o canário serve sobretudo para sinais operacionais fortes.',
      'Basta aumentar o canário para 12 horas.',
      'Basta baixar o nível de confiança para 50%.',
    ],
    answer: [1],
    explain:
      'Menos tempo reduz a amostra; um nível de confiança mais baixo troca falsos negativos por falsos alarmes. O canário é bom para TTFT, erros e custo; a qualidade é o trabalho do conjunto dourado.',
  },
  {
    id: 'q-ci-cd-05',
    topic: 'cicd',
    prompt: 'O que ganhas ao usar OIDC em vez de uma chave de acesso da nuvem guardada em `secrets`?',
    options: [
      'As credenciais são temporárias e emitidas por job; não há segredo longo para fugir ou rodar.',
      'A nuvem pode restringir quem assume o papel por repositório, branch ou ambiente.',
      'Deixa de ser preciso configurar permissões no workflow.',
      'O deploy fica mais rápido.',
    ],
    answer: [0, 1],
    explain:
      'O job precisa de `id-token: write`; a nuvem valida as claims do token (repositório, ref, ambiente). A segurança depende de essas condições serem estritas.',
  },
  {
    id: 'q-ci-cd-06',
    topic: 'cicd',
    prompt: 'Um workflow sem bloco `permissions` num repositório antigo usa uma acção de terceiros num passo. Qual é o risco?',
    options: [
      'Nenhum: o `GITHUB_TOKEN` é sempre só de leitura.',
      'A acção corre com o token por omissão do repositório, que pode ter permissões de escrita.',
      'O workflow não corre sem `permissions`.',
      'Só há risco em repositórios públicos.',
    ],
    answer: [1],
    explain:
      'As permissões por omissão dependem da configuração do repositório ou da organização. Declarar `permissions: contents: read` no topo e alargar por job é a prática que limita o dano de uma acção comprometida.',
  },
  {
    id: 'q-ci-cd-07',
    topic: 'cicd',
    prompt: 'O job de evals tem `continue-on-error: true` «até estabilizar». Que efeitos tem?',
    options: [
      'O gate deixa de bloquear merges.',
      'Os relatórios deixam de ser gerados.',
      'Os PRs com regressões entram, e o hábito de ignorar o job instala-se.',
      'O job corre mais depressa.',
    ],
    answer: [0, 2],
    explain:
      'O relatório continua a ser gerado, mas já ninguém é obrigado a lê-lo. Se o gate está instável, a correcção é no gate (tamanho do conjunto, intervalos de confiança, determinismo), num PR próprio.',
  },
  {
    id: 'q-ci-cd-08',
    topic: 'cicd',
    prompt: 'Os testes que usam o serviço `postgres` falham com «connection refused» num job que declara `container: python:3.13`. Porquê?',
    options: [
      'Dentro de um job em contentor, o serviço alcança-se pelo nome (`postgres`), não por `localhost`.',
      'O pgvector não corre em serviços do GitHub Actions.',
      'Falta `ports` no serviço.',
      'Os serviços só funcionam com `runs-on: windows`.',
    ],
    answer: [0],
    explain:
      'Com os passos no runner, o serviço está em `localhost` na porta mapeada; com o job num contentor, ambos estão numa rede de contentores e o hostname é o nome do serviço.',
  },
  {
    id: 'q-ci-cd-09',
    topic: 'cicd',
    prompt: 'A avaliação nocturna com o modelo real mostra a faithfulness a cair 4 pontos sem nenhum commit novo. O que é mais provável e o que fazes?',
    options: [
      'O fornecedor mudou o comportamento, ou a variação é ruído; confirmar com o intervalo de confiança e repetir antes de agir.',
      'O conjunto dourado corrompeu-se sozinho.',
      'Reverter o último commit da main imediatamente.',
      'Desligar as nocturnas até estabilizar.',
    ],
    answer: [0],
    explain:
      'Sem mudança no repositório, as fontes de variação são o modelo (RI-07) e a amostragem. Primeiro distinguir ruído de sinal; se for sinal, é um incidente com o fornecedor, com versão de modelo alternativa já testada (a troca é um PR à variável, com evals).',
  },
];

export const exerciciosM28: Exercise[] = [
  {
    id: 'e-ci-cd-01',
    title: 'Minutos de CI por mês',
    statement:
      'O «Balcão» recebe ≈ 60 PRs por mês com, em média, 3 pushes cada. Cada push corre lint (2 min), testes (6 min) e evals (3 min), em paralelo, em runners Linux. Quantos minutos de runner por mês gasta o CI dos PRs (sem a main nem as nocturnas)?',
    kind: 'input',
    accept: ['1980', '1 980', '1.980'],
    hint: 'Os minutos cobrados somam-se por job, mesmo que corram em paralelo.',
    solution:
      '60 × 3 = 180 corridas; cada uma soma 2 + 6 + 3 = 11 minutos de runner; 180 × 11 = 1 980 minutos. O tempo de parede de cada corrida é 6 min (o job mais lento), mas o que se paga é a soma. O `cancel-in-progress` em PRs reduz este número quando alguém faz pushes seguidos.',
    difficulty: 1,
  },
  {
    id: 'e-ci-cd-02',
    title: 'Critérios de promoção do canário',
    statement:
      'Escreve os critérios de promoção e de rollback automático de um canário do «Balcão» para uma mudança que troca o modelo médio por uma versão nova do mesmo fornecedor. Diz, para cada critério, a métrica, o limite e porque é que a decisão é automática ou precisa de humano.',
    kind: 'design',
    solution:
      'Antes do canário: evals no PR e nocturna com o modelo novo, divergência ≤ 3 pontos por intenção (RI-07). Rollback automático (sem humano, porque o sinal é forte e o custo de esperar é alto): taxa de eventos `erro` + 5xx > estável + 0,5 pontos durante 15 min; TTFT p95 > 1,5 s durante 15 min; custo por conversa > estável + 10% sobre as últimas 200 conversas; qualquer citação de chunk não vigente. Promoção com aprovação humana ao fim de 24 h (porque os sinais de qualidade são fracos e a decisão tem impacto no produto): escaladas não mais de 5 pontos acima, feedback negativo sem subida significativa, revisão de 30 conversas do canário pelo suporte. A troca de modelo é o caso em que a revisão humana mais vale, porque muda o comportamento em todas as intenções ao mesmo tempo.',
    difficulty: 3,
  },
  {
    id: 'e-ci-cd-03',
    title: 'Onde está a falha de segurança?',
    statement:
      'Revê este excerto: `on: pull_request_target` / `permissions: write-all` / passos: `actions/checkout@v5` com `ref: ${{ github.event.pull_request.head.sha }}`, `uv sync`, `uv run pytest`, e `env: ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`. Explica o ataque e a correcção.',
    kind: 'open',
    solution:
      '`pull_request_target` corre no contexto do repositório base, com segredos e com um token de escrita (`write-all`). O checkout do SHA do PR põe código de um fork a correr: um `conftest.py` ou uma dependência alterada no PR lê `ANTHROPIC_API_KEY` e envia-a para fora, ou usa o token para escrever no repositório. Correcção: `on: pull_request` (sem segredos para forks), `permissions: contents: read`, nenhum segredo no CI de PRs (modelo simulado, RE-03), e as avaliações com modelo real só nas nocturnas, que correm código da main.',
    difficulty: 2,
  },
  {
    id: 'e-ci-cd-04',
    title: 'O relatório de avaliação no PR',
    statement:
      'Os revisores do suporte não abrem artefactos. Propõe o que deve aparecer no resumo do job de evals (ou num comentário no PR) para que um revisor não técnico decida se aprova uma mudança de prompt, e como o geras.',
    kind: 'open',
    solution:
      'No topo, uma linha: gate passa/falha e porquê. Depois, uma tabela por intenção com produção vs candidata e a diferença, só com as intenções que mudaram, destacando as que pioraram. Depois, até 5 exemplos concretos de perguntas cujo resultado mudou (pergunta, resposta antiga, resposta nova, fonte citada), que é o que o suporte sabe avaliar. No fim, as versões (prompt, modelo, SHA, hash do conjunto dourado). Gera-se com o relatório JSON do `balcao.avaliacao.correr` e um script que escreve Markdown para `$GITHUB_STEP_SUMMARY`; comparar com a produção exige descarregar o relatório da última corrida da main como artefacto.',
    difficulty: 2,
  },
];

export const labsM28: Lab[] = [
  {
    id: 'lab-ci-cd-01',
    moduleId: 'ci-cd',
    title: 'Um workflow de CI com evals como gate',
    brief:
      'Completa o workflow: permissões só de leitura no topo, concorrência que cancela corridas antigas de PRs, uv com cache e `uv sync --frozen`, e um job de evals que corre o gate e publica o relatório mesmo quando falha.',
    lang: 'yaml',
    starter: `name: CI
on: [push]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: pip install -e .
      - run: python -m balcao.avaliacao.correr
        continue-on-error: true`,
    checks: [
      { id: 'pr', label: 'Corre em pull_request', re: 'pull_request' },
      { id: 'perm', label: 'permissions: contents: read no topo', re: '^permissions:\\s*\\n\\s+contents:\\s*read', flags: 'm' },
      { id: 'conc', label: 'concurrency com cancel-in-progress', re: 'concurrency:[\\s\\S]*cancel-in-progress' },
      { id: 'uv', label: 'setup-uv com cache', re: 'astral-sh/setup-uv@v6[\\s\\S]*enable-cache:\\s*true' },
      { id: 'frozen', label: 'uv sync --frozen', re: 'uv sync --frozen' },
      { id: 'gate', label: 'Avaliação com --gate', re: 'balcao\\.avaliacao\\.correr[^\\n]*--gate' },
      { id: 'always', label: 'Relatório publicado com if: always()', re: 'if:\\s*always\\(\\)[\\s\\S]*upload-artifact' },
      { id: 'coe', label: 'Sem continue-on-error', re: 'continue-on-error:\\s*true', forbid: true, why: 'Um gate que não falha o job não é gate.' },
      { id: 'pip', label: 'Sem pip install', re: 'pip install', forbid: true, why: 'O CI tem de instalar o mesmo `uv.lock` que a imagem.' },
    ],
    hints: [
      '`on:` com `pull_request:` e `push: { branches: [main] }`.',
      '`concurrency.group` com `github.workflow` e `github.ref`; `cancel-in-progress` só fora da main.',
      'O passo de upload usa `actions/upload-artifact@v4` com `if: always()`.',
    ],
    solution: `name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: \${{ github.ref != 'refs/heads/main' }}

env:
  BALCAO_MODELO_FORNECEDOR: simulado

jobs:
  evals:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --frozen
      - run: uv run python -m balcao.avaliacao.correr --conjunto todos --gate --saida relatorios
      - name: Relatório
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: relatorio-avaliacao
          path: relatorios/`,
    difficulty: 2,
  },
  {
    id: 'lab-ci-cd-02',
    moduleId: 'ci-cd',
    title: 'A imagem imutável, só na main',
    brief:
      'O job publica `latest` em qualquer push e com permissões largas. Corrige: depende dos jobs de qualidade, corre só em push para a main, pede só `contents: read` e `packages: write`, etiqueta pelo SHA com o `metadata-action` e usa a cache do GitHub Actions no build.',
    lang: 'yaml',
    starter: `  imagem:
    runs-on: ubuntu-24.04
    permissions: write-all
    steps:
      - uses: actions/checkout@v5
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/\${{ github.repository }}:latest`,
    checks: [
      { id: 'needs', label: 'Depende de lint, testes e evals', re: 'needs:\\s*\\[\\s*lint\\s*,\\s*testes\\s*,\\s*evals\\s*\\]' },
      { id: 'if', label: 'Só em push para a main', re: "if:[^\\n]*github\\.ref\\s*==\\s*'refs/heads/main'" },
      { id: 'pkg', label: 'packages: write', re: 'packages:\\s*write' },
      { id: 'meta', label: 'Etiqueta pelo SHA com metadata-action', re: 'docker/metadata-action@v5[\\s\\S]*type=sha' },
      { id: 'cache', label: 'Cache type=gha', re: 'cache-from:\\s*type=gha' },
      { id: 'latest', label: 'Sem latest', re: ':latest', forbid: true, why: 'Uma etiqueta móvel não identifica o que está em produção.' },
      { id: 'writeall', label: 'Sem write-all', re: 'write-all', forbid: true },
    ],
    hints: [
      '`if: github.event_name == \'push\' && github.ref == \'refs/heads/main\'`.',
      'O `metadata-action` precisa de um `id` para usares `steps.meta.outputs.tags`.',
      'Acrescenta `docker/setup-buildx-action@v3` antes do build: a cache `gha` precisa do Buildx.',
    ],
    solution: `  imagem:
    needs: [lint, testes, evals]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v5
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository }}
          tags: |
            type=sha,format=long
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true`,
    difficulty: 2,
  },
  {
    id: 'lab-ci-cd-03',
    moduleId: 'ci-cd',
    title: 'Um gate por intenção contra a produção',
    brief:
      'Escreve `gate(producao, candidata, n, max_queda, min_n)` que recebe dicionários intenção → métrica e intenção → número de casos, e devolve a lista de intenções que bloqueiam: as que têm pelo menos `min_n` casos e caem mais do que `max_queda`. Uma intenção nova na candidata não bloqueia; uma que desapareceu bloqueia. Os `assert` têm de passar; a solução corre no browser.',
    lang: 'python',
    starter: String.raw`def gate(producao: dict, candidata: dict, n: dict, max_queda: float = 0.10, min_n: int = 5) -> list:
    media_p = sum(producao.values()) / len(producao)
    media_c = sum(candidata.values()) / len(candidata)
    return ["global"] if media_c < media_p - max_queda else []


prod = {"reembolso": 0.95, "entrega": 0.92, "pagamentos": 0.90, "farmacia": 1.00}
cand = {"reembolso": 0.97, "entrega": 0.78, "pagamentos": 0.91, "farmacia": 0.50, "fidelidade": 0.80}
n = {"reembolso": 24, "entrega": 18, "pagamentos": 20, "farmacia": 3, "fidelidade": 10}
assert gate(prod, cand, n) == ["entrega"], gate(prod, cand, n)
assert gate(prod, {k: v for k, v in cand.items() if k != "pagamentos"}, n) == ["entrega", "pagamentos"]
assert gate(prod, prod, n) == []
print("ok")`,
    checks: [
      { id: 'loop', label: 'Percorre as intenções da produção', re: 'for\\s+\\w+\\s*(,\\s*\\w+\\s*)?in\\s+(sorted\\()?producao' },
      { id: 'minn', label: 'Respeita o mínimo de casos', re: 'min_n' },
      { id: 'falta', label: 'Trata intenções que desapareceram', re: 'not in candidata|candidata\\.get\\(' },
      { id: 'media', label: 'Não decide pela média global', re: 'sum\\(producao\\.values\\(\\)\\)', forbid: true, why: 'A média esconde a intenção que caiu (RI-04).' },
    ],
    hints: [
      'Percorre `sorted(producao)` para a lista sair ordenada.',
      'Se a intenção não está na candidata, bloqueia; se `n[i] < min_n`, ignora; senão compara a queda.',
      'Intenções que só existem na candidata não entram no ciclo — é o comportamento pedido.',
    ],
    solution: String.raw`def gate(producao: dict, candidata: dict, n: dict, max_queda: float = 0.10, min_n: int = 5) -> list:
    bloqueios = []
    for intencao in sorted(producao):
        if intencao not in candidata:
            bloqueios.append(intencao)          # deixou de ser avaliada: não se aceita às cegas
            continue
        if n.get(intencao, 0) < min_n:
            continue                            # poucos casos: reporta-se, não se bloqueia
        if producao[intencao] - candidata[intencao] > max_queda:
            bloqueios.append(intencao)
    return bloqueios


prod = {"reembolso": 0.95, "entrega": 0.92, "pagamentos": 0.90, "farmacia": 1.00}
cand = {"reembolso": 0.97, "entrega": 0.78, "pagamentos": 0.91, "farmacia": 0.50, "fidelidade": 0.80}
n = {"reembolso": 24, "entrega": 18, "pagamentos": 20, "farmacia": 3, "fidelidade": 10}
assert gate(prod, cand, n) == ["entrega"], gate(prod, cand, n)
assert gate(prod, {k: v for k, v in cand.items() if k != "pagamentos"}, n) == ["entrega", "pagamentos"]
assert gate(prod, prod, n) == []
print("ok")`,
    difficulty: 2,
    executavel: true,
  },
];

export const casosM28: UseCase[] = [
  {
    id: 'uc-ci-cd-01',
    title: 'Uma seguradora que trocou de modelo sem trocar de comportamento',
    area: 'Seguros · Portugal',
    level: 3,
    scenario:
      'Uma seguradora em Lisboa tem um assistente que ajuda clientes a participar sinistros automóveis e a acompanhar o estado do processo, com RAG sobre as condições gerais das apólices e ferramentas para abrir e consultar processos. O fornecedor anunciou o fim de vida da versão de modelo em uso dentro de 90 dias. Da última vez que trocaram de modelo, as respostas sobre franquias ficaram subtilmente erradas durante duas semanas antes de alguém reparar.',
    requirements: [
      'Trocar de versão de modelo sem regressões nas intenções de maior risco (franquias, coberturas, prazos).',
      'Prova de avaliação ligada a cada deploy, para auditoria interna.',
      'Nenhuma credencial de nuvem de longa duração no CI.',
    ],
    constraints: [
      'Regulação do sector segurador: explicações sobre coberturas têm de ser rastreáveis à apólice.',
      'Uma equipa de plataforma partilhada com outros produtos.',
    ],
    approach: [
      { title: 'Nome do modelo como variável versionada', text: 'O identificador com data do modelo passou para a configuração do repositório; a troca é um PR de uma linha, que dispara as evals com o modelo real num workflow manual antes de poder ser aprovado.' },
      { title: 'Gate por intenção contra a produção', text: 'O relatório compara candidata e produção por intenção, com intervalos de confiança; franquias e coberturas têm limites de queda mais estritos do que saudações e FAQ.' },
      { title: 'Canário com critérios escritos', text: '10% dos clientes durante 48 h (o volume é menor do que o do «Balcão»), rollback automático por erros, latência e custo, e revisão humana de 40 conversas antes da promoção.' },
      { title: 'OIDC e ambientes', text: 'Deploy por OIDC com papel restrito ao ambiente de produção; o ambiente exige aprovação de um responsável de produto e de um de compliance.' },
    ],
    diagram: {
      title: 'A troca de modelo como um deploy',
      caption: 'O modelo novo percorre o mesmo caminho que uma mudança de código, com um passo extra de avaliação com o modelo real.',
      cols: 5,
      rows: 2,
      zones: [
        { id: 'ci', label: 'CI', col: 0, row: 0, colSpan: 3, rowSpan: 2, tone: 'ci' },
        { id: 'cd', label: 'Entrega', col: 3, row: 0, colSpan: 2, rowSpan: 2, tone: 'service' },
      ],
      nodes: [
        { id: 'pr', label: 'PR: modelo = versão nova', col: 0, row: 0, kind: 'note' },
        { id: 'sim', label: 'Evals simuladas', sub: 'fluxo e ferramentas', col: 1, row: 0, kind: 'service' },
        { id: 'real', label: 'Evals com modelo real', sub: 'por intenção, vs produção', col: 1, row: 1, kind: 'model' },
        { id: 'img', label: 'Imagem por SHA', col: 2, row: 0, kind: 'data' },
        { id: 'can', label: 'Canário 10% · 48 h', col: 3, row: 0, kind: 'decision' },
        { id: 'prom', label: 'Promoção', sub: 'aprovação produto + compliance', col: 4, row: 0, kind: 'user' },
        { id: 'rb', label: 'Rollback', sub: 'pesos a 0%', col: 3, row: 1, kind: 'decision' },
      ],
      edges: [
        { from: 'pr', to: 'sim' },
        { from: 'pr', to: 'real', label: 'workflow_dispatch' },
        { from: 'sim', to: 'img' },
        { from: 'real', to: 'img', style: 'dashed', label: 'relatório anexo' },
        { from: 'img', to: 'can' },
        { from: 'can', to: 'prom' },
        { from: 'can', to: 'rb', style: 'dashed', label: 'se divergir' },
      ],
    },
    solution:
      'A troca de modelo passou a ser um PR com evals do modelo real por intenção, uma imagem imutável, um canário com critérios escritos e uma promoção aprovada. A regressão em franquias foi apanhada no relatório do PR (queda de 6 pontos) e corrigida com dois exemplos no prompt antes do canário.',
    tools: [
      { name: 'GitHub Actions', role: 'CI, evals com modelo real por disparo manual, deploy' },
      { name: 'Ambientes do GitHub', role: 'Aprovações e restrição de branch para produção' },
      { name: 'OIDC', role: 'Credenciais temporárias para a nuvem' },
    ],
    rejected: [
      { option: 'Trocar o modelo por variável de ambiente em produção', why: 'Sem PR, sem evals e sem traço do momento da troca: foi exactamente o que causou o incidente anterior.' },
      { option: 'Canário sem evals prévias', why: 'Com o volume da seguradora, o canário não tem potência estatística para ver uma queda de 6 pontos numa intenção.' },
    ],
    costNote:
      'Cada corrida de evals com o modelo real custou o equivalente a algumas horas de tráfego de produção; foram precisas quatro até à versão final do prompt.',
    takeaways: [
      'Trocar de modelo é um deploy, não uma configuração.',
      'O gate compara com a produção por intenção; a média engana.',
      'O canário apanha o operacional; a qualidade fina decide-se antes.',
    ],
    refs: [
      { label: 'GitHub — Deployments and environments', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments' },
      { label: 'Google SRE — Canarying releases', url: 'https://sre.google/workbook/canarying-releases/' },
    ],
  },
];
