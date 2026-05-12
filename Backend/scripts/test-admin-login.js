import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import bcrypt from "bcryptjs";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

/**
 * Script to test admin login
 */
async function testAdminLogin() {
  try {
    // Connect to database
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ DATABASE_URL/MONGODB_URI is not defined in environment");
      process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    await mongoose.connect(uri);
    console.log("✅ Connected to database");

    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("❌ Admin credentials not set in environment variables");
      console.error("   Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file");
      process.exit(1);
    }

    // Find the admin user
    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      console.error("❌ Admin user not found in database");
      console.log(`   Looking for email: ${adminEmail}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("👤 Found admin user:");
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password hash starts with: ${user.password.substring(0, 20)}...`);

    // Test password comparison
    console.log(`\n🔐 Testing password from environment`);

    const isMatch = await user.comparePassword(adminPassword);
    console.log(`   Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);

    // Let's also manually test bcrypt
    const manualMatch = await bcrypt.compare(adminPassword, user.password);
    console.log(`   Manual bcrypt compare: ${manualMatch ? '✅ YES' : '❌ NO'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testAdminLogin();