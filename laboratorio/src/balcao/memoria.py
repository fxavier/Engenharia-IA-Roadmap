"""Memória de conversa: janela recente mais resumo incremental (adr-0016).

O histórico inteiro volta ao modelo em cada turno, por isso cresce o custo e a
latência a cada mensagem (RI-06). A regra do «Balcão»:

* ao modelo vão só as mensagens mais recentes que cabem em
  `janela_tokens_historico`, cortadas numa fronteira de turno do cliente
  (`trim_messages` com `start_on="human"`), para nunca separar uma chamada de
  ferramenta do seu resultado;
* o que sai da janela é condensado num resumo que vai no prompt de sistema;
* não há memória pessoal de longo prazo: o resumo vive no checkpoint da
  conversa e morre com ela (retenção de 30 dias, adr-0028).
"""

from __future__ import annotations

import re
from collections.abc import Sequence

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    RemoveMessage,
    SystemMessage,
    ToolMessage,
    trim_messages,
)

from balcao import didactico

__all__ = ["contar_tokens", "janela", "mensagens_a_resumir", "resumir"]

_RE_PEDIDO = re.compile(r"\bPD-\d{7}\b")
_RE_VALOR = re.compile(r"\b\d[\d\s]*\s?MZN\b")


def contar_tokens(mensagens: Sequence[BaseMessage]) -> int:
    """Estimativa de 3,6 caracteres por token (português). Serve para orçamentos, não para facturas."""
    return sum(didactico.estimar_tokens(m.text or " ") + 4 for m in mensagens)


def janela(mensagens: Sequence[BaseMessage], max_tokens: int) -> list[BaseMessage]:
    """As mensagens mais recentes que cabem em `max_tokens`, a começar num turno do cliente."""
    return trim_messages(
        list(mensagens),
        max_tokens=max_tokens,
        token_counter=contar_tokens,
        strategy="last",
        start_on="human",
        include_system=True,
        allow_partial=False,
    )


def mensagens_a_resumir(mensagens: Sequence[BaseMessage], manter: int) -> list[BaseMessage]:
    """As mensagens antigas que saem, cortando antes de uma mensagem do cliente.

    Guarda pelo menos as `manter` últimas; recua o corte até um `HumanMessage`
    para que nenhum par chamada de ferramenta / resultado fique partido.
    """
    if len(mensagens) <= manter:
        return []
    corte = len(mensagens) - manter
    while corte > 0 and not isinstance(mensagens[corte], HumanMessage):
        corte -= 1
    return list(mensagens[:corte])


def _resumo_extractivo(anterior: str, antigas: Sequence[BaseMessage]) -> str:
    """Resumo determinista: pedidos referidos, valores falados e o último pedido do cliente."""
    texto = " ".join(m.text for m in antigas if not isinstance(m, ToolMessage))
    pedidos = sorted(set(_RE_PEDIDO.findall(texto) + _RE_PEDIDO.findall(anterior)))
    valores = list(dict.fromkeys(_RE_VALOR.findall(texto)))[:4]
    pedidos_cliente = [m.text for m in antigas if isinstance(m, HumanMessage)]
    partes = []
    if pedidos:
        partes.append(f"Pedidos referidos: {', '.join(pedidos)}.")
    if valores:
        partes.append(f"Valores já falados: {', '.join(v.strip() for v in valores)}.")
    if pedidos_cliente:
        partes.append(f"Último pedido do cliente antes desta janela: «{pedidos_cliente[-1][:160]}».")
    novo = " ".join(partes)
    return f"{anterior} {novo}".strip() if anterior else novo


_PROMPT_RESUMO = (
    "Actualiza o resumo de uma conversa de suporte do Chega. Mantém só factos úteis para continuar: "
    "números de pedido, o que o cliente pediu, o que já foi proposto ou feito, valores e decisões. "
    "Nada de dados pessoais. No máximo 80 palavras.\n\nResumo anterior:\n{anterior}\n\nMensagens novas:\n{novas}"
)


def resumir(anterior: str, antigas: Sequence[BaseMessage], modelo: BaseChatModel | None = None) -> str:
    """Resumo incremental: o anterior mais o que acabou de sair da janela.

    Sem modelo (ou com o simulado), usa o resumo extractivo; com um modelo real,
    pede ao escalão pequeno um resumo curto. Custa uma chamada a cada
    `mensagens_antes_de_resumir` mensagens, não uma por turno.
    """
    if not antigas:
        return anterior
    if modelo is None or getattr(modelo, "_llm_type", "") == "balcao-simulado":
        return _resumo_extractivo(anterior, antigas)
    novas = "\n".join(
        f"{'cliente' if isinstance(m, HumanMessage) else 'assistente'}: {m.text}"
        for m in antigas
        if isinstance(m, HumanMessage | AIMessage) and m.text
    )
    r = modelo.invoke([SystemMessage(_PROMPT_RESUMO.format(anterior=anterior or "(vazio)", novas=novas))])
    return r.text.strip()


def remover(mensagens: Sequence[BaseMessage]) -> list[RemoveMessage]:
    """Actualizações que o reducer `add_messages` interpreta como «apaga esta mensagem»."""
    return [RemoveMessage(id=str(m.id)) for m in mensagens if m.id]
