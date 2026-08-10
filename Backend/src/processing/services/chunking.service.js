import { sha256, wordCount, jaccardSimilarity } from "../utils/helpers.js";
import { chunkRepo } from "../repositories/index.js";
import { isNonContentHeading, isNonContentChunk } from "../../services/content/frontMatterFilter.js";

const MAX_CHUNK_WORDS = Number(process.env.PROCESSING_MAX_CHUNK_WORDS || 220);
const MIN_CHUNK_WORDS = Number(process.env.PROCESSING_MIN_CHUNK_WORDS || 40);

/**
 * Intelligent chunking by heading / topic / semantic paragraph boundaries.
 * NOT fixed-character splits.
 */
export function generateChunks(sections, { subject, chapter } = {}) {
  const chunks = [];
  let order = 0;
  let currentTopic = "";
  let buffer = [];
  let page = 1;
  let sectionType = "paragraph";
  let inNonContent = false;

  const flush = () => {
    const text = buffer.join("\n\n").trim();
    buffer = [];
    if (!text) return;
    const wc = wordCount(text);
    if (wc < 8) return;

    if (wc > MAX_CHUNK_WORDS) {
      // split on paragraph boundaries only
      const paras = text.split(/\n{2,}/);
      let part = [];
      let partWords = 0;
      for (const p of paras) {
        const pw = wordCount(p);
        if (partWords + pw > MAX_CHUNK_WORDS && part.length) {
          const chunkText = part.join("\n\n");
          if (
            !isNonContentChunk({
              chunkText,
              heading: currentTopic,
              topic: currentTopic,
              sectionType,
              page,
            })
          ) {
            chunks.push(makeChunk({ chunkText, page, subject, chapter, currentTopic, sectionType, order: order++ }));
          }
          part = [];
          partWords = 0;
        }
        part.push(p);
        partWords += pw;
      }
      if (part.length) {
        const chunkText = part.join("\n\n");
        if (
          !isNonContentChunk({
            chunkText,
            heading: currentTopic,
            topic: currentTopic,
            sectionType,
            page,
          })
        ) {
          chunks.push(makeChunk({ chunkText, page, subject, chapter, currentTopic, sectionType, order: order++ }));
        }
      }
      return;
    }

    if (
      isNonContentChunk({
        chunkText: text,
        heading: currentTopic,
        topic: currentTopic,
        sectionType,
        page,
      })
    ) {
      return;
    }
    chunks.push(makeChunk({ chunkText: text, page, subject, chapter, currentTopic, sectionType, order: order++ }));
  };

  for (const sec of sections || []) {
    if (["title", "heading", "subheading"].includes(sec.sectionType)) {
      if (isNonContentHeading(sec.text)) {
        inNonContent = true;
        buffer = [];
        currentTopic = "";
        continue;
      }
      inNonContent = false;
      // new semantic boundary
      if (wordCount(buffer.join(" ")) >= MIN_CHUNK_WORDS) flush();
      else if (buffer.length) {
        // tiny leftover attaches to heading context later
      }
      currentTopic = sec.text;
      page = sec.pageNumber || page;
      sectionType = sec.sectionType;
      buffer.push(sec.text);
      flush();
      continue;
    }
    if (inNonContent) continue;
    if (["question", "options", "answer", "explanation"].includes(sec.sectionType)) {
      // questions are stored separately — skip from notes chunks
      continue;
    }
    page = sec.pageNumber || page;
    sectionType = sec.sectionType;
    buffer.push(sec.text);
    if (wordCount(buffer.join(" ")) >= MAX_CHUNK_WORDS) flush();
  }
  flush();
  return chunks;
}

function makeChunk({ chunkText, page, subject, chapter, currentTopic, sectionType, order }) {
  return {
    chunkText,
    chunkHash: sha256(chunkText.toLowerCase()),
    page,
    subject: subject || "",
    chapter: chapter || "",
    topic: currentTopic || "",
    chunkOrder: order,
    wordCount: wordCount(chunkText),
    sectionType,
  };
}

export async function persistChunks({
  chunks,
  processedDocumentId,
  documentId,
}) {
  const hashes = chunks.map((c) => c.chunkHash);
  const existing = await chunkRepo.findRecentHashes(hashes);
  const byHash = new Map(existing.map((e) => [e.chunkHash, e]));

  const docs = chunks.map((c) => {
    const dup = byHash.get(c.chunkHash);
    let isDuplicate = Boolean(dup);
    let duplicateOf = dup?._id || null;
    if (!dup) {
      // soft similarity against same-batch only handled via hash
    }
    return {
      processedDocumentId,
      documentId,
      ...c,
      isDuplicate,
      duplicateOf,
      embeddingStatus: "idle",
    };
  });

  // Intra-batch duplicate by similarity
  for (let i = 0; i < docs.length; i += 1) {
    if (docs[i].isDuplicate) continue;
    for (let j = 0; j < i; j += 1) {
      if (docs[j].isDuplicate) continue;
      if (jaccardSimilarity(docs[i].chunkText, docs[j].chunkText) >= 0.92) {
        docs[i].isDuplicate = true;
        docs[i].duplicateOf = null; // same batch — flag only
        break;
      }
    }
  }

  if (docs.length) await chunkRepo.insertMany(docs);
  return {
    saved: docs.length,
    duplicates: docs.filter((d) => d.isDuplicate).length,
  };
}
