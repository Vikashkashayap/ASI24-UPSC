import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  submitDartEntry,
  listDartEntries,
  getAnalytics,
  downloadDartReport,
  download15DayReport,
} from "../controllers/dartController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", submitDartEntry);
router.get("/entries", listDartEntries);
router.get("/analytics", getAnalytics);
router.get("/report", downloadDartReport);
router.get("/report-15day", download15DayReport);

export default router;
