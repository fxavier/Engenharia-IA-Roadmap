# Atalhos do laboratório do «Balcão». Tudo passa pelo uv: o mesmo ambiente no portátil, no CI e na imagem.
# `make` sem alvo mostra a ajuda.

.DEFAULT_GOAL := ajuda
.PHONY: ajuda instalar testes testes-pg lint formatar tipos evals evals-gate subir subir-ollama descer ingerir api mcp limpar

UV ?= uv

ajuda: ## Mostra esta ajuda
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

instalar: ## Cria o ambiente (.venv) com as dependências fixadas no uv.lock
	$(UV) sync --frozen
	uvx pre-commit install || true

testes: ## Corre os testes offline (modelo simulado, índice em memória)
	$(UV) run pytest

testes-pg: ## Corre também os testes de PostgreSQL (precisa de `make subir`)
	DATABASE_URL=postgresql://balcao:balcao@localhost:5432/balcao $(UV) run pytest -m postgres

lint: ## ruff (lint e formato) e mypy
	$(UV) run ruff check .
	$(UV) run ruff format --check .
	$(UV) run mypy

formatar: ## Formata e corrige o que o ruff sabe corrigir
	$(UV) run ruff format .
	$(UV) run ruff check --fix .

tipos: ## Só o mypy
	$(UV) run mypy

evals: ## Conjunto dourado e red team, com relatório em relatorios/
	$(UV) run python -m balcao.avaliacao.correr --conjunto todos

evals-gate: ## Como no CI: falha abaixo dos limiares
	$(UV) run python -m balcao.avaliacao.correr --conjunto todos --gate

subir: ## API + PostgreSQL com pgvector (modelo simulado)
	docker compose up -d --build --wait

subir-ollama: ## API + PostgreSQL + Ollama com llama3.2:3b e nomic-embed-text
	BALCAO_MODELO_FORNECEDOR=ollama docker compose --profile ollama up -d --build --wait

descer: ## Pára os contentores (os volumes ficam)
	docker compose --profile ollama --profile ingestao down

ingerir: ## Ingere o corpus no PostgreSQL do compose (idempotente)
	docker compose --profile ingestao run --rm ingest

api: ## API local sem Docker, com recarga
	$(UV) run uvicorn balcao.api.app:create_app --factory --reload --port 8000

mcp: ## Servidor MCP por stdio (para ligar a um cliente MCP)
	$(UV) run python -m balcao.mcp_servidor

limpar: ## Apaga caches e relatórios gerados
	rm -rf .pytest_cache .ruff_cache .mypy_cache relatorios
	find . -name __pycache__ -type d -prune -exec rm -rf {} +
