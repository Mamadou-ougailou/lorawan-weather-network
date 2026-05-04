import { Router } from "express";
import * as alertsController from "./alerts.controller.js";

const router = Router();

router.route("/alerts")
    .get(alertsController.getAllAlerts);

router.route("/alerts/:id")
    .put(alertsController.resolveAlert)
    .delete(alertsController.deleteAlert);

export default router;
