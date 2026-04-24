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

    def parse(self, payload: dict, topic: str = "") -> Optional[Measurement]:
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

            # ── Horodatage broker ─────────────────────────────────────────
            ts_str = up.get("received_at", datetime.now(timezone.utc).isoformat())
            received_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

            # ── Site ID ───────────────────────────────────────────────────
            # site_id est déduit du topic MQTT ou forcé depuis le payload s'il est présent
            site_id = dec.get("site_id") or self._infer_site_id(topic)

            # ── Lectures capteurs (dynamiques) ────────────────────────────
            # Les champs capteurs viennent du payload TTN decoded_payload.
            # field_map (config.ini [field_mapping]) dit quelle clé chercher.
            sensors_source = dec.get("sensors", dec)
            readings = self._extract_readings(sensors_source)

            return Measurement(
                site_id=site_id,
                received_at=received_at,
                readings=readings,
                dev_eui=dev_eui,
                f_cnt=f_cnt,
                rssi=rssi,
                snr=snr,
                raw_payload=json.dumps(dec)[:128],
            )
        except (KeyError, TypeError, ValueError) as exc:
            log.error("Échec du parsing TTN uplink : %s", exc)
            return None