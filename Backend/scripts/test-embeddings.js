/**
 * Test Jina AI embedding connectivity and vector dimensions.
 *
 * Usage: npm run test:embeddings
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function fail(message, details) {
  const payload = details ? `\n${details}` : "";
  console.error(`❌ Embedding test failed: ${message}${payload}`);
  process.exitCode = 1;
}

async function main() {
  const { embeddingService } = await import("../src/services/ai/embedding.service.js");

  console.log("🔌 Embedding provider:", embeddingService.getProviderLabel());
  console.log("📦 Model:", embeddingService.getModelName());
  console.log("📐 Expected dimension:", embeddingService.getDimension());

  if (!embeddingService.isConfigured()) {
    return fail("Embedding service not configured — set JINA_API_KEY in .env");
  }

  console.log("\n🧪 Single embedding (retrieval.query)...");
  const started = Date.now();
  const vector = await embeddingService.generateEmbedding(
    "Indian monsoon climate patterns and rainfall distribution",
    { task: "query" }
  );
  const singleMs = Date.now() - started;

  if (!Array.isArray(vector) || !vector.length) {
    return fail("Single embedding returned null/empty");
  }
  if (vector.length !== embeddingService.getDimension()) {
    return fail(
      `Dimension mismatch: got ${vector.length}, expected ${embeddingService.getDimension()}`
    );
  }
  console.log(`✅ Single embedding OK (${vector.length}-dim) in ${singleMs}ms`);

  console.log("\n🧪 Batch embeddings (retrieval.passage)...");
  const batchStarted = Date.now();
  const texts = [
    "The Himalayas act as a climatic barrier influencing monsoon winds.",
    "Western Ghats receive orographic rainfall during southwest monsoon.",
    "Thar desert experiences arid climate with low annual precipitation.",
  ];
  const batch = await embeddingService.generateBatchEmbeddings(texts, { task: "passage" });
  const batchMs = Date.now() - batchStarted;

  const valid = batch.filter((v) => Array.isArray(v) && v.length === embeddingService.getDimension());
  if (valid.length !== texts.length) {
    return fail(`Batch embedding incomplete: ${valid.length}/${texts.length} valid vectors`);
  }
  console.log(`✅ Batch embedding OK (${texts.length} vectors) in ${batchMs}ms`);

  console.log("\n🏥 Health check...");
  const health = await embeddingService.healthCheck();
  if (!health.ok) {
    return fail("Health check failed", health.error);
  }
  console.log("✅ Health check OK in", health.durationMs, "ms");

  console.log("\n🎉 Jina embedding test completed successfully.");
  process.exitCode = 0;
}

main().catch((err) => {
  fail("Unexpected error", err?.message || String(err));
});
