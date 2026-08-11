import { resolveNotesPatterns, ALL_PATTERN_IDS } from "../../config/questionPatterns.js";

const DIFFICULTY_WEIGHTS = [
  { id: "easy", ratio: 0.2 },
  { id: "moderate", ratio: 0.5 },
  { id: "hard", ratio: 0.3 },
];

/** Official UPSC Prelims Hard / PYQ-style paper mix */
const DIFFICULTY_WEIGHTS_PYQ_HARD = [
  { id: "easy", ratio: 0 },
  { id: "moderate", ratio: 0.15 },
  { id: "hard", ratio: 0.85 },
];

/**
 * Equal-ratio quota across every active UPSC pattern so none is missing.
 * e.g. 30Q × 10 patterns → 3 each; 20Q → 2 each.
 */
function buildQuotaMap(total, activePatterns) {
  const patterns =
    Array.isArray(activePatterns) && activePatterns.length > 0
      ? [...activePatterns]
      : [...ALL_PATTERN_IDS];
  const n = patterns.length;
  const quota = new Map();

  if (total < n) {
    for (let i = 0; i < n; i += 1) {
      quota.set(patterns[i], i < total ? 1 : 0);
    }
    return quota;
  }

  const base = Math.floor(total / n);
  let rem = total % n;
  for (let i = 0; i < n; i += 1) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    quota.set(patterns[i], base + extra);
  }
  return quota;
}

function buildDifficultyQuota(total, profile = "balanced") {
  const weights =
    profile === "pyq_hard" || profile === "hard" ? DIFFICULTY_WEIGHTS_PYQ_HARD : DIFFICULTY_WEIGHTS;
  const out = new Map();
  let used = 0;
  for (const row of weights) {
    const c = Math.round(total * row.ratio);
    out.set(row.id, c);
    used += c;
  }
  const fillKey = profile === "pyq_hard" || profile === "hard" ? "hard" : "moderate";
  while (used < total) {
    out.set(fillKey, (out.get(fillKey) || 0) + 1);
    used += 1;
  }
  while (used > total) {
    if ((out.get("moderate") || 0) > 0) {
      out.set("moderate", out.get("moderate") - 1);
      used -= 1;
    } else if ((out.get("easy") || 0) > 0) {
      out.set("easy", out.get("easy") - 1);
      used -= 1;
    } else if ((out.get("hard") || 0) > 1) {
      out.set("hard", out.get("hard") - 1);
      used -= 1;
    } else {
      break;
    }
  }
  return out;
}

function consumeQuota(quota, size) {
  const out = new Map();
  let taken = 0;
  const keys = [...quota.keys()];
  while (taken < size && keys.length) {
    let progressed = false;
    for (const key of keys) {
      if (taken >= size) break;
      const left = quota.get(key) || 0;
      if (left <= 0) continue;
      quota.set(key, left - 1);
      out.set(key, (out.get(key) || 0) + 1);
      taken += 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return out;
}

class QuestionPatternEngine {
  /**
   * @param {{questionCount?: number, patternsToInclude?: string[], difficultyProfile?: "balanced"|"pyq_hard"|"hard"}} opts
   */
  createPlan(opts = {}) {
    const total = Math.max(1, Math.min(120, parseInt(opts.questionCount, 10) || 50));
    const activePatterns = resolveNotesPatterns(opts.patternsToInclude);
    const patterns = buildQuotaMap(total, activePatterns);
    const difficultyProfile = String(opts.difficultyProfile || "balanced").toLowerCase();
    console.log(
      `[patternPlan] ${difficultyProfile} ${total}Q across ${activePatterns.length} patterns:`,
      Object.fromEntries(patterns)
    );
    return {
      total,
      patterns,
      difficulties: buildDifficultyQuota(total, difficultyProfile),
      difficultyProfile,
    };
  }

  /**
   * Returns quotas to be used by one generation batch.
   * @param {{plan: {patterns: Map<string, number>, difficulties: Map<string, number>}, batchSize: number}} params
   */
  nextBatchPlan({ plan, batchSize }) {
    const size = Math.max(1, parseInt(batchSize, 10) || 10);
    const patternCounts = consumeQuota(plan.patterns, size);
    const difficultyCounts = consumeQuota(plan.difficulties, size);
    return {
      size,
      patternCounts: Object.fromEntries(patternCounts),
      difficultyCounts: Object.fromEntries(difficultyCounts),
    };
  }
}

export const questionPatternEngine = new QuestionPatternEngine();
export default questionPatternEngine;
