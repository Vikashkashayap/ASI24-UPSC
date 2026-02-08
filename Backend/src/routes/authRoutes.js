import express from "express";
import { register, login, changePassword, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
// Removed rate limiting from login to fix 429 errors
// If needed, can be re-enabled with more lenient settings

const router = express.Router();

// register route removed as per requirement: Students must NOT self-register.
router.post("/login", login);
router.post("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, me);

export default router;
