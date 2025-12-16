import express from "express";
import { submitAnswer, listEvaluations } from "../controllers/answerController.js";

const router = express.Router();

router.post("/", submitAnswer);
router.get("/evaluations", listEvaluations);

export default router;
