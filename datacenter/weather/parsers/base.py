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
    def parse(self, payload: dict) -> Optional["Measurement"]:
        """
        Parse le payload et retourne un Measurement, ou None en cas d'erreur.
        """
        ...
