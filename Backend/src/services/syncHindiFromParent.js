/**
 * Copy stored Hindi from parent mock/practice into in-progress Test attempts (no LLM).
 */
import AssignedPracticeTest from "../models/AssignedPracticeTest.js";
import PrelimsMock from "../models/PrelimsMock.js";
import { hasStoredHindiContent } from "./bilingualQuestionStorage.js";
import { pickBilingualQuestionFields } from "./questionTranslationService.js";

function mergeHindiFields(attemptQ, sourceQ) {
  const src = pickBilingualQuestionFields(sourceQ);
  const plain = typeof attemptQ.toObject === "function" ? attemptQ.toObject() : { ...attemptQ };
  return pickBilingualQuestionFields({
    ...plain,
    question_hi: plain.question_hi || src.question_hi,
    options_hi: {
      A: plain.options_hi?.A || src.options_hi?.A || "",
      B: plain.options_hi?.B || src.options_hi?.B || "",
      C: plain.options_hi?.C || src.options_hi?.C || "",
      D: plain.options_hi?.D || src.options_hi?.D || "",
    },
    explanation_hi: plain.explanation_hi || src.explanation_hi,
    matchColumns_hi: plain.matchColumns_hi || src.matchColumns_hi,
  });
}

function questionNeedsHindiFromParent(attemptQ, sourceQ) {
  if (!sourceQ) return false;
  const plain = typeof attemptQ.toObject === "function" ? attemptQ.toObject() : attemptQ;
  const src = pickBilingualQuestionFields(sourceQ);
  if (!String(plain.question_hi || "").trim() && String(src.question_hi || "").trim()) return true;
  if (!plain.explanation_hi && src.explanation_hi) return true;
  for (const key of ["A", "B", "C", "D"]) {
    if (!String(plain.options_hi?.[key] || "").trim() && String(src.options_hi?.[key] || "").trim()) {
      return true;
    }
  }
  return false;
}

/** If attempt questions lack Hindi but parent has it, copy once and save (including submitted tests for review). */
export async function ensureAttemptHasHindiFromParent(testDoc) {
  if (!testDoc?.questions?.length) return false;

  let parent = null;
  if (testDoc.assignedPracticeTestId) {
    parent = await AssignedPracticeTest.findById(testDoc.assignedPracticeTestId).lean();
  } else if (testDoc.prelimsMockId) {
    parent = await PrelimsMock.findById(testDoc.prelimsMockId).lean();
  }
  if (!parent?.questions?.length) return false;

  let changed = false;
  testDoc.questions = testDoc.questions.map((q, i) => {
    const source = parent.questions[i];
    if (!source || !questionNeedsHindiFromParent(q, source) || !hasStoredHindiContent(source)) return q;
    changed = true;
    return mergeHindiFields(q, source);
  });

  if (changed) {
    testDoc.markModified("questions");
    await testDoc.save();
  }
  return changed;
}
