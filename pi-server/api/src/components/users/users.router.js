import { Router } from "express";
import * as usersController from "./users.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Appliquer la protection spécifiquement sur le chemin /users
router.use("/users", requireAuth, requireRole("admin"));

router.route("/users")
    .get(usersController.getAllUsers)
    .post(usersController.createUser);

router.route("/users/:id")
    .patch(usersController.updateUser)
    .delete(usersController.deleteUser);

export default router;
