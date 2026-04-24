"""
Classe abstraite pour les parsers de payload MQTT.

Pour ajouter un nouveau format, créer un fichier dans ce dossier
qui implémente PayloadParser, puis l'enregistrer dans __init__.py.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from weather.models import Measurement

log = logging.getLogger("weather.parsers")


class PayloadParser(ABC):
    """Interface commune pour tous les parsers de payload."""

    def __init__(self, field_map: dict[str, str], station_map: dict[str, int] | None = None) -> None:
        """
        :param field_map: Mapping colonne_bdd → clé_payload.
                          Chargé depuis config.ini [field_mapping].
        :param station_map: Mapping topic_mqtt → site_id.
                            Chargé depuis config.ini [stations].
        """
        self.field_map = field_map
        self.station_map = station_map or {}

    @property
    @abstractmethod
    def name(self) -> str:
        """Nom lisible du parser (pour les logs)."""
        ...

    @abstractmethod
    def can_parse(self, payload: dict) -> bool:
        """
        Retourne True si ce parser sait gérer ce payload.
        Doit être rapide (pas de parsing complet).
        """
        ...

    @abstractmethod
    def parse(self, payload: dict, topic: str = "") -> Optional["Measurement"]:
        """
        Parse le payload et retourne un Measurement, ou None en cas d'erreur.
        Le topic MQTT est fourni pour permettre d'identifier la station (site_id).
        """
        ...

    def _extract_readings(self, source: dict) -> dict[str, Optional[float]]:
        """
        Extrait les valeurs capteurs depuis un dictionnaire source.
        Utilise field_map pour traduire les noms de clés payload → colonnes BDD.
        """
        readings: dict[str, Optional[float]] = {}
        for db_col, payload_key in self.field_map.items():
            raw = source.get(payload_key)
            if raw is not None:
                try:
                    readings[db_col] = float(raw)
                except (TypeError, ValueError):
                    log.warning(
                        "Impossible de convertir '%s' (clé '%s') en float: %r",
                        db_col, payload_key, raw,
                    )
                    readings[db_col] = None
            else:
                readings[db_col] = None
        return readings

    def _infer_site_id(self, topic: str) -> int:
        """
        Déduit le site_id depuis le topic MQTT via la config [stations].
        Retourne 1 par défaut si le topic n'est pas configuré.
        """
        if not topic:
            return 1
        return self.station_map.get(topic, 1)

