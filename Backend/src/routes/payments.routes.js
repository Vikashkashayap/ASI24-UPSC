import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { verifyPayment } from "../controllers/order.controller.js";

const router = express.Router();

/**
 * Notes Website payment verification
 * Mounted at /api/payments
 *
 * Flow: POST /api/orders → Razorpay Checkout → POST /api/payments/verify
 */
router.post("/verify", authMiddleware, verifyPayment);

export default router;
