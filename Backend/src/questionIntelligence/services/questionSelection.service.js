import ExtractedQuestion from "../../processing/models/ExtractedQuestion.js";
import { analyzePatterns, preferredPatternsForTopic } from "./patternAnalysis.service.js";
import { removeDuplicates } from "./duplicateRemoval.service.js";
import { balanceByDifficulty, inferDifficulty } from "./difficultyBalance.service.js";

/**
 * Load extracted (bank) questions for subject/topic and score them.
 */
export async function loadBankCandidates({
  subject,
  topic,
  chapter,
  limit = 80,
} = {}) {
  const filter = { isDuplicate: { $ne: true } };
  if (subject) filter.subject = new RegExp(escapeRegex(subject), "i");
  if (topic) {
    filter.$or = [
      { topic: new RegExp(escapeRegex(topic), "i") },
      { questionText: new RegExp(escapeRegex(topic), "i") },
    ];
  }
  if (chapter) filter.chapter = new RegExp(escapeRegex(chapter), "i");

  const rows = await ExtractedQuestion.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const preferred = preferredPatternsForTopic(topic || subject);
  const withPatterns = analyzePatterns(rows).questions;

  return withPatterns.map((q, idx) => {
    const patternBonus = preferred.includes(q.pattern) ? 0.15 : 0;
    const hasAnswer = q.correctAnswer ? 0.1 : 0;
    const hasExpl = q.explanation ? 0.05 : 0;
    const hasOptions = (q.options?.length || 0) >= 4 ? 0.1 : 0;
    return {
      ...q,
      _uid: String(q._id),
      sourceType: "extracted",
      sourceId: q._id,
      difficulty: inferDifficulty(q),
      rankScore: 1 - idx * 0.005 + patternBonus + hasAnswer + hasExpl + hasOptions,
    };
  });
}

/**
 * Select from bank with dedupe + difficulty balance.
 */
export function selectFromBank(candidates, { count = 10, difficultyMix } = {}) {
  const deduped = removeDuplicates(candidates);
  const balanced = balanceByDifficulty(deduped.questions, count, difficultyMix);
  return {
    questions: balanced.questions,
    duplicatesRemoved: deduped.duplicatesRemoved,
    difficultyTargets: balanced.targets,
    difficultyActual: balanced.actual,
    patterns: analyzePatterns(balanced.questions).counts,
  };
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
