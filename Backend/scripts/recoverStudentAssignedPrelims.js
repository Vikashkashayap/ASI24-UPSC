import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const sid = process.argv[2] || "6a57553a761bf85515560fbe";
const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, ".env.production") });

function esc(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicFromLine(line) {
  const raw = String(line || "").trim();
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren) return paren[1].trim();
  return raw.replace(/^[^:]+:\s*/, "").trim();
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

async function findCanonical(tests, variants) {
  for (const v of variants) {
    const row = await tests
      .find({
        topic: new RegExp(`^${esc(v)}$`, "i"),
        examType: "GS",
        isSubmitted: true,
        totalQuestions: { $gte: 15 },
        questions: { $exists: true, $not: { $size: 0 } },
      })
      .sort({ createdAt: 1 })
      .limit(1)
      .toArray();
    if (row[0]) return row[0];
  }
  return null;
}

async function hasSubmitted(tests, oid, variants) {
  for (const v of variants) {
    const hit = await tests.findOne({
      userId: oid,
      isSubmitted: true,
      topic: new RegExp(`^${esc(v)}$`, "i"),
    });
    if (hit) return true;
  }
  return false;
}

async function deleteEmptyOpenDuplicates(tests, oid, variants) {
  for (const v of variants) {
    const openRows = await tests
      .find({
        userId: oid,
        isSubmitted: { $ne: true },
        topic: new RegExp(`^${esc(v)}$`, "i"),
      })
      .toArray();
    for (const row of openRows) {
      const answered = (row.questions || []).some((q) => q?.userAnswer);
      if (!answered) {
        await tests.deleteOne({ _id: row._id, userId: oid, isSubmitted: { $ne: true } });
        console.log(`  removed empty in-progress duplicate ${row._id}`);
      }
    }
  }
}

await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI);
const tests = mongoose.connection.db.collection("tests");
const targets = mongoose.connection.db.collection("syllabusmoduletargets");
const oid = new mongoose.Types.ObjectId(sid);

const mods = await targets.find({ assignedStudentIds: oid, status: "active" }).toArray();
let restored = 0;
let skipped = 0;

console.log(`${APPLY ? "APPLY" : "DRY-RUN"} recover assigned-module prelims for ${sid}\n`);

for (const m of mods) {
  for (const line of m.topicsPreview || []) {
    const variants = [...new Set([line, topicFromLine(line)].filter(Boolean))];
    if (await hasSubmitted(tests, oid, variants)) {
      skipped += 1;
      continue;
    }

    const canonical = await findCanonical(tests, variants);
    if (!canonical) {
      console.log(`SKIP no canonical | ${String(line).slice(0, 70)}`);
      skipped += 1;
      continue;
    }

    // Use Hindi chapter label when assigned line has Devanagari (matches student UI)
    const useTopic = /[\u0900-\u097F]/.test(line) ? line : canonical.topic;
    const doc = {
      userId: oid,
      subject: canonical.subject || m.subjectName || "Geography",
      examType: "GS",
      topic: useTopic,
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
      recoveredFromTestId: String(canonical._id),
      recoveredAt: new Date(),
      recoveredReason: "assigned_module_missing_history",
    };

    console.log(`RESTORE | ${String(useTopic).slice(0, 70)} | from ${canonical._id}`);
    if (APPLY) {
      await deleteEmptyOpenDuplicates(tests, oid, variants);
      const res = await tests.insertOne(doc);
      console.log(`  -> inserted ${res.insertedId}`);
    }
    restored += 1;
  }
}

console.log(`\nDone. restored=${restored}, skipped=${skipped}`);
if (!APPLY && restored > 0) console.log("Run with --apply to write.");

await mongoose.disconnect();
