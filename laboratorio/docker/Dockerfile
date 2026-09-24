# syntax=docker/dockerfile:1.7
# Imagem do «Balcão» (adr-0022): multi-stage com uv, dependências fixadas pelo uv.lock,
# utilizador não-root e nenhum segredo lá dentro (vêm do ambiente em tempo de execução).
#
#   docker build -f docker/Dockerfile -t balcao:local .
#
# Fase 1 (build): resolve e instala as dependências a partir do uv.lock (`--frozen`: se o
# lock não bater com o pyproject.toml, o build falha em vez de resolver outra coisa).
# Fase 2 (runtime): python:3.13-slim só com o .venv, os prompts e os dados. Sem uv, sem
# compiladores, sem cache de pip: menos superfície e uma imagem ≈ 3× mais pequena.

ARG PYTHON_VERSION=3.13

FROM ghcr.io/astral-sh/uv:0.9 AS uv

# ------------------------------------------------------------------------ build
FROM python:${PYTHON_VERSION}-slim AS build

COPY --from=uv /uv /uvx /bin/

# Bytecode compilado na imagem (arranque mais rápido); cópia em vez de hardlinks (a cache
# é um mount); nunca descarregar outro Python: usa o da imagem base.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# 1) Só as dependências. Esta camada fica em cache enquanto o uv.lock não mudar:
#    mexer no código não volta a descarregar o LangChain.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev --no-install-project

# 2) O projecto em si, instalado como pacote (não editável: o código-fonte não segue para o runtime).
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

# ---------------------------------------------------------------------- runtime
FROM python:${PYTHON_VERSION}-slim AS runtime

LABEL org.opencontainers.image.title="balcao" \
      org.opencontainers.image.description="Assistente de suporte ao cliente do Chega" \
      org.opencontainers.image.licenses="MIT"

# Utilizador sem privilégios, com uid fixo (as políticas do cluster verificam runAsNonRoot).
RUN groupadd --system --gid 10001 balcao \
 && useradd --system --uid 10001 --gid balcao --home-dir /app --shell /usr/sbin/nologin balcao

WORKDIR /app

COPY --from=build --chown=balcao:balcao /app/.venv /app/.venv
COPY --chown=balcao:balcao prompts ./prompts
COPY --chown=balcao:balcao dados ./dados
COPY --chown=balcao:balcao sql ./sql

# O pacote está em site-packages: as pastas de prompts e dados são indicadas explicitamente.
ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    BALCAO_DIR_PROMPTS=/app/prompts \
    BALCAO_DIR_DADOS=/app/dados \
    BALCAO_DIR_RELATORIOS=/tmp/relatorios

USER balcao

EXPOSE 8000

# Vivacidade, não prontidão: /healthz não toca na base de dados (ver api/rotas.py).
# Sem curl na imagem slim; o Python que já lá está chega.
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2).status == 200 else 1)"]

# Um processo por contentor; escala-se com réplicas, não com workers. `--proxy-headers`
# porque em produção há um balanceador à frente.
CMD ["uvicorn", "balcao.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--timeout-graceful-shutdown", "20"]
