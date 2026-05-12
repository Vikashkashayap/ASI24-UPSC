import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// All payment routes require authentication
router.post("/create-order", authMiddleware, createOrder);
router.post("/verify", authMiddleware, verifyPayment);

export default router;

