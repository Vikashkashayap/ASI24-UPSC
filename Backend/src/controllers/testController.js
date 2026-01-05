import Test from "../models/Test.js";
import { generateTestQuestions } from "../services/testGenerationService.js";

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

    // Find test
    const test = await Test.findById(id);
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
    const test = await Test.findById(id);

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
 * Get all tests (history)
 * GET /api/tests
 */
export const getTests = async (req, res) => {
  try {
    const tests = await Test.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("subject topic difficulty totalQuestions score accuracy isSubmitted createdAt");

    res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

