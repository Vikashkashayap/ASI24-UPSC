import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

/**
 * Script to setup admin environment variables
 * This ensures admin credentials are properly configured
 */
function setupAdminEnv() {
  console.log("🔧 Setting up Admin Environment Variables");
  console.log("=" .repeat(50));

  // Check current admin configuration
  const currentAdminEmail = process.env.ADMIN_EMAIL;
  const currentAdminPassword = process.env.ADMIN_PASSWORD;

  console.log("📋 Current Admin Configuration:");
  console.log(`   ADMIN_EMAIL: ${currentAdminEmail || "Not set"}`);
  console.log(`   ADMIN_PASSWORD: ${currentAdminPassword ? "*".repeat(currentAdminPassword.length) : "Not set"}`);

  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log("\n❌ .env file not found!");
    console.log("   Please create a .env file in the Backend directory");
    console.log("   You can copy from env.example:");
    console.log("   cp env.example .env");
    process.exit(1);
  }

  // Read current .env content
  let envContent = fs.readFileSync(envPath, "utf8");

  // Check if admin vars are already set
  const hasAdminEmail = envContent.includes("ADMIN_EMAIL=");
  const hasAdminPassword = envContent.includes("ADMIN_PASSWORD=");

  if (hasAdminEmail && hasAdminPassword) {
    console.log("\n✅ Admin environment variables are already configured!");
    console.log("   You can login with:");
    console.log(`   Email: ${currentAdminEmail}`);
    console.log("   Password: [configured]");
  } else {
    console.log("\n⚠️  Admin environment variables not found in .env file");
    console.log("   Adding admin configuration...");

    // Add admin configuration template to .env (without actual credentials)
    const adminConfig = `

# Admin Configuration
# Replace these with your actual admin credentials
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password`;

    envContent += adminConfig;
    fs.writeFileSync(envPath, envContent);

    console.log("✅ Admin configuration template added to .env file!");
    console.log("   ⚠️  IMPORTANT: Update the ADMIN_EMAIL and ADMIN_PASSWORD values with your actual credentials!");
    console.log("   Please restart your server for changes to take effect.");
  }

  if (currentAdminEmail && currentAdminPassword) {
    console.log("\n🔑 Current Admin Login Credentials:");
    console.log(`   Email: ${currentAdminEmail}`);
    console.log("   Password: [configured]");
  } else {
    console.log("\n⚠️  Admin credentials not set!");
    console.log("   Please update ADMIN_EMAIL and ADMIN_PASSWORD in your .env file");
  }

  console.log("\n💡 How it works:");
  console.log("   1. Admin login checks database first");
  console.log("   2. If not found, checks environment variables");
  console.log("   3. Works across local and production environments");
  console.log("   4. No need to create admin user in database");

  console.log("\n🎉 Setup complete!");
}

setupAdminEnv();