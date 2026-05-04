import { Router } from "express";
import * as measurementsController from "./measurements.controller.js";

const router = Router();

router.get("/latest", measurementsController.getLatestMeasurements);
router.get("/trend", measurementsController.getTrend);

router.route("/measurements")
    .get(measurementsController.getMeasurements);

router.route("/measurements/:id")
    .delete(measurementsController.deleteMeasurement);

export default router;
