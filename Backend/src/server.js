import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CRITICAL: Load .env file FIRST, before any other imports that might use env vars
const envPath = join(__dirname, "..", ".env");
const envLoaded = dotenv.config({ path: envPath });
if (envLoaded.error) {
  console.log("⚠️  .env file not found or could not be loaded:", envPath);
} else {
  console.log("✅ .env file loaded successfully from:", envPath);
}

// Enhanced debug logging for environment variables
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL;

// console.log("=".repeat(60));
// console.log("🔍 ENVIRONMENT VARIABLES DEBUG");
// console.log("=".repeat(60));
// console.log("📁 .env file path:", join(__dirname, "..", ".env"));
// console.log("🔑 OPENROUTER_API_KEY exists:", !!apiKey);
// console.log("🔑 OPENROUTER_API_KEY length:", apiKey?.length || 0);
// if (apiKey) {
//   const maskedKey = apiKey.substring(0, 15) + "...";
//   console.log("🔑 OPENROUTER_API_KEY preview:", maskedKey);
//   console.log("🔑 OPENROUTER_API_KEY starts with:", apiKey.substring(0, 10));
// } else {
//   console.error("❌ OPENROUTER_API_KEY is UNDEFINED or EMPTY!");
// }
// console.log("🤖 OPENROUTER_MODEL:", model || "NOT SET (will use default)");
// console.log("🌐 CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN || "NOT SET");
// console.log("=".repeat(60));

import express from "express";
import cors from "cors";
import http from "http";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import copyEvaluationRoutes from "./routes/copyEvaluationRoutes.js";
import singleQuestionEvaluationRoutes from "./routes/singleQuestionEvaluationRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import studentProfilerRoutes from "./routes/studentProfilerRoutes.js";
import currentAffairsRoutes from "./routes/currentAffairsRoutes.js";
import modelDrivenCurrentAffairsRoutes from "./routes/modelDrivenCurrentAffairsRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { initializeSocketIO } from "./services/socketService.js";
import schedulerService from "./services/schedulerService.js";

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

// Initialize scheduler service
await schedulerService.initialize();

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
app.use("/api/single-question-evaluation", singleQuestionEvaluationRoutes);
app.use("/api/meeting", meetingRoutes);
console.log("🔗 Mounting test routes at /api/tests");
app.use("/api/tests", testRoutes);
app.use("/api/agents/student-profiler", studentProfilerRoutes);
app.use("/api/current-affairs", currentAffairsRoutes);
app.use("/api/model-driven", modelDrivenCurrentAffairsRoutes);

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io initialized for real-time communication`);
});
