import express from "express";
import {
  getAllStudents,
  getStudentById,
  getStudentPrelims,
  getStudentMains,
  getStudentActivity,
  updateStudentStatus,
  resetStudentPassword,
  getDashboardStats,
  searchUsers,
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAdmin);

// Dashboard statistics
router.get("/dashboard", getDashboardStats);

// User search
router.get("/search", searchUsers);

// Student management
router.get("/students", getAllStudents);
router.get("/students/:id", getStudentById);
router.get("/students/:id/prelims", getStudentPrelims);
router.get("/students/:id/mains", getStudentMains);
router.get("/students/:id/activity", getStudentActivity);
router.patch("/students/:id/status", updateStudentStatus);
router.post("/students/:id/reset-password", resetStudentPassword);

export default router;
