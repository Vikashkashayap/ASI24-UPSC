import "./loadEnv.js";

import express from "express";
import cors from "cors";
import http from "http";

import { connectDB } from "./config/db.js";
import { isGoogleOAuthConfigured } from "./config/passport.js";

import authRoutes from "./routes/authRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import copyEvaluationRoutes from "./routes/copyEvaluationRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import studentProfilerRoutes from "./routes/studentProfilerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import prelimsMockRoutes from "./routes/prelimsMockRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import offersRoutes from "./routes/offersRoutes.js";
import currentAffairsRoutes, {
  currentAffairsAdminRouter,
} from "./routes/currentAffairsRoutes.js";

import { processScheduledPrelimsMocks } from "./controllers/prelimsMockController.js";

import { authMiddleware } from "./middleware/authMiddleware.js";
import { initializeSocketIO } from "./services/socketService.js";

const app = express();

// Nginx / reverse proxy: correct req.protocol (https) for OAuth callback URLs
app.set("trust proxy", 1);

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

if (isGoogleOAuthConfigured()) {
  console.log("✅ Google OAuth credentials loaded (strategy registers on first login)");
} else {
  console.warn(
    "⚠️  Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Backend/.env"
  );
}

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

// Must be before /api/admin so /api/admin/current-affairs/* is not swallowed by admin router
app.use("/api/admin/current-affairs", currentAffairsAdminRouter);
app.use("/api/admin", adminRoutes);

app.use("/api/offers", offersRoutes);
app.use("/api/current-affairs", currentAffairsRoutes);

app.use("/api/pricing", pricingRoutes);
app.use("/api/payment", paymentRoutes);

app.use("/api/prelims-mock", authMiddleware, prelimsMockRoutes);

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
