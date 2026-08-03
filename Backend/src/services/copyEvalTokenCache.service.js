/**
 * Token-saving caches for copy evaluation.
 *
 * Same PDF re-upload  → OCR / full-eval cache (skip vision LLM calls)
 * Same question text  → shared model_answer from memory OR previous DB evals
 */

import crypto from "crypto";
import { cacheGet, cacheSet } from "../ai/cache.service.js";
import { reconcileUsage } from "../ai/tokenOptimization.service.js";

const TTL = {
  ocr: Number(process.env.COPY_EVAL_OCR_CACHE_TTL_MS) || 6 * 60 * 60 * 1000,
  kb: Number(process.env.COPY_EVAL_KB_CACHE_TTL_MS) || 24 * 60 * 60 * 1000,
  modelAnswer:
    Number(process.env.COPY_EVAL_MODEL_ANSWER_CACHE_TTL_MS) || 24 * 60 * 60 * 1000,
  fullEval:
    Number(process.env.COPY_EVAL_FULL_CACHE_TTL_MS) || 2 * 60 * 60 * 1000,
};

const FULL_CACHE_ENABLED =
  String(process.env.COPY_EVAL_REUSE_FULL_EVAL || "true").toLowerCase() !==
  "false";

const SHARED_MODEL_ANSWER_ENABLED =
  String(process.env.COPY_EVAL_REUSE_MODEL_ANSWER || "true").toLowerCase() !==
  "false";

export function hashPages(pages = []) {
  const h = crypto.createHash("sha256");
  for (const page of pages) {
    h.update(String(page?.mimeType || "image/jpeg"));
    h.update("|");
    h.update(String(page?.base64 || page?.dataUrl || "").slice(0, 200000));
    h.update("|");
    h.update(String((page?.base64 || page?.dataUrl || "").length));
  }
  return h.digest("hex");
}

export function normalizeQuestionText(questionText = "") {
  return String(questionText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\u0900-\u097F\s]/g, "")
    .trim()
    .slice(0, 800);
}

export function fingerprintQuestion(questionText = "", subject = "") {
  const norm = normalizeQuestionText(questionText);
  if (norm.length < 24) return "";
  const sub = String(subject || "").toLowerCase().trim();
  return crypto
    .createHash("sha256")
    .update(`${sub}::${norm}`)
    .digest("hex")
    .slice(0, 32);
}

function fullEvalKey(pagesHash, maxMarks, feedbackLanguage) {
  return `${pagesHash}:${maxMarks}:${feedbackLanguage || "en"}`;
}

export function getCachedOcr(pagesHash) {
  return cacheGet("copyOcr", pagesHash);
}

export function setCachedOcr(pagesHash, ocr) {
  if (!pagesHash || !ocr?.fullTranscript?.trim()) return;
  cacheSet("copyOcr", pagesHash, ocr, TTL.ocr);
}

export function getCachedKb(questionFp) {
  return cacheGet("copyKb", questionFp);
}

export function setCachedKb(questionFp, kb) {
  if (!questionFp || !kb?.contextText?.trim()) return;
  cacheSet("copyKb", questionFp, kb, TTL.kb);
}

export function getCachedModelAnswer(questionFp) {
  return cacheGet("copyModelAnswer", questionFp);
}

export function setCachedModelAnswer(questionFp, modelAnswer) {
  const text = String(modelAnswer || "").trim();
  if (!questionFp || text.length < 40) return;
  cacheSet("copyModelAnswer", questionFp, text, TTL.modelAnswer);
}

/**
 * Resolve shared model answer for the same UPSC question.
 * Memory first, then any prior completed CopyEvaluation in MongoDB (any student).
 */
export async function resolveSharedModelAnswer({
  questionText = "",
  subject = "",
  feedbackLanguage = "en",
} = {}) {
  if (!SHARED_MODEL_ANSWER_ENABLED) {
    return { text: "", questionFp: "", source: null };
  }

  const questionFp = fingerprintQuestion(questionText, subject);
  if (!questionFp) {
    return { text: "", questionFp: "", source: null };
  }

  const mem = String(getCachedModelAnswer(questionFp) || "").trim();
  if (mem.length >= 40) {
    return { text: mem, questionFp, source: "memory" };
  }

  try {
    const { default: CopyEvaluation } = await import(
      "../models/CopyEvaluation.js"
    );
    const lang =
      String(feedbackLanguage || "en").toLowerCase() === "hi" ? "hi" : "en";

    const pickText = (doc) =>
      String(
        doc?.visionResult?.model_answer ||
          doc?.evaluationResultJson?.model_answer ||
          ""
      ).trim();

    // 1) Same fingerprint + same feedback language
    let doc = await CopyEvaluation.findOne({
      status: "completed",
      questionFingerprint: questionFp,
      "visionResult.model_answer": { $exists: true, $nin: [null, ""] },
      $or: [
        { "visionResult.feedbackLanguage": lang },
        { "visionResult.answerLanguage": lang },
      ],
    })
      .sort({ createdAt: -1 })
      .select("visionResult.model_answer evaluationResultJson.model_answer")
      .lean();

    let text = pickText(doc);

    // 2) Same fingerprint, any language
    if (text.length < 40) {
      doc = await CopyEvaluation.findOne({
        status: "completed",
        questionFingerprint: questionFp,
        "visionResult.model_answer": { $exists: true, $nin: [null, ""] },
      })
        .sort({ createdAt: -1 })
        .select("visionResult.model_answer evaluationResultJson.model_answer")
        .lean();
      text = pickText(doc);
    }

    // 3) Legacy rows without fingerprint — match question text snippet
    if (text.length < 40 && String(questionText || "").trim().length >= 40) {
      const snippet = String(questionText)
        .trim()
        .slice(0, 72)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      doc = await CopyEvaluation.findOne({
        status: "completed",
        "visionResult.questionText": { $regex: snippet, $options: "i" },
        "visionResult.model_answer": { $exists: true, $nin: [null, ""] },
      })
        .sort({ createdAt: -1 })
        .select("visionResult.model_answer evaluationResultJson.model_answer")
        .lean();
      text = pickText(doc);
    }

    if (text.length >= 40) {
      setCachedModelAnswer(questionFp, text);
      return { text, questionFp, source: "database" };
    }
  } catch (err) {
    console.warn("⚠️ Shared model_answer lookup failed:", err.message);
  }

  return { text: "", questionFp, source: null };
}

export function getCachedFullEval(pagesHash, maxMarks, feedbackLanguage) {
  if (!FULL_CACHE_ENABLED || !pagesHash) return null;
  return cacheGet(
    "copyEvalFull",
    fullEvalKey(pagesHash, maxMarks, feedbackLanguage)
  );
}

export function setCachedFullEval(
  pagesHash,
  maxMarks,
  feedbackLanguage,
  payload
) {
  if (!FULL_CACHE_ENABLED || !pagesHash || !payload?.success) return;
  cacheSet(
    "copyEvalFull",
    fullEvalKey(pagesHash, maxMarks, feedbackLanguage),
    payload,
    TTL.fullEval
  );
}

/** Rough token estimate for analytics when a vision call is skipped */
export function recordCacheTokenSavings(kind, estimatedTokens = 3500) {
  reconcileUsage({
    estimatedTokens,
    actualTokens: 0,
    estimatedCost: estimatedTokens * 0.0000001,
    actualCost: 0,
  });
  console.log(
    `♻️ Copy-eval cache HIT (${kind}) — ~${estimatedTokens} tokens saved vs fresh call`
  );
}

export default {
  hashPages,
  fingerprintQuestion,
  normalizeQuestionText,
  getCachedOcr,
  setCachedOcr,
  getCachedKb,
  setCachedKb,
  getCachedModelAnswer,
  setCachedModelAnswer,
  resolveSharedModelAnswer,
  getCachedFullEval,
  setCachedFullEval,
  recordCacheTokenSavings,
};
