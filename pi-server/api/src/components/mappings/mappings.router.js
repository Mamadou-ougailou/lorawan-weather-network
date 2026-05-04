import { Router } from "express";
import * as mappingsController from "./mappings.controller.js";

const router = Router();

router.route("/mappings")
    .get(mappingsController.getAllMappings)
    .post(mappingsController.createMapping);

router.route("/mappings/:id")
    .patch(mappingsController.updateMapping)
    .delete(mappingsController.deleteMapping);

export default router;
