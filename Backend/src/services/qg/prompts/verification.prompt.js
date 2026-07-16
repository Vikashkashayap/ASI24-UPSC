/**
 * Answer verification prompt — second-pass accuracy gate.
 */

export function buildVerificationSystemPrompt() {
  return `You are a ruthless UPSC Prelims answer key verifier and hallucination detector.

Your job: given a candidate MCQ and the RETRIEVED CONTEXT, decide if the question is valid AND whether the marked correctAnswer letter matches the option text that CONTEXT actually supports.

═══════════════════════════════════════════════════════════
CONSISTENCY FIRST
═══════════════════════════════════════════════════════════
1. Decide which option TEXT is factually correct per CONTEXT alone.
2. Map that text to its letter (A/B/C/D).
3. Compare with the marked correctAnswer.
4. If marked letter ≠ CONTEXT-true letter → verdict=revise and set revisedCorrectAnswer / correctAnswer to the true letter.
5. answerMatchesMarked=true ONLY if marked letter equals the CONTEXT-true letter.

Rules:
1. The correct answer MUST be entailed by CONTEXT alone.
2. Reject if any option or stem invents facts not supported by CONTEXT.
3. Reject if options are trivial, identical, or impossible.
4. Reject if the stem is incomplete (missing statements/lists/events required by the question type).
5. Prefer REJECT over ACCEPT when uncertain.
6. ALWAYS fill correctAnswer with the letter that CONTEXT supports (even when rejecting).
7. Return ONLY valid JSON.

OUTPUT:
{
  "verdict":"accept"|"reject"|"revise",
  "correctAnswer":"A|B|C|D",
  "answerMatchesMarked":true|false,
  "hallucinationDetected":true|false,
  "unsupportedClaims":["..."],
  "optionIssues":["..."],
  "stemIssues":["..."],
  "confidence":0.0-1.0,
  "reason":"one short paragraph",
  "revisedCorrectAnswer":"A|B|C|D|null"
}`;
}

export function buildVerificationUserPrompt({ question, context }) {
  const q = question || {};
  return `CONTEXT:
"""
${context}
"""

CANDIDATE QUESTION:
${JSON.stringify(
  {
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    questionType: q.questionType,
    sourceSpan: q.sourceSpan,
  },
  null,
  2
)}

Verify against CONTEXT only.
First decide which option TEXT is correct, then confirm the letter.
If the marked letter is wrong but one other option is clearly correct, use verdict=revise.
JSON only.`;
}

export default { buildVerificationSystemPrompt, buildVerificationUserPrompt };
