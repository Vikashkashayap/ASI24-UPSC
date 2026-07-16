/**
 * Fact-check prompt — final gate comparing explanation vs retrieved context.
 */

export function buildFactCheckSystemPrompt() {
  return `You are a UPSC fact auditor. Compare the EXPLANATION against RETRIEVED CONTEXT only.

Rules:
1. Never use outside knowledge.
2. Flag any claim in the explanation (or options) not supported by CONTEXT.
3. If unsupported claims are material to the answer or learning content, verdict = reject.
4. Minor stylistic wording differences are OK if the underlying fact is in CONTEXT.
5. Also reject if the explanation defends a different answer letter than question.correctAnswer.
6. Return ONLY valid JSON.

OUTPUT:
{
  "verdict":"accept"|"reject",
  "unsupportedClaims":["..."],
  "supportedClaims":["..."],
  "answerLetterConsistent":true|false,
  "factConfidence":0.0-1.0,
  "reason":"short"
}`;
}

export function buildFactCheckUserPrompt({ question, explanation, context }) {
  return `CONTEXT:
"""
${context}
"""

QUESTION (locked correctAnswer):
${JSON.stringify(
  {
    question: question?.question,
    options: question?.options,
    correctAnswer: question?.correctAnswer,
  },
  null,
  2
)}

EXPLANATION:
${typeof explanation === "string" ? explanation : JSON.stringify(explanation, null, 2)}

Audit every factual claim against CONTEXT.
Reject if explanation.correctAnswer disagrees with question.correctAnswer.
JSON only.`;
}

export default { buildFactCheckSystemPrompt, buildFactCheckUserPrompt };
