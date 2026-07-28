import express from "express";
import { requireKnowledgeAccess } from "../../knowledge/middleware/knowledgeAuth.js";
import * as ctrl from "../controllers/testBuilder.controller.js";

const router = express.Router();

router.use(...requireKnowledgeAccess);

router.get("/dashboard", ctrl.getDashboard);
router.get("/tests", ctrl.listTests);
router.post("/from-session", ctrl.createFromSession);
router.post("/build-and-create", ctrl.buildAndCreate);

export default router;
