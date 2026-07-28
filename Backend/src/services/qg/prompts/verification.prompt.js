/**
 * Answer verification prompt — second-pass accuracy gate.
 * Kept compact to reduce input tokens on every verify call.
 */

export function buildVerificationSystemPrompt() {
  return `UPSC Prelims MCQ verifier. Use CONTEXT only.

Rules:
1. Decide which option TEXT CONTEXT supports, then its letter A–D.
2. Compare with marked correctAnswer; if wrong but another option is clearly right → verdict=revise + revisedCorrectAnswer.
3. Reject if stem/options invent facts outside CONTEXT, are incomplete, trivial, or duplicate.
4. Prefer reject when uncertain. Always set correctAnswer to CONTEXT-supported letter.
5. JSON only.

OUTPUT:
{"verdict":"accept|reject|revise","correctAnswer":"A|B|C|D","answerMatchesMarked":true|false,"hallucinationDetected":true|false,"unsupportedClaims":[],"optionIssues":[],"stemIssues":[],"confidence":0.0-1.0,"reason":"≤40 words","revisedCorrectAnswer":"A|B|C|D|null"}`;
}

export function buildVerificationUserPrompt({ question, context }) {
  const q = question || {};
  const opts = q.options || {};
  const compactOpts =
    opts && typeof opts === "object" && !Array.isArray(opts)
      ? opts
      : Array.isArray(opts)
        ? Object.fromEntries(
            opts.slice(0, 4).map((o, i) => [
              String(o.label || String.fromCharCode(65 + i)).toUpperCase(),
              o.text || o.option || "",
            ])
          )
        : opts;

  return `CONTEXT:
"""
${context}
"""

Q: ${String(q.question || "").slice(0, 900)}
Options: ${JSON.stringify(compactOpts)}
Marked: ${String(q.correctAnswer || "").toUpperCase().slice(0, 1)}
Type: ${q.questionType || ""}
SourceSpan: ${String(q.sourceSpan || "").slice(0, 160)}

Verify vs CONTEXT. JSON only.`;
}

export default { buildVerificationSystemPrompt, buildVerificationUserPrompt };
