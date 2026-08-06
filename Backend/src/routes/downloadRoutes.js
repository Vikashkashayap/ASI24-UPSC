import express from "express";
import { trackApkDownload } from "../controllers/downloadController.js";

const router = express.Router();

// Mounted at /api/download → POST /api/download
router.post("/", trackApkDownload);

export default router;
