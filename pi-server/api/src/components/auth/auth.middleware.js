import jwt from "jsonwebtoken";
import config from "../../config.js";
import { AppError } from "../../utils/AppError.js";

/**
 * Middleware d'authentification — vérifie le token JWT dans le header Authorization.
 * Ajoute `req.user` avec { id, email, role } si le token est valide.
 */
export function requireAuth(req, _res, next) {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
        throw new AppError("Token manquant", 401);
    }

    const token = header.split(" ")[1];

    try {
        req.user = jwt.verify(token, config.jwt.secret);
        next();
    } catch {
        throw new AppError("Token invalide ou expiré", 401);
    }
}

/**
 * Middleware de rôle — vérifie que l'utilisateur a le rôle requis.
 * À utiliser après requireAuth.
 *
 * Exemple : router.delete("/stations/:id", requireAuth, requireRole("admin"), ...)
 */
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AppError("Accès refusé : rôle insuffisant", 403);
        }
        next();
    };
}
