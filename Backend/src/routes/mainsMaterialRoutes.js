import express from "express";
import multer from "multer";
import {
  listAdminSessions,
  getAdminSession,
  createSession,
  updateSession,
  deleteSession,
  listPublishedSessions,
  downloadSessionFile,
} from "../controllers/mainsMaterialController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

const materialsUpload = upload.fields([
  { name: "ppt", maxCount: 1 },
  { name: "workbook", maxCount: 1 },
  { name: "referenceCards", maxCount: 1 },
]);

function handleMulter(req, res, next) {
  materialsUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "PDF too large (max 50MB)"
          : err.message || "Upload error";
      return res.status(400).json({ success: false, message });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Only PDF files are allowed",
    });
  });
}

/** Student / authenticated: published list + file download */
const studentRouter = express.Router();
studentRouter.use(authMiddleware);
studentRouter.get("/", listPublishedSessions);
studentRouter.get("/:id/file/:type", downloadSessionFile);

/** Admin CRUD (JWT admin). Mounted under /api/admin/mains-materials */
const adminRouter = express.Router();
adminRouter.use(...requireAdmin);
adminRouter.get("/", listAdminSessions);
adminRouter.get("/:id", getAdminSession);
adminRouter.get("/:id/file/:type", downloadSessionFile);
adminRouter.post("/", handleMulter, createSession);
adminRouter.put("/:id", handleMulter, updateSession);
adminRouter.delete("/:id", deleteSession);

export { studentRouter as mainsMaterialStudentRouter, adminRouter as mainsMaterialAdminRouter };
export default studentRouter;
