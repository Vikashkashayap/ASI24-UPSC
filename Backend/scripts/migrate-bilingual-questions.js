/**
 * Backfill bilingual fields on existing tests (no LLM).
 *
 * Usage:
 *   node scripts/migrate-bilingual-questions.js
 *   node scripts/migrate-bilingual-questions.js --hindi-fallback   # copy EN → empty HI fields
 *   node scripts/migrate-bilingual-questions.js --dry-run
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import Test from "../src/models/Test.js";
import AssignedPracticeTest from "../src/models/AssignedPracticeTest.js";
import PrelimsMock from "../src/models/PrelimsMock.js";
import {
  migrateQuestionBilingualFields,
  hasStoredHindiContent,
  questionNeedsHindiMigration,
} from "../src/services/bilingualQuestionStorage.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const hindiFallback = args.has("--hindi-fallback");

async function migrateCollection(Model, label) {
  const docs = await Model.find({ "questions.0": { $exists: true } });
  let docsUpdated = 0;
  let questionsMigrated = 0;
  let needsRealHindi = 0;

  for (const doc of docs) {
    let docChanged = false;
    const nextQuestions = doc.questions.map((q) => {
      const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
      const { question, changed } = migrateQuestionBilingualFields(plain, { hindiFallback });
      if (changed) {
        docChanged = true;
        questionsMigrated += 1;
      }
      if (questionNeedsHindiMigration(question)) needsRealHindi += 1;
      else if (!hasStoredHindiContent(question) && hindiFallback) needsRealHindi += 1;
      return question;
    });

    if (docChanged) {
      docsUpdated += 1;
      if (!dryRun) {
        doc.questions = nextQuestions;
        doc.markModified("questions");
        await doc.save();
      }
    }
  }

  console.log(
    `${label}: ${docs.length} docs scanned, ${docsUpdated} ${dryRun ? "would update" : "updated"}, ${questionsMigrated} questions normalized, ${needsRealHindi} still need real Hindi (regenerate via admin)`
  );
}

async function main() {
  await connectDB();
  console.log(
    `Bilingual migration (dryRun=${dryRun}, hindiFallback=${hindiFallback}) — no LLM calls`
  );

  await migrateCollection(Test, "Test");
  await migrateCollection(AssignedPracticeTest, "AssignedPracticeTest");
  await migrateCollection(PrelimsMock, "PrelimsMock");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
