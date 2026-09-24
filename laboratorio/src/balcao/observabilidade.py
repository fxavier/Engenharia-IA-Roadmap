"""Observabilidade: traços OpenTelemetry com as convenções `gen_ai.*` e métricas Prometheus (adr-0025).

Três perguntas que qualquer incidente faz, e onde a resposta está:

* **Quanto demorou e onde?** — spans `chat {modelo}` e `execute_tool {nome}`
  com os atributos da semconv GenAI (`gen_ai.operation.name`,
  `gen_ai.request.model`, `gen_ai.usage.input_tokens`, ...), e os histogramas
  `balcao_ttft_segundos` e `balcao_resposta_duracao_segundos` (RNF-01).
* **Quanto custou?** — `balcao_tokens_total` e `balcao_custo_mzn_total` por
  modelo, calculados com os preços de referência de `didactico.MODELOS` (RNF-02).
* **O que foi recusado?** — `balcao_recusas_total`, `balcao_ferramentas_total`
  por resultado e `balcao_injeccao_suspeitas_total` (RI-01, RI-02).

O `CallbackObservabilidade` liga isto ao LangChain sem tocar nas cadeias: é
passado em `config["callbacks"]` e vê todas as chamadas a modelos do turno.
Os textos das mensagens *não* vão para os spans (RNF-04): só tamanhos e contagens.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatGenerationChunk, GenerationChunk, LLMResult
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.trace import Span, Status, StatusCode
from prometheus_client import Counter, Histogram

from balcao import didactico

__all__ = [
    "CUSTO_MZN",
    "DURACAO",
    "FERRAMENTAS",
    "INJECCOES",
    "LIMITES",
    "RECUSAS",
    "TOKENS",
    "TTFT",
    "TTFT_MODELO",
    "CallbackObservabilidade",
    "configurar",
    "span_ferramenta",
    "tracer",
]

# Baldes pensados para o orçamento: TTFT alvo p95 < 1,5 s; resposta p95 < 5 s.
_BALDES_TTFT = (0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0)
_BALDES_DURACAO = (0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 13.0, 21.0)

TTFT = Histogram(
    "balcao_ttft_segundos", "Tempo até ao primeiro token visível ao cliente", ["rota"], buckets=_BALDES_TTFT
)
TTFT_MODELO = Histogram(
    "balcao_modelo_ttft_segundos", "Tempo até ao primeiro token do modelo", ["modelo"], buckets=_BALDES_TTFT
)
DURACAO = Histogram(
    "balcao_resposta_duracao_segundos", "Duração de um turno completo", ["rota"], buckets=_BALDES_DURACAO
)
TOKENS = Counter("balcao_tokens_total", "Tokens por modelo e tipo", ["modelo", "tipo"])
CUSTO_MZN = Counter("balcao_custo_mzn_total", "Custo de modelo em meticais", ["modelo"])
RECUSAS = Counter("balcao_recusas_total", "Respostas trocadas por recusa", ["motivo"])
FERRAMENTAS = Counter("balcao_ferramentas_total", "Chamadas de ferramentas", ["ferramenta", "resultado"])
INJECCOES = Counter("balcao_injeccao_suspeitas_total", "Mensagens com suspeita de prompt injection")
LIMITES = Counter("balcao_limite_ferramentas_total", "Turnos que esgotaram o orçamento de ferramentas")

tracer = trace.get_tracer("balcao")

_configurado = False


def configurar(servico: str = "balcao", versao: str = "0.1.0", consola: bool = False) -> None:
    """Instala o `TracerProvider`. Em produção junta-se um exportador OTLP (Langfuse, Tempo, ...)
    via `opentelemetry-exporter-otlp`; aqui só a consola, para ver os spans no laboratório."""
    global _configurado
    if _configurado:
        return
    provider = TracerProvider(resource=Resource.create({"service.name": servico, "service.version": versao}))
    if consola:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)
    _configurado = True


@contextmanager
def span_ferramenta(nome: str, chamada_id: str | None = None) -> Iterator[Span]:
    """Span `execute_tool` da semconv GenAI à volta de uma chamada de ferramenta."""
    with tracer.start_as_current_span(f"execute_tool {nome}") as span:
        span.set_attribute("gen_ai.operation.name", "execute_tool")
        span.set_attribute("gen_ai.tool.name", nome)
        if chamada_id:
            span.set_attribute("gen_ai.tool.call.id", chamada_id)
        yield span


class CallbackObservabilidade(BaseCallbackHandler):
    """Um span `chat` por chamada ao modelo, com tokens, custo e TTFT.

    `escaloes` mapeia o nome do modelo para o escalão de preço (`pequeno`,
    `medio`, `grande`, `local`) usado no custo em MZN.
    """

    def __init__(self, fornecedor: str, escaloes: dict[str, str] | None = None) -> None:
        self.fornecedor = fornecedor
        self.escaloes = escaloes or {}
        self._spans: dict[UUID, tuple[Span, float, str]] = {}
        self._primeiro: set[UUID] = set()

    def on_chat_model_start(
        self, serialized: dict[str, Any], messages: list[list[BaseMessage]], *, run_id: UUID, **kwargs: Any
    ) -> None:
        params = kwargs.get("invocation_params") or {}
        modelo = str(params.get("model") or params.get("model_name") or params.get("nome_modelo") or "desconhecido")
        span = tracer.start_span(f"chat {modelo}")
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.provider.name", self.fornecedor)
        span.set_attribute("gen_ai.request.model", modelo)
        if "temperature" in params:
            span.set_attribute("gen_ai.request.temperature", float(params["temperature"]))
        span.set_attribute("balcao.mensagens", sum(len(m) for m in messages))
        self._spans[run_id] = (span, time.perf_counter(), modelo)

    def on_llm_new_token(
        self,
        token: str | list[str | dict[str, Any]],
        *,
        chunk: GenerationChunk | ChatGenerationChunk | None = None,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        if run_id in self._spans and run_id not in self._primeiro and token:
            self._primeiro.add(run_id)
            _, t0, modelo = self._spans[run_id]
            TTFT_MODELO.labels(modelo=modelo).observe(time.perf_counter() - t0)

    def on_llm_end(self, response: LLMResult, *, run_id: UUID, **kwargs: Any) -> None:
        registo = self._spans.pop(run_id, None)
        self._primeiro.discard(run_id)
        if registo is None:
            return
        span, _, modelo = registo
        entrada = saida = 0
        for geracoes in response.generations:
            for g in geracoes:
                uso = getattr(getattr(g, "message", None), "usage_metadata", None) or {}
                entrada += int(uso.get("input_tokens", 0))
                saida += int(uso.get("output_tokens", 0))
        span.set_attribute("gen_ai.usage.input_tokens", entrada)
        span.set_attribute("gen_ai.usage.output_tokens", saida)
        span.set_attribute("gen_ai.response.model", modelo)
        TOKENS.labels(modelo=modelo, tipo="entrada").inc(entrada)
        TOKENS.labels(modelo=modelo, tipo="saida").inc(saida)
        custo = didactico.custo_mzn(entrada, saida, self.escaloes.get(modelo, "medio"))
        CUSTO_MZN.labels(modelo=modelo).inc(custo)
        span.set_attribute("balcao.custo_mzn", custo)
        span.end()

    def on_llm_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> None:
        registo = self._spans.pop(run_id, None)
        self._primeiro.discard(run_id)
        if registo is None:
            return
        span = registo[0]
        span.set_attribute("error.type", type(error).__name__)
        span.set_status(Status(StatusCode.ERROR, str(error)[:200]))
        span.end()
