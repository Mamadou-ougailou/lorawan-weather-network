"""
Modèles de données pour le réseau météo LoRaWAN.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Measurement:
    """Représente une mesure météo reçue d'une station."""

    site_id: int
    received_at: datetime

    # ── Capteurs environnementaux ─────────────────────────────────────────
    temperature: Optional[float] = None       # °C
    humidity: Optional[float] = None          # %
    pressure: Optional[float] = None          # hPa
    lux: Optional[int] = None                 # lux
    wind_speed: Optional[float] = None        # km/h
    rain_quantity: Optional[float] = None     # mm/h
    battery_pct: Optional[int] = None         # 0-100 %

    # ── Flags de santé capteurs ───────────────────────────────────────────
    bme280_ok: bool = False
    tsl2591_ok: bool = False
    camera_ok: bool = False

    # ── Métadonnées LoRaWAN ───────────────────────────────────────────────
    dev_eui: str = ""
    f_cnt: Optional[int] = None
    rssi: Optional[int] = None
    snr: Optional[float] = None
    raw_payload: Optional[str] = None

    # ── Helpers ───────────────────────────────────────────────────────────

    def to_db_dict(self) -> dict:
        """Retourne un dictionnaire prêt pour l'insertion SQL."""
        d = asdict(self)
        d["bme280_ok"] = int(self.bme280_ok)
        d["tsl2591_ok"] = int(self.tsl2591_ok)
        d["camera_ok"] = int(self.camera_ok)
        return d

    def summary(self) -> str:
        """Résumé lisible pour les logs."""
        return (
            f"site={self.site_id} T={self.temperature or 0:.2f}°C "
            f"H={self.humidity or 0:.2f}% P={self.pressure or 0:.2f}hPa "
            f"Lux={self.lux} W={self.wind_speed or 0:.2f} "
            f"R={self.rain_quantity or 0:.2f} Bat={self.battery_pct}%"
        )

    @staticmethod
    def now_utc() -> datetime:
        return datetime.now(timezone.utc)
