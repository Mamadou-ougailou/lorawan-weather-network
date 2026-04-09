"""
Parser pour le format TTN (The Things Network) natif.

Gère les messages MQTT contenant la structure imbriquée TTN :
  { "end_device_ids": {...}, "uplink_message": { "decoded_payload": {...}, ... } }
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from weather.models import Measurement
from weather.parsers.base import PayloadParser

log = logging.getLogger("weather.parsers.ttn")


class TTNParser(PayloadParser):
    """Parse les uplinks TTN v3 natifs."""

    @property
    def name(self) -> str:
        return "TTN Uplink"

    def can_parse(self, payload: dict) -> bool:
        return "uplink_message" in payload

    def parse(self, payload: dict) -> Optional[Measurement]:
        try:
            up = payload["uplink_message"]
            dec = up.get("decoded_payload", {})
            md = up.get("rx_metadata", [{}])[0]

            # ── Identifiants device ───────────────────────────────────────
            end_dev = payload.get("end_device_ids", {})
            dev_id = end_dev.get("device_id", "")
            dev_eui = end_dev.get("dev_eui", "")

            # ── Métadonnées LoRaWAN ───────────────────────────────────────
            f_cnt = up.get("f_cnt")
            rssi = md.get("rssi")
            snr = md.get("snr")

            # ── Horodatage ────────────────────────────────────────────────
            ts_str = up.get("received_at", datetime.now(timezone.utc).isoformat())
            received_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

            # ── Capteurs ──────────────────────────────────────────────────
            sensors = dec.get("sensors", {})

            # ── Site ID (payload ou déduit du device_id) ──────────────────
            site_id = dec.get("site_id")
            if not site_id:
                site_id = self._infer_site_id(dev_id)

            return Measurement(
                site_id=site_id,
                received_at=received_at,
                temperature=dec.get("temperature"),
                humidity=dec.get("humidity"),
                pressure=dec.get("pressure"),
                lux=dec.get("lux"),
                wind_speed=dec.get("wind_speed"),
                rain_quantity=dec.get("rain_speed"),
                battery_pct=dec.get("battery"),
                bme280_ok=bool(sensors.get("bme280")),
                tsl2591_ok=bool(sensors.get("tsl2591")),
                camera_ok=bool(sensors.get("camera")),
                dev_eui=dev_eui,
                f_cnt=f_cnt,
                rssi=rssi,
                snr=snr,
                raw_payload=json.dumps(dec)[:64],
            )
        except (KeyError, TypeError, ValueError) as exc:
            log.error("Échec du parsing TTN uplink : %s", exc)
            return None

    @staticmethod
    def _infer_site_id(device_id: str) -> int:
        """Déduit le site_id depuis le device_id TTN si absent du payload."""
        device_id_lower = device_id.lower()
        if "valrose" in device_id_lower or "nice" in device_id_lower:
            return 3
        if "grasse" in device_id_lower:
            return 2
        return 1  # Mougins par défaut
