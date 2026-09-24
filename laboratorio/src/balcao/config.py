"""Configuração do «Balcão», lida do ambiente (prefixo `BALCAO_`) e do `.env`.

Uma só classe, validada no arranque: um valor inválido rebenta ao iniciar o
serviço e não à primeira conversa. Os segredos são `SecretStr`, para não
aparecerem em logs nem em `repr`. `DATABASE_URL`, `OLLAMA_BASE_URL` e as chaves
dos fornecedores aceitam também o nome sem prefixo, que é o que o Docker
Compose, o GitHub Actions e as bibliotecas dos fornecedores usam.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Fornecedor = Literal["simulado", "ollama", "anthropic", "openai"]
FornecedorEmbeddings = Literal["simulado", "ollama", "openai"]
Papel = Literal["cliente", "supervisor", "operador"]

# Raiz do laboratório (onde estão `prompts/`, `dados/` e `sql/`).
RAIZ = Path(__file__).resolve().parents[2]


class Configuracao(BaseSettings):
    """Tudo o que muda entre ambientes. O resto é código."""

    model_config = SettingsConfigDict(
        env_prefix="BALCAO_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,  # `Configuracao(database_url=...)` nos testes, além do alias do ambiente
    )

    ambiente: Literal["desenvolvimento", "ci", "producao"] = "desenvolvimento"
    versao: str = "0.1.0"

    # ------------------------------------------------------------ modelos (adr-0003, adr-0004)
    modelo_fornecedor: Fornecedor = "simulado"
    # Modelo que responde e decide ferramentas (escalão médio).
    modelo_chat: str = "llama3.2:3b"
    # Modelo que classifica e reformula (escalão pequeno). Vazio = o mesmo do chat.
    modelo_classificar: str = ""
    # Modelo juiz das avaliações (escalão grande, nunca o que responde; adr-0019).
    modelo_juiz: str = ""
    # Recusar aliases móveis («...-latest») nos fornecedores comerciais (RI-07).
    permitir_alias_modelo: bool = False

    embeddings_fornecedor: FornecedorEmbeddings | None = None
    modelo_embeddings: str = "nomic-embed-text"
    dim_embeddings: int = 768

    temperatura: float = 0.0
    max_tokens_resposta: int = 400
    timeout_modelo_s: float = 30.0
    max_retries_modelo: int = 2

    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias=AliasChoices("BALCAO_OLLAMA_BASE_URL", "OLLAMA_BASE_URL"),
    )
    anthropic_api_key: SecretStr | None = Field(
        default=None, validation_alias=AliasChoices("BALCAO_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY")
    )
    openai_api_key: SecretStr | None = Field(
        default=None, validation_alias=AliasChoices("BALCAO_OPENAI_API_KEY", "OPENAI_API_KEY")
    )

    # ---------------------------------------------------------------- dados (adr-0005, adr-0014)
    database_url: str | None = Field(default=None, validation_alias=AliasChoices("BALCAO_DATABASE_URL", "DATABASE_URL"))
    pool_min: int = 1
    pool_max: int = 10

    # ------------------------------------------------------------ recuperação (adr-0008, adr-0009)
    chunk_caracteres: int = 700
    chunk_sobreposicao: int = 100
    k_candidatos: int = 20
    k_contexto: int = 4
    k_rrf: int = 60
    # Abaixo deste score de re-ranking, a pergunta está fora do que a base cobre
    # e a cadeia recusa sem chamar o modelo (adr-0011). Calibrado no conjunto dourado.
    limiar_relevancia: float = 0.1
    ef_search: int = 100
    iterative_scan: bool = True
    # Ingerir o corpus de amostra no arranque se o índice estiver vazio (o `docker compose up`
    # do laboratório). Em produção fica false: a ingestão é um job próprio.
    ingerir_no_arranque: bool = False

    # --------------------------------------------------------------- agente (adr-0013, adr-0015)
    limite_reembolso_mzn: int = 500
    max_chamadas_ferramentas: int = 6
    recursion_limit: int = 25
    limiar_injeccao: float = 0.5

    # --------------------------------------------------------------------- memória (adr-0016)
    janela_tokens_historico: int = 1500
    mensagens_antes_de_resumir: int = 12

    # ------------------------------------------------------------------------- prompts
    dir_prompts: Path = RAIZ / "prompts"
    dir_dados: Path = RAIZ / "dados"
    dir_relatorios: Path = RAIZ / "relatorios"

    # ----------------------------------------------------------------- API e segurança
    # token -> "papel" ou "papel:cliente_id". Para o laboratório; em produção vem de um IdP (JWT).
    tokens_api: Annotated[dict[str, str], NoDecode] = Field(default_factory=dict)
    cors_origens: list[str] = Field(default_factory=list)

    # ------------------------------------------------------------ observabilidade (adr-0025)
    otel_consola: bool = False

    # ------------------------------------------------------------- gate de avaliação (adr-0018)
    gate_recall: float = 0.80
    gate_fidelidade: float = 0.85
    gate_recusa: float = 0.80
    gate_ferramentas: float = 0.90
    gate_redteam: float = 1.00

    @field_validator("tokens_api", mode="before")
    @classmethod
    def _tokens_de_texto(cls, v: object) -> object:
        """Aceita `tok1=cliente:CL-77120,tok2=supervisor` além de JSON."""
        if isinstance(v, str):
            if v.lstrip().startswith("{"):
                return json.loads(v)
            pares = (p.split("=", 1) for p in v.split(",") if "=" in p)
            return {k.strip(): val.strip() for k, val in pares}
        return v

    # ------------------------------------------------------------------------ derivados

    @property
    def fornecedor_embeddings(self) -> FornecedorEmbeddings:
        """A Anthropic não tem embeddings: com ela, os vectores vêm do Ollama."""
        if self.embeddings_fornecedor is not None:
            return self.embeddings_fornecedor
        if self.modelo_fornecedor == "anthropic":
            return "ollama"
        return self.modelo_fornecedor

    @property
    def usa_postgres(self) -> bool:
        return bool(self.database_url)

    @property
    def conninfo(self) -> str:
        """URL para o psycopg (sem o `+psycopg` do SQLAlchemy)."""
        if not self.database_url:
            raise ValueError("DATABASE_URL não está definido")
        return self.database_url.replace("postgresql+psycopg://", "postgresql://")


@lru_cache(maxsize=1)
def obter_config() -> Configuracao:
    """Configuração do processo. Nos testes, cria-se uma `Configuracao(...)` explícita."""
    return Configuracao()
