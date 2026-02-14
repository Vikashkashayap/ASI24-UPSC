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
import excelTestRoutes from "./src/routes/excelTestRoutes.js";

import { authMiddleware } from "./src/middleware/authMiddleware.js";
import { initializeSocketIO } from "./src/services/socketService.js";

const app = express();

// CORS configuration to allow both common Vite dev ports and production
const defaultOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = [
  defaultOrigin,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://studentportal.mentorsdaily.com" // Add production domain
].filter((origin, index, self) => self.indexOf(origin) === index); // Remove duplicates

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

connectDB();

// Log environment info on startup
console.log("🌍 Environment Check:");
console.log("  PORT:", process.env.PORT || "5000 (default)");
console.log("  CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN || "not set");
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "set" : "not set");
console.log("  JWT_SECRET:", process.env.JWT_SECRET ? "set" : "not set");
console.log("  OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "set" : "not set");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug endpoint to check API key (remove in production)
app.get("/api/debug/apikey", (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  res.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : "Not set",
    keyStartsWith: apiKey ? apiKey.substring(0, 10) : "N/A",
    model: process.env.OPENROUTER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/performance", authMiddleware, performanceRoutes);
app.use("/api/planner", authMiddleware, plannerRoutes);
app.use("/api/mentor", authMiddleware, mentorRoutes);
app.use("/api/copy-evaluation", copyEvaluationRoutes);
app.use("/api/meeting", meetingRoutes);
console.log("🔗 Mounting test routes at /api/tests");
app.use("/api/tests", testRoutes);
app.use("/api/agents/student-profiler", studentProfilerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", excelTestRoutes);



const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io initialized for real-time communication`);
});

