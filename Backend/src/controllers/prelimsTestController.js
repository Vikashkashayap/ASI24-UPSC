/**
 * Prelims Topper Test - Admin Controller
 * Upload PDFs to disk, extract answer key + explanations, create test
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PrelimsTest from "../models/PrelimsTest.js";
import PrelimsQuestion from "../models/PrelimsQuestion.js";
import PrelimsAttempt from "../models/PrelimsAttempt.js";
import { extractTextFromPdf, parseAnswerKey, parseExplanationPdf } from "../services/prelimsPdfService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "prelims");

/**
 * Admin: Upload PDFs and create Prelims Topper Test
 * Saves PDFs to disk, extracts answer key and explanations only (no question text parsing)
 */
export const uploadAndCreateTest = async (req, res) => {
  try {
    const { title, duration, startTime, endTime } = req.body;
    const questionPdf = req.files?.questionPdf?.[0];
    const answerKeyPdf = req.files?.answerKeyPdf?.[0];
    const explanationPdf = req.files?.explanationPdf?.[0];

    if (!title || !duration || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, duration, startTime, endTime",
      });
    }

    const qBuf = questionPdf?.buffer;
    const aBuf = answerKeyPdf?.buffer;
    const eBuf = explanationPdf?.buffer || null;

    if (!qBuf || !aBuf) {
      return res.status(400).json({
        success: false,
        message: "Please upload Question Paper and Answer Key PDFs. Explanation PDF is optional.",
      });
    }

    // Parse answer key and explanation PDFs (no question paper parsing)
    let answerMap = {};
    let explanationMap = {};
    try {
      const aResult = await extractTextFromPdf(aBuf);
      answerMap = parseAnswerKey(aResult.text);
      if (Object.keys(answerMap).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Could not extract answer key from PDF. Ensure format: 1 (c), 2 (a), etc.",
        });
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: `Answer Key PDF: ${e.message}`,
      });
    }

    if (eBuf && eBuf.length > 0) {
      try {
        const eResult = await extractTextFromPdf(eBuf);
        explanationMap = parseExplanationPdf(eResult.text);
      } catch (err) {
        console.warn("Explanation PDF parse failed:", err.message);
      }
    }

    const maxQ = Object.keys(answerMap).length ? Math.max(...Object.keys(answerMap).map(Number)) : 100;
    const totalQuestions = Math.min(100, Math.max(maxQ, 1));

    const test = new PrelimsTest({
      title: String(title).trim(),
      duration: parseInt(duration, 10) || 120,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isPublished: false,
      totalQuestions,
    });
    await test.save();

    const testDir = path.join(UPLOADS_DIR, test._id.toString());
    await mkdir(testDir, { recursive: true });

    await writeFile(path.join(testDir, "question.pdf"), qBuf);
    await writeFile(path.join(testDir, "answerKey.pdf"), aBuf);
    if (eBuf && eBuf.length > 0) {
      await writeFile(path.join(testDir, "explanation.pdf"), eBuf);
    }

    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
    test.questionPdfUrl = `${baseUrl}/uploads/prelims/${test._id}/question.pdf`;
    test.answerKeyPdfUrl = `${baseUrl}/uploads/prelims/${test._id}/answerKey.pdf`;
    test.explanationPdfUrl = eBuf?.length
      ? `${baseUrl}/uploads/prelims/${test._id}/explanation.pdf`
      : "";
    await test.save();

    const questionDocs = [];
    for (let n = 1; n <= totalQuestions; n++) {
      questionDocs.push({
        testId: test._id,
        questionNumber: n,
        correctAnswer: answerMap[n] || "A",
        explanation: explanationMap[n] || "",
      });
    }
    await PrelimsQuestion.insertMany(questionDocs);

    res.status(201).json({
      success: true,
      message: "Prelims Topper Test created successfully",
      data: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        startTime: test.startTime,
        endTime: test.endTime,
        totalQuestions,
        isPublished: test.isPublished,
        questionPdfUrl: test.questionPdfUrl,
      },
    });
  } catch (error) {
    console.error("prelimsTestController uploadAndCreateTest:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create test",
    });
  }
};

export const listAdminTests = async (req, res) => {
  try {
    const tests = await PrelimsTest.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: tests });
  } catch (error) {
    console.error("prelimsTestController listAdminTests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, startTime, endTime, isPublished } = req.body;

    const test = await PrelimsTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    if (title != null) test.title = String(title).trim();
    if (duration != null) test.duration = parseInt(duration, 10) || 120;
    if (startTime != null) test.startTime = new Date(startTime);
    if (endTime != null) test.endTime = new Date(endTime);
    if (typeof isPublished === "boolean") test.isPublished = isPublished;

    await test.save();

    res.json({
      success: true,
      message: "Test updated",
      data: test,
    });
  } catch (error) {
    console.error("prelimsTestController updateTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    await PrelimsQuestion.deleteMany({ testId: id });
    await PrelimsAttempt.deleteMany({ testId: id });
    const test = await PrelimsTest.findByIdAndDelete(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    res.json({ success: true, message: "Test deleted" });
  } catch (error) {
    console.error("prelimsTestController deleteTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTestAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const attempts = await PrelimsAttempt.find({ testId: id, submittedAt: { $ne: null } }).populate(
      "studentId",
      "name email"
    );

    const totalAttempts = attempts.length;
    const scores = attempts.map((a) => a.score).filter((s) => typeof s === "number");
    const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const topScore = scores.length ? Math.max(...scores) : 0;
    const highPerformers = attempts.filter((a) => a.accuracy >= 80);

    res.json({
      success: true,
      data: {
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        topScore,
        highPerformersCount: highPerformers.length,
        highPerformers: highPerformers.slice(0, 20).map((a) => ({
          studentId: a.studentId?._id,
          name: a.studentId?.name,
          email: a.studentId?.email,
          score: a.score,
          accuracy: a.accuracy,
        })),
      },
    });
  } catch (error) {
    console.error("prelimsTestController getTestAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
