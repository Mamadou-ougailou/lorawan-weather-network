"""
Couche d'accès à MariaDB — Repository pattern.

Gère la connexion, la reconnexion automatique, et les insertions.
"""

from __future__ import annotations

import configparser
import logging
import time
from typing import TYPE_CHECKING

import pymysql
import pymysql.cursors

if TYPE_CHECKING:
    from weather.models import Measurement

log = logging.getLogger("weather.database")

# Nombre max de tentatives de reconnexion
MAX_RETRIES = 5
RETRY_DELAY_S = 3


class Database:
    """Gestionnaire de connexion MariaDB avec reconnexion automatique."""

    def __init__(self, cfg: configparser.ConfigParser):
        self._cfg = cfg
        self._conn: pymysql.Connection | None = None
        self._connect()

    # ── Connexion ──────────────────────────────────────────────────────────────

    def _connect(self) -> None:
        db = self._cfg["database"]
        for attempt in range(1, MAX_RETRIES + 1):
            try:
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
                log.info(
                    "Connecté à MariaDB %s:%s/%s",
                    db["host"], db["port"], db["database"],
                )
                return
            except pymysql.Error as exc:
                log.warning(
                    "Tentative %d/%d — Échec de connexion DB : %s",
                    attempt, MAX_RETRIES, exc,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_S)
        raise ConnectionError(
            f"Impossible de se connecter à MariaDB après {MAX_RETRIES} tentatives"
        )

    def _ensure_connected(self) -> None:
        try:
            if self._conn:
                self._conn.ping(reconnect=True)
            else:
                self._connect()
        except Exception:
            log.warning("Connexion DB perdue, reconnexion…")
            self._connect()

    # ── Insertions ─────────────────────────────────────────────────────────────

    def insert_measurement(self, measurement: "Measurement") -> int:
        """
        Insère une mesure dans la table `measurements`.
        Retourne l'ID de la ligne insérée.
        """
        self._ensure_connected()

        sql = """
            INSERT INTO measurements
                (site_id, received_at, temperature, humidity, pressure, lux,
                 wind_speed, rain_quantity, battery_pct, bme280_ok, tsl2591_ok,
                 camera_ok, dev_eui, f_cnt, rssi, snr, raw_payload)
            VALUES
                (%(site_id)s, %(received_at)s, %(temperature)s, %(humidity)s,
                 %(pressure)s, %(lux)s, %(wind_speed)s, %(rain_quantity)s,
                 %(battery_pct)s, %(bme280_ok)s, %(tsl2591_ok)s, %(camera_ok)s,
                 %(dev_eui)s, %(f_cnt)s, %(rssi)s, %(snr)s, %(raw_payload)s)
        """
        assert self._conn is not None
        with self._conn.cursor() as cur:
            cur.execute(sql, measurement.to_db_dict())
            row_id = cur.lastrowid
        self._conn.commit()

        # Mettre à jour last_seen_at de la station
        self._update_last_seen(measurement.site_id)

        return row_id or 0

    def insert_alert(
        self,
        site_id: int,
        metric: str,
        value: float,
        threshold: float,
        message: str,
    ) -> None:
        """Insère une alerte dans la table `alerts`."""
        self._ensure_connected()

        sql = """
            INSERT INTO alerts (site_id, metric, value, threshold, message)
            VALUES (%s, %s, %s, %s, %s)
        """
        assert self._conn is not None
        with self._conn.cursor() as cur:
            cur.execute(sql, (site_id, metric, value, threshold, message))
        self._conn.commit()

    def _update_last_seen(self, site_id: int) -> None:
        """Appelle la procédure stockée update_last_seen."""
        try:
            assert self._conn is not None
            with self._conn.cursor() as cur:
                cur.execute("CALL update_last_seen(%s)", (site_id,))
            self._conn.commit()
        except pymysql.Error as exc:
            log.debug("update_last_seen(%s) a échoué : %s", site_id, exc)

    # ── Health check ───────────────────────────────────────────────────────────

    def health_check(self) -> bool:
        """Retourne True si la connexion DB est active."""
        try:
            self._ensure_connected()
            assert self._conn is not None
            with self._conn.cursor() as cur:
                cur.execute("SELECT 1")
            return True
        except Exception:
            return False

    # ── Cleanup ────────────────────────────────────────────────────────────────

    def close(self) -> None:
        if self._conn:
            try:
                self._conn.close()
                log.info("Connexion MariaDB fermée.")
            except Exception:
                pass
            self._conn = None
