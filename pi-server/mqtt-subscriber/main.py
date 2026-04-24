#!/usr/bin/env python3
"""
Point d'entrée du subscriber MQTT météo.

Usage :
    python main.py                          # utilise config.ini par défaut
    python main.py --config /etc/weather/config.ini
    python main.py --log-level DEBUG
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import threading
import time

from weather.alerting import AlertManager
from weather.config import load_config, setup_logging
from weather.database import Database
from weather.mqtt_client import WeatherMQTTClient
from weather.parsers import build_parsers


def main() -> None:
    # ── Arguments CLI ─────────────────────────────────────────────────────
    parser = argparse.ArgumentParser(
        description="Weather Network MQTT Subscriber — collecte et stockage des données météo"
    )
    parser.add_argument(
        "--config",
        default="config.ini",
        help="Chemin vers le fichier de configuration (défaut: config.ini)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Niveau de log (défaut: INFO)",
    )
    parser.add_argument(
        "--log-file",
        default="mqtt_subscriber.log",
        help="Fichier de log (défaut: mqtt_subscriber.log, vide = stdout uniquement)",
    )
    args = parser.parse_args()

    # ── Logging ───────────────────────────────────────────────────────────
    setup_logging(level=args.log_level, log_file=args.log_file or None)

    log = logging.getLogger("weather.main")
    log.info("=" * 60)
    log.info("  Weather Network MQTT Subscriber v2.0")
    log.info("=" * 60)

    # ── Configuration ─────────────────────────────────────────────────────
    cfg = load_config(args.config)

    # ── Parsers pilotés par config ─────────────────────────────────────────
    parsers = build_parsers(cfg)
    field_map = dict(cfg["field_mapping"]) if "field_mapping" in cfg else {}

    # ── Initialisation des composants ─────────────────────────────────────
    db = Database(cfg)

    # ── Synchronisation automatique du schéma ─────────────────────────────
    # Ajoute ou supprime les colonnes dans `measurements` selon [field_mapping]
    db.sync_sensor_columns(field_map)
    db.sync_stations(cfg)
    alert_manager = AlertManager(cfg, db)
    mqtt_client = WeatherMQTTClient(cfg, db, alert_manager=alert_manager, parsers=parsers)

    # ── Arrêt propre (SIGINT / SIGTERM) ───────────────────────────────────
    def shutdown(sig: int, frame: object) -> None:
        log.info("Signal %d reçu, arrêt en cours…", sig)
        mqtt_client.stop()
        db.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── Lancement ─────────────────────────────────────────────────────────
    def aggregator_loop() -> None:
        while True:
            # Attend 1 heure (3600 sec) avant de déclencher l'agrégation
            time.sleep(3600)
            db.refresh_hourly_stats(hours_back=2)

    agg_thread = threading.Thread(target=aggregator_loop, daemon=True, name="Aggregator")
    agg_thread.start()
    log.info("Thread de synchronisation horaire démarré en arrière-plan.")

    log.info("Connexion au broker MQTT %s:%s…", cfg["mqtt"]["host"], cfg["mqtt"]["port"])
    mqtt_client.run_forever()


if __name__ == "__main__":
    main()
