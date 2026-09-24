import type { Exercise, Lab, Question, UseCase } from '../types';

export const quizM27: Question[] = [
  {
    id: 'q-docker-01',
    topic: 'docker',
    prompt: 'Um PR muda só `prompts/sistema.md`. O Dockerfile tem `COPY . .` e a seguir `RUN uv sync --frozen --no-dev`. O que acontece no build?',
    options: [
      'Só a camada do `COPY . .` é refeita; o `uv sync` vem da cache.',
      'O `COPY . .` muda de conteúdo, e o `uv sync` e tudo o que está por cima são refeitos.',
      'Nada é refeito, porque o `uv.lock` não mudou.',
      'O build falha, porque `--frozen` detecta a mudança.',
    ],
    answer: [1],
    explain:
      'A cache de um `RUN` depende da camada de baixo. Se o `COPY . .` muda (qualquer ficheiro do contexto mudou), todas as camadas acima são invalidadas, incluindo a instalação das dependências. Copiar primeiro só `pyproject.toml` e `uv.lock` isola essa camada.',
  },
  {
    id: 'q-docker-02',
    topic: 'docker',
    prompt: 'Que efeitos tem passar um token de um índice privado de pacotes como `ARG TOKEN` e usá-lo num `RUN`?',
    options: [
      'O valor fica visível nos metadados da imagem (`docker history`).',
      'Qualquer pessoa com acesso à imagem no registo pode lê-lo.',
      'Nenhum, porque os `ARG` desaparecem no fim do build.',
      'O build falha porque `ARG` não aceita segredos.',
    ],
    answer: [0, 1],
    explain:
      'Os valores de `ARG` usados num `RUN` ficam registados no histórico da imagem. O mecanismo certo é `RUN --mount=type=secret`, que monta o segredo só durante essa instrução, sem o gravar em nenhuma camada.',
  },
  {
    id: 'q-docker-03',
    topic: 'docker',
    prompt: 'O `.dockerignore` tem `*.pem`. O ficheiro `certs/chave-ghcr.pem` entra no contexto de build?',
    options: [
      'Não: `*.pem` apanha ficheiros em qualquer directório, como no `.gitignore`.',
      'Sim: no `.dockerignore`, `*` não atravessa `/`; é preciso `**/*.pem`.',
      'Só se o Dockerfile tiver `COPY certs`.',
      'Depende da versão do Git.',
    ],
    answer: [1],
    explain:
      'Os padrões do `.dockerignore` são relativos à raiz do contexto e seguem o `filepath.Match` do Go, onde `*` não atravessa separadores. Só `**` corresponde a vários directórios. A chave entra no contexto e fica a um `COPY . .` de uma camada publicada.',
  },
  {
    id: 'q-docker-04',
    topic: 'docker',
    prompt: 'A `api` tem `depends_on: [db]` sem condição, e às vezes falha ao arrancar com «connection refused». Porquê?',
    options: [
      'Porque o `depends_on` curto só espera que o contentor `db` seja iniciado, não que o PostgreSQL aceite ligações.',
      'Porque falta `restart: always` na base de dados.',
      'Porque as duas redes são diferentes.',
      'Porque o `depends_on` não funciona com perfis.',
    ],
    answer: [0],
    explain:
      'A forma curta equivale a `condition: service_started`. Com um `healthcheck` no `db` (`pg_isready`) e `condition: service_healthy` na `api`, o Compose espera pelo estado saudável.',
  },
  {
    id: 'q-docker-05',
    topic: 'docker',
    prompt: 'Porque é que o `HEALTHCHECK` da imagem aponta para `/healthz` e não para `/readyz`?',
    options: [
      'Porque `/readyz` exige autenticação.',
      'Porque um `HEALTHCHECK` que dependa da base de dados marca o contentor como `unhealthy` quando a base de dados falha, e o orquestrador pode reiniciá-lo sem necessidade.',
      'Porque o Docker só aceita caminhos que comecem por `/h`.',
      'Porque `/readyz` é mais lento.',
    ],
    answer: [1],
    explain:
      'O `HEALTHCHECK` responde à pergunta «o processo está vivo?». Ligar essa pergunta a uma dependência externa transforma uma falha da base de dados numa cascata de reinícios. A prontidão, noutros orquestradores, é uma sonda separada.',
  },
  {
    id: 'q-docker-06',
    topic: 'docker',
    prompt: 'Que vantagens tem `python:3.13-slim` sobre `python:3.13-alpine` para o «Balcão»?',
    options: [
      'As wheels `manylinux` (glibc) do psycopg, numpy e pydantic-core instalam-se sem compilar.',
      'Não é preciso compilador no build, nem ficam ferramentas de compilação na imagem.',
      'A imagem final é sempre mais pequena.',
      'Não tem vulnerabilidades reportadas.',
    ],
    answer: [0, 1],
    explain:
      'A Alpine usa musl; dependências sem wheel `musllinux` compilam no build, o que exige compiladores e torna o build lento. A imagem slim não é necessariamente menor nem livre de CVEs — o scan reporta pacotes da base, consequência aceite no adr-0022.',
  },
  {
    id: 'q-docker-07',
    topic: 'docker',
    prompt: 'Mudaste `sql/001_esquema.sql` e fizeste `docker compose up -d`. A tabela nova não aparece. Porquê?',
    options: [
      'Os scripts de `docker-entrypoint-initdb.d` só correm quando o directório de dados está vazio; o volume `pgdata` já existia.',
      'O ficheiro precisa de permissão de execução.',
      'O pgvector não suporta tabelas novas.',
      'O compose não monta bind mounts em modo `:ro`.',
    ],
    answer: [0],
    explain:
      'A inicialização corre uma vez por volume. Mudanças de esquema em ambientes com dados precisam de migrações; no laboratório, `docker compose down -v` apaga o volume e volta a correr os scripts.',
  },
  {
    id: 'q-docker-08',
    topic: 'docker',
    prompt: 'Qual é o efeito de `read_only: true` e `tmpfs: [/tmp]` no serviço `api`?',
    options: [
      'O processo não consegue escrever em lado nenhum do sistema de ficheiros excepto `/tmp`, que vive em memória.',
      'A base de dados passa a ser só de leitura.',
      'Os `.pyc` não podem ser gerados em runtime — por isso a imagem os compila no build.',
      'O contentor não pode ler variáveis de ambiente.',
    ],
    answer: [0, 2],
    explain:
      'Um sistema de ficheiros só de leitura torna explícito qualquer estado escondido e limita o que um atacante pode alterar. É por isso que o build usa `UV_COMPILE_BYTECODE=1` e o runtime `PYTHONDONTWRITEBYTECODE=1`.',
  },
];

export const exerciciosM27: Exercise[] = [
  {
    id: 'e-docker-01',
    title: 'Ligações ao PostgreSQL no compose',
    statement:
      'Com `pool_max=10` no pool do repositório e `pool_max=10` no pool do checkpointer, e o PostgreSQL com `max_connections=100`, quantas réplicas da `api` (um processo cada) podes correr sem esgotar ligações, deixando 10 para administração e para o job de ingestão?',
    kind: 'input',
    accept: ['4'],
    hint: 'Cada réplica abre até dois pools.',
    solution:
      'Cada réplica pode abrir até 10 + 10 = 20 ligações. (100 − 10) / 20 = 4,5, logo 4 réplicas. Com `--workers 2` por contentor seriam só 2 réplicas — um argumento concreto para um processo por contentor, e para um PgBouncer à frente se for preciso mais.',
    difficulty: 2,
  },
  {
    id: 'e-docker-02',
    title: 'Revisão de um Dockerfile',
    statement:
      'Aponta pelo menos cinco problemas neste Dockerfile e diz o custo de cada um: `FROM python:3.13` / `COPY . /app` / `WORKDIR /app` / `RUN pip install -e .` / `ENV ANTHROPIC_API_KEY=sk-ant-…` / `CMD uvicorn balcao.api.app:create_app --factory --workers 4`.',
    kind: 'open',
    solution:
      '1) `python:3.13` completa em vez de slim: compiladores e centenas de pacotes na imagem, mais CVEs. 2) `COPY . /app` antes de instalar: cada mudança reinstala as dependências; e sem `.dockerignore` estrito leva `.git`, `.venv` e `.env`. 3) `pip install -e .`: ignora o `uv.lock` (versões diferentes em cada build) e instala em modo editável, que depende de `src/` no runtime. 4) Chave de API em `ENV`: fica nos metadados da imagem e em qualquer registo onde seja publicada — incidente de segurança. 5) Corre como root: sem `USER`. 6) Sem `HEALTHCHECK`. 7) `CMD` em forma shell: o uvicorn não é o PID 1 e não recebe o SIGTERM directamente, o que parte o graceful shutdown; e `--workers 4` multiplica pools e memória num contentor.',
    difficulty: 2,
  },
  {
    id: 'e-docker-03',
    title: 'Um ambiente de avaliação reprodutível',
    statement:
      'A equipa quer correr as evals nocturnas com o Ollama e o `llama3.2:3b` num servidor próprio com GPU, em vez de um fornecedor por API, para comparar. Desenha o compose (serviços, perfis, volumes, dependências) e diz como garantes que duas noites seguidas usam exactamente o mesmo modelo.',
    kind: 'design',
    solution:
      'Serviços: `db` (pgvector, volume próprio `pgdata-evals`), `ollama` com `deploy.resources.reservations.devices` para a GPU e volume `ollama`, `ollama-init` que faz `pull` e sai, e um serviço `evals` com a imagem do «Balcão» e `command: python -m balcao.avaliacao.correr --conjunto todos --gate`, com `depends_on` em `db` (service_healthy) e `ollama-init` (service_completed_successfully), e um bind mount para `relatorios/`. Perfil `evals` para não subir com o resto. Reprodutibilidade: a imagem do Ollama fixada por versão (`OLLAMA_VERSAO`) e não `latest`; o modelo registado pelo digest que `ollama list` mostra, gravado no relatório; o `ollama-init` compara o digest com o esperado e falha se mudou; temperatura 0 e mesma imagem do «Balcão» por SHA.',
    difficulty: 3,
  },
  {
    id: 'e-docker-04',
    title: 'O graceful shutdown que não acontece',
    statement:
      'Num deploy, os streams SSE em curso são cortados de imediato em vez de terminarem. O Dockerfile acaba com `CMD uvicorn balcao.api.app:create_app --factory --host 0.0.0.0`. Explica porquê e corrige.',
    kind: 'open',
    solution:
      'Na forma shell, o Docker corre `/bin/sh -c "uvicorn ..."`: o PID 1 é o shell, que não reencaminha o SIGTERM ao uvicorn. Ao fim do prazo de paragem (10 s por omissão no Docker) chega o SIGKILL e tudo é cortado. A forma exec (`CMD ["uvicorn", ...]`) põe o uvicorn como PID 1, que recebe o SIGTERM e espera pelos pedidos até `--timeout-graceful-shutdown 20`; o `stop_grace_period` do compose (ou o `terminationGracePeriodSeconds`) tem de ser maior do que esses 20 s.',
    difficulty: 2,
  },
];

export const labsM27: Lab[] = [
  {
    id: 'lab-docker-01',
    moduleId: 'docker',
    title: 'Do Dockerfile de tutorial ao multi-stage com uv',
    brief:
      'Reescreve o Dockerfile: estágio de build com uv e `uv sync --frozen --no-dev` (dependências antes do código), estágio de runtime `python:3.13-slim` que só recebe o `.venv` e os prompts, utilizador não-root, `HEALTHCHECK` para `/healthz` e `CMD` em forma exec.',
    lang: 'dockerfile',
    starter: `FROM python:3.13
WORKDIR /app
COPY . .
RUN pip install -e .
CMD uvicorn balcao.api.app:create_app --factory --host 0.0.0.0 --port 8000`,
    checks: [
      { id: 'build', label: 'Tem um estágio de build com nome', re: '^FROM\\s+\\S+\\s+AS\\s+build', flags: 'mi' },
      { id: 'frozen', label: 'Instala com uv sync --frozen --no-dev', re: 'uv sync --frozen --no-dev' },
      { id: 'ordem', label: 'Instala dependências antes de copiar src', re: '--no-install-project[\\s\\S]*COPY\\s+src' },
      { id: 'slim', label: 'Runtime sobre python:3.13-slim', re: '^FROM\\s+python:3\\.13-slim\\s+AS\\s+runtime', flags: 'mi' },
      { id: 'from', label: 'Copia o .venv do estágio de build', re: 'COPY\\s+--from=build[^\\n]*\\.venv' },
      { id: 'user', label: 'Corre como utilizador não-root', re: '^USER\\s+(?!root)\\w+', flags: 'm' },
      { id: 'hc', label: 'HEALTHCHECK para /healthz', re: 'HEALTHCHECK[\\s\\S]*/healthz' },
      { id: 'exec', label: 'CMD em forma exec', re: '^CMD\\s*\\[', flags: 'm' },
      { id: 'pip', label: 'Sem pip install', re: 'pip install', forbid: true, why: 'O pip ignora o `uv.lock`: cada build pode instalar versões diferentes.' },
      { id: 'copyall', label: 'Sem COPY . .', re: '^COPY\\s+\\.\\s+\\.', flags: 'm', forbid: true, why: 'Copiar o contexto inteiro invalida a cache e arrisca levar segredos para uma camada.' },
    ],
    hints: [
      'Começa com `FROM ghcr.io/astral-sh/uv:0.9 AS uv` e copia `/uv` para `/bin/` no estágio de build.',
      'Primeira passagem: `uv sync --frozen --no-dev --no-install-project` com `pyproject.toml` e `uv.lock`; segunda, depois de `COPY src ./src`, com `--no-editable`.',
      'No runtime: `useradd` com uid fixo, `COPY --from=build --chown=...`, `ENV PATH=/app/.venv/bin:$PATH`, `USER`.',
    ],
    solution: `# syntax=docker/dockerfile:1.7
FROM ghcr.io/astral-sh/uv:0.9 AS uv

FROM python:3.13-slim AS build
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \\
    --mount=type=bind,source=uv.lock,target=uv.lock \\
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \\
    uv sync --frozen --no-dev --no-install-project
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --frozen --no-dev --no-editable

FROM python:3.13-slim AS runtime
RUN groupadd --system --gid 10001 balcao \\
 && useradd --system --uid 10001 --gid balcao --home-dir /app --shell /usr/sbin/nologin balcao
WORKDIR /app
COPY --from=build --chown=balcao:balcao /app/.venv /app/.venv
COPY --chown=balcao:balcao prompts ./prompts
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 BALCAO_DIR_PROMPTS=/app/prompts
USER balcao
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \\
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2).status == 200 else 1)"]
CMD ["uvicorn", "balcao.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]`,
    difficulty: 2,
  },
  {
    id: 'lab-docker-02',
    moduleId: 'docker',
    title: 'Um compose que espera pelo que tem de esperar',
    brief:
      'O compose abaixo usa `sleep` para esperar pela base de dados e sobe sempre o Ollama. Corrige: healthcheck com `pg_isready` no `db`, `depends_on` com `condition: service_healthy`, Ollama só com o perfil `ollama`, e um volume com nome para os dados.',
    lang: 'yaml',
    starter: `services:
  db:
    image: pgvector/pgvector:pg18
    environment:
      POSTGRES_USER: balcao
      POSTGRES_PASSWORD: balcao
      POSTGRES_DB: balcao
  ollama:
    image: ollama/ollama:latest
  api:
    image: balcao:local
    command: sh -c "sleep 15 && uvicorn balcao.api.app:create_app --factory --host 0.0.0.0"
    depends_on:
      - db`,
    checks: [
      { id: 'hc', label: 'Healthcheck do db com pg_isready', re: 'healthcheck:[\\s\\S]*pg_isready' },
      { id: 'cond', label: 'depends_on com service_healthy', re: 'condition:\\s*service_healthy' },
      { id: 'perfil', label: 'Ollama num perfil', re: 'profiles:\\s*\\[\\s*"?ollama"?\\s*\\]' },
      { id: 'vol', label: 'Volume com nome para os dados', re: '^volumes:\\s*\\n\\s+\\w+:', flags: 'm' },
      { id: 'sleep', label: 'Sem sleep para esperar', re: 'sleep\\s+\\d+', forbid: true, why: 'Um sleep é lento na máquina rápida e insuficiente na lenta.' },
    ],
    hints: [
      '`test: ["CMD-SHELL", "pg_isready -U balcao -d balcao"]`, com `interval`, `timeout` e `retries`.',
      'A forma longa de `depends_on` é um mapa: `db: { condition: service_healthy }`.',
      'O volume monta-se em `/var/lib/postgresql` nas imagens 18 e declara-se em `volumes:` no nível de topo.',
    ],
    solution: `services:
  db:
    image: pgvector/pgvector:pg18
    environment:
      POSTGRES_USER: balcao
      POSTGRES_PASSWORD: balcao
      POSTGRES_DB: balcao
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U balcao -d balcao"]
      interval: 5s
      timeout: 3s
      retries: 20
      start_period: 10s
  ollama:
    image: ollama/ollama:\${OLLAMA_VERSAO:-latest}
    profiles: ["ollama"]
  api:
    image: balcao:local
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:`,
    difficulty: 1,
  },
  {
    id: 'lab-docker-03',
    moduleId: 'docker',
    title: 'As regras do `.dockerignore` em Python',
    brief:
      'Escreve `ignorado(caminho, padroes)` com as regras do `.dockerignore`: padrões relativos à raiz, `*` e `?` não atravessam `/`, `**/` corresponde a zero ou mais directórios, e um padrão que corresponde a um directório exclui o que está lá dentro. Os `assert` têm de passar; a solução corre no browser.',
    lang: 'python',
    starter: String.raw`from fnmatch import fnmatch


def ignorado(caminho: str, padroes: list[str]) -> bool:
    return any(fnmatch(caminho, p) for p in padroes)


P = [".git", "**/__pycache__", "*.pem", "**/.env", "tests"]
assert ignorado(".git/HEAD", P)
assert ignorado("src/balcao/__pycache__/grafo.pyc", P)
assert ignorado("chave.pem", P)
assert not ignorado("certs/chave.pem", P)
assert ignorado("docker/.env", P)
assert not ignorado("src/tests_util.py", P)
assert not ignorado("prompts/sistema.md", P)
print("ok")`,
    checks: [
      { id: 're', label: 'Converte o padrão numa expressão regular', re: 're\\.(compile|match|fullmatch)\\(' },
      { id: 'estrela', label: '* não atravessa directórios', re: '\\[\\^/\\]\\*' },
      { id: 'dir', label: 'Um directório excluído exclui o conteúdo', re: '\\(\\?:/\\.\\*\\)\\?' },
      { id: 'fn', label: 'Não usa fnmatch (o * dele atravessa /)', re: 'fnmatch\\(', forbid: true },
    ],
    hints: [
      'Percorre o padrão carácter a carácter: `**/` vira `(?:.*/)?`, `*` vira `[^/]*`, `?` vira `[^/]`, o resto passa por `re.escape`.',
      'Acaba a expressão com `(?:/.*)?$` para um directório excluir tudo o que tem dentro.',
      'Usa `match` (ancorado no início) e não `search`.',
    ],
    solution: String.raw`import re


def para_regex(padrao: str) -> re.Pattern:
    rx, i = "", 0
    while i < len(padrao):
        if padrao.startswith("**/", i):
            rx, i = rx + "(?:.*/)?", i + 3
        elif padrao.startswith("**", i):
            rx, i = rx + ".*", i + 2
        elif padrao[i] == "*":
            rx, i = rx + "[^/]*", i + 1
        elif padrao[i] == "?":
            rx, i = rx + "[^/]", i + 1
        else:
            rx, i = rx + re.escape(padrao[i]), i + 1
    return re.compile(rx + "(?:/.*)?$")


def ignorado(caminho: str, padroes: list[str]) -> bool:
    return any(para_regex(p).match(caminho) for p in padroes)


P = [".git", "**/__pycache__", "*.pem", "**/.env", "tests"]
assert ignorado(".git/HEAD", P)
assert ignorado("src/balcao/__pycache__/grafo.pyc", P)
assert ignorado("chave.pem", P)
assert not ignorado("certs/chave.pem", P)
assert ignorado("docker/.env", P)
assert not ignorado("src/tests_util.py", P)
assert not ignorado("prompts/sistema.md", P)
print("ok")`,
    difficulty: 2,
    executavel: true,
  },
];

export const casosM27: UseCase[] = [
  {
    id: 'uc-docker-01',
    title: 'Uma farmácia online com builds de 14 minutos e uma chave na imagem',
    area: 'Saúde · Portugal',
    level: 2,
    scenario:
      'Uma farmácia online em Lisboa tem um assistente que responde sobre encomendas, receitas electrónicas e disponibilidade de medicamentos, com RAG sobre folhetos informativos. A imagem tinha 2,3 GB, o build no CI demorava 14 minutos em cada PR (mesmo nos que só mudavam o prompt), e uma auditoria encontrou a chave do fornecedor de modelo num `ENV` de uma imagem antiga ainda no registo.',
    requirements: [
      'Build de um PR que só muda prompts ou código em menos de 2 minutos.',
      'Nenhum segredo em nenhuma camada nem nos metadados de nenhuma imagem publicada.',
      'Ambiente local idêntico ao de CI, sem chaves de API.',
    ],
    constraints: [
      'Dependências com extensões nativas (cliente de base de dados, numpy, um re-ranker local).',
      'Registo de imagens partilhado com outras equipas, com retenção de 1 ano.',
    ],
    approach: [
      { title: 'Revogar primeiro', text: 'A chave exposta foi revogada no mesmo dia; as imagens antigas foram apagadas do registo, sabendo que qualquer cópia já descarregada continuava a tê-la.' },
      { title: 'Multi-stage com lockfile', text: 'Estágio de build com uv e `uv sync --frozen --no-dev --no-install-project` numa camada própria, com cache montada; runtime slim só com o `.venv`. O modelo do re-ranker passou para um volume em vez de ir na imagem.' },
      { title: 'Cache no CI', text: 'Cache de build do BuildKit exportada para o backend de cache do CI: os PRs de prompt reutilizam todas as camadas de dependências.' },
      { title: 'Política verificada', text: 'Verificações da imagem no CI: não-root, sem ferramentas de build, nenhum ficheiro de segredo nas camadas, `HEALTHCHECK` definido.' },
    ],
    diagram: {
      title: 'Antes e depois',
      caption: 'O que mudou foi a ordem das camadas e o que sai do estágio de build.',
      cols: 4,
      rows: 2,
      zones: [
        { id: 'antes', label: 'Antes: uma imagem', col: 0, row: 0, colSpan: 2, rowSpan: 2, tone: 'neutral' },
        { id: 'depois', label: 'Depois: multi-stage', col: 2, row: 0, colSpan: 2, rowSpan: 2, tone: 'service' },
      ],
      nodes: [
        { id: 'a1', label: 'python:3.12 completa', sub: 'compiladores incluídos', col: 0, row: 1, kind: 'data' },
        { id: 'a2', label: 'COPY . + pip install', sub: 'ENV com a chave', col: 0, row: 0, kind: 'data' },
        { id: 'a3', label: 'modelo do re-ranker', sub: 'dentro da imagem', col: 1, row: 0, kind: 'model' },
        { id: 'b1', label: 'build: uv sync --frozen', sub: 'cache montada', col: 2, row: 1, kind: 'service' },
        { id: 'b2', label: 'runtime slim', sub: '.venv + prompts, não-root', col: 3, row: 1, kind: 'service' },
        { id: 'b3', label: 'volume de modelos', sub: 'fora da imagem', col: 3, row: 0, kind: 'data' },
      ],
      edges: [
        { from: 'a1', to: 'a2' },
        { from: 'a2', to: 'a3' },
        { from: 'b1', to: 'b2', label: 'COPY --from=build' },
        { from: 'b2', to: 'b3', style: 'dashed', label: 'monta' },
      ],
    },
    solution:
      'Imagem multi-stage com uv e lockfile, base slim, utilizador não-root, modelos em volume, cache de build no CI e verificações de política antes de publicar. Os PRs de prompt passaram a reconstruir só as camadas de topo.',
    tools: [
      { name: 'Docker BuildKit', role: 'Multi-stage, cache montada e segredos de build' },
      { name: 'uv', role: 'Dependências fixadas pelo lockfile' },
      { name: 'Docker Scout', role: 'Scan de vulnerabilidades no CI' },
    ],
    rejected: [
      { option: 'Distroless', why: 'Sem shell, os incidentes com o re-ranker nativo ficavam difíceis de diagnosticar; o ganho em superfície não compensava.' },
      { option: 'Alpine para reduzir tamanho', why: 'Duas dependências nativas sem wheel musl passavam a compilar no build, que era exactamente o problema a resolver.' },
    ],
    costNote:
      'O tempo de CI poupado pagou a mudança em semanas; o custo real foi a revisão das imagens antigas no registo e a rotação de todas as chaves que alguma vez lá estiveram.',
    takeaways: [
      'A ordem das instruções decide o tempo de build de cada PR.',
      'Um segredo numa imagem publicada trata-se como um segredo num commit: revoga-se.',
      'Modelos e dados grandes vivem em volumes ou registos próprios, não em camadas da imagem.',
    ],
    refs: [
      { label: 'Docker — Building best practices', url: 'https://docs.docker.com/build/building/best-practices/' },
      { label: 'Docker — Cache storage backends', url: 'https://docs.docker.com/build/cache/backends/' },
    ],
  },
];
