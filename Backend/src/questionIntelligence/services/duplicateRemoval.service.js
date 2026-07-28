import crypto from "crypto";
import { stemSimilarity } from "../../services/qg/services/duplicateDetector.service.js";

export function questionHash(text) {
  return crypto
    .createHash("sha256")
    .update(
      String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
        .trim()
    )
    .digest("hex");
}

function normalizeOptText(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCodeLikeOption(t) {
  return /^(?:\d+(?:\s*(?:and|,|only|[-–])\s*\d+)*.*|none of the above|all of the above)$/i.test(
    String(t || "").trim()
  );
}

function correctOptionText(q) {
  const ans = String(q.correctAnswer || q.answer || "")
    .toUpperCase()
    .replace(/[^A-D]/g, "")
    .slice(0, 1);
  if (!ans) return "";
  if (Array.isArray(q.options)) {
    const hit = q.options.find((o) => String(o.label || "").toUpperCase() === ans);
    return normalizeOptText(hit?.text || hit?.option || "");
  }
  if (q.options && typeof q.options === "object") {
    return normalizeOptText(q.options[ans] || q.options[ans.toLowerCase()]);
  }
  return "";
}

function getStem(q) {
  return String(q.questionText || q.question || q.question_en || "").trim();
}

/** List-I entities for match-the-following clones (IMF / World Bank / WTO …). */
export function extractListIKey(text) {
  const s = String(text || "").replace(/\\n/g, "\n");
  if (!/list[\s\-]*i\b|match the following|match list/i.test(s)) return "";
  const items = [...s.matchAll(/(?:^|\n)\s*[A-D][.)]\s*([^\n]+)/gi)]
    .map((m) => normalizeOptText(m[1]).slice(0, 48))
    .filter(Boolean);
  if (items.length < 2) return "";
  return items.join("|");
}

function acronymSet(text) {
  const hits = String(text || "").match(/\b[A-Z]{2,8}\b/g) || [];
  return new Set(hits.map((h) => h.toUpperCase()).filter((h) => !["LIST", "UPSC", "CSE", "ONLY"].includes(h)));
}

function setJaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function isNearDuplicatePair(aText, bText, aQ, bQ, threshold) {
  if (!aText || !bText) return false;
  if (questionHash(aText) === questionHash(bText)) return true;

  const sim = stemSimilarity(aText, bText);
  if (sim >= threshold) return true;

  // Match-list clones: same List-I (IMF, WB, WTO) with tweaked List-II wording
  const listA = extractListIKey(aText);
  const listB = extractListIKey(bText);
  if (listA && listB && listA === listB) return true;
  if (listA && listB && stemSimilarity(listA, listB) >= 0.85 && sim >= 0.35) return true;

  // Shared acronyms (IMF/WTO/RBI…) + moderate stem overlap
  const acSim = setJaccard(acronymSet(aText), acronymSet(bText));
  if (acSim >= 0.75 && sim >= 0.4) return true;

  const aAns = correctOptionText(aQ);
  const bAns = correctOptionText(bQ);
  if (
    aAns &&
    bAns &&
    aAns === bAns &&
    aAns.length >= 4 &&
    !isCodeLikeOption(aAns) &&
    sim >= Math.min(0.4, threshold - 0.35)
  ) {
    return true;
  }

  // Soft: short factual same-answer clones
  if (
    aAns &&
    bAns &&
    aAns === bAns &&
    aAns.length >= 6 &&
    !isCodeLikeOption(aAns) &&
    aText.length < 180 &&
    bText.length < 180 &&
    sim >= 0.28
  ) {
    return true;
  }

  return false;
}

/**
 * Remove near-duplicate questions from a candidate list (QI or practice shape).
 */
export function removeDuplicates(questions = [], { threshold = 0.78 } = {}) {
  const kept = [];
  let removed = 0;
  const seenListKeys = new Set();

  for (const q of questions) {
    const text = getStem(q);
    if (!text || text.length < 15) {
      removed += 1;
      continue;
    }
    const hash = q.questionHash || questionHash(text);
    let isDup = false;

    const listKey = extractListIKey(text);
    if (listKey && seenListKeys.has(listKey)) {
      isDup = true;
    }

    if (!isDup) {
      for (const k of kept) {
        if (isNearDuplicatePair(text, getStem(k), q, k, threshold)) {
          isDup = true;
          break;
        }
      }
    }

    if (isDup) {
      removed += 1;
      continue;
    }

    const item = { ...q, questionHash: hash, questionText: text };
    kept.push(item);
    if (listKey) seenListKeys.add(listKey);
  }

  return { questions: kept, duplicatesRemoved: removed };
}
