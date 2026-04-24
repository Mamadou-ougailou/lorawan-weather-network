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
        self._parsers: list[PayloadParser] = parsers or []

        mqtt_cfg = cfg["mqtt"]
        self._host = mqtt_cfg["host"]
        self._port = int(mqtt_cfg["port"])
        self._username = mqtt_cfg.get("username", "").strip()
        self._password = mqtt_cfg.get("password", "")
        self._keepalive = int(mqtt_cfg.get("keepalive", "60"))

        # Sur le port 443, on force WSS+TLS (standard université)
        self._use_websocket = self._port == 443
        self._use_tls = mqtt_cfg.getboolean("tls", fallback=(self._port == 443))

        # Configuration du client Paho
        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=mqtt_cfg.get("client_id", "weather-datacenter"),
            transport="websockets" if self._use_websocket else "tcp",
            clean_session=True,
        )

        if self._username:
            self._client.username_pw_set(self._username, self._password)

        if self._use_tls:
            self._client.tls_set()

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        # Les topics à écouter viennent de la section [stations]
        self._topics = list(cfg["stations"].keys()) if "stations" in cfg else []

        mode = "LOG-ONLY" if db is None else "DB+LOG"
        log.info(
            "Client MQTT configuré [%s] — broker=%s:%s écoute %d topic(s) parsers=[%s]",
            mode,
            self._host,
            self._port,
            len(self._topics),
            ", ".join(p.name for p in self._parsers),
        )

    # ── Callbacks MQTT ─────────────────────────────────────────────────────────

    def _on_connect(
        self,
        client: mqtt.Client,
        userdata: object,
        flags: mqtt.ConnectFlags,
        rc: mqtt.ReasonCode,
        properties: mqtt.Properties | None = None,
    ) -> None:
        if rc == 0:
            if not self._topics:
                log.warning("Connecté, mais AUCUN topic configuré dans [stations] !")
                return
            log.info("Connecté au broker, abonnement à %d topic(s)", len(self._topics))
            for topic in self._topics:
                client.subscribe(topic, qos=1)
                log.debug(" → Subscribed: %s", topic)
        else:
            log.error("Connexion MQTT refusée, code retour = %s", rc)

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: object,
        disconnect_flags: mqtt.DisconnectFlags,
        rc: mqtt.ReasonCode,
        properties: mqtt.Properties | None = None,
    ) -> None:
        if rc != 0:
            log.warning("Déconnexion MQTT inattendue (rc=%s), reconnexion auto…", rc)

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
        log.debug("RX [%s] %s", msg.topic, payload_str[:500])

        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError as exc:
            log.error("JSON invalide sur '%s' : %s", msg.topic, exc)
            return

        measurement = None
        for parser in self._parsers:
            if parser.can_parse(payload):
                log.debug("Parser sélectionné : %s", parser.name)
                measurement = parser.parse(payload, topic=msg.topic)
                break

        if measurement is None:
            log.warning("Aucun parser n'a pu traiter le message sur '%s'", msg.topic)
            return

        if self._db is None:
            log.info("[LOG-ONLY] %s", measurement.summary())
            return

        row_id = self._db.insert_measurement(measurement)
        log.info("[#%d] %s", row_id, measurement.summary())

        if self._alert_manager:
            self._alert_manager.evaluate(measurement)

    # ── Gestion des parsers ────────────────────────────────────────────────────

    def register_parser(self, parser: PayloadParser, priority: int = -1) -> None:
        """
        Enregistre un parser supplémentaire.
        priority=-1 → ajout à la fin (plus bas priorité).
        priority=0  → ajout en tête (testé en premier).
        """
        if priority < 0 or priority >= len(self._parsers):
            self._parsers.append(parser)
        else:
            self._parsers.insert(priority, parser)
        log.info("Parser '%s' enregistré (position %d)", parser.name, priority)

    # ── Boucle principale ──────────────────────────────────────────────────────

    def connect(self) -> None:
        """Se connecte au broker MQTT."""
        self._client.connect(self._host, self._port, keepalive=self._keepalive)

    def run_forever(self) -> None:
        """Démarre la boucle MQTT bloquante avec reconnexion automatique."""
        self.connect()
        log.info("Démarrage de la boucle MQTT…")
        self._client.loop_forever(retry_first_connection=True)

    def stop(self) -> None:
        """Arrête proprement le client MQTT."""
        self._client.disconnect()
        log.info("Client MQTT déconnecté.")
