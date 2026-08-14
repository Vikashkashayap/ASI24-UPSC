/**
 * 1) Fix submitted tests that exist but don't show (userId stored as string).
 * 2) Recover missing submitted papers for completed module chapters from canonical DB papers.
 *
 * Usage:
 *   node scripts/fixAndRecoverAllPrelimsHistory.js
 *   node scripts/fixAndRecoverAllPrelimsHistory.js --apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.production") });

const APPLY = process.argv.includes("--apply");
const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("No DATABASE_URL");
  process.exit(1);
}

function esc(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function topicVariants(topicName) {
  const base = String(topicName || "").trim();
  const set = new Set([base]);
  const parenAll = [...base.matchAll(/\(([^)]+)\)/g)];
  for (const p of parenAll) set.add(p[1].trim());
  const beforeParen = base.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (beforeParen) set.add(beforeParen);
  set.add(base.replace(/[–—−]/g, "-"));
  set.add(base.replace(/-/g, "–"));
  return [...set].filter(Boolean);
}

function norm(t) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, "-")
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

await mongoose.connect(uri);
const db = mongoose.connection.db;
const tests = db.collection("tests");
const targets = db.collection("syllabusmoduletargets");

console.log(APPLY ? "APPLY" : "DRY-RUN");

// --- 1) Submitted tests that don't show because userId is a string ---
const stringUserIdTests = await tests
  .find({
    isSubmitted: true,
    userId: { $type: "string" },
  })
  .toArray();

console.log(`\n[1] Submitted tests with string userId: ${stringUserIdTests.length}`);
let fixedIds = 0;
for (const t of stringUserIdTests) {
  if (!mongoose.Types.ObjectId.isValid(t.userId)) {
    console.log(`  skip invalid userId string ${t.userId} test=${t._id}`);
    continue;
  }
  console.log(`  FIX userId string→ObjectId test=${t._id} user=${t.userId} topic="${String(t.topic).slice(0, 50)}"`);
  if (APPLY) {
    await tests.updateOne(
      { _id: t._id },
      { $set: { userId: new mongoose.Types.ObjectId(t.userId) } }
    );
  }
  fixedIds += 1;
}

// --- 2) Unsubmitted tests that already have a score (look submitted, not shown) ---
const scoredOpen = await tests
  .find({
    isSubmitted: { $ne: true },
    score: { $gt: 0 },
  })
  .toArray();
console.log(`\n[2] Unsubmitted tests with score>0: ${scoredOpen.length}`);
let markedSubmitted = 0;
for (const t of scoredOpen) {
  console.log(
    `  MARK submitted test=${t._id} user=${t.userId} topic="${String(t.topic).slice(0, 50)}" score=${t.score}`
  );
  if (APPLY) {
    await tests.updateOne({ _id: t._id }, { $set: { isSubmitted: true } });
  }
  markedSubmitted += 1;
}

// Preload submitted tests per student for matching
const allSubmitted = await tests
  .find({ isSubmitted: true })
  .project({ userId: 1, topic: 1, totalQuestions: 1, questions: 1, createdAt: 1, subject: 1, difficulty: 1, examType: 1, durationMinutes: 1 })
  .toArray();

const submittedByUser = new Map();
const canonicalByNormTopic = new Map();
for (const t of allSubmitted) {
  const uid = String(t.userId || "");
  if (!submittedByUser.has(uid)) submittedByUser.set(uid, []);
  submittedByUser.get(uid).push(t);
  const key = norm(t.topic);
  const prev = canonicalByNormTopic.get(key);
  const qLen = t.questions?.length || 0;
  if (!prev || qLen > (prev.questions?.length || 0)) {
    canonicalByNormTopic.set(key, t);
    for (const v of topicVariants(t.topic)) {
      const vk = norm(v);
      const existing = canonicalByNormTopic.get(vk);
      if (!existing || qLen > (existing.questions?.length || 0)) {
        canonicalByNormTopic.set(vk, t);
      }
    }
  }
}

function studentHasTopic(uid, variants) {
  const rows = submittedByUser.get(String(uid)) || [];
  const keys = new Set(variants.map(norm));
  return rows.some((t) => keys.has(norm(t.topic)));
}

function significantWords(t) {
  return norm(t)
    .replace(/[^a-z0-9\u0900-\u097f\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !/^(chapter|adhyay|part|with|from|their|and|the)$/i.test(w));
}

function topicsClose(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if ((na.includes(nb) && nb.length >= 8) || (nb.includes(na) && na.length >= 8)) return true;
  const wa = significantWords(a);
  const wb = significantWords(b);
  if (!wa.length || !wb.length) return false;
  const [shortW, longW] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  const longSet = new Set(longW);
  const contained = shortW.filter((w) => longSet.has(w)).length;
  if (contained === shortW.length && shortW.length >= 1) return true;
  const need = Math.max(2, Math.ceil(Math.min(wa.length, wb.length) * 0.7));
  return contained >= need;
}

function findCanonical(variants) {
  for (const v of variants) {
    const hit = canonicalByNormTopic.get(norm(v));
    if (hit && (hit.questions?.length || 0) >= 15 && topicsClose(v, hit.topic)) return hit;
  }
  return null;
}

// --- 3) Completed chapters without a submitted test ---
const activeTargets = await targets.find({ status: "active" }).toArray();
let restored = 0;
let skippedNoCanon = 0;
let alreadyOk = 0;

console.log(`\n[3] Recover missing submitted history for completed chapters`);

for (const rec of activeTargets) {
  for (const studentId of rec.assignedStudentIds || []) {
    const sid = String(studentId);
    const entry = (rec.chapterCompletions || []).find((c) => String(c.studentId) === sid);
    const doneChapters = entry?.chapters || [];
    if (!doneChapters.length) continue;

    for (const ch of doneChapters) {
      const variants = [
        ch,
        parseChapterTopic(ch),
        ...topicVariants(parseChapterTopic(ch)),
      ];
      const uniq = [...new Set(variants.filter(Boolean))];
      if (studentHasTopic(sid, uniq)) {
        alreadyOk += 1;
        continue;
      }

      const canonical = findCanonical(uniq);
      if (!canonical) {
        skippedNoCanon += 1;
        console.log(`  SKIP no paper | student=${sid} | ${String(ch).slice(0, 70)}`);
        continue;
      }

      const useTopic = /[\u0900-\u097F]/.test(ch) ? ch : canonical.topic;
      const oid = mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : null;
      if (!oid) continue;

      const doc = {
        userId: oid,
        subject: canonical.subject || rec.subjectName,
        examType: canonical.examType || "GS",
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
        recoveredReason: "completed_chapter_missing_submitted_history",
      };

      console.log(
        `  RESTORE student=${sid} | ${String(useTopic).slice(0, 60)} | from ${canonical._id}`
      );
      if (APPLY) {
        await tests.insertOne(doc);
        submittedByUser.get(sid)?.push({ topic: useTopic, userId: oid }) ||
          submittedByUser.set(sid, [{ topic: useTopic, userId: oid }]);
        if (!submittedByUser.has(sid)) submittedByUser.set(sid, [{ topic: useTopic }]);
        else submittedByUser.get(sid).push({ topic: useTopic });
      }
      restored += 1;
    }
  }
}

console.log(`
Done.
  string userId fixed: ${fixedIds}
  scored-open marked submitted: ${markedSubmitted}
  completed chapters already had test: ${alreadyOk}
  restored from canonical: ${restored}
  skipped (no paper in DB): ${skippedNoCanon}
`);
if (!APPLY) console.log("Run with --apply to write to DB.");

await mongoose.disconnect();
