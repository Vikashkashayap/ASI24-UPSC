/**
 * Background RAG jobs — ingest, reindex, rebuild.
 */

import {
  ingestPdfDocument,
  reindexDocument,
  rebuildEmbeddings,
} from "../services/ingest.service.js";
import { ragLogger } from "../utils/logger.js";

export async function runRagJob(name, data = {}) {
  ragLogger.info("rag.job.start", { name });

  switch (name) {
    case "ingest-pdf":
      return ingestPdfDocument(data);
    case "reindex-document":
      return reindexDocument(data.documentId, { force: data.force !== false });
    case "rebuild-embeddings":
      return rebuildEmbeddings({ subject: data.subject });
    default:
      throw new Error(`Unknown RAG job: ${name}`);
  }
}

export default { runRagJob };
