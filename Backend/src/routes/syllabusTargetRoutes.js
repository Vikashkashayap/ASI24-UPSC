import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  listMySyllabusTargets,
  toggleMySyllabusTargetComplete,
} from "../controllers/syllabusTargetController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/mine", listMySyllabusTargets);
router.post("/:id/complete", toggleMySyllabusTargetComplete);

export default router;
