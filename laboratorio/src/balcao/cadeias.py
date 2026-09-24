"""A cadeia RAG em LCEL: reformular → recuperar → contexto → prompt → modelo → validar.

Cada passo é um `Runnable`, por isso a cadeia inteira herda `invoke`, `stream`,
`batch`, as versões assíncronas, os callbacks e o traço (adr-0012). A recusa é
uma decisão da cadeia e não do modelo (adr-0011): se o melhor excerto ficar
abaixo de `limiar_relevancia`, a cadeia responde com a recusa sem gastar uma
chamada ao modelo; se o modelo responder sem citação válida, a guarda de saída
troca a resposta pela recusa.

O prompt de sistema vem de `prompts/sistema.md`, versionado com o código
(adr-0023). O contexto vai delimitado por `<contexto>` e marcado com o id de
cada fonte: é assim que o modelo sabe o que citar e que o texto é dados.
"""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from functools import lru_cache
from operator import itemgetter
from pathlib import Path
from typing import Any

from langchain_core.documents import Document
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import Runnable, RunnableBranch, RunnableLambda, RunnablePassthrough

from balcao import didactico
from balcao.config import Configuracao
from balcao.guardas import RECUSA, validar_saida
from balcao.recuperacao import RecuperadorHibrido

__all__ = [
    "NOME_CADEIA",
    "Prompt",
    "carregar_prompt",
    "criar_cadeia_rag",
    "criar_prompt_rag",
    "formatar_contexto",
    "reformular_heuristica",
    "transmitir_rag",
]

NOME_CADEIA = "cadeia_rag"


# =================================================================== prompts


@dataclass(frozen=True)
class Prompt:
    nome: str
    versao: str
    texto: str

    @property
    def etiqueta(self) -> str:
        """`sistema@1.4.0` — vai para os traços e para o relatório de avaliação (RNF-06)."""
        return f"{self.nome}@{self.versao}"


@lru_cache(maxsize=16)
def carregar_prompt(nome: str, pasta: Path) -> Prompt:
    """Lê `prompts/<nome>.md` com o cabeçalho `---\\nversao: x.y.z\\n---`."""
    bruto = (pasta / f"{nome}.md").read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", bruto, re.S)
    if not m:
        raise ValueError(f"prompts/{nome}.md sem cabeçalho de versão")
    cab = dict(linha.split(":", 1) for linha in m.group(1).splitlines() if ":" in linha)
    versao = cab.get("versao", "").strip()
    if not versao:
        raise ValueError(f"prompts/{nome}.md sem `versao`")
    return Prompt(nome=nome, versao=versao, texto=m.group(2).strip())


def criar_prompt_rag(sistema: Prompt) -> ChatPromptTemplate:
    """Sistema fixo (uma `SystemMessage` não é template: chavetas no texto não partem nada),
    histórico recente, e a pergunta com o contexto delimitado."""
    return ChatPromptTemplate.from_messages(
        [
            SystemMessage(content=sistema.texto),
            MessagesPlaceholder("historico", optional=True),
            ("human", "<contexto>\n{contexto}\n</contexto>\n\nPergunta: {pergunta}"),
        ]
    )


# ================================================================ passos


def formatar_contexto(documentos: Sequence[Document]) -> str:
    """Um excerto por linha, marcado com o id do documento: `[pol-reembolso] texto`."""
    return "\n".join(f"[{d.metadata['documento_id']}] {d.page_content.strip()}" for d in documentos)


def reformular_heuristica(pergunta: str, historico: Sequence[BaseMessage]) -> str:
    """Pergunta autónoma para pesquisa, sem modelo.

    «E no cartão?» sozinha não recupera nada; junta-se à última pergunta do
    cliente. Sem histórico, a pergunta é a consulta — e poupa-se uma chamada.
    """
    pergunta = re.sub(r"\[[A-Z_]+\]", " ", pergunta).strip()  # marcas de PII não são termos de pesquisa
    if not historico or len(didactico.radicais(pergunta)) >= 4:
        return pergunta
    anteriores = [m.text for m in historico if isinstance(m, HumanMessage)]
    return f"{anteriores[-1]} {pergunta}" if anteriores else pergunta


_PROMPT_REFORMULAR = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Reescreve a última pergunta do cliente como uma pergunta autónoma para pesquisar nas políticas do Chega. "
            "Usa o histórico só para resolver referências («e no cartão?»). Devolve apenas a pergunta.",
        ),
        MessagesPlaceholder("historico"),
        ("human", "{pergunta}"),
    ]
)


def _reformulador(modelo: BaseChatModel | None) -> Runnable[dict[str, Any], str]:
    """Com um modelo real e histórico, pede ao escalão pequeno; nos outros casos, heurística."""
    heuristica: Runnable[dict[str, Any], str] = RunnableLambda(
        lambda x: reformular_heuristica(x["pergunta"], x.get("historico") or [])
    )
    if modelo is None or getattr(modelo, "_llm_type", "") == "balcao-simulado":
        return heuristica
    com_modelo = _PROMPT_REFORMULAR | modelo | StrOutputParser()
    return RunnableBranch((lambda x: bool(x.get("historico")), com_modelo), heuristica)


def _recusar(x: dict[str, Any]) -> dict[str, Any]:
    return {**x, "resposta": RECUSA, "citacoes": [], "recusa": True, "motivo": "sem_relevancia"}


def _validar(x: dict[str, Any]) -> dict[str, Any]:
    permitidas = {d.metadata["documento_id"]: d.metadata for d in x["documentos"]}
    r = validar_saida(x["resposta"], permitidas, exigir_citacao=True)
    return {
        **x,
        "resposta": r.texto,
        "citacoes": r.citacoes,
        "citacoes_removidas": r.removidas,
        "recusa": r.sem_suporte or r.texto == RECUSA,
        "motivo": "sem_citacao" if r.sem_suporte else ("recusa_modelo" if r.texto == RECUSA else ""),
    }


# ================================================================= a cadeia


def criar_cadeia_rag(
    modelo: BaseChatModel,
    recuperador: RecuperadorHibrido,
    cfg: Configuracao,
    sistema: Prompt | None = None,
    modelo_reformular: BaseChatModel | None = None,
) -> Runnable[dict[str, Any], dict[str, Any]]:
    """Entrada `{"pergunta", "historico"?}`; saída com `resposta`, `citacoes`, `documentos`, `consulta`, `recusa`.

    ```
    pergunta ─► reformular ─► recuperar (híbrido + re-rank) ─┬─► score < limiar ─► recusa
                                                             └─► contexto ─► prompt ─► modelo ─► validar citações
    ```
    """
    sistema = sistema or carregar_prompt("sistema", cfg.dir_prompts)
    prompt = criar_prompt_rag(sistema)
    gerar = prompt | modelo | StrOutputParser()

    def irrelevante(x: dict[str, Any]) -> bool:
        docs: list[Document] = x["documentos"]
        return not docs or float(docs[0].metadata.get("score", 0.0)) < cfg.limiar_relevancia

    responder = (
        RunnablePassthrough.assign(contexto=lambda x: formatar_contexto(x["documentos"]))
        | RunnablePassthrough.assign(resposta=gerar)
        | RunnableLambda(_validar)
    )
    cadeia = (
        RunnablePassthrough.assign(consulta=_reformulador(modelo_reformular or modelo))
        | RunnablePassthrough.assign(documentos=itemgetter("consulta") | recuperador)
        | RunnableBranch((irrelevante, RunnableLambda(_recusar)), responder)
    )
    return cadeia.with_config(run_name=NOME_CADEIA, metadata={"prompt": sistema.etiqueta})


async def transmitir_rag(
    cadeia: Runnable[dict[str, Any], dict[str, Any]], entrada: dict[str, Any]
) -> AsyncIterator[dict[str, Any]]:
    """Streaming da cadeia: `{"tipo": "token", ...}` à medida que o modelo gera, e `{"tipo": "fim", ...}`.

    Usa `astream_events`: os tokens vêm do modelo *dentro* da cadeia, antes de a
    validação final correr. Por isso o evento `fim` traz o texto validado — se a
    guarda o alterou, o cliente substitui o que já mostrou.
    """
    async for ev in cadeia.astream_events(entrada, version="v2"):
        if ev["event"] == "on_chat_model_stream":
            texto = ev["data"]["chunk"].text
            if texto:
                yield {"tipo": "token", "texto": texto}
        elif ev["event"] == "on_chain_end" and ev["name"] == NOME_CADEIA:
            saida = ev["data"]["output"]
            yield {
                "tipo": "fim",
                "resposta": saida["resposta"],
                "citacoes": saida["citacoes"],
                "recusa": saida["recusa"],
            }
