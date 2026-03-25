import express from "express";
import { mentorChat } from "../controllers/mentorController.js";
import {
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  listChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  listProjects
} from "../controllers/mentorChatHistoryController.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { requireMentor } from "../middleware/roleMiddleware.js";
import {
  createMentorAccount,
  assignStudentsToMentor,
  getMentorStudents,
  getMentorStudentDetail,
  postMentorFeedback,
  getMentorAnalytics,
} from "../controllers/mentorRoleController.js";
import {
  getStudentById,
  getStudentPrelims,
  getStudentMains,
  getStudentActivity,
  getStudentDartAnalytics,
  getStudentDart20DayReport,
} from "../controllers/adminController.js";
import { mentorStudentAccessMiddleware } from "../middleware/mentorStudentAccessMiddleware.js";

const router = express.Router();

const mentorScopedStudent = [...requireMentor, mentorStudentAccessMiddleware];

// —— Human mentor (staff) + admin — routes must stay above AI chat paths where needed ——

/** Admin: create mentor login */
router.post("/create", ...requireAdmin, createMentorAccount);

/** Admin: assign students to a mentor */
router.post("/assign-students", ...requireAdmin, assignStudentsToMentor);

/** Mentor: roster + analytics (static paths before /students/:studentId) */
router.get("/analytics", ...requireMentor, getMentorAnalytics);
router.get("/students", ...requireMentor, getMentorStudents);

/** Same data as admin student APIs, scoped to assigned students */
router.get("/students/:studentId/profile", ...mentorScopedStudent, getStudentById);
router.get("/students/:studentId/prelims", ...mentorScopedStudent, getStudentPrelims);
router.get("/students/:studentId/mains", ...mentorScopedStudent, getStudentMains);
router.get("/students/:studentId/activity", ...mentorScopedStudent, getStudentActivity);
router.get("/students/:studentId/dart-analytics", ...mentorScopedStudent, getStudentDartAnalytics);
router.get("/students/:studentId/dart-report-20day", ...mentorScopedStudent, getStudentDart20DayReport);

/** Summary + mentor feedback thread (must be after specific :studentId/* routes) */
router.get("/students/:studentId", ...requireMentor, getMentorStudentDetail);
router.post("/feedback", ...requireMentor, postMentorFeedback);

// —— AI Mentor chat ——

router.post("/chat", mentorChat);

// Chat history (backward compat)
router.get("/chat-history", getChatHistory);
router.post("/chat-history/message", saveChatMessage);
router.delete("/chat-history", clearChatHistory);

// Multiple chats & projects (ChatGPT-style)
router.get("/chats", listChats);
router.get("/chats/:sessionId", getChat);
router.post("/chats", createChat);
router.patch("/chats/:sessionId", updateChat);
router.delete("/chats/:sessionId", deleteChat);
router.get("/projects", listProjects);

export default router;
