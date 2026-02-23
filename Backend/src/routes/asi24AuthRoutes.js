import express from "express";
import {
  register,
  login,
  me,
  validateExamSlug,
} from "../controllers/asi24AuthController.js";
import { studentAuthMiddleware } from "../middleware/studentAuthMiddleware.js";

const router = express.Router({ mergeParams: true });

router.post("/:examSlug/register", register);
router.post("/:examSlug/login", login);
router.get("/:examSlug/me", studentAuthMiddleware, me);

export { validateExamSlug };
export default router;
