/**
 * Retrieve Admin Knowledge Base context for UPSC mains copy evaluation.
 * Uses the same stack as Admin → Knowledge Base / Intelligence:
 * hybridSearch (Qdrant knowledge_intelligence + DocumentChunk/KbDocument + website notes).
 * Failures never block evaluation.
 */

import { hybridSearch } from "../intelligence/services/hybridSearch.service.js";
import { relatedConcepts } from "../intelligence/data/concepts.js";
import { KbSubject } from "../knowledge/models/KbSubject.js";
import {
  fingerprintQuestion,
  getCachedKb,
  setCachedKb,
  recordCacheTokenSavings,
} from "./copyEvalTokenCache.service.js";

const SUBJECT_ALIASES = {
  polity: ["Polity", "Indian Polity"],
  "indian polity": ["Polity", "Indian Polity"],
  constitution: ["Polity", "Indian Polity"],
  gs2: ["Polity", "Governance"],
  "gs paper 2": ["Polity", "Governance"],
  governance: ["Governance"],
  "social justice": ["Governance"],
  history: ["History", "Modern History", "Ancient History", "Medieval History"],
  "modern history": ["History", "Modern History"],
  "ancient history": ["History", "Ancient History"],
  "medieval history": ["History", "Medieval History"],
  geography: ["Geography", "Indian Geography"],
  economy: ["Economy", "Indian Economy"],
  economics: ["Economy", "Indian Economy"],
  environment: ["Environment", "Ecology", "Environment & Ecology"],
  ecology: ["Environment", "Ecology"],
  ethics: ["Ethics"],
  gs4: ["Ethics"],
  "international relations": ["International Relations"],
  ir: ["International Relations"],
  "science & tech": ["Science & Tech", "Science and Technology"],
  "science and technology": ["Science & Tech", "Science and Technology"],
  society: ["Society"],
  "art & culture": ["Art & Culture", "Art and Culture"],
  "art and culture": ["Art & Culture", "Art and Culture"],
  "internal security": ["Internal Security"],
  "disaster management": ["Disaster Management"],
  "current affairs": ["Current Affairs"],
};

const MAX_CONTEXT_CHARS = Number(process.env.COPY_EVAL_KB_MAX_CHARS) || 4000;
const TOP_K = Number(process.env.COPY_EVAL_KB_TOP_K) || 5;

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasDevanagari(text = "") {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Map upload subject / paper / question hints to candidate KB subject names.
 */
export function resolveKbSubjectHints({
  subject = "",
  paper = "",
  questionText = "",
} = {}) {
  const blob = `${subject} ${paper} ${questionText}`.toLowerCase();
  const hints = [];

  for (const [alias, names] of Object.entries(SUBJECT_ALIASES)) {
    if (blob.includes(alias)) {
      for (const n of names) {
        if (!hints.includes(n)) hints.push(n);
      }
    }
  }

  const raw = String(subject || "").trim();
  if (raw && !hints.some((h) => h.toLowerCase() === raw.toLowerCase())) {
    hints.unshift(raw);
  }

  // GS heuristics from question keywords (English + Hindi)
  if (
    /cabinet|parliament|constitution|article\s*\d|federal|judiciary|election|panchayat|fundamental right|राष्ट्रपति|उपराष्ट्रपति|संविधान|संसद|मौलिक अधिकार|कार्यपालिका|न्यायपालिका/i.test(
      questionText
    )
  ) {
    for (const n of ["Polity", "Indian Polity"]) {
      if (!hints.includes(n)) hints.push(n);
    }
  }
  if (
    /gdp|inflation|fiscal|monetary|budget|rbi|poverty|employment|मुद्रास्फीति|बजट|गरीबी|रोजगार/i.test(
      questionText
    )
  ) {
    for (const n of ["Economy", "Indian Economy"]) {
      if (!hints.includes(n)) hints.push(n);
    }
  }
  if (
    /climate|biodiversity|pollution|wildlife|environment|जलवायु|पर्यावरण|प्रदूषण/i.test(
      questionText
    )
  ) {
    if (!hints.includes("Environment")) hints.push("Environment");
  }
  if (
    /ethics|integrity|attitude|emotional intelligence|case study|नैतिकता|ईमानदारी/i.test(
      questionText
    )
  ) {
    if (!hints.includes("Ethics")) hints.push("Ethics");
  }
  if (
    /internal security|naxal|terrorism|border|cyber|आंतरिक सुरक्षा|आतंकवाद/i.test(
      questionText
    )
  ) {
    if (!hints.includes("Internal Security")) hints.push("Internal Security");
  }
  if (/disaster|ndma|आपदा/i.test(questionText)) {
    if (!hints.includes("Disaster Management")) hints.push("Disaster Management");
  }

  return hints;
}

/**
 * Resolve best matching KbSubject.name from admin taxonomy.
 */
export async function resolveKbSubjectName(subjectOrHints = "") {
  const hints = Array.isArray(subjectOrHints)
    ? subjectOrHints
    : resolveKbSubjectHints({ subject: subjectOrHints });

  if (!hints.length) return null;

  try {
    for (const hint of hints) {
      const aliases = SUBJECT_ALIASES[String(hint).toLowerCase()] || [hint];
      const or = aliases.flatMap((a) => [
        { name: new RegExp(`^${escapeRegex(a)}$`, "i") },
        { slug: new RegExp(`^${escapeRegex(a).replace(/\s+/g, "-")}$`, "i") },
      ]);

      const hit = await KbSubject.findOne({
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        $or: or,
      })
        .select("name")
        .lean();
      if (hit?.name) return hit.name;

      const loose = await KbSubject.findOne({
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        name: new RegExp(escapeRegex(hint), "i"),
      })
        .select("name")
        .lean();
      if (loose?.name) return loose.name;
    }
  } catch (err) {
    console.warn("[copyEvalKB] KbSubject resolve failed:", err.message);
  }

  return hints[0] || null;
}

/** Backward-compatible sync hint (no DB). Prefer resolveKbSubjectName when async. */
export function resolveKbSubject(opts = {}) {
  const hints = resolveKbSubjectHints(opts);
  return hints[0] || null;
}

function hindiToEnglishSearchHint(questionText = "") {
  if (!hasDevanagari(questionText)) return "";
  const q = questionText;
  const hints = [];
  if (/राष्ट्रपति|राष्ट्र पति/.test(q))
    hints.push("President of India constitutional position powers");
  if (/उपराष्ट्रपति|उप राष्ट्रपति|vice.?president/i.test(q))
    hints.push("Vice-President of India constitutional position");
  if (/संसद|लोकसभा|राज्यसभा/.test(q))
    hints.push("Parliament Lok Sabha Rajya Sabha");
  if (/संविधान|संवैधानिक|सर्वेधानिक|सर्वधानिक/.test(q))
    hints.push("Indian Constitution constitutional provisions");
  if (/कार्यपालिका|कार्यकारी/.test(q)) hints.push("Executive Union Government");
  if (/न्यायपालिका|न्यायालय|सुप्रीम/.test(q))
    hints.push("Judiciary Supreme Court");
  if (/मौलिक अधिकार|मूल अधिकार/.test(q)) hints.push("Fundamental Rights");
  if (/नीति निर्देशक|DPSP|निर्देशक सिद्धांत/.test(q))
    hints.push("Directive Principles of State Policy");
  if (/आपातकाल/.test(q)) hints.push("Emergency provisions Constitution");
  if (/संघवाद|केन्द्र राज्य/.test(q))
    hints.push("Federalism Centre-State relations");
  if (/निर्वाचन|चुनाव/.test(q)) hints.push("Election Commission elections");
  if (/मंत्रिपरिषद|प्रधानमंत्री/.test(q))
    hints.push("Council of Ministers Prime Minister");
  if (/नैतिकता|ईमानदारी|अभिवृत्ति/.test(q))
    hints.push("Ethics integrity attitude emotional intelligence");
  if (/आंतरिक सुरक्षा|आतंकवाद/.test(q))
    hints.push("Internal Security terrorism border management");
  if (/आपदा/.test(q)) hints.push("Disaster Management NDMA");
  return hints.join(" ").trim();
}

function buildSearchQueries({ questionText, subject, paper }) {
  const q = String(questionText || "").trim();
  const queries = [];

  const enHint = hindiToEnglishSearchHint(q);
  if (enHint) {
    queries.push(`${enHint} ${subject || ""}`.trim());
  }

  if (q.length >= 12) {
    queries.push(q.slice(0, 400));
    const topical = q
      .replace(/['"]/g, " ")
      .replace(
        /\b(elucidate|discuss|analyse|analyze|examine|comment|critically|evaluate|explain|describe|illustrate|in\s+\d+\s+words)\b/gi,
        " "
      )
      .replace(
        /(चर्चा|विश्लेषण|आलोचनात्मक|स्पष्ट|परीक्षण|मूल्यांकन|विवेचना)\s*(कीजिए|करें|कीजिये)?/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    if (topical.length >= 20 && topical !== q.slice(0, 220)) {
      queries.push(topical);
    }
    // Mains-oriented angle for richer expected dimensions
    if (topical.length >= 16) {
      queries.push(
        `${topical} UPSC mains dimensions Articles committees schemes examples`
      );
    }
  }

  const fallback = [subject, paper, "UPSC mains answer framework"]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fallback.length >= 8) queries.push(fallback);

  return [...new Set(queries)].slice(0, 4);
}

function formatChunks(rows = []) {
  const parts = [];
  let used = 0;
  const seen = new Set();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const text = String(r.chunk || r.text || r.content || "").trim();
    if (!text || text.length < 40) continue;

    const fp = text.slice(0, 100).toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);

    const title = String(r.document?.title || r.title || "").trim();
    const topic = String(r.topic || r.chapter || r.heading || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const page = r.page != null ? `p${r.page}` : "";
    const kind =
      r.sourceKind === "website_notes"
        ? "Notes"
        : r.sourceKind === "kb_pdf"
          ? "KB"
          : "KB";
    // Prefer clean document title; skip noisy OCR chapter labels when title exists
    const topicOk =
      topic &&
      !/^[\d\sCCHAPTER]+$/i.test(topic) &&
      topic.length > 3 &&
      (!title || !title.toLowerCase().includes(topic.toLowerCase()));
    const label = [kind, title || null, topicOk ? topic : null, page]
      .filter(Boolean)
      .join(" · ");
    const block = `[${label || `KB ${i + 1}`}]\n${text}`;

    if (used + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    used += block.length + 2;
  }

  return parts.join("\n\n");
}

/** Round-robin across documents so Laxmikanth + notes both appear when available */
function diversifyByDocument(rows = [], limit = TOP_K) {
  if (!rows.length) return [];
  const buckets = new Map();
  for (const r of rows) {
    const id = String(r.documentId || r.document?.id || r.document?.title || "unknown");
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(r);
  }
  const queues = [...buckets.values()];
  const out = [];
  let i = 0;
  while (out.length < limit) {
    let added = false;
    for (const q of queues) {
      if (q.length && out.length < limit) {
        out.push(q.shift());
        added = true;
      }
    }
    if (!added) break;
    i += 1;
    if (i > limit * 3) break;
  }
  return out;
}

/**
 * Fetch MentorsDaily Admin Knowledge Base context for the answer question.
 * @returns {{ contextText: string, chunkCount: number, source: string, kbSubject: string|null, query: string, documents: string[] }}
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
    documents: [],
  };

  try {
    const qFp = fingerprintQuestion(questionText, subject);
    const cached = qFp ? getCachedKb(qFp) : null;
    if (cached?.contextText?.trim()) {
      recordCacheTokenSavings("kb-context", 800);
      return { ...cached, fromCache: true };
    }

    const hints = resolveKbSubjectHints({ subject, paper, questionText });
    const kbSubject = await resolveKbSubjectName(hints);
    const queries = buildSearchQueries({ questionText, subject, paper });
    if (!queries.length) return { ...empty, kbSubject };

    const seen = new Set();
    const merged = [];
    let source = "empty";
    let primaryQuery = queries[0];

    for (const query of queries) {
      const concepts = relatedConcepts(query);
      const expanded = [query, ...concepts.slice(0, 3)].join(" ");

      let result = await hybridSearch({
        query: expanded,
        filters: kbSubject ? { subject: kbSubject } : {},
        topK: TOP_K + 4,
        searchType: "hybrid",
      });

      let rows = result.results || [];

      // Soft retry without subject if filter too strict
      if (!rows.length && kbSubject) {
        result = await hybridSearch({
          query: expanded,
          filters: {},
          topK: TOP_K + 4,
          searchType: "hybrid",
        });
        rows = result.results || [];
      }

      primaryQuery = query;

      for (const hit of rows) {
        const key = String(hit.chunkId || hit.chunk?.slice?.(0, 80) || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(hit);
      }

      if (merged.length >= 8) break;
    }

    // Prefer diversity across KB documents (e.g. Laxmikanth + website notes)
    const diversified = diversifyByDocument(merged, TOP_K);
    const contextText = formatChunks(diversified);
    const documents = [
      ...new Set(
        diversified
          .map((r) => r.document?.title || r.title || "")
          .map((t) => String(t).trim())
          .filter(Boolean)
      ),
    ].slice(0, 8);

    const hasKbPdf = diversified.some(
      (r) => r.sourceKind !== "website_notes" && (r.documentId || r.document?.id)
    );
    const hasNotes = diversified.some((r) => r.sourceKind === "website_notes");

    if (contextText.length >= 80) {
      if (hasKbPdf && hasNotes) source = "knowledge_intelligence+notes";
      else if (hasKbPdf) source = "knowledge_intelligence";
      else if (hasNotes) source = "website_notes";
      else source = "knowledge_hybrid";
    }

    const payload = {
      contextText,
      chunkCount: diversified.length,
      source,
      kbSubject,
      query: primaryQuery,
      documents,
    };
    if (qFp && payload.contextText?.trim()) setCachedKb(qFp, payload);
    return payload;
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
  resolveKbSubjectHints,
  resolveKbSubjectName,
};
