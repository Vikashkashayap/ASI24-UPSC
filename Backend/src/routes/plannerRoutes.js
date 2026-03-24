import express from "express";
import { generatePlan, getPlanner } from "../controllers/plannerController.js";

const router = express.Router();

router.get("/", getPlanner);
router.post("/generate-plan", generatePlan);

export default router;
