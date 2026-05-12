/**
 * Load .env BEFORE any other app code runs.
 * ES modules run all imports first, so this file must be the first import in server.js
 * so that GOOGLE_CLIENT_ID etc. are available when passport.js loads.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log("⚠️  .env not loaded:", envPath);
} else {
  console.log("✅ .env loaded from:", envPath);
}
