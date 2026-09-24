"""A aplicação FastAPI do «Balcão»: `create_app()` e o ciclo de vida dos recursos (adr-0001).

O `lifespan` monta tudo uma vez por processo — modelos, índice, cadeia, grafo,
pools de ligações — e fecha-o por ordem inversa ao terminar. Nenhum pedido
paga o custo de criar um cliente HTTP ou uma ligação à base de dados.

Com `DATABASE_URL`: índice no pgvector, checkpoints no PostgreSQL
(`AsyncPostgresSaver`, adr-0014) e conversas nas tabelas do esquema. Sem ela:
tudo em memória, com o corpus ingerido no arranque — o modo dos testes.

Uso: `uvicorn balcao.api.app:create_app --factory --host 0.0.0.0 --port 8000`.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langgraph.checkpoint.memory import InMemorySaver
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

from balcao import observabilidade
from balcao.api.esquemas import EstadoIngestao, Problema
from balcao.api.repositorio import Repositorio, RepositorioMemoria, RepositorioPostgres
from balcao.api.rotas import ErroProblema, router
from balcao.config import Configuracao, obter_config
from balcao.grafo import Sistema, montar_sistema
from balcao.modelos import escalao_de, nome_modelo

__all__ = ["Servicos", "create_app"]

log = logging.getLogger(__name__)


@dataclass
class Servicos:
    """O que as rotas usam. Vive em `app.state.servicos` durante a vida do processo."""

    cfg: Configuracao
    sistema: Sistema
    grafo: Any
    repo: Repositorio
    callbacks: list[Any]
    nome_modelo: str
    ingestoes: dict[str, EstadoIngestao] = field(default_factory=dict)


@asynccontextmanager
async def _ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
    cfg: Configuracao = app.state.cfg
    observabilidade.configurar("balcao", cfg.versao, consola=cfg.otel_consola)
    async with AsyncExitStack() as pilha:
        # Montar o sistema faz I/O síncrono (pool do índice, ingestão em memória).
        sistema = await run_in_threadpool(montar_sistema, cfg)
        repo: Repositorio
        if cfg.usa_postgres:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from psycopg.rows import dict_row
            from psycopg_pool import AsyncConnectionPool

            # O checkpointer quer autocommit e sem prepared statements (compatível com PgBouncer).
            pool = AsyncConnectionPool(
                cfg.conninfo,
                min_size=cfg.pool_min,
                max_size=cfg.pool_max,
                open=False,
                name="balcao-checkpoints",
                kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
            )
            await pool.open()
            pilha.push_async_callback(pool.close)
            checkpointer: Any = AsyncPostgresSaver(pool)  # type: ignore[arg-type]
            await checkpointer.setup()  # cria as tabelas de checkpoints se não existirem
            repo_pg = RepositorioPostgres(cfg.conninfo, cfg.pool_min, cfg.pool_max)
            pilha.callback(repo_pg.fechar)
            fechar_indice = getattr(sistema.indice, "fechar", None)
            if callable(fechar_indice):
                pilha.callback(fechar_indice)
            repo = repo_pg
        else:
            checkpointer = InMemorySaver()
            repo = RepositorioMemoria()

        escaloes = {nome_modelo(cfg, p): escalao_de(p, cfg.modelo_fornecedor) for p in ("classificar", "responder")}
        app.state.servicos = Servicos(
            cfg=cfg,
            sistema=sistema,
            grafo=sistema.compilar(checkpointer),
            repo=repo,
            callbacks=[observabilidade.CallbackObservabilidade(cfg.modelo_fornecedor, escaloes)],
            nome_modelo=nome_modelo(cfg, "responder"),
        )
        log.info("balcão pronto: fornecedor=%s, postgres=%s", cfg.modelo_fornecedor, cfg.usa_postgres)
        yield


def _problema(status: int, title: str, detail: str | None, request: Request, tipo: str = "about:blank") -> JSONResponse:
    corpo = Problema(type=tipo, title=title, status=status, detail=detail, instance=str(request.url.path))
    return JSONResponse(corpo.model_dump(exclude_none=True), status_code=status, media_type="application/problem+json")


def create_app(cfg: Configuracao | None = None) -> FastAPI:
    """Fábrica da aplicação. Nos testes passa-se uma `Configuracao` explícita."""
    cfg = cfg or obter_config()
    app = FastAPI(
        title="Balcão",
        summary="Assistente de suporte ao cliente do Chega",
        version=cfg.versao,
        lifespan=_ciclo_de_vida,
    )
    app.state.cfg = cfg
    if cfg.cors_origens:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cfg.cors_origens,
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @app.exception_handler(ErroProblema)
    async def _erro_problema(request: Request, exc: ErroProblema) -> JSONResponse:
        return _problema(exc.status_code, exc.title, exc.detail, request, exc.tipo)

    @app.exception_handler(RequestValidationError)
    async def _erro_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
        campos = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
        return _problema(422, "Pedido inválido", campos, request)

    @app.exception_handler(StarletteHTTPException)
    async def _erro_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _problema(exc.status_code, str(exc.detail), None, request)

    @app.exception_handler(Exception)
    async def _erro_interno(request: Request, exc: Exception) -> JSONResponse:
        log.exception("erro não tratado em %s", request.url.path)
        return _problema(500, "Erro interno", None, request)

    app.include_router(router)
    return app
