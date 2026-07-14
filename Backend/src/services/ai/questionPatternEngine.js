import { resolveNotesPatterns } from "../../config/questionPatterns.js";

const DEFAULT_TYPE_DISTRIBUTION = [
  { id: "statement_based", count: 10 },
  { id: "multi_statement_elimination", count: 6 },
  { id: "pair_matching", count: 5 },
  { id: "chronology", count: 5 },
  { id: "sequence_arrangement", count: 5 },
  { id: "map_location", count: 4 },
  { id: "assertion_reason", count: 3 },
  { id: "statement_not_correct", count: 4 },
  { id: "direct_conceptual", count: 4 },
  { id: "odd_one_out", count: 4 },
];

const DIFFICULTY_WEIGHTS = [
  { id: "easy", ratio: 0.2 },
  { id: "moderate", ratio: 0.5 },
  { id: "hard", ratio: 0.3 },
];

function buildQuotaMap(total, activePatterns) {
  const active = new Set(activePatterns);
  const quota = new Map();

  const preferred = DEFAULT_TYPE_DISTRIBUTION.filter((row) => active.has(row.id));
  const preferredTotal = preferred.reduce((sum, row) => sum + row.count, 0) || 1;

  let used = 0;
  for (const row of preferred) {
    const c = Math.max(1, Math.round((row.count / preferredTotal) * total));
    quota.set(row.id, c);
    used += c;
  }

  // If topic/patterns exclude many defaults, backfill with available active patterns.
  if (used < total && activePatterns.length) {
    for (let i = 0; i < total - used; i += 1) {
      const id = activePatterns[i % activePatterns.length];
      quota.set(id, (quota.get(id) || 0) + 1);
    }
  }

  // Normalize to exact total.
  while ([...quota.values()].reduce((a, b) => a + b, 0) > total) {
    let maxKey = null;
    let maxVal = -1;
    for (const [k, v] of quota.entries()) {
      if (v > maxVal) {
        maxVal = v;
        maxKey = k;
      }
    }
    if (!maxKey || maxVal <= 1) break;
    quota.set(maxKey, maxVal - 1);
  }

  while ([...quota.values()].reduce((a, b) => a + b, 0) < total && activePatterns.length) {
    const id = activePatterns[[...quota.values()].reduce((a, b) => a + b, 0) % activePatterns.length];
    quota.set(id, (quota.get(id) || 0) + 1);
  }

  return quota;
}

function buildDifficultyQuota(total) {
  const out = new Map();
  let used = 0;
  for (const row of DIFFICULTY_WEIGHTS) {
    const c = Math.round(total * row.ratio);
    out.set(row.id, c);
    used += c;
  }
  while (used < total) {
    out.set("moderate", (out.get("moderate") || 0) + 1);
    used += 1;
  }
  while (used > total) {
    if ((out.get("moderate") || 0) > 0) {
      out.set("moderate", out.get("moderate") - 1);
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
    for (const key of keys) {
      if (taken >= size) break;
      const left = quota.get(key) || 0;
      if (left <= 0) continue;
      quota.set(key, left - 1);
      out.set(key, (out.get(key) || 0) + 1);
      taken += 1;
    }
  }
  return out;
}

class QuestionPatternEngine {
  /**
   * @param {{questionCount?: number, patternsToInclude?: string[]}} opts
   */
  createPlan(opts = {}) {
    const total = Math.max(1, Math.min(120, parseInt(opts.questionCount, 10) || 50));
    const activePatterns = resolveNotesPatterns(opts.patternsToInclude);
    return {
      total,
      patterns: buildQuotaMap(total, activePatterns),
      difficulties: buildDifficultyQuota(total),
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
