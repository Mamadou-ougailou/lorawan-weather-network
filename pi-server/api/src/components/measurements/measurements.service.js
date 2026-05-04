import pool from "../../db.js";
import { AppError } from "../../utils/AppError.js";
import { toMeasurementDTO, buildTrendSQL, toTrendDTO } from "../../dto.js";

export const getLatestMeasurements = async () => {
    const sql = `
        SELECT m.*, s.name AS site_name, s.city
        FROM measurements m
        JOIN sites s ON s.id = m.site_id
        WHERE m.id = (
            SELECT id FROM measurements m2
            WHERE m2.site_id = m.site_id
            ORDER BY received_at DESC LIMIT 1
        )
        ORDER BY m.site_id
    `;
    const [rows] = await pool.query(sql);
    return rows.map(toMeasurementDTO);
};

export const getMeasurements = async (siteId, limit) => {
    const conditions = siteId ? ["site_id = ?"] : [];
    const params = siteId ? [siteId] : [];
    params.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM measurements ${where} ORDER BY received_at DESC LIMIT ?`;

    const [rows] = await pool.query(sql, params);
    return rows.map(toMeasurementDTO);
};

export const getTrend = async (hours, interval) => {
    const sql = `
        SELECT
            FROM_UNIXTIME(
                FLOOR(UNIX_TIMESTAMP(m.received_at) / (? * 60)) * (? * 60)
            ) AS bucket,
            s.id AS site_id,
            s.name AS site_name,
            ${buildTrendSQL("m")},
            COUNT(*) AS sample_count
        FROM measurements m
        JOIN sites s ON s.id = m.site_id
        WHERE m.received_at >= NOW() - INTERVAL ? HOUR
        GROUP BY bucket, s.id
        ORDER BY bucket ASC, s.id ASC
    `;

    const [rows] = await pool.query(sql, [interval, interval, hours]);
    return rows.map(toTrendDTO);
};

export const deleteMeasurement = async (id) => {
    const [check] = await pool.query("SELECT id FROM measurements WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Measurement not found", 404);
    }

    await pool.query("DELETE FROM measurements WHERE id=?", [id]);
};
