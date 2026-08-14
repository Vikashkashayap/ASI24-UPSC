import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.production") });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("No DATABASE_URL / MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const tests = db.collection("tests");
const targets = db.collection("syllabusmoduletargets");

const totalSubmitted = await tests.countDocuments({ isSubmitted: true });
const totalAll = await tests.countDocuments({});
console.log("Total tests:", totalAll, "| Submitted:", totalSubmitted, "| Unsubmitted:", totalAll - totalSubmitted);

const studentIds = process.argv.slice(2);
const defaultIds = ["69c3a36fd00e09211f71d5a9", "6a57553a761bf85515560fbe"];
const ids = studentIds.length ? studentIds : defaultIds;

for (const id of ids) {
  const oid = new mongoose.Types.ObjectId(id);
  const rows = await tests
    .find({ userId: oid })
    .sort({ createdAt: -1 })
    .project({ topic: 1, isSubmitted: 1, score: 1, accuracy: 1, createdAt: 1, subject: 1 })
    .toArray();
  console.log(`\n=== Student ${id} — ${rows.length} test doc(s) ===`);
  for (const r of rows) {
    console.log(
      `  ${r.isSubmitted ? "SUBMITTED" : "open"} | ${r.subject} | ${String(r.topic || "").slice(0, 60)} | score=${r.score} acc=${r.accuracy} | ${r.createdAt}`
    );
  }

  const assigned = await targets
    .find({ assignedStudentIds: oid, status: "active" })
    .project({ moduleId: 1, moduleName: 1, topicsPreview: 1, chapterCompletions: 1 })
    .toArray();

  for (const rec of assigned) {
    const entry = (rec.chapterCompletions || []).find((c) => String(c.studentId) === id);
    const doneChapters = entry?.chapters || [];
    if (!doneChapters.length) continue;
    console.log(`  Module ${rec.moduleId}: completed chapters in target record: ${doneChapters.length}`);
    for (const ch of doneChapters) {
      const topicMatch = String(ch).replace(/^[^:]+:\s*/, "").trim();
      const hasTest = rows.some(
        (t) =>
          t.isSubmitted &&
          String(t.topic || "")
            .trim()
            .toLowerCase() === topicMatch.toLowerCase()
      );
      if (!hasTest) {
        console.log(`    MISSING submitted test for completed chapter topic: "${topicMatch}"`);
        const canon = await tests
          .find({
            topic: new RegExp(`^${topicMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            isSubmitted: true,
            examType: "GS",
          })
          .sort({ createdAt: 1 })
          .limit(1)
          .project({ _id: 1, userId: 1, topic: 1, score: 1, createdAt: 1 })
          .toArray();
        const canonDoc = canon[0];
        if (canonDoc) {
          console.log(
            `      -> canonical paper exists from user ${canonDoc.userId} test ${canonDoc._id} (${canonDoc.createdAt})`
          );
        } else {
          console.log("      -> no canonical submitted paper found in DB for this topic");
        }
      }
    }
  }
}

await mongoose.disconnect();
