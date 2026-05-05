import { Router } from "express";
import * as stationsController from "./stations.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

router.route("/stations")
    .get(stationsController.getAllStations)
    .post(requireAuth, requireRole("admin"), stationsController.createStation);

router.route("/stations/:id")
    .patch(requireAuth, requireRole("admin"), stationsController.updateStation)
    .delete(requireAuth, requireRole("admin"), stationsController.deleteStation);

export default router;
