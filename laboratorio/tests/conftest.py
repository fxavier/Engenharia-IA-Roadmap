"""Fixtures partilhadas. Tudo corre offline: modelo simulado, índice em memória, sem PostgreSQL.

Os testes marcados `postgres` precisam de `DATABASE_URL` (o serviço do CI) e
são saltados sem ela.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from langchain_core.messages import HumanMessage

from balcao.config import Configuracao
from balcao.grafo import Sistema, config_de_execucao, montar_sistema
from balcao.ingestao import carregar_corpus, ingerir
from balcao.modelos import criar_embeddings, nome_embeddings
from balcao.recuperacao import IndiceMemoria

TOKENS = {
    "tok-aida": "cliente:CL-77120",
    "tok-nelson": "cliente:CL-40311",
    "tok-graca": "cliente:CL-90004",
    "tok-supervisor": "supervisor",
    "tok-operador": "operador",
}


def criar_cfg(tmp: Path, **extra: Any) -> Configuracao:
    """Configuração de teste: ignora o `.env` e o ambiente onde isso importa."""
    base: dict[str, Any] = {
        "_env_file": None,
        "modelo_fornecedor": "simulado",
        "embeddings_fornecedor": "simulado",
        "database_url": None,
        "tokens_api": TOKENS,
        "dir_relatorios": tmp / "relatorios",
    }
    return Configuracao(**(base | extra))


@pytest.fixture
def cfg(tmp_path: Path) -> Configuracao:
    return criar_cfg(tmp_path)


@pytest.fixture(scope="session")
def indice_partilhado(tmp_path_factory: pytest.TempPathFactory) -> IndiceMemoria:
    """O corpus indexado uma vez por sessão. Só para leitura: quem escreve cria o seu."""
    c = criar_cfg(tmp_path_factory.mktemp("idx"))
    emb = criar_embeddings(c)
    indice = IndiceMemoria(emb, k_rrf=c.k_rrf)
    ingerir(carregar_corpus(), indice, c, nome_embeddings(c))
    return indice


@pytest.fixture
def sistema(cfg: Configuracao, indice_partilhado: IndiceMemoria) -> Sistema:
    """Sistema completo com um `Mundo` novo por teste (reembolsos, cupões e aprovações não vazam)."""
    return montar_sistema(cfg, indice=indice_partilhado)


@pytest.fixture
def grafo(sistema: Sistema) -> Any:
    return sistema.compilar()


@pytest.fixture
def turno(grafo: Any, cfg: Configuracao) -> Any:
    """`turno(fio, cliente, texto)` corre um turno do grafo e devolve o estado final."""

    def _turno(fio: str, cliente: str, texto: str) -> dict[str, Any]:
        return grafo.invoke(  # type: ignore[no-any-return]
            {"messages": [HumanMessage(texto)], "cliente_id": cliente},
            config_de_execucao(fio, cliente, cfg),
        )

    return _turno


@pytest.fixture
def database_url() -> Iterator[str]:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("sem DATABASE_URL: teste de PostgreSQL saltado")
    yield url
