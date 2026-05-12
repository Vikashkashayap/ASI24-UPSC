import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import { PricingPlan } from "../src/models/PricingPlan.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

/** Default plans aligned with production marketing copy (local dev when DB is empty). */
const DEFAULT_PLANS = [
  {
    name: "Elite Plan",
    price: 999,
    duration: "Half-Yearly",
    description: "AI + Analytics + Strategic Edge",
    features: [
      "Includes everything in Analytics+",
      "Advanced AI Mentor",
      "Performance benchmarking",
      "Predictive readiness score",
      "Early access to new test releases",
      "Dedicated academic support",
    ],
    isPopular: false,
    status: "active",
  },
  {
    name: "Analytics+ Plan",
    price: 99,
    duration: "Monthly",
    description: "Data-Driven Aspirant",
    features: [
      "Includes everything in Prelims Pro",
      "Full DART Report",
      "MAP Report",
      "AI Mentor (unlimited queries)",
      "Personalized test recommendations",
      "Priority support",
    ],
    isPopular: false,
    status: "active",
  },
  {
    name: "Prelims Pro Plan",
    price: 69,
    duration: "Monthly",
    description: "Most popular starting point for prelims",
    features: [
      "Includes everything in Starter",
      "30+ Prelims Tests",
      "Detailed visual analytics dashboard",
      "AI Mentor (5 queries/day)",
      "Basic DART Report",
    ],
    isPopular: true,
    status: "active",
  },
];

async function main() {
  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing DATABASE_URL or MONGODB_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const activeCount = await PricingPlan.countDocuments({ status: "active" });
  if (activeCount > 0) {
    console.log(`Skip: already ${activeCount} active pricing plan(s).`);
    await mongoose.disconnect();
    return;
  }
  await PricingPlan.updateMany({ isPopular: true }, { $set: { isPopular: false } });
  await PricingPlan.insertMany(DEFAULT_PLANS);
  console.log(`Inserted ${DEFAULT_PLANS.length} active pricing plans.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
