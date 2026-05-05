import { Router } from "express";
import * as mappingsController from "./mappings.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

router.route("/mappings")
    .get(mappingsController.getAllMappings)
    .post(requireAuth, requireRole("admin"), mappingsController.createMapping);

router.route("/mappings/:id")
    .patch(requireAuth, requireRole("admin"), mappingsController.updateMapping)
    .delete(requireAuth, requireRole("admin"), mappingsController.deleteMapping);

export default router;
