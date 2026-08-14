/**
 * Recover missing submitted Prelims history for module-target chapters
 * marked complete but with no submitted Test row (likely deleted by stale-cleanup bug).
 *
 * Rebuilds papers from the oldest canonical submitted test for the same topic.
 * Original scores/answers cannot be restored — recovered rows are marked submitted with score 0.
 *
 * Usage:
 *   node scripts/recoverPrelimsHistory.js           # dry-run
 *   node scripts/recoverPrelimsHistory.js --apply   # write to DB
 *   node scripts/recoverPrelimsHistory.js --apply --student <userId>
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.production") });

const APPLY = process.argv.includes("--apply");
const studentArgIdx = process.argv.indexOf("--student");
const ONLY_STUDENT = studentArgIdx >= 0 ? process.argv[studentArgIdx + 1] : null;

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("No DATABASE_URL / MONGODB_URI");
  process.exit(1);
}

function parseChapterTopic(line) {
  const raw = String(line || "").trim();
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren) return paren[1].trim();
  const m = raw.match(/^(?:ch(?:apter)?\.?\s*)?(\d+)\s*[-:.)]\s*(.+)$/i);
  if (m) return m[2].trim();
  const m2 = raw.match(/^(\d+)\s*[-.)]\s*(.+)$/);
  if (m2) return m2[2].trim();
  return raw;
}

function topicLookupVariants(topicName) {
  const base = String(topicName || "").trim();
  const variants = new Set([base]);
  const paren = base.match(/\(([^)]+)\)/);
  if (paren) variants.add(paren[1].trim());
  const beforeParen = base.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (beforeParen && beforeParen !== base) variants.add(beforeParen);
  return [...variants].filter(Boolean);
}

function normTopic(t) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function stripQuestionIds(questions = []) {
  return questions.map((q) => {
    const plain = { ...q };
    delete plain._id;
    plain.userAnswer = null;
    plain.timeSpent = 0;
    return plain;
  });
}

async function findCanonicalTest(tests, topicName) {
  const variants = topicLookupVariants(topicName);
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rows = await tests
      .find({
        topic: new RegExp(`^${escaped}$`, "i"),
        examType: "GS",
        isSubmitted: true,
        totalQuestions: { $gte: 15 },
        questions: { $exists: true, $not: { $size: 0 } },
        $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }],
        $and: [
          {
            $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }],
          },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(5)
      .toArray();
    if (rows.length) {
      return rows.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0))[0];
    }
  }
  return null;
}

async function studentHasSubmittedTopic(tests, userId, topicName) {
  const variants = topicLookupVariants(topicName);
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hit = await tests.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      topic: new RegExp(`^${escaped}$`, "i"),
      isSubmitted: true,
    });
    if (hit) return true;
  }
  return false;
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const tests = db.collection("tests");
const targets = db.collection("syllabusmoduletargets");

const gaps = [];
const activeTargets = await targets.find({ status: "active" }).toArray();

for (const rec of activeTargets) {
  for (const studentId of rec.assignedStudentIds || []) {
    const sid = String(studentId);
    if (ONLY_STUDENT && sid !== ONLY_STUDENT) continue;

    const entry = (rec.chapterCompletions || []).find((c) => String(c.studentId) === sid);
    const doneChapters = entry?.chapters || [];
    if (!doneChapters.length) continue;

    for (const ch of doneChapters) {
      const topicName = parseChapterTopic(ch);
      if (!topicName) continue;
      if (await studentHasSubmittedTopic(tests, sid, topicName)) continue;

      gaps.push({
        studentId: sid,
        moduleId: rec.moduleId,
        subjectName: rec.subjectName,
        chapter: ch,
        topicName,
      });
    }
  }
}

console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${gaps.length} missing submitted chapter test(s)\n`);

let restored = 0;
let skipped = 0;

for (const gap of gaps) {
  const canonical = await findCanonicalTest(tests, gap.topicName);
  if (!canonical) {
    skipped += 1;
    console.log(`SKIP (no canonical) student=${gap.studentId} topic="${gap.topicName}"`);
    continue;
  }

  const doc = {
    userId: new mongoose.Types.ObjectId(gap.studentId),
    subject: canonical.subject,
    examType: canonical.examType || "GS",
    topic: canonical.topic,
    difficulty: canonical.difficulty || "Hard",
    questions: stripQuestionIds(canonical.questions),
    totalQuestions: canonical.totalQuestions,
    durationMinutes: canonical.durationMinutes || 24,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
    isSubmitted: true,
    createdAt: canonical.createdAt || new Date(),
    updatedAt: new Date(),
    __recoveredFromTestId: String(canonical._id),
    __recoveredAt: new Date(),
    __recoveredReason: "chapter_complete_missing_history",
  };

  console.log(
    `RESTORE student=${gap.studentId} topic="${gap.topicName}" from canonical=${canonical._id} (${canonical.questions?.length || 0}Q)`
  );

  if (APPLY) {
    const { __recoveredFromTestId, __recoveredAt, __recoveredReason, ...insertDoc } = doc;
    const result = await tests.insertOne({
      ...insertDoc,
      recoveredFromTestId: __recoveredFromTestId,
      recoveredAt: __recoveredAt,
      recoveredReason: __recoveredReason,
    });
    console.log(`  -> inserted ${result.insertedId}`);
  }
  restored += 1;
}

console.log(`\nDone. Restorable=${restored}, skipped(no canonical)=${skipped}`);
if (!APPLY && restored > 0) {
  console.log("Run with --apply to write recovered tests to DB.");
}

await mongoose.disconnect();
