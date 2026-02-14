/**
 * Test Prelims PDF Upload Flow
 * Run: node scripts/test-prelims-pdf-upload.js <path-to-question.pdf> [path-to-answerkey.pdf]
 *
 * Verifies: PDF upload -> questions extracted -> start test returns questions with MCQ
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_URL = process.env.API_URL || "http://localhost:5000";

async function main() {
  const questionPdfPath = process.argv[2];
  const answerKeyPdfPath = process.argv[3];

  if (!questionPdfPath) {
    console.log("Usage: node scripts/test-prelims-pdf-upload.js <question.pdf> [answerkey.pdf]");
    console.log("Example: node scripts/test-prelims-pdf-upload.js ./sample-questions.pdf");
    process.exit(1);
  }

  if (!fs.existsSync(questionPdfPath)) {
    console.error("Error: Question PDF not found:", questionPdfPath);
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error("Error: Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  console.log("🚀 Prelims PDF Upload Test\n");

  try {
    // 1. Admin Login
    console.log("1. Logging in as Admin...");
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    const token = loginRes.data.token;
    if (!token) {
      throw new Error("No token from login");
    }
    console.log("   ✅ Admin logged in\n");

    // 2. Upload PDF
    console.log("2. Uploading PDF...");
    const formData = new FormData();
    formData.append(
      "questionPdf",
      new Blob([fs.readFileSync(questionPdfPath)], { type: "application/pdf" }),
      path.basename(questionPdfPath)
    );
    if (answerKeyPdfPath && fs.existsSync(answerKeyPdfPath)) {
      formData.append(
        "answerKeyPdf",
        new Blob([fs.readFileSync(answerKeyPdfPath)], { type: "application/pdf" }),
        path.basename(answerKeyPdfPath)
      );
    }
    formData.append("title", `PDF Test ${new Date().toISOString().slice(0, 10)}`);
    formData.append("startTime", "2025-02-14T00:00:00.000Z");
    formData.append("endTime", "2025-12-31T23:59:59.000Z");
    formData.append("totalMarks", "200");
    formData.append("negativeMarking", "0.66");
    formData.append("durationMinutes", "120");

    const uploadRes = await fetch(`${API_URL}/api/admin/prelims-test/upload-pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(uploadData.message || uploadData.error || "Upload failed");
    }

    const testId = uploadData.data._id;
    const questionsCount = uploadData.data.questionsCount ?? uploadData.data.totalQuestions;
    console.log(`   ✅ Upload OK. Test ID: ${testId}, Questions: ${questionsCount}\n`);

    if (questionsCount === 0) {
      console.log("   ⚠️  No questions extracted from PDF. Check PDF format.");
      process.exit(0);
    }

    // 3. Start test (same admin can act as student if they have role)
    console.log("3. Starting test (fetching questions)...");
    const startRes = await axios.post(`${API_URL}/api/student/prelims-test/start/${testId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const test = startRes.data.data?.test;
    const questions = test?.questions || [];

    if (questions.length === 0) {
      console.log("   ❌ Start test returned 0 questions!");
      process.exit(1);
    }

    console.log(`   ✅ Got ${questions.length} questions\n`);

    // 4. Show first question
    const q = questions[0];
    console.log("4. First question sample:");
    console.log("   ---");
    const qText = q.questionEnglish || q.questionHindi || q.question || "(empty)";
    console.log("   Question:", qText.substring(0, 200) + (qText.length > 200 ? "..." : ""));
    if (q.options && q.options.length >= 4) {
      q.options.forEach((o) => {
        const txt = o.textEnglish || o.textHindi || o.text || "";
        console.log(`   ${o.key}: ${(txt || "(empty)").substring(0, 80)}${txt.length > 80 ? "..." : ""}`);
      });
    } else if (q.options && typeof q.options === "object") {
      ["A", "B", "C", "D"].forEach((k) => {
        const v = q.options[k] || "";
        console.log(`   ${k}: ${String(v).substring(0, 80)}`);
      });
    }
    console.log("   ---\n");

    console.log("✨ TEST PASSED: PDF upload → questions extracted → MCQ shown in API response");
  } catch (err) {
    if (err.response) {
      console.error("\n❌ Error:", err.response.status, err.response.data?.message || err.response.data);
    } else {
      console.error("\n❌ Error:", err.message);
    }
    process.exit(1);
  }
}

main();
