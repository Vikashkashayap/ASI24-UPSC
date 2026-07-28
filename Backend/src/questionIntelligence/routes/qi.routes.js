import express from "express";
import { requireKnowledgeAccess } from "../../knowledge/middleware/knowledgeAuth.js";
import * as ctrl from "../controllers/qi.controller.js";

const router = express.Router();

router.use(...requireKnowledgeAccess);

router.get("/dashboard", ctrl.getDashboard);
router.post("/build", ctrl.buildSet);
router.get("/sessions", ctrl.listSessions);
router.get("/sessions/:id", ctrl.getSession);

export default router;
