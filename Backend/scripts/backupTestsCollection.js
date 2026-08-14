/**
 * Backup all Test documents to Backend/backups/
 * Usage: node scripts/backupTestsCollection.js
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { backupTestsCollection } from "../src/services/testBackup.service.js";

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("No DATABASE_URL / MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri);
const result = await backupTestsCollection({ reason: "cli" });
console.log(`OK ${result.count} tests → ${result.file}`);
await mongoose.disconnect();
