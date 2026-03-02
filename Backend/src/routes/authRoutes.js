import express from "express";
import { register, login, changePassword, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { googleAuth, googleAuthCallback } from "../config/passport.js";

const router = express.Router();

// Public register: creates paid-user with subscriptionStatus inactive (must subscribe after)
router.post("/register", register);
router.post("/login", login);
router.get("/google", googleAuth);
router.get("/google/callback", googleAuthCallback);
router.post("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, me);

export default router;
