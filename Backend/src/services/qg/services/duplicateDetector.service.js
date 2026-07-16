/**
 * Duplicate detection against MongoDB before/after generation.
 */

import crypto from "crypto";
import AssignedPracticeTest from "../../../models/AssignedPracticeTest.js";
import GeneratedQuestion from "../../../rag/models/GeneratedQuestion.js";
import { QG_CONFIG } from "../config/qg.config.js";

export function questionFingerprint(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .trim()
    .slice(0, 160);
}

export function fingerprintHash(text) {
  return crypto.createHash("sha1").update(questionFingerprint(text)).digest("hex");
}

function tokenSet(text) {
  return new Set(
    questionFingerprint(text)
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

/** Jaccard similarity on token sets. */
export function stemSimilarity(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Search recent GeneratedQuestion + AssignedPracticeTest for near-duplicates.
 * @returns {Promise<{ isDuplicate: boolean, match?: object, similarity: number }>}
 */
export async function findSimilarQuestion({
  questionText,
  subject = "",
  topic = "",
  threshold,
} = {}) {
  const text = String(questionText || "").trim();
  if (text.length < 20) return { isDuplicate: false, similarity: 0 };

  const thr = threshold ?? QG_CONFIG.quality.duplicateSimilarityThreshold;
  const fp = questionFingerprint(text);
  const subjectFilter = subject ? { subject: new RegExp(`^${escapeRegex(subject)}$`, "i") } : {};

  const [cachedSets, practiceDocs] = await Promise.all([
    GeneratedQuestion.find({
      ...subjectFilter,
      ...(topic ? { topic: new RegExp(escapeRegex(topic), "i") } : {}),
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .select("questions subject topic")
      .lean(),
    AssignedPracticeTest.find({
      ...(subject ? { subject: new RegExp(`^${escapeRegex(subject)}$`, "i") } : {}),
      status: { $in: ["ready", "approved", "assigned", "generating", "draft"] },
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("questions subject topicName")
      .lean(),
  ]);

  let best = { similarity: 0, match: null };

  const consider = (q, meta) => {
    const other = q.question_en || q.question || "";
    const sim = stemSimilarity(fp, other);
    if (sim > best.similarity) {
      best = {
        similarity: sim,
        match: {
          question: String(other).slice(0, 200),
          subject: meta.subject,
          topic: meta.topic,
          source: meta.source,
        },
      };
    }
  };

  for (const doc of cachedSets) {
    for (const q of doc.questions || []) {
      consider(q, { subject: doc.subject, topic: doc.topic, source: "generatedquestions" });
    }
  }
  for (const doc of practiceDocs) {
    for (const q of doc.questions || []) {
      consider(q, {
        subject: doc.subject,
        topic: doc.topicName,
        source: "assignedpracticetests",
      });
    }
  }

  return {
    isDuplicate: best.similarity >= thr,
    similarity: best.similarity,
    match: best.match,
    threshold: thr,
  };
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default { findSimilarQuestion, questionFingerprint, fingerprintHash, stemSimilarity };
