import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";

import { connectDB } from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import performanceRoutes from "./src/routes/performanceRoutes.js";
import plannerRoutes from "./src/routes/plannerRoutes.js";
import mentorRoutes from "./src/routes/mentorRoutes.js";
import copyEvaluationRoutes from "./src/routes/copyEvaluationRoutes.js";
import meetingRoutes from "./src/routes/meetingRoutes.js";
import testRoutes from "./src/routes/testRoutes.js";
import studentProfilerRoutes from "./src/routes/studentProfilerRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import prelimsMockRoutes from "./src/routes/prelimsMockRoutes.js";

import {
  processScheduledPrelimsMocks,
  listLivePrelimsMocks,
} from "./src/controllers/prelimsMockController.js";

import { authMiddleware } from "./src/middleware/authMiddleware.js";
import { initializeSocketIO } from "./src/services/socketService.js";

const app = express();

/* -------------------- CORS -------------------- */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://15.207.108.185",
  "https://studentportal.mentorsdaily.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

/* -------------------- DB -------------------- */

connectDB();

/* -------------------- BASIC ROUTES -------------------- */

app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

app.get("/api", (req, res) => {
  res.json({ message: "API Root Working 🚀" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* -------------------- ROUTES -------------------- */

app.use("/api/auth", authRoutes);
app.use("/api/performance", authMiddleware, performanceRoutes);
app.use("/api/planner", authMiddleware, plannerRoutes);
app.use("/api/mentor", authMiddleware, mentorRoutes);
app.use("/api/copy-evaluation", copyEvaluationRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/agents/student-profiler", studentProfilerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/prelims-mock", authMiddleware, listLivePrelimsMocks);
app.use("/api/prelims-mock", prelimsMockRoutes);

/* -------------------- CRON -------------------- */

setInterval(() => {
  processScheduledPrelimsMocks().catch((err) =>
    console.error("Prelims Mock cron:", err)
  );
}, 60 * 1000);

/* -------------------- SERVER -------------------- */

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
