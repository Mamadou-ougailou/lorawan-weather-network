"""
Client MQTT pour la collecte de données météo.

Se connecte au broker MQTT (université ou TTN), dispatche les messages
vers le bon parser, et insère les mesures en base.
"""

from __future__ import annotations

import configparser
import json
import logging
from typing import TYPE_CHECKING

import paho.mqtt.client as mqtt

from weather.parsers import DEFAULT_PARSERS
from weather.parsers.base import PayloadParser

if TYPE_CHECKING:
    from weather.alerting import AlertManager
    from weather.database import Database

log = logging.getLogger("weather.mqtt")


class WeatherMQTTClient:
    """
    Client MQTT météo.

    Responsabilités :
      - Connexion / reconnexion au broker
      - Réception et dispatch des messages
      - Coordination parsers → DB → alertes
    """

    def __init__(
        self,
        cfg: configparser.ConfigParser,
        db: "Database | None" = None,
        alert_manager: "AlertManager | None" = None,
        parsers: list[PayloadParser] | None = None,
    ):
        self._cfg = cfg
        self._db = db
        self._alert_manager = alert_manager
        self._parsers: list[PayloadParser] = parsers or list(DEFAULT_PARSERS)

        mqtt_cfg = cfg["mqtt"]
        self._topic = mqtt_cfg["topic"]

        # Configuration du client Paho
        self._client = mqtt.Client(
            client_id=mqtt_cfg["client_id"],
            clean_session=True,
        )

        # Authentification
        username = mqtt_cfg.get("username", "").strip()
        if username:
            self._client.username_pw_set(username, mqtt_cfg.get("password", ""))

        # TLS
        if mqtt_cfg.getboolean("tls", fallback=False):
            self._client.tls_set()

        # Callbacks
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        mode = "LOG-ONLY" if db is None else "DB+LOG"
        log.info(
            "Client MQTT configuré [%s] — broker=%s:%s topic=%s parsers=[%s]",
            mode,
            mqtt_cfg["host"],
            mqtt_cfg["port"],
            self._topic,
            ", ".join(p.name for p in self._parsers),
        )

    # ── Callbacks MQTT ─────────────────────────────────────────────────────────

    def _on_connect(
        self, client: mqtt.Client, userdata: object, flags: dict, rc: int
    ) -> None:
        if rc == 0:
            log.info("Connecté au broker MQTT, abonnement à '%s'", self._topic)
            client.subscribe(self._topic, qos=1)
        else:
            log.error("Connexion MQTT refusée, code retour = %d", rc)

    def _on_disconnect(
        self, client: mqtt.Client, userdata: object, rc: int
    ) -> None:
        if rc != 0:
            log.warning(
                "Déconnexion MQTT inattendue (rc=%d), reconnexion auto…", rc
            )

    def _on_message(
        self, client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage
    ) -> None:
        try:
            self._process_message(msg)
        except Exception as exc:
            log.exception("Erreur lors du traitement de '%s' : %s", msg.topic, exc)

    # ── Traitement des messages ────────────────────────────────────────────────

    def _process_message(self, msg: mqtt.MQTTMessage) -> None:
        payload_str = msg.payload.decode("utf-8", errors="replace")

        # En mode log-only, afficher le payload brut à INFO
        log.info("📩 RX [%s] %s", msg.topic, payload_str[:500])

        # Décoder le JSON
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError as exc:
            log.error("JSON invalide sur '%s' : %s", msg.topic, exc)
            return

        # Trouver le bon parser
        measurement = None
        for parser in self._parsers:
            if parser.can_parse(payload):
                log.debug("Parser sélectionné : %s", parser.name)
                measurement = parser.parse(payload)
                break

        if measurement is None:
            log.warning(
                "Aucun parser n'a pu traiter le message sur '%s'", msg.topic
            )
            return

        # Mode log-only (pas de DB)
        if self._db is None:
            log.info("📊 [LOG-ONLY] %s", measurement.summary())
            return

        # Insérer en base de données
        row_id = self._db.insert_measurement(measurement)
        log.info("✅ [#%d] %s", row_id, measurement.summary())

        # Évaluer les alertes
        if self._alert_manager:
            self._alert_manager.evaluate(measurement)

    # ── Gestion des parsers ────────────────────────────────────────────────────

    def register_parser(self, parser: PayloadParser, priority: int = -1) -> None:
        """
        Enregistre un parser supplémentaire.
        priority=-1 → ajout à la fin.
        priority=0  → ajout en tête (sera testé en premier).
        """
        if priority < 0 or priority >= len(self._parsers):
            self._parsers.append(parser)
        else:
            self._parsers.insert(priority, parser)
        log.info("Parser '%s' enregistré (position %d)", parser.name, priority)

    # ── Boucle principale ──────────────────────────────────────────────────────

    def connect(self) -> None:
        """Se connecte au broker MQTT."""
        mqtt_cfg = self._cfg["mqtt"]
        self._client.connect(
            mqtt_cfg["host"],
            int(mqtt_cfg["port"]),
            keepalive=int(mqtt_cfg.get("keepalive", "60")),
        )

    def run_forever(self) -> None:
        """Démarre la boucle MQTT bloquante avec reconnexion automatique."""
        self.connect()
        log.info("Démarrage de la boucle MQTT…")
        self._client.loop_forever(retry_first_connection=True)

    def stop(self) -> None:
        """Arrête proprement le client MQTT."""
        self._client.disconnect()
        log.info("Client MQTT déconnecté.")
