-- ═══════════════════════════════════════════════════════════════════════════
-- MariaDB schema for the LoRaWAN Weather Network
-- Hybrid model: indexed metadata columns + JSON readings column
-- Run as: mysql -u root -p < schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS weather_network
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE weather_network;

-- ─── Sites ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
    id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            VARCHAR(64)      NOT NULL,
    city            VARCHAR(64)      NOT NULL,
    latitude        DECIMAL(10, 6)   NOT NULL,
    longitude       DECIMAL(10, 6)   NOT NULL,
    altitude_m      SMALLINT         NOT NULL DEFAULT 0,
    is_active       TINYINT(1)       NOT NULL DEFAULT 1,
    description     TEXT,
    installed_at    DATE             NULL                    COMMENT 'Date de mise en service',
    last_seen_at    DATETIME(3)      NULL                    COMMENT 'Dernière mesure reçue',
    fw_version      VARCHAR(16)      NULL                    COMMENT 'Version du firmware STM32',
    hw_version      VARCHAR(16)      NULL                    COMMENT 'Version du matériel',
    CONSTRAINT unique_name UNIQUE (name),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO sites (id, name, city, latitude, longitude, altitude_m, description)
VALUES
  (1, 'Station Nice',    'Nice',    43.710173, 7.261953,  25, 'Université Côte d''Azur'),
  (2, 'Station Mougins', 'Mougins', 43.600000, 7.005000, 260, 'Collège de Mougins'),
  (3, 'Station Grasse',  'Grasse',  43.658333, 6.925000, 333, 'Lycée de Grasse')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ─── Users (authentification) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)     NOT NULL,
    role            ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
    created_at      DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Compte admin par défaut (mot de passe : admin123)
-- hash bcrypt de "admin123" avec 10 rounds
INSERT IGNORE INTO users (email, password_hash, role) VALUES
    ('admin@weather.local', '$2b$10$5/NZ2Iweyc8C6.rCxCLCYOXICLAMHFgn8CWuwg6Z8RamFoul6hAy6', 'admin');

-- ─── Sensor Mappings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_mappings (
    id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    raw_key         VARCHAR(32)       NOT NULL UNIQUE,
    alias           VARCHAR(64)       NOT NULL,
    is_active       BOOLEAN           NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT IGNORE INTO sensor_mappings (raw_key, alias) VALUES
    ('temp1', 'temperature'),
    ('humid', 'humidity'),
    ('pressure', 'pressure'),
    ('lux', 'lux'),
    ('vitvent', 'windSpeed'),
    ('dirvent', 'windDirection'),
    ('hpluie', 'rainQuantity'),
    ('raf', 'gustSpeed'),
    ('raf_min', 'gustMin'),
    ('vit_pluie', 'rainRate');

-- ─── Measurements (hybrid: indexed metadata + JSON readings) ────────────────
-- Static columns are indexed for fast queries.
-- The `readings` JSON column stores ALL sensor data dynamically.
-- Adding a new sensor never requires a schema migration.
CREATE TABLE IF NOT EXISTS measurements (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    received_at     DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    -- LoRaWAN metadata (static, indexed)
    dev_eui         VARCHAR(23)      NULL,
    f_cnt           INT UNSIGNED     NULL,
    rssi            SMALLINT         NULL,
    snr             DECIMAL(5, 2)    NULL,

    -- All sensor readings in a single JSON column
    -- Example: {"temperature": 22.5, "humidity": 60, "pressure": 1013.2}
    readings        JSON             NOT NULL,

    PRIMARY KEY (id),
    KEY idx_site_time   (site_id, received_at),
    KEY idx_received_at (received_at),
    CONSTRAINT fk_meas_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;


-- ─── Alerts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    triggered_at    DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    resolved_at     DATETIME(3)      NULL     COMMENT 'NULL = alerte toujours active',
    metric          VARCHAR(32)      NOT NULL,
    value           DECIMAL(7, 2)    NOT NULL,
    threshold       DECIMAL(7, 2)    NOT NULL,
    message         VARCHAR(255)     NULL,
    PRIMARY KEY (id),
    KEY idx_alert_site_time (site_id, triggered_at),
    KEY idx_alert_active    (resolved_at),
    CONSTRAINT fk_alert_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;


-- ─── Stored procedure: update last_seen_at in sites ──────────────────────────
DELIMITER $$

CREATE OR REPLACE PROCEDURE update_last_seen(IN p_site_id TINYINT UNSIGNED)
BEGIN
    UPDATE sites
    SET last_seen_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_site_id;
END$$

DELIMITER ;