import pool from "../../db.js";
import { AppError } from "../../utils/AppError.js";

export const getAllAlerts = async () => {
    const sql = `
        SELECT 
            a.id, a.site_id AS siteId, s.name AS siteName,
            a.triggered_at AS triggeredAt, a.resolved_at AS resolvedAt,
            a.metric, a.value, a.threshold, a.message
        FROM alerts a
        JOIN sites s ON s.id = a.site_id
        ORDER BY a.triggered_at DESC
    `;
    const [rows] = await pool.query(sql);
    return rows;
};

export const resolveAlert = async (id) => {
    const [check] = await pool.query("SELECT id FROM alerts WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Alert not found", 404);
    }

    await pool.query("UPDATE alerts SET resolved_at=CURRENT_TIMESTAMP(3) WHERE id=?", [id]);
};

export const deleteAlert = async (id) => {
    const [check] = await pool.query("SELECT id FROM alerts WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Alert not found", 404);
    }

    await pool.query("DELETE FROM alerts WHERE id=?", [id]);
};
