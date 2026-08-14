/**
 * Restore tests that exist in a backup file but are missing from live DB.
 *
 * Usage:
 *   node scripts/restoreTestsFromBackup.js
 *   node scripts/restoreTestsFromBackup.js --file Backend/backups/tests-backup-....json
 *   node scripts/restoreTestsFromBackup.js --archive
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import path from "path";
import {
  restoreMissingTestsFromBackup,
  restoreFromDeleteArchive,
} from "../src/services/testBackup.service.js";

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("No DATABASE_URL / MONGODB_URI");
  process.exit(1);
}

const fileIdx = process.argv.indexOf("--file");
const fileArg = fileIdx >= 0 ? process.argv[fileIdx + 1] : null;
const fromArchive = process.argv.includes("--archive");

await mongoose.connect(uri);
if (fromArchive) {
  const result = await restoreFromDeleteArchive({ includeUnsubmitted: false });
  console.log(result);
} else {
  const abs = fileArg ? path.resolve(fileArg) : null;
  const result = await restoreMissingTestsFromBackup(abs);
  console.log(result);
}
await mongoose.disconnect();
