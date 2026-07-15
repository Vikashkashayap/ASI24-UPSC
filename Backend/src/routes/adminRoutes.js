import express from "express";
import multer from "multer";
import {
  getAllStudents,
  getProStudents,
  getStudentById,
  getStudentPrelims,
  getStudentPerformance,
  getStudentMains,
  getStudentActivity,
  getStudentDartAnalytics,
  getStudentDart15DayReport,
  updateStudentStatus,
  resetStudentPassword,
  createStudent,
  getDashboardStats,
  searchUsers,
  deleteStudent,
  getMentors,
  resetMentorPassword,
  deleteMentor,
} from "../controllers/adminController.js";
import {
  uploadTest,
  listImportedTests,
  updateImportedTest,
  getImportedTestAnalytics,
  deleteImportedTest,
} from "../controllers/prelimsImportController.js";
import {
  createPrelimsMockSchedule,
  listAdminPrelimsMocks,
  goLivePrelimsMock,
  updatePrelimsMockSchedule,
  deletePrelimsMock,
  exportPrelimsMockAsJson,
  getMockResults,
} from "../controllers/prelimsMockController.js";
import {
  createAssignedPractice,
  getAssignedPracticeById,
  assignStudentsToPractice,
  listAdminAssignedPractice,
  deleteAssignedPractice,
  updatePracticeQuestion,
  deletePracticeQuestion,
  regeneratePracticeQuestion,
  savePracticeQuestions,
  fillMissingPracticeHindi,
  approvePracticeTest,
} from "../controllers/assignedPracticeController.js";
import {
  listNotesSubjects,
  listNotesChapters,
  listNotesTopics,
  previewNotesTopic,
  syncNotesChapter,
  syncNotesTopic,
  getNotesCatalog,
  syncNotesBySlug,
  repairNotesChapter,
  uploadNotesPdf,
  processNotesPdf,
  reindexNotesChapter,
  reindexNotesTopic,
  notesVectorHealth,
  searchNotesChunks,
  deleteNotesChapter,
} from "../controllers/notesController.js";
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/pricingController.js";
import {
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

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
const pdfUpload = upload.fields([
  { name: "questionPdf", maxCount: 1 },
  { name: "answerKeyPdf", maxCount: 1 },
]);

/** Topic Practice / notes KB — single or multi PDF upload. */
const notesPdfUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 10 },
]);

// Debugging: Log all hits to admin routes
router.use((req, res, next) => {
  console.log(`👤 Admin Route Hit: ${req.method} ${req.path}`);
  next();
});

// All admin routes require authentication + admin role
router.use(requireAdmin);

// Dashboard statistics
router.get("/dashboard", getDashboardStats);

// Prelims Import: upload question paper PDF (parsed English questions)
router.post("/upload-test", pdfUpload, uploadTest);
router.get("/imported-tests", listImportedTests);
router.patch("/imported-tests/:id", updateImportedTest);
router.get("/imported-tests/:id/analytics", getImportedTestAnalytics);
router.delete("/imported-tests/:id", deleteImportedTest);

// Prelims Mock: schedule, go-live, update schedule, delete
router.post("/prelims-mock", createPrelimsMockSchedule);
router.get("/prelims-mock", listAdminPrelimsMocks);
router.get("/prelims-mock/:id/results", getMockResults);
router.get("/prelims-mock/:id/export", exportPrelimsMockAsJson);
router.post("/prelims-mock/:id/go-live", goLivePrelimsMock);
router.patch("/prelims-mock/:id", updatePrelimsMockSchedule);
router.delete("/prelims-mock/:id", deletePrelimsMock);

// Assigned topic practice (admin generates 50Q and assigns to students)
router.post("/assigned-practice", createAssignedPractice);
router.get("/assigned-practice", listAdminAssignedPractice);
router.get("/assigned-practice/:id", getAssignedPracticeById);
router.patch("/assigned-practice/:id/questions", savePracticeQuestions);
router.post("/assigned-practice/:id/fill-hindi", fillMissingPracticeHindi);
router.patch("/assigned-practice/:id/questions/:index", updatePracticeQuestion);
router.delete("/assigned-practice/:id/questions/:index", deletePracticeQuestion);
router.post("/assigned-practice/:id/questions/:index/regenerate", regeneratePracticeQuestion);
router.post("/assigned-practice/:id/approve", approvePracticeTest);
router.post("/assigned-practice/:id/assign", assignStudentsToPractice);
router.delete("/assigned-practice/:id", deleteAssignedPractice);

// Notes catalog (synced from notes.mentorsdaily.com)
router.get("/notes/catalog", getNotesCatalog);
router.get("/notes/subjects", listNotesSubjects);
router.get("/notes/chapters", listNotesChapters);
router.delete("/notes/chapters/:chapterId", deleteNotesChapter);
router.get("/notes/topics", listNotesTopics);
router.get("/notes/topics/:topicId/preview", previewNotesTopic);
router.post("/notes/sync-chapter", syncNotesChapter);
router.post("/notes/sync-by-slug", syncNotesBySlug);
router.post("/notes/repair-chapter/:chapterId", repairNotesChapter);
router.post("/notes/sync-topic/:topicId", syncNotesTopic);
router.post("/notes/upload-pdf", (req, res, next) => {
  notesPdfUpload(req, res, (err) => {
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
}, uploadNotesPdf);
router.post("/notes/process-pdf/:chapterId", processNotesPdf);
router.post("/notes/reindex/:chapterId", reindexNotesChapter);
router.post("/notes/reindex-topic/:topicId", reindexNotesTopic);
router.get("/notes/vector-health", notesVectorHealth);
router.get("/notes/search-chunks", searchNotesChunks);

// Pricing plans: CRUD (admin only)
router.get("/pricing", getAllPlans);
router.post("/pricing", createPlan);
router.put("/pricing/:id", updatePlan);
router.delete("/pricing/:id", deletePlan);

// Offer Manager: CRUD (admin only)
router.get("/offers", listOffers);
router.post("/offers", createOffer);
router.put("/offers/:id", updateOffer);
router.delete("/offers/:id", deleteOffer);

// User search
router.get("/search", searchUsers);

// Human mentors (admin UI)
router.get("/mentors", getMentors);
router.post("/mentors/:id/reset-password", resetMentorPassword);
router.delete("/mentors/:id", deleteMentor);

// Student management
router.delete("/students/:id", (req, res, next) => {
  console.log(`🗑️ DELETE INITIATED: Student ID ${req.params.id}`);
  next();
}, deleteStudent);

router.post("/students", createStudent);
router.get("/students", getAllStudents);
router.get("/pro-students", getProStudents);
router.get("/students/:id/performance", getStudentPerformance);
router.get("/students/:id", getStudentById);
router.get("/students/:id/prelims", getStudentPrelims);
router.get("/students/:id/mains", getStudentMains);
router.get("/students/:id/activity", getStudentActivity);
router.get("/students/:id/dart-analytics", getStudentDartAnalytics);
router.get("/students/:id/dart-report-15day", getStudentDart15DayReport);
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
