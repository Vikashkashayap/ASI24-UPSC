import Test from "../models/Test.js";
import { User } from "../models/User.js";
import { generateTestQuestions, generateFullMockTestQuestions, isPrelimsRagEnabled } from "../services/testGenerationService.js";
import { getPerformanceSummary } from "../services/performanceService.js";
import { pickBilingualQuestionFields } from "../services/questionTranslationService.js";
import { mapBilingualQuestionForClient } from "../services/bilingualQuestionStorage.js";
import { ensureAttemptHasHindiFromParent } from "../services/syncHindiFromParent.js";
import {
  getPrelimsDailyLockStatus,
  PRELIMS_DAILY_LIMIT_MESSAGE,
} from "../services/prelimsTopicDailyLock.js";
import { filterQuestionsByTopic } from "../services/qg/utils/topicRelevance.js";

const ALLOWED_SUBJECTS = ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech", "Art & Culture", "Current Affairs", "CSAT"];
const GS_SUBJECTS = ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech", "Art & Culture", "Current Affairs"];

/** DB-only bilingual map — zero AI cost during exam attempts. */
function mapQuestionForClient(q, { includeAnswers = false, includeMeta = false } = {}) {
  const mapped = mapBilingualQuestionForClient(q, { includeAnswers });
  if (!includeAnswers) return mapped;
  if (includeMeta) {
    return {
      ...mapped,
      eliminationLogic: q.eliminationLogic,
      conceptualSource: q.conceptualSource,
    };
  }
  return mapped;
}

function mapQuestionForStart(q) {
  return mapBilingualQuestionForClient(q, { includeAnswers: false });
}

/**
 * Generate a FULL-LENGTH UPSC Prelims GS Paper 1 Mock (100 questions).
 * Subject is provided by admin / user (SUBJECT_FROM_ADMIN).
 * POST /api/tests/generate-full-mock
 * Body: { subject: string } — e.g. "Polity" or "Polity, History, Geography"
 */
export const generateFullMockTest = async (req, res) => {
  try {
    const { subject } = req.body;
    const subjectStr = typeof subject === "string" ? subject.trim() : "";

    if (!subjectStr) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: subject (string). Example: Polity or Polity, History, Geography",
      });
    }

    const allowed = [...GS_SUBJECTS];
    const subjectList = subjectStr.split(",").map((s) => s.trim()).filter(Boolean);
    const invalid = subjectList.filter((s) => !allowed.includes(s));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid subject(s): ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}`,
      });
    }

    console.log(`📝 Generating full-length mock (100 questions) for subject: ${subjectStr}...`);
    const result = await generateFullMockTestQuestions({ subject: subjectStr });

    if (!result.success) {
      let errorMessage = result.error || "Failed to generate full mock";
      const lower = errorMessage.toLowerCase();
      if (lower.includes("401") || lower.includes("unauthorized") || (lower.includes("invalid") && lower.includes("api key"))) {
        errorMessage = "Invalid OpenRouter API key. Please check OPENROUTER_API_KEY in .env.";
      } else if (lower.includes("missing") || lower.includes("required")) {
        errorMessage = "OpenRouter API key is not set. Add OPENROUTER_API_KEY to .env.";
      }
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorMessage,
      });
    }

    if (!result.questions || result.questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "No questions were generated for the full mock. Please try again.",
      });
    }

    const test = new Test({
      userId: req.user?.id,
      subject: subjectStr,
      examType: "GS",
      topic: result.testName || "Full Mock - Prelims GS Paper 1",
      difficulty: "Moderate",
      questions: result.questions,
      totalQuestions: result.questions.length,
    });

    await test.save();

    const testForUser = {
      _id: test._id,
      subject: test.subject,
      examType: test.examType,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      questions: test.questions.map((q) => mapQuestionForStart(q)),
      createdAt: test.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "Full-length mock test generated successfully",
      data: testForUser,
    });
  } catch (error) {
    console.error("Error in generateFullMockTest:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Daily lock status for Prelims / Practice test generator (2 per IST day).
 * GET /api/tests/prelims-daily-status
 */
export const getPrelimsDailyStatus = async (req, res) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    const status = await getPrelimsDailyLockStatus(userId, req.user?.role);
    return res.json({
      success: true,
      data: status,
      message: status.locked ? PRELIMS_DAILY_LIMIT_MESSAGE : undefined,
    });
  } catch (error) {
    console.error("Error in getPrelimsDailyStatus:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load daily lock status",
    });
  }
};

/**
 * Generate a new test with AI-generated questions
 * POST /api/tests/generate
 * Body: { subjects: string[], topic: string, examType: "GS" | "CSAT", questionCount: number, difficulty?, csatCategories?, currentAffairsPeriod? }
 */
export const generateTest = async (req, res) => {
  try {
    const { subjects, topic, examType, questionCount, difficulty, csatCategories, currentAffairsPeriod } = req.body;
    const count = questionCount != null ? parseInt(questionCount, 10) : null;

    // 2 practice tests per calendar day (IST) — enforced before cache / AI
    const dailyLock = await getPrelimsDailyLockStatus(
      req.user?._id ?? req.user?.id,
      req.user?.role
    );
    if (dailyLock.locked) {
      return res.status(403).json({
        success: false,
        code: "PRELIMS_DAILY_LIMIT",
        message: PRELIMS_DAILY_LIMIT_MESSAGE,
        data: dailyLock,
      });
    }

    // Validation
    if (!Array.isArray(subjects) || subjects.length === 0 || !topic || !examType || count == null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: subjects (array), topic, examType, questionCount",
      });
    }

    const invalidSubject = subjects.find((s) => !ALLOWED_SUBJECTS.includes(s));
    if (invalidSubject) {
      return res.status(400).json({
        success: false,
        message: `Invalid subject: ${invalidSubject}. Allowed: ${ALLOWED_SUBJECTS.join(", ")}`,
      });
    }

    const hasCsat = subjects.includes("CSAT");
    const hasGsSubject = subjects.some((s) => GS_SUBJECTS.includes(s));
    if (hasCsat && hasGsSubject) {
      return res.status(400).json({
        success: false,
        message: "CSAT cannot be mixed with GS subjects.",
      });
    }

    if (!["GS", "CSAT"].includes(examType)) {
      return res.status(400).json({
        success: false,
        message: "examType must be GS or CSAT",
      });
    }

    if (examType === "GS" && difficulty && !["Easy", "Moderate", "Hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty. Must be: Easy, Moderate, or Hard",
      });
    }

    if (![5, 10, 20].includes(count)) {
      return res.status(400).json({
        success: false,
        message: "Invalid questionCount. Must be: 5, 10, or 20",
      });
    }

    const subjectDisplay = subjects.join(", ");
    const topicNormalized = String(topic).trim().replace(/\s+/g, " ");
    const difficultyKey = examType === "GS" ? difficulty || "Moderate" : undefined;

    // ---------------------------------------------------------
    // CACHING: same subject + topic + difficulty + count → reuse DB questions
    // Works for both RAG and legacy LLM paths. Excludes mocks / assigned practice.
    // ---------------------------------------------------------
    if (examType === "GS" && difficultyKey) {
      const topicRegex = new RegExp(
        `^${topicNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      // Match tests where mock/practice ids are missing or null (not assigned papers)
      const existingTest = await Test.findOne({
        subject: subjectDisplay,
        topic: topicRegex,
        difficulty: difficultyKey,
        examType: "GS",
        totalQuestions: count,
        questions: { $exists: true, $not: { $size: 0 } },
        $and: [
          { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
          { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
        ],
      }).sort({ createdAt: -1 });

      if (existingTest?.questions?.length >= count) {
        const cacheTopicCheck = filterQuestionsByTopic(existingTest.questions, topicNormalized);
        if (cacheTopicCheck.dropped > 0 || cacheTopicCheck.questions.length < count) {
          console.warn(
            `⚠️ CACHE SKIP: prior test for ${subjectDisplay} - ${topicNormalized} has ${cacheTopicCheck.dropped} off-topic Qs — regenerating`
          );
        } else {
          console.log(
            `♻️  CACHE HIT: Reusing questions for ${subjectDisplay} - ${topicNormalized} (${difficultyKey}, ${count}Q) — skipping AI`
          );

          const shuffledQuestions = [...existingTest.questions]
            .slice(0, count)
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);

          const newTest = new Test({
            userId: req.user?.id,
            subject: subjectDisplay,
            examType: "GS",
            topic: topicNormalized,
            difficulty: difficultyKey,
            questions: shuffledQuestions.map((q) => {
              const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
              return pickBilingualQuestionFields({ ...plain, userAnswer: null });
            }),
            totalQuestions: count,
          });

          await newTest.save();

          const testForUser = {
            _id: newTest._id,
            subject: newTest.subject,
            examType: newTest.examType,
            topic: newTest.topic,
            difficulty: newTest.difficulty,
            totalQuestions: newTest.totalQuestions,
            questions: newTest.questions.map((q) => mapQuestionForStart(q)),
            createdAt: newTest.createdAt,
            fromCache: true,
          };

          return res.status(201).json({
            success: true,
            message: "Test generated successfully (cached)",
            data: testForUser,
          });
        }
      }

      console.log(
        `📭 CACHE MISS: No prior test for ${subjectDisplay} - ${topicNormalized} (${difficultyKey}, ${count}Q) — generating new`
      );
    }
    // ---------------------------------------------------------
    // CACHING LOGIC END
    // ---------------------------------------------------------

    console.log(
      `📝 Generating ${count} questions for ${subjectDisplay} - ${topicNormalized} (${examType})${
        isPrelimsRagEnabled(examType) ? " [Knowledge Base RAG]" : ""
      }...`
    );
    const generationResult = await generateTestQuestions({
      subjects,
      topic: topicNormalized,
      examType,
      questionCount: count,
      difficulty: difficultyKey,
      csatCategories: examType === "CSAT" ? csatCategories : undefined,
      currentAffairsPeriod: currentAffairsPeriod || undefined,
    });

    if (!generationResult.success) {
      let errorMessage = generationResult.error || "Failed to generate questions";

      console.error("=".repeat(60));
      console.error("❌ Test generation FAILED in controller");
      console.error("   Error message:", errorMessage);
      console.error("   Generation result:", JSON.stringify(generationResult, null, 2));
      console.error("=".repeat(60));

      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes("knowledge base") || lowerError.includes("no matching content")) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: errorMessage,
        });
      }
      if (lowerError.includes("401") || lowerError.includes("unauthorized") || (lowerError.includes("invalid") && lowerError.includes("api key"))) {
        errorMessage = "Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in the .env file. Get your key from https://openrouter.ai/keys";
      } else if (lowerError.includes("not configured") || lowerError.includes("missing") || lowerError.includes("required")) {
        errorMessage = "OpenRouter API key is not set. Please add OPENROUTER_API_KEY to your .env file.";
      } else if (lowerError.includes("model")) {
        errorMessage = `Invalid model configuration: ${errorMessage}. Please check OPENROUTER_MODEL in .env file.`;
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorMessage,
      });
    }

    if (generationResult.questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "No questions were generated. Please try again.",
      });
    }

    const test = new Test({
      userId: req.user?.id,
      subject: subjectDisplay,
      examType,
      topic: topicNormalized,
      ...(examType === "GS" && difficultyKey && { difficulty: difficultyKey }),
      questions: generationResult.questions.map((q) => pickBilingualQuestionFields(q)),
      totalQuestions: generationResult.questions.length,
    });

    await test.save();

    const testForUser = {
      _id: test._id,
      subject: test.subject,
      examType: test.examType,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      questions: test.questions.map((q) => mapQuestionForStart(q)),
      createdAt: test.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Test generated successfully",
      data: testForUser,
    });
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ UNEXPECTED ERROR in generateTest controller");
    console.error("   Error message:", error.message);
    console.error("   Error stack:", error.stack);
    console.error("=".repeat(60));
    
    // Return structured JSON error
    const errorMessage = error.message || "Internal server error";
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorMessage, // Include error field for debugging
    });
  }
};

/**
 * Submit test answers and calculate score
 * POST /api/tests/submit/:id
 */
export const submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, questionTimeSpent } = req.body; // answers: { questionId: "A"|"B"|... }, questionTimeSpent: { questionId: seconds }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        success: false,
        message: "Answers object is required",
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find test and verify ownership (include tests without userId for backward compatibility)
    const test = await Test.findOne({
      _id: id,
      $or: [
        { userId },
        { userId: { $exists: false } }
      ]
    });
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (test.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Test has already been submitted",
      });
    }

    // Calculate score
    // UPSC Prelims scoring: +2 for correct, -0.66 for wrong
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    test.questions.forEach((question) => {
      const questionId = question._id.toString();
      const userAnswer = answers[questionId] || answers[question._id];
      const seconds = questionTimeSpent && typeof questionTimeSpent[questionId] === "number"
        ? Math.round(questionTimeSpent[questionId])
        : 0;
      question.timeSpent = seconds;

      if (userAnswer) {
        question.userAnswer = userAnswer;

        if (userAnswer === question.correctAnswer) {
          score += 2;
          correctCount++;
        } else {
          score -= 0.66;
          wrongCount++;
        }
      }
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Calculate accuracy
    const totalAttempted = correctCount + wrongCount;
    const accuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;

    // Update test
    test.score = parseFloat(score.toFixed(2));
    test.correctAnswers = correctCount;
    test.wrongAnswers = wrongCount;
    test.accuracy = parseFloat(accuracy.toFixed(2));
    test.isSubmitted = true;

    await test.save();

    // Return results with explanations
    res.json({
      success: true,
      message: "Test submitted successfully",
      data: {
        _id: test._id,
        subject: test.subject,
        examType: test.examType || "GS",
        topic: test.topic,
        difficulty: test.difficulty,
        totalQuestions: test.totalQuestions,
        score: test.score,
        correctAnswers: test.correctAnswers,
        wrongAnswers: test.wrongAnswers,
        accuracy: test.accuracy,
        questions: test.questions.map((q) => mapQuestionForClient(q, { includeAnswers: true })),
        createdAt: test.createdAt,
        submittedAt: test.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get test by ID (for viewing test or results)
 * GET /api/tests/:id
 */
export const getTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id ?? req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Admins can view any test; mentors can view tests of assigned students; students only their own (or legacy without userId)
    let testQuery;
    if (userRole === "admin") {
      testQuery = { _id: id };
    } else if (userRole === "mentor") {
      const probe = await Test.findById(id).select("userId").lean();
      if (!probe?.userId) {
        return res.status(404).json({
          success: false,
          message: "Test not found",
        });
      }
      const stud = await User.findById(probe.userId).select("mentorId role").lean();
      if (
        !stud ||
        stud.role !== "student" ||
        !stud.mentorId ||
        String(stud.mentorId) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      testQuery = { _id: id };
    } else {
      testQuery = {
        _id: id,
        $or: [{ userId }, { userId: { $exists: false } }],
      };
    }

    const test = await Test.findOne(testQuery);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    await ensureAttemptHasHindiFromParent(test);

    // If test is submitted, return with answers and explanations
    if (test.isSubmitted) {
      return res.json({
        success: true,
        data: {
          _id: test._id,
          subject: test.subject,
          examType: test.examType || "GS",
          topic: test.topic,
          difficulty: test.difficulty,
          totalQuestions: test.totalQuestions,
          durationMinutes: test.durationMinutes,
          score: test.score,
          correctAnswers: test.correctAnswers,
          wrongAnswers: test.wrongAnswers,
          accuracy: test.accuracy,
          isSubmitted: true,
          questions: test.questions.map((q) => mapQuestionForClient(q, { includeAnswers: true, includeMeta: true })),
          createdAt: test.createdAt,
          submittedAt: test.updatedAt,
        },
      });
    }

    // If not submitted, return without correct answers
    res.json({
      success: true,
      data: {
        _id: test._id,
        subject: test.subject,
        examType: test.examType || "GS",
        topic: test.topic,
        difficulty: test.difficulty,
        totalQuestions: test.totalQuestions,
        durationMinutes: test.durationMinutes,
        questions: test.questions.map((q) => mapQuestionForClient(q)),
        createdAt: test.createdAt,
        isSubmitted: false,
      },
    });
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get all tests (history) with pagination
 * GET /api/tests?page=1&limit=10&subject=Economy
 */
export const getTests = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { limit = 10, page = 1, subject = "" } = req.query;
    const skip = (page - 1) * limit;
    const subjectFilter = String(subject || "").trim();

    const ownership = {
      $or: [{ userId }, { userId: { $exists: false } }],
    };

    const query = subjectFilter
      ? {
          $and: [
            ownership,
            {
              subject: new RegExp(
                subjectFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
              ),
            },
          ],
        }
      : ownership;

    // Include tests with userId or without userId (for backward compatibility)
    const tests = await Test.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("userId subject examType topic difficulty totalQuestions score accuracy isSubmitted createdAt");

    const total = await Test.countDocuments(query);

    const subjects = (
      await Test.distinct("subject", ownership)
    )
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: {
        tests,
        subjects,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get user test analytics
 * GET /api/tests/analytics
 */
export const getTestAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const analytics = await Test.getUserAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching test analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Delete a test
 * DELETE /api/tests/:id
 */
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find test and verify ownership (include tests without userId for backward compatibility)
    const test = await Test.findOne({
      _id: id,
      $or: [
        { userId },
        { userId: { $exists: false } }
      ]
    });
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    await Test.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get pre-lims performance analysis using performance agent
 * GET /api/tests/prelims-performance
 */
export const getPrelimsPerformance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user's test performance data and transform it for the performance agent
    const tests = await Test.find({
      userId,
      isSubmitted: true
    }).sort({ createdAt: -1 }).lean();

    if (!tests || tests.length === 0) {
      return res.json({
        success: true,
        data: {
          averageScore: 0,
          weakSubjects: [],
          trend: [],
          consistency: 0,
          subjectBreakdown: [],
          history: [],
          totalTests: 0,
          highestScore: 0,
          improvementTrend: 0,
          recentPerformance: [],
          preLimsReadiness: {
            overallReadiness: 0,
            strengths: [],
            areasForImprovement: [],
            recommendedFocus: [],
            estimatedScore: 0
          }
        }
      });
    }

    // Transform test data to match performance agent format
    const processedTestData = tests.map(test => ({
      id: test._id.toString(),
      createdAt: test.createdAt,
      subject: test.subject || 'General Studies',
      score: test.accuracy || 0, // Use accuracy as percentage score
      totalMarks: test.score || 0,
      maxMarks: (test.totalQuestions || 0) * 2, // Max score is total questions * 2
      grade: test.accuracy >= 80 ? 'A' : test.accuracy >= 60 ? 'B' : test.accuracy >= 40 ? 'C' : 'D',
      paper: 'Pre-lims Test',
      year: new Date(test.createdAt).getFullYear(),
      testType: 'prelims'
    }));

    // Calculate subject breakdown for tests
    const subjectMap = {};
    processedTestData.forEach(item => {
      const subject = item.subject;
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, count: 0, scores: [] };
      }
      subjectMap[subject].total += item.score;
      subjectMap[subject].count += 1;
      subjectMap[subject].scores.push(item.score);
    });

    const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
      count: data.count,
      highest: Math.max(...data.scores),
      lowest: Math.min(...data.scores)
    })).sort((a, b) => a.average - b.average);

    // Calculate overall statistics
    const scores = processedTestData.map(item => item.score);
    const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Calculate improvement trend
    let improvementTrend = 0;
    if (scores.length >= 3) {
      const recentScores = scores.slice(0, 3);
      const oldScores = scores.slice(-3);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
      improvementTrend = Math.round(recentAvg - oldAvg);
    }

    // Calculate consistency
    let consistency = 100;
    if (scores.length > 1) {
      let deltas = 0;
      for (let i = 1; i < scores.length; i++) {
        deltas += Math.abs(scores[i] - scores[i - 1]);
      }
      const avgDelta = deltas / (scores.length - 1);
      consistency = Math.max(0, Math.round(100 - avgDelta));
    }

    // Identify weak subjects
    const weakSubjects = subjectBreakdown.slice(0, 3).map(s => s.subject);

    // Create trend data
    const trend = processedTestData.map(item => ({
      date: item.createdAt,
      score: item.score,
      subject: item.subject,
      createdAt: item.createdAt
    }));

    // Generate pre-lims readiness analysis
    const preLimsReadiness = {
      overallReadiness: Math.min(100, Math.max(0, averageScore + (consistency * 0.3) + (improvementTrend * 2))),
      strengths: subjectBreakdown.filter(s => s.average >= 70).map(s => s.subject),
      areasForImprovement: weakSubjects,
      recommendedFocus: weakSubjects.length > 0 ? weakSubjects : ['General Practice'],
      estimatedScore: Math.min(100, Math.max(0, averageScore + (consistency * 0.2)))
    };

    res.json({
      success: true,
      data: {
        averageScore,
        highestScore,
        lowestScore,
        weakSubjects,
        trend,
        consistency,
        subjectBreakdown,
        history: processedTestData,
        totalTests: tests.length,
        improvementTrend,
        recentPerformance: processedTestData.slice(0, 5),
        preLimsReadiness
      }
    });
  } catch (error) {
    console.error("Error fetching pre-lims performance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

