import express from "express";
import { requireKnowledgeAccess } from "../../knowledge/middleware/knowledgeAuth.js";
import * as ctrl from "../controllers/intelligence.controller.js";

/** Spec aliases: POST /api/search, /api/search/topic, … */
const router = express.Router();

router.use(...requireKnowledgeAccess);

router.post("/", ctrl.postSearch);
router.post("/topic", ctrl.postSearchTopic);
router.post("/question", ctrl.postSearchQuestion);
router.post("/concept", ctrl.postSearchConcept);
router.post("/similar", ctrl.postSearchSimilar);
router.get("/history", ctrl.getSearchHistory);

export default router;
