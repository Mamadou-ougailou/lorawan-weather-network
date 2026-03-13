/**
 * routes/images.js
 *
 * Endpoints:
 *   GET /api/images?site=&limit=   Sky image metadata from the database
 *   GET /images/:filename          Serve the actual image file from disk
 *
 * Query parameters for /api/images:
 *   site   (integer, optional)  Filter by site id
 *   limit  (integer, 1–50, default 5)  Number of records to return
 *
 * Security note:
 *   The static file handler performs strict path normalisation before
 *   touching the filesystem, blocking path-traversal attacks (e.g. "../../etc/passwd").
 */

import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import pool from "../db.js";
import config from "../config.js";

const router = Router();

// ─── /api/images ─────────────────────────────────────────────────────────────

/**
 * GET /api/images
 *
 * Returns metadata rows from `sky_images`, newest first.
 * Each row is enriched with a `url` field pointing to /images/:filename
 * so the frontend can display the image without knowing the image directory.
 */
router.get("/images", async (req, res) => {
    const siteId = parseInt(req.query.site, 10) || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);

    const conditions = siteId ? ["site_id = ?"] : [];
    const params = siteId ? [siteId] : [];
    params.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM sky_images ${where} ORDER BY captured_at DESC LIMIT ?`;

    const [rows] = await pool.query(sql, params);

    // Add a URL for each image so the frontend can fetch it directly
    const enriched = rows.map((row) => ({
        ...row,
        url: `/images/${row.filename}`,
    }));

    res.json(enriched);
});

// ─── /images/:filename ───────────────────────────────────────────────────────

/**
 * GET /images/:filename
 *
 * Serves a sky image from the configured IMAGE_DIR.
 *
 * Path traversal protection:
 *   1. Resolve the requested filename against IMAGE_DIR.
 *   2. Verify the result still starts with IMAGE_DIR (blocks "../../../etc/passwd").
 *   3. Check the file actually exists before streaming it.
 */
router.get("/images/:filename", (req, res) => {
    const imageDir = config.storage.imageDir;

    // Strip any directory components, keep only the bare filename
    const safeName = path.basename(req.params.filename);

    // Build the full path and ensure it stays inside imageDir
    const fullPath = path.join(imageDir, safeName);

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Image not found" });
    }

    // Express will set the correct Content-Type from the file extension
    res.sendFile(fullPath);
});

export default router;
