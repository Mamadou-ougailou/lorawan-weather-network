import { Router } from "express";
import * as measurementsController from "./measurements.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

router.get("/latest", measurementsController.getLatestMeasurements);
router.get("/trend", measurementsController.getTrend);

router.route("/measurements")
    .get(measurementsController.getMeasurements);

router.route("/measurements/:id")
    .delete(requireAuth, requireRole("admin"), measurementsController.deleteMeasurement);

export default router;
