"""
Système d'alertes configurable.

Vérifie les seuils après chaque mesure et insère dans la table `alerts`
si un dépassement est détecté.

Extensible : ajouter de nouvelles règles en créant des méthodes _check_*.
"""

from __future__ import annotations

import configparser
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from weather.database import Database
    from weather.models import Measurement

log = logging.getLogger("weather.alerting")


@dataclass
class AlertRule:
    """Définition d'une règle d'alerte."""

    metric: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None

    def check(self, value: Optional[float]) -> Optional[str]:
        """
        Vérifie si la valeur dépasse les seuils.
        Retourne un message d'alerte ou None.
        """
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


class AlertManager:
    """
    Gestionnaire d'alertes.

    Charge les seuils depuis la configuration et vérifie chaque mesure.
    """

    def __init__(self, cfg: configparser.ConfigParser, db: "Database"):
        self._db = db
        self._enabled = cfg.getboolean("alerting", "enabled", fallback=True)
        self._rules: list[AlertRule] = []

        if not self._enabled:
            log.info("Système d'alertes désactivé.")
            return

        # Charger les règles depuis la configuration
        alert_cfg = cfg["alerting"] if "alerting" in cfg else {}
        self._rules = [
            AlertRule(
                metric="temperature",
                min_value=float(alert_cfg.get("temperature_min", "-10")),
                max_value=float(alert_cfg.get("temperature_max", "50")),
            ),
            AlertRule(
                metric="humidity",
                min_value=float(alert_cfg.get("humidity_min", "0")),
                max_value=float(alert_cfg.get("humidity_max", "100")),
            ),
            AlertRule(
                metric="battery_pct",
                min_value=float(alert_cfg.get("battery_min", "10")),
            ),
        ]
        log.info(
            "Système d'alertes activé avec %d règle(s).",
            len(self._rules),
        )

    def evaluate(self, measurement: "Measurement") -> int:
        """
        Évalue toutes les règles pour une mesure donnée.
        Retourne le nombre d'alertes déclenchées.
        """
        if not self._enabled:
            return 0

        triggered = 0
        for rule in self._rules:
            value = getattr(measurement, rule.metric, None)
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
                    log.warning("🚨 ALERTE site %d : %s", measurement.site_id, message)
                    triggered += 1
                except Exception as exc:
                    log.error("Erreur insertion alerte : %s", exc)

        return triggered
