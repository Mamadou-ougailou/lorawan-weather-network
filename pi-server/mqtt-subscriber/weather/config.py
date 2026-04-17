"""
Gestion centralisée de la configuration.

Priorité de chargement :
  1. Valeurs par défaut (DEFAULT_CONFIG)
  2. Fichier config.ini
  3. Variables d'environnement (override, préfixées WEATHER_)
"""

from __future__ import annotations

import configparser
import logging
import logging.handlers
import os
import sys
from pathlib import Path
from typing import Optional

log = logging.getLogger("weather.config")

# ─── Valeurs par défaut ───────────────────────────────────────────────────────
DEFAULT_CONFIG: dict[str, dict[str, str]] = {
    "mqtt": {
        "host": "localhost",
        "port": "1883",
        "username": "",
        "password": "",
        "tls": "false",
        "topic": "weather/stations/#",
        "client_id": "weather-datacenter",
        "keepalive": "60",
    },
    "database": {
        "host": "localhost",
        "port": "3306",
        "user": "weather",
        "password": "",
        "database": "weather_network",
    },
    "alerting": {
        "enabled": "true",
        "temperature_min": "-10",
        "temperature_max": "50",
        "humidity_min": "0",
        "humidity_max": "100",
    },
    # field_mapping intentionally has no defaults — the user must define
    # their payload keys explicitly in config.ini [field_mapping].
    "field_mapping": {},
}

# Mapping : variable d'environnement → (section, clé)
ENV_OVERRIDES: dict[str, tuple[str, str]] = {
    "WEATHER_MQTT_HOST":         ("mqtt", "host"),
    "WEATHER_MQTT_PORT":         ("mqtt", "port"),
    "WEATHER_MQTT_USERNAME":     ("mqtt", "username"),
    "WEATHER_MQTT_PASSWORD":     ("mqtt", "password"),
    "WEATHER_MQTT_TLS":          ("mqtt", "tls"),
    "WEATHER_MQTT_TOPIC":        ("mqtt", "topic"),
    "WEATHER_MQTT_CLIENT_ID":    ("mqtt", "client_id"),
    "WEATHER_DB_HOST":           ("database", "host"),
    "WEATHER_DB_PORT":           ("database", "port"),
    "WEATHER_DB_USER":           ("database", "user"),
    "WEATHER_DB_PASSWORD":       ("database", "password"),
    "WEATHER_DB_NAME":           ("database", "database"),
    "WEATHER_ALERTING_ENABLED":  ("alerting", "enabled"),
}


def load_config(config_path: str = "config.ini") -> configparser.ConfigParser:
    """
    Charge la configuration en combinant :
      defaults → fichier ini → variables d'environnement.

    Note: les commentaires inline dans le fichier INI (# ou ;) sont supportés.
    """
    cfg = configparser.ConfigParser(
        inline_comment_prefixes=("#", ";"),
        comment_prefixes=("#", ";"),
    )

    # 1. Defaults
    for section, values in DEFAULT_CONFIG.items():
        cfg[section] = values

    # 2. Fichier INI
    resolved = Path(config_path).resolve()
    if resolved.is_file():
        cfg.read(str(resolved))
        log.info("Configuration chargée depuis %s", resolved)
    else:
        log.warning(
            "Fichier de config %s introuvable, utilisation des valeurs par défaut",
            resolved,
        )

    # 3. Variables d'environnement (override)
    for env_var, (section, key) in ENV_OVERRIDES.items():
        val = os.environ.get(env_var)
        if val is not None:
            if section not in cfg:
                cfg[section] = {}
            cfg[section][key] = val
            log.debug("Override env: %s → [%s].%s", env_var, section, key)

    return cfg


def setup_logging(level: str = "INFO", log_file: Optional[str] = "mqtt_subscriber.log") -> None:
    """Configure le logging global de l'application avec rotation de fichier."""
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file, maxBytes=5 * 1024 * 1024, backupCount=3
        )
        handlers.append(file_handler)

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )
