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
import studyPlanRoutes from "./routes/studyPlanRoutes.js";
import advancedStudyPlannerRoutes from "./routes/advancedStudyPlannerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import prelimsMockRoutes from "./routes/prelimsMockRoutes.js";
import dartRoutes from "./routes/dartRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import offersRoutes from "./routes/offersRoutes.js";
import currentAffairsRoutes, {
  currentAffairsAdminRouter,
} from "./routes/currentAffairsRoutes.js";
import syllabusTargetRoutes from "./routes/syllabusTargetRoutes.js";
import ragRoutes from "./rag/routes/ragRoutes.js";
import { uploadPdf as ragUploadPdf } from "./rag/controllers/ragController.js";
import { ragPdfUpload } from "./rag/middleware/uploadPdf.js";
import { requireAdmin } from "./middleware/adminMiddleware.js";
import knowledgeRoutes from "./knowledge/routes/knowledge.routes.js";
import { ensureKnowledgeTaxonomySeeded } from "./knowledge/seed/seedTaxonomy.js";
import processingRoutes from "./processing/routes/processing.routes.js";
import { startProcessingEngine } from "./processing/index.js";
import intelligenceRoutes from "./intelligence/routes/intelligence.routes.js";
import searchAliasRoutes from "./intelligence/routes/search.routes.js";
import { startIntelligenceEngine } from "./intelligence/index.js";
import aiRoutes from "./ai/routes/ai.routes.js";
import qiRoutes from "./questionIntelligence/routes/qi.routes.js";
import testBuilderRoutes from "./testBuilder/routes/testBuilder.routes.js";
import {
  mainsMaterialStudentRouter,
  mainsMaterialAdminRouter,
} from "./routes/mainsMaterialRoutes.js";
import notesCmsAdminRoutes from "./routes/notesCmsAdminRoutes.js";
import notesCmsPublicRoutes from "./routes/notesCmsPublicRoutes.js";
import downloadRoutes from "./routes/downloadRoutes.js";

import { processScheduledPrelimsMocks } from "./controllers/prelimsMockController.js";
import { startCurrentAffairsCron } from "./cron/currentAffairsCron.js";
import { startTrashPurgeCron } from "./cron/trashPurgeCron.js";

import { authMiddleware } from "./middleware/authMiddleware.js";
import { initializeSocketIO } from "./services/socketService.js";
import { qdrantService } from "./services/ai/qdrant.service.js";
import { getSystemHealth } from "./services/health.service.js";

const app = express();

// Nginx / reverse proxy: correct req.protocol (https) for OAuth callback URLs
app.set("trust proxy", 1);

/* -------------------- CORS -------------------- */

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "https://studentportal.mentorsdaily.com",
  // Capacitor Android/iOS WebView origins (androidScheme: https → https://localhost)
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173", "http://localhost:5174");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

/* -------------------- DB -------------------- */

connectDB();

// Seed Knowledge Base subjects/categories (non-fatal)
ensureKnowledgeTaxonomySeeded().catch((err) => {
  console.warn("[knowledge] taxonomy seed failed:", err?.message || err);
});

// Proactively create collection (non-fatal if it fails)
if (qdrantService.isConfigured()) {
  const autoCreate =
    String(process.env.QDRANT_AUTO_CREATE_COLLECTION ?? "true").toLowerCase() === "true";
  if (autoCreate) {
    qdrantService.ensureCollection().catch((err) => {
      console.error("[qdrant] ensureCollection on startup failed:", err?.message || err);
    });
  }
}

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

/** Full system health — MongoDB, Qdrant, embeddings, OpenRouter LLM */
app.get("/health", async (_req, res) => {
  try {
    const health = await getSystemHealth();
    const allOk = Object.entries(health)
      .filter(([k]) => k !== "embeddingProvider")
      .every(([, v]) => v === "connected");
    return res.status(allOk ? 200 : 503).json(health);
  } catch (err) {
    console.error("[health]", err);
    return res.status(500).json({
      mongodb: "disconnected",
      qdrant: "disconnected",
      embedding: "disconnected",
      embeddingProvider: "OpenAI",
      llm: "disconnected",
      error: err?.message || "Health check failed",
    });
  }
});

/* -------------------- HEALTH CHECKS -------------------- */

app.get("/health/qdrant", async (_req, res) => {
  try {
    const qdrant = await qdrantService.health();
    const status = qdrant?.ok ? 200 : 503;
    return res.status(status).json({
      success: Boolean(qdrant?.ok),
      data: qdrant,
    });
  } catch (err) {
    console.error("[health/qdrant]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Qdrant health check failed",
    });
  }
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
app.use("/api/study-plan", authMiddleware, studyPlanRoutes);
app.use("/api/study-planner", authMiddleware, advancedStudyPlannerRoutes);
app.use("/api/syllabus-targets", syllabusTargetRoutes);

// Must be before /api/admin so /api/admin/current-affairs/* is not swallowed by admin router
app.use("/api/admin/current-affairs", currentAffairsAdminRouter);
app.use("/api/admin/mains-materials", mainsMaterialAdminRouter);
app.use("/api/admin/notes-portal", notesCmsAdminRoutes);
app.use("/api/admin", adminRoutes);

// Notes Website public catalog + subscribe (CMS admin is /api/admin/notes-portal)
app.use("/api/notes-portal", notesCmsPublicRoutes);

// Enterprise Knowledge Base (upload + taxonomy)
app.use("/api/knowledge", knowledgeRoutes);

// AI Knowledge Processing Engine (queues + workers)
app.use("/api/processing", processingRoutes);

// AI Knowledge Intelligence (embeddings + hybrid search)
app.use("/api/intelligence", intelligenceRoutes);
// Spec alias paths: POST /api/search, /api/search/topic, …
app.use("/api/search", searchAliasRoutes);

// AI Orchestrator — cost analytics + health monitor (admin)
app.use("/api/ai", aiRoutes);

// Question Intelligence Engine (select bank + generate only if required)
app.use("/api/question-intelligence", qiRoutes);

// Test Builder — QI sessions → assignable practice tests (student Prelims Test)
app.use("/api/test-builder", testBuilderRoutes);

// Shared Knowledge Base RAG (search + generate + admin manage)
app.use("/api/rag", ragRoutes);
// Prompt alias: POST /api/admin/upload-pdf → same pipeline as Knowledge Base PDF ingest
app.post("/api/admin/upload-pdf", requireAdmin, ragPdfUpload, ragUploadPdf);

// Mains 360 materials (student published list + file download)
app.use("/api/mains-materials", mainsMaterialStudentRouter);

app.use("/api/offers", offersRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/current-affairs", currentAffairsRoutes);

app.use("/api/pricing", pricingRoutes);
app.use("/api/payment", paymentRoutes);

app.use("/api/prelims-mock", authMiddleware, prelimsMockRoutes);
app.use("/api/dart", authMiddleware, dartRoutes);

/* -------------------- CRON -------------------- */

setInterval(() => {
  processScheduledPrelimsMocks().catch((err) =>
    console.error("Prelims Mock cron:", err)
  );
}, 60 * 1000);

// Start current affairs daily pipeline (6 AM Asia/Kolkata)
startCurrentAffairsCron();
startTrashPurgeCron();

// Start AI Knowledge Processing Engine (BullMQ or inline fallback)
startProcessingEngine().catch((err) => {
  console.error("[processing] engine failed to start:", err?.message || err);
});

startIntelligenceEngine().catch((err) => {
  console.error("[intelligence] engine failed to start:", err?.message || err);
});

/* -------------------- SERVER -------------------- */

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
