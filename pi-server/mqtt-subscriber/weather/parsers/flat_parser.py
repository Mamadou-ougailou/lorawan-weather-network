"""
Parser pour le format JSON plat.

Gère les messages MQTT déjà pré-traités par un bridge (format simplifié) :
  { "site_id": 1, "temperature": 22.5, "humidity": 60.0, ... }
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from weather.models import Measurement
from weather.parsers.base import PayloadParser

log = logging.getLogger("weather.parsers.flat")


class FlatParser(PayloadParser):
    """Parse les messages JSON plats (produits par un bridge TTN→MQTT)."""

    @property
    def name(self) -> str:
        return "Flat JSON"

    def can_parse(self, payload: dict) -> bool:
        # Un message plat n'a PAS de clé "uplink_message" et a au moins "site_id"
        return "uplink_message" not in payload and "site_id" in payload

    def parse(self, payload: dict, topic: str = "") -> Optional[Measurement]:
        try:
            # ── Horodatage ────────────────────────────────────────────────
            ts_str = payload.get("received_at", datetime.now(timezone.utc).isoformat())
            try:
                received_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except ValueError:
                received_at = datetime.now(timezone.utc)

            # ── Lectures capteurs (dynamiques) ────────────────────────────
            readings = self._extract_readings(payload)

            return Measurement(
                site_id=payload["site_id"],
                received_at=received_at,
                readings=readings,
                dev_eui=payload.get("dev_eui", ""),
                f_cnt=payload.get("f_cnt"),
                rssi=payload.get("rssi"),
                snr=payload.get("snr"),
                raw_payload=json.dumps(payload)[:128],
            )
        except (KeyError, TypeError) as exc:
            log.error("Échec du parsing flat payload : %s", exc)
            return None
