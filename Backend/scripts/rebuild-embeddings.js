/**
 * Rebuild embeddings for all synced PDF chapters (Jina → Qdrant).
 *
 * Usage: npm run rebuild:embeddings
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { connectDB } = await import("../src/config/db.js");
const { rebuildEmbeddings } = await import("../src/rag/services/ingest.service.js");
const { embeddingService } = await import("../src/services/ai/embedding.service.js");
const { qdrantService } = await import("../src/services/ai/qdrant.service.js");

await connectDB();

console.log("Provider:", embeddingService.getProviderLabel());
console.log("Model:", embeddingService.getModelName());
console.log("Dimension:", embeddingService.getDimension());

if (!embeddingService.isConfigured()) {
  console.error("❌ Embedding not configured — set JINA_API_KEY");
  process.exit(1);
}
if (!qdrantService.isConfigured()) {
  console.error("❌ Qdrant not configured — set QDRANT_URL + QDRANT_API_KEY");
  process.exit(1);
}

await qdrantService.ensureCollection();
console.log("📦 Qdrant collection ready:", process.env.QDRANT_COLLECTION);

const subject = process.argv[2] || undefined;
console.log(subject ? `🔄 Rebuilding subject: ${subject}` : "🔄 Rebuilding all chapters...");

const result = await rebuildEmbeddings({ subject });
console.log(`\n✅ Rebuilt ${result.rebuilt} chapter(s)`);
for (const row of result.results) {
  if (row.error) {
    console.log("  ❌", row.title, "—", row.error);
  } else {
    console.log("  ✅", row.title, "— indexed:", row.indexed ?? 0);
  }
}

process.exit(0);
