import express from "express";
import { getPlanner } from "../controllers/plannerController.js";

const router = express.Router();

router.get("/", getPlanner);

export default router;
