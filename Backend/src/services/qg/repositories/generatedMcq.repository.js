/**
 * Mongo repository for enterprise-generated MCQs (extends GeneratedQuestion).
 */

import GeneratedQuestion, { buildQuestionCacheKey } from "../../../rag/models/GeneratedQuestion.js";

export async function saveGeneratedSet({
  subject,
  topic,
  difficulty,
  count,
  questions,
  meta = {},
}) {
  const cacheKey = buildQuestionCacheKey({ subject, topic, difficulty, count });
  const doc = await GeneratedQuestion.findOneAndUpdate(
    { cacheKey },
    {
      $set: {
        cacheKey,
        subject: subject || "",
        topic: topic || "",
        difficulty: difficulty || "Medium",
        count: questions.length,
        questions,
        retrievalSource: meta.retrievalSource || "",
        matchedChunks: meta.matchedChunks || 0,
        avgSimilarity: meta.avgSimilarity ?? null,
        createdBy: meta.createdBy || undefined,
        llmMs: meta.llmMs ?? null,
        fromCache: false,
        pipelineMeta: meta.pipelineMeta || undefined,
      },
    },
    { upsert: true, new: true }
  );
  return doc;
}

export async function findCachedSet({ subject, topic, difficulty, count }) {
  const cacheKey = buildQuestionCacheKey({ subject, topic, difficulty, count });
  return GeneratedQuestion.findOne({ cacheKey }).lean();
}

export { buildQuestionCacheKey };
export default { saveGeneratedSet, findCachedSet, buildQuestionCacheKey };
