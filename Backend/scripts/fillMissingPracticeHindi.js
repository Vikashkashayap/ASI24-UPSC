/**
 * Backfill missing Hindi on one AssignedPracticeTest and sync to in-progress attempts.
 *
 * Usage:
 *   node scripts/fillMissingPracticeHindi.js <assignedPracticeId>
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import AssignedPracticeTest from "../src/models/AssignedPracticeTest.js";
import Test from "../src/models/Test.js";
import { runInMigrationBatchContext } from "../src/middleware/examAiGuard.js";
import { batchTranslatePracticeQuestionsToHindi } from "../src/services/testGenerationService.js";
import { pickBilingualQuestionFields } from "../src/services/questionTranslationService.js";
import { getPracticeTranslationModel } from "../src/config/openRouterConfig.js";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/fillMissingPracticeHindi.js <assignedPracticeId>");
  process.exit(1);
}

function hasHi(q) {
  return /[\u0900-\u097F]/.test(String(q?.question_hi || ""));
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY required");

  await connectDB();
  const record = await AssignedPracticeTest.findById(id);
  if (!record) throw new Error(`AssignedPracticeTest ${id} not found`);

  const before = record.questions.filter(hasHi).length;
  console.log(`Before: ${before}/${record.questions.length} have Hindi`);

  const translated = await runInMigrationBatchContext(() =>
    batchTranslatePracticeQuestionsToHindi(
      apiKey,
      getPracticeTranslationModel(),
      record.questions.map((q) => (typeof q.toObject === "function" ? q.toObject() : { ...q }))
    )
  );

  record.questions = translated.map((q) => pickBilingualQuestionFields(q));
  record.markModified("questions");
  await record.save();

  const after = record.questions.filter(hasHi).length;
  console.log(`After: ${after}/${record.questions.length} have Hindi`);

  const attempts = await Test.find({
    assignedPracticeTestId: record._id,
    isSubmitted: { $ne: true },
  });
  let attemptsUpdated = 0;
  for (const test of attempts) {
    let changed = false;
    test.questions = test.questions.map((q, i) => {
      const src = record.questions[i];
      if (!src) return q;
      const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
      const next = pickBilingualQuestionFields({
        ...plain,
        question_hi: src.question_hi || plain.question_hi,
        options_hi: src.options_hi || plain.options_hi,
        explanation_hi: src.explanation_hi || plain.explanation_hi,
        matchColumns_hi: src.matchColumns_hi || plain.matchColumns_hi,
      });
      if (String(next.question_hi || "") !== String(plain.question_hi || "")) changed = true;
      return next;
    });
    if (changed) {
      test.markModified("questions");
      await test.save();
      attemptsUpdated += 1;
      console.log(`Synced Hindi → Test ${test._id}`);
    }
  }

  console.log(`Done. Synced ${attemptsUpdated} attempt(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
