import { Router } from "express";
import * as authController from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router = Router();

router.post("/auth/login", authController.login);
router.get("/auth/me", requireAuth, authController.getMe);

export default router;
