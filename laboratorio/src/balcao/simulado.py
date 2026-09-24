"""Modelo de chat e embeddings simulados, com a interface do LangChain.

Embrulham o runtime didáctico (`balcao.didactico`) para que o grafo, a cadeia
RAG, a API e a avaliação corram sem rede, sem chave e sem Ollama — nos testes,
no CI e no primeiro `docker compose up` (RE-03). São deterministas: a mesma
conversa dá sempre a mesma resposta, o que permite testar comportamento exacto.

O `ChatSimulado` suporta `bind_tools` e devolve `tool_calls` com o formato do
LangChain; o `ToolNode` do LangGraph não distingue este modelo de um real.
"""

from __future__ import annotations

import json
import re
import uuid
from collections.abc import Callable, Iterator, Sequence
from typing import Any

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel, LanguageModelInput
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool
from pydantic import ConfigDict, Field, PrivateAttr

from balcao import didactico

__all__ = ["ChatSimulado", "EmbeddingsSimulados"]

_RE_PALAVRA = re.compile(r"\S+\s*")


def _para_didactico(m: BaseMessage) -> dict[str, Any]:
    """Converte uma mensagem LangChain no dicionário que o `ModeloSimulado` lê."""
    texto = m.content if isinstance(m.content, str) else m.text
    if isinstance(m, SystemMessage):
        return {"role": "system", "content": texto}
    if isinstance(m, HumanMessage):
        return {"role": "user", "content": texto}
    if isinstance(m, ToolMessage):
        return {"role": "tool", "name": m.name or "", "content": texto}
    return {"role": "assistant", "content": texto}


def _esquema_ferramenta(f: dict[str, Any] | type | Callable[..., Any] | BaseTool) -> dict[str, Any]:
    """Esquema no formato comum (nome, descrição, parâmetros) a partir de uma ferramenta LangChain."""
    fn = convert_to_openai_tool(f)["function"]
    return {"name": fn["name"], "description": fn.get("description", ""), "input_schema": fn.get("parameters", {})}


class ChatSimulado(BaseChatModel):
    """`BaseChatModel` determinista sobre `didactico.ModeloSimulado`.

    Com contexto RAG (`<contexto>` na última mensagem) responde por extracção e
    cita a fonte; com ferramentas ligadas e um número de pedido na mensagem,
    pede `ler_pedido` ou `calcular_reembolso`; depois de um resultado de
    ferramenta, redige a resposta a partir dele.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    nome_modelo: str = Field(default="balcao-sim-1")
    limiar: float = 0.3
    max_frases: int = 2
    _motor: didactico.ModeloSimulado = PrivateAttr()

    def model_post_init(self, __context: Any) -> None:
        self._motor = didactico.ModeloSimulado(self.nome_modelo, self.limiar, self.max_frases)

    @property
    def _llm_type(self) -> str:
        return "balcao-simulado"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {"model_name": self.nome_modelo}

    def bind_tools(
        self,
        tools: Sequence[dict[str, Any] | type | Callable[..., Any] | BaseTool],
        *,
        tool_choice: str | None = None,
        **kwargs: Any,
    ) -> Runnable[LanguageModelInput, AIMessage]:
        """Liga as ferramentas como os modelos reais: ficam nos kwargs de cada chamada."""
        return self.bind(tools=[_esquema_ferramenta(t) for t in tools], **kwargs)

    # ------------------------------------------------------------------ geração

    def _responder(self, messages: list[BaseMessage], tools: list[dict[str, Any]] | None) -> AIMessage:
        r = self._motor.gerar([_para_didactico(m) for m in messages], tools or None)
        uso = {
            "input_tokens": r.uso.get("entrada", 0),
            "output_tokens": r.uso.get("saida", 0),
            "total_tokens": r.uso.get("entrada", 0) + r.uso.get("saida", 0),
        }
        chamadas = [
            {"name": c["name"], "args": c["arguments"], "id": f"call_{uuid.uuid4().hex[:12]}", "type": "tool_call"}
            for c in r.chamadas
        ]
        return AIMessage(
            content=r.texto,
            tool_calls=chamadas,
            usage_metadata=uso,
            response_metadata={"model_name": self.nome_modelo, "stop_reason": r.paragem},
        )

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        msg = self._responder(messages, kwargs.get("tools"))
        return ChatResult(generations=[ChatGeneration(message=msg)])

    def _stream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        """Palavra a palavra, como chegaria de um fornecedor por SSE."""
        msg = self._responder(messages, kwargs.get("tools"))
        if msg.tool_calls:
            chunk = AIMessageChunk(
                content="",
                tool_call_chunks=[
                    {
                        "name": c["name"],
                        "args": json.dumps(c["args"]),
                        "id": c["id"],
                        "index": i,
                        "type": "tool_call_chunk",
                    }
                    for i, c in enumerate(msg.tool_calls)
                ],
                usage_metadata=msg.usage_metadata,
                response_metadata=msg.response_metadata,
            )
            yield ChatGenerationChunk(message=chunk)
            return
        palavras = _RE_PALAVRA.findall(str(msg.content)) or [""]
        for i, p in enumerate(palavras):
            ultimo = i == len(palavras) - 1
            chunk = AIMessageChunk(
                content=p,
                usage_metadata=msg.usage_metadata if ultimo else None,
                response_metadata=msg.response_metadata if ultimo else {},
            )
            # O `BaseChatModel` chama `on_llm_new_token` por cada pedaço; não se repete aqui.
            yield ChatGenerationChunk(message=chunk)


class EmbeddingsSimulados(Embeddings):
    """Embeddings por hashing do runtime didáctico, na dimensão do esquema (768).

    Não são semânticos como os de um modelo neuronal — só conhecem os sinónimos
    que o `didactico` lhes deu —, mas têm norma 1, são deterministas e cabem na
    mesma coluna `vector(768)` que o `nomic-embed-text` usa em produção.
    """

    def __init__(self, dim: int = 768, nome: str = "balcao-hash-768") -> None:
        self.dim = dim
        self.nome = nome

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [didactico.embed(t, self.dim).tolist() for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return didactico.embed(text, self.dim).tolist()
