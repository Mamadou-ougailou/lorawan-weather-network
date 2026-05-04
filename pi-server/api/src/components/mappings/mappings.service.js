import pool from "../../db.js";
import { AppError } from "../../utils/AppError.js";

// In-memory cache for fast, synchronous access in dto.js
let cachedMappings = [];

export const loadMappings = async () => {
    const [rows] = await pool.query("SELECT * FROM sensor_mappings WHERE is_active=1");
    // Store as { raw, alias } to match the old DTO format
    cachedMappings = rows.map(r => ({
        id: r.id,
        raw: r.raw_key,
        alias: r.alias
    }));
    console.log(`[Cache] Loaded ${cachedMappings.length} sensor mappings from database.`);
};

export const getCachedMappings = () => {
    return cachedMappings;
};

export const getAllMappings = async () => {
    const [rows] = await pool.query("SELECT * FROM sensor_mappings ORDER BY id");
    return rows.map(r => ({
        id: r.id,
        rawKey: r.raw_key,
        alias: r.alias,
        isActive: r.is_active
    }));
};

export const createMapping = async (data) => {
    const { rawKey, alias } = data;
    if (!rawKey || !alias) {
        throw new AppError("Missing required fields: rawKey, alias", 400);
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO sensor_mappings (raw_key, alias) VALUES (?, ?)",
            [rawKey, alias]
        );
        await loadMappings(); // Refresh cache
        return result.insertId;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError(`Mapping with rawKey ${rawKey} already exists`, 409);
        }
        throw error;
    }
};

export const updateMapping = async (id, data) => {
    const [check] = await pool.query("SELECT * FROM sensor_mappings WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Mapping not found", 404);
    }
    const current = check[0];

    // Merge existing data with the newly provided data (partial update / PATCH)
    const rawKey = data.rawKey !== undefined ? data.rawKey : current.raw_key;
    const alias = data.alias !== undefined ? data.alias : current.alias;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active;

    await pool.query(
        "UPDATE sensor_mappings SET raw_key=?, alias=?, is_active=? WHERE id=?",
        [rawKey, alias, isActive, id]
    );
    await loadMappings(); // Refresh cache
};

export const deleteMapping = async (id) => {
    const [check] = await pool.query("SELECT id FROM sensor_mappings WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Mapping not found", 404);
    }

    // Soft delete
    await pool.query("UPDATE sensor_mappings SET is_active=0 WHERE id=?", [id]);
    await loadMappings(); // Refresh cache
};
