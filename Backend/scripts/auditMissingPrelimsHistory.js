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

function parseChapterTopic(line) {
  const raw = String(line || "").trim();
  const m = raw.match(/^(?:ch(?:apter)?\.?\s*)?(\d+)\s*[-:.)]\s*(.+)$/i);
  if (m) return m[2].trim();
  const m2 = raw.match(/^(\d+)\s*[-.)]\s*(.+)$/);
  if (m2) return m2[2].trim();
  return raw;
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
    const entry = (rec.chapterCompletions || []).find((c) => String(c.studentId) === sid);
    const doneChapters = entry?.chapters || [];
    if (!doneChapters.length) continue;

    const studentTests = await tests
      .find({ userId: new mongoose.Types.ObjectId(sid), isSubmitted: true, examType: "GS" })
      .project({ topic: 1 })
      .toArray();
    const submittedTopics = new Set(
      studentTests.map((t) =>
        String(t.topic || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
      )
    );

    for (const ch of doneChapters) {
      const topicName = parseChapterTopic(ch);
      const key = topicName.toLowerCase().replace(/\s+/g, " ");
      if (submittedTopics.has(key)) continue;

      const moduleFinalKey = `${String(rec.moduleId || "").trim()} module final — ${String(rec.moduleName || "").trim()}`
        .trim()
        .toLowerCase();
      if (submittedTopics.has(moduleFinalKey)) continue;

      gaps.push({
        studentId: sid,
        moduleId: rec.moduleId,
        moduleName: rec.moduleName,
        subjectKey: rec.subjectKey,
        subjectName: rec.subjectName,
        chapter: ch,
        topicName,
      });
    }
  }
}

console.log(`Found ${gaps.length} completed chapter(s) without submitted test history\n`);
for (const g of gaps.slice(0, 50)) {
  console.log(`- student=${g.studentId} | ${g.moduleId} | topic="${g.topicName}"`);
}
if (gaps.length > 50) console.log(`... and ${gaps.length - 50} more`);

await mongoose.disconnect();
