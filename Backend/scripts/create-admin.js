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
 * Script to create an admin user
 * Usage: node scripts/create-admin.js <email> <password> <name>
 * Example: node scripts/create-admin.js admin@example.com admin123 "Admin User"
 */
async function createAdmin() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.error("❌ Usage: node scripts/create-admin.js <email> <password> <name>");
      console.error("Example: node scripts/create-admin.js admin@example.com admin123 \"Admin User\"");
      process.exit(1);
    }

    const [email, password, name] = args;

    // Connect to database
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ DATABASE_URL/MONGODB_URI is not defined in environment");
      process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    await mongoose.connect(uri);
    console.log("✅ Connected to database");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log("⚠️  Admin user already exists with this email");
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   Role: ${existingAdmin.role}`);
        console.log("\n💡 To update password, delete the user first or update manually in database");
        await mongoose.disconnect();
        process.exit(0);
      } else {
        // Update existing user to admin
        console.log("🔄 Updating existing user to admin role...");
        existingAdmin.role = "admin";
        const salt = await bcrypt.genSalt(10);
        existingAdmin.password = await bcrypt.hash(password, salt);
        existingAdmin.name = name;
        await existingAdmin.save();
        console.log("✅ User updated to admin successfully!");
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   Role: ${existingAdmin.role}`);
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    // Create new admin user
    console.log("👤 Creating admin user...");
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log("\n📋 Admin Details:");
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log("\n💡 You can now login with these credentials at /login");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    if (error.code === 11000) {
      console.error("   Email already exists in database");
    }
    process.exit(1);
  }
}

createAdmin();
