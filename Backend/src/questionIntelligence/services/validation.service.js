/**
 * Self-validation + confidence check for selected/generated questions.
 */

function hasFourOptions(q) {
  return Array.isArray(q.options) && q.options.length >= 4;
}

function answerInOptions(q) {
  const ans = String(q.correctAnswer || "")
    .toUpperCase()
    .replace(/[^A-D]/g, "");
  if (!ans) return false;
  return (q.options || []).some((o) => String(o.label || "").toUpperCase() === ans);
}

function optionTextsUnique(q) {
  const texts = (q.options || []).map((o) =>
    String(o.text || "")
      .toLowerCase()
      .trim()
  );
  return new Set(texts.filter(Boolean)).size === texts.filter(Boolean).length;
}

function optionsLookStrong(q) {
  const opts = q.options || [];
  if (opts.length < 4) return false;
  const codeLike = /^(?:\d+(?:\s*(?:and|,|only|[-–])\s*\d+)*.*|none of the above|all of the above)$/i;
  return opts.every((o) => {
    const t = String(o.text || "").trim();
    if (!t) return false;
    if (codeLike.test(t)) return true;
    return t.split(/\s+/).filter(Boolean).length >= 2;
  });
}

/**
 * Validate one question; return confidence 0–1.
 */
export function validateQuestion(q) {
  const notes = [];
  let score = 0;

  const text = q.questionText || q.question || "";
  if (text.length >= 25) score += 0.22;
  else notes.push("Question text too short");

  if (hasFourOptions(q)) score += 0.22;
  else notes.push("Need 4 options");

  if (optionTextsUnique(q)) score += 0.1;
  else notes.push("Duplicate option text");

  if (optionsLookStrong(q)) score += 0.08;
  else notes.push("Weak/short option texts");

  if (answerInOptions(q)) score += 0.23;
  else notes.push("Correct answer not mapped to options");

  if (q.explanation && String(q.explanation).length > 20) score += 0.15;
  else notes.push("Weak/missing explanation");

  // Prefer questions that came with verification confidence
  if (typeof q.confidence === "number") {
    score = score * 0.6 + Math.min(1, q.confidence) * 0.4;
  }

  const validated =
    score >= 0.55 && hasFourOptions(q) && answerInOptions(q) && optionTextsUnique(q);
  return {
    ...q,
    confidence: Number(score.toFixed(3)),
    validated,
    validationNotes: notes.join("; "),
  };
}

export function validateSet(questions = []) {
  const validated = questions.map(validateQuestion);
  const avg =
    validated.length === 0
      ? null
      : validated.reduce((s, q) => s + (q.confidence || 0), 0) / validated.length;
  return {
    questions: validated,
    avgConfidence: avg != null ? Number(avg.toFixed(3)) : null,
    passed: validated.filter((q) => q.validated).length,
    failed: validated.filter((q) => !q.validated).length,
  };
}
