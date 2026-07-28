import express from "express";
import { requireKnowledgeAccess } from "../../knowledge/middleware/knowledgeAuth.js";
import * as ctrl from "../controllers/intelligence.controller.js";

const router = express.Router();

router.use(...requireKnowledgeAccess);

router.get("/dashboard", ctrl.getDashboard);

router.post("/search", ctrl.postSearch);
router.post("/search/topic", ctrl.postSearchTopic);
router.post("/search/question", ctrl.postSearchQuestion);
router.post("/search/concept", ctrl.postSearchConcept);
router.post("/search/similar", ctrl.postSearchSimilar);
router.get("/search/history", ctrl.getSearchHistory);

router.post("/reindex/:documentId", ctrl.postReindex);
router.post("/retry", ctrl.postRetryFailed);
router.post("/sync", ctrl.postSyncNow);

export default router;
