/**
 * Convert Question Intelligence questions → AssignedPracticeTest question shape.
 */

import { removeDuplicates } from "../../questionIntelligence/services/duplicateRemoval.service.js";

function optionsToMap(options = [], correctAnswer = "") {
  const map = { A: "", B: "", C: "", D: "" };
  const ans = String(correctAnswer || "")
    .toUpperCase()
    .replace(/[^A-D]/g, "")
    .charAt(0);

  for (const o of options || []) {
    const label = String(o.label || "")
      .toUpperCase()
      .charAt(0);
    if (["A", "B", "C", "D"].includes(label)) {
      map[label] = String(o.text || "").trim();
    }
  }

  // If labels missing, fill sequentially
  if (!map.A && !map.B && Array.isArray(options) && options.length) {
    options.slice(0, 4).forEach((o, i) => {
      const label = String.fromCharCode(65 + i);
      map[label] = String(o.text || o || "").trim();
    });
  }

  // Mark correct from isCorrect if answer missing
  let answer = ans;
  if (!answer) {
    const hit = (options || []).find((o) => o.isCorrect);
    if (hit) {
      answer = String(hit.label || "")
        .toUpperCase()
        .charAt(0);
    }
  }
  if (!["A", "B", "C", "D"].includes(answer)) answer = "A";

  return { map, answer };
}

export function qiQuestionToPractice(q) {
  const text = String(q.questionText || q.question || "").trim();
  const { map, answer } = optionsToMap(q.options || [], q.correctAnswer);
  const explanation = String(q.explanation || "Refer to standard UPSC sources.").trim() || "—";

  return {
    question: text,
    question_en: text,
    question_hi: q.question_hi || "",
    options: map,
    options_en: { ...map },
    options_hi: q.options_hi || undefined,
    correctAnswer: answer,
    answer,
    explanation,
    explanation_en: explanation,
    explanation_hi: q.explanation_hi || "",
    questionType: q.pattern || "factual",
    conceptualSource: q.sourceType || "question_intelligence",
    matchColumns: q.matchColumns || null,
    matchColumns_hi: q.matchColumns_hi || null,
  };
}

/**
 * Final same-test dedupe on practice-shaped questions.
 */
export function dedupePracticeQuestions(questions = [], { threshold = 0.75 } = {}) {
  const asQi = (questions || []).map((q) => ({
    ...q,
    questionText: q.question || q.question_en || q.questionText || "",
    correctAnswer: q.correctAnswer || q.answer,
  }));
  const { questions: unique, duplicatesRemoved } = removeDuplicates(asQi, { threshold });
  return {
    questions: unique.map((q) => {
      const { questionText, questionHash, ...rest } = q;
      return {
        ...rest,
        question: questionText || rest.question,
        question_en: rest.question_en || questionText || rest.question,
      };
    }),
    duplicatesRemoved,
  };
}

export function mapQiSessionToPracticeQuestions(session, { maxQuestions } = {}) {
  const raw = session?.questions || [];
  const mapped = [];
  const rejected = [];

  for (const q of raw) {
    const item = qiQuestionToPractice(q);
    const filled = ["A", "B", "C", "D"].filter((k) => String(item.options[k] || "").trim()).length;
    if (item.question.length < 20 || filled < 4) {
      rejected.push({ ...item, backupReason: "incomplete" });
      continue;
    }
    mapped.push(item);
  }

  const { questions: unique, duplicatesRemoved } = dedupePracticeQuestions(mapped, {
    threshold: parseFloat(process.env.QI_DEDUPE_THRESHOLD || "0.75") || 0.75,
  });

  const capped = maxQuestions ? unique.slice(0, maxQuestions) : unique;
  // Duplicates beyond cap go to rejected/backup pool
  if (maxQuestions && unique.length > maxQuestions) {
    rejected.push(
      ...unique.slice(maxQuestions).map((q) => ({ ...q, backupReason: "pool_extra" }))
    );
  }
  if (duplicatesRemoved) {
    // already dropped from unique; no need to push raw clones
  }

  return { questions: capped, rejected, duplicatesRemoved };
}
