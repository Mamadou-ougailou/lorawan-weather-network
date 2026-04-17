"""
Couche d'accès à MariaDB — Repository pattern.

Gère la connexion, la reconnexion automatique, et les insertions.
La liste des colonnes SQL est construite dynamiquement depuis Measurement.to_db_dict().
La méthode sync_sensor_columns() synchronise automatiquement le schéma de la table
`measurements` avec les clés de [field_mapping] dans config.ini.
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

MAX_RETRIES = 5
RETRY_DELAY_S = 3

# Colonnes gérées par le code — jamais touchées par la synchronisation automatique
_CORE_COLUMNS = frozenset({
    "id", "site_id", "received_at",
    "dev_eui", "f_cnt", "rssi", "snr", "raw_payload",
})

# Type SQL utilisé pour toutes les colonnes capteurs créées automatiquement
_SENSOR_COLUMN_TYPE = "DECIMAL(10, 4) NULL"


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

    def _get_conn(self) -> pymysql.Connection:
        """Retourne la connexion active ou lève une erreur explicite."""
        if self._conn is None:
            raise RuntimeError("Aucune connexion MariaDB disponible.")
        return self._conn

    # ── Schema auto-sync ───────────────────────────────────────────────────────

    def sync_sensor_columns(self, field_map: dict[str, str]) -> None:
        """
        Synchronise les colonnes de la table `measurements` avec [field_mapping].

        - Colonnes présentes dans field_map mais absentes de la table → ADD COLUMN
        - Colonnes présentes dans la table (non-core) mais absentes de field_map → DROP COLUMN

        Les colonnes core (site_id, received_at, etc.) ne sont jamais touchées.
        """
        self._ensure_connected()
        conn = self._get_conn()
        db_name = self._cfg["database"]["database"]

        # 1. Lire les colonnes actuelles depuis INFORMATION_SCHEMA
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'measurements'
                """,
                (db_name,),
            )
            existing_cols = {row["COLUMN_NAME"] for row in cur.fetchall()}

        sensor_cols_in_db = existing_cols - _CORE_COLUMNS
        sensor_cols_in_cfg = set(field_map.keys())

        # 2. ADD COLUMN pour les nouveaux champs de config
        to_add = sensor_cols_in_cfg - sensor_cols_in_db
        for col in sorted(to_add):
            log.info("Schema sync: ADD COLUMN `%s` %s", col, _SENSOR_COLUMN_TYPE)
            with conn.cursor() as cur:
                cur.execute(
                    f"ALTER TABLE measurements ADD COLUMN `{col}` {_SENSOR_COLUMN_TYPE}"
                )
            conn.commit()

        # 3. DROP COLUMN pour les champs retirés de config
        to_drop = sensor_cols_in_db - sensor_cols_in_cfg
        for col in sorted(to_drop):
            log.warning(
                "Schema sync: DROP COLUMN `%s` — données existantes supprimées !", col
            )
            with conn.cursor() as cur:
                cur.execute(f"ALTER TABLE measurements DROP COLUMN `{col}`")
            conn.commit()

        if not to_add and not to_drop:
            log.info("Schema sync: table `measurements` déjà à jour.")

    def sync_stations(self, cfg) -> None:
        """
        Synchronise la table `sites` avec la configuration [stations].
        - Insère les nouveaux site_id avec des valeurs par défaut.
        - Désactive (is_active=0) les sites absents de la configuration.
        - Réactive (is_active=1) les sites présents.
        NE FAIT PAS de DELETE pour préserver les historiques (contrainte FK).
        """
        if "stations" not in cfg:
            return

        config_site_ids = {int(v) for v in cfg["stations"].values()}

        try:
            self._ensure_connected()
            conn = self._get_conn()
            with conn.cursor(pymysql.cursors.DictCursor) as cur:
                # 1. Lister les sites existants
                cur.execute("SELECT id, is_active FROM sites")
                db_sites = {row["id"]: row["is_active"] for row in cur.fetchall()}

                # 2. Insérer les sites manquants
                missing_ids = config_site_ids - db_sites.keys()
                for site_id in missing_ids:
                    log.info("Schema sync: ajout de la nouvelle station ID %d", site_id)
                    cur.execute(
                        "INSERT INTO sites (id, name, city, latitude, longitude, is_active) "
                        "VALUES (%s, %s, %s, 0.0, 0.0, 1)",
                        (site_id, f"Station {site_id}", "Inconnue")
                    )

                # 3. Mettre à jour is_active
                for site_id, is_active in db_sites.items():
                    should_be_active = site_id in config_site_ids
                    if bool(is_active) != should_be_active:
                        log.info(
                            "Schema sync: station ID %d %s",
                            site_id,
                            "activée" if should_be_active else "désactivée"
                        )
                        cur.execute(
                            "UPDATE sites SET is_active = %s WHERE id = %s",
                            (1 if should_be_active else 0, site_id)
                        )
            conn.commit()
        except pymysql.Error as exc:
            log.error("Échec de la synchronisation des stations : %s", exc)
            conn.rollback()

    # ── Insertions ─────────────────────────────────────────────────────────────

    def insert_measurement(self, measurement: "Measurement") -> int:
        """
        Insère une mesure dans la table `measurements`.
        Les colonnes SQL sont construites dynamiquement depuis measurement.to_db_dict().
        Retourne l'ID de la ligne insérée.
        """
        self._ensure_connected()
        conn = self._get_conn()

        data = measurement.to_db_dict()
        # Remove None keys that shouldn't be sent (let DB use its defaults)
        data = {k: v for k, v in data.items() if v is not None}

        cols = ", ".join(data.keys())
        placeholders = ", ".join(f"%({k})s" for k in data)
        sql = f"INSERT INTO measurements ({cols}) VALUES ({placeholders})"

        with conn.cursor() as cur:
            cur.execute(sql, data)
            row_id = cur.lastrowid
        conn.commit()

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
        conn = self._get_conn()

        sql = """
            INSERT INTO alerts (site_id, metric, value, threshold, message)
            VALUES (%s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (site_id, metric, value, threshold, message))
        conn.commit()

    def _update_last_seen(self, site_id: int) -> None:
        """Appelle la procédure stockée update_last_seen."""
        try:
            conn = self._get_conn()
            with conn.cursor() as cur:
                cur.execute("CALL update_last_seen(%s)", (site_id,))
            conn.commit()
        except pymysql.Error as exc:
            log.debug("update_last_seen(%s) a échoué : %s", site_id, exc)

    def refresh_hourly_stats(self, hours_back: int = 2) -> None:
        """
        Met à jour la table materialisée `hourly_stats` via procédure stockée.
        Remplace l'ancien script cron aggregate_hourly.sh.
        """
        try:
            self._ensure_connected()
            conn = self._get_conn()
            with conn.cursor() as cur:
                cur.execute("CALL refresh_hourly_stats(%s)", (hours_back,))
            conn.commit()
            log.info("hourly_stats mis à jour (%d dernières heures)", hours_back)
        except pymysql.Error as exc:
            log.error("Échec du refresh_hourly_stats : %s", exc)

    # ── Health check ───────────────────────────────────────────────────────────

    def health_check(self) -> bool:
        """Retourne True si la connexion DB est active."""
        try:
            self._ensure_connected()
            with self._get_conn().cursor() as cur:
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
