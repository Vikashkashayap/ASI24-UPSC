import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PrelimsTopperTest from "../models/PrelimsTopperTest.js";
import PrelimsTestAttempt from "../models/PrelimsTestAttempt.js";
import PrelimsQuestion from "../models/PrelimsQuestion.js";
import { recalculateRanksForTest, getRankList } from "../services/prelimsRankingService.js";
import { extractAndParseQuestionPdf, extractAndParseSolutionPdf } from "../services/prelimsPdfParserService.js";
import { extractAndParseBilingualPdfs } from "../services/prelimsBilingualPdfParserService.js";
import { convertPdfToMcq } from "../services/mcqPdfConversionService.js";
import { parseBilingualPdfPipeline } from "../services/prelimsBilingualPdfService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "prelims-topper");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * POST /api/admin/prelims-test/create
 * Create manual test. Optional: questionPdf, solutionPdf (multer), answerKey in body as JSON string.
 */
export const createPrelimsTest = async (req, res) => {
  try {
    const adminId = req.user._id?.toString() || req.user.id;
    const {
      title,
      totalQuestions,
      totalMarks,
      negativeMarking,
      durationMinutes,
      startTime,
      endTime,
      answerKey: answerKeyRaw,
    } = req.body;

    if (!title || totalQuestions == null || totalMarks == null || negativeMarking == null || durationMinutes == null || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, totalQuestions, totalMarks, negativeMarking, durationMinutes, startTime, endTime",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }

    let answerKey = {};
    if (answerKeyRaw) {
      try {
        answerKey = typeof answerKeyRaw === "string" ? JSON.parse(answerKeyRaw) : answerKeyRaw;
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid answerKey JSON" });
      }
    }

    ensureUploadDir();

    const test = new PrelimsTopperTest({
      title: title.trim(),
      testType: "MANUAL",
      section: "Prelims Topper Test",
      totalQuestions: parseInt(totalQuestions, 10),
      totalMarks: parseFloat(totalMarks),
      negativeMarking: parseFloat(negativeMarking),
      durationMinutes: parseInt(durationMinutes, 10),
      startTime: start,
      endTime: end,
      answerKey,
      createdBy: adminId,
    });
    await test.save();

    let questionBuf = null;
    let solutionBuf = null;

    if (req.files?.questionPdf?.[0]) {
      questionBuf = req.files.questionPdf[0].buffer;
      const filename = `${test._id}_question.pdf`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, questionBuf);
      test.questionPdfUrl = `/api/student/prelims-test/file/${test._id}/question`;
    }
    if (req.files?.solutionPdf?.[0]) {
      solutionBuf = req.files.solutionPdf[0].buffer;
      const filename = `${test._id}_solution.pdf`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, solutionBuf);
      test.solutionPdfUrl = `/api/student/prelims-test/file/${test._id}/solution`;
    }
    await test.save();

    // Parse PDFs: try bilingual pipeline first (best for UPSC), then fallback. CAP at 100 questions.
    const MAX_QUESTIONS = 100;
    if (questionBuf) {
      try {
        let qResult = null;
        if (solutionBuf) {
          qResult = await parseBilingualPdfPipeline(questionBuf, solutionBuf);
        }
        if (!qResult?.success || !qResult.questions?.length) {
          qResult = await convertPdfToMcq(questionBuf, solutionBuf);
        }
        if (!qResult?.success || !qResult.questions?.length) {
          qResult = await extractAndParseBilingualPdfs(questionBuf, solutionBuf);
        }
        if (!qResult?.success || !qResult.questions?.length) {
          const legacy = await extractAndParseQuestionPdf(questionBuf);
          if (legacy.success && legacy.questions?.length) {
            let answerKeyFromSol = {};
            if (solutionBuf) {
              try {
                const s = await extractAndParseSolutionPdf(solutionBuf, MAX_QUESTIONS);
                answerKeyFromSol = s.answerKey || {};
              } catch (_) {}
            }
            qResult = {
              success: true,
              questions: legacy.questions.map((q, idx) => ({
                questionNumber: idx + 1,
                questionHindi: "",
                questionEnglish: (q.question || "").trim(),
                options: ["A", "B", "C", "D"].map((k) => ({
                  key: k,
                  textHindi: "",
                  textEnglish: (q.options && q.options[k]) ? String(q.options[k]).trim() : "",
                })),
                correctAnswer: (answerKeyFromSol[String(idx)] || test.answerKey[String(idx)] || "A").toUpperCase(),
              })),
              answerKey: answerKeyFromSol,
            };
          }
        }

        if (qResult?.success && qResult.questions?.length > 0) {
          const questions = qResult.questions.slice(0, MAX_QUESTIONS);
          const OPTIONS = ["A", "B", "C", "D"];
          const optsToObj = (opts) => {
            if (opts && typeof opts === "object" && !Array.isArray(opts)) {
              const obj = {};
              OPTIONS.forEach((k) => { obj[k] = (opts[k] || "").trim(); });
              return obj;
            }
            const arr = Array.isArray(opts) ? opts : [];
            const obj = {};
            arr.forEach((o) => {
              const k = (o.key || "").toUpperCase();
              if (OPTIONS.includes(k)) obj[k] = (o.textEnglish || o.textHindi || o.english || o.text || "").trim();
            });
            return obj;
          };
          test.questions = questions.map((q) => ({
            question: (q.questionEnglish || q.questionHindi || q.question || "").trim(),
            options: optsToObj(q.options || []),
          }));
          test.totalQuestions = questions.length;
          const ansKey = qResult.answerKey || {};
          test.answerKey = test.answerKey && Object.keys(test.answerKey).length > 0
            ? test.answerKey
            : Object.fromEntries(questions.map((q, i) => [String(i), (q.correctAnswer || ansKey[String(i)] || "A").toUpperCase()]));

          await PrelimsQuestion.deleteMany({ testId: test._id });
          const questionDocs = questions.map((q, idx) => {
            const opts = Array.isArray(q.options) ? q.options : [];
            return {
              testId: test._id,
              questionNumber: idx + 1,
              questionHindi: (q.questionHindi || "").trim(),
              questionEnglish: (q.questionEnglish || q.question || "").trim(),
              options: OPTIONS.map((k) => {
                const o = opts.find((x) => (x.key || "").toUpperCase() === k);
                return {
                  key: k,
                  textHindi: (o?.textHindi || o?.hindi || "").trim(),
                  textEnglish: (o?.textEnglish || o?.english || o?.text || "").trim(),
                };
              }),
              correctAnswer: (q.correctAnswer || test.answerKey[String(idx)] || "A").toUpperCase(),
              explanation: (q.explanation || "").trim(),
            };
          });
          await PrelimsQuestion.insertMany(questionDocs);
          console.log(`Parsed ${questions.length} questions from PDF (capped at ${MAX_QUESTIONS})`);
        } else {
          console.warn("Question PDF parse: no questions extracted", qResult?.error || qResult?.errors?.[0] || "");
        }
      } catch (parseErr) {
        console.error("Question PDF parse error:", parseErr);
      }
    }
    if (solutionBuf && Object.keys(answerKey).length === 0) {
      try {
        const sResult = await extractAndParseSolutionPdf(solutionBuf, test.totalQuestions);
        if (sResult.success && Object.keys(sResult.answerKey || {}).length > 0) {
          test.answerKey = { ...test.answerKey, ...sResult.answerKey };
          console.log(`Parsed answer key for ${Object.keys(sResult.answerKey).length} questions from solution PDF`);
          // Update PrelimsQuestion correctAnswer if we already inserted docs above
          const existing = await PrelimsQuestion.find({ testId: test._id }).select("_id").lean();
          if (existing.length > 0) {
            const updates = Object.entries(sResult.answerKey).map(([idx, ans]) => ({
              updateOne: {
                filter: { testId: test._id, questionNumber: parseInt(idx, 10) + 1 },
                update: { $set: { correctAnswer: (ans || "A").toUpperCase() } },
              },
            }));
            if (updates.length) await PrelimsQuestion.bulkWrite(updates);
          }
        }
      } catch (parseErr) {
        console.error("Solution PDF parse error:", parseErr);
      }
    }
    await test.save();

    res.status(201).json({
      success: true,
      message: "Prelims Topper Test created",
      data: {
        _id: test._id,
        title: test.title,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        negativeMarking: test.negativeMarking,
        durationMinutes: test.durationMinutes,
        startTime: test.startTime,
        endTime: test.endTime,
        questionPdfUrl: test.questionPdfUrl,
        solutionPdfUrl: test.solutionPdfUrl,
      },
    });
  } catch (error) {
    console.error("createPrelimsTest error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create test",
    });
  }
};

/**
 * GET /api/admin/prelims-test/list
 */
export const listPrelimsTests = async (req, res) => {
  try {
    const tests = await PrelimsTopperTest.find({})
      .sort({ startTime: -1 })
      .populate("createdBy", "name email")
      .lean();

    res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    console.error("listPrelimsTests error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to list tests",
    });
  }
};

/**
 * GET /api/admin/prelims-test/analytics/:id
 */
export const getPrelimsTestAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsTopperTest.findById(id).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const attempts = await PrelimsTestAttempt.find({ testId: id }).lean();
    const count = attempts.length;
    const scores = attempts.map((a) => a.score);
    const avgScore = count ? scores.reduce((s, n) => s + n, 0) / count : 0;
    const highest = count ? Math.max(...scores) : 0;
    const lowest = count ? Math.min(...scores) : 0;

    const byHour = {};
    attempts.forEach((a) => {
      const hour = new Date(a.submittedAt).toISOString().slice(0, 13);
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    const attemptTimeline = Object.entries(byHour).map(([hour, c]) => ({ hour, count: c })).sort((a, b) => a.hour.localeCompare(b.hour));

    const top10 = await getRankList(id, 10);

    res.json({
      success: true,
      data: {
        test: {
          _id: test._id,
          title: test.title,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          startTime: test.startTime,
          endTime: test.endTime,
        },
        totalAttempts: count,
        averageScore: Math.round(avgScore * 100) / 100,
        highestScore: highest,
        lowestScore: lowest,
        rankListTop10: top10,
        attemptTimeline,
      },
    });
  } catch (error) {
    console.error("getPrelimsTestAnalytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get analytics",
    });
  }
};

/**
 * GET /api/admin/prelims-test/rank-list/:id
 */
export const getPrelimsTestRankList = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const test = await PrelimsTopperTest.findById(id).select("title").lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const list = await getRankList(id, limit);
    res.json({
      success: true,
      data: { test: test.title, rankList: list },
    });
  } catch (error) {
    console.error("getPrelimsTestRankList error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get rank list",
    });
  }
};

/**
 * GET /api/admin/prelims-test/export/:id
 * CSV export: rank, name, email, score, correct, wrong, skipped, accuracy, timeTaken, submittedAt
 */
export const exportPrelimsTestCsv = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsTopperTest.findById(id).select("title").lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const list = await getRankList(id, 10000);
    const header = "Rank,Name,Email,Score,Correct,Wrong,Skipped,Accuracy %,Time Taken (s),Submitted At\n";
    const rows = list.map(
      (r) =>
        `${r.rank},${escapeCsv(r.name)},${escapeCsv(r.email)},${r.score},${r.correctAnswers},${r.wrongAnswers},${r.skipped},${r.accuracy},${r.timeTaken},${r.submittedAt}`
    );
    const csv = header + rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="prelims-topper-${id}-results.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("exportPrelimsTestCsv error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to export CSV",
    });
  }
};

function escapeCsv(str) {
  if (str == null) return "";
  const s = String(str);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * POST /api/admin/prelims-test/upload-pdf
 * Bilingual flow: Parse question PDF + answer key PDF, create test + PrelimsQuestion docs.
 * Body (form): title, totalMarks, negativeMarking, durationMinutes, startTime, endTime
 * Files: questionPdf (required), answerKeyPdf (optional)
 */
export const uploadPrelimsTestFromPdf = async (req, res) => {
  try {
    const adminId = req.user._id?.toString() || req.user.id;
    const questionPdf = req.files?.questionPdf?.[0];
    const answerKeyPdf = req.files?.answerKeyPdf?.[0];

    if (!questionPdf) {
      return res.status(400).json({
        success: false,
        message: "Question PDF is required",
      });
    }

    const {
      title,
      totalMarks = 200,
      negativeMarking = 0.66,
      durationMinutes = 120,
      startTime,
      endTime,
    } = req.body;

    if (!title?.trim() || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, startTime, endTime",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }

    // Primary: Page-wise bilingual parser (exactly 100 questions, Hindi+English)
    let parseResult = await parseBilingualPdfPipeline(
      questionPdf.buffer,
      answerKeyPdf?.buffer || null
    );

    if (!parseResult.success) {
      // Fallback: mcqPdfConversionService + extractAndParseBilingualPdfs
      parseResult = await convertPdfToMcq(
        questionPdf.buffer,
        answerKeyPdf?.buffer || null
      );
      if (!parseResult.success || !parseResult.questions?.length) {
        parseResult = await extractAndParseBilingualPdfs(
          questionPdf.buffer,
          answerKeyPdf?.buffer || null
        );
      }
    }

    if (!parseResult.success || !parseResult.questions?.length) {
      return res.status(400).json({
        success: false,
        message: parseResult.error || parseResult.errors?.[0] || "No questions extracted from PDF. Check PDF format.",
        details: parseResult.errors || parseResult.error,
      });
    }

    // Bilingual pipeline returns exactly 100; fallback may return different count
    let questions = parseResult.questions;
    const totalQuestions = questions.length;

    if (totalQuestions < 100) {
      return res.status(400).json({
        success: false,
        message: `Expected exactly 100 questions. Found ${totalQuestions}. Check PDF structure (alternating Hindi/English pages, question numbers 1–100, options (a)(b)(c)(d)).`,
        details: parseResult.errors,
      });
    }

    // Normalize questions to PrelimsQuestion schema (fallback parsers may use different format)
    const OPTIONS = ["A", "B", "C", "D"];
    const answerKey = parseResult.answerKey || {};
    questions = questions.slice(0, 100).map((q, idx) => {
      const optMap = {};
      if (Array.isArray(q.options)) {
        q.options.forEach((o) => {
          const k = (o.key || "").toUpperCase();
          if (OPTIONS.includes(k)) {
            optMap[k] = {
              textHindi: (o.textHindi || "").trim(),
              textEnglish: (o.textEnglish || o.text || "").trim(),
            };
          }
        });
      } else if (q.options && typeof q.options === "object") {
        OPTIONS.forEach((k) => {
          const v = q.options[k];
          optMap[k] = {
            textHindi: (typeof v === "object" ? v?.textHindi : "") || "",
            textEnglish: (typeof v === "object" ? v?.textEnglish : v) || "",
          };
        });
      }
      return {
        questionNumber: idx + 1,
        questionHindi: (q.questionHindi || "").trim(),
        questionEnglish: (q.questionEnglish || q.question || "").trim(),
        options: OPTIONS.map((k) => ({
          key: k,
          textHindi: optMap[k]?.textHindi || "",
          textEnglish: optMap[k]?.textEnglish || "",
        })),
        correctAnswer: (q.correctAnswer || answerKey[String(idx)] || "A").toUpperCase(),
        explanation: (q.explanation || "").trim(),
      };
    });
    const marks = parseFloat(totalMarks) || 200;
    const negMark = parseFloat(negativeMarking) || 0.66;
    const duration = parseInt(durationMinutes, 10) || 120;

    const finalAnswerKey = {};
    questions.forEach((q, idx) => {
      finalAnswerKey[String(idx)] = q.correctAnswer;
    });

    ensureUploadDir();

    const test = new PrelimsTopperTest({
      title: title.trim(),
      testType: "MANUAL",
      section: "Prelims Topper Test",
      totalQuestions,
      totalMarks: marks,
      negativeMarking: negMark,
      durationMinutes: duration,
      startTime: start,
      endTime: end,
      answerKey: finalAnswerKey,
      createdBy: adminId,
    });

    const qFilePath = path.join(UPLOAD_DIR, `${test._id}_question.pdf`);
    fs.writeFileSync(qFilePath, questionPdf.buffer);
    test.questionPdfUrl = `/api/student/prelims-test/file/${test._id}/question`;

    if (answerKeyPdf) {
      const aFilePath = path.join(UPLOAD_DIR, `${test._id}_solution.pdf`);
      fs.writeFileSync(aFilePath, answerKeyPdf.buffer);
      test.solutionPdfUrl = `/api/student/prelims-test/file/${test._id}/solution`;
    }

    await test.save();

    // Store in DB - bilingual format with explanation
    const questionDocs = questions.map((q) => ({
      testId: test._id,
      questionNumber: q.questionNumber,
      questionHindi: q.questionHindi || "",
      questionEnglish: q.questionEnglish || "",
      options: (q.options || []).slice(0, 4).map((o) => ({
        key: (o.key || "").toUpperCase(),
        textHindi: (o.textHindi || "").trim(),
        textEnglish: (o.textEnglish || "").trim(),
      })),
      correctAnswer: (q.correctAnswer || "A").toUpperCase(),
      explanation: (q.explanation || "").trim(),
    }));

    await PrelimsQuestion.insertMany(questionDocs);

    console.log(`Created bilingual test ${test._id} with ${totalQuestions} questions`);

    res.status(201).json({
      success: true,
      message: "Bilingual Prelims Topper Test created from PDF",
      data: {
        _id: test._id,
        title: test.title,
        totalQuestions,
        totalMarks: marks,
        negativeMarking: negMark,
        durationMinutes: duration,
        startTime: test.startTime,
        endTime: test.endTime,
        questionPdfUrl: test.questionPdfUrl,
        solutionPdfUrl: test.solutionPdfUrl,
        questionsCount: totalQuestions,
      },
    });
  } catch (error) {
    console.error("uploadPrelimsTestFromPdf error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create test from PDF",
    });
  }
};

/**
 * POST /api/admin/prelims-test/reparse/:id
 * Re-parse question PDF - uses same pipeline as create, CAP at 100 questions
 */
export const reparsePrelimsTestPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsTopperTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const qFilePath = path.join(UPLOAD_DIR, `${id}_question.pdf`);
    if (!fs.existsSync(qFilePath)) {
      return res.status(400).json({
        success: false,
        message: "Question PDF not found for this test. Re-upload the PDF.",
      });
    }

    const pdfBuffer = fs.readFileSync(qFilePath);
    const solFilePath = path.join(UPLOAD_DIR, `${id}_solution.pdf`);
    const solutionBuffer = fs.existsSync(solFilePath) ? fs.readFileSync(solFilePath) : null;

    let qResult = null;
    qResult = await parseBilingualPdfPipeline(pdfBuffer, solutionBuffer);
    if (!qResult?.success || !qResult.questions?.length) {
      qResult = await convertPdfToMcq(pdfBuffer, solutionBuffer);
    }
    if (!qResult?.success || !qResult.questions?.length) {
      qResult = await extractAndParseBilingualPdfs(pdfBuffer, solutionBuffer);
    }
    if (!qResult?.success || !qResult.questions?.length) {
      const legacy = await extractAndParseQuestionPdf(pdfBuffer);
      if (legacy.success && legacy.questions?.length) {
        let answerKeyFromSol = {};
        if (solutionBuffer) {
          try {
            const s = await extractAndParseSolutionPdf(solutionBuffer, 100);
            answerKeyFromSol = s.answerKey || {};
          } catch (_) {}
        }
        qResult = {
          success: true,
          questions: legacy.questions.map((q, idx) => ({
            questionNumber: idx + 1,
            questionHindi: "",
            questionEnglish: (q.question || "").trim(),
            options: ["A", "B", "C", "D"].map((k) => ({
              key: k,
              textHindi: "",
              textEnglish: (q.options && q.options[k]) ? String(q.options[k]).trim() : "",
            })),
            correctAnswer: (answerKeyFromSol[String(idx)] || test.answerKey[String(idx)] || "A").toUpperCase(),
          })),
        };
      }
    }

    if (!qResult?.success || !qResult.questions?.length) {
      return res.status(400).json({
        success: false,
        message: qResult?.error || qResult?.errors?.[0] || "Could not parse questions from PDF.",
      });
    }

    const MAX_QUESTIONS = 100;
    const questions = qResult.questions.slice(0, MAX_QUESTIONS);
    const OPTIONS = ["A", "B", "C", "D"];

    test.questions = questions.map((q) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      const obj = {};
      opts.forEach((o) => { obj[(o.key || "").toUpperCase()] = (o.textEnglish || o.textHindi || o.english || o.text || "").trim(); });
      if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
        OPTIONS.forEach((k) => { obj[k] = (q.options[k] || "").trim(); });
      }
      return {
        question: (q.questionEnglish || q.questionHindi || q.question || "").trim(),
        options: obj,
      };
    });
    test.totalQuestions = questions.length;
    test.answerKey = Object.fromEntries(questions.map((q, i) => [String(i), (q.correctAnswer || "A").toUpperCase()]));

    await PrelimsQuestion.deleteMany({ testId: id });
    const questionDocs = questions.map((q, idx) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      return {
        testId: test._id,
        questionNumber: idx + 1,
        questionHindi: (q.questionHindi || "").trim(),
        questionEnglish: (q.questionEnglish || q.question || "").trim(),
        options: OPTIONS.map((k) => {
          const o = opts.find((x) => (x.key || "").toUpperCase() === k);
          const v = q.options && q.options[k];
          return {
            key: k,
            textHindi: (o?.textHindi || o?.hindi || "").trim(),
            textEnglish: (o?.textEnglish || o?.english || o?.text || (typeof v === "string" ? v : "") || "").trim(),
          };
        }),
        correctAnswer: (q.correctAnswer || "A").toUpperCase(),
        explanation: (q.explanation || "").trim(),
      };
    });
    await PrelimsQuestion.insertMany(questionDocs);
    await test.save();

    res.json({
      success: true,
      message: `Re-parsed ${questions.length} questions (capped at ${MAX_QUESTIONS})`,
      data: { totalQuestions: test.totalQuestions },
    });
  } catch (error) {
    console.error("reparsePrelimsTestPdf error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Re-parse failed",
    });
  }
};
