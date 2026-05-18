/**
 * Load .env before any other app modules read process.env.
 * Resolves paths relative to Backend/ (not PM2 cwd).
 */
import dotenv from "dotenv";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");

const candidates = [
  join(backendRoot, ".env"),
  join(process.cwd(), ".env"),
  join(process.cwd(), "Backend", ".env"),
];

let loadedFrom = null;
for (const envPath of candidates) {
  if (!existsSync(envPath)) continue;
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    loadedFrom = envPath;
    break;
  }
}

if (loadedFrom) {
  console.log("✅ .env loaded from:", loadedFrom);
} else {
  console.warn(
    "⚠️  No .env file found. Tried:",
    candidates.join(", ")
  );
}
