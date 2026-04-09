"""
Registre des parsers de payload.

Pour ajouter un nouveau parser :
  1. Créer un fichier dans ce dossier (ex: chirpstack_parser.py)
  2. Implémenter PayloadParser
  3. L'ajouter à DEFAULT_PARSERS ci-dessous

Les parsers sont testés dans l'ordre : le premier qui retourne
True sur can_parse() est utilisé.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from weather.parsers.base import PayloadParser
from weather.parsers.flat_parser import FlatParser
from weather.parsers.ttn_parser import TTNParser

if TYPE_CHECKING:
    pass

# Ordre d'évaluation : TTN d'abord (plus spécifique), puis flat (fallback)
DEFAULT_PARSERS: list[PayloadParser] = [
    TTNParser(),
    FlatParser(),
]

__all__ = [
    "PayloadParser",
    "TTNParser",
    "FlatParser",
    "DEFAULT_PARSERS",
]
