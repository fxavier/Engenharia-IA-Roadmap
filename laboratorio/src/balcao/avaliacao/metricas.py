"""Métricas de avaliação do «Balcão» e o gate de CI (adr-0018).

As métricas de recuperação (recall@k, MRR, nDCG) e o bootstrap são os do
runtime didáctico — o tutorial calcula-as no browser com o mesmo código. Aqui
junta-se o que é específico do sistema: acerto de ferramentas, recusa correcta,
agregação por intenção e o gate com intervalo de confiança.

Porquê o intervalo: com 30 perguntas, uma descida de 0,87 para 0,83 quase
nunca é real. O gate compara o *limite inferior* do IC a 95% com o limiar só
quando se pede (`estrito=True`); por omissão compara a média, e o relatório
mostra o IC para quem decide.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from balcao import didactico

__all__ = [
    "Falha",
    "acerto_ferramentas",
    "bootstrap_ic",
    "docs_unicos",
    "media",
    "mrr",
    "ndcg_at_k",
    "recall_at_k",
    "verificar_gate",
]

recall_at_k = didactico.recall_at_k
mrr = didactico.mrr
ndcg_at_k = didactico.ndcg_at_k


def docs_unicos(ids: Iterable[str]) -> list[str]:
    """Ids de documento pela ordem da primeira ocorrência (vários chunks do mesmo doc contam uma vez)."""
    return list(dict.fromkeys(ids))


def media(valores: Sequence[float | bool]) -> float:
    return round(sum(float(v) for v in valores) / len(valores), 4) if valores else 0.0


def bootstrap_ic(valores: Sequence[float | bool], n: int = 2000, nivel: float = 0.95) -> tuple[float, float, float]:
    """(média, limite inferior, limite superior). Com um só valor, o IC é degenerado."""
    if not valores:
        return (0.0, 0.0, 0.0)
    if len(valores) == 1:
        v = float(valores[0])
        return (v, v, v)
    m, lo, hi = didactico.bootstrap_ic([float(v) for v in valores], n=n, nivel=nivel)
    return (float(m), float(lo), float(hi))


def acerto_ferramentas(esperadas: Iterable[str], chamadas: Iterable[str], proibidas: Iterable[str] = ()) -> bool:
    """Tool-call accuracy de um caso: todas as esperadas foram chamadas e nenhuma proibida o foi.

    A ordem não conta (o `ToolNode` pode correr chamadas em paralelo) e
    chamadas extra de leitura não penalizam: um `ler_pedido` a mais custa
    latência, não dinheiro. O que penaliza é uma escrita que não devia existir.
    """
    feitas = set(chamadas)
    return set(esperadas) <= feitas and not (set(proibidas) & feitas)


@dataclass(frozen=True)
class Falha:
    metrica: str
    valor: float
    limiar: float

    def __str__(self) -> str:
        return f"{self.metrica} = {self.valor:.3f} < {self.limiar:.3f}"


def verificar_gate(
    metricas: Mapping[str, float],
    limiares: Mapping[str, float],
    ics: Mapping[str, tuple[float, float, float]] | None = None,
    estrito: bool = False,
) -> list[Falha]:
    """Métricas abaixo do limiar. Lista vazia = o gate passa.

    Uma métrica em falta (por exemplo, um conjunto sem casos de ferramentas)
    não passa em silêncio: conta como falha com valor 0.
    """
    falhas: list[Falha] = []
    for nome, limiar in limiares.items():
        valor = metricas.get(nome)
        if valor is None:
            falhas.append(Falha(nome, 0.0, limiar))
            continue
        comparado = ics[nome][1] if estrito and ics and nome in ics else valor
        if comparado < limiar:
            falhas.append(Falha(nome, float(comparado), limiar))
    return falhas
