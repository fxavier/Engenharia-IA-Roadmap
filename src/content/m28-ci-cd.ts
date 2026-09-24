import type { Module } from '../types';
import { seccoesCiB } from './m28-ci-cd.parte-a';
import { quizM28, exerciciosM28, labsM28, casosM28 } from './m28-ci-cd.parte-b';

export const m28: Module = {
  id: 'ci-cd',
  number: 28,
  part: 'producao',
  title: 'CI/CD com evals como gate',
  subtitle: 'Um PR só entra se o comportamento não piorar em nenhuma intenção; uma imagem só chega a 100% depois de 24 horas a 10%',
  icon: '🚦',
  minutes: 100,
  tags: ['github actions', 'ci/cd', 'evals', 'canário', 'oidc'],
  goals: [
    'Ler e escrever workflows do GitHub Actions com permissões mínimas, concorrência, cache do uv e serviços (PostgreSQL com pgvector) para os testes.',
    'Pôr as evals no caminho do merge como gate, comparando com a versão em produção por intenção e não só pela média global.',
    'Publicar uma imagem imutável por SHA no GHCR, com SBOM e proveniência, e explicar porque é que `latest` não tem lugar num deploy.',
    'Desenhar a entrega: ambientes com aprovação, canário de 10% durante 24 h, critérios de promoção e rollback, credenciais por OIDC em vez de segredos longos.',
    'Separar o que corre em cada PR (modelo simulado, sem rede) do que corre à noite (modelo real, com custo), e saber o que cada um apanha.',
  ],
  sections: [
    /* ============================================================ 1 */
    {
      id: 'actions',
      title: 'GitHub Actions: workflows, jobs e o mínimo de permissões',
      blocks: [
        {
          type: 'p',
          text:
            'Um workflow é um ficheiro YAML em `.github/workflows/` que reage a eventos (`pull_request`, `push`, `schedule`, `workflow_dispatch`). Tem jobs; cada job corre num runner novo (uma máquina virtual limpa), com passos que executam comandos (`run`) ou acções reutilizáveis (`uses`). Os jobs correm em paralelo, a menos que um declare `needs` sobre outro. Não há estado partilhado entre jobs senão o que passas explicitamente: artefactos, saídas, cache. É o modelo mental de um pipeline declarativo, com a particularidade de que o próprio pipeline vive no repositório e muda por PR como o resto.',
        },
        { type: 'adr', ref: 'adr-0024' },
        { type: 'file', ref: '.github/workflows/ci.yml' },
        {
          type: 'diagram',
          diagram: {
            title: 'O pipeline do «Balcão»: CI em cada PR, imagem só na main, nocturnas à parte',
            caption: 'Três jobs independentes em paralelo; a imagem só depois de todos passarem e só em push para a main. As evals com o modelo real são outro workflow, noutro relógio.',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'pr', label: 'ci.yml — pull_request e push', col: 0, row: 0, colSpan: 3, rowSpan: 2, tone: 'ci' },
              { id: 'main', label: 'Só na main', col: 3, row: 0, colSpan: 2, rowSpan: 2, tone: 'service' },
              { id: 'noite', label: 'evals-nocturnas.yml — schedule', col: 0, row: 2, colSpan: 5, rowSpan: 1, tone: 'async' },
            ],
            nodes: [
              { id: 'ev', label: 'pull_request / push', col: 0, row: 0, kind: 'queue' },
              { id: 'lint', label: 'lint', sub: 'ruff check, ruff format, mypy', col: 1, row: 0, kind: 'service' },
              { id: 'testes', label: 'testes', sub: 'pytest + pgvector:pg18', col: 1, row: 1, kind: 'service' },
              { id: 'evals', label: 'evals', sub: 'gate, modelo simulado', col: 2, row: 0, kind: 'service' },
              { id: 'img', label: 'imagem', sub: 'build + push ghcr.io, tag sha', col: 3, row: 0, kind: 'service' },
              { id: 'cd', label: 'deploy', sub: 'canário 10% · 24 h', col: 4, row: 0, kind: 'decision' },
              { id: 'reg', label: 'GHCR', sub: 'imagem imutável', col: 3, row: 1, kind: 'data' },
              { id: 'cron', label: '02:30 UTC', col: 0, row: 2, kind: 'queue' },
              { id: 'real', label: 'avaliar com o modelo real', sub: 'versão fixada; relatório 30 dias', col: 2, row: 2, kind: 'model' },
            ],
            edges: [
              { from: 'ev', to: 'lint' },
              { from: 'ev', to: 'testes' },
              { from: 'ev', to: 'evals' },
              { from: 'lint', to: 'img', label: 'needs' },
              { from: 'testes', to: 'img', style: 'dashed' },
              { from: 'evals', to: 'img', label: 'needs' },
              { from: 'img', to: 'reg' },
              { from: 'reg', to: 'cd' },
              { from: 'cron', to: 'real' },
            ],
          },
        },
        { type: 'widget', id: 'pipeline-ci' },
        {
          type: 'code',
          lang: 'yaml',
          caption: 'O cabeçalho do `ci.yml`: eventos, permissões por omissão só de leitura, e concorrência que cancela corridas obsoletas de PRs mas nunca da main.',
          code: `name: CI

on:
  pull_request:
  push:
    branches: [main]

# Por omissão, só leitura. O job da imagem pede o que precisa, e só ele.
permissions:
  contents: read

concurrency:
  group: ci-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: \${{ github.ref != 'refs/heads/main' }}

env:
  BALCAO_MODELO_FORNECEDOR: simulado    # RE-03: nenhum job de CI precisa de chave de modelo
  UV_PYTHON: "3.13"

jobs:
  lint:
    name: Lint e tipos
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true            # cache do uv chaveada pelo uv.lock
      - run: uv sync --frozen
      - run: uv run ruff check --output-format=github .
      - run: uv run ruff format --check .
      - run: uv run mypy`,
        },
        {
          type: 'table',
          head: ['Conceito', 'O que faz', 'No «Balcão»'],
          rows: [
            ['`permissions`', 'Âmbito do `GITHUB_TOKEN` do job', '`contents: read` por omissão; `packages: write` só no job da imagem'],
            ['`concurrency`', 'Uma corrida por grupo; opcionalmente cancela a anterior', 'Um push novo num PR cancela a corrida antiga; na main nunca'],
            ['`needs`', 'Ordem e dependência entre jobs', '`imagem` precisa de `lint`, `testes` e `evals`'],
            ['`if`', 'Condição para correr um job ou passo', 'A imagem só em `push` para `refs/heads/main`'],
            ['`timeout-minutes`', 'Mata o job se exceder', '10 a 20 min: um teste pendurado não gasta 6 h de runner'],
            ['`services`', 'Contentores ao lado do job', 'PostgreSQL 18 com pgvector para os testes marcados `postgres`'],
            ['`vars` e `secrets`', 'Configuração e segredos do repositório ou do ambiente', 'Nomes de modelo em `vars`; chaves só nas nocturnas, em `secrets`'],
          ],
          caption: 'As acções referidas por major (`@v5`) recebem correcções sem PR; uma política mais estrita fixa-as pelo SHA do commit da acção.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: permissões largas e `pull_request_target`',
          text:
            'Um workflow sem `permissions` herda as permissões por omissão do repositório, que em muitos repositórios antigos são de escrita. Qualquer acção de terceiros nesse job — e qualquer dependência que ela descarregue — corre com um token capaz de escrever no repositório e publicar pacotes. O segundo erro é trocar `pull_request` por `pull_request_target` para «ter acesso aos segredos» em PRs de forks: esse evento corre no contexto da base, com segredos, e se o workflow fizer checkout do código do PR, está a executar código de um desconhecido com as tuas credenciais. O «Balcão» declara `contents: read` no topo e só usa `pull_request`.',
        },
        {
          type: 'refs',
          items: [
            { label: 'GitHub Actions — Workflow syntax', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
            { label: 'GitHub — Security hardening for GitHub Actions', url: 'https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions' },
            { label: 'setup-uv', url: 'https://github.com/astral-sh/setup-uv' },
          ],
        },
      ],
    },

    /* ============================================================ 2 */
    {
      id: 'qualidade',
      title: 'Lint, tipos e testes com serviços',
      blocks: [
        {
          type: 'p',
          text:
            'O primeiro nível do gate é o mesmo de qualquer serviço Python: `ruff check` (lint, incluindo as regras `ASYNC` que apanham chamadas bloqueantes em funções assíncronas e as `S` de segurança), `ruff format --check`, `mypy` com o plugin do Pydantic, e `pytest`. O `uv sync --frozen` garante que o CI instala exactamente o `uv.lock` do commit — o mesmo que a imagem e que o portátil de quem abriu o PR. Os testes correm sem rede e sem chave (RE-03): modelo simulado, embeddings simulados, índice em memória.',
        },
        {
          type: 'p',
          text:
            'Os testes marcados `postgres` precisam do PostgreSQL com pgvector. Em vez de um mock, o job declara um contentor de serviço com a mesma imagem do compose (`pgvector/pgvector:pg18`) e opções de saúde: o runner só começa os passos quando o `pg_isready` passa. O esquema é aplicado com `psql` a partir de `sql/001_esquema.sql`, o mesmo ficheiro que o compose monta em `docker-entrypoint-initdb.d`.',
        },
        {
          type: 'code',
          lang: 'yaml',
          caption: 'O job de testes: um PostgreSQL real ao lado do runner, esquema aplicado, relatório JUnit sempre publicado.',
          code: `  testes:
    name: Testes
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    services:
      postgres:
        image: pgvector/pgvector:pg18
        env:
          POSTGRES_USER: balcao
          POSTGRES_PASSWORD: balcao
          POSTGRES_DB: balcao
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U balcao -d balcao"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 20
    env:
      DATABASE_URL: postgresql://balcao:balcao@localhost:5432/balcao
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --frozen
      - name: Aplicar o esquema
        run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/001_esquema.sql
      - name: pytest
        run: uv run pytest --junitxml=relatorios/junit.xml
      - name: Resultados dos testes
        if: always()                       # também quando o pytest falha: é aí que interessa
        uses: actions/upload-artifact@v4
        with:
          name: junit
          path: relatorios/junit.xml
          retention-days: 14`,
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Serviço em `localhost` porque o job corre no runner',
          text:
            'Quando os passos correm directamente no runner (sem `container:` no job), os contentores de serviço são alcançáveis em `localhost` pelas portas mapeadas. Se o job corresse dentro de um contentor, o nome do serviço (`postgres`) é que seria o hostname. Misturar os dois é a causa mais comum de «connection refused» num serviço que está saudável.',
        },
        {
          type: 'p',
          text:
            'Uma matriz multiplica um job por combinações de valores. No «Balcão» há uma razão concreta para uma: o runtime didáctico corre também no Pyodide (Python 3.14), e o serviço em 3.13. Uma matriz nas versões de Python apanha uma incompatibilidade antes de ela chegar ao browser de quem lê o tutorial. O custo é linear: dois valores, dois jobs, o dobro dos minutos.',
        },
        {
          type: 'code',
          lang: 'yaml',
          caption: 'Uma matriz de versões de Python só para os testes do runtime didáctico, sem cancelar as outras quando uma falha.',
          code: `  didactico:
    runs-on: ubuntu-24.04
    strategy:
      fail-fast: false
      matrix:
        python: ["3.13", "3.14"]
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
          python-version: \${{ matrix.python }}
      - run: uv sync --frozen
      - run: uv run pytest tests/test_didactico.py -q`,
        },
        {
          type: 'table',
          head: ['Verificação', 'Apanha', 'Não apanha', 'Tempo típico'],
          rows: [
            ['ruff check', 'Imports, erros óbvios, I/O bloqueante em `async`, `assert` em código de produção', 'Lógica', 'segundos'],
            ['mypy', 'Tipos errados entre camadas (esquemas, estado do grafo)', 'Comportamento do modelo', 'dezenas de segundos'],
            ['pytest (simulado)', 'Contrato HTTP, SSE, auth, ferramentas, grafo, guardas', 'Qualidade das respostas', '1 a 2 min'],
            ['pytest -m postgres', 'SQL, índices, checkpointer, filtros', 'Qualidade das respostas', 'minutos'],
            ['evals (simulado)', 'Recuperação, recusa, tool-call accuracy, red team', 'O que só o modelo real faz', '≈ 1 s de avaliação no laboratório'],
          ],
          caption: 'Cada linha é barata e determinista. O que não é (o modelo real) fica para as nocturnas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'GitHub Actions — About service containers', url: 'https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers' },
            { label: 'GitHub Actions — Running variations of jobs (matrix)', url: 'https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations' },
            { label: 'uv — Using uv in GitHub Actions', url: 'https://docs.astral.sh/uv/guides/integration/github/' },
          ],
        },
      ],
    },

    /* ============================================================ 3 */
    {
      id: 'evals-gate',
      title: 'Evals como gate: por intenção e contra a produção',
      blocks: [
        {
          type: 'p',
          text:
            'O terceiro job do CI é o que distingue este pipeline do de um CRUD. `python -m balcao.avaliacao.correr --conjunto todos --gate` corre o conjunto dourado e o red team contra o sistema do commit, calcula as métricas com intervalos de confiança por bootstrap, escreve o relatório em Markdown e JSON, e sai com código 1 se alguma métrica ficar abaixo do limiar. O conjunto e os limiares vivem no repositório (adr-0018): mudar um limiar é um PR revisto como qualquer outro.',
        },
        { type: 'adr', ref: 'adr-0018' },
        {
          type: 'eval',
          eval: {
            id: 'ev-ci-cd-01',
            title: 'O gate do CI no commit actual do laboratório',
            brief:
              'Corrida real de `make evals-gate`: 68 casos (48 do conjunto dourado do laboratório e 20 ataques de red team), modelo simulado, 1,18 s. Cada caso aqui é uma métrica do gate, com o valor e o intervalo de confiança a 95%.',
            metric: 'métricas do gate acima do limiar',
            cases: [
              { id: 'recall_at_5', input: 'recall@5 nas perguntas rag', expect: '≥ 0,80', got: '0,983 [0,950; 1,000]', pass: true },
              { id: 'fidelidade', input: 'faithfulness nas respostas não recusadas', expect: '≥ 0,85', got: '1,000 [1,000; 1,000]', pass: true },
              { id: 'recusa_correcta', input: 'perguntas fora de âmbito recusadas', expect: '≥ 0,80', got: '0,900 [0,700; 1,000]', pass: true },
              { id: 'acerto_ferramentas', input: 'tool-call accuracy nos casos de ferramenta', expect: '≥ 0,90', got: '1,000 [1,000; 1,000]', pass: true },
              { id: 'redteam_inofensivo', input: '20 ataques sem efeito proibido nem fuga', expect: '= 1,00', got: '1,000 [1,000; 1,000]', pass: true },
            ],
            runs: [{ versao: 'sistema@1.4.0', passou: 5, total: 5, nota: 'modelo simulado; correccao 0,567 reportada mas fora do gate' }],
            note: 'Repara no intervalo da recusa: [0,70; 1,00] com 10 perguntas fora de âmbito. Com tão poucos casos, uma pergunta decide se o gate passa — é por isso que o conjunto de produção tem 40 dessas perguntas, e não 10.',
          },
        },
        {
          type: 'p',
          text:
            'O gate do laboratório é global e absoluto: cada métrica contra um limiar fixo. O RI-04 pede mais: uma mudança que melhora a média e piora uma intenção tem de ser apanhada. Um limiar absoluto global não a apanha, porque a média esconde a intenção que caiu. O gate que o «Balcão» usa em produção compara a candidata com a versão em produção, intenção a intenção, e só bloqueia onde há casos suficientes para a diferença significar alguma coisa.',
        },
        {
          type: 'run',
          run: {
            id: 'run-ci-cd-01',
            title: 'Um PR que passa o gate global e devia ser bloqueado',
            brief:
              'O PR troca a pesquisa híbrida com re-ranking por BM25 puro. Com as 30 perguntas douradas do runtime didáctico, o recall@3 global continua acima de 0,80; por intenção, três intenções caem para metade.',
            code: String.raw`import balcao as b
from collections import defaultdict

grupos = defaultdict(list)
for p in b.PERGUNTAS:
    grupos[p["intencao"]].append(p)

def recall(metodo: str, ps=None) -> float:
    return b.avaliar_recuperacao(metodo, 3, ps)["recall"]

producao, candidata = "rerank", "bm25"          # o PR troca a pesquisa híbrida com re-rank por BM25
g_prod, g_cand = recall(producao), recall(candidata)
print(f"global: produção {g_prod:.3f}, candidata {g_cand:.3f} -> limiar absoluto 0.80: "
      f"{'passa' if g_cand >= 0.80 else 'FALHA'}")

MIN_N, MAX_QUEDA = 2, 0.10
for i, ps in sorted(grupos.items()):
    rp, rc = recall(producao, ps), recall(candidata, ps)
    if rc >= rp:
        continue
    if len(ps) < MIN_N:
        estado = "aviso (n pequeno demais para bloquear)"
    elif rp - rc > MAX_QUEDA:
        estado = "FALHA"
    else:
        continue
    print(f"  {i:<20} n={len(ps)}  {rp:.3f} -> {rc:.3f}  {estado}")

falhas = sum(1 for ps in grupos.values() if len(ps) >= MIN_N and recall(producao, ps) - recall(candidata, ps) > MAX_QUEDA)
print(f"gate por intenção: {'FALHA' if falhas else 'passa'} ({falhas} intenções pioram mais de {MAX_QUEDA:.2f})")`,
            expected: `global: produção 0.950, candidata 0.833 -> limiar absoluto 0.80: passa
  cobertura            n=2  1.000 -> 0.500  FALHA
  entrega              n=2  1.000 -> 0.500  FALHA
  pedidos              n=2  1.000 -> 0.500  FALHA
  restricoes           n=1  0.500 -> 0.000  aviso (n pequeno demais para bloquear)
gate por intenção: FALHA (3 intenções pioram mais de 0.10)`,
          },
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Com n = 2, «caiu para metade» é uma pergunta',
          text:
            'O runtime didáctico tem 30 perguntas; com duas por intenção, uma pergunta a falhar é uma queda de 50 pontos. O mecanismo é o certo, o tamanho não: no conjunto de produção (240 perguntas, estratificadas por intenção) cada intenção tem pelo menos 12 casos, e a regra de bloqueio usa o intervalo de confiança da diferença (módulo 20), não a diferença pontual. Um gate que bloqueia por ruído é contornado; um que nunca bloqueia é decoração.',
        },
        {
          type: 'code',
          lang: 'yaml',
          caption: 'O job de evals: o relatório vai para o resumo do job (que os revisores lêem no PR) e fica como artefacto 30 dias, passe ou falhe.',
          code: `  evals:
    name: Evals (gate)
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --frozen
      - name: Correr avaliação
        run: uv run python -m balcao.avaliacao.correr --conjunto todos --gate --saida relatorios
      - name: Resumo no PR
        if: always()
        run: cat relatorios/*.md >> "$GITHUB_STEP_SUMMARY" || true
      - name: Relatório de avaliação
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: relatorio-avaliacao
          path: relatorios/
          retention-days: 30`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O gate que se desliga «só para este PR»',
          text:
            'A primeira vez que o gate bloqueia um PR urgente, alguém propõe `continue-on-error: true` no job, ou baixar o limiar no mesmo PR. As duas coisas matam o gate: a primeira torna-o decorativo para sempre (ninguém a volta a tirar), a segunda ajusta a régua ao que se quer medir. Se o gate está errado, corrige-se o gate num PR próprio, revisto pela engenharia de IA e pelo dono do conjunto dourado; se o PR urgente piora uma intenção, a decisão de o aceitar é uma decisão de produto, registada, não um YAML editado às escondidas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'GitHub Actions — Adding a job summary', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' },
            { label: 'GitHub Actions — Storing workflow data as artifacts', url: 'https://docs.github.com/en/actions/tutorials/store-and-share-data' },
            { label: 'RAGAS — métricas de avaliação', url: 'https://docs.ragas.io/en/stable/' },
          ],
        },
      ],
    },
    ...seccoesCiB,
  ],
  quiz: quizM28,
  exercises: exerciciosM28,
  labs: labsM28,
  useCases: casosM28,
};
