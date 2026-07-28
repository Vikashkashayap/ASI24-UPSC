import { removeDuplicates } from "./duplicateRemoval.service.js";
import { inferDifficulty } from "./difficultyBalance.service.js";
import { detectPattern } from "./patternAnalysis.service.js";

/**
 * AI generation ONLY when bank selection is insufficient.
 * - QG_ENTERPRISE_PIPELINE=false → cheap single-call Flash-Lite path (₹1–2 / 50Q target)
 * - QG_ENTERPRISE_PIPELINE=true  → verify/explain pipeline (higher cost, higher accuracy)
 */
export async function generateIfRequired({
  shortfall,
  contextText,
  sources = [],
  subject,
  topic,
  chapter,
  difficulty = "medium",
  allowGeneration = true,
  practiceMode = true,
} = {}) {
  const need = Math.max(0, Number(shortfall) || 0);
  if (!need) {
    return { triggered: false, questions: [], reason: "bank_sufficient" };
  }
  if (!allowGeneration) {
    return { triggered: false, questions: [], reason: "generation_disabled" };
  }
  if (!contextText || String(contextText).trim().length < 80) {
    return {
      triggered: false,
      questions: [],
      reason: "insufficient_context",
      message: "Not enough ranked knowledge context to generate safely",
    };
  }

  const useEnterprise = process.env.QG_ENTERPRISE_PIPELINE !== "false";
  const diff =
    difficulty === "medium" || difficulty === "moderate"
      ? "moderate"
      : String(difficulty || "moderate").toLowerCase();

  try {
    let raw = [];
    let pipelineMeta = { enterprise: useEnterprise };

    if (useEnterprise) {
      const { generateVerifiedFromContext } = await import("../../services/qg/index.js");
      const chunks = sources.map((s) => ({
        id: s.chunkId,
        text: s.excerpt,
        subject: s.subject,
        topic: s.topic,
        score: s.score,
      }));
      const result = await generateVerifiedFromContext({
        contextText,
        chunks,
        subject: subject || "",
        topic: topic || subject || "UPSC",
        chapter: chapter || "",
        difficulty,
        batchSize: need,
        retrievalSource: "knowledge_intelligence",
        practiceMode: practiceMode !== false,
      });
      raw = (result.questions || []).map((q, i) => mapQiQuestion(q, i, { subject, topic, chapter }));
      pipelineMeta = {
        enterprise: true,
        insufficient: result.insufficient,
        matchedChunks: result.matchedChunks,
        message: result.message,
        durationMs: result.durationMs,
      };
    } else {
      // Cheap path: one Flash-Lite gen call per batch, no per-Q verify/explain
      const { generateQuestionsFromContextBatch } = await import(
        "../../services/ai/questionGenerator.service.js"
      );
      const batchSize = Math.min(
        need,
        Math.max(5, parseInt(process.env.QG_MAX_QUESTIONS_PER_CALL, 10) || 10)
      );
      const collected = [];
      let round = 0;
      while (collected.length < need && round < Math.ceil(need / batchSize) + 2) {
        const ask = Math.min(batchSize, need - collected.length + 2);
        const result = await generateQuestionsFromContextBatch({
          contextText,
          topic: topic || subject || "UPSC",
          difficulty: diff,
          batchSize: ask,
          batchIndex: round,
          subject: subject || "",
          chapter: chapter || "",
          ragOptimized: true,
          openKnowledge: false,
        });
        if (!result?.questions?.length) break;
        for (const q of result.questions) {
          collected.push(
            mapQiQuestion(
              {
                ...q,
                question: q.question_en || q.question,
                question_en: q.question_en || q.question,
                explanation: q.explanation_en || q.explanation,
                explanation_en: q.explanation_en || q.explanation,
                answer: q.correctAnswer || q.answer,
                correctAnswer: q.correctAnswer || q.answer,
              },
              collected.length,
              { subject, topic, chapter }
            )
          );
        }
        round += 1;
        if (result.enterpriseQg) break; // shouldn't happen when env=false
      }
      raw = collected;
      pipelineMeta = {
        enterprise: false,
        batches: round,
        message: "cheap_flash_lite_path",
      };
      console.log(
        `[qi.generation] cheap path: need=${need} got=${raw.length} batches=${round} (QG_ENTERPRISE_PIPELINE=false)`
      );
    }

    const deduped = removeDuplicates(raw);
    return {
      triggered: true,
      questions: deduped.questions.slice(0, need),
      reason: "generated",
      pipeline: pipelineMeta,
    };
  } catch (err) {
    console.error("[qi.generation]", err?.message || err);
    return {
      triggered: true,
      questions: [],
      reason: "generation_failed",
      message: err?.message || "Generation failed",
    };
  }
}

function mapQiQuestion(q, i, { subject, topic, chapter }) {
  const questionText = q.question_en || q.question || q.questionText || "";
  const options = normalizeOptions(q);
  const pattern = detectPattern(questionText);
  return {
    questionText,
    options,
    correctAnswer: String(q.answer || q.correctAnswer || "").toUpperCase().slice(0, 1),
    explanation: q.explanation_en || q.explanation || "",
    difficulty: inferDifficulty({ ...q, pattern: pattern.id, questionText }),
    subject: subject || "",
    topic: topic || "",
    chapter: chapter || "",
    sourceType: "generated",
    sourceId: null,
    pattern: pattern.id,
    confidence: q.confidence ?? q.qualityScore ?? q.overallAiConfidence ?? null,
    rankScore: 0.5 - i * 0.01,
    _uid: `gen-${i}-${Date.now()}`,
  };
}

function normalizeOptions(q) {
  if (Array.isArray(q.options) && q.options[0]?.label) {
    return q.options.map((o) => ({
      label: String(o.label).toUpperCase(),
      text: o.text || o.option || "",
      isCorrect:
        Boolean(o.isCorrect) ||
        String(o.label).toUpperCase() === String(q.answer || q.correctAnswer || "").toUpperCase(),
    }));
  }
  if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
    return ["A", "B", "C", "D"].map((label) => ({
      label,
      text: q.options[label] || q.options[label.toLowerCase()] || "",
      isCorrect: label === String(q.answer || q.correctAnswer || "").toUpperCase(),
    }));
  }
  if (Array.isArray(q.options)) {
    return q.options.slice(0, 4).map((text, i) => {
      const label = String.fromCharCode(65 + i);
      return {
        label,
        text: typeof text === "string" ? text : text?.text || "",
        isCorrect: label === String(q.answer || q.correctAnswer || "").toUpperCase(),
      };
    });
  }
  return [];
}
