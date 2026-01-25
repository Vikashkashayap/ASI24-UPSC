import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

async function debugLogin() {
  try {
    console.log("🔌 Connecting to database...");
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connected to database");

    // Find the admin user using environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("❌ ADMIN_EMAIL not set in environment variables");
      console.log("   Set ADMIN_EMAIL in your .env file");
      return;
    }

    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      console.error("❌ Admin user not found in database");
      console.log(`   Looking for email: ${adminEmail}`);
      return;
    }

    console.log("👤 Found user:");
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Role type: ${typeof user.role}`);

    // Test password using environment variables
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("❌ ADMIN_PASSWORD not set in environment variables");
      console.log("   Set ADMIN_PASSWORD in your .env file");
      return;
    }

    const isValidPassword = await user.comparePassword(adminPassword);
    console.log(`   Password valid: ${isValidPassword}`);

    // Check what gets returned when we select fields
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    console.log("\n📤 User data that would be sent:");
    console.log(JSON.stringify(userData, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugLogin();