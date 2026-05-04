import pool from "../../db.js";
import { toTrendDTO, buildAggregateSQL } from "../../dto.js";

export const getHistory = async (siteId, hours) => {
    const conditions = ["m.received_at >= NOW() - INTERVAL ? HOUR"];
    const params = [hours];

    if (siteId) {
        conditions.push("m.site_id = ?");
        params.push(siteId);
    }

    const sql = `
        SELECT
            DATE_FORMAT(m.received_at, '%Y-%m-%d %H:00:00') AS hour_start,
            m.site_id,
            s.name AS site_name,
            ${buildAggregateSQL("m")},
            COUNT(*) AS sample_count
        FROM measurements m
        JOIN sites s ON s.id = m.site_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY m.site_id, hour_start
        ORDER BY m.site_id, hour_start
    `;

    const [rows] = await pool.query(sql, params);
    return rows.map(toTrendDTO);
};

export const getCompare = async (hours) => {
    const sql = `
        SELECT
            DATE_FORMAT(m.received_at, '%Y-%m-%dT%H:00:00') AS hour,
            s.name AS site_name,
            s.id AS site_id,
            ${buildAggregateSQL("m")},
            COUNT(*) AS sample_count
        FROM measurements m
        JOIN sites s ON s.id = m.site_id
        WHERE m.received_at >= NOW() - INTERVAL ? HOUR
        GROUP BY hour, s.id
        ORDER BY hour, s.id
    `;

    const [rows] = await pool.query(sql, [hours]);
    return rows.map(toTrendDTO);
};
