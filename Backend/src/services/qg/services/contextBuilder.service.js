/**
 * Context builder — merge Top-N reranked chunks into one clean context.
 * Preserves headings, lists, tables; removes duplicate paragraphs/facts.
 */

import crypto from "crypto";
import { QG_CONFIG } from "../config/qg.config.js";
import { estimateTokens } from "../../ai/tokenEstimator.service.js";

function fingerprint(text) {
  return crypto
    .createHash("sha1")
    .update(
      String(text || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2400)
    )
    .digest("hex");
}

function normalizeParagraph(p) {
  return String(p || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map(normalizeParagraph)
    .filter((p) => p.length >= 20);
}

function looksLikeTableOrList(text) {
  const t = String(text || "");
  if (/\|.+\|/.test(t)) return true;
  if (/(?:^|\n)\s*[-*•]\s+\S+/m.test(t)) return true;
  if (/(?:^|\n)\s*\d+[.)]\s+\S+/m.test(t)) return true;
  return false;
}

/**
 * @param {object[]} chunks
 * @param {{ maxTokens?: number, maxChars?: number }} opts
 */
export function buildMergedContext(chunks = [], opts = {}) {
  const maxTokens = opts.maxTokens || QG_CONFIG.context.maxTokens;
  const maxChars = opts.maxChars || QG_CONFIG.context.maxChars;

  const seenPara = new Set();
  const seenChunk = new Set();
  const sections = [];
  let usedTokens = 0;
  let usedChars = 0;

  for (let i = 0; i < (chunks || []).length; i += 1) {
    const c = chunks[i];
    const body = normalizeParagraph(c?.text);
    if (!body) continue;

    const chunkFp = fingerprint(body);
    if (seenChunk.has(chunkFp)) continue;
    seenChunk.add(chunkFp);

    const heading = String(c.heading || c.subTopic || "").trim().slice(0, 120);
    const metaBits = [];
    if (c.page != null) metaBits.push(`p.${c.page}`);
    if (c.book || c.chapter) metaBits.push(String(c.book || c.chapter).slice(0, 60));
    const meta = metaBits.length ? ` (${metaBits.join(", ")})` : "";

    const paras = splitParagraphs(body);
    const kept = [];
    for (const para of paras) {
      const fp = fingerprint(para);
      if (seenPara.has(fp)) continue;
      // Soft fact dedupe: skip near-identical short sentences already kept
      if (para.length < 180 && !looksLikeTableOrList(para)) {
        const soft = para.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim().slice(0, 120);
        if (soft && seenPara.has(`soft:${soft}`)) continue;
        if (soft) seenPara.add(`soft:${soft}`);
      }
      seenPara.add(fp);
      kept.push(para);
    }
    if (!kept.length) continue;

    const pieceBody = kept.join("\n\n");
    const header = heading ? `## ${heading}${meta}` : `## Excerpt ${i + 1}${meta}`;
    const piece = `${header}\n${pieceBody}`;
    const tokens = estimateTokens(piece);

    if (usedTokens + tokens > maxTokens || usedChars + piece.length > maxChars) {
      if (!sections.length) {
        // Always keep at least a truncated first chunk
        const room = Math.max(200, maxChars - usedChars);
        sections.push(piece.slice(0, room));
        usedTokens += estimateTokens(sections[0]);
        usedChars += sections[0].length;
      }
      break;
    }

    sections.push(piece);
    usedTokens += tokens;
    usedChars += piece.length;
  }

  const contextText = sections.join("\n\n").trim();
  return {
    contextText,
    tokens: estimateTokens(contextText),
    chars: contextText.length,
    sectionCount: sections.length,
    chunkIds: (chunks || [])
      .map((c) => String(c._id || c.mongoChunkId || c.chunkId || ""))
      .filter(Boolean),
  };
}

export default { buildMergedContext };
