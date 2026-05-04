import pool from "../../db.js";
import { AppError } from "../../utils/AppError.js";
import { toSiteDTO } from "../../dto.js";

export const getAllStations = async () => {
    const [rows] = await pool.query("SELECT * FROM sites ORDER BY id");
    return rows.map(toSiteDTO);
};

export const createStation = async (data) => {
    const { name, city, latitude, longitude, altitudeM, description } = data;
    
    if (!name) {
        throw new AppError("Missing required fields: name", 400);
    }

    const sql = `
        INSERT INTO sites (name, city, latitude, longitude, altitude_m, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
        const [result] = await pool.query(sql, [name, city, latitude, longitude, altitudeM || 0, description]);
        return result.insertId;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError(`Station with name ${name} already exists`, 409);
        }
        throw error;
    }
};

export const updateStation = async (id, data) => {
    // Check if ID exists before updating and fetch current data
    const [check] = await pool.query("SELECT * FROM sites WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Station not found", 404);
    }
    const current = check[0];

    // Merge existing data with the newly provided data (partial update / PATCH)
    const name = data.name !== undefined ? data.name : current.name;
    const city = data.city !== undefined ? data.city : current.city;
    const latitude = data.latitude !== undefined ? data.latitude : current.latitude;
    const longitude = data.longitude !== undefined ? data.longitude : current.longitude;
    const altitudeM = data.altitudeM !== undefined ? data.altitudeM : current.altitude_m;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active;
    const description = data.description !== undefined ? data.description : current.description;

    const sql = `
        UPDATE sites 
        SET name=?, city=?, latitude=?, longitude=?, altitude_m=?, is_active=?, description=?
        WHERE id=?
    `;
    const params = [
        name, city, latitude, longitude, altitudeM, isActive, description, id
    ];
    
    await pool.query(sql, params);
};

export const deleteStation = async (id) => {
    // Check if ID exists before deleting
    const [check] = await pool.query("SELECT id FROM sites WHERE id = ?", [id]);
    if (check.length === 0) {
        throw new AppError("Station not found", 404);
    }

    await pool.query("UPDATE sites SET is_active=0 WHERE id=?", [id]);
};
