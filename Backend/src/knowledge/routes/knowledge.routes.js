import express from "express";
import multer from "multer";
import { requireKnowledgeAccess } from "../middleware/knowledgeAuth.js";
import { getMaxFileBytes, getMaxZipBytes } from "../utils/fileValidation.js";
import * as ctrl from "../controllers/knowledge.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(getMaxFileBytes(), getMaxZipBytes()),
    files: 50,
  },
});

router.use(...requireKnowledgeAccess);

router.get("/dashboard", ctrl.seedAndDashboard);

// Taxonomy — must be before /:id
router.get("/subjects", ctrl.getSubjects);
router.post("/subjects", ctrl.postSubject);
router.patch("/subjects/:id", ctrl.patchSubject);
router.delete("/subjects/:id", ctrl.deleteSubject);

router.get("/chapters", ctrl.getChapters);
router.post("/chapters", ctrl.postChapter);
router.patch("/chapters/:id", ctrl.patchChapter);
router.delete("/chapters/:id", ctrl.deleteChapter);

router.get("/topics", ctrl.getTopics);
router.post("/topics", ctrl.postTopic);
router.patch("/topics/:id", ctrl.patchTopic);
router.delete("/topics/:id", ctrl.deleteTopic);

router.get("/categories", ctrl.getCategories);
router.post("/categories", ctrl.postCategory);
router.patch("/categories/:id", ctrl.patchCategory);
router.delete("/categories/:id", ctrl.deleteCategory);

router.get("/sources", ctrl.getSources);
router.get("/tags", ctrl.getTags);

router.post("/upload", upload.fields([{ name: "files", maxCount: 50 }]), ctrl.uploadSingle);
router.post("/bulk-upload", upload.fields([{ name: "files", maxCount: 50 }]), ctrl.uploadBulk);
router.post("/retry", ctrl.retryKnowledge);
router.post("/archive", ctrl.archiveKnowledge);
router.post("/bulk", ctrl.bulkKnowledge);

router.get("/", ctrl.listKnowledge);
router.get("/:id", ctrl.getKnowledge);
router.patch("/:id", ctrl.patchKnowledge);
router.delete("/:id", ctrl.deleteKnowledge);

export default router;
