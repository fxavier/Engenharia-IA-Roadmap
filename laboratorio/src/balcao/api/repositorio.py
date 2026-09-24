"""Persistência da API: conversas, mensagens, feedback, aprovações e corridas de avaliação.

Duas implementações com a mesma interface: em memória (testes e laboratório
sem base de dados) e PostgreSQL (tabelas de `sql/001_esquema.sql`). O estado
do grafo não vive aqui — vive nos checkpoints do LangGraph; isto é a vista do
produto e da equipa de suporte, com os textos já mascarados.
"""

from __future__ import annotations

import threading
import uuid
from datetime import UTC, datetime
from typing import Any, Protocol

from balcao.api.esquemas import Aprovacao, Conversa, EstadoAvaliacao, FeedbackRegistado, Mensagem

__all__ = ["Repositorio", "RepositorioMemoria", "RepositorioPostgres", "novo_id"]


def novo_id(prefixo: str) -> str:
    return f"{prefixo}-{uuid.uuid4().hex[:12]}"


def _agora() -> datetime:
    return datetime.now(UTC)


class Repositorio(Protocol):
    def criar_conversa(self, cliente_id: str, canal: str) -> Conversa: ...
    def obter_conversa(self, conversa_id: str) -> Conversa | None: ...
    def mudar_estado_conversa(self, conversa_id: str, estado: str) -> None: ...
    def adicionar_mensagem(
        self,
        conversa_id: str,
        papel: str,
        texto: str,
        citacoes: list[str] | None = None,
        intencao: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> Mensagem: ...
    def listar_mensagens(self, conversa_id: str) -> list[Mensagem]: ...
    def registar_feedback(
        self, conversa_id: str, mensagem_id: str, util: bool, comentario: str | None
    ) -> FeedbackRegistado: ...
    def registar_aprovacao(self, ap: Aprovacao) -> Aprovacao: ...
    def obter_aprovacao(self, aprovacao_id: str) -> Aprovacao | None: ...
    def listar_aprovacoes(self, estado: str | None = None) -> list[Aprovacao]: ...
    def decidir_aprovacao(self, aprovacao_id: str, aprovado: bool, revisor: str, nota: str | None) -> Aprovacao: ...
    def guardar_avaliacao(
        self, av: EstadoAvaliacao, versao_prompt: str | None = None, modelo: str | None = None
    ) -> None: ...
    def obter_avaliacao(self, avaliacao_id: str) -> EstadoAvaliacao | None: ...
    def pronto(self) -> bool: ...


# ===================================================================== memória


class RepositorioMemoria:
    """Dicionários com um trinco. Chega para um processo; não sobrevive a um reinício."""

    def __init__(self) -> None:
        self._conversas: dict[str, Conversa] = {}
        self._mensagens: dict[str, list[Mensagem]] = {}
        self._feedback: dict[str, FeedbackRegistado] = {}
        self._aprovacoes: dict[str, Aprovacao] = {}
        self._avaliacoes: dict[str, EstadoAvaliacao] = {}
        self._trinco = threading.Lock()

    def criar_conversa(self, cliente_id: str, canal: str) -> Conversa:
        c = Conversa(id=novo_id("CV"), cliente_id=cliente_id, canal=canal, criada_em=_agora())
        with self._trinco:
            self._conversas[c.id] = c
            self._mensagens[c.id] = []
        return c

    def obter_conversa(self, conversa_id: str) -> Conversa | None:
        return self._conversas.get(conversa_id)

    def mudar_estado_conversa(self, conversa_id: str, estado: str) -> None:
        with self._trinco:
            c = self._conversas[conversa_id]
            self._conversas[conversa_id] = c.model_copy(update={"estado": estado})

    def adicionar_mensagem(
        self,
        conversa_id: str,
        papel: str,
        texto: str,
        citacoes: list[str] | None = None,
        intencao: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> Mensagem:
        m = Mensagem(
            id=novo_id("MS"),
            conversa_id=conversa_id,
            papel=papel,
            texto=texto,
            citacoes=citacoes or [],
            intencao=intencao,
            criada_em=_agora(),
            meta=meta or {},
        )
        with self._trinco:
            self._mensagens.setdefault(conversa_id, []).append(m)
        return m

    def listar_mensagens(self, conversa_id: str) -> list[Mensagem]:
        return list(self._mensagens.get(conversa_id, []))

    def registar_feedback(
        self, conversa_id: str, mensagem_id: str, util: bool, comentario: str | None
    ) -> FeedbackRegistado:
        if not any(m.id == mensagem_id for m in self._mensagens.get(conversa_id, [])):
            raise KeyError(mensagem_id)
        f = FeedbackRegistado(id=novo_id("FB"), mensagem_id=mensagem_id, util=util)
        with self._trinco:
            self._feedback[mensagem_id] = f
        return f

    def registar_aprovacao(self, ap: Aprovacao) -> Aprovacao:
        with self._trinco:
            return self._aprovacoes.setdefault(ap.id, ap)

    def obter_aprovacao(self, aprovacao_id: str) -> Aprovacao | None:
        return self._aprovacoes.get(aprovacao_id)

    def listar_aprovacoes(self, estado: str | None = None) -> list[Aprovacao]:
        return sorted(
            (a for a in self._aprovacoes.values() if estado is None or a.estado == estado), key=lambda a: a.criada_em
        )

    def decidir_aprovacao(self, aprovacao_id: str, aprovado: bool, revisor: str, nota: str | None) -> Aprovacao:
        with self._trinco:
            ap = self._aprovacoes[aprovacao_id]
            novo = ap.model_copy(
                update={
                    "estado": "aprovada" if aprovado else "recusada",
                    "revisor": revisor,
                    "nota": nota,
                    "decidida_em": _agora(),
                }
            )
            self._aprovacoes[aprovacao_id] = novo
            return novo

    def guardar_avaliacao(
        self, av: EstadoAvaliacao, versao_prompt: str | None = None, modelo: str | None = None
    ) -> None:
        with self._trinco:
            self._avaliacoes[av.id] = av

    def obter_avaliacao(self, avaliacao_id: str) -> EstadoAvaliacao | None:
        return self._avaliacoes.get(avaliacao_id)

    def pronto(self) -> bool:
        return True


# ================================================================ PostgreSQL


class RepositorioPostgres:
    """As mesmas operações sobre as tabelas do esquema, com um pool de ligações `psycopg`."""

    def __init__(self, conninfo: str, min_size: int = 1, max_size: int = 10) -> None:
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool

        self.pool = ConnectionPool(
            conninfo,
            min_size=min_size,
            max_size=max_size,
            open=True,
            kwargs={"row_factory": dict_row},
            name="balcao-api",
        )

    def fechar(self) -> None:
        self.pool.close()

    def _um(self, sql: str, params: dict[str, Any] | tuple[Any, ...]) -> dict[str, Any] | None:
        with self.pool.connection() as con:
            return con.execute(sql, params).fetchone()  # type: ignore[return-value]

    def _todos(self, sql: str, params: dict[str, Any] | tuple[Any, ...]) -> list[dict[str, Any]]:
        with self.pool.connection() as con:
            return con.execute(sql, params).fetchall()  # type: ignore[return-value]

    def criar_conversa(self, cliente_id: str, canal: str) -> Conversa:
        linha = self._um(
            "INSERT INTO conversas (id, cliente_id, canal) VALUES (%s, %s, %s) RETURNING *",
            (novo_id("CV"), cliente_id, canal),
        )
        return Conversa(**linha)  # type: ignore[arg-type]

    def obter_conversa(self, conversa_id: str) -> Conversa | None:
        linha = self._um("SELECT * FROM conversas WHERE id = %s", (conversa_id,))
        return Conversa(**linha) if linha else None

    def mudar_estado_conversa(self, conversa_id: str, estado: str) -> None:
        self._um("UPDATE conversas SET estado = %s WHERE id = %s RETURNING id", (estado, conversa_id))

    def adicionar_mensagem(
        self,
        conversa_id: str,
        papel: str,
        texto: str,
        citacoes: list[str] | None = None,
        intencao: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> Mensagem:
        from psycopg.types.json import Jsonb

        linha = self._um(
            "INSERT INTO mensagens (id, conversa_id, papel, texto, citacoes, intencao, meta) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
            (novo_id("MS"), conversa_id, papel, texto, citacoes or [], intencao, Jsonb(meta or {})),
        )
        return Mensagem(**linha)  # type: ignore[arg-type]

    def listar_mensagens(self, conversa_id: str) -> list[Mensagem]:
        return [
            Mensagem(**ln)
            for ln in self._todos(
                "SELECT * FROM mensagens WHERE conversa_id = %s ORDER BY criada_em, id", (conversa_id,)
            )
        ]

    def registar_feedback(
        self, conversa_id: str, mensagem_id: str, util: bool, comentario: str | None
    ) -> FeedbackRegistado:
        linha = self._um(
            "INSERT INTO feedback (id, conversa_id, mensagem_id, util, comentario) "
            "SELECT %s, %s, m.id, %s, %s FROM mensagens m WHERE m.id = %s AND m.conversa_id = %s "
            "ON CONFLICT (mensagem_id) DO UPDATE SET util = EXCLUDED.util, comentario = EXCLUDED.comentario, "
            "criado_em = now() RETURNING id, mensagem_id, util",
            (novo_id("FB"), conversa_id, util, comentario, mensagem_id, conversa_id),
        )
        if linha is None:
            raise KeyError(mensagem_id)
        return FeedbackRegistado(**linha)

    def registar_aprovacao(self, ap: Aprovacao) -> Aprovacao:
        self._um(
            "INSERT INTO aprovacoes (id, conversa_id, cliente_id, pedido_id, valor_mzn, motivo, estado, criada_em) "
            "VALUES (%(id)s, %(conversa_id)s, %(cliente_id)s, %(pedido_id)s, %(valor_mzn)s, %(motivo)s, "
            "%(estado)s, %(criada_em)s) ON CONFLICT (id) DO NOTHING RETURNING id",
            ap.model_dump(),
        )
        return self.obter_aprovacao(ap.id) or ap

    def obter_aprovacao(self, aprovacao_id: str) -> Aprovacao | None:
        linha = self._um("SELECT * FROM aprovacoes WHERE id = %s", (aprovacao_id,))
        return Aprovacao(**linha) if linha else None

    def listar_aprovacoes(self, estado: str | None = None) -> list[Aprovacao]:
        if estado is None:
            return [Aprovacao(**ln) for ln in self._todos("SELECT * FROM aprovacoes ORDER BY criada_em", ())]
        return [
            Aprovacao(**ln)
            for ln in self._todos("SELECT * FROM aprovacoes WHERE estado = %s ORDER BY criada_em", (estado,))
        ]

    def decidir_aprovacao(self, aprovacao_id: str, aprovado: bool, revisor: str, nota: str | None) -> Aprovacao:
        # `AND estado = 'pendente'`: duas decisões simultâneas não se sobrepõem.
        linha = self._um(
            "UPDATE aprovacoes SET estado = %s, revisor = %s, nota = %s, decidida_em = now() "
            "WHERE id = %s AND estado = 'pendente' RETURNING *",
            ("aprovada" if aprovado else "recusada", revisor, nota, aprovacao_id),
        )
        if linha is None:
            raise KeyError(aprovacao_id)
        return Aprovacao(**linha)

    def guardar_avaliacao(
        self, av: EstadoAvaliacao, versao_prompt: str | None = None, modelo: str | None = None
    ) -> None:
        from psycopg.types.json import Jsonb

        self._um(
            "INSERT INTO corridas_avaliacao (id, conjunto, estado, versao_prompt, modelo, metricas, gate_ok, erro, "
            "criada_em, terminada_em) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, "
            "CASE WHEN %s IN ('concluida', 'falhou') THEN now() END) "
            "ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, metricas = EXCLUDED.metricas, "
            "gate_ok = EXCLUDED.gate_ok, erro = EXCLUDED.erro, terminada_em = EXCLUDED.terminada_em RETURNING id",
            (
                av.id,
                av.conjunto,
                av.estado,
                versao_prompt,
                modelo,
                Jsonb(av.metricas) if av.metricas else None,
                av.gate_ok,
                av.erro,
                av.criada_em,
                av.estado,
            ),
        )

    def obter_avaliacao(self, avaliacao_id: str) -> EstadoAvaliacao | None:
        linha = self._um("SELECT * FROM corridas_avaliacao WHERE id = %s", (avaliacao_id,))
        if not linha:
            return None
        return EstadoAvaliacao(
            id=linha["id"],
            estado=linha["estado"],
            conjunto=linha["conjunto"],
            criada_em=linha["criada_em"],
            metricas=linha["metricas"],
            gate_ok=linha["gate_ok"],
            erro=linha["erro"],
        )

    def pronto(self) -> bool:
        try:
            return self._um("SELECT 1 AS ok", ()) is not None
        except Exception:
            return False
