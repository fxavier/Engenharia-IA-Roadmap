"""Guardrails em camadas: entrada, ferramentas e saída (adr-0020, adr-0028).

* **Entrada** — mascarar dados pessoais antes de o texto chegar ao modelo, aos
  logs ou aos traços (RNF-04), e pontuar a probabilidade de prompt injection.
  A pontuação não bloqueia a conversa: tira as ferramentas de escrita do turno
  (ver `grafo.py`). É uma camada, nunca a defesa (RI-02).
* **Ferramentas** — os limites vivem no código das ferramentas (`ferramentas.py`),
  não aqui nem no prompt.
* **Saída** — cada citação tem de existir no contexto recuperado neste turno e
  de ser de um documento público e em vigor; uma resposta factual sem nenhuma
  citação válida é trocada por uma recusa (adr-0011).

Os detectores são os do runtime didáctico, para que o tutorial e o laboratório
mostrem exactamente o mesmo comportamento.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from balcao import didactico

__all__ = [
    "RECUSA",
    "AvaliacaoEntrada",
    "ResultadoSaida",
    "avaliar_entrada",
    "e_recusa",
    "extrair_citacoes",
    "mascarar",
    "validar_saida",
]

# A frase de recusa é fixa: o juiz, as métricas e o suporte reconhecem-na.
RECUSA = (
    "Não encontrei essa informação nas nossas políticas. Quer que passe a conversa a um colega da equipa de suporte?"
)

# Ids de documento: minúsculas com hífen (`pol-reembolso`). `[TELEFONE]` ou
# `[PD-8841273]` não são citações.
_RE_CITACAO = re.compile(r"\s?\[([a-z0-9]+(?:-[a-z0-9]+)+)\]")


@dataclass(frozen=True)
class AvaliacaoEntrada:
    texto: str
    """Texto já mascarado: é este que segue para o modelo e para os logs."""
    pii: tuple[str, ...]
    """Tipos de dados pessoais encontrados (nunca os valores)."""
    injeccao: float
    sinais: tuple[str, ...]
    suspeita: bool


def mascarar(texto: str) -> str:
    """Substitui telefones, emails, cartões (Luhn) e NUIT por `[TIPO]`."""
    return didactico.mascarar_pii(texto)


def avaliar_entrada(texto: str, limiar_injeccao: float = 0.5) -> AvaliacaoEntrada:
    """Primeira camada: corre em cada mensagem do cliente, em ≈ 1 ms, sem modelo."""
    pii = tuple(sorted({tipo for tipo, _ in didactico.detectar_pii(texto)}))
    inj = didactico.detectar_injeccao(texto)
    return AvaliacaoEntrada(
        texto=mascarar(texto),
        pii=pii,
        injeccao=float(inj["score"]),
        sinais=tuple(inj["sinais"]),
        suspeita=float(inj["score"]) >= limiar_injeccao,
    )


def extrair_citacoes(texto: str) -> list[str]:
    """Ids citados, pela ordem em que aparecem e sem repetições."""
    vistos: list[str] = []
    for m in _RE_CITACAO.finditer(texto):
        if m.group(1) not in vistos:
            vistos.append(m.group(1))
    return vistos


def e_recusa(texto: str) -> bool:
    """A resposta é uma recusa (não uma afirmação que precisa de fonte)?"""
    t = didactico.normalizar(texto)
    return "nao encontrei essa informacao" in t or "nao tenho essa informacao" in t


@dataclass
class ResultadoSaida:
    texto: str
    citacoes: list[str] = field(default_factory=list)
    removidas: list[str] = field(default_factory=list)
    sem_suporte: bool = False
    alterado: bool = False


def validar_saida(
    texto: str,
    permitidas: Mapping[str, Mapping[str, Any]],
    exigir_citacao: bool = True,
) -> ResultadoSaida:
    """Valida a resposta antes de ela chegar ao cliente.

    `permitidas` são os documentos recuperados *neste turno* (id → metadados).
    Uma citação só é válida se o id estiver lá **e** se o documento for
    `publico == "cliente"` e `vigente`. As inválidas são removidas do texto; se
    `exigir_citacao` e não sobrar nenhuma, a resposta passa a ser a recusa.
    """
    validas: list[str] = []
    removidas: list[str] = []
    for cid in extrair_citacoes(texto):
        meta = permitidas.get(cid)
        if meta is not None and meta.get("publico") == "cliente" and bool(meta.get("vigente")):
            validas.append(cid)
        else:
            removidas.append(cid)

    limpo = texto
    for cid in removidas:
        limpo = re.sub(rf"\s?\[{re.escape(cid)}\]", "", limpo)
    limpo = mascarar(limpo).strip()

    if exigir_citacao and not validas and not e_recusa(limpo):
        return ResultadoSaida(RECUSA, [], removidas, sem_suporte=True, alterado=True)
    return ResultadoSaida(limpo, validas, removidas, sem_suporte=False, alterado=limpo != texto.strip())
