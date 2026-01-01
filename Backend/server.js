import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import answerRoutes from "./src/routes/answerRoutes.js";
import performanceRoutes from "./src/routes/performanceRoutes.js";
import plannerRoutes from "./src/routes/plannerRoutes.js";
import mentorRoutes from "./src/routes/mentorRoutes.js";
import chatbotRoutes from "./src/routes/chatbotRoutes.js";
import copyEvaluationRoutes from "./src/routes/copyEvaluationRoutes.js";
import meetingRoutes from "./src/routes/meetingRoutes.js";
import { authMiddleware } from "./src/middleware/authMiddleware.js";
import { initializeSocketIO } from "./src/services/socketService.js";

const app = express();

// Configure CORS to allow multiple origins
const allowedOrigins = [
  'http://localhost:5173', // Development frontend
  'https://studentportal.mentorsdaily.com', // Production domain
  process.env.CLIENT_ORIGIN // Environment variable (if set)
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

connectDB();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/answers", authMiddleware, answerRoutes);
app.use("/api/performance", authMiddleware, performanceRoutes);
app.use("/api/planner", authMiddleware, plannerRoutes);
app.use("/api/mentor", authMiddleware, mentorRoutes);
app.use("/api/chatbot", authMiddleware, chatbotRoutes);
app.use("/api/copy-evaluation", copyEvaluationRoutes);
app.use("/api/meeting", meetingRoutes);

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io initialized for real-time communication`);
});
