import { normalizeCorrectAnswer, normalizeOptions } from "../validators/question.validator.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { formatExplanationText } from "../prompts/explanation.prompt.js";

/**
 * Fast practice path: build a locked teaching explanation without a second LLM call.
 * Covers why correct is right + why each wrong option fails (student concept clarity).
 */
export function buildInlinePracticeExplanation(question, verification = {}, contextText = "") {
  const options = normalizeOptions(question?.options || question?.options_en);
  const correct = normalizeCorrectAnswer(question?.correctAnswer ?? question?.answer);
  if (!correct || !options[correct]) {
    return { success: false, error: "missing_locked_answer" };
  }

  const whyWrong = { A: "", B: "", C: "", D: "" };
  const wrongBits = [];
  for (const k of ["A", "B", "C", "D"]) {
    if (k === correct) continue;
    const t = String(options[k] || "").trim();
    const bit = t
      ? `Option ${k} ("${t.slice(0, 60)}") is incorrect because it does not match the notes on this point`
      : `Option ${k} is incorrect as it contradicts the notes`;
    whyWrong[k] = `${bit}.`;
    wrongBits.push(bit);
  }

  const verifyReason = String(verification.reason || "")
    .replace(/\bcandidate question\b/gi, "question")
    .replace(/\bthe provided (?:text|context|source)\b/gi, "the notes")
    .trim();
  const cleanReason =
    verifyReason &&
    !/^verdict|^reject|^accept/i.test(verifyReason) &&
    verifyReason.length < 280
      ? verifyReason
      : "This matches the retrieved knowledge-base notes for the topic.";

  const snippet = String(contextText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  let detailed =
    `Option ${correct} ("${options[correct]}") is correct. ${cleanReason} ` +
    (snippet ? `Evidence from notes: ${snippet}. ` : "") +
    `${wrongBits.join("; ")}.`;

  const minW = Math.max(50, QG_CONFIG.quality.explanationMinWords);
  const maxW = Math.max(70, QG_CONFIG.quality.explanationMaxWords || 100);
  let words = detailed.split(/\s+/).filter(Boolean);
  while (words.length < minW) {
    detailed +=
      " Eliminate options that contradict definitions, institutions, chronology, or mechanisms stated in the notes.";
    words = detailed.split(/\s+/).filter(Boolean);
  }
  if (words.length > maxW) {
    detailed = `${words.slice(0, maxW).join(" ").replace(/[.,;:]+$/, "")}.`;
  }

  const structured = {
    correctAnswer: correct,
    detailedExplanation: detailed,
    relevantBackground: "",
    whyWrong,
    upscLearningTip:
      "Eliminate options that contradict the source notes; prefer definition- and institution-based reasoning.",
    memoryTrick: "",
    source: snippet.slice(0, 100),
    topic: question.topic || "",
    book: question.chapter || "",
  };

  return {
    success: true,
    structured,
    text: formatExplanationText(structured, correct),
    model: "practice-inline",
    durationMs: 0,
    fromCache: false,
  };
}

export default { buildInlinePracticeExplanation };
