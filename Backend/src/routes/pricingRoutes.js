import express from "express";
import { getActivePlans } from "../controllers/pricingController.js";

const router = express.Router();

// Public API for frontend (active plans only)
router.get("/", getActivePlans);

export default router;
