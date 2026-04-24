/**
 * routes/measurements.js
 *
 * Endpoints:
 *   GET /api/latest                         Most recent measurement per station
 *   GET /api/measurements?site=&limit=      Recent raw measurements (filterable)
 *   GET /api/trend?hours=&interval=         Real-time time-series from raw measurements
 *
 * Query parameters for /api/measurements:
 *   site   (integer, optional)  Filter by site id
 *   limit  (integer, 1–500, default 50)  Number of rows to return
 *
 * Query parameters for /api/trend:
 *   hours     (integer, 1–168, default 24)   Look-back window in hours
 *   interval  (integer, minutes, default 30) Bucket size for grouping
 */

import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ─── /api/latest ─────────────────────────────────────────────────────────────

/**
 * GET /api/latest
 *
 * For each station, return the single most recent row in `measurements`.
 * Uses a correlated sub-query so the database does the heavy lifting.
 */
router.get("/latest", async (_req, res) => {
    const sql = `
    SELECT m.*, s.name AS site_name, s.city
    FROM   measurements m
    JOIN   sites s ON s.id = m.site_id
    WHERE  m.id = (
      SELECT id
      FROM   measurements m2
      WHERE  m2.site_id = m.site_id
      ORDER  BY received_at DESC
      LIMIT  1
    )
    ORDER  BY m.site_id
  `;

    const [rows] = await pool.query(sql);
    res.json(rows);
});

// ─── /api/measurements ───────────────────────────────────────────────────────

/**
 * GET /api/measurements
 *
 * Returns up to `limit` (max 500) raw measurement rows, newest first.
 * Optionally filtered to a single `site` id.
 */
router.get("/measurements", async (req, res) => {
    // Parse query params with safe defaults
    const siteId = parseInt(req.query.site, 10) || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);

    // Build the WHERE clause only when a site filter is requested.
    // Parameterised values prevent SQL injection.
    const conditions = siteId ? ["site_id = ?"] : [];
    const params = siteId ? [siteId] : [];
    params.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM measurements ${where} ORDER BY received_at DESC LIMIT ?`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
});

// ─── /api/trend ──────────────────────────────────────────────────────────────

/**
 * GET /api/trend
 *
 * Returns real-time time-series data grouped by time buckets directly from
 * the `measurements` table (no pre-aggregation needed).
 *
 * Each row contains: bucket, site_id, site_name,
 *   temp_avg, humidity_avg, wind_speed_avg, rain_quantity_avg, sample_count
 */
router.get("/trend", async (req, res) => {
    const hours    = Math.min(parseInt(req.query.hours,    10) || 24,  168); // max 7 days
    const interval = Math.min(parseInt(req.query.interval, 10) || 30,  360); // minutes, max 6h

    // Group timestamps into fixed-size buckets using integer division trick
    const sql = `
    SELECT
      FROM_UNIXTIME(
        FLOOR(UNIX_TIMESTAMP(m.received_at) / (? * 60)) * (? * 60)
      )                              AS bucket,
      s.id                           AS site_id,
      s.name                         AS site_name,
      ROUND(AVG(m.temperature),  2)  AS temp_avg,
      ROUND(AVG(m.humidity),     2)  AS humidity_avg,
      ROUND(AVG(m.wind_speed),   2)  AS wind_speed_avg,
      ROUND(AVG(m.rain_quantity),2)  AS rain_quantity_avg,
      COUNT(*)                       AS sample_count
    FROM   measurements m
    JOIN   sites s ON s.id = m.site_id
    WHERE  m.received_at >= NOW() - INTERVAL ? HOUR
    GROUP  BY bucket, s.id
    ORDER  BY bucket ASC, s.id ASC
  `;

    const [rows] = await pool.query(sql, [interval, interval, hours]);
    res.json(rows);
});

export default router;
