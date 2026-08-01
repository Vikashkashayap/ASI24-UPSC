import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createOrder, getMyOrders } from "../controllers/order.controller.js";

const router = express.Router();

/**
 * Notes Website / Portal Orders API
 * Mounted at /api/orders
 */
router.post("/", authMiddleware, createOrder);
router.get("/my", authMiddleware, getMyOrders);

export default router;
