import { Router } from "express";
import * as historyController from "./history.controller.js";

const router = Router();

router.get("/history", historyController.getHistory);
router.get("/compare", historyController.getCompare);

export default router;
