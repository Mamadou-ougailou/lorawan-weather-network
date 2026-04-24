"""
Modèles de données pour le réseau météo LoRaWAN.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Measurement:
    """Représente une mesure météo reçue d'une station."""

    site_id: int
    received_at: datetime


    # ── Lectures capteurs (dynamiques, pilotées par [field_mapping]) ──────
    # Clés = noms de colonnes dans la table `measurements`.
    # Valeurs = float ou None si le capteur n'a pas renvoyé de donnée.
    readings: dict[str, Optional[float]] = field(default_factory=dict)

    # ── Métadonnées LoRaWAN ───────────────────────────────────────────────
    dev_eui: str = ""
    f_cnt: Optional[int] = None
    rssi: Optional[int] = None
    snr: Optional[float] = None
    raw_payload: Optional[str] = None

    # ── Helpers ───────────────────────────────────────────────────────────

    def to_db_dict(self) -> dict:
        """
        Retourne un dictionnaire plat prêt pour l'insertion SQL.
        Les lectures capteurs sont fusionnées avec les métadonnées.
        """
        base = {
            "site_id": self.site_id,
            "received_at": self.received_at,
            "dev_eui": self.dev_eui,
            "f_cnt": self.f_cnt,
            "rssi": self.rssi,
            "snr": self.snr,
            "raw_payload": self.raw_payload,
        }
        base.update(self.readings)
        return base

    def summary(self) -> str:
        """Résumé lisible pour les logs."""
        readings_str = " ".join(
            f"{k}={v}" for k, v in self.readings.items() if v is not None
        )
        return f"site={self.site_id} {readings_str}"

