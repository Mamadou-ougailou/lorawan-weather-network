import { Router } from "express";
import * as stationsController from "./stations.controller.js";

const router = Router();

router.route("/stations")
    .get(stationsController.getAllStations)
    .post(stationsController.createStation);

router.route("/stations/:id")
    .patch(stationsController.updateStation)
    .delete(stationsController.deleteStation);

export default router;
