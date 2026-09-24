"""Pacote do «Balcão». Reexporta o runtime didáctico para que `import balcao`
funcione igual no browser (Pyodide) e no laboratório."""

from balcao.didactico import *  # noqa: F403
from balcao.didactico import __all__  # noqa: F401
