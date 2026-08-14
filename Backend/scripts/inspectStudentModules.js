import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const sid = process.argv[2] || "6a57553a761bf85515560fbe";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.production") });

function esc(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicFromLine(line) {
  const raw = String(line || "").trim();
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren) return paren[1].trim();
  return raw.replace(/^[^:]+:\s*/, "").trim();
}

await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI);
const targets = mongoose.connection.db.collection("syllabusmoduletargets");
const tests = mongoose.connection.db.collection("tests");
const oid = new mongoose.Types.ObjectId(sid);

const mods = await targets
  .find({ assignedStudentIds: oid, status: "active" })
  .toArray();

console.log(`Student ${sid} — ${mods.length} assigned modules\n`);

for (const m of mods) {
  console.log(`=== ${m.moduleId} ${m.moduleName} (${m.subjectName}) ===`);
  for (const line of m.topicsPreview || []) {
    const variants = [line, topicFromLine(line)].filter(Boolean);
    let hasSub = null;
    let hasOpen = null;
    let canon = null;
    for (const v of variants) {
      if (!hasSub) {
        hasSub = await tests.findOne({
          userId: oid,
          isSubmitted: true,
          topic: new RegExp(`^${esc(v)}$`, "i"),
        });
      }
      if (!hasOpen) {
        hasOpen = await tests.findOne({
          userId: oid,
          isSubmitted: { $ne: true },
          topic: new RegExp(`^${esc(v)}$`, "i"),
        });
      }
      if (!canon) {
        canon = await tests.findOne({
          isSubmitted: true,
          examType: "GS",
          topic: new RegExp(`^${esc(v)}$`, "i"),
          totalQuestions: { $gte: 15 },
        });
      }
    }
    const status = hasSub ? "SUBMITTED" : hasOpen ? "IN-PROGRESS" : "MISSING";
    console.log(
      `  ${status.padEnd(11)} | ${String(line).slice(0, 72)} | canonical: ${canon ? "yes" : "no"}`
    );
  }
  console.log("");
}

await mongoose.disconnect();
