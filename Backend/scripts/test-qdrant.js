import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { QdrantClient } from "@qdrant/js-client-rest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

function fail(message, details) {
  const payload = details ? `\n${details}` : "";
  console.error(`❌ Qdrant test failed: ${message}${payload}`);
  process.exitCode = 1;
}

function assertEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value.trim();
}

async function main() {
  const QDRANT_URL = assertEnv("QDRANT_URL");
  const QDRANT_API_KEY = assertEnv("QDRANT_API_KEY");
  const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "notes_chunks";

  if (/localhost|127\.0\.0\.1/i.test(QDRANT_URL)) {
    return fail("QDRANT_URL must not point to localhost");
  }

  console.log("🔌 Testing Qdrant connection + API key...");
  let client;
  try {
    client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
  } catch (err) {
    return fail("Failed to initialize Qdrant client", err?.message || String(err));
  }

  try {
    // If the URL/auth is wrong, this typically throws (401/403/network error).
    await client.getCollections();
    console.log("✅ Connection + API key: OK");
  } catch (err) {
    return fail(
      "Connection or API key is invalid",
      `URL: ${QDRANT_URL}\nError: ${err?.message || String(err)}`
    );
  }

  console.log("📦 Ensuring collection exists (auto-create if missing)...");
  const { qdrantService } = await import("../src/services/ai/qdrant.service.js");
  try {
    // Uses env (QDRANT_COLLECTION / QDRANT_VECTOR_SIZE / QDRANT_DISTANCE).
    // If your vector size mismatches an existing collection, it may fail unless
    // you set QDRANT_RECREATE_ON_DIM_MISMATCH=true.
    await qdrantService.ensureCollection();
  } catch (err) {
    return fail(
      "Failed to ensure collection exists",
      `Collection: ${QDRANT_COLLECTION}\nError: ${err?.message || String(err)}`
    );
  }

  console.log("🔎 Verifying collection exists...");
  try {
    const info = await client.getCollection(QDRANT_COLLECTION);
    if (!info) return fail(`Collection not found: ${QDRANT_COLLECTION}`);
    console.log("✅ Collection exists:", QDRANT_COLLECTION);
  } catch (err) {
    return fail(
      `Collection missing or not accessible: ${QDRANT_COLLECTION}`,
      err?.message || String(err)
    );
  }

  console.log("🎉 Qdrant test completed successfully.");
  process.exitCode = 0;
}

main().catch((err) => {
  fail("Unexpected error", err?.message || String(err));
});

