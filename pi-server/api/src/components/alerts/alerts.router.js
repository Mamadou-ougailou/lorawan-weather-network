import { Router } from "express";
import * as alertsController from "./alerts.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

router.route("/alerts")
    .get(alertsController.getAllAlerts);

router.route("/alerts/:id")
    .put(requireAuth, requireRole("admin"), alertsController.resolveAlert)
    .delete(requireAuth, requireRole("admin"), alertsController.deleteAlert);

export default router;
