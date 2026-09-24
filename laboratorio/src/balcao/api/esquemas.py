"""Esquemas Pydantic da API: o contrato HTTP do «Balcão».

Tudo o que entra é validado aqui (tamanhos máximos incluídos: uma mensagem de
50 000 caracteres é um ataque ao orçamento de tokens, não uma pergunta). Tudo o
que sai tem um modelo, para que o OpenAPI gerado em `/docs` seja o contrato.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "Aprovacao",
    "Conversa",
    "ConversaDetalhe",
    "CriarConversa",
    "Decisao",
    "DocumentoEntrada",
    "EnviarMensagem",
    "EstadoAvaliacao",
    "EstadoIngestao",
    "Feedback",
    "FeedbackRegistado",
    "Mensagem",
    "PedidoAvaliacao",
    "PedidoIngestao",
    "PedidoPesquisa",
    "Problema",
    "ResultadoDecisao",
    "ResultadoPesquisa",
    "Saude",
]

Canal = Literal["app", "whatsapp"]


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# ------------------------------------------------------------------ conversas


class CriarConversa(_Base):
    canal: Canal = "app"


class Conversa(BaseModel):
    id: str
    cliente_id: str
    canal: Canal
    estado: Literal["aberta", "a_aguardar_aprovacao", "escalada", "fechada"] = "aberta"
    criada_em: datetime


class EnviarMensagem(_Base):
    texto: str = Field(min_length=1, max_length=2000, examples=["O meu pedido PD-8842507 ainda vai demorar muito?"])


class Mensagem(BaseModel):
    id: str
    conversa_id: str
    papel: Literal["cliente", "assistente"]
    texto: str
    """Já mascarado: a API nunca guarda nem devolve dados pessoais em claro (RNF-04)."""
    citacoes: list[str] = Field(default_factory=list)
    intencao: str | None = None
    criada_em: datetime
    meta: dict[str, Any] = Field(default_factory=dict)


class ConversaDetalhe(Conversa):
    mensagens: list[Mensagem]
    aprovacao_pendente: str | None = None


class Feedback(_Base):
    mensagem_id: str
    util: bool
    comentario: str | None = Field(default=None, max_length=500)


class FeedbackRegistado(BaseModel):
    id: str
    mensagem_id: str
    util: bool


# ------------------------------------------------------------------ pesquisa


class PedidoPesquisa(_Base):
    consulta: str = Field(min_length=2, max_length=300)
    k: int = Field(default=4, ge=1, le=20)
    incluir_internos: bool = Field(default=False, description="Só para o papel operador.")


class ResultadoPesquisa(BaseModel):
    documento_id: str
    chunk_id: str
    titulo: str
    texto: str
    publico: str
    score: float
    score_rrf: float


# ------------------------------------------------------------------ ingestão


class DocumentoEntrada(_Base):
    id: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)+$", max_length=80)
    titulo: str = Field(max_length=200)
    categoria: str = Field(max_length=60)
    publico: Literal["cliente", "interno"]
    vigente: bool = True
    actualizado: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    texto: str = Field(min_length=10, max_length=50_000)


class PedidoIngestao(_Base):
    documentos: list[DocumentoEntrada] = Field(default_factory=list, max_length=500)
    incluir_corpus: bool = False


class EstadoIngestao(BaseModel):
    id: str
    estado: Literal["pendente", "a_correr", "concluida", "falhou"]
    criada_em: datetime
    relatorio: dict[str, Any] | None = None
    erro: str | None = None


# ----------------------------------------------------------------- aprovações


class Aprovacao(BaseModel):
    id: str
    conversa_id: str
    cliente_id: str
    pedido_id: str
    valor_mzn: int
    motivo: str
    estado: Literal["pendente", "aprovada", "recusada"]
    criada_em: datetime
    decidida_em: datetime | None = None
    revisor: str | None = None
    nota: str | None = None


class Decisao(_Base):
    aprovado: bool
    nota: str | None = Field(default=None, max_length=500)


class ResultadoDecisao(BaseModel):
    aprovacao: Aprovacao
    mensagem: Mensagem


# ----------------------------------------------------------------- avaliação


class PedidoAvaliacao(_Base):
    conjunto: Literal["dourado", "redteam", "todos"] = "dourado"
    limite: int | None = Field(default=None, ge=1, le=1000)


class EstadoAvaliacao(BaseModel):
    id: str
    estado: Literal["pendente", "a_correr", "concluida", "falhou"]
    conjunto: str
    criada_em: datetime
    metricas: dict[str, Any] | None = None
    gate_ok: bool | None = None
    erro: str | None = None


# -------------------------------------------------------------------- outros


class Saude(BaseModel):
    estado: Literal["ok", "degradado"]
    versao: str
    fornecedor: str
    detalhes: dict[str, Any] = Field(default_factory=dict)


class Problema(BaseModel):
    """RFC 9457 (Problem Details for HTTP APIs), servido como `application/problem+json`."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
