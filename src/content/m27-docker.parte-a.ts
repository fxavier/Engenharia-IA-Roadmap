import type { Section } from '../types';

export const seccoesDockerB: Section[] = [
  /* ============================================================ 3 */
  {
    id: 'seguranca',
    title: 'Não-root, `.dockerignore`, segredos e `HEALTHCHECK`',
    blocks: [
      {
        type: 'p',
        text:
          'Por omissão, um contentor corre como root. Se uma dependência tiver uma vulnerabilidade de execução remota — e um serviço que processa texto arbitrário de clientes e respostas de um modelo tem superfície de sobra —, o atacante fica root dentro do contentor, com escrita em todo o sistema de ficheiros da imagem. A imagem do «Balcão» cria um utilizador de sistema `balcao` com uid e gid 10001 fixos, copia os ficheiros com `--chown` e acaba com `USER balcao`. O uid fixo importa porque as políticas do cluster (`runAsNonRoot`, `runAsUser`) verificam números, não nomes.',
      },
      {
        type: 'code',
        lang: 'dockerfile',
        caption: 'O estágio de runtime do laboratório: utilizador sem privilégios, cópias com dono, e nada de uv.',
        code: `FROM python:\${PYTHON_VERSION}-slim AS runtime

RUN groupadd --system --gid 10001 balcao \\
 && useradd --system --uid 10001 --gid balcao --home-dir /app --shell /usr/sbin/nologin balcao

WORKDIR /app
COPY --from=build --chown=balcao:balcao /app/.venv /app/.venv
COPY --chown=balcao:balcao prompts ./prompts
COPY --chown=balcao:balcao dados ./dados
COPY --chown=balcao:balcao sql ./sql

ENV PATH="/app/.venv/bin:\${PATH}" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1 \\
    BALCAO_DIR_PROMPTS=/app/prompts \\
    BALCAO_DIR_DADOS=/app/dados

USER balcao
EXPOSE 8000`,
      },
      {
        type: 'p',
        text:
          'O `.dockerignore` decide o que entra no **contexto de build** — o conjunto de ficheiros que o cliente envia ao BuildKit. Tudo o que está no contexto pode acabar na imagem por um `COPY` descuidado, e tudo o que está no contexto é enviado a cada build (um `.venv` local de centenas de MB, o `.git` inteiro). O do laboratório lista o que fica de fora; mas os padrões seguem regras próprias: são relativos à raiz do contexto e seguem o `filepath.Match` do Go, onde `*` não atravessa `/`. Só `**` corresponde a qualquer número de directórios.',
      },
      { type: 'file', ref: '.dockerignore' },
      {
        type: 'run',
        run: {
          id: 'run-docker-02',
          title: 'O `*.pem` que só protege a raiz',
          brief:
            'Implementa as regras de correspondência do `.dockerignore` (`*` não atravessa directórios, `**` sim, um directório excluído exclui o conteúdo) e aplica os padrões do laboratório a uma árvore de trabalho com uma chave em `certs/` e um `.env` em `docker/`.',
          code: String.raw`import re

def para_regex(padrao: str) -> re.Pattern:
    # Regras do .dockerignore: caminhos relativos à raiz do contexto; "*" não atravessa "/",
    # "**" atravessa qualquer número de directórios; um padrão que casa com um directório exclui tudo lá dentro.
    rx = ""
    i = 0
    while i < len(padrao):
        if padrao.startswith("**/", i):
            rx, i = rx + "(?:.*/)?", i + 3
        elif padrao.startswith("**", i):
            rx, i = rx + ".*", i + 2
        elif padrao[i] == "*":
            rx, i = rx + "[^/]*", i + 1
        else:
            rx, i = rx + re.escape(padrao[i]), i + 1
    return re.compile(rx + "(?:/.*)?$")

def ignorado(caminho: str, padroes: list[str]) -> bool:
    return any(para_regex(p).match(caminho) for p in padroes)

# Uma árvore de trabalho típica: caminho -> KB
arvore = {
    ".git/objects/pack/pack-1.pack": 48200, ".venv/lib/python3.13/site-packages/x.py": 612000,
    ".env": 1, "tests/test_api.py": 9, "src/balcao/grafo.py": 28,
    "src/balcao/__pycache__/grafo.cpython-313.pyc": 41, "prompts/sistema.md": 6,
    "uv.lock": 540, "certs/chave-ghcr.pem": 2, "docker/.env.local": 1,
}
laboratorio = [".git", ".venv", "**/__pycache__", "tests", ".env", ".env.*", "*.pem"]
corrigido = laboratorio + ["**/*.pem", "**/.env", "**/.env.*"]

for nome, padroes in (("como está", laboratorio), ("corrigido", corrigido)):
    dentro = [c for c in arvore if not ignorado(c, padroes)]
    kb = sum(arvore[c] for c in dentro)
    fugas = [c for c in dentro if c.endswith(".pem") or "/.env" in "/" + c]
    print(f"{nome}: {len(dentro)} ficheiros, {kb} KB no contexto; segredos: {fugas}")`,
          expected: `como está: 5 ficheiros, 577 KB no contexto; segredos: ['certs/chave-ghcr.pem', 'docker/.env.local']
corrigido: 3 ficheiros, 574 KB no contexto; segredos: []`,
        },
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Um `.dockerignore` escrito como se fosse um `.gitignore`',
        text:
          'No `.gitignore`, `*.pem` apanha ficheiros em qualquer directório. No `.dockerignore`, apanha só os da raiz do contexto: `certs/chave-ghcr.pem` e `docker/.env.local` entram no contexto de build sem aviso. Não chegam à imagem enquanto os `COPY` forem explícitos, mas basta um `COPY . .` num Dockerfile novo para irem parar a uma camada — e uma camada publicada num registo é tão permanente como um commit. Escreve os padrões de segredos com `**/`, e prefere `COPY` explícitos de pastas a `COPY . .`.',
      },
      {
        type: 'table',
        head: ['Segredo', 'Quando é preciso', 'Como entra', 'Nunca'],
        rows: [
          ['Chave do fornecedor de modelo', 'Runtime', 'Variável de ambiente vinda do cofre ou do orquestrador', '`ENV` ou `ARG` no Dockerfile'],
          ['`DATABASE_URL` com palavra-passe', 'Runtime', 'Segredo do orquestrador; `env_file` só em local', 'Copiado num ficheiro para a imagem'],
          ['Token de um índice privado de pacotes', 'Build', '`RUN --mount=type=secret,id=...`', '`ARG TOKEN=...` (fica no histórico da imagem)'],
          ['Chave SSH para um repositório privado', 'Build', '`RUN --mount=type=ssh`', '`COPY id_ed25519`'],
        ],
        caption: 'Um `ARG` ou um `ENV` fica nos metadados da imagem e aparece em `docker history`; um ficheiro apagado numa camada posterior continua na camada onde foi copiado.',
      },
      {
        type: 'code',
        lang: 'dockerfile',
        caption: 'Um segredo de build montado só durante um `RUN`: não fica em nenhuma camada nem nos metadados.',
        code: `# syntax=docker/dockerfile:1.10   (a opção env= do mount de segredos precisa do frontend 1.10+)
# docker build --secret id=indice,env=UV_INDEX_CHEGA_PASSWORD -f docker/Dockerfile .
RUN --mount=type=cache,target=/root/.cache/uv \\
    --mount=type=secret,id=indice,env=UV_INDEX_CHEGA_PASSWORD \\
    --mount=type=bind,source=uv.lock,target=uv.lock \\
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \\
    uv sync --frozen --no-dev --no-install-project`,
      },
      {
        type: 'p',
        text:
          'O `HEALTHCHECK` diz ao Docker como saber se o contentor está saudável. O do «Balcão» chama `/healthz` — vivacidade, não prontidão: não toca na base de dados (a razão está no módulo 25). A imagem slim não tem `curl`, e instalá-lo só para isto acrescenta um binário e uma superfície; o Python que já lá está chega. Os parâmetros contam uma história: 30 s de `start-period` para o `lifespan` montar o grafo e os pools sem que as falhas iniciais contem, sondas a cada 15 s com timeout de 3 s, e 3 falhas seguidas para o estado passar a `unhealthy`.',
      },
      {
        type: 'code',
        lang: 'dockerfile',
        caption: 'O `HEALTHCHECK` e o `CMD` do laboratório.',
        code: `HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \\
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2).status == 200 else 1)"]

# Um processo por contentor; escala-se com réplicas (módulo 25)
CMD ["uvicorn", "balcao.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", \\
     "--proxy-headers", "--timeout-graceful-shutdown", "20"]`,
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Quem lê o `HEALTHCHECK`',
        text:
          'O Docker e o Compose usam-no (`docker ps` mostra `healthy`, e `depends_on` com `condition: service_healthy` espera por ele). O Kubernetes ignora-o: lá valem as `livenessProbe` e `readinessProbe` do Deployment. Por isso o `HEALTHCHECK` da imagem aponta para a vivacidade, que é a pergunta que faz sentido em qualquer orquestrador.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Docker — Build context e .dockerignore', url: 'https://docs.docker.com/build/concepts/context/' },
          { label: 'Docker — Build secrets', url: 'https://docs.docker.com/build/building/secrets/' },
          { label: 'Dockerfile reference — HEALTHCHECK e USER', url: 'https://docs.docker.com/reference/dockerfile/' },
        ],
      },
    ],
  },

  /* ============================================================ 4 */
  {
    id: 'compose',
    title: '`docker compose`: API, PostgreSQL com pgvector e Ollama',
    blocks: [
      {
        type: 'p',
        text:
          'O laboratório sobe inteiro com um comando. O `docker-compose.yml` descreve quatro serviços e um job: `db` (PostgreSQL 18 com pgvector, esquema aplicado no primeiro arranque), `ollama` e `ollama-init` (só com o perfil `ollama`), `api` (a imagem deste módulo) e `ingest` (só com o perfil `ingestao`). Sem perfis, sobe só `db` e `api`, com o modelo simulado: nenhuma rede para fora, nenhuma chave, que é o requisito RE-03.',
      },
      { type: 'file', ref: 'docker-compose.yml' },
      {
        type: 'diagram',
        diagram: {
          title: 'Os serviços do compose e as condições de arranque',
          caption: 'Setas: «só arranca depois de». O perfil decide quais existem; a condição decide quando cada um arranca.',
          cols: 4,
          rows: 3,
          zones: [
            { id: 'base', label: 'Sempre', col: 0, row: 0, colSpan: 2, rowSpan: 2, tone: 'service' },
            { id: 'ollama', label: 'Perfil ollama', col: 2, row: 0, colSpan: 2, rowSpan: 2, tone: 'external' },
            { id: 'ing', label: 'Perfil ingestao', col: 0, row: 2, colSpan: 4, rowSpan: 1, tone: 'async' },
          ],
          nodes: [
            { id: 'db', label: 'db', sub: 'pgvector/pgvector:pg18 · pg_isready', col: 0, row: 1, kind: 'vector' },
            { id: 'api', label: 'api', sub: 'balcao:local · read_only · /healthz', col: 1, row: 0, kind: 'service' },
            { id: 'ol', label: 'ollama', sub: 'healthcheck: ollama list', col: 3, row: 1, kind: 'model' },
            { id: 'init', label: 'ollama-init', sub: 'pull llama3.2:3b e nomic-embed-text; sai', col: 2, row: 0, kind: 'tool' },
            { id: 'ingest', label: 'ingest', sub: 'python -m balcao.ingestao; run --rm', col: 1, row: 2, kind: 'tool' },
            { id: 'vol', label: 'volumes', sub: 'pgdata, ollama', col: 3, row: 2, kind: 'data' },
          ],
          edges: [
            { from: 'api', to: 'db', label: 'service_healthy' },
            { from: 'api', to: 'init', label: 'completed_successfully (required: false)' },
            { from: 'init', to: 'ol', label: 'service_healthy' },
            { from: 'ingest', to: 'db', label: 'service_healthy' },
            { from: 'db', to: 'vol', style: 'dashed' },
            { from: 'ol', to: 'vol', style: 'dashed' },
          ],
        },
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'O serviço `api`: espera pela base de dados saudável e, se o perfil existir, pelos modelos descarregados. `required: false` porque sem o perfil o `ollama-init` não existe.',
        code: `  api:
    build:
      context: .
      dockerfile: docker/Dockerfile
    image: balcao:local
    environment:
      <<: *balcao-ambiente
      BALCAO_INGERIR_NO_ARRANQUE: "true"
    env_file:
      - path: .env
        required: false
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      ollama-init:
        condition: service_completed_successfully
        required: false            # só existe com --profile ollama
    read_only: true                # a imagem não escreve em lado nenhum...
    tmpfs:
      - /tmp                       # ...excepto aqui (relatórios de avaliação)
    restart: unless-stopped`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: '`depends_on` sem condição não espera por nada útil',
        text:
          'Um `depends_on: [db]` curto só garante que o contentor `db` foi **criado e iniciado** antes da `api` — não que o PostgreSQL aceita ligações. Nos primeiros segundos a base de dados ainda está a inicializar o cluster e a correr os scripts de `docker-entrypoint-initdb.d`, e o `lifespan` da API falha ao abrir o pool. O remendo habitual é um `sleep 10` no comando, que falha na máquina lenta do CI e desperdiça tempo na rápida. A correcção é um `healthcheck` no `db` (`pg_isready`) e `condition: service_healthy` na `api`.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-docker-01',
          title: '`docker compose --profile ollama up -d --build --wait`, do zero',
          intro: 'Primeiro arranque numa máquina sem volumes: o esquema é aplicado, os modelos são descarregados, o corpus é ingerido.',
          lanes: [
            { id: 'dev', label: 'Terminal', kind: 'human' },
            { id: 'comp', label: 'Compose', sub: 'resolve o grafo de dependências', kind: 'infra' },
            { id: 'db', label: 'db', sub: 'PostgreSQL 18 + pgvector', kind: 'store' },
            { id: 'ol', label: 'ollama', kind: 'model' },
            { id: 'init', label: 'ollama-init', kind: 'service' },
            { id: 'api', label: 'api', kind: 'service' },
          ],
          steps: [
            { from: 'dev', to: 'comp', label: 'up --build --wait', kind: 'req', code: 'docker compose --profile ollama up -d --build --wait', lang: 'bash' },
            { from: 'comp', to: 'comp', label: 'build da imagem balcao:local (cache)', kind: 'self' },
            { from: 'comp', to: 'db', label: 'arranca', kind: 'req' },
            { from: 'comp', to: 'ol', label: 'arranca', kind: 'req' },
            { from: 'db', to: 'db', label: 'initdb + sql/001_esquema.sql (volume vazio)', kind: 'self', ms: 7000 },
            { from: 'db', to: 'comp', label: 'pg_isready: healthy', kind: 'res' },
            { from: 'ol', to: 'comp', label: 'ollama list: healthy', kind: 'res' },
            { from: 'comp', to: 'init', label: 'arranca (condition: service_healthy do ollama)', kind: 'req' },
            { from: 'init', to: 'ol', label: 'ollama pull llama3.2:3b && ollama pull nomic-embed-text', detail: 'O tempo depende da rede; da segunda vez é instantâneo porque os modelos ficam no volume `ollama`.', kind: 'req', ms: 140000 },
            { from: 'init', to: 'comp', label: 'sai com código 0', kind: 'res' },
            { from: 'comp', to: 'api', label: 'arranca (db healthy e ollama-init terminado)', kind: 'req' },
            { from: 'api', to: 'api', label: 'lifespan: pools, checkpointer, ingere o corpus se o índice estiver vazio', kind: 'self', ms: 12000 },
            { from: 'api', to: 'comp', label: '/healthz: healthy', kind: 'res' },
            { from: 'comp', to: 'dev', label: '--wait devolve: tudo healthy', kind: 'res' },
          ],
          outro: 'O `--wait` torna o comando utilizável em scripts e no CI: devolve quando tudo está saudável, ou falha se algum serviço não chegar lá.',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-docker-03',
          title: 'Quanto tempo até a API estar pronta?',
          brief:
            'Percorre o grafo de `depends_on` e aplica as sondas de saúde: durante o `start_period` correm a cada `start_interval` (5 s por omissão no Docker Engine 25+), depois a cada `interval`. É uma aproximação, mas mostra onde está o tempo.',
          code: String.raw`# Quando é que a API fica saudável? depends_on com condition e os healthchecks do docker-compose.yml.
# Aproximação do Docker Engine 25+: durante o start_period as sondas correm a cada start_interval
# (5 s por omissão); depois, a cada interval. Segundos; "pronto" = quando o serviço fica operacional.
# "modelos" é o serviço ollama e "modelos-init" o ollama-init do compose.
servicos = {
    "db":          {"pronto": 7,   "intervalo": 5,  "arranque": 10, "deps": []},
    "modelos":      {"pronto": 3,   "intervalo": 10, "arranque": 10, "deps": []},
    "modelos-init": {"pronto": 140, "intervalo": None, "arranque": 0, "deps": ["modelos"]},
    "api":         {"pronto": 12,  "intervalo": 15, "arranque": 30, "deps": ["db", "modelos-init"]},
}

def primeira_sonda_ok(pronto, intervalo, arranque, start_interval=5):
    t = start_interval
    while t < pronto:
        t += start_interval if t < arranque else intervalo
    return t

memo = {}
def saudavel_em(nome):
    if nome not in memo:
        s = servicos[nome]
        inicio = max((saudavel_em(d) for d in s["deps"]), default=0)
        if s["intervalo"] is None:        # condition: service_completed_successfully
            fim = inicio + s["pronto"]
        else:                             # condition: service_healthy
            fim = inicio + primeira_sonda_ok(s["pronto"], s["intervalo"], s["arranque"])
        memo[nome] = fim
        print(f"{nome:<12} arranca aos {inicio:>3} s, pronto para os dependentes aos {fim:>3} s")
    return memo[nome]

total = saudavel_em("api")
print(f"up --wait com o perfil dos modelos: {total} s no primeiro arranque")
servicos["modelos-init"]["pronto"] = 2      # segunda vez: os modelos já estão no volume
memo.clear()
print("com os modelos no volume:", saudavel_em("api"), "s")`,
          expected: `db           arranca aos   0 s, pronto para os dependentes aos  10 s
modelos      arranca aos   0 s, pronto para os dependentes aos   5 s
modelos-init arranca aos   5 s, pronto para os dependentes aos 145 s
api          arranca aos 145 s, pronto para os dependentes aos 160 s
up --wait com o perfil dos modelos: 160 s no primeiro arranque
db           arranca aos   0 s, pronto para os dependentes aos  10 s
modelos      arranca aos   0 s, pronto para os dependentes aos   5 s
modelos-init arranca aos   5 s, pronto para os dependentes aos   7 s
api          arranca aos  10 s, pronto para os dependentes aos  25 s
com os modelos no volume: 25 s`,
        },
      },
      {
        type: 'code',
        lang: 'bash',
        caption: 'Os comandos do dia-a-dia (também no `Makefile`: `make subir`, `make subir-ollama`, `make ingerir`, `make descer`).',
        code: `docker compose up -d --build --wait                         # db + api, modelo simulado
BALCAO_MODELO_FORNECEDOR=ollama \\
  docker compose --profile ollama up -d --build --wait      # com modelos locais
docker compose --profile ingestao run --rm ingest           # reingerir (idempotente)

docker compose ps                                           # estado e saúde de cada serviço
docker compose logs -f api                                  # logs da API
docker compose exec db psql -U balcao -c 'select count(*) from chunks'

docker compose --profile ollama --profile ingestao down     # pára; os volumes ficam
docker compose down -v                                      # pára e APAGA os volumes (base de dados incluída)`,
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Os scripts de `docker-entrypoint-initdb.d` só correm uma vez',
        text:
          'A imagem do PostgreSQL só executa `sql/*.sql` quando o directório de dados está vazio. Mudar o esquema em `sql/001_esquema.sql` não tem efeito num volume `pgdata` que já existe; é preciso uma migração (ou, no laboratório, `docker compose down -v`, que apaga os dados). Outra nota das imagens `postgres` 18: o volume monta-se em `/var/lib/postgresql`, não em `/var/lib/postgresql/data` como nas versões anteriores — o compose do laboratório já o faz.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Compose — Control startup order', url: 'https://docs.docker.com/compose/how-tos/startup-order/' },
          { label: 'Compose — Profiles', url: 'https://docs.docker.com/compose/how-tos/profiles/' },
          { label: 'pgvector — imagem Docker', url: 'https://github.com/pgvector/pgvector' },
        ],
      },
    ],
  },

  /* ============================================================ 5 */
  {
    id: 'operacao',
    title: 'Volumes, GPU, tamanho e scan de imagens',
    blocks: [
      {
        type: 'p',
        text:
          'Um contentor é descartável; os dados não. O compose do laboratório usa volumes com nome para o que tem de sobreviver a um `down` (a base de dados em `pgdata`, os modelos do Ollama em `ollama`), um bind mount só de leitura para o que vem da tua máquina (`./sql`, `./documentos`), e `tmpfs` para o que é temporário. A API corre com `read_only: true`: se uma dependência tentar escrever no sistema de ficheiros da imagem, falha no laboratório em vez de funcionar por acaso e partir num orquestrador com a mesma política.',
      },
      {
        type: 'table',
        head: ['Tipo', 'No «Balcão»', 'Sobrevive a `down`?', 'Cuidado'],
        rows: [
          ['Volume com nome', '`pgdata`, `ollama`', 'Sim (até `down -v`)', 'Fazer backup de `pgdata` se tiver dados que interessam'],
          ['Bind mount', '`./sql:/docker-entrypoint-initdb.d:ro`, `./documentos:/app/documentos:ro`', 'É a pasta do anfitrião', 'Permissões de uid entre anfitrião e contentor; usar `:ro`'],
          ['`tmpfs`', '`/tmp` na `api`', 'Não (memória)', 'Conta para a memória do contentor'],
          ['Camada de escrita do contentor', 'Nenhum (a `api` é `read_only`)', 'Não', 'Escritas escondidas que só falham noutro ambiente'],
        ],
        caption: 'A regra: nada de estado importante na camada de escrita de um contentor.',
      },
      {
        type: 'p',
        text:
          'Com GPU, o Ollama gera tokens uma ordem de grandeza mais depressa do que em CPU. O Compose pede GPUs através de `deploy.resources.reservations.devices`, o que exige o NVIDIA Container Toolkit no anfitrião. No laboratório isto é opcional: o `llama3.2:3b` corre em CPU num portátil, devagar mas o suficiente para ver o sistema a funcionar, e os testes e o CI usam o modelo simulado. Em produção, o «Balcão» usa um fornecedor por API (adr-0003); um Ollama com GPU só faria sentido com um requisito de residência de dados que o obrigasse.',
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'Um ficheiro `compose.gpu.yaml` para sobrepor ao principal quando há GPU NVIDIA: `docker compose -f docker-compose.yml -f compose.gpu.yaml --profile ollama up -d`.',
        code: `services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]`,
      },
      {
        type: 'eval',
        eval: {
          id: 'ev-docker-01',
          title: 'Política da imagem do «Balcão», verificada em cada build',
          brief:
            'Verificações sobre a imagem construída, que o CI corre antes de a publicar. Não medem qualidade de respostas: medem se a imagem cumpre o adr-0022.',
          metric: 'verificações da imagem a passar',
          cases: [
            { id: 'nao-root', input: 'docker image inspect --format {{.Config.User}}', expect: 'utilizador diferente de root, com uid fixo', got: 'balcao (uid 10001)', pass: true },
            { id: 'healthcheck', input: 'docker image inspect --format {{json .Config.Healthcheck}}', expect: 'HEALTHCHECK definido, a apontar para /healthz', got: 'CMD python -c … /healthz, interval 15s, start-period 30s', pass: true },
            { id: 'sem-uv', input: 'command -v uv gcc dentro da imagem', expect: 'nenhuma ferramenta de build no runtime', got: 'nenhuma encontrada', pass: true },
            { id: 'sem-segredos', input: 'procurar .env, *.pem e chaves sk- nas camadas', expect: 'nenhum ficheiro de segredo em nenhuma camada', got: 'nenhum', pass: true },
            { id: 'frozen', input: 'uv sync --frozen no build', expect: 'o build falha se o uv.lock não bater com o pyproject.toml', got: 'falhou como esperado com um pyproject.toml alterado sem lock', pass: true },
            { id: 'base-digest', input: 'FROM do estágio runtime', expect: 'base fixada por digest', got: 'python:3.13-slim (tag móvel, no laboratório)', pass: false },
          ],
          note: 'A última falha é deliberada: o laboratório privilegia a legibilidade. Na imagem de produção, o `FROM` usa o digest e esta verificação passa a bloquear.',
        },
      },
      {
        type: 'p',
        text:
          'Tamanho e vulnerabilidades andam juntos: cada pacote na imagem é superfície e é mais uma linha no relatório do scanner. O `docker history` mostra que camada pesa quanto; o `.venv` do «Balcão» é de longe a maior, dominada pelas dependências do LangChain, do psycopg e do numpy. O scan (Docker Scout, Trivy ou o do registo) lê os pacotes do sistema e do Python e cruza-os com bases de vulnerabilidades; o SBOM (a lista de componentes) e a proveniência são gerados no build e publicados com a imagem — o módulo 28 liga isto ao pipeline.',
      },
      {
        type: 'code',
        lang: 'bash',
        caption: 'Tamanho por camada, scan e SBOM de uma imagem local.',
        code: `docker history --format '{{.Size}}\\t{{.CreatedBy}}' balcao:local | head -12

docker scout quickview balcao:local            # resumo de vulnerabilidades por severidade
docker scout cves --only-severity critical,high balcao:local

# SBOM e proveniência como atestações da imagem, no build
docker buildx build --sbom=true --provenance=true -f docker/Dockerfile -t balcao:local .`,
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Uma CVE crítica na base não é uma emergência por omissão',
        text:
          'O scanner vai reportar CVEs em pacotes Debian da base que o «Balcão» nunca executa. A política da plataforma distingue: crítica com correcção disponível num pacote usado, bloqueia o build; crítica sem correcção ou em pacote não alcançável, entra num registo de excepções revisto todos os meses; o resto é resolvido pelo PR automático de actualização do digest da base. Uma regra que bloqueia tudo é desligada na segunda semana.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Docker — Volumes', url: 'https://docs.docker.com/engine/storage/volumes/' },
          { label: 'Compose — GPU support', url: 'https://docs.docker.com/compose/how-tos/gpu-support/' },
          { label: 'Docker Scout', url: 'https://docs.docker.com/scout/' },
          { label: 'Docker — SBOM attestations', url: 'https://docs.docker.com/build/metadata/attestations/sbom/' },
        ],
      },
    ],
  },
];
