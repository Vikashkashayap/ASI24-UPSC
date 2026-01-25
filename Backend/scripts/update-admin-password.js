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
 * Script to update admin password
 * Usage: node scripts/update-admin-password.js <email> <newpassword>
 */
async function updateAdminPassword() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error("❌ Usage: node scripts/update-admin-password.js <email> <newpassword>");
      console.error("Example: node scripts/update-admin-password.js admin@example.com newpassword123");
      process.exit(1);
    }

    const [email, newPassword] = args;

    // Connect to database
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ DATABASE_URL/MONGODB_URI is not defined in environment");
      process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    await mongoose.connect(uri);
    console.log("✅ Connected to database");

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error("❌ User not found with email:", email);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("👤 Found user:", user.name, "(", user.role, ")");

    // Hash the new password
    console.log("🔐 Hashing new password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    console.log("✅ Password updated successfully!");
    console.log("\n🔐 New Login Credentials:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating password:", error.message);
    process.exit(1);
  }
}

updateAdminPassword();