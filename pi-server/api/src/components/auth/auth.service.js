import pool from "../../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../config.js";
import { AppError } from "../../utils/AppError.js";

const SALT_ROUNDS = 10;

export const login = async (data) => {
    const { email, password } = data;

    if (!email || !password) {
        throw new AppError("Champs requis : email, password", 400);
    }

    const [rows] = await pool.query(
        "SELECT id, email, password_hash, role FROM users WHERE email = ?",
        [email]
    );

    if (rows.length === 0) {
        throw new AppError("Email ou mot de passe incorrect", 401);
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
        throw new AppError("Email ou mot de passe incorrect", 401);
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });

    return { token, user: payload };
};

export const getMe = async (userId) => {
    const [rows] = await pool.query(
        "SELECT id, email, role, created_at FROM users WHERE id = ?",
        [userId]
    );

    if (rows.length === 0) {
        throw new AppError("Utilisateur non trouvé", 404);
    }

    return rows[0];
};
