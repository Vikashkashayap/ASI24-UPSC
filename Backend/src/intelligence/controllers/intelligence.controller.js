import { z } from "zod";
import * as search from "../services/hybridSearch.service.js";
import * as orch from "../services/orchestrator.service.js";

function handleError(res, err, fallback = "Request failed") {
  const status = err?.statusCode || (err?.name === "ZodError" ? 400 : 500);
  const message =
    err?.name === "ZodError"
      ? err.issues?.map((e) => e.message).join("; ") || "Validation failed"
      : err?.message || fallback;
  if (status >= 500) console.error("[intelligence]", err);
  return res.status(status).json({ success: false, message });
}

const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  topK: z.coerce.number().int().min(1).max(50).optional().default(10),
  filters: z
    .object({
      subject: z.string().optional(),
      chapter: z.string().optional(),
      topic: z.string().optional(),
      difficulty: z.string().optional(),
      language: z.string().optional(),
      source: z.string().optional(),
      year: z.coerce.number().optional(),
      category: z.string().optional(),
      documentId: z.string().optional(),
    })
    .optional()
    .default({}),
  topic: z.string().optional(),
});

function userId(req) {
  return req.user?._id || req.user?.id || null;
}

export async function postSearch(req, res) {
  try {
    const body = searchBodySchema.parse(req.body);
    const data = await search.hybridSearch({ ...body, userId: userId(req) });
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSearchTopic(req, res) {
  try {
    const body = searchBodySchema.parse(req.body);
    const data = await search.searchTopic(body, userId(req));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSearchQuestion(req, res) {
  try {
    const body = searchBodySchema.parse(req.body);
    const data = await search.searchQuestion(body, userId(req));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSearchConcept(req, res) {
  try {
    const body = searchBodySchema.parse(req.body);
    const data = await search.searchConcept(body, userId(req));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSearchSimilar(req, res) {
  try {
    const body = searchBodySchema.parse(req.body);
    const data = await search.searchSimilar(body, userId(req));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getSearchHistory(req, res) {
  try {
    const data = await orch.getSearchHistory(userId(req), Number(req.query.limit || 50));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getDashboard(req, res) {
  try {
    const data = await orch.getIntelligenceDashboard({
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      status: req.query.status || undefined,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postReindex(req, res) {
  try {
    const documentId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.documentId);
    const data = await orch.reindexDocument(documentId);
    return res.status(202).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postRetryFailed(req, res) {
  try {
    const documentId = req.body?.documentId || req.params?.documentId;
    const data = await orch.retryFailed(documentId || undefined);
    return res.status(202).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postSyncNow(req, res) {
  try {
    const processedDocumentId = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(req.body.processedDocumentId);
    const data = await orch.syncNow(processedDocumentId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}
