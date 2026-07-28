/** Synonym groups for keyword expansion (no LLM). */
export const SYNONYM_GROUPS = [
  ["river", "rivers", "fluvial", "drainage", "watershed", "catchment"],
  ["monsoon", "southwest monsoon", "northeast monsoon", "rainy season"],
  ["inflation", "price rise", "cpi", "wpi", "dearness"],
  ["constitution", "constitutional", "fundamental rights", "directive principles", "dpsp"],
  ["parliament", "lok sabha", "rajya sabha", "legislature"],
  ["gdp", "gross domestic product", "national income", "economic growth"],
  ["climate change", "global warming", "greenhouse", "carbon emission"],
  ["biodiversity", "wildlife", "ecosystem", "flora", "fauna"],
  ["judiciary", "supreme court", "high court", "judicial review"],
  ["federalism", "centre-state", "union territory", "concurrent list"],
];

const LOOKUP = new Map();
for (const group of SYNONYM_GROUPS) {
  const normalized = group.map((g) => g.toLowerCase());
  for (const term of normalized) {
    LOOKUP.set(term, normalized);
  }
}

export function expandSynonyms(query) {
  const tokens = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const expanded = new Set(tokens);
  // also try multi-word phrases from groups
  const q = String(query || "").toLowerCase();
  for (const group of SYNONYM_GROUPS) {
    if (group.some((g) => q.includes(g))) {
      group.forEach((g) => expanded.add(g.toLowerCase()));
    }
  }
  for (const t of tokens) {
    const syns = LOOKUP.get(t);
    if (syns) syns.forEach((s) => expanded.add(s));
  }
  return [...expanded];
}
