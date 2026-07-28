import express from "express";
import { requireKnowledgeAccess } from "../../knowledge/middleware/knowledgeAuth.js";
import * as ctrl from "../controllers/processing.controller.js";

const router = express.Router();

router.use(...requireKnowledgeAccess);

router.get("/dashboard", ctrl.getDashboard);

router.post("/start/:documentId", ctrl.startProcessing);
router.post("/retry/:documentId", ctrl.retryProcessing);
router.get("/status/:documentId", ctrl.getStatus);
router.get("/logs/:documentId", ctrl.getLogs);
router.get("/errors/:documentId", ctrl.getErrors);

export default router;
