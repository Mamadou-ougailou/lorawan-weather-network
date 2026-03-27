-- ═══════════════════════════════════════════════════════════════════════════
-- MariaDB schema for the LoRaWAN Weather Network
-- Run as: mysql -u root -p < schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS weather_network
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE weather_network;

-- ─── Sites ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
    id              TINYINT UNSIGNED NOT NULL,
    name            VARCHAR(64)      NOT NULL,
    city            VARCHAR(64)      NOT NULL,
    latitude        DECIMAL(9, 6)    NOT NULL,
    longitude       DECIMAL(9, 6)    NOT NULL,
    altitude_m      SMALLINT         NOT NULL DEFAULT 0,
    is_active       TINYINT(1)       NOT NULL DEFAULT 1,
    description     TEXT,
    installed_at    DATE             NULL                    COMMENT 'Date de mise en service',
    last_seen_at    DATETIME(3)      NULL                    COMMENT 'Dernière mesure reçue',
    fw_version      VARCHAR(16)      NULL                    COMMENT 'Version du firmware STM32',
    hw_version      VARCHAR(16)      NULL                    COMMENT 'Version du matériel',
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO sites (id, name, city, latitude, longitude, altitude_m, description)
VALUES
  (1, 'Station Mougins', 'Mougins', 43.600000, 7.005000, 260, 'Collège de Mougins'),
  (2, 'Station Grasse',  'Grasse',  43.658333, 6.925000, 333, 'Lycée de Grasse'),
  (3, 'Station Nice',    'Nice',    43.710173, 7.261953,  25, 'IUT Nice Côte d''Azur')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ─── Measurements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    received_at     DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Horodatage de réception sur le broker',
    measured_at     DATETIME(3)      NULL                                   COMMENT 'Horodatage embarqué si RTC disponible',
    -- Environmental sensors
    temperature     DECIMAL(5, 2)    NULL     COMMENT 'Celsius',
    humidity        DECIMAL(5, 2)    NULL     COMMENT 'Percent',
    pressure        DECIMAL(7, 2)    NULL     COMMENT 'hPa',
    lux             SMALLINT UNSIGNED NULL    COMMENT 'lux',
    wind_speed      DECIMAL(5, 2)    NULL     COMMENT 'km/h',
    rain_quantity   DECIMAL(5, 2)    NULL     COMMENT 'mm/h',
    battery_pct     TINYINT UNSIGNED NULL     COMMENT 'Battery percent 0-100',
    -- Sensor health flags
    bme280_ok       TINYINT(1)       NOT NULL DEFAULT 0,
    tsl2591_ok      TINYINT(1)       NOT NULL DEFAULT 0,
    camera_ok       TINYINT(1)       NOT NULL DEFAULT 0,
    -- LoRaWAN metadata
    dev_eui         VARCHAR(23)      NULL,
    f_cnt           INT UNSIGNED     NULL,
    rssi            SMALLINT         NULL,
    snr             DECIMAL(5, 2)    NULL,
    -- Raw payload for audit / reprocessing
    raw_payload     VARCHAR(64)      NULL,
    PRIMARY KEY (id),
    KEY idx_site_time   (site_id, received_at),
    KEY idx_received_at (received_at),
    CONSTRAINT fk_meas_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;

-- ─── Sky images ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_images (
    id                      BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id                 TINYINT UNSIGNED NOT NULL,
    captured_at             DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    linked_measurement_id   BIGINT UNSIGNED  NULL     COMMENT 'Mesure contemporaine de la capture',
    filename                VARCHAR(255)     NOT NULL COMMENT 'Chemin relatif sous /var/weather/images/',
    mime_type               VARCHAR(32)      NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes         INT UNSIGNED     NULL,
    width_px                SMALLINT UNSIGNED NULL,
    height_px               SMALLINT UNSIGNED NULL,
    checksum_md5            CHAR(32)         NULL     COMMENT 'Vérification d intégrité du fichier',
    PRIMARY KEY (id),
    KEY idx_sky_site_time (site_id, captured_at),
    CONSTRAINT fk_sky_site FOREIGN KEY (site_id)               REFERENCES sites        (id),
    CONSTRAINT fk_sky_meas FOREIGN KEY (linked_measurement_id) REFERENCES measurements (id)
) ENGINE=InnoDB;

-- ─── Alerts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    triggered_at    DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    resolved_at     DATETIME(3)      NULL     COMMENT 'NULL = alerte toujours active',
    metric          VARCHAR(32)      NOT NULL COMMENT 'temperature, humidity, battery_pct...',
    value           DECIMAL(7, 2)    NOT NULL COMMENT 'Valeur qui a déclenché l alerte',
    threshold       DECIMAL(7, 2)    NOT NULL COMMENT 'Seuil configuré',
    message         VARCHAR(255)     NULL,
    PRIMARY KEY (id),
    KEY idx_alert_site_time (site_id, triggered_at),
    KEY idx_alert_active    (resolved_at),
    CONSTRAINT fk_alert_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;

-- ─── Hourly aggregates (materialised by cron) ────────────────────────────────
CREATE TABLE IF NOT EXISTS hourly_stats (
    site_id         TINYINT UNSIGNED NOT NULL,
    hour_start      DATETIME         NOT NULL COMMENT 'Tronqué à l heure',
    temp_avg        DECIMAL(5, 2)    NULL,
    temp_min        DECIMAL(5, 2)    NULL,
    temp_max        DECIMAL(5, 2)    NULL,
    humidity_avg    DECIMAL(5, 2)    NULL,
    pressure_avg    DECIMAL(7, 2)    NULL,
    lux_avg         DECIMAL(9, 2)    NULL,
    wind_speed_avg  DECIMAL(5, 2)    NULL,
    rain_quantity_avg  DECIMAL(5, 2)    NULL,
    sample_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, hour_start),
    CONSTRAINT fk_stats_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;

-- ─── Stored procedure: refresh hourly stats ──────────────────────────────────
DELIMITER $$

CREATE OR REPLACE PROCEDURE refresh_hourly_stats(IN p_hours_back INT)
BEGIN
    DECLARE v_from DATETIME;
    SET v_from = DATE_FORMAT(
        NOW() - INTERVAL p_hours_back HOUR,
        '%Y-%m-%d %H:00:00'
    );

    INSERT INTO hourly_stats
        (site_id, hour_start,
         temp_avg, temp_min, temp_max,
         humidity_avg, pressure_avg,
         lux_avg, wind_speed_avg, rain_quantity_avg,
         sample_count)
    SELECT
        site_id,
        DATE_FORMAT(received_at, '%Y-%m-%d %H:00:00') AS hour_start,
        ROUND(AVG(temperature), 2),
        MIN(temperature),
        MAX(temperature),
        ROUND(AVG(humidity),    2),
        ROUND(AVG(pressure),    2),
        ROUND(AVG(lux),         2),
        ROUND(AVG(wind_speed),  2),
        ROUND(AVG(rain_quantity),  2),
        COUNT(*)
    FROM measurements
    WHERE received_at >= v_from
    GROUP BY site_id, hour_start
    ON DUPLICATE KEY UPDATE
        temp_avg        = VALUES(temp_avg),
        temp_min        = VALUES(temp_min),
        temp_max        = VALUES(temp_max),
        humidity_avg    = VALUES(humidity_avg),
        pressure_avg    = VALUES(pressure_avg),
        lux_avg         = VALUES(lux_avg),
        wind_speed_avg  = VALUES(wind_speed_avg),
        rain_quantity_avg  = VALUES(rain_quantity_avg),
        sample_count    = VALUES(sample_count);
END$$

DELIMITER ;

-- ─── Stored procedure: update last_seen_at in sites ──────────────────────────
DELIMITER $$

CREATE OR REPLACE PROCEDURE update_last_seen(IN p_site_id TINYINT UNSIGNED)
BEGIN
    UPDATE sites
    SET last_seen_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_site_id;
END$$

DELIMITER ;