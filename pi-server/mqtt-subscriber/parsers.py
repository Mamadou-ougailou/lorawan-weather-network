"""
parsers.py — Parse MQTT payloads into a row dict for DB insertion.

Supports two formats:
  1. TTN v3 uplink:  { "uplink_message": { "decoded_payload": { ... } } }
  2. Flat JSON:      { "site_id": 1, "temp1": 22.5, ... }

The parser extracts static metadata (site_id, timestamps, LoRaWAN info)
and dumps ALL remaining sensor data as-is into a `readings` JSON field.
No field mapping, no hardcoded sensor names.
"""

import json
from datetime import datetime, timezone

# Keys that are metadata, not sensor readings — excluded from the JSON blob
_META_KEYS = {
    "site_id", "dev_eui", "f_cnt", "rssi", "snr",
    "received_at", "raw_payload",
    # TTN envelope keys that may leak into decoded_payload
    "end_device_ids", "uplink_message", "correlation_ids",
    "simulated", "confirmed",
}


def _extract_readings(source: dict) -> dict:
    """
    Extract sensor readings from a dict by removing known metadata keys.
    Everything that remains is a sensor reading — no mapping needed.
    """
    return {k: v for k, v in source.items() if k not in _META_KEYS and v is not None}


def _parse_timestamp(raw: str) -> datetime:
    """Parse an ISO timestamp string, fallback to now()."""
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, AttributeError, TypeError):
        return datetime.now(timezone.utc)


def parse(payload: dict, topic: str, station_map: dict) -> dict | None:
    """
    Parse a raw MQTT payload into a row dict for DB insertion.

    Returns a dict with:
      - site_id, received_at, dev_eui, f_cnt, rssi, snr  (static metadata)
      - readings: str  (JSON string of all sensor data)

    Returns None if the payload can't be parsed.
    """

    # ── Format 1: TTN v3 uplink ───────────────────────────────────────────
    if "uplink_message" in payload:
        up = payload["uplink_message"]
        decoded = up.get("decoded_payload", {})
        rx = up.get("rx_metadata", [{}])[0]
        end_dev = payload.get("end_device_ids", {})

        readings = _extract_readings(decoded.get("sensors", decoded))
        row = {
            "site_id":     decoded.get("site_id") or station_map.get(topic, 1),
            "received_at": _parse_timestamp(up.get("received_at", "")),
            "dev_eui":     end_dev.get("dev_eui"),
            "f_cnt":       up.get("f_cnt"),
            "rssi":        rx.get("rssi"),
            "snr":         rx.get("snr"),
            "readings":    json.dumps(readings),
        }

    # ── Format 2: Flat JSON ───────────────────────────────────────────────
    elif "site_id" in payload:
        readings = _extract_readings(payload)
        row = {
            "site_id":     payload["site_id"],
            "received_at": _parse_timestamp(payload.get("received_at", "")),
            "dev_eui":     payload.get("dev_eui"),
            "f_cnt":       payload.get("f_cnt"),
            "rssi":        payload.get("rssi"),
            "snr":         payload.get("snr"),
            "readings":    json.dumps(readings),
        }

    else:
        return None

    # Must have at least some sensor data
    if not readings:
        return None

    # Drop None metadata values (let DB use defaults)
    return {k: v for k, v in row.items() if v is not None}
