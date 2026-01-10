import express from "express";
import { getPerformance } from "../controllers/performanceController.js";

const router = express.Router();

router.get("/", getPerformance);

export default router;
