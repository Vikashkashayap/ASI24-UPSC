import express from "express";
import multer from "multer";
import {
  getAllStudents,
  getStudentById,
  getStudentPrelims,
  getStudentMains,
  getStudentActivity,
  updateStudentStatus,
  resetStudentPassword,
  createStudent,
  getDashboardStats,
  searchUsers,
  deleteStudent,
} from "../controllers/adminController.js";
import { createExcelTest } from "../controllers/excelTestController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const uploadExcel = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname?.toLowerCase().endsWith(".xlsx");
    if (allowed) cb(null, true);
    else cb(new Error("Only .xlsx Excel files are allowed"), false);
  },
});

// Debugging: Log all hits to admin routes
router.use((req, res, next) => {
  console.log(`👤 Admin Route Hit: ${req.method} ${req.path}`);
  next();
});

// All admin routes require authentication + admin role
router.use(requireAdmin);

// Prelims Topper: create Excel-based test
router.post("/excel-test/create", uploadExcel.single("excel"), createExcelTest);

// Dashboard statistics
router.get("/dashboard", getDashboardStats);

// User search
router.get("/search", searchUsers);

// Student management
router.delete("/students/:id", (req, res, next) => {
  console.log(`🗑️ DELETE INITIATED: Student ID ${req.params.id}`);
  next();
}, deleteStudent);

router.post("/students", createStudent);
router.get("/students", getAllStudents);
router.get("/students/:id", getStudentById);
router.get("/students/:id/prelims", getStudentPrelims);
router.get("/students/:id/mains", getStudentMains);
router.get("/students/:id/activity", getStudentActivity);
router.patch("/students/:id/status", updateStudentStatus);
router.post("/students/:id/reset-password", resetStudentPassword);

// Catch-all for undefined student routes to help debug 404s
router.all("/students*", (req, res) => {
  console.log(`❌ ERROR: Undefined Student Route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Admin student endpoint not found: ${req.method} ${req.originalUrl}`,
    debug: {
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      query: req.query
    }
  });
});

export default router;
