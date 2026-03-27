/**
 * routes/history.js
 *
 * Endpoints:
 *   GET /api/history?site=&hours=    Hourly aggregates for one station
 *   GET /api/compare?hours=          Hourly averages for ALL stations side-by-side
 *
 * Query parameters:
 *   site   (integer, optional for /history)  Station id
 *   hours  (integer, 1–720, default 24)      Look-back window in hours (max 30 days)
 *
 * Both endpoints read from the `hourly_stats` view/table which is pre-aggregated
 * by the datacenter MQTT subscriber — no heavy aggregation happens here.
 */

import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ─── /api/history ────────────────────────────────────────────────────────────

/**
 * GET /api/history
 *
 * Returns hourly statistical rows (min / avg / max temperature, humidity,
 * pressure, luminosity) for one station over the requested window.
 */
router.get("/history", async (req, res) => {
    const siteId = parseInt(req.query.site, 10) || null;
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 720); // cap 30 days

    const conditions = ["hs.hour_start >= NOW() - INTERVAL ? HOUR"];
    const params = [hours];

    if (siteId) {
        conditions.push("hs.site_id = ?");
        params.push(siteId);
    }

    const sql = `
    SELECT hs.*, s.name AS site_name
    FROM   hourly_stats hs
    JOIN   sites s ON s.id = hs.site_id
    WHERE  ${conditions.join(" AND ")}
    ORDER  BY hs.site_id, hs.hour_start
  `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
});

// ─── /api/compare ────────────────────────────────────────────────────────────

/**
 * GET /api/compare
 *
 * Returns the same hourly aggregates as /api/history but for every station,
 * making it easy to plot a multi-line comparison chart on the frontend.
 *
 * The `hour` column is formatted as ISO string (2024-06-01T14:00:00) so
 * JavaScript's `new Date()` can parse it without extra work.
 */
router.get("/compare", async (req, res) => {
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 720);

    const sql = `
    SELECT
      DATE_FORMAT(hs.hour_start, '%Y-%m-%dT%H:00:00') AS hour,
      s.name   AS site_name,
      s.id     AS site_id,
      hs.temp_avg,
      hs.temp_min,
      hs.temp_max,
      hs.humidity_avg,
      hs.pressure_avg,
      hs.lux_avg,
      hs.wind_speed_avg,
      hs.air_speed_avg,
      hs.sample_count
    FROM   hourly_stats hs
    JOIN   sites s ON s.id = hs.site_id
    WHERE  hs.hour_start >= NOW() - INTERVAL ? HOUR
    ORDER  BY hs.hour_start, hs.site_id
  `;

    const [rows] = await pool.query(sql, [hours]);
    res.json(rows);
});

export default router;
