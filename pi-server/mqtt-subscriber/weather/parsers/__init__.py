"""
Registre des parsers de payload.

Pour ajouter un nouveau parser :
  1. Créer un fichier dans ce dossier (ex: chirpstack_parser.py)
  2. Implémenter PayloadParser (constructor doit accepter field_map)
  3. L'ajouter dans build_parsers() ci-dessous

Les parsers sont testés dans l'ordre : le premier qui retourne
True sur can_parse() est utilisé.
"""

from __future__ import annotations

import configparser

from weather.parsers.base import PayloadParser
from weather.parsers.flat_parser import FlatParser
from weather.parsers.ttn_parser import TTNParser


def build_parsers(cfg: configparser.ConfigParser) -> list[PayloadParser]:
    """
    Construit la liste des parsers en injectant le field_map depuis la config.
    L'ordre est important : TTN (plus spécifique) est testé avant Flat (fallback).
    """
    field_map = dict(cfg["field_mapping"]) if "field_mapping" in cfg else {}
    station_map = {k: int(v) for k, v in dict(cfg["stations"]).items()} if "stations" in cfg else {}
    
    return [
        TTNParser(field_map=field_map, station_map=station_map),
        FlatParser(field_map=field_map, station_map=station_map),
    ]


__all__ = [
    "PayloadParser",
    "TTNParser",
    "FlatParser",
    "build_parsers",
]
