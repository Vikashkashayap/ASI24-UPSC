/**
 * Retrieve MentorsDaily Knowledge Base context for UPSC mains copy evaluation.
 * Uses semantic search (Qdrant → Mongo fallback). Failures never block evaluation.
 */

import { searchKnowledgeBase } from "../rag/services/search.service.js";

const KB_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Art & Culture",
  "Society",
  "Governance",
  "International Relations",
  "Economy",
  "Environment",
  "Science & Tech",
  "Internal Security",
  "Disaster Management",
  "Ethics",
  "Current Affairs",
];

const SUBJECT_ALIASES = {
  polity: "Polity",
  "indian polity": "Polity",
  constitution: "Polity",
  "gs2": "Polity",
  "gs paper 2": "Polity",
  governance: "Governance",
  "social justice": "Governance",
  history: "History",
  "modern history": "History",
  "ancient history": "History",
  "medieval history": "History",
  geography: "Geography",
  economy: "Economy",
  economics: "Economy",
  environment: "Environment",
  ecology: "Environment",
  ethics: "Ethics",
  "gs4": "Ethics",
  "international relations": "International Relations",
  ir: "International Relations",
  "science & tech": "Science & Tech",
  "science and technology": "Science & Tech",
  society: "Society",
  "art & culture": "Art & Culture",
  "art and culture": "Art & Culture",
  "internal security": "Internal Security",
  "disaster management": "Disaster Management",
  "current affairs": "Current Affairs",
};

const MAX_CONTEXT_CHARS = 6500;
const TOP_K = 8;

/**
 * Map upload subject / paper / question hints to a KB subject filter (or null).
 */
export function resolveKbSubject({ subject = "", paper = "", questionText = "" } = {}) {
  const blob = `${subject} ${paper} ${questionText}`.toLowerCase();

  for (const [alias, kb] of Object.entries(SUBJECT_ALIASES)) {
    if (blob.includes(alias)) return kb;
  }

  const exact = KB_SUBJECTS.find(
    (s) => s.toLowerCase() === String(subject).trim().toLowerCase()
  );
  if (exact) return exact;

  // GS Paper heuristics from question keywords
  if (
    /cabinet|parliament|constitution|article\s*\d|federal|judiciary|election|panchayat|fundamental right/i.test(
      questionText
    )
  ) {
    return "Polity";
  }
  if (/gdp|inflation|fiscal|monetary|budget|rbi|poverty|employment/i.test(questionText)) {
    return "Economy";
  }
  if (/climate|biodiversity|pollution|wildlife|environment/i.test(questionText)) {
    return "Environment";
  }
  if (/ethics|integrity|attitude|emotional intelligence|case study/i.test(questionText)) {
    return "Ethics";
  }

  return null;
}

function buildSearchQueries({ questionText, subject, paper }) {
  const q = String(questionText || "").trim();
  const queries = [];
  if (q.length >= 12) {
    queries.push(q.slice(0, 400));
    // Shorter topical query often retrieves better conceptual chunks
    const topical = q
      .replace(/['"]/g, " ")
      .replace(/\b(elucidate|discuss|analyse|analyze|examine|comment|critically|evaluate|explain|describe|illustrate|in\s+\d+\s+words)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    if (topical.length >= 20 && topical !== q.slice(0, 220)) {
      queries.push(topical);
    }
  }
  const fallback = [subject, paper, "UPSC mains"].filter(Boolean).join(" ").trim();
  if (fallback.length >= 8) queries.push(fallback);
  return [...new Set(queries)].slice(0, 2);
}

function formatChunks(chunks = []) {
  const parts = [];
  let used = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const text = String(c.text || "").trim();
    if (!text) continue;
    const heading = c.heading || c.topic || c.subtopic || "";
    const block = `[KB ${i + 1}${heading ? ` — ${heading}` : ""}]\n${text}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}

/**
 * Fetch MentorsDaily notes context relevant to the answer question.
 * @returns {{ contextText: string, chunkCount: number, source: string, kbSubject: string|null, query: string }}
 */
export async function getCopyEvaluationKnowledgeContext({
  questionText = "",
  subject = "",
  paper = "",
} = {}) {
  const empty = {
    contextText: "",
    chunkCount: 0,
    source: "empty",
    kbSubject: null,
    query: "",
  };

  try {
    const kbSubject = resolveKbSubject({ subject, paper, questionText });
    const queries = buildSearchQueries({ questionText, subject, paper });
    if (!queries.length) return { ...empty, kbSubject };

    const seen = new Set();
    const merged = [];
    let source = "empty";
    let primaryQuery = queries[0];

    for (const query of queries) {
      const result = await searchKnowledgeBase({
        query,
        topK: TOP_K,
        filters: kbSubject ? { subject: kbSubject } : {},
      });

      source = result.source || source;
      primaryQuery = query;

      for (const hit of result.chunks || []) {
        const key = String(hit.chunkId || hit.text?.slice(0, 80) || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(hit);
      }

      // If first query already got enough, skip second
      if (merged.length >= 5) break;
    }

    // Retry without subject filter if filtered search was empty
    if (!merged.length && kbSubject) {
      const result = await searchKnowledgeBase({
        query: queries[0],
        topK: TOP_K,
        filters: {},
      });
      source = result.source || source;
      for (const hit of result.chunks || []) {
        merged.push(hit);
      }
    }

    const contextText = formatChunks(merged.slice(0, TOP_K));

    return {
      contextText,
      chunkCount: merged.length,
      source,
      kbSubject,
      query: primaryQuery,
    };
  } catch (err) {
    console.warn(
      "⚠️ Copy-eval KB retrieval failed (continuing with LLM only):",
      err.message
    );
    return empty;
  }
}

export default {
  getCopyEvaluationKnowledgeContext,
  resolveKbSubject,
};
