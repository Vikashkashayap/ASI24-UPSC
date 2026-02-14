/**
 * Full flow test: Create sample PDF -> Upload via create -> Start test -> Verify questions
 * Run: cd Backend && node scripts/create-sample-pdf.js && node scripts/test-prelims-full-flow.js
 */
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_URL = process.env.API_URL || "http://localhost:5000";

async function main() {
  const questionPdf = path.join(__dirname, "..", "sample-questions.pdf");
  const answerPdf = path.join(__dirname, "..", "sample-answerkey.pdf");

  if (!fs.existsSync(questionPdf)) {
    console.error("Run: node scripts/create-sample-pdf.js first");
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  console.log("=== Prelims PDF Full Flow Test ===\n");

  try {
    console.log("1. Admin login...");
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    const token = loginRes.data.token || loginRes.data.data?.token;
    if (!token) throw new Error("No token");
    console.log("   OK\n");

    console.log("2. Create test with PDF (manual create + question + solution PDF)...");
    const formData = new FormData();
    formData.append("title", `PDF Flow Test ${Date.now()}`);
    formData.append("totalQuestions", "10");
    formData.append("totalMarks", "20");
    formData.append("negativeMarking", "0.66");
    formData.append("durationMinutes", "30");
    formData.append("startTime", "2025-01-01T00:00:00.000Z");
    formData.append("endTime", "2026-12-31T23:59:59.000Z");
    formData.append("questionPdf", new Blob([fs.readFileSync(questionPdf)], { type: "application/pdf" }), "sample-questions.pdf");
    formData.append("solutionPdf", new Blob([fs.readFileSync(answerPdf)], { type: "application/pdf" }), "sample-answerkey.pdf");

    const createRes = await axios.post(`${API_URL}/api/admin/prelims-test/create`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    if (!createRes.data?.success) {
      throw new Error(createRes.data?.message || "Create failed");
    }
    const testId = createRes.data.data._id;
    const totalQ = createRes.data.data.totalQuestions;
    console.log(`   OK - Test ID: ${testId}, Questions: ${totalQ}\n`);

    console.log("3. Start test (student fetch questions)...");
    const startRes = await axios.post(
      `${API_URL}/api/student/prelims-test/start/${testId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const test = startRes.data?.data?.test;
    const questions = test?.questions || [];
    if (questions.length === 0) {
      throw new Error("No questions returned to student!");
    }
    console.log(`   OK - Got ${questions.length} questions\n`);

    console.log("4. Verify first question (should match PDF content):");
    const q1 = questions[0];
    const qText = q1.questionEnglish || q1.questionHindi || q1.question || "";
    const opts = q1.options || [];
    console.log("   Question:", qText.substring(0, 100) + (qText.length > 100 ? "..." : ""));
    const optArr = Array.isArray(opts) ? opts : Object.entries(opts).map(([k, v]) => ({ key: k, textEnglish: v }));
    optArr.forEach((o) => {
      const txt = o.textEnglish || o.textHindi || o.text || "";
      console.log(`   (${o.key}) ${(txt || "(empty)").substring(0, 60)}`);
    });

    const hasRealOptions = optArr.some((o) => {
      const t = (o.textEnglish || o.textHindi || o.text || "").trim();
      return t.length > 2 && !t.toLowerCase().includes("option ");
    });

    if (!hasRealOptions) {
      console.log("\n   WARN: Options appear to be placeholders. Check parsing.");
    } else {
      console.log("\n   OK: Real option text extracted from PDF");
    }

    if (!qText.trim() || qText.toLowerCase().includes("option a")) {
      console.log("\n   WARN: Question text may not be extracted properly.");
    } else {
      console.log("   OK: Question text extracted");
    }

    console.log("\n=== TEST COMPLETE ===");
    console.log("PDF upload -> Parse -> DB save -> Student fetch: OK");
  } catch (err) {
    console.error("\nFAIL:", err.response?.data || err.message);
    process.exit(1);
  }
}

main();
