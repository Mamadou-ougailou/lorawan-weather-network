/**
 * routes/stations.js
 *
 * Endpoint:
 *   GET /api/stations  →  List all monitoring stations
 *
 * Returns every row from the `sites` table ordered by id.
 * Example response:
 *   [
 *     { "id": 1, "name": "Mougins", "city": "Mougins", "lat": 43.6, "lon": 7.0, ... },
 *     ...
 *   ]
 */

import { Router } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /api/stations
 * Returns the full list of weather stations (sites table).
 */
router.get("/stations", async (_req, res) => {
    const [rows] = await pool.query("SELECT * FROM sites ORDER BY id");
    res.json(rows);
});

export default router;
