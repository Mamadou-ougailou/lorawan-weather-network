import pool from "../../db.js";
import bcrypt from "bcryptjs";
import { AppError } from "../../utils/AppError.js";

const SALT_ROUNDS = 10;

export const createUser = async (data) => {
    const { email, password, role } = data;

    if (!email || !password || !role) {
        throw new AppError("Champs requis : email, password, role", 400);
    }

    if (!["admin", "viewer"].includes(role)) {
        throw new AppError("Rôle invalide. Doit être 'admin' ou 'viewer'", 400);
    }

    if (password.length < 6) {
        throw new AppError("Le mot de passe doit contenir au moins 6 caractères", 400);
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const [result] = await pool.query(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            [email, hash, role]
        );
        return result.insertId;
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError("Un utilisateur avec cet email existe déjà", 409);
        }
        throw error;
    }
};

export const updateUser = async (id, data) => {
    const { role, password } = data;
    
    if (!role && !password) {
        throw new AppError("Aucune donnée à mettre à jour", 400);
    }

    const updates = [];
    const values = [];

    if (role) {
        if (!["admin", "viewer"].includes(role)) {
            throw new AppError("Rôle invalide", 400);
        }
        updates.push("role = ?");
        values.push(role);
    }

    if (password) {
        if (password.length < 6) {
            throw new AppError("Le mot de passe doit contenir au moins 6 caractères", 400);
        }
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        updates.push("password_hash = ?");
        values.push(hash);
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    const [result] = await pool.query(query, values);
    
    if (result.affectedRows === 0) {
        throw new AppError("Utilisateur non trouvé", 404);
    }
};

export const getAllUsers = async () => {
    const [rows] = await pool.query("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC");
    return rows;
};

export const deleteUser = async (id) => {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
        throw new AppError("Utilisateur non trouvé", 404);
    }
};
