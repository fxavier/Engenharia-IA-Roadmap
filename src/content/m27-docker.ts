import type { Module } from '../types';
import { seccoesDockerB } from './m27-docker.parte-a';
import { quizM27, exerciciosM27, labsM27, casosM27 } from './m27-docker.parte-b';

export const m27: Module = {
  id: 'docker',
  number: 27,
  part: 'producao',
  title: 'Docker e docker-compose',
  subtitle: 'Uma imagem pequena, reprodutível e sem segredos, e um `docker compose up` que espera pelo que tem de esperar',
  icon: '🐳',
  minutes: 90,
  tags: ['docker', 'compose', 'uv', 'multi-stage', 'healthcheck'],
  goals: [
    'Explicar uma imagem como uma pilha de camadas endereçadas por conteúdo e ordenar um Dockerfile para que um PR que só muda o prompt reconstrua em segundos.',
    'Construir a imagem do «Balcão» em multi-stage com uv e `uv sync --frozen`, sobre `python:3.13-slim`, com utilizador não-root e sem ferramentas de build no runtime.',
    'Manter segredos fora da imagem e do contexto de build (`.dockerignore`, `--mount=type=secret`, variáveis em runtime) e definir um `HEALTHCHECK` de vivacidade.',
    'Subir API, PostgreSQL com pgvector e Ollama com `docker compose`, perfis e `depends_on` com condições de saúde, e raciocinar sobre o tempo até ficar pronto.',
    'Escolher volumes, GPU, sistema de ficheiros só de leitura e scan de vulnerabilidades com os trade-offs de cada um.',
  ],
  sections: [
    /* ============================================================ 1 */
    {
      id: 'camadas',
      title: 'Imagens, camadas e a cache de build',
      blocks: [
        {
          type: 'p',
          text:
            'Uma imagem Docker é uma pilha ordenada de camadas só de leitura mais um manifesto com a configuração (comando, variáveis, utilizador, `HEALTHCHECK`). Cada instrução do Dockerfile que muda o sistema de ficheiros (`RUN`, `COPY`, `ADD`) produz uma camada; as outras (`ENV`, `USER`, `CMD`) só mexem na configuração. Um contentor é essa pilha com uma camada de escrita por cima. Duas imagens que partilham as camadas de baixo partilham-nas também em disco e no registo: é por isso que uma base `python:3.13-slim` se descarrega uma vez por máquina.',
        },
        {
          type: 'p',
          text:
            'A cache de build é o que torna isto rápido, e o que a invalida é a regra que tens de saber de cor: o BuildKit reutiliza uma camada se a camada de baixo for a mesma, a instrução for a mesma, e — para `COPY` e `ADD` — o conteúdo dos ficheiros copiados for o mesmo. Um `RUN` não olha para os ficheiros; só para o texto da instrução e para a camada de baixo. Consequência: a primeira instrução que muda invalida essa camada **e todas as que estão por cima**. Ordenar o Dockerfile é ordenar do que muda menos para o que muda mais.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'A imagem de runtime do «Balcão», de baixo para cima',
            caption:
              'Quanto mais em cima, mais vezes muda. O `.venv` vem do estágio de build já pronto; o prompt, que muda todas as semanas, fica numa camada de poucos KB no topo.',
            cols: 4,
            rows: 5,
            zones: [
              { id: 'base', label: 'Base (partilhada)', col: 0, row: 4, colSpan: 4, rowSpan: 1, tone: 'neutral' },
              { id: 'app', label: 'Camadas do «Balcão»', col: 0, row: 0, colSpan: 4, rowSpan: 4, tone: 'service' },
            ],
            nodes: [
              { id: 'slim', label: 'python:3.13-slim', sub: 'Debian + CPython, sem compiladores', col: 0, row: 4, span: 3, kind: 'data' },
              { id: 'user', label: 'groupadd/useradd balcao', sub: 'uid 10001', col: 0, row: 3, span: 3, kind: 'data' },
              { id: 'venv', label: 'COPY --from=build /app/.venv', sub: 'dependências e o pacote balcao', col: 0, row: 2, span: 3, kind: 'data' },
              { id: 'dados', label: 'COPY prompts, dados, sql', sub: 'KB; muda em quase todos os PRs de comportamento', col: 0, row: 1, span: 3, kind: 'data' },
              { id: 'cfg', label: 'ENV, USER, HEALTHCHECK, CMD', sub: 'só metadados, sem camada de ficheiros', col: 0, row: 0, span: 3, kind: 'note' },
              { id: 'freq', label: 'Muda mais', sub: 'topo', col: 3, row: 0, kind: 'decision' },
              { id: 'raro', label: 'Muda menos', sub: 'base', col: 3, row: 4, kind: 'decision' },
            ],
            edges: [
              { from: 'slim', to: 'user' },
              { from: 'user', to: 'venv' },
              { from: 'venv', to: 'dados' },
              { from: 'dados', to: 'cfg' },
              { from: 'raro', to: 'freq', style: 'dashed', label: 'frequência de mudança' },
            ],
          },
        },
        { type: 'widget', id: 'docker-camadas' },
        {
          type: 'run',
          run: {
            id: 'run-docker-01',
            title: 'A mesma mudança de prompt, com duas ordens de instruções',
            brief:
              'Simula a regra da cache: a chave de uma camada é a camada de baixo, a instrução e o conteúdo dos ficheiros copiados. Os segundos por passo são ordem de grandeza de um build do «Balcão» sem cache de dependências.',
            code: String.raw`import hashlib

# O que cada ficheiro contém "agora" (o conteúdo só serve para o hash).
ficheiros = {"pyproject.toml": "deps v1", "uv.lock": "lock v1", "src/balcao/grafo.py": "grafo v1",
             "prompts/sistema.md": "sistema 1.4.0"}
# Segundos por passo quando NÃO vem da cache (ordem de grandeza de um build do «Balcão»).
CUSTO = {"FROM": 0, "COPY deps": 1, "RUN uv sync": 95, "COPY src": 1, "RUN install": 6, "COPY prompts": 1, "COPY .": 1}

def build(passos, cache):
    pai, gasto, linhas = "base", 0, []
    for nome, entradas in passos:
        # a chave de uma camada = camada anterior + instrução + conteúdo dos ficheiros copiados
        chave = hashlib.sha256((pai + nome + "".join(ficheiros[f] for f in entradas)).encode()).hexdigest()[:8]
        acerto = chave in cache
        cache.add(chave)
        gasto += 0 if acerto else CUSTO[nome]
        linhas.append(("CACHED " if acerto else "build  ") + nome)
        pai = chave
    return gasto, linhas

ingenuo = [("FROM", []), ("COPY .", list(ficheiros)), ("RUN uv sync", [])]
camadas = [("FROM", []), ("COPY deps", ["pyproject.toml", "uv.lock"]), ("RUN uv sync", []),
           ("COPY src", ["src/balcao/grafo.py"]), ("RUN install", []), ("COPY prompts", ["prompts/sistema.md"])]

for nome, passos in (("COPY . antes do sync", ingenuo), ("dependências primeiro", camadas)):
    cache = set()
    build(passos, cache)                                   # primeiro build: enche a cache
    ficheiros["prompts/sistema.md"] = "sistema 1.5.0"      # um PR que só muda o prompt
    s, linhas = build(passos, cache)
    ficheiros["prompts/sistema.md"] = "sistema 1.4.0"
    print(f"{nome}: {s} s depois de mudar o prompt")
    for l in linhas:
        print("   " + l)`,
            expected: `COPY . antes do sync: 96 s depois de mudar o prompt
   CACHED FROM
   build  COPY .
   build  RUN uv sync
dependências primeiro: 1 s depois de mudar o prompt
   CACHED FROM
   CACHED COPY deps
   CACHED RUN uv sync
   CACHED COPY src
   CACHED RUN install
   build  COPY prompts`,
          },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: `COPY . .` antes de instalar as dependências',
          text:
            'Quem vem de um Dockerfile de tutorial escreve `COPY . .` e a seguir `RUN pip install -r requirements.txt`. Cada PR — mesmo o que só muda uma vírgula do prompt — invalida a cópia e reinstala o LangChain, o LangGraph, o psycopg e o resto: minutos por build, multiplicados por todos os PRs e pelo CI. A correcção é copiar primeiro só o que define as dependências (`pyproject.toml` e `uv.lock`), instalar, e só depois copiar o código. No laboratório, a primeira fase nem copia: monta os dois ficheiros com `--mount=type=bind` só durante o `RUN`.',
        },
        {
          type: 'table',
          head: ['Instrução', 'A cache é invalidada quando', 'No «Balcão»'],
          rows: [
            ['`FROM image:tag`', 'A tag passa a apontar para outro digest (e o build puxa-o)', 'Fixar por digest em produção, e actualizar por PR'],
            ['`COPY`/`ADD` ficheiros', 'O conteúdo (ou os metadados relevantes) dos ficheiros muda', 'Separar dependências, código e prompts'],
            ['`RUN comando`', 'O texto do comando ou a camada de baixo muda', 'Um `RUN apt-get update` fica em cache para sempre: combinar com `install` na mesma linha'],
            ['`RUN --mount=type=cache`', 'Nunca invalida por causa do conteúdo da cache', 'A cache do uv persiste entre builds na mesma máquina'],
            ['`ARG` usado depois', 'O valor do argumento muda', '`PYTHON_VERSION` no topo: mudar a versão refaz tudo, como deve'],
          ],
          caption: 'A cache é determinista: se um build demora sem razão, há uma instrução acima do que mudou que está a invalidar mais do que devia.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Docker — Build cache', url: 'https://docs.docker.com/build/cache/' },
            { label: 'Docker — Optimize cache usage', url: 'https://docs.docker.com/build/cache/optimize/' },
            { label: 'Docker — Image layers', url: 'https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/' },
          ],
        },
      ],
    },

    /* ============================================================ 2 */
    {
      id: 'multi-stage',
      title: 'Multi-stage com uv: construir num sítio, correr noutro',
      blocks: [
        {
          type: 'p',
          text:
            'Um build multi-stage tem vários `FROM` no mesmo Dockerfile; cada um começa um estágio, e o último é a imagem final. Os estágios anteriores servem para produzir artefactos que se copiam com `COPY --from=<estágio>`. Para o «Balcão», o estágio `build` tem o uv e a cache de pacotes; o estágio `runtime` só recebe o virtualenv pronto, os prompts, os dados e o SQL. O uv, a cache e qualquer ferramenta de compilação ficam para trás. É a decisão do adr-0022.',
        },
        { type: 'adr', ref: 'adr-0022' },
        { type: 'file', ref: 'docker/Dockerfile' },
        {
          type: 'code',
          lang: 'dockerfile',
          caption: 'O estágio de build do laboratório. As variáveis `UV_*` e as duas passagens de `uv sync` são o coração do padrão.',
          code: `# syntax=docker/dockerfile:1.7
ARG PYTHON_VERSION=3.13

FROM ghcr.io/astral-sh/uv:0.9 AS uv

FROM python:\${PYTHON_VERSION}-slim AS build
COPY --from=uv /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \\
    UV_LINK_MODE=copy \\
    UV_PYTHON_DOWNLOADS=never \\
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app

# 1) Só as dependências: em cache enquanto o uv.lock não mudar
RUN --mount=type=cache,target=/root/.cache/uv \\
    --mount=type=bind,source=uv.lock,target=uv.lock \\
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \\
    uv sync --frozen --no-dev --no-install-project

# 2) O projecto, instalado como pacote (não editável)
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --frozen --no-dev --no-editable`,
        },
        {
          type: 'terms',
          items: [
            { term: '`uv sync --frozen`', def: 'Instala exactamente o que está no `uv.lock`, sem o actualizar. Se o lock não corresponder ao `pyproject.toml`, falha em vez de resolver outra coisa: o build não escolhe versões por ti.' },
            { term: '`--no-dev`', def: 'Deixa de fora o grupo `dev` (pytest, ruff, mypy). A imagem não corre testes.' },
            { term: '`--no-install-project`', def: 'Na primeira passagem instala só as dependências, não o pacote `balcao`: assim a camada não depende do código.' },
            { term: '`--no-editable`', def: 'Instala o `balcao` como pacote normal em `site-packages`, para o runtime não precisar de `src/`.' },
            { term: '`UV_COMPILE_BYTECODE=1`', def: 'Compila os `.pyc` no build: o arranque do contentor não os gera (e o sistema de ficheiros pode ser só de leitura).' },
            { term: '`UV_LINK_MODE=copy`', def: 'Copia em vez de criar hardlinks: a cache é um mount noutro sistema de ficheiros, e hardlinks não o atravessam.' },
            { term: '`UV_PYTHON_DOWNLOADS=never`', def: 'Usa o Python da imagem base. Sem isto, um `requires-python` que não bate podia descarregar outro intérprete dentro do build.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: '`python:3.13-slim` (a escolha)',
            items: [
              'glibc: as wheels `manylinux` do psycopg, numpy e pydantic-core instalam-se sem compilar.',
              'Tem shell e `apt`: num incidente dá para entrar e ver.',
              'O scan reporta pacotes da base que o serviço não usa (consequência aceite no adr-0022).',
            ],
          },
          right: {
            title: 'Alternativas rejeitadas',
            items: [
              '`python:3.13-alpine`: musl; várias dependências sem wheel `musllinux` compilam no build — mais lento e com compiladores na imagem.',
              'Distroless: superfície mínima, mas sem shell para depurar e com mais trabalho para dependências nativas.',
              'Imagem única com `pip install`: ferramentas de build e cache de pip na imagem final, versões não fixadas.',
            ],
          },
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'Construir e inspeccionar: tamanho, camadas, utilizador e healthcheck.',
          code: `docker build -f docker/Dockerfile -t balcao:local .

docker image ls balcao:local                          # tamanho total
docker history balcao:local                           # uma linha por instrução, com o tamanho de cada camada
docker image inspect balcao:local \\
  --format '{{.Config.User}} {{json .Config.Healthcheck}}'

# o runtime não tem uv nem compiladores
docker run --rm --entrypoint sh balcao:local -c 'command -v uv gcc || echo "sem ferramentas de build"'

# construir com a cache do CI e ver o que veio da cache
docker buildx build --progress=plain -f docker/Dockerfile . 2>&1 | grep -E 'CACHED|DONE'`,
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Uma tag não é uma versão: fixa a base por digest',
          text:
            '`python:3.13-slim` é uma tag móvel: a Docker Official Images republica-a com correcções de segurança, e o mesmo Dockerfile produz imagens diferentes em dias diferentes. Para builds reprodutíveis, fixa a base por digest (`python:3.13-slim@sha256:…`) e deixa um bot de dependências abrir um PR quando o digest muda — o PR passa pelo gate de evals como qualquer outro. O laboratório usa a tag, por legibilidade; a imagem de produção do «Balcão» usa o digest.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Docker — Multi-stage builds', url: 'https://docs.docker.com/build/building/multi-stage/' },
            { label: 'uv — Using uv in Docker', url: 'https://docs.astral.sh/uv/guides/integration/docker/' },
            { label: 'uv — Locking and syncing', url: 'https://docs.astral.sh/uv/concepts/projects/sync/' },
          ],
        },
      ],
    },
    ...seccoesDockerB,
  ],
  quiz: quizM27,
  exercises: exerciciosM27,
  labs: labsM27,
  useCases: casosM27,
};
