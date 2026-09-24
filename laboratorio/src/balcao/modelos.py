"""Fábrica de modelos: a única porta entre o «Balcão» e os fornecedores (adr-0003).

O resto do código pede «o modelo que responde», «o que classifica» ou «o juiz»
(adr-0004) e recebe um `BaseChatModel` do LangChain — nunca importa um SDK de
fornecedor. Trocar de fornecedor é mudar `BALCAO_MODELO_FORNECEDOR`; o simulado
é o valor por omissão, para que nada precise de rede para arrancar (RE-03).

Regras aplicadas aqui, e não espalhadas pelo código:

* versão de modelo fixada nos fornecedores comerciais (nada de aliases móveis, RI-07);
* timeout e número de retentativas explícitos em todas as chamadas;
* temperatura 0 por omissão: queremos a resposta mais provável, não criatividade.
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from langchain.chat_models import init_chat_model
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from balcao.config import Configuracao
from balcao.simulado import ChatSimulado, EmbeddingsSimulados

__all__ = ["PapelModelo", "criar_embeddings", "criar_modelo", "escalao_de", "nome_modelo"]

log = logging.getLogger(__name__)

PapelModelo = Literal["responder", "classificar", "juiz"]

# Um identificador fixado tem uma data ou uma versão explícita (ex. `...-20250929`,
# `...-2025-08-07`). `latest`, ou um nome sem data, é um alias que muda sem aviso.
_RE_FIXADO = re.compile(r"(\d{8}|\d{4}-\d{2}-\d{2})$")


def nome_modelo(cfg: Configuracao, papel: PapelModelo) -> str:
    """O nome do modelo configurado para um papel (com os valores por omissão aplicados)."""
    if papel == "classificar":
        return cfg.modelo_classificar or cfg.modelo_chat
    if papel == "juiz":
        return cfg.modelo_juiz or cfg.modelo_chat
    return cfg.modelo_chat


def escalao_de(papel: PapelModelo, fornecedor: str) -> str:
    """Escalão de preço (de `didactico.MODELOS`) usado para contabilizar o custo."""
    if fornecedor in ("simulado", "ollama"):
        return "local"
    return {"classificar": "pequeno", "responder": "medio", "juiz": "grande"}[papel]


def _verificar_fixado(cfg: Configuracao, nome: str) -> None:
    if cfg.permitir_alias_modelo or _RE_FIXADO.search(nome):
        return
    raise ValueError(
        f"O modelo {nome!r} não tem versão fixada. Usa o identificador com data da página do fornecedor "
        "(ou BALCAO_PERMITIR_ALIAS_MODELO=true, só em desenvolvimento)."
    )


def criar_modelo(cfg: Configuracao, papel: PapelModelo = "responder") -> BaseChatModel:
    """Devolve o modelo de chat para `papel`, já com timeout, retentativas e temperatura."""
    fornecedor = cfg.modelo_fornecedor
    nome = nome_modelo(cfg, papel)
    max_tokens = 64 if papel == "classificar" else cfg.max_tokens_resposta

    if fornecedor == "simulado":
        return ChatSimulado(nome_modelo=f"balcao-sim-{papel}")

    if fornecedor == "ollama":
        # O cliente do Ollama é httpx: o timeout vai em `client_kwargs`.
        return init_chat_model(
            nome,
            model_provider="ollama",
            base_url=cfg.ollama_base_url,
            temperature=cfg.temperatura,
            num_ctx=8192,
            num_predict=max_tokens,
            client_kwargs={"timeout": cfg.timeout_modelo_s},
        )

    _verificar_fixado(cfg, nome)
    if fornecedor == "anthropic":
        if cfg.anthropic_api_key is None:
            raise ValueError("ANTHROPIC_API_KEY em falta para o fornecedor anthropic")
        return init_chat_model(
            nome,
            model_provider="anthropic",
            api_key=cfg.anthropic_api_key.get_secret_value(),
            temperature=cfg.temperatura,
            max_tokens=max_tokens,
            timeout=cfg.timeout_modelo_s,
            max_retries=cfg.max_retries_modelo,
        )
    if fornecedor == "openai":
        if cfg.openai_api_key is None:
            raise ValueError("OPENAI_API_KEY em falta para o fornecedor openai")
        return init_chat_model(
            nome,
            model_provider="openai",
            api_key=cfg.openai_api_key.get_secret_value(),
            temperature=cfg.temperatura,
            max_tokens=max_tokens,
            timeout=cfg.timeout_modelo_s,
            max_retries=cfg.max_retries_modelo,
        )
    raise ValueError(f"fornecedor desconhecido: {fornecedor}")


def criar_embeddings(cfg: Configuracao) -> Embeddings:
    """Modelo de embeddings (adr-0007). A dimensão tem de bater com `vector(768)` do esquema."""
    fornecedor = cfg.fornecedor_embeddings
    if fornecedor == "simulado":
        return EmbeddingsSimulados(dim=cfg.dim_embeddings)
    if fornecedor == "ollama":
        from langchain_ollama import OllamaEmbeddings

        # nomic-embed-text devolve 768 dimensões; outro modelo obriga a reindexar.
        return OllamaEmbeddings(
            model=cfg.modelo_embeddings,
            base_url=cfg.ollama_base_url,
            client_kwargs={"timeout": cfg.timeout_modelo_s},
        )
    if fornecedor == "openai":
        from langchain_openai import OpenAIEmbeddings

        if cfg.openai_api_key is None:
            raise ValueError("OPENAI_API_KEY em falta para embeddings openai")
        # `dimensions` encurta o vector no servidor para caber na coluna de 768.
        return OpenAIEmbeddings(
            model=cfg.modelo_embeddings,
            dimensions=cfg.dim_embeddings,
            openai_api_key=cfg.openai_api_key,
            request_timeout=cfg.timeout_modelo_s,
            max_retries=cfg.max_retries_modelo,
        )
    raise ValueError(f"fornecedor de embeddings desconhecido: {fornecedor}")


def nome_embeddings(cfg: Configuracao) -> str:
    """Identificador guardado em cada chunk (`modelo_embedding`): vectores de modelos diferentes não se comparam."""
    if cfg.fornecedor_embeddings == "simulado":
        return f"balcao-hash-{cfg.dim_embeddings}"
    return f"{cfg.fornecedor_embeddings}:{cfg.modelo_embeddings}"
