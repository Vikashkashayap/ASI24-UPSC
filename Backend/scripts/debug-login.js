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

    // Find the admin user
    const user = await User.findOne({ email: "adminai@gmail.com" });
    if (!user) {
      console.error("❌ Admin user not found");
      return;
    }

    console.log("👤 Found user:");
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Role type: ${typeof user.role}`);

    // Test password
    const isValidPassword = await user.comparePassword("adminai@#123");
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