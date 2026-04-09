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
import os
import signal
import sys

from weather.alerting import AlertManager
from weather.config import load_config, setup_logging
from weather.database import Database
from weather.mqtt_client import WeatherMQTTClient


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

    import logging
    log = logging.getLogger("weather.main")
    log.info("=" * 60)
    log.info("  Weather Network MQTT Subscriber v1.0")
    log.info("=" * 60)

    # ── Configuration ─────────────────────────────────────────────────────
    cfg = load_config(args.config)

    # ── Dossiers de stockage ──────────────────────────────────────────────
    os.makedirs(cfg["storage"]["image_dir"], exist_ok=True)

    # ── Initialisation des composants ─────────────────────────────────────
    # NOTE: DB et alertes désactivées pour test de connexion au broker.
    # Décommenter quand la connexion MQTT fonctionne.
    # db = Database(cfg)
    # alert_manager = AlertManager(cfg, db)
    # mqtt_client = WeatherMQTTClient(cfg, db, alert_manager=alert_manager)
    mqtt_client = WeatherMQTTClient(cfg, db=None, alert_manager=None)

    # ── Arrêt propre (SIGINT / SIGTERM) ───────────────────────────────────
    def shutdown(sig: int, frame: object) -> None:
        log.info("Signal %d reçu, arrêt en cours…", sig)
        mqtt_client.stop()
        # db.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── Lancement ─────────────────────────────────────────────────────────
    log.info("Connexion au broker MQTT %s:%s…", cfg["mqtt"]["host"], cfg["mqtt"]["port"])
    mqtt_client.run_forever()


if __name__ == "__main__":
    main()
