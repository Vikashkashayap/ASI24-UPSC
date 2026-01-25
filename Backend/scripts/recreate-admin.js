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
 * Script to recreate admin user
 */
async function recreateAdmin() {
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

    // Delete existing admin user
    const existingUser = await User.findOne({ email: "adminai@gmail.com" });
    if (existingUser) {
      console.log("🗑️  Deleting existing admin user...");
      await User.deleteOne({ email: "adminai@gmail.com" });
      console.log("✅ Existing admin user deleted");
    }

    // Create new admin user
    console.log("👤 Creating new admin user...");

    const admin = await User.create({
      name: "Admin AI",
      email: "adminai@gmail.com",
      password: "adminai@#123",  // Plain text - let pre-save middleware hash it
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log("\n📋 Admin Details:");
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);

    // Test the password immediately
    console.log("\n🔐 Testing password...");
    const isMatch = await admin.comparePassword("adminai@#123");
    console.log(`   Password verification: ${isMatch ? '✅ WORKS' : '❌ FAILS'}`);

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: adminai@gmail.com`);
    console.log(`   Password: adminai@#123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

recreateAdmin();