/**
 * Difficulty balancing for selected question sets.
 */

const DEFAULT_MIX = { Easy: 0.25, Medium: 0.5, Hard: 0.25 };

export function normalizeDifficulty(d) {
  const v = String(d || "").toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  if (v === "moderate" || v === "medium") return "Medium";
  // heuristic from text length / pattern later
  return "Medium";
}

export function inferDifficulty(question) {
  if (question.difficulty) return normalizeDifficulty(question.difficulty);
  const text = String(question.questionText || question.question || "");
  const pattern = question.pattern || "";
  if (pattern === "assertion_reason" || pattern === "matching" || pattern === "chronology") {
    return "Hard";
  }
  if (pattern === "multi_statement" || text.length > 280) return "Medium";
  if (text.length < 120) return "Easy";
  return "Medium";
}

/**
 * Compute target counts per difficulty for a total N.
 */
export function targetCounts(total, mix = DEFAULT_MIX) {
  const n = Math.max(1, Number(total) || 10);
  const easy = Math.round(n * (mix.Easy ?? DEFAULT_MIX.Easy));
  const hard = Math.round(n * (mix.Hard ?? DEFAULT_MIX.Hard));
  let medium = n - easy - hard;
  if (medium < 0) {
    return { Easy: Math.max(0, easy + medium), Medium: 0, Hard: hard };
  }
  return { Easy: easy, Medium: medium, Hard: hard };
}

/**
 * Pick questions to match difficulty targets as closely as possible.
 */
export function balanceByDifficulty(candidates, total, mix) {
  const targets = targetCounts(total, mix);
  const buckets = { Easy: [], Medium: [], Hard: [] };
  for (const q of candidates) {
    const d = inferDifficulty(q);
    buckets[d].push({ ...q, difficulty: d });
  }

  const picked = [];
  for (const level of ["Easy", "Medium", "Hard"]) {
    const need = targets[level];
    picked.push(...buckets[level].slice(0, need));
  }

  // Fill remaining from leftover by rankScore
  if (picked.length < total) {
    const used = new Set(picked.map((p) => p._uid || p.questionHash || p.questionText));
    const leftover = candidates
      .map((q) => ({ ...q, difficulty: inferDifficulty(q) }))
      .filter((q) => !used.has(q._uid || q.questionHash || q.questionText))
      .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
    for (const q of leftover) {
      if (picked.length >= total) break;
      picked.push(q);
    }
  }

  return {
    questions: picked.slice(0, total),
    targets,
    actual: {
      Easy: picked.filter((q) => q.difficulty === "Easy").length,
      Medium: picked.filter((q) => q.difficulty === "Medium").length,
      Hard: picked.filter((q) => q.difficulty === "Hard").length,
    },
  };
}
