"""
Système d'alertes configurable.

Les règles d'alerte sont détectées automatiquement depuis config.ini [alerting] :
toute clé de la forme <metric>_min ou <metric>_max crée une règle.
La métrique doit être une clé présente dans Measurement.readings.

Extensible : ajouter temperature_min = -5 dans [alerting] suffit à créer une règle.
"""

from __future__ import annotations

import configparser
import logging
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from weather.database import Database
    from weather.models import Measurement

log = logging.getLogger("weather.alerting")

# Clés de config réservées à la gestion interne, pas des métriques
_RESERVED_KEYS = {"enabled"}


@dataclass
class AlertRule:
    """Définition d'une règle d'alerte."""

    metric: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None

    def check(self, value: Optional[float]) -> Optional[str]:
        """Retourne un message d'alerte ou None."""
        if value is None:
            return None
        if self.min_value is not None and value < self.min_value:
            return f"{self.metric} trop bas : {value} < seuil {self.min_value}"
        if self.max_value is not None and value > self.max_value:
            return f"{self.metric} trop haut : {value} > seuil {self.max_value}"
        return None

    def get_threshold(self, value: float) -> float:
        """Retourne le seuil dépassé."""
        if self.min_value is not None and value < self.min_value:
            return self.min_value
        if self.max_value is not None and value > self.max_value:
            return self.max_value
        return 0.0


def _build_rules(alert_cfg: dict) -> list[AlertRule]:
    """
    Construit les règles d'alerte dynamiquement depuis la section [alerting].
    Toute clé de la forme <metric>_min ou <metric>_max génère une règle.
    """
    thresholds: dict[str, dict[str, float]] = {}
    pattern = re.compile(r"^(.+)_(min|max)$")

    for key, value in alert_cfg.items():
        if key in _RESERVED_KEYS:
            continue
        match = pattern.match(key)
        if match:
            metric, bound = match.group(1), match.group(2)
            thresholds.setdefault(metric, {})[bound] = float(value)

    rules = [
        AlertRule(
            metric=metric,
            min_value=bounds.get("min"),
            max_value=bounds.get("max"),
        )
        for metric, bounds in thresholds.items()
    ]
    return rules


class AlertManager:
    """
    Gestionnaire d'alertes.
    Charge les seuils dynamiquement depuis [alerting] et vérifie chaque mesure.
    """

    def __init__(self, cfg: configparser.ConfigParser, db: "Database"):
        self._db = db
        self._enabled = cfg.getboolean("alerting", "enabled", fallback=True)
        self._rules: list[AlertRule] = []

        if not self._enabled:
            log.info("Système d'alertes désactivé.")
            return

        alert_cfg = dict(cfg["alerting"]) if "alerting" in cfg else {}
        self._rules = _build_rules(alert_cfg)
        log.info("Système d'alertes activé avec %d règle(s).", len(self._rules))

    def evaluate(self, measurement: "Measurement") -> int:
        """
        Évalue toutes les règles pour une mesure donnée.
        Lit les valeurs depuis measurement.readings (dict dynamique).
        Retourne le nombre d'alertes déclenchées.
        """
        if not self._enabled:
            return 0

        triggered = 0
        for rule in self._rules:
            value = measurement.readings.get(rule.metric)
            message = rule.check(value)
            if message:
                threshold = rule.get_threshold(value)  # type: ignore[arg-type]
                try:
                    self._db.insert_alert(
                        site_id=measurement.site_id,
                        metric=rule.metric,
                        value=float(value),  # type: ignore[arg-type]
                        threshold=threshold,
                        message=message,
                    )
                    log.warning("ALERTE site %d : %s", measurement.site_id, message)
                    triggered += 1
                except Exception as exc:
                    log.error("Erreur insertion alerte : %s", exc)

        return triggered
