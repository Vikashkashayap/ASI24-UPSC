import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  listMySyllabusTargets,
  listMyChapterPracticeHistory,
  toggleMySyllabusTargetComplete,
  toggleMySyllabusChapterComplete,
  startChapterPractice,
  startModuleFinal,
  getChapterPracticeHistory,
} from "../controllers/syllabusTargetController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/mine", listMySyllabusTargets);
router.get("/mine/chapter-history", listMyChapterPracticeHistory);
router.post("/:id/complete", toggleMySyllabusTargetComplete);
router.post("/:id/chapters/complete", toggleMySyllabusChapterComplete);
router.get("/:id/chapters/history", getChapterPracticeHistory);
router.post("/:id/chapters/practice", startChapterPractice);
router.post("/:id/module-final", startModuleFinal);

export default router;
