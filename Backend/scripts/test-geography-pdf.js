/**
 * Quick test: Geography PDF → extract → chunk → embed
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const booksDir = "F:/books";
const files = fs.readdirSync(booksDir).filter(
  (f) => f.includes("Volume") && f.includes("5") && f.toLowerCase().includes("geography")
);
console.log("Found PDFs:", files);
if (!files.length) process.exit(1);

const pdfPath = path.join(booksDir, files[0]);
const buffer = fs.readFileSync(pdfPath);
console.log("PDF:", pdfPath);
console.log("Size:", (buffer.length / 1024 / 1024).toFixed(2), "MB");

const { extractPdfDocument } = await import("../src/services/notes/pdfExtract.service.js");
const extracted = await extractPdfDocument(buffer);
console.log("\n--- EXTRACTION ---");
console.log("Pages:", extracted.numPages);
console.log("Full text length:", extracted.fullText.length);
console.log("Sample:", extracted.fullText.slice(0, 250).replace(/\n/g, " "));

const { semanticChunkPages } = await import("../src/services/notes/semanticChunking.service.js");
const topics = semanticChunkPages(extracted.pages, {
  fallbackTitle: "Geography of World",
  source: "pdf",
});
const totalChunks = topics.reduce((s, t) => s + (t.chunks?.length || 0), 0);
console.log("\n--- CHUNKING ---");
console.log("Topics:", topics.length);
console.log("Total chunks:", totalChunks);
if (topics[0]) {
  console.log("First topic:", topics[0].title);
  const c0 = topics[0].chunks?.[0];
  if (c0) {
    const words = c0.text.split(/\s+/).filter(Boolean).length;
    console.log("First chunk words:", words);
    console.log("First chunk preview:", c0.text.slice(0, 200).replace(/\n/g, " "));
  }
}

const { embeddingService } = await import("../src/services/ai/embedding.service.js");
const { qdrantService } = await import("../src/services/ai/qdrant.service.js");
console.log("\n--- EMBEDDING / QDRANT ---");
console.log("Embedding configured:", embeddingService.isConfigured());
console.log("Provider:", embeddingService.getProviderLabel());
console.log("Model:", embeddingService.getModelName());
console.log("Dimension:", embeddingService.getDimension());
console.log("Qdrant configured:", qdrantService.isConfigured());

if (embeddingService.isConfigured() && topics[0]?.chunks?.[0]?.text) {
  const sample = topics[0].chunks[0].text.slice(0, 500);
  console.log("\nTesting single embedding (Jina passage)...");
  try {
    const vec = await embeddingService.generateEmbedding(sample, { task: "passage" });
    console.log("Embedding OK, dimension:", vec?.length);
  } catch (err) {
    console.error("Embedding FAILED:", err.message);
  }
}

if (qdrantService.isConfigured()) {
  try {
    const health = await qdrantService.health();
    console.log("Qdrant health:", JSON.stringify(health));
  } catch (err) {
    console.error("Qdrant health FAILED:", err.message);
  }
}

console.log("\n✅ Test complete");
