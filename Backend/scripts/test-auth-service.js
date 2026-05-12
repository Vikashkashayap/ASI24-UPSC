import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loginUser } from "../src/services/authService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

async function testAuthService() {
  try {
    console.log("🔐 Testing auth service login...");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("❌ Admin credentials not set in environment variables");
      console.log("   Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file");
      return;
    }

    const result = await loginUser({
      email: adminEmail,
      password: adminPassword
    });

    console.log("✅ Login successful!");
    console.log("📤 User object returned:");
    console.log(JSON.stringify(result.user, null, 2));
    console.log("🔑 Token (first 50 chars):", result.token.substring(0, 50) + "...");

  } catch (error) {
    console.error("❌ Login failed:", error.message);
  }
}

testAuthService();