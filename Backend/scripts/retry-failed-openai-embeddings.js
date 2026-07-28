/**
 * One-shot: reindex Failed embedding records using current EMBEDDING_PROVIDER (OpenAI).
 * Usage: node scripts/retry-failed-openai-embeddings.js
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { EmbeddingRecord } from "../src/intelligence/models/EmbeddingRecord.js";
import { indexProcessedDocument } from "../src/intelligence/services/embeddingIndex.service.js";
import { embeddingService } from "../src/services/ai/embedding.service.js";

await mongoose.connect(process.env.DATABASE_URL);
console.log(
  "provider",
  embeddingService.getProviderLabel(),
  embeddingService.getModelName(),
  "dim",
  embeddingService.getDimension(),
  "url",
  embeddingService.embedUrl,
  "configured",
  embeddingService.isConfigured()
);

const stuck = await EmbeddingRecord.find({
  status: { $in: ["Failed", "Generating", "Queued", "Pending", "Retry"] },
})
  .select("processedDocumentId status")
  .lean();
const pids = [
  ...new Set(stuck.map((f) => String(f.processedDocumentId || "")).filter(Boolean)),
];
console.log(
  "stuck records",
  stuck.length,
  "by status",
  stuck.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {}),
  "processed docs",
  pids.length
);

for (const pid of pids) {
  console.log("reindexing", pid, "...");
  const result = await indexProcessedDocument(pid);
  console.log(JSON.stringify(result));
}

const stats = await EmbeddingRecord.aggregate([
  { $group: { _id: "$status", n: { $sum: 1 } } },
]);
console.log("stats", stats);
await mongoose.disconnect();
