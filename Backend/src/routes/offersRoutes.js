import express from "express";
import { getActiveOffer } from "../controllers/offerController.js";

const router = express.Router();

// Mounted at /api/offers
router.get("/active", getActiveOffer);

export default router;
