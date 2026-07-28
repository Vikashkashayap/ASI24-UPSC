import { sha256, normalizeWhitespace, jaccardSimilarity } from "../utils/helpers.js";
import { questionRepo } from "../repositories/index.js";

/**
 * Build structured questions from detected sections (and fallback regex on full text).
 */
export function extractQuestionsFromSections(sections) {
  const questions = [];
  let current = null;
  let order = 0;

  const pushCurrent = () => {
    if (!current?.questionText) return;
    questions.push({
      ...current,
      questionHash: sha256(normalizeWhitespace(current.questionText).toLowerCase()),
      order: order++,
    });
    current = null;
  };

  for (const sec of sections || []) {
    if (sec.sectionType === "question") {
      pushCurrent();
      current = {
        questionNumber: sec.metadata?.questionNumber || String(order + 1),
        questionText: sec.text,
        options: [],
        correctAnswer: "",
        explanation: "",
        difficulty: "",
        pageNumber: sec.pageNumber,
        topic: sec.topic || "",
      };
      continue;
    }
    if (!current) continue;
    if (sec.sectionType === "options") {
      current.options.push({
        label: sec.metadata?.label || String.fromCharCode(65 + current.options.length),
        text: sec.text,
        isCorrect: false,
      });
      continue;
    }
    if (sec.sectionType === "answer") {
      current.correctAnswer = String(sec.text || "").trim().toUpperCase().slice(0, 8);
      const match = current.options.find(
        (o) => o.label.toUpperCase() === current.correctAnswer.replace(/[^A-D]/gi, "")
      );
      if (match) match.isCorrect = true;
      continue;
    }
    if (sec.sectionType === "explanation") {
      current.explanation = sec.text;
    }
  }
  pushCurrent();
  return questions;
}

/** Fallback block parser when section detection missed MCQ structure. */
export function extractQuestionsFromText(fullText, pageNumber = 1) {
  const blocks = String(fullText || "").split(/(?=(?:^|\n)(?:Q\.?\s*|Question\s*)?\d{1,3}[\).\]]\s+)/i);
  const out = [];
  let order = 0;
  for (const block of blocks) {
    const m = block.match(/^(?:Q\.?\s*|Question\s*)?(\d{1,3})[\).\]]\s+([\s\S]+)/i);
    if (!m) continue;
    const body = m[2];
    const optionMatches = [...body.matchAll(/[\(\[]?([A-Da-d])[\).\]]\s+([^\n]+)/g)];
    if (optionMatches.length < 2) continue;
    const firstOpt = body.search(/[\(\[]?[A-Da-d][\).\]]/);
    const questionText = normalizeWhitespace(body.slice(0, firstOpt > 0 ? firstOpt : body.length));
    const ans = body.match(/(?:Ans(?:wer)?|Correct\s*Answer)\s*[:.\-]\s*([A-Da-d])/i);
    const exp = body.match(/(?:Exp(?:lanation)?|Solution)\s*[:.\-]\s*([\s\S]+)/i);
    const correct = ans ? ans[1].toUpperCase() : "";
    const options = optionMatches.map((om) => ({
      label: om[1].toUpperCase(),
      text: om[2].trim(),
      isCorrect: om[1].toUpperCase() === correct,
    }));
    out.push({
      questionNumber: m[1],
      questionText,
      options,
      correctAnswer: correct,
      explanation: exp ? normalizeWhitespace(exp[1]) : "",
      difficulty: "",
      pageNumber,
      topic: "",
      questionHash: sha256(questionText.toLowerCase()),
      order: order++,
    });
  }
  return out;
}

export async function persistQuestions({
  questions,
  processedDocumentId,
  documentId,
  subject,
  chapter,
}) {
  let saved = 0;
  let duplicates = 0;
  for (const q of questions) {
    const existing = await questionRepo.findByHash(q.questionHash);
    let isDuplicate = false;
    let duplicateOf = null;
    if (existing) {
      isDuplicate = true;
      duplicateOf = existing._id;
      duplicates += 1;
    } else {
      // soft similarity check against existing hash miss
      // (kept light — hash is primary)
    }
    await questionRepo.createWithRelations({
      processedDocumentId,
      documentId,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      questionHash: q.questionHash,
      options: q.options || [],
      correctAnswer: q.correctAnswer || "",
      explanation: q.explanation || "",
      difficulty: "",
      pageNumber: q.pageNumber,
      subject: subject || "",
      chapter: chapter || "",
      topic: q.topic || "",
      isDuplicate,
      duplicateOf,
      order: q.order,
    });
    saved += 1;
  }
  return { saved, duplicates };
}

export { jaccardSimilarity };
