"""API HTTP do «Balcão» (FastAPI): conversas com streaming por SSE, aprovações, pesquisa, ingestão e avaliação."""

from balcao.api.app import create_app

__all__ = ["create_app"]
