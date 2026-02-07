import Test from "../models/Test.js";
import { generateTestQuestions } from "../services/testGenerationService.js";
import { getPerformanceSummary } from "../services/performanceService.js";

/**
 * Generate a new test with AI-generated questions
 * POST /api/tests/generate
 */
export const generateTest = async (req, res) => {
  try {
    const { subject, topic, difficulty, count } = req.body;

    // Validation
    if (!subject || !topic || !difficulty || !count) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: subject, topic, difficulty, count",
      });
    }

    if (!["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech"].includes(subject)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject. Must be one of: Polity, History, Geography, Economy, Environment, Science & Tech",
      });
    }

    if (!["Easy", "Moderate", "Hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty. Must be: Easy, Moderate, or Hard",
      });
    }

    if (![5, 10, 20].includes(parseInt(count))) {
      return res.status(400).json({
        success: false,
        message: "Invalid count. Must be: 5, 10, or 20",
      });
    }

    // ---------------------------------------------------------
    // CACHING LOGIC START
    // ---------------------------------------------------------
    // Check if a test with the same parameters already exists
    // We want to reuse questions to save AI costs and standardize tests
    const existingTest = await Test.findOne({
      subject,
      topic,
      difficulty,
      totalQuestions: parseInt(count),
      // Ensure we pick a valid test with questions
      questions: { $exists: true, $not: { $size: 0 } }
    }).sort({ createdAt: -1 }); // Get the most recent one if multiple exist

    if (existingTest) {
      console.log(`♻️  CACHE HIT: Found existing test for ${subject} - ${topic} (${difficulty})`);

      // -------------------------------------------------------
      // SHUFFLE LOGIC
      // -------------------------------------------------------
      // We shuffle the questions so different students get different order
      // even though the content is the same (Standardized Test)
      const shuffledQuestions = [...existingTest.questions]
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

      // Create a NEW test document for this user, but copying the questions from the existing test
      const newTest = new Test({
        userId: req.user?.id,
        subject,
        topic,
        difficulty,
        questions: shuffledQuestions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          userAnswer: null // Reset user answer
        })),
        totalQuestions: existingTest.totalQuestions,
      });

      await newTest.save();

      // Return the new test (without answers)
      const testForUser = {
        _id: newTest._id,
        subject: newTest.subject,
        topic: newTest.topic,
        difficulty: newTest.difficulty,
        totalQuestions: newTest.totalQuestions,
        questions: newTest.questions.map((q) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
        })),
        createdAt: newTest.createdAt,
      };

      return res.status(201).json({
        success: true,
        message: "Test generated successfully (cached)",
        data: testForUser,
      });
    }
    // ---------------------------------------------------------
    // CACHING LOGIC END
    // ---------------------------------------------------------

    // Generate questions using AI
    console.log(`📝 Generating ${count} questions for ${subject} - ${topic} (${difficulty})...`);
    const generationResult = await generateTestQuestions({
      subject,
      topic,
      difficulty,
      count: parseInt(count),
    });

    if (!generationResult.success) {
      // Provide more helpful error messages with detailed logging
      let errorMessage = generationResult.error || "Failed to generate questions";
      
      console.error("=".repeat(60));
      console.error("❌ Test generation FAILED in controller");
      console.error("   Error message:", errorMessage);
      console.error("   Generation result:", JSON.stringify(generationResult, null, 2));
      console.error("=".repeat(60));
      
      // Check for common API key issues
      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes("401") || lowerError.includes("unauthorized") || lowerError.includes("user not found") || lowerError.includes("invalid") && lowerError.includes("api key")) {
        errorMessage = "Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in the .env file. Get your key from https://openrouter.ai/keys";
      } else if (lowerError.includes("not configured") || lowerError.includes("missing") || lowerError.includes("required")) {
        errorMessage = "OpenRouter API key is not set. Please add OPENROUTER_API_KEY to your .env file.";
      } else if (lowerError.includes("model")) {
        errorMessage = `Invalid model configuration: ${errorMessage}. Please check OPENROUTER_MODEL in .env file.`;
      }

      console.error("   Final error message to user:", errorMessage);
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorMessage, // Include error field for debugging
      });
    }

    if (generationResult.questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "No questions were generated. Please try again.",
      });
    }

    // Create test document
    const test = new Test({
      userId: req.user?.id,
      subject,
      topic,
      difficulty,
      questions: generationResult.questions,
      totalQuestions: generationResult.questions.length,
    });

    await test.save();

    // Return test without correct answers (user shouldn't see them during test)
    const testForUser = {
      _id: test._id,
      subject: test.subject,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      questions: test.questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        // Don't send correctAnswer or explanation yet
      })),
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
    const { answers } = req.body; // { questionIndex: "A" | "B" | "C" | "D" }

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
      // Support both question ID format (preferred) and array index format
      const questionId = question._id.toString();
      const userAnswer = answers[questionId] || answers[question._id];
      
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
        topic: test.topic,
        difficulty: test.difficulty,
        totalQuestions: test.totalQuestions,
        score: test.score,
        correctAnswers: test.correctAnswers,
        wrongAnswers: test.wrongAnswers,
        accuracy: test.accuracy,
        questions: test.questions.map((q) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer,
          explanation: q.explanation,
          isCorrect: q.userAnswer === q.correctAnswer,
        })),
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

    // If test is submitted, return with answers and explanations
    if (test.isSubmitted) {
      return res.json({
        success: true,
        data: {
          _id: test._id,
          subject: test.subject,
          topic: test.topic,
          difficulty: test.difficulty,
          totalQuestions: test.totalQuestions,
          score: test.score,
          correctAnswers: test.correctAnswers,
          wrongAnswers: test.wrongAnswers,
          accuracy: test.accuracy,
          isSubmitted: true,
          questions: test.questions.map((q) => ({
            _id: q._id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            explanation: q.explanation,
            isCorrect: q.userAnswer === q.correctAnswer,
          })),
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
        topic: test.topic,
        difficulty: test.difficulty,
        totalQuestions: test.totalQuestions,
        questions: test.questions.map((q) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          userAnswer: q.userAnswer || null,
        })),
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
 * GET /api/tests?page=1&limit=10
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

    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Include tests with userId or without userId (for backward compatibility)
    const tests = await Test.find({
      $or: [
        { userId },
        { userId: { $exists: false } }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("userId subject topic difficulty totalQuestions score accuracy isSubmitted createdAt");

    const total = await Test.countDocuments({
      $or: [
        { userId },
        { userId: { $exists: false } }
      ]
    });

    res.json({
      success: true,
      data: {
        tests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
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

