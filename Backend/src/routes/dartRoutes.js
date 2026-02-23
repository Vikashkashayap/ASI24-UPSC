import express from "express";
import { dashboardAuthMiddleware } from "../middleware/dashboardAuthMiddleware.js";
import {
  submitDartEntry,
  listDartEntries,
  getAnalytics,
  download20DayReport,
} from "../controllers/dartController.js";

const router = express.Router();

router.use(dashboardAuthMiddleware);

router.post("/", submitDartEntry);
router.get("/entries", listDartEntries);
router.get("/analytics", getAnalytics);
router.get("/report-20day", download20DayReport);

export default router;
