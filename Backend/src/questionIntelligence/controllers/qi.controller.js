import { z } from "zod";
import * as orch from "../services/orchestrator.service.js";

function handleError(res, err, fallback = "Request failed") {
  const status = err?.statusCode || err?.status || (err?.name === "ZodError" ? 400 : 500);
  const message =
    err?.name === "ZodError"
      ? err.issues?.map((e) => e.message).join("; ") || "Validation failed"
      : err?.message || fallback;
  if (status >= 500) console.error("[qi]", err);
  return res.status(status).json({ success: false, message });
}

const buildSchema = z.object({
  subject: z.string().trim().optional().default(""),
  topic: z.string().trim().optional().default(""),
  chapter: z.string().trim().optional().default(""),
  query: z.string().trim().optional().default(""),
  count: z.coerce.number().int().min(1).max(100).optional().default(10),
  difficulty: z.string().optional().default("medium"),
  difficultyMix: z
    .object({
      Easy: z.number().optional(),
      Medium: z.number().optional(),
      Hard: z.number().optional(),
    })
    .optional(),
  allowGeneration: z.boolean().optional().default(true),
  preferExtracted: z.boolean().optional().default(true),
  topK: z.coerce.number().int().min(3).max(30).optional().default(12),
});

export async function buildSet(req, res) {
  try {
    const body = buildSchema.parse(req.body || {});
    if (!body.subject && !body.topic && !body.query) {
      return res.status(400).json({
        success: false,
        message: "Provide subject, topic, or query",
      });
    }
    const userId = req.user?._id || req.user?.id || null;
    const data = await orch.buildQuestionSet(body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to build question set");
  }
}

export async function getSession(req, res) {
  try {
    const id = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    const data = await orch.getSession(id);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function listSessions(req, res) {
  try {
    const data = await orch.listSessions({
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      subject: req.query.subject || undefined,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getDashboard(req, res) {
  try {
    const data = await orch.getDashboardStats();
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}
