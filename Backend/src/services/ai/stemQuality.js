/**
 * Student-facing stem quality guards.
 * Reject intro-only / blank / "[object Object]" / "—" numbered items so exams never show empty statements.
 */

const PLACEHOLDER_RE =
  /^(?:[—–\-−•·.…]{1,6}|n\/?a|na|tbd|todo|null|undefined|none|blank|empty|\[object object\]|\.\.\.|…)$/i;

export function isPlaceholderItemText(value) {
  const s = String(value ?? "")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return true;
  if (s === "[object Object]") return true;
  if (PLACEHOLDER_RE.test(s)) return true;
  // Only punctuation / dashes
  if (/^[\s—–\-−•·.…,;:|/\\]+$/.test(s)) return true;
  return false;
}

export function coerceStemItemText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const s = String(value).trim();
    if (!s || s === "[object Object]" || isPlaceholderItemText(s)) return "";
    return s;
  }
  if (Array.isArray(value)) {
    return value.map(coerceStemItemText).filter(Boolean).join(" ").trim();
  }
  if (typeof value === "object") {
    for (const k of [
      "text",
      "en",
      "hi",
      "item",
      "statement",
      "content",
      "value",
      "label",
      "title",
      "name",
      "event",
    ]) {
      const raw = value[k];
      if (typeof raw === "string" && raw.trim() && !isPlaceholderItemText(raw)) {
        return raw.trim();
      }
    }
  }
  return "";
}

/** Extract numbered item bodies from a stem (1. … / 2. …). */
export function extractNumberedItemBodies(text) {
  const src = String(text || "").replace(/\\n/g, "\n");
  const bodies = [];
  const markers = [...src.matchAll(/(?:^|\n)\s*(\d+)[.)]\s+/g)];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : src.length;
    let body = src.slice(start, end).trim();
    // Drop trailing prompt lines from last item
    body = body
      .replace(
        /\n?(?:which of the (?:statements|following)|select the correct|how many of the|उपर्युक्त|निम्नलिखित में से कौन|सही कालानुक्रम)[\s\S]*$/i,
        ""
      )
      .trim();
    bodies.push(body);
  }
  return bodies;
}

/** Count numbered items that have real student-readable content. */
export function countSubstantiveNumberedItems(text) {
  return extractNumberedItemBodies(text).filter((b) => {
    const t = coerceStemItemText(b);
    return t.length >= 8;
  }).length;
}

export function countSubstantiveLetterItems(text) {
  const src = String(text || "").replace(/\\n/g, "\n");
  const markers = [...src.matchAll(/(?:^|\n)\s*([A-D])[.)]\s+/gi)];
  let n = 0;
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : src.length;
    const body = coerceStemItemText(src.slice(start, end));
    if (body.length >= 2) n += 1;
  }
  return n;
}

export function stemHasBlankNumberedItems(text) {
  const bodies = extractNumberedItemBodies(text);
  if (bodies.length < 2) return false;
  const bad = bodies.filter((b) => isPlaceholderItemText(b) || coerceStemItemText(b).length < 8);
  // If majority (or any when ≥2 items expected) are blank → unsafe for students
  return bad.length > 0 && bad.length >= Math.min(2, bodies.length);
}

/**
 * Replace corrupted numbered lines ([object Object] / —) so UI never shows blanks.
 * Returns sanitized text (may still be incomplete — caller should reject via isCompleteUpscStem).
 */
export function sanitizeStemText(text) {
  let out = String(text || "")
    .replace(/\\n/g, "\n")
    .replace(/\[object Object\]/gi, "")
    .trim();

  out = out
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*\d+[.)]\s+)(.*)$/);
      if (!m) return line;
      const body = coerceStemItemText(m[2]);
      if (!body) return null; // drop blank numbered line
      return `${m[1]}${body}`;
    })
    .filter((l) => l != null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

function optionsReferToNumberedItems(options = {}) {
  const vals = ["A", "B", "C", "D"]
    .map((k) => String(options[k] || ""))
    .join(" ")
    .toLowerCase();
  return (
    /\b1\s+and\s+2\b/.test(vals) ||
    /\b1\s+only\b/.test(vals) ||
    /\b1,\s*2\b/.test(vals) ||
    /\b1-2-3/.test(vals) ||
    /\b1,\s*2,\s*3\b/.test(vals) ||
    /केवल\s*1/.test(vals) ||
    /\b1\s+and\s+3\b/.test(vals) ||
    /\b\d+\s*[-–]\s*\d+/.test(vals)
  );
}

/**
 * True when stem is complete enough to show students (no blank statements/events/lists).
 */
export function isCompleteUpscStem(q) {
  const text = sanitizeStemText(q?.question || q?.question_en || "");
  if (text.length < 25) return false;
  if (stemHasBlankNumberedItems(String(q?.question || q?.question_en || ""))) return false;
  if (/\[object Object\]/i.test(String(q?.question || ""))) return false;

  const type = String(q?.questionType || q?.patternType || "").toLowerCase();
  const opts = q?.options || q?.options_en || {};
  const needsNumbers = optionsReferToNumberedItems(opts);

  const looksMatch =
    type.includes("pair") ||
    type.includes("match") ||
    /match\s+(the\s+)?following|consider the following pairs|निम्नलिखित.*(?:मिलान|युग्म)/i.test(text);
  const looksAR =
    type.includes("assertion") || /assertion\s*\(A\)|अभिकथन\s*\(A\)/i.test(text);
  const looksChrono =
    type.includes("chronolog") ||
    type.includes("sequence") ||
    /arrange the following|chronological order|कालानुक्रम|milestones in/i.test(text);
  const looksStatement =
    type.includes("statement") ||
    /consider the following(?:\s+\w+){0,4}\s*:|which of the following statements|which of the statements given above|निम्नलिखित(?: में से)?.*(?:कथन|पहलू|aspects)/i.test(
      text
    );

  if (
    /^(match the following|arrange the following[\s\S]{0,100}|consider the following[\s\S]{0,100}|which of the following statements[\s\S]{0,80})\s*:?\s*$/i.test(
      text
    )
  ) {
    return false;
  }

  if (looksMatch) {
    const a = (q?.matchColumns?.columnA || []).map(coerceStemItemText).filter((x) => x.length >= 2);
    const b = (q?.matchColumns?.columnB || []).map(coerceStemItemText).filter((x) => x.length >= 2);
    if (a.length >= 2 && b.length >= 2) return true;
    return countSubstantiveLetterItems(text) >= 2 && countSubstantiveNumberedItems(text) >= 2;
  }

  if (looksAR) {
    if (
      coerceStemItemText(q?.assertionReason?.assertion).length >= 15 &&
      coerceStemItemText(q?.assertionReason?.reason).length >= 15
    ) {
      return true;
    }
    return (
      /assertion\s*\(A\)\s*:\s*.{15,}/i.test(text) && /reason\s*\(R\)\s*:\s*.{15,}/i.test(text)
    );
  }

  if (looksChrono || looksStatement || needsNumbers) {
    return countSubstantiveNumberedItems(text) >= 2;
  }

  return true;
}

function optionTextOk(v) {
  const s = coerceStemItemText(v);
  return s.length >= 1 && !isPlaceholderItemText(v);
}

/** Full student-ready MCQ check (stem + options + answer). */
export function isStudentReadyMcq(q) {
  if (!q || typeof q !== "object") return false;
  const stem = String(q.question_en || q.question || "").trim();
  if (!stem || !isCompleteUpscStem(q)) return false;

  const opts = q.options_en || q.options || {};
  const type = String(q.questionType || "").toLowerCase();
  const isChrono =
    type.includes("chronolog") ||
    type.includes("sequence") ||
    /arrange the following|chronological order/i.test(stem);
  const keys = isChrono ? ["A", "B", "C"] : ["A", "B", "C", "D"];
  if (keys.some((k) => !optionTextOk(opts[k]))) return false;

  const answer = String(q.correctAnswer || q.answer || "")
    .toUpperCase()
    .trim()
    .charAt(0);
  if (!keys.includes(answer)) return false;
  if (!optionTextOk(opts[answer])) return false;

  return true;
}

export function filterStudentReadyQuestions(questions = []) {
  const out = [];
  let dropped = 0;
  for (const q of questions || []) {
    if (isStudentReadyMcq(q)) out.push(q);
    else dropped += 1;
  }
  if (dropped > 0) {
    console.warn(`⚠️ Dropped ${dropped} incomplete/blank-stem question(s) (student safety)`);
  }
  return out;
}
