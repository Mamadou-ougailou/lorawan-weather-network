"""
weather — Backend modulaire pour le réseau météo LoRaWAN.

Ce package fournit :
  - models      : Dataclasses typées (Measurement)
  - config      : Chargement et validation de la configuration
  - database    : Accès MariaDB (insert, health-check, reconnexion auto)
  - mqtt_client : Client MQTT avec dispatch automatique des parsers
  - parsers     : Parsers de payload extensibles (TTN, flat, …)
  - alerting    : Système d'alertes configurable
"""

__version__ = "1.0.0"
