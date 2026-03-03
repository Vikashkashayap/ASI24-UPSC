// MUST be first so .env is loaded before passport.js (which needs GOOGLE_CLIENT_ID etc.)
import "./loadEnv.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import express from "express";
import cors from "cors";
import http from "http";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import copyEvaluationRoutes from "./routes/copyEvaluationRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import studentProfilerRoutes from "./routes/studentProfilerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import prelimsImportRoutes from "./routes/prelimsImportRoutes.js";
import dartRoutes from "./routes/dartRoutes.js";
import prelimsMockRoutes from "./routes/prelimsMockRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import currentAffairsRoutes, { currentAffairsAdminRouter } from "./routes/currentAffairsRoutes.js";
import { startCurrentAffairsCron } from "./cron/currentAffairsCron.js";
import { processScheduledPrelimsMocks, listLivePrelimsMocks } from "./controllers/prelimsMockController.js";
import { getActivePlans } from "./controllers/pricingController.js";
import { getActiveOffer } from "./controllers/offerController.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { requireActiveSubscription } from "./middleware/subscriptionMiddleware.js";
import { initializeSocketIO } from "./services/socketService.js";
import passport from "passport";
import "./config/passport.js";

const app = express();
// So req.protocol and req.get('host') are correct behind nginx/reverse proxy (for Google OAuth callback URL)
app.set("trust proxy", 1);
app.use(passport.initialize());

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
const baseUrl = (process.env.BASE_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || "5000"}`).replace(/\/$/, "");
const callbackUrl = baseUrl + "/api/auth/google/callback";
console.log("🌍 Environment Check:");
console.log("  PORT:", process.env.PORT || "5000 (default)");
console.log("  CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN || "not set");
console.log("  BASE_URL:", process.env.BASE_URL || process.env.BACKEND_URL || "not set (default: http://localhost:5000)");
console.log("  Callback URL:", callbackUrl);
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "set" : "not set");
console.log("  JWT_SECRET:", process.env.JWT_SECRET ? "set" : "not set");
console.log("  OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "set" : "not set");
if (process.env.GOOGLE_CLIENT_ID) {
  console.log("  Google OAuth: Add this exact redirect URI in Google Cloud Console →", callbackUrl);
}

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
console.log("📁 Admin routes mounted at /api/admin");
app.use("/api/admin", adminRoutes); 
app.use("/api/performance", requireActiveSubscription, performanceRoutes);
app.use("/api/planner", requireActiveSubscription, plannerRoutes);
app.use("/api/mentor", requireActiveSubscription, mentorRoutes);
app.use("/api/copy-evaluation", requireActiveSubscription, copyEvaluationRoutes);
app.use("/api/meeting", meetingRoutes);
console.log("🔗 Mounting test routes at /api/tests");
app.use("/api/tests", requireActiveSubscription, testRoutes);
app.use("/api/agents/student-profiler", studentProfilerRoutes);
app.use("/api/prelims-import", prelimsImportRoutes);
app.use("/api/dart", dartRoutes);
app.use("/api/payment", paymentRoutes);
// Prelims Mock: health is public; list + start require auth + active subscription
app.get("/api/prelims-mock/health", (req, res) => res.json({ ok: true, service: "prelims-mock" }));
app.use("/api/prelims-mock", requireActiveSubscription, prelimsMockRoutes);
console.log("🔗 Mounting prelims-mock routes at /api/prelims-mock");

// Current Affairs: list & detail public; MCQs require subscription (enforced in route); admin toggle protected
app.use("/api/current-affairs", currentAffairsRoutes);
app.use("/api/admin/current-affairs", currentAffairsAdminRouter);
console.log("🔗 Mounting current-affairs at /api/current-affairs, admin at /api/admin/current-affairs");

// Public pricing: active plans only (for landing page)
app.get("/api/pricing", getActivePlans);
// Public: current active offer for banner
app.get("/api/offers/active", getActiveOffer);

app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

const PORT = process.env.PORT || 5000;

// Cron: at scheduled time, auto-generate questions and set Prelims Mock live
const CRON_INTERVAL_MS = 60 * 1000;
setInterval(() => {
  processScheduledPrelimsMocks().catch((err) => console.error("Prelims Mock cron:", err));
}, CRON_INTERVAL_MS);

// Cron: daily 6 AM – fetch GNews + Claude → save current affairs
startCurrentAffairsCron();

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io initialized for real-time communication`);
});
