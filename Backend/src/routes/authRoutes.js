import express from "express";
import { register, login, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
// Removed rate limiting from login to fix 429 errors
// If needed, can be re-enabled with more lenient settings

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);

export default router;
