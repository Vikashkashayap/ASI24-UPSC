/**
 * Verify semantic search against Qdrant with Jina query embeddings.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { connectDB } = await import("../src/config/db.js");
const { searchKnowledgeBase } = await import("../src/rag/services/search.service.js");
const { qdrantService } = await import("../src/services/ai/qdrant.service.js");

await connectDB();

const health = await qdrantService.health();
console.log("Qdrant:", health);

const result = await searchKnowledgeBase({
  query: "Indian monsoon and rainfall patterns",
  topK: 3,
});

console.log("\nSearch source:", result.source);
console.log("Hits:", result.count);
console.log("Duration:", result.durationMs, "ms");
for (const hit of result.chunks || []) {
  console.log("\n--- Rank", hit.rank, "| score:", hit.score?.toFixed?.(4) ?? hit.score);
  console.log("Topic:", hit.heading || hit.topic);
  console.log("Preview:", (hit.text || "").slice(0, 180).replace(/\n/g, " "));
}

if (result.source !== "qdrant" || !result.count) {
  console.error("\n❌ Semantic search did not return Qdrant results");
  process.exit(1);
}

console.log("\n✅ Semantic search via Jina + Qdrant works");
process.exit(0);
