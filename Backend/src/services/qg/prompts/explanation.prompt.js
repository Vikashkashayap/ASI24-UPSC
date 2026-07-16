/**
 * Structured explanation generation prompt.
 * Target: 50–70 words detailedExplanation, locked to verified correctAnswer.
 */

import { QG_CONFIG } from "../config/qg.config.js";

export function buildExplanationSystemPrompt() {
  const minW = QG_CONFIG.quality.explanationMinWords;
  const maxW = QG_CONFIG.quality.explanationMaxWords;

  return `You are a UPSC mentor writing gold-standard MCQ explanations (Vision IAS / Insights style).

═══════════════════════════════════════════════════════════
CRITICAL CONSISTENCY LOCK (students must never see a mismatch)
═══════════════════════════════════════════════════════════
The verified correctAnswer letter is LOCKED. You must NEVER change it.
- correctAnswer field in JSON MUST equal the verified letter given in the user message.
- detailedExplanation MUST open with: Option {verifiedLetter} ("{correct option text}") is correct.
- Never write "Option X is correct" when X ≠ verified letter.
- whyWrong for the verified letter MUST be "" (empty). Only wrong letters get whyWrong text.
- Do not explain the correct option as wrong.

Rules:
1. Use ONLY the provided CONTEXT and the VERIFIED question.
2. Never invent background facts outside CONTEXT.
3. Explain why the LOCKED option is right AND why each wrong option is wrong.
4. detailedExplanation MUST be ${minW}–${maxW} words (count carefully). Exam-oriented, no fluff.
5. Return ONLY valid JSON.

OUTPUT:
{
  "correctAnswer":"A|B|C|D",
  "detailedExplanation":"${minW}–${maxW} words; MUST open with Option {letter} and defend ONLY that letter",
  "relevantBackground":"1–2 short sentences of CONTEXT-supported background (or empty string)",
  "whyWrong":{
    "A":"...",
    "B":"...",
    "C":"...",
    "D":"..."
  },
  "upscLearningTip":"one actionable tip for Prelims",
  "memoryTrick":"optional mnemonic if CONTEXT supports; else empty string",
  "source":"short quote or heading from CONTEXT",
  "topic":"topic name",
  "book":"book/chapter if known else empty"
}`;
}

export function buildExplanationUserPrompt({ question, context, meta = {} }) {
  const q = question || {};
  const ans = String(q.correctAnswer || "").toUpperCase();
  const wrongKeys = ["A", "B", "C", "D"].filter((k) => k !== ans);
  const minW = QG_CONFIG.quality.explanationMinWords;
  const maxW = QG_CONFIG.quality.explanationMaxWords;
  const correctText = q.options?.[ans] || "";

  return `Subject: ${meta.subject || ""}
Topic: ${meta.topic || ""}
Book/Chapter: ${meta.book || meta.chapter || ""}

CONTEXT:
"""
${context}
"""

VERIFIED QUESTION (correctAnswer is LOCKED — do not change):
${JSON.stringify(
  {
    question: q.question,
    options: q.options,
    correctAnswer: ans,
    correctOptionText: correctText,
    questionType: q.questionType,
  },
  null,
  2
)}

Write a structured explanation.
- Set correctAnswer to "${ans}" exactly.
- detailedExplanation: ${minW}–${maxW} words, MUST start with: Option ${ans} ("${String(correctText).slice(0, 120)}") is correct.
- Defend ONLY Option ${ans}. Never say another letter is correct.
- whyWrong: explain ${wrongKeys.join(", ")} only; set whyWrong.${ans} to "".
JSON only.`;
}

/**
 * Flatten structured explanation for UIs that expect a string.
 */
export function formatExplanationText(structured, correctAnswer) {
  if (!structured || typeof structured !== "object") {
    return String(structured || "").trim();
  }
  const ans = structured.correctAnswer || correctAnswer || "";
  const lines = [
    `Correct Answer: ${ans}`,
    "",
    "Detailed Explanation:",
    String(structured.detailedExplanation || "").trim(),
  ];

  if (structured.relevantBackground) {
    lines.push("", "Relevant Background:", String(structured.relevantBackground).trim());
  }

  const why = structured.whyWrong || {};
  for (const k of ["A", "B", "C", "D"]) {
    if (k === ans) continue;
    if (why[k]) lines.push("", `Why Option ${k} is wrong:`, String(why[k]).trim());
  }

  if (structured.upscLearningTip) {
    lines.push("", "UPSC Learning Tip:", String(structured.upscLearningTip).trim());
  }
  if (structured.memoryTrick) {
    lines.push("", "Memory Trick:", String(structured.memoryTrick).trim());
  }
  if (structured.source) lines.push("", `Source: ${String(structured.source).trim()}`);
  if (structured.topic) lines.push(`Topic: ${String(structured.topic).trim()}`);
  if (structured.book) lines.push(`Book: ${String(structured.book).trim()}`);

  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n").trim();
}

export default {
  buildExplanationSystemPrompt,
  buildExplanationUserPrompt,
  formatExplanationText,
};
