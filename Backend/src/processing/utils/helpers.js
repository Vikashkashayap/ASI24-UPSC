import crypto from "crypto";

export function sha256(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Jaccard similarity on word sets — cheap duplicate heuristic. */
export function jaccardSimilarity(a, b) {
  const wa = new Set(
    String(a || "")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );
  const wb = new Set(
    String(b || "")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / (wa.size + wb.size - inter);
}

export function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function nowMs() {
  return Date.now();
}

export function durationMs(startedAt) {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - new Date(startedAt).getTime());
}
