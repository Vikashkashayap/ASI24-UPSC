/**
 * Generate 50 Polity assigned-practice questions (token pipeline test).
 * Usage: node scripts/generatePolity50Test.js
 *
 * Env overrides AFTER loadEnv for a reliable EN-only quality smoke
 * (Hindi still can be enabled in .env for production runs).
 */
import "../src/loadEnv.js";

process.env.PRACTICE_BATCH_SIZE = "3";
process.env.PRACTICE_GEN_BATCH_HINDI = "false";
process.env.NOTES_BATCH_CONTEXT_TOKENS = process.env.NOTES_BATCH_CONTEXT_TOKENS || "550";
process.env.PRACTICE_TARGET_CONTEXT_TOKENS = process.env.PRACTICE_TARGET_CONTEXT_TOKENS || "550";
process.env.PRACTICE_MAX_OUTPUT_TOKENS = "1500";
process.env.PRACTICE_GEN_TOKENS_PER_QUESTION = "280";
process.env.PRACTICE_BATCH_FILL_ROUNDS = "3";
process.env.BUFFER_EXTRA_OVERRIDE = "0";

const mongoose = (await import("mongoose")).default;
const { connectDB } = await import("../src/config/db.js");
const SourceUrl = (await import("../src/models/SourceUrl.js")).default;
const ContentChunk = (await import("../src/models/ContentChunk.js")).default;
const ContentTopic = (await import("../src/models/ContentTopic.js")).default;
const AssignedPracticeTest = (await import("../src/models/AssignedPracticeTest.js")).default;
const { User } = await import("../src/models/User.js");
const { runAssignedPracticeGeneration } = await import(
  "../src/services/ai/batchGenerator.service.js"
);

await connectDB();

const subjects = await SourceUrl.distinct("subject");
console.log("📚 Subjects:", subjects);

const politySources = await SourceUrl.find({
  subject: { $regex: /polit/i },
})
  .select("_id title subject")
  .lean();
console.log("📘 Polity sources:", politySources.length, politySources.slice(0, 5));

const sourceIds = politySources.map((s) => s._id);
if (!sourceIds.length) {
  console.error("No Polity sources found");
  process.exit(1);
}

const topTopics = await ContentChunk.aggregate([
  { $match: { sourceUrlId: { $in: sourceIds } } },
  { $group: { _id: "$topicId", n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 8 },
]);

const topicIds = [];
for (const row of topTopics) {
  if (!row._id) continue;
  const topic = await ContentTopic.findById(row._id).lean();
  console.log(`  topic ${row._id} chunks=${row.n} title=${topic?.title || topic?.name || "?"}`);
  topicIds.push(String(row._id));
}

if (!topicIds.length) {
  console.error("No Polity topics with chunks");
  process.exit(1);
}

// Prefer a few rich topics for focused RAG; or keyword mode across subject
const selected = topicIds.slice(0, 3);
const admin =
  (await User.findOne({ role: "admin" }).select("_id email").lean()) ||
  (await User.findOne().select("_id email").lean());

if (!admin) {
  console.error("No user found to set as createdBy");
  process.exit(1);
}

const title = `Token Test Polity 50Q ${new Date().toISOString().slice(0, 16)}`;
const record = await AssignedPracticeTest.create({
  title,
  subject: politySources[0]?.subject || "Polity",
  topic: "Polity (multi-topic token test)",
  chapter: "Token pipeline test",
  difficulty: "moderate",
  totalQuestions: 50,
  durationMinutes: 60,
  totalMarks: 100,
  status: "generating",
  generationProgress: {
    currentBatch: 0,
    totalBatches: 6,
    generatedQuestions: 0,
    isComplete: false,
    currentStep: "starting",
  },
  createdBy: admin._id,
  notesTopicId: selected[0],
  notesTopicIds: selected,
});

console.log(`\n🚀 Starting 50Q generation id=${record._id}`);
console.log(`   topics=${selected.join(", ")}`);
console.log(
  `   env context=${process.env.NOTES_BATCH_CONTEXT_TOKENS} promptMax=${process.env.PRACTICE_MAX_PROMPT_TOKENS} fill=${process.env.PRACTICE_BATCH_FILL_ROUNDS}`
);

const started = Date.now();
await runAssignedPracticeGeneration({
  assignedPracticeId: String(record._id),
  topicIds: selected,
  topicName: "Polity",
  subject: politySources[0]?.subject || "Polity",
  chapter: "Token pipeline test",
  difficulty: "moderate",
  patternsToInclude: ["statement_based", "direct_conceptual", "chronology"],
  questionCount: 50,
});

const fresh = await AssignedPracticeTest.findById(record._id).lean();
const qs = fresh?.questions?.length || 0;
const stats = fresh?.generationStats || {};
const batchesApprox = Math.max(1, Math.ceil((stats.poolGenerated || qs || 50) / 10));

console.log(
  JSON.stringify(
    {
      ok: qs >= 45,
      assignedPracticeId: String(record._id),
      title,
      status: fresh?.status,
      questions: qs,
      durationSec: Math.round((Date.now() - started) / 1000),
      generationStats: stats,
      avgInputPerBatch: stats.inputTokens
        ? Math.round(stats.inputTokens / batchesApprox)
        : null,
      errorMessage: fresh?.errorMessage || "",
      sampleStems: (fresh?.questions || []).slice(0, 2).map((q) =>
        String(q.question || q.question_en || "").slice(0, 120)
      ),
    },
    null,
    2
  )
);

await mongoose.disconnect();
process.exit(qs >= 45 ? 0 : 2);
