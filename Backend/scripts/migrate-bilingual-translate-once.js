/**
 * ONE-TIME Hindi translation for existing English-only questions.
 * Stores question_hi / options_hi / explanation_hi permanently in MongoDB.
 * Never runs during exam attempts.
 *
 * Usage:
 *   node scripts/migrate-bilingual-translate-once.js --dry-run
 *   node scripts/migrate-bilingual-translate-once.js
 *   node scripts/migrate-bilingual-translate-once.js --collection=AssignedPracticeTest
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import Test from "../src/models/Test.js";
import AssignedPracticeTest from "../src/models/AssignedPracticeTest.js";
import PrelimsMock from "../src/models/PrelimsMock.js";
import { hasStoredHindiContent } from "../src/services/bilingualQuestionStorage.js";
import { migrateQuestionsWithHindiOnce } from "../src/services/bilingualMigrationService.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const collectionArg = args.find((a) => a.startsWith("--collection="))?.split("=")[1];

const MODELS = {
  Test,
  AssignedPracticeTest,
  PrelimsMock,
};

async function processCollection(Model, label) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey && !dryRun) {
    throw new Error("OPENROUTER_API_KEY required for --translate-once migration");
  }

  const docs = await Model.find({ "questions.0": { $exists: true } });
  let docsUpdated = 0;
  let questionsTranslated = 0;
  let alreadyComplete = 0;

  for (const doc of docs) {
    const needsWork = doc.questions.some((q) => {
      const plain = typeof q.toObject === "function" ? q.toObject() : q;
      return !hasStoredHindiContent(plain);
    });
    if (!needsWork) continue;

    if (dryRun) {
      const missing = doc.questions.filter((q) => !hasStoredHindiContent(q)).length;
      console.log(`[dry-run] ${label} ${doc._id}: would translate ${missing} question(s)`);
      docsUpdated += 1;
      questionsTranslated += missing;
      continue;
    }

    const { questions, translated } = await migrateQuestionsWithHindiOnce(doc.questions, { apiKey });
    if (translated > 0) {
      doc.questions = questions;
      doc.markModified("questions");
      await doc.save();
      docsUpdated += 1;
      questionsTranslated += translated;
    }
    alreadyComplete += doc.questions.length - translated;
  }

  console.log(
    `${label}: ${docs.length} docs, ${docsUpdated} ${dryRun ? "would update" : "updated"}, ${questionsTranslated} questions translated, ${alreadyComplete} already had Hindi`
  );
}

async function main() {
  await connectDB();
  console.log(`One-time Hindi migration (dryRun=${dryRun})`);

  const targets = collectionArg
    ? [[collectionArg, MODELS[collectionArg]]]
    : Object.entries(MODELS);

  for (const [label, Model] of targets) {
    if (!Model) {
      console.error(`Unknown collection: ${collectionArg}`);
      process.exit(1);
    }
    await processCollection(Model, label);
  }

  await mongoose.disconnect();
  console.log("Done. Exam attempts will use zero AI tokens.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
