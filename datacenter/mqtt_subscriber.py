import argparse
import configparser
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
import pymysql
import pymysql.cursors

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("mqtt_subscriber.log"),
    ],
)
log = logging.getLogger("weather.subscriber")

# ─── Default configuration ────────────────────────────────────────────────────
DEFAULT_CONFIG = {
    "mqtt": {
        "host":     "localhost",
        "port":     "1883",
        "username": "",
        "password": "",
        "tls":      "false",
        "topic":    "weather/stations/#",
        "client_id": "weather-datacenter",
        "keepalive": "60",
    },
    "database": {
        "host":     "localhost",
        "port":     "3306",
        "user":     "weather",
        "password": "",
        "database": "weather_network",
    },
    "storage": {
        "image_dir": "images",
    },
}

# ─── Database helper ──────────────────────────────────────────────────────────
class Database:
    def __init__(self, cfg: configparser.ConfigParser):
        self.cfg = cfg
        self._conn = None
        self._connect()

    def _connect(self):
        db = self.cfg["database"]
        self._conn = pymysql.connect(
            host=db["host"],
            port=int(db["port"]),
            user=db["user"],
            password=db["password"],
            database=db["database"],
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
            connect_timeout=10,
        )
        log.info("Connected to MariaDB at %s:%s/%s", db["host"], db["port"], db["database"])

    def _ensure_connected(self):
        try:
            self._conn.ping(reconnect=True)
        except Exception:
            log.warning("DB connection lost, reconnecting…")
            self._connect()

    def insert_measurement(self, data: dict):
        self._ensure_connected()
        sql = """
            INSERT INTO measurements
                (site_id, received_at, temperature, humidity, pressure, lux,
                 wind_speed, rain_quantity, battery_pct, bme280_ok, tsl2591_ok, camera_ok,
                 dev_eui, f_cnt, rssi, snr, raw_payload)
            VALUES
                (%(site_id)s, %(received_at)s, %(temperature)s, %(humidity)s,
                 %(pressure)s, %(lux)s, %(wind_speed)s, %(rain_quantity)s, %(battery_pct)s, %(bme280_ok)s,
                 %(tsl2591_ok)s, %(camera_ok)s, %(dev_eui)s, %(f_cnt)s,
                 %(rssi)s, %(snr)s, %(raw_payload)s)
        """
        with self._conn.cursor() as cur:
            cur.execute(sql, data)
        self._conn.commit()

    def close(self):
        if self._conn:
            self._conn.close()


# ─── MQTT callbacks ───────────────────────────────────────────────────────────
class WeatherSubscriber:
    def __init__(self, cfg: configparser.ConfigParser):
        self.cfg = cfg
        self.db  = Database(cfg)
        self.client = mqtt.Client(
            client_id=cfg["mqtt"]["client_id"],
            clean_session=True,
        )
        if cfg["mqtt"]["username"]:
            self.client.username_pw_set(
                cfg["mqtt"]["username"],
                cfg["mqtt"]["password"],
            )
        if cfg["mqtt"].getboolean("tls"):
            self.client.tls_set()

        self.client.on_connect    = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message    = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            topic = self.cfg["mqtt"]["topic"]
            log.info("Connected to MQTT broker, subscribing to '%s'", topic)
            client.subscribe(topic, qos=1)
        else:
            log.error("MQTT connection refused, return code %d", rc)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            log.warning("Unexpected MQTT disconnect (rc=%d), will reconnect", rc)

    def _on_message(self, client, userdata, msg):
        try:
            self._process_message(msg)
        except Exception as exc:
            log.exception("Error processing message on '%s': %s", msg.topic, exc)

    def _process_message(self, msg):
        payload_str = msg.payload.decode("utf-8", errors="replace")
        log.debug("RX [%s] %s", msg.topic, payload_str[:120])

        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError as exc:
            log.error("Invalid JSON on topic '%s': %s", msg.topic, exc)
            return

        # Support two formats:
        #   1. Decoded TTN webhook/MQTT JSON (nested under uplink_message)
        #   2. Flat JSON produced by the bridge script
        if "uplink_message" in payload:
            data = self._parse_ttn_uplink(payload)
        else:
            data = self._parse_flat(payload)

        if data is None:
            return

        self.db.insert_measurement(data)
        log.info(
            "Stored: site=%s T=%.2f°C H=%.2f%% P=%.2f hPa Lux=%s W=%.2f R=%.2f Bat=%s%%",
            data["site_id"], data["temperature"] or 0, data["humidity"] or 0,
            data["pressure"] or 0, data["lux"], data.get("wind_speed") or 0, 
            data.get("rain_quantity") or 0, data["battery_pct"],
        )

    # ── TTN native uplink format ──────────────────────────────────────────────
    def _parse_ttn_uplink(self, payload: dict) -> dict | None:
        try:
            up     = payload["uplink_message"]
            dec    = up.get("decoded_payload", {})
            md     = up.get("rx_metadata", [{}])[0]
            dev_id = payload.get("end_device_ids", {}).get("device_id", "")
            dev_eui = payload.get("end_device_ids", {}).get("dev_eui", "")
            f_cnt  = up.get("f_cnt", None)
            rssi   = md.get("rssi", None)
            snr    = md.get("snr", None)
            ts_str = up.get("received_at", datetime.now(timezone.utc).isoformat())

            received_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

            sensors = dec.get("sensors", {})
            
            site_id = dec.get("site_id")
            if not site_id:
                if "valrose" in dev_id or "nice" in dev_id:
                    site_id = 3
                elif "grasse" in dev_id:
                    site_id = 2
                else:
                    site_id = 1

            return {
                "site_id":     site_id,
                "received_at": received_at,
                "temperature": dec.get("temperature"),
                "humidity":    dec.get("humidity"),
                "pressure":    dec.get("pressure"),
                "lux":         dec.get("lux"),
                "wind_speed":  dec.get("wind_speed"),
                "rain_quantity": dec.get("rain_speed"),
                "battery_pct": dec.get("battery"),
                "bme280_ok":   1 if sensors.get("bme280") else 0,
                "tsl2591_ok":  1 if sensors.get("tsl2591") else 0,
                "camera_ok":   1 if sensors.get("camera") else 0,
                "dev_eui":     dev_eui,
                "f_cnt":       f_cnt,
                "rssi":        rssi,
                "snr":         snr,
                "raw_payload": json.dumps(dec)[:64],
            }
        except (KeyError, TypeError, ValueError) as exc:
            log.error("Failed to parse TTN uplink: %s", exc)
            return None

    # ── Flat bridge format ────────────────────────────────────────────────────
    def _parse_flat(self, payload: dict) -> dict | None:
        try:
            ts_str = payload.get("received_at", datetime.now(timezone.utc).isoformat())
            try:
                received_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except ValueError:
                received_at = datetime.now(timezone.utc)

            return {
                "site_id":     payload["site_id"],
                "received_at": received_at,
                "temperature": payload.get("temperature"),
                "humidity":    payload.get("humidity"),
                "pressure":    payload.get("pressure"),
                "lux":         payload.get("lux"),
                "wind_speed":  payload.get("wind_speed"),
                "rain_quantity": payload.get("rain_quantity", payload.get("rain_speed")),
                "battery_pct": payload.get("battery"),
                "bme280_ok":   1 if payload.get("bme280_ok") else 0,
                "tsl2591_ok":  1 if payload.get("tsl2591_ok") else 0,
                "camera_ok":   1 if payload.get("camera_ok") else 0,
                "dev_eui":     payload.get("dev_eui", ""),
                "f_cnt":       payload.get("f_cnt"),
                "rssi":        payload.get("rssi"),
                "snr":         payload.get("snr"),
                "raw_payload": json.dumps(payload)[:64],
            }
        except (KeyError, TypeError) as exc:
            log.error("Failed to parse flat payload: %s", exc)
            return None

    # ── Run ───────────────────────────────────────────────────────────────────
    def run(self):
        mqtt_cfg = self.cfg["mqtt"]
        self.client.connect(
            mqtt_cfg["host"],
            int(mqtt_cfg["port"]),
            keepalive=int(mqtt_cfg["keepalive"]),
        )

        def _shutdown(sig, frame):
            log.info("Signal %d received, shutting down…", sig)
            self.client.disconnect()
            self.db.close()
            sys.exit(0)

        signal.signal(signal.SIGINT,  _shutdown)
        signal.signal(signal.SIGTERM, _shutdown)

        log.info("Starting MQTT loop…")
        self.client.loop_forever(retry_first_connection=True)


# ─── Entry point ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Weather MQTT subscriber / DB writer")
    parser.add_argument(
        "--config", default="config.ini",
        help="Path to configuration file (default: config.ini)"
    )
    args = parser.parse_args()

    cfg = configparser.ConfigParser()
    # Load defaults first
    for section, values in DEFAULT_CONFIG.items():
        cfg[section] = values

    if os.path.exists(args.config):
        cfg.read(args.config)
        log.info("Loaded configuration from %s", args.config)
    else:
        log.warning("Config file %s not found, using defaults", args.config)

    # Ensure storage directories exist locally
    os.makedirs(cfg["storage"]["image_dir"], exist_ok=True)

    subscriber = WeatherSubscriber(cfg)
    subscriber.run()


if __name__ == "__main__":
    main()
