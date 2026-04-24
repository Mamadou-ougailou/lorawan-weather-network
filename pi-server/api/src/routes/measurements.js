/**
 * routes/measurements.js
 *
 * Endpoints:
 *   GET /api/latest                         Most recent measurement per station
 *   GET /api/measurements?site=&limit=      Recent raw measurements (filterable)
 *
 * Query parameters for /api/measurements:
 *   site   (integer, optional)  Filter by site id
 *   limit  (integer, 1–500, default 50)  Number of rows to return
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

export default router;
