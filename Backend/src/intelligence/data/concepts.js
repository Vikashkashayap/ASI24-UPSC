/**
 * Related concept graph via metadata relationships (no LLM).
 */
export const CONCEPT_GRAPH = {
  monsoon: [
    "El Nino",
    "La Nina",
    "ITCZ",
    "Jet Stream",
    "Western Disturbance",
    "ENSO",
    "Retreating Monsoon",
  ],
  "el nino": ["Monsoon", "La Nina", "ENSO", "Walker Circulation", "Drought"],
  "la nina": ["Monsoon", "El Nino", "ENSO", "Floods"],
  enso: ["El Nino", "La Nina", "Monsoon", "Southern Oscillation"],
  inflation: ["CPI", "WPI", "RBI", "Monetary Policy", "Repo Rate", "Fiscal Deficit"],
  gdp: ["GNP", "NNP", "Per Capita Income", "Economic Growth", "National Income"],
  constitution: [
    "Preamble",
    "Fundamental Rights",
    "DPSP",
    "Fundamental Duties",
    "Amendment",
    "Basic Structure",
  ],
  parliament: ["Lok Sabha", "Rajya Sabha", "Speaker", "Money Bill", "Budget"],
  federalism: ["Union List", "State List", "Concurrent List", "Finance Commission", "GST Council"],
  biodiversity: ["Hotspots", "Wildlife Protection Act", "Biosphere Reserve", "IUCN", "CITES"],
  "climate change": ["Paris Agreement", "UNFCCC", "NDCs", "Carbon Credit", "IPCC"],
  river: ["Drainage", "Watershed", "Himalayan Rivers", "Peninsular Rivers", "Indus Waters"],
  judiciary: ["Supreme Court", "Judicial Review", "PIL", "Basic Structure", "High Court"],
};

export function relatedConcepts(query, limit = 8) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];

  const hits = new Set();
  for (const [key, related] of Object.entries(CONCEPT_GRAPH)) {
    if (q.includes(key) || key.includes(q)) {
      related.forEach((r) => hits.add(r));
    }
  }

  // token match
  for (const token of q.split(/\s+/)) {
    if (token.length < 3) continue;
    for (const [key, related] of Object.entries(CONCEPT_GRAPH)) {
      if (key.includes(token) || token.includes(key)) {
        related.forEach((r) => hits.add(r));
      }
    }
  }

  return [...hits].slice(0, limit);
}
