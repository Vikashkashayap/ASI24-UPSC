import {
  uploadKnowledgeFiles,
  retryDocumentUpload,
  removeDocument,
} from "../services/upload.service.js";
import {
  listDocuments,
  getDocument,
  updateDocument,
  archiveDocuments,
  bulkAction,
  getDashboardStats,
} from "../services/document.service.js";
import * as taxonomy from "../services/taxonomy.service.js";
import { ensureKnowledgeTaxonomySeeded } from "../seed/seedTaxonomy.js";

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function handleError(res, err, fallback = "Request failed") {
  const status = err?.statusCode || (err?.name === "ZodError" ? 400 : 500);
  const zodIssues = err?.issues || err?.errors;
  const message =
    err?.name === "ZodError"
      ? (Array.isArray(zodIssues) ? zodIssues.map((e) => e.message).join("; ") : null) ||
        "Validation failed"
      : err?.message || fallback;
  if (status >= 500) console.error("[knowledge]", err);
  return res.status(status).json({ success: false, message, errors: zodIssues });
}

export async function seedAndDashboard(req, res) {
  try {
    await ensureKnowledgeTaxonomySeeded();
    const data = await getDashboardStats();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to load dashboard");
  }
}

export async function uploadSingle(req, res) {
  try {
    const files = req.files?.files || (req.file ? [req.file] : []);
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const result = await uploadKnowledgeFiles({
      files,
      rawMeta: req.body,
      userId: getUserId(req),
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err, "Upload failed");
  }
}

export async function uploadBulk(req, res) {
  try {
    const files = req.files?.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const result = await uploadKnowledgeFiles({
      files,
      rawMeta: req.body,
      userId: getUserId(req),
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err, "Bulk upload failed");
  }
}

export async function listKnowledge(req, res) {
  try {
    const data = await listDocuments(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to list documents");
  }
}

export async function getKnowledge(req, res) {
  try {
    const data = await getDocument(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to get document");
  }
}

export async function patchKnowledge(req, res) {
  try {
    const data = await updateDocument(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to update document");
  }
}

export async function deleteKnowledge(req, res) {
  try {
    await removeDocument(req.params.id);
    return res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    return handleError(res, err, "Failed to delete document");
  }
}

export async function retryKnowledge(req, res) {
  try {
    const ids = req.body?.ids || (req.body?.id ? [req.body.id] : []);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "id or ids required" });
    }
    const items = [];
    for (const id of ids) {
      items.push(await retryDocumentUpload(id));
    }
    return res.json({ success: true, data: { items } });
  } catch (err) {
    return handleError(res, err, "Retry failed");
  }
}

export async function archiveKnowledge(req, res) {
  try {
    const ids = req.body?.ids || (req.body?.id ? [req.body.id] : []);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "id or ids required" });
    }
    const data = await archiveDocuments(ids);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Archive failed");
  }
}

export async function bulkKnowledge(req, res) {
  try {
    const data = await bulkAction(req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Bulk action failed");
  }
}

/* ---- Taxonomy ---- */

export async function getSubjects(_req, res) {
  try {
    const data = await taxonomy.listSubjects();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSubject(req, res) {
  try {
    const data = await taxonomy.createSubject(req.body, getUserId(req));
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function patchSubject(req, res) {
  try {
    const data = await taxonomy.updateSubject(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function deleteSubject(req, res) {
  try {
    await taxonomy.deleteSubject(req.params.id);
    return res.json({ success: true, message: "Subject deleted" });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getChapters(req, res) {
  try {
    const data = await taxonomy.listChapters(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postChapter(req, res) {
  try {
    const data = await taxonomy.createChapter(req.body, getUserId(req));
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function patchChapter(req, res) {
  try {
    const data = await taxonomy.updateChapter(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function deleteChapter(req, res) {
  try {
    await taxonomy.deleteChapter(req.params.id);
    return res.json({ success: true, message: "Chapter deleted" });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getTopics(req, res) {
  try {
    const data = await taxonomy.listTopics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postTopic(req, res) {
  try {
    const data = await taxonomy.createTopic(req.body, getUserId(req));
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function patchTopic(req, res) {
  try {
    const data = await taxonomy.updateTopic(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function deleteTopic(req, res) {
  try {
    await taxonomy.deleteTopic(req.params.id);
    return res.json({ success: true, message: "Topic deleted" });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getCategories(_req, res) {
  try {
    const data = await taxonomy.listCategories();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postCategory(req, res) {
  try {
    const data = await taxonomy.createCategory(req.body, getUserId(req));
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function patchCategory(req, res) {
  try {
    const data = await taxonomy.updateCategory(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function deleteCategory(req, res) {
  try {
    await taxonomy.deleteCategory(req.params.id);
    return res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getSources(_req, res) {
  try {
    const data = await taxonomy.listSources();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getTags(_req, res) {
  try {
    const data = await taxonomy.listTags();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}
