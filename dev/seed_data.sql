-- seed_data.sql – Fake weather data for local development / testing
-- Generates 48 hours of realistic measurements for the 3 stations.

USE weather_network;

-- ─── Helper: generate a series of timestamps ──────────────────────────────────
-- We use a recursive CTE to create one row per 10-minute interval over 48 hours.

SET @now = NOW();

INSERT INTO measurements
    (site_id, received_at, temperature, humidity, pressure, lux,
     battery_pct, bme280_ok, tsl2591_ok, camera_ok,
     dev_eui, f_cnt, rssi, snr, raw_payload)
WITH RECURSIVE seq AS (
    SELECT 0 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 287   -- 288 slots = 48 h × 6 per hour (every 10 min)
)
SELECT
    s.id                                                        AS site_id,
    @now - INTERVAL (287 - seq.n) * 10 MINUTE                  AS received_at,

    -- Temperature: base per site + daily sine wave + small noise
    ROUND(
        CASE s.id
            WHEN 1 THEN 14.0   -- Mougins  (260 m)
            WHEN 2 THEN 12.5   -- Grasse   (333 m)
            WHEN 3 THEN 16.0   -- Nice     (25 m)
        END
        + 5.0 * SIN(2 * PI() * ((seq.n % 144) - 36) / 144)  -- daily cycle
        + (RAND() - 0.5) * 1.5,                               -- noise ± 0.75 °C
    2)                                                          AS temperature,

    -- Humidity: inversely related to temperature
    ROUND(
        CASE s.id
            WHEN 1 THEN 55.0
            WHEN 2 THEN 60.0
            WHEN 3 THEN 65.0
        END
        - 8.0 * SIN(2 * PI() * ((seq.n % 144) - 36) / 144)
        + (RAND() - 0.5) * 5.0,
    2)                                                          AS humidity,

    -- Pressure: slow drift around a base
    ROUND(
        1013.25 - s.altitude_m * 0.12
        + 2.0 * SIN(2 * PI() * seq.n / 288)
        + (RAND() - 0.5) * 0.5,
    2)                                                          AS pressure,

    -- Lux: daylight bell curve (0 at night, peaks midday)
    GREATEST(0, ROUND(
        CASE
            WHEN (seq.n % 144) BETWEEN 36 AND 108 THEN  -- ~06:00 to 18:00
                800 * SIN(PI() * ((seq.n % 144) - 36) / 72)
            ELSE 0
        END
        + (RAND() - 0.5) * 30
    ))                                                          AS lux,

    -- Battery: slowly discharging, recharges during day
    LEAST(100, GREATEST(20, ROUND(
        80 + 15 * SIN(2 * PI() * ((seq.n % 144) - 36) / 144)
        - seq.n * 0.02
        + (RAND() - 0.5) * 2
    )))                                                         AS battery_pct,

    1 AS bme280_ok,
    1 AS tsl2591_ok,
    1 AS camera_ok,

    CONCAT('00:00:00:00:FF:FF:00:0', s.id)                     AS dev_eui,
    seq.n                                                       AS f_cnt,
    -80 - FLOOR(RAND() * 30)                                    AS rssi,
    ROUND(5.0 + (RAND() - 0.5) * 6, 2)                         AS snr,
    NULL                                                        AS raw_payload
FROM seq
CROSS JOIN sites s
ORDER BY received_at, s.id;

-- ─── Populate hourly_stats from the measurements we just inserted ─────────────
CALL refresh_hourly_stats(49);

-- ─── Add a couple of fake sky images (metadata only) ──────────────────────────
INSERT INTO sky_images (site_id, captured_at, filename, file_size_bytes, width_px, height_px)
VALUES
  (1, @now - INTERVAL 1 HOUR,  'mougins_sky_001.jpg',  245000, 1280, 720),
  (1, @now - INTERVAL 2 HOUR,  'mougins_sky_002.jpg',  238000, 1280, 720),
  (2, @now - INTERVAL 1 HOUR,  'grasse_sky_001.jpg',   252000, 1280, 720),
  (3, @now - INTERVAL 1 HOUR,  'nice_sky_001.jpg',     261000, 1280, 720),
  (3, @now - INTERVAL 30 MINUTE, 'nice_sky_002.jpg',   255000, 1280, 720);
