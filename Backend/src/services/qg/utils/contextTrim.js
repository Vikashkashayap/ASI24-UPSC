/**
 * Shrink CONTEXT payloads for LLM stages — keeps input tokens low
 * while preferring paragraphs that overlap the question / topic.
 */

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "are", "was",
  "were", "be", "by", "with", "as", "at", "from", "that", "this", "these", "those",
  "which", "who", "what", "when", "where", "how", "into", "about", "above", "after",
  "before", "between", "under", "over", "not", "only", "also", "than", "then", "such",
  "their", "there", "they", "them", "his", "her", "its", "our", "your", "can", "may",
  "will", "would", "should", "could", "have", "has", "had", "do", "does", "did",
  "following", "statements", "regarding", "consider", "select", "correct", "incorrect",
  "option", "options", "given", "above", "below", "none", "all",
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function splitBlocks(context) {
  return String(context || "")
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length >= 40);
}

function scoreBlock(block, terms) {
  if (!terms.length) return 0;
  const lower = block.toLowerCase();
  let hits = 0;
  for (const t of terms) {
    if (lower.includes(t)) hits += 1;
  }
  return hits;
}

/**
 * @param {string} context
 * @param {{
 *   query?: string,
 *   question?: object|string,
 *   maxChars?: number,
 *   preferSourceSpan?: boolean,
 * }} opts
 */
export function trimContextForLlm(context, opts = {}) {
  const raw = String(context || "").trim();
  const maxChars = Math.max(400, Number(opts.maxChars) || 1800);
  if (!raw) return "";
  if (raw.length <= maxChars) return raw;

  const qObj = opts.question && typeof opts.question === "object" ? opts.question : null;
  const qText =
    (typeof opts.question === "string" ? opts.question : "") ||
    qObj?.question ||
    qObj?.questionText ||
    qObj?.question_en ||
    "";
  const sourceSpan = String(qObj?.sourceSpan || "").trim();
  const query = String(opts.query || "").trim();

  const terms = [
    ...new Set([
      ...tokenize(qText),
      ...tokenize(query),
      ...tokenize(
        ["A", "B", "C", "D"]
          .map((k) => {
            if (qObj?.options?.[k]) return qObj.options[k];
            if (Array.isArray(qObj?.options)) {
              const hit = qObj.options.find((o) => String(o.label || "").toUpperCase() === k);
              return hit?.text || "";
            }
            return "";
          })
          .join(" ")
      ),
    ]),
  ].slice(0, 28);

  const blocks = splitBlocks(raw);
  if (!blocks.length) return raw.slice(0, maxChars);

  const ranked = blocks
    .map((block, idx) => ({ block, idx, score: scoreBlock(block, terms) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);

  const selected = [];
  const seen = new Set();
  let used = 0;

  const pushChunk = (text) => {
    const t = String(text || "").trim();
    if (!t) return;
    const fp = t.slice(0, 100).toLowerCase();
    if (seen.has(fp)) return;
    const room = maxChars - used - (selected.length ? 2 : 0);
    if (room < 60) return;
    const chunk = t.length <= room ? t : `${t.slice(0, room - 1)}…`;
    seen.add(fp);
    selected.push({ idx: selected.length, text: chunk });
    used += chunk.length + 2;
  };

  if (opts.preferSourceSpan !== false && sourceSpan.length >= 20) {
    pushChunk(sourceSpan.slice(0, Math.min(400, maxChars)));
  }

  for (const item of ranked) {
    if (used >= maxChars) break;
    if (item.score <= 0) continue;
    pushChunk(item.block);
  }

  // Under-filled: append contiguous head (still capped) so verify has enough evidence
  if (used < Math.min(maxChars, Math.floor(maxChars * 0.55))) {
    pushChunk(raw.slice(0, maxChars - used));
  }

  if (!selected.length) return raw.slice(0, maxChars);
  return selected.map((s) => s.text).join("\n\n");
}

export default { trimContextForLlm };
