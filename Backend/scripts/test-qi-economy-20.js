/**
 * Smoke test: generate 20 Unique Qs for Economy topics and print quality report.
 * Usage: node scripts/test-qi-economy-20.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import { buildQuestionSet } from "../src/questionIntelligence/services/orchestrator.service.js";

const TOPICS =
  "Fundamentals of Economy, Money & Money Supply, Banking System in India";

async function main() {
  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error("DATABASE_URL missing");
  await mongoose.connect(uri);
  console.log("[test] Mongo connected");
  console.log("[test] Topics:", TOPICS);
  console.log("[test] Requesting 20 shown (pool = 30)");

  const started = Date.now();
  let lastLog = 0;

  const result = await buildQuestionSet(
    {
      subject: "Economy",
      topic: TOPICS,
      query: `Economy ${TOPICS}`,
      count: 20,
      difficulty: "moderate",
      allowGeneration: true,
      preferExtracted: true,
      async: true,
      onProgress: async (p) => {
        const now = Date.now();
        if (now - lastLog < 2500 && p.phase === "generating" && !p.isComplete) return;
        lastLog = now;
        const previewN = Array.isArray(p.previewQuestions) ? p.previewQuestions.length : 0;
        console.log(
          `[progress] phase=${p.phase} unique=${p.uniqueCount || 0}/${p.poolTarget || "?"} ` +
            `batch=${p.completedBatches || 0}/${p.totalBatches || "?"} preview=${previewN} ` +
            `(${Math.round((now - started) / 1000)}s)`
        );
      },
    },
    null
  );

  const ms = Date.now() - started;
  console.log("\n========== RESULT ==========");
  console.log("status:", result.status);
  console.log("showCount:", result.showCount, "poolTarget:", result.poolTarget);
  console.log("returned:", result.count);
  console.log("durationSec:", Math.round(ms / 1000));
  console.log("stats:", JSON.stringify(result.stats || {}, null, 2));
  console.log("generation:", JSON.stringify(result.generation || {}, null, 2));
  console.log("sources:", (result.sources || []).length);

  const qs = result.questions || [];
  let weakOpts = 0;
  let missingAns = 0;
  let shortStem = 0;
  let dupOpts = 0;

  qs.forEach((q, i) => {
    const stem = String(q.questionText || "").trim();
    const opts = Array.isArray(q.options) ? q.options : [];
    const texts = opts.map((o) => String(o.text || "").trim().toLowerCase()).filter(Boolean);
    if (stem.length < 40) shortStem += 1;
    if (!q.correctAnswer || !["A", "B", "C", "D"].includes(String(q.correctAnswer).toUpperCase())) {
      missingAns += 1;
    }
    if (new Set(texts).size !== texts.length) dupOpts += 1;
    const weak = opts.filter((o) => {
      const t = String(o.text || "").trim();
      if (!t) return true;
      if (/^\d+(?:\s*(?:and|,|only|[-–])\s*\d+)*.*$/i.test(t)) return false;
      return t.split(/\s+/).length < 2 && t.length < 8;
    }).length;
    if (weak) weakOpts += 1;

    if (i < 3) {
      console.log(`\n--- Q${i + 1} [${q.difficulty}] ans=${q.correctAnswer} ---`);
      console.log(stem.slice(0, 220));
      opts.forEach((o) => console.log(`  ${o.label}. ${String(o.text || "").slice(0, 100)}`));
      console.log("  explain:", String(q.explanation || "").slice(0, 140));
    }
  });

  console.log("\n========== QUALITY CHECK ==========");
  console.log({
    total: qs.length,
    shortStem,
    missingAns,
    dupOpts,
    weakOpts,
    extracted: qs.filter((q) => q.sourceType === "extracted").length,
    generated: qs.filter((q) => q.sourceType === "generated").length,
    validated: qs.filter((q) => q.validated).length,
  });

  const ok =
    qs.length >= 18 &&
    missingAns === 0 &&
    dupOpts === 0 &&
    result.status !== "failed";

  console.log(ok ? "\n✅ SMOKE TEST PASS" : "\n❌ SMOKE TEST ISSUES — see above");
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error("[test] FATAL:", err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
