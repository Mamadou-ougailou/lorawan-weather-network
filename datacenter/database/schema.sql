-- MariaDB schema for the LoRaWAN Weather Network
-- Run as: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS weather_network
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE weather_network;

-- ─── Sites ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
    id          TINYINT UNSIGNED NOT NULL,
    name        VARCHAR(64)      NOT NULL,
    city        VARCHAR(64)      NOT NULL,
    latitude    DECIMAL(9, 6)    NOT NULL,
    longitude   DECIMAL(9, 6)    NOT NULL,
    altitude_m  SMALLINT         NOT NULL DEFAULT 0,
    description TEXT,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO sites (id, name, city, latitude, longitude, altitude_m, description)
VALUES
  (1, 'Station Mougins',  'Mougins', 43.600000,  7.005000, 260, 'Collège de Mougins'),
  (2, 'Station Grasse',   'Grasse',  43.658333,  6.925000, 333, 'Lycée de Grasse'),
  (3, 'Station Nice',     'Nice',    43.710173,  7.261953,  25, 'IUT Nice Côte d''Azur')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ─── Measurements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    received_at     DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    temperature     DECIMAL(5, 2)    COMMENT 'Celsius',
    humidity        DECIMAL(5, 2)    COMMENT 'Percent',
    pressure        DECIMAL(7, 2)    COMMENT 'hPa',
    lux             SMALLINT UNSIGNED COMMENT 'lux',
    battery_pct     TINYINT UNSIGNED COMMENT 'Battery percent 0-100',
    -- sensor health flags
    bme280_ok       TINYINT(1)       NOT NULL DEFAULT 0,
    tsl2591_ok      TINYINT(1)       NOT NULL DEFAULT 0,
    camera_ok       TINYINT(1)       NOT NULL DEFAULT 0,
    -- LoRaWAN metadata
    dev_eui         VARCHAR(23),
    f_cnt           INT UNSIGNED,
    rssi            SMALLINT,
    snr             DECIMAL(5, 2),
    -- raw payload for audit / reprocessing
    raw_payload     VARCHAR(64),
    PRIMARY KEY (id),
    KEY idx_site_time (site_id, received_at),
    KEY idx_received_at (received_at),
    CONSTRAINT fk_meas_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;

-- ─── Sky images ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_images (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    site_id         TINYINT UNSIGNED NOT NULL,
    captured_at     DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    filename        VARCHAR(255)     NOT NULL COMMENT 'Relative path under /var/weather/images/',
    file_size_bytes INT UNSIGNED,
    width_px        SMALLINT UNSIGNED,
    height_px       SMALLINT UNSIGNED,
    PRIMARY KEY (id),
    KEY idx_sky_site_time (site_id, captured_at),
    CONSTRAINT fk_sky_site FOREIGN KEY (site_id) REFERENCES sites (id)
) ENGINE=InnoDB;

-- ─── Hourly aggregates (materialised by cron) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS hourly_stats (
    site_id         TINYINT UNSIGNED NOT NULL,
    hour_start      DATETIME         NOT NULL COMMENT 'Truncated to the hour',
    temp_avg        DECIMAL(5, 2),
    temp_min        DECIMAL(5, 2),
    temp_max        DECIMAL(5, 2),
    humidity_avg    DECIMAL(5, 2),
    pressure_avg    DECIMAL(7, 2),
    lux_avg         DECIMAL(9, 2),
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
        (site_id, hour_start, temp_avg, temp_min, temp_max,
         humidity_avg, pressure_avg, lux_avg, sample_count)
    SELECT
        site_id,
        DATE_FORMAT(received_at, '%Y-%m-%d %H:00:00') AS hour_start,
        ROUND(AVG(temperature), 2),
        MIN(temperature),
        MAX(temperature),
        ROUND(AVG(humidity),    2),
        ROUND(AVG(pressure),    2),
        ROUND(AVG(lux),         2),
        COUNT(*)
    FROM measurements
    WHERE received_at >= v_from
    GROUP BY site_id, hour_start
    ON DUPLICATE KEY UPDATE
        temp_avg     = VALUES(temp_avg),
        temp_min     = VALUES(temp_min),
        temp_max     = VALUES(temp_max),
        humidity_avg = VALUES(humidity_avg),
        pressure_avg = VALUES(pressure_avg),
        lux_avg      = VALUES(lux_avg),
        sample_count = VALUES(sample_count);
END$$

DELIMITER ;
