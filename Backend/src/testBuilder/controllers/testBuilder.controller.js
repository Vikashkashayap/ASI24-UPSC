import { z } from "zod";
import * as service from "../services/testBuilder.service.js";

function handleError(res, err, fallback = "Request failed") {
  const status = err?.statusCode || (err?.name === "ZodError" ? 400 : 500);
  const message =
    err?.name === "ZodError"
      ? err.issues?.map((e) => e.message).join("; ") || "Validation failed"
      : err?.message || fallback;
  if (status >= 500) console.error("[test-builder]", err);
  return res.status(status).json({ success: false, message });
}

function userId(req) {
  return req.user?._id || req.user?.id || null;
}

export async function createFromSession(req, res) {
  try {
    const body = z
      .object({
        sessionId: z.string().regex(/^[a-f\d]{24}$/i),
        title: z.string().trim().optional(),
        durationMinutes: z.coerce.number().int().min(5).max(300).optional().default(60),
        totalMarks: z.coerce.number().min(1).max(500).optional().default(100),
        negativeMark: z.coerce.number().min(0).max(2).optional().default(0.66),
        difficulty: z.string().optional(),
        maxQuestions: z.coerce.number().int().min(1).max(100).optional(),
      })
      .parse(req.body);

    const data = await service.createTestFromSession({
      ...body,
      createdBy: userId(req),
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to create test from session");
  }
}

export async function buildAndCreate(req, res) {
  try {
    const body = z
      .object({
        subject: z.string().trim().optional().default(""),
        topic: z.string().trim().optional().default(""),
        chapter: z.string().trim().optional().default(""),
        query: z.string().trim().optional().default(""),
        count: z.coerce.number().int().min(1).max(100).optional().default(10),
        title: z.string().trim().optional(),
        durationMinutes: z.coerce.number().int().min(5).max(300).optional().default(60),
        totalMarks: z.coerce.number().optional().default(100),
        negativeMark: z.coerce.number().optional().default(0.66),
        difficulty: z.string().optional().default("moderate"),
        allowGeneration: z.boolean().optional().default(true),
        preferExtracted: z.boolean().optional().default(true),
        async: z.boolean().optional().default(false),
      })
      .parse(req.body);

    if (!body.subject && !body.topic && !body.query) {
      return res.status(400).json({
        success: false,
        message: "Provide subject, topic, or query",
      });
    }

    // Topic Practice: async whenever count is large enough for progress UI
    const useAsync =
      body.async === true ||
      body.count === 50 ||
      body.count === 100 ||
      Number(body.count) >= 20;

    if (useAsync) {
      const data = await service.startBuildAndCreateTest(body, userId(req));
      return res.status(202).json({ success: true, data });
    }

    const data = await service.buildAndCreateTest(body, userId(req));
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to build and create test");
  }
}

export async function listTests(req, res) {
  try {
    const data = await service.listBuilderTests({
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    });
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getDashboard(req, res) {
  try {
    const stats = await service.getBuilderStats();
    const recent = await service.listBuilderTests({ page: 1, limit: 8 });
    return res.json({ success: true, data: { stats, recent: recent.items } });
  } catch (err) {
    return handleError(res, err);
  }
}
