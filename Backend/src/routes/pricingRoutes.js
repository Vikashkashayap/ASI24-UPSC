import express from "express";
import { getAllPlans } from "../controllers/pricingController.js";

const router = express.Router();

// Public API for frontend
router.get("/", getAllPlans);

export default router;
