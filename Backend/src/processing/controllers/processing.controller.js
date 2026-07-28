import { z } from "zod";
import * as orchestrator from "../services/orchestrator.service.js";

function handleError(res, err, fallback = "Request failed") {
  const status = err?.statusCode || (err?.name === "ZodError" ? 400 : 500);
  const message =
    err?.name === "ZodError"
      ? err.issues?.map((e) => e.message).join("; ") || "Validation failed"
      : err?.message || fallback;
  if (status >= 500) console.error("[processing]", err);
  return res.status(status).json({ success: false, message });
}

const idParam = z.string().regex(/^[a-f\d]{24}$/i);

export async function startProcessing(req, res) {
  try {
    const documentId = idParam.parse(req.params.documentId);
    const force = Boolean(req.body?.force);
    const data = await orchestrator.startProcessing(documentId, { force });
    return res.status(202).json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to start processing");
  }
}

export async function retryProcessing(req, res) {
  try {
    const documentId = idParam.parse(req.params.documentId);
    const fromStage = req.body?.fromStage;
    const data = await orchestrator.retryProcessing(documentId, { fromStage });
    return res.status(202).json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to retry processing");
  }
}

export async function getStatus(req, res) {
  try {
    const documentId = idParam.parse(req.params.documentId);
    const data = await orchestrator.getProcessingStatus(documentId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to get status");
  }
}

export async function getLogs(req, res) {
  try {
    const documentId = idParam.parse(req.params.documentId);
    const data = await orchestrator.getProcessingLogs(documentId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to get logs");
  }
}

export async function getErrors(req, res) {
  try {
    const documentId = idParam.parse(req.params.documentId);
    const data = await orchestrator.getProcessingErrors(documentId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to get errors");
  }
}

export async function getDashboard(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const status = req.query.status || undefined;
    const data = await orchestrator.getProcessingDashboard({ page, limit, status });
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err, "Failed to load dashboard");
  }
}
