"""As 12 ferramentas do «Balcão»: a fronteira entre o modelo e o mundo.

O modelo só pode fazer o que está aqui, com os argumentos que estão aqui,
dentro dos limites que estão aqui. Três regras que não dependem do prompt:

1. **Identidade vem do contexto de execução.** O cliente autenticado chega em
   `config["configurable"]["cliente_id"]` (posto pela API a partir do token),
   nunca num argumento que o modelo preencha. Nenhum esquema aceita
   `cliente_id` (RI-03 — há um teste que o verifica).
2. **Limites no código.** O limite autónomo de 500 MZN, o valor da
   compensação (calculado pela política, não escolhido pelo modelo) e os
   sinais de fraude são verificados aqui, antes do efeito (adr-0015).
3. **Escritas idempotentes.** A chave de idempotência é derivada do fio da
   conversa, do pedido e do valor: uma retentativa do modelo, do grafo ou da
   rede devolve o mesmo reembolso em vez de pagar duas vezes.

Os sistemas do Chega (pedidos, pagamentos, tickets) são simulados pela classe
`Mundo`, com os dados de `balcao.corpus`.
"""

from __future__ import annotations

import copy
import hashlib
import itertools
import math
import threading
import uuid
from collections.abc import Callable
from typing import Any, Literal

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool
from pydantic import BaseModel, Field

from balcao import didactico
from balcao.corpus import CLIENTES, PEDIDOS

__all__ = [
    "ESCRITA",
    "LEITURA",
    "ErroAutorizacao",
    "Mundo",
    "chave_idempotencia",
    "cliente_do_contexto",
    "criar_ferramentas",
]

# Ferramentas sem efeito externo: são as únicas disponíveis num turno com suspeita de injecção.
LEITURA = frozenset(
    {
        "ler_pedido",
        "ler_cliente",
        "rastrear_entrega",
        "pesquisar_conhecimento",
        "calcular_reembolso",
        "transferir_humano",
    }
)
ESCRITA = frozenset(
    {"emitir_reembolso", "emitir_cupao", "cancelar_pedido", "alterar_morada", "abrir_ticket", "pedir_aprovacao"}
)

_PADRAO_PEDIDO = r"^PD-\d{7}$"
Motivo = Literal["atraso", "nao_entregue", "artigo_em_falta"]

# Coordenadas aproximadas (lat, lon) dos bairros usados pelo mundo simulado.
_BAIRROS: dict[str, tuple[float, float]] = {
    "polana": (-25.9653, 32.5989),
    "sommerschield": (-25.9580, 32.5960),
    "malhangalene": (-25.9530, 32.5790),
    "alto mae": (-25.9660, 32.5690),
    "baixa": (-25.9730, 32.5720),
    "costa do sol": (-25.9200, 32.6200),
    "machava": (-25.9150, 32.4950),
    "matola sede": (-25.9620, 32.4590),
    "fomento": (-25.9480, 32.4730),
    "triunfo": (-25.9300, 32.6150),
}


class ErroAutorizacao(Exception):
    """Pedido de uma ferramenta sem cliente autenticado no contexto."""


def cliente_do_contexto(config: RunnableConfig | None) -> str:
    """O cliente autenticado desta execução. Sem ele, nenhuma ferramenta corre."""
    cliente = ((config or {}).get("configurable") or {}).get("cliente_id")
    if not cliente:
        raise ErroAutorizacao("execução sem cliente autenticado (configurable.cliente_id)")
    return str(cliente)


def _fio(config: RunnableConfig | None) -> str:
    return str(((config or {}).get("configurable") or {}).get("thread_id", "sem-fio"))


def chave_idempotencia(fio: str, operacao: str, pedido_id: str, valor: int | str) -> str:
    """SHA-256 de (fio, operação, pedido, valor): a mesma intenção dá sempre a mesma chave."""
    return hashlib.sha256(f"{fio}|{operacao}|{pedido_id}|{valor}".encode()).hexdigest()[:32]


def _distancia_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Haversine: distância em linha recta entre dois pontos, em km."""
    (la1, lo1), (la2, lo2) = (tuple(map(math.radians, a)), tuple(map(math.radians, b)))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


# ======================================================================= mundo


class Mundo:
    """Os sistemas do Chega que as ferramentas chamam, simulados em memória.

    Em produção cada método é uma chamada HTTP a um serviço interno, com o seu
    próprio timeout e a sua própria autorização. Aqui, um trinco chega para que
    duas chamadas concorrentes com a mesma chave não emitam dois reembolsos.
    """

    def __init__(self, limite_reembolso_mzn: int = 500) -> None:
        self.limite = limite_reembolso_mzn
        self.pedidos: dict[str, dict[str, Any]] = copy.deepcopy(PEDIDOS)
        self.clientes: dict[str, dict[str, Any]] = copy.deepcopy(CLIENTES)
        self.moradas: dict[str, str] = {
            "PD-8841273": "polana",
            "PD-8841990": "sommerschield",
            "PD-8842507": "machava",
            "PD-8843115": "matola sede",
        }
        self.reembolsos: dict[str, dict[str, Any]] = {}
        self.cupoes: dict[str, dict[str, Any]] = {}
        self.tickets: list[dict[str, Any]] = []
        self.transferencias: list[dict[str, Any]] = []
        self.aprovacoes: dict[str, dict[str, Any]] = {}
        self._seq = itertools.count(1)
        self._trinco = threading.Lock()

    # --------------------------------------------------------------- leituras

    def pedido_do_cliente(self, pedido_id: str, cliente_id: str) -> dict[str, Any] | None:
        """O pedido, só se pertencer ao cliente. Um pedido alheio é «não encontrado»: não se confirma que existe."""
        p = self.pedidos.get(pedido_id)
        return p if p and p["cliente"] == cliente_id else None

    def sinais_de_fraude(self, cliente_id: str) -> list[str]:
        """Os sinais de `int-fraude-sinais` que se conseguem verificar por dados."""
        c = self.clientes.get(cliente_id, {})
        sinais = []
        if c.get("reembolsos_30d", 0) > 3:
            sinais.append("mais de 3 reembolsos em 30 dias")
        if c.get("desde", "0000") >= "2026-09-13":  # conta com menos de 7 dias (data de referência 2026-09-20)
            sinais.append("conta criada há menos de 7 dias")
        return sinais

    # ---------------------------------------------------------------- escritas

    def emitir_reembolso(
        self, chave: str, pedido_id: str, valor: int, motivo: str, aprovacao: str | None = None
    ) -> dict[str, Any]:
        with self._trinco:
            if chave in self.reembolsos:
                return {**self.reembolsos[chave], "repetido": True}
            ref = f"RB-{int(chave[:8], 16) % 10**6:06d}"
            r = {
                "referencia": ref,
                "pedido": pedido_id,
                "valor_mzn": valor,
                "motivo": motivo,
                "estado": "aprovado",
                "aprovacao": aprovacao,
            }
            self.reembolsos[chave] = r
            return dict(r)

    def emitir_reembolso_aprovado(self, aprovacao: dict[str, Any], revisor: str) -> dict[str, Any]:
        """O único caminho para reembolsos acima do limite: uma aprovação humana registada.

        Recebe a aprovação tal como está no checkpoint do grafo (id, fio, pedido,
        valor, motivo), e não só o id: a decisão pode chegar horas depois, noutro
        processo, e é o checkpoint que sobrevive ao reinício. Em produção, o
        serviço de pagamentos confirma o id da aprovação do lado dele.
        """
        with self._trinco:
            ap = self.aprovacoes.setdefault(aprovacao["id"], dict(aprovacao))
            ap.update(estado="aprovada", revisor=revisor)
        chave = chave_idempotencia(aprovacao["fio"], "reembolso", aprovacao["pedido_id"], aprovacao["valor_mzn"])
        return self.emitir_reembolso(
            chave, aprovacao["pedido_id"], int(aprovacao["valor_mzn"]), aprovacao["motivo"], aprovacao=aprovacao["id"]
        )

    def recusar_aprovacao(self, aprovacao: dict[str, Any], revisor: str) -> None:
        with self._trinco:
            self.aprovacoes.setdefault(aprovacao["id"], dict(aprovacao)).update(estado="recusada", revisor=revisor)

    def registar_aprovacao(
        self, fio: str, cliente_id: str, pedido_id: str, valor: int, motivo: str, justificacao: str
    ) -> dict[str, Any]:
        with self._trinco:
            for ap in self.aprovacoes.values():  # idempotente: um pedido pendente por (fio, pedido, valor)
                if (ap["fio"], ap["pedido_id"], ap["valor_mzn"], ap["estado"]) == (fio, pedido_id, valor, "pendente"):
                    return dict(ap)
            ap_id = f"AP-{uuid.uuid4().hex[:10]}"
            ap = {
                "id": ap_id,
                "fio": fio,
                "cliente_id": cliente_id,
                "pedido_id": pedido_id,
                "valor_mzn": valor,
                "motivo": motivo,
                "justificacao": justificacao,
                "estado": "pendente",
            }
            self.aprovacoes[ap_id] = ap
            return dict(ap)


# ================================================================= esquemas


class PedidoArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO, description="Número do pedido, formato PD-NNNNNNN.")


class SemArgs(BaseModel):
    """Sem argumentos: o cliente vem do contexto autenticado."""


class PesquisaArgs(BaseModel):
    consulta: str = Field(min_length=3, max_length=300, description="A pergunta do cliente reformulada como pesquisa.")
    k: int = Field(default=3, ge=1, le=5, description="Número de excertos a devolver.")


class CalculoArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO, description="Número do pedido.")
    motivo: Motivo = Field(description="atraso, nao_entregue ou artigo_em_falta.")


class ReembolsoArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO, description="Número do pedido.")
    valor_mzn: int = Field(gt=0, le=100_000, description="Valor devolvido por calcular_reembolso, em meticais.")
    motivo: Motivo = Field(description="O mesmo motivo usado em calcular_reembolso.")


class CupaoArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO, description="Número do pedido atrasado.")


class MoradaArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO, description="Número do pedido.")
    nova_morada: str = Field(min_length=3, max_length=200, description="Nova morada, com o bairro.")


class TicketArgs(BaseModel):
    assunto: str = Field(min_length=3, max_length=120)
    descricao: str = Field(min_length=3, max_length=2000, description="O que aconteceu, sem dados pessoais.")
    pedido_id: str | None = Field(default=None, pattern=_PADRAO_PEDIDO)


class AprovacaoArgs(BaseModel):
    pedido_id: str = Field(pattern=_PADRAO_PEDIDO)
    valor_mzn: int = Field(gt=0, le=100_000, description="Valor devolvido por calcular_reembolso.")
    motivo: Motivo
    justificacao: str = Field(min_length=3, max_length=500, description="Porque é que o cliente tem direito.")


class TransferenciaArgs(BaseModel):
    resumo: str = Field(
        min_length=10, max_length=1500, description="Número do pedido, o que o cliente pediu e o que já foi feito."
    )
    prioridade: Literal["normal", "urgente"] = "normal"


# ============================================================== ferramentas


def criar_ferramentas(mundo: Mundo, pesquisar: Callable[[str, int], list[dict[str, Any]]]) -> list[BaseTool]:
    """As 12 ferramentas, ligadas a um `Mundo` e a uma função de pesquisa.

    `pesquisar(consulta, k)` devolve excertos `{fonte, titulo, texto}` já
    filtrados (públicos e em vigor) — em regra, o `RecuperadorHibrido`.
    """

    def _erro(msg: str, codigo: str) -> dict[str, Any]:
        return {"erro": msg, "codigo": codigo}

    def _nao_encontrado(pedido_id: str) -> dict[str, Any]:
        return _erro(f"pedido {pedido_id} não encontrado nesta conta", "NAO_ENCONTRADO")

    @tool(args_schema=PedidoArgs)
    def ler_pedido(pedido_id: str, config: RunnableConfig) -> dict[str, Any]:
        """Consulta o estado, os artigos, as taxas e os tempos de um pedido do cliente."""
        p = mundo.pedido_do_cliente(pedido_id, cliente_do_contexto(config))
        if not p:
            return _nao_encontrado(pedido_id)
        return {k: v for k, v in p.items() if k != "cliente"}

    @tool(args_schema=SemArgs)
    def ler_cliente(config: RunnableConfig) -> dict[str, Any]:
        """Consulta o perfil de suporte do cliente desta conversa (sem dados de pagamento completos)."""
        cid = cliente_do_contexto(config)
        c = mundo.clientes.get(cid)
        if not c:
            return _erro("cliente não encontrado", "NAO_ENCONTRADO")
        return {**c, "sinais_de_fraude": mundo.sinais_de_fraude(cid)}

    @tool(args_schema=PedidoArgs)
    def rastrear_entrega(pedido_id: str, config: RunnableConfig) -> dict[str, Any]:
        """Mostra a etapa da entrega e a estimativa de chegada de um pedido."""
        p = mundo.pedido_do_cliente(pedido_id, cliente_do_contexto(config))
        if not p:
            return _nao_encontrado(pedido_id)
        etapas = ["pendente", "em_preparacao", "a_caminho", "entregue"]
        estado = p["estado"]
        feitas = etapas[: etapas.index(estado) + 1] if estado in etapas else [estado]
        return {
            "pedido": pedido_id,
            "estado": estado,
            "etapas_concluidas": feitas,
            "eta_min": p.get("eta_min"),
            "atraso_min": max(0, p["decorrido_min"] - p["prometido_min"]),
        }

    @tool(args_schema=PesquisaArgs)
    def pesquisar_conhecimento(consulta: str, k: int = 3) -> dict[str, Any]:
        """Pesquisa as políticas e perguntas frequentes do Chega; devolve excertos com o id da fonte para citar."""
        return {"resultados": pesquisar(consulta, k)}

    @tool(args_schema=CalculoArgs)
    def calcular_reembolso(pedido_id: str, motivo: Motivo, config: RunnableConfig) -> dict[str, Any]:
        """Calcula a compensação a que um pedido tem direito segundo as políticas em vigor. Não emite nada."""
        if not mundo.pedido_do_cliente(pedido_id, cliente_do_contexto(config)):
            return _nao_encontrado(pedido_id)
        r = didactico.calcular_reembolso(pedido_id, motivo)
        if "erro" in r:
            return r
        r["motivo"] = motivo
        r["precisa_aprovacao"] = r["tipo"] == "reembolso" and r["valor_mzn"] > mundo.limite
        return r

    @tool(args_schema=ReembolsoArgs)
    def emitir_reembolso(pedido_id: str, valor_mzn: int, motivo: Motivo, config: RunnableConfig) -> dict[str, Any]:
        """Emite um reembolso para o meio de pagamento original. Efeito externo: só depois de o cliente confirmar."""
        cid = cliente_do_contexto(config)
        if not mundo.pedido_do_cliente(pedido_id, cid):
            return _nao_encontrado(pedido_id)
        # 1. O valor é o da política, não o que o modelo escolheu.
        calculo = didactico.calcular_reembolso(pedido_id, motivo)
        if calculo.get("tipo") != "reembolso":
            return _erro(f"a política para «{motivo}» não dá reembolso ({calculo.get('tipo')})", "NAO_ELEGIVEL")
        if valor_mzn != calculo["valor_mzn"]:
            return _erro(f"valor diferente do calculado pela política ({calculo['valor_mzn']} MZN)", "VALOR_INVALIDO")
        # 2. O limite autónomo, verificado aqui e não no prompt.
        if valor_mzn > mundo.limite:
            return _erro(
                f"acima do limite autónomo de {mundo.limite} MZN: requer aprovação humana", "APROVACAO_NECESSARIA"
            )
        # 3. Sinais de fraude: não reembolsar, passar a um humano (sem acusar).
        if mundo.sinais_de_fraude(cid):
            return _erro("este caso precisa de revisão da equipa de suporte", "REVISAO_HUMANA")
        chave = chave_idempotencia(_fio(config), "reembolso", pedido_id, valor_mzn)
        return mundo.emitir_reembolso(chave, pedido_id, valor_mzn, motivo)

    @tool(args_schema=CupaoArgs)
    def emitir_cupao(pedido_id: str, config: RunnableConfig) -> dict[str, Any]:
        """Emite o cupão de compensação por atraso a que o pedido tem direito (um por pedido)."""
        cid = cliente_do_contexto(config)
        if not mundo.pedido_do_cliente(pedido_id, cid):
            return _nao_encontrado(pedido_id)
        calculo = didactico.calcular_reembolso(pedido_id, "atraso")
        if calculo.get("tipo") != "cupão" or not calculo.get("valor_mzn"):
            return _erro(f"sem direito a cupão: {calculo.get('regra')}", "NAO_ELEGIVEL")
        with mundo._trinco:
            if pedido_id in mundo.cupoes:
                return {**mundo.cupoes[pedido_id], "repetido": True}
            c = {
                "pedido": pedido_id,
                "valor_mzn": calculo["valor_mzn"],
                "validade_dias": 30,
                "minimo_pedido_mzn": 400,
                "codigo": f"CH-{pedido_id[-4:]}-{calculo['valor_mzn']}",
            }
            mundo.cupoes[pedido_id] = c
            return dict(c)

    @tool(args_schema=PedidoArgs)
    def cancelar_pedido(pedido_id: str, config: RunnableConfig) -> dict[str, Any]:
        """Cancela um pedido que o restaurante ainda não aceitou. Só depois de o cliente confirmar."""
        p = mundo.pedido_do_cliente(pedido_id, cliente_do_contexto(config))
        if not p:
            return _nao_encontrado(pedido_id)
        if p["estado"] == "pendente":
            p["estado"] = "cancelado"
            return {"pedido": pedido_id, "estado": "cancelado", "custo_mzn": 0}
        if p["estado"] == "em_preparacao":
            return _erro(
                "o restaurante já aceitou: o cancelamento custa 50% e precisa de aprovação humana",
                "APROVACAO_NECESSARIA",
            )
        return _erro(f"não é possível cancelar um pedido {p['estado'].replace('_', ' ')}", "NAO_PERMITIDO")

    @tool(args_schema=MoradaArgs)
    def alterar_morada(pedido_id: str, nova_morada: str, config: RunnableConfig) -> dict[str, Any]:
        """Altera a morada de entrega antes de o estafeta recolher o pedido, até 2 km da original."""
        p = mundo.pedido_do_cliente(pedido_id, cliente_do_contexto(config))
        if not p:
            return _nao_encontrado(pedido_id)
        if p["estado"] not in ("pendente", "em_preparacao"):
            return _erro("o estafeta já recolheu o pedido", "NAO_PERMITIDO")
        destino = next((b for b in _BAIRROS if b in didactico.normalizar(nova_morada)), None)
        if destino is None:
            return _erro("não reconheci o bairro da nova morada", "MORADA_DESCONHECIDA")
        km = round(_distancia_km(_BAIRROS[mundo.moradas[pedido_id]], _BAIRROS[destino]), 1)
        if km > 2:
            return _erro(
                f"a nova morada fica a {km} km: a taxa é recalculada e o cliente confirma na aplicação",
                "RECALCULO_NECESSARIO",
            )
        mundo.moradas[pedido_id] = destino
        return {"pedido": pedido_id, "nova_morada": nova_morada, "distancia_km": km, "taxa_alterada": False}

    @tool(args_schema=TicketArgs)
    def abrir_ticket(
        assunto: str, descricao: str, config: RunnableConfig, pedido_id: str | None = None
    ) -> dict[str, Any]:
        """Abre um ticket para a equipa de suporte tratar sem a conversa ficar à espera."""
        cid = cliente_do_contexto(config)
        with mundo._trinco:
            t = {
                "ticket": f"TK-{next(mundo._seq):05d}",
                "cliente": cid,
                "pedido": pedido_id,
                "assunto": assunto,
                "descricao": didactico.mascarar_pii(descricao),
                "estado": "aberto",
            }
            mundo.tickets.append(t)
        return {"ticket": t["ticket"], "estado": "aberto", "resposta_em": "24 horas úteis"}

    @tool(args_schema=AprovacaoArgs)
    def pedir_aprovacao(
        pedido_id: str, valor_mzn: int, motivo: Motivo, justificacao: str, config: RunnableConfig
    ) -> dict[str, Any]:
        """Pede a um humano que aprove um reembolso acima do limite autónomo. A conversa fica à espera da decisão."""
        cid = cliente_do_contexto(config)
        if not mundo.pedido_do_cliente(pedido_id, cid):
            return _nao_encontrado(pedido_id)
        calculo = didactico.calcular_reembolso(pedido_id, motivo)
        if calculo.get("valor_mzn") != valor_mzn:
            return _erro(
                f"valor diferente do calculado pela política ({calculo.get('valor_mzn')} MZN)", "VALOR_INVALIDO"
            )
        ap = mundo.registar_aprovacao(_fio(config), cid, pedido_id, valor_mzn, motivo, justificacao)
        return {"aprovacao_id": ap["id"], "estado": ap["estado"], "resposta_em": "menos de 4 horas úteis"}

    @tool(args_schema=TransferenciaArgs)
    def transferir_humano(
        resumo: str, config: RunnableConfig, prioridade: Literal["normal", "urgente"] = "normal"
    ) -> dict[str, Any]:
        """Passa a conversa para a equipa de suporte com um resumo do caso, para o cliente não ter de repetir."""
        cid = cliente_do_contexto(config)
        r = didactico.transferir_humano(didactico.mascarar_pii(resumo), prioridade)
        mundo.transferencias.append(
            {
                "cliente": cid,
                "fio": _fio(config),
                "prioridade": prioridade,
                "resumo": didactico.mascarar_pii(resumo),
                **r,
            }
        )
        return r

    return [
        ler_pedido,
        ler_cliente,
        rastrear_entrega,
        pesquisar_conhecimento,
        calcular_reembolso,
        emitir_reembolso,
        emitir_cupao,
        cancelar_pedido,
        alterar_morada,
        abrir_ticket,
        pedir_aprovacao,
        transferir_humano,
    ]
