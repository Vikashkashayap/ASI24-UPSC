import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  listMySyllabusTargets,
  toggleMySyllabusTargetComplete,
  toggleMySyllabusChapterComplete,
  startChapterPractice,
  startModuleFinal,
} from "../controllers/syllabusTargetController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/mine", listMySyllabusTargets);
router.post("/:id/complete", toggleMySyllabusTargetComplete);
router.post("/:id/chapters/complete", toggleMySyllabusChapterComplete);
router.post("/:id/chapters/practice", startChapterPractice);
router.post("/:id/module-final", startModuleFinal);

export default router;
