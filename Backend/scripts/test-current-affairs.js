/**
 * Quick test: DB connection + CurrentAffair model (list/insert).
 * Run from Backend: node scripts/test-current-affairs.js
 * Requires: .env with MONGODB_URI or DATABASE_URL
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

import mongoose from "mongoose";
import CurrentAffair, { slugify } from "../src/models/CurrentAffair.js";

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/upsc-mentor";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected.\n");

  const existing = await CurrentAffair.countDocuments();
  console.log("Existing CurrentAffair count:", existing);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayList = await CurrentAffair.find({
    isActive: true,
    date: { $gte: today, $lt: tomorrow },
  }).lean();
  console.log("Today's active entries:", todayList.length);
  if (todayList.length > 0) {
    console.log("Sample:", todayList[0].title, "|", todayList[0].gsPaper, "|", todayList[0].slug);
  }

  if (existing === 0) {
    const slug = slugify("Test UPSC Current Affairs Article");
    await CurrentAffair.create({
      title: "Test UPSC Current Affairs Article",
      summary: "This is a test summary for verification.",
      keyPoints: ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
      gsPaper: "GS2",
      prelimsFocus: "Test prelims angle.",
      mainsAngle: "Test mains angle.",
      keywords: ["test", "upsc", "current", "affairs", "verification"],
      difficulty: "Easy",
      sourceUrl: "https://example.com",
      date: new Date(),
      slug,
      isActive: true,
    });
    console.log("\nInserted 1 test article (slug:", slug + ").");
  }

  const after = await CurrentAffair.find({ isActive: true }).limit(5).lean();
  console.log("\nTotal active now:", after.length);
  console.log("Test OK: CurrentAffair model and DB work.\n");
}

run()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
    process.exit(0);
  });
