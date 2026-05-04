#!/usr/bin/env python3
"""
main.py — LoRaWAN Weather MQTT Subscriber

Connects to the MQTT broker, parses incoming sensor data, and writes it
to MariaDB. That's it.

Usage:
    python main.py                          # uses config.ini
    python main.py --config /path/to/config.ini
"""

import argparse
import configparser
import json
import os
import signal
import sys
import time

import paho.mqtt.client as mqtt
import pymysql
import pymysql.cursors

from parsers import parse


# ── Config ────────────────────────────────────────────────────────────────────

def load_config(path: str) -> configparser.ConfigParser:
    cfg = configparser.ConfigParser(inline_comment_prefixes=("#", ";"))
    cfg.read(path)

    env_map = {
        "WEATHER_DB_HOST":     ("database", "host"),
        "WEATHER_DB_PORT":     ("database", "port"),
        "WEATHER_DB_USER":     ("database", "user"),
        "WEATHER_DB_PASSWORD": ("database", "password"),
        "WEATHER_DB_NAME":     ("database", "database"),
    }
    for env_var, (section, key) in env_map.items():
        val = os.environ.get(env_var)
        if val is not None:
            if section not in cfg:
                cfg[section] = {}
            cfg[section][key] = val

    return cfg


# ── Database ──────────────────────────────────────────────────────────────────

class DB:
    """Minimal MariaDB wrapper with auto-reconnect."""

    def __init__(self, host, port, user, password, database):
        self._params = dict(host=host, port=port, user=user, password=password,
                            database=database, charset="utf8mb4",
                            cursorclass=pymysql.cursors.DictCursor, autocommit=False)
        self._conn = None
        self._connect()

    def _connect(self):
        for attempt in range(5):
            try:
                self._conn = pymysql.connect(**self._params)
                print(f"[DB] Connected to {self._params['host']}:{self._params['port']}/{self._params['database']}")
                return
            except pymysql.Error as e:
                print(f"[DB] Connect attempt {attempt + 1}/5: {e}")
                time.sleep(3)
        raise ConnectionError("Cannot connect to MariaDB")

    def _ensure(self):
        try:
            if self._conn:
                self._conn.ping(reconnect=True)
            else:
                self._connect()
        except Exception:
            self._connect()

    def insert(self, row: dict) -> int:
        """Insert a row into `measurements`. Returns the row ID."""
        self._ensure()
        cols = ", ".join(row.keys())
        placeholders = ", ".join(f"%({k})s" for k in row)
        sql = f"INSERT INTO measurements ({cols}) VALUES ({placeholders})"
        with self._conn.cursor() as cur:
            cur.execute(sql, row)
            row_id = cur.lastrowid
        self._conn.commit()

        try:
            with self._conn.cursor() as cur:
                cur.execute("CALL update_last_seen(%s)", (row["site_id"],))
            self._conn.commit()
        except pymysql.Error:
            pass

        return row_id or 0

    def close(self):
        if self._conn:
            self._conn.close()
            print("[DB] Connection closed.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Weather MQTT Subscriber")
    parser.add_argument("--config", default="config.ini")
    args = parser.parse_args()

    cfg = load_config(args.config)

    # Station map: topic → site_id
    station_map = {}
    if "stations" in cfg:
        station_map = {k: int(v) for k, v in cfg["stations"].items()}

    # Database
    db_cfg = cfg["database"]
    db = DB(
        host=db_cfg["host"],
        port=int(db_cfg["port"]),
        user=db_cfg["user"],
        password=db_cfg["password"],
        database=db_cfg["database"],
    )

    # MQTT
    mqtt_cfg = cfg["mqtt"]
    port = int(mqtt_cfg["port"])
    topics = list(station_map.keys())

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=mqtt_cfg.get("client_id", "weather-subscriber"),
        transport="websockets" if port == 443 else "tcp",
    )

    if mqtt_cfg.get("username"):
        client.username_pw_set(mqtt_cfg["username"], mqtt_cfg["password"])
    if mqtt_cfg.getboolean("tls", fallback=False):
        client.tls_set()

    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            print("[MQTT] Connected to broker")
            for t in topics:
                client.subscribe(t, qos=1)
                print(f"[MQTT]   → {t}")
        else:
            print(f"[MQTT] Connection refused (rc={rc})")

    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError as e:
            print(f"[MQTT] Bad JSON on {msg.topic}: {e}")
            return

        row = parse(payload, msg.topic, station_map)
        if row is None:
            print(f"[MQTT] Unparseable message on {msg.topic}")
            return

        try:
            row_id = db.insert(row)
            print(f"[#{row_id}] site={row.get('site_id')} {row.get('readings', '{}')}")
        except Exception as e:
            print(f"[ERROR] DB insert failed: {e}")

    def on_disconnect(client, userdata, flags, rc, properties=None):
        if rc != 0:
            print(f"[MQTT] Unexpected disconnect (rc={rc}). Reconnecting…")
        else:
            print("[MQTT] Disconnected cleanly.")

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    # Graceful shutdown
    def shutdown(sig, frame):
        print("\nShutting down…")
        client.disconnect()
        db.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("=" * 50)
    print("  Weather MQTT Subscriber")
    print("=" * 50)
    print(f"Connecting to {mqtt_cfg['host']}:{port}…")
    client.connect(mqtt_cfg["host"], port, keepalive=60)
    client.loop_forever(retry_first_connection=True)


if __name__ == "__main__":
    main()
