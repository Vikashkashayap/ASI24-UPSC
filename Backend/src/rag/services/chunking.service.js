/**
 * Chunking facade — PDF semantic + web word-window chunkers used by Knowledge Base.
 * Prefer semanticChunking for PDFs (heading/list/table aware, ~500–800 words).
 */

export {
  semanticChunkDocument,
  semanticChunkPages,
  packBlocksIntoChunks,
  detectTopicsFromBlocks,
  SEMANTIC_CHUNK_DEFAULTS,
} from "../../services/notes/semanticChunking.service.js";

export {
  splitIntoChunks,
  estimateTokenCount,
  CHUNK_DEFAULTS,
} from "../../services/notes/chunking.service.js";

import { RAG_CONFIG } from "../config/rag.config.js";
import { semanticChunkDocument } from "../../services/notes/semanticChunking.service.js";
import { cleanExtractedText } from "../utils/textCleaner.js";

/**
 * Clean + semantic-chunk text with production RAG word targets.
 */
export function chunkForRag(rawText, opts = {}) {
  const text = cleanExtractedText(rawText);
  return semanticChunkDocument(text, {
    minWords: opts.minWords ?? RAG_CONFIG.chunkMinWords,
    maxWords: opts.maxWords ?? RAG_CONFIG.chunkMaxWords,
    overlapWords: opts.overlapWords ?? RAG_CONFIG.chunkOverlapWords,
    ...opts,
  });
}

export default { chunkForRag };
