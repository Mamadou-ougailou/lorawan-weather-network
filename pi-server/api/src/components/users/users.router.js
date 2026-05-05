import { Router } from "express";
import * as usersController from "./users.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Toutes les routes utilisateurs sont réservées aux admins
router.use(requireAuth, requireRole("admin"));

router.route("/users")
    .get(usersController.getAllUsers)
    .post(usersController.createUser);

router.route("/users/:id")
    .patch(usersController.updateUser)
    .delete(usersController.deleteUser);

export default router;
