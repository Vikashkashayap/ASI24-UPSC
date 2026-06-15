/**
 * Copy Hindi fields from AssignedPracticeTest / PrelimsMock into in-progress Test attempts.
 * No LLM — reads already-migrated parent documents.
 */
import "../src/loadEnv.js";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import Test from "../src/models/Test.js";
import AssignedPracticeTest from "../src/models/AssignedPracticeTest.js";
import PrelimsMock from "../src/models/PrelimsMock.js";
import { hasStoredHindiContent } from "../src/services/bilingualQuestionStorage.js";
import { pickBilingualQuestionFields } from "../src/services/questionTranslationService.js";

function mergeHindiIntoAttemptQuestion(attemptQ, sourceQ) {
  const src = pickBilingualQuestionFields(sourceQ);
  const out = { ...attemptQ };
  if (src.question_hi) out.question_hi = src.question_hi;
  if (src.options_hi) out.options_hi = { ...out.options_hi, ...src.options_hi };
  if (src.explanation_hi) out.explanation_hi = src.explanation_hi;
  out.question_en = out.question_en || src.question_en;
  out.options_en = out.options_en || src.options_en;
  return pickBilingualQuestionFields(out);
}

async function syncFromParent(Model, foreignKey) {
  const tests = await Test.find({
    [foreignKey]: { $exists: true, $ne: null },
    isSubmitted: { $ne: true },
  });

  let updated = 0;
  for (const test of tests) {
    const parentId = test[foreignKey];
    const parent = await Model.findById(parentId).lean();
    if (!parent?.questions?.length) continue;

    let changed = false;
    const questions = test.questions.map((q, i) => {
      const source = parent.questions[i];
      if (!source) return q;
      if (hasStoredHindiContent(q)) return q;
      if (!hasStoredHindiContent(source)) return q;
      changed = true;
      const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
      return mergeHindiIntoAttemptQuestion(plain, source);
    });

    if (changed) {
      test.questions = questions;
      test.markModified("questions");
      await test.save();
      updated += 1;
      console.log(`Synced Hindi → Test ${test._id} (${test.topic})`);
    }
  }
  return updated;
}

async function main() {
  await connectDB();
  const a = await syncFromParent(AssignedPracticeTest, "assignedPracticeTestId");
  const p = await syncFromParent(PrelimsMock, "prelimsMockId");
  console.log(`Done: ${a} assigned-practice attempts, ${p} prelims-mock attempts updated.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
