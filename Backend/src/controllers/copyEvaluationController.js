import CopyEvaluation from "../models/CopyEvaluation.js";
import { processPDFForEvaluation } from "../services/pdfProcessingService.js";
import { advancedCopyEvaluationAgent } from "../agents/advancedCopyEvaluationAgent.js";

/**
 * Upload and evaluate PDF answer copy
 * POST /api/copy-evaluation/upload
 */
export const uploadAndEvaluateCopy = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file uploaded"
      });
    }

    // Check file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed"
      });
    }

    // Get metadata from request body
    const {
      subject = "General Studies",
      paper = "Unknown",
      year = new Date().getFullYear()
    } = req.body;

    const userId = req.user.id;

    console.log(`📤 Received PDF upload from user ${userId}`);
    console.log(`📄 File: ${req.file.originalname} (${req.file.size} bytes)`);

    // Step 1: Create initial evaluation record
    const evaluation = new CopyEvaluation({
      userId,
      pdfFileName: req.file.originalname,
      pdfFileSize: req.file.size,
      subject,
      paper,
      year,
      totalPages: 0,
      status: 'processing'
    });

    await evaluation.save();

    // Step 2: Process PDF (extract text, detect questions)
    console.log("🔄 Processing PDF...");
    const pdfBuffer = req.file.buffer;
    
    let processResult;
    try {
      processResult = await processPDFForEvaluation(pdfBuffer, {
        subject,
        paper,
        year
      });
    } catch (pdfError) {
      console.error("❌ PDF processing error:", pdfError);
      evaluation.status = 'failed';
      evaluation.errorMessage = pdfError.message || "PDF processing failed";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "Failed to process PDF",
        error: pdfError.message || "Unknown error during PDF processing"
      });
    }

    if (!processResult || !processResult.success) {
      evaluation.status = 'failed';
      evaluation.errorMessage = processResult?.error || "PDF processing failed";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "Failed to process PDF",
        error: processResult?.error || "Unknown error during PDF processing"
      });
    }

    // Validate that we have extracted answers
    if (!processResult.extractedAnswers || processResult.extractedAnswers.length === 0) {
      evaluation.status = 'failed';
      evaluation.errorMessage = "No answers extracted from PDF";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "Failed to process PDF",
        error: "No answers could be extracted from the PDF. Please ensure the PDF contains readable text."
      });
    }

    // Update evaluation with processing info
    evaluation.totalPages = processResult.metadata.totalPages;
    evaluation.isScanned = processResult.metadata.isScanned;
    await evaluation.save();

    // Step 3: Evaluate using AI agent
    console.log("🤖 Starting AI evaluation...");
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet"; // Best model for detailed evaluation

    // Validate API key
    if (!apiKey) {
      evaluation.status = 'failed';
      evaluation.errorMessage = "OPENROUTER_API_KEY is not configured";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "AI evaluation failed: OPENROUTER_API_KEY is not configured. Please set it in your .env file."
      });
    }

    let evaluationResult;
    try {
      evaluationResult = await advancedCopyEvaluationAgent.invoke({
        extractedAnswers: processResult.extractedAnswers,
        metadata: processResult.metadata,
        apiKey,
        model
      });
    } catch (agentError) {
      console.error("❌ Agent invocation error:", agentError);
      evaluation.status = 'failed';
      evaluation.errorMessage = agentError.message || "Agent invocation failed";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "AI evaluation failed",
        error: agentError.message || "Unknown error during agent invocation"
      });
    }

    if (!evaluationResult || !evaluationResult.success) {
      evaluation.status = 'failed';
      evaluation.errorMessage = evaluationResult?.error || "AI evaluation failed";
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "AI evaluation failed",
        error: evaluationResult?.error || "Unknown error during evaluation"
      });
    }

    // Step 4: Save evaluation results
    evaluation.evaluations = evaluationResult.evaluations;
    evaluation.pageWiseSummary = evaluationResult.pageWiseSummary;
    evaluation.finalSummary = evaluationResult.finalSummary;
    evaluation.status = 'completed';
    
    await evaluation.save();

    console.log(`✅ Evaluation completed for ${req.file.originalname}`);

    // Return response
    res.status(200).json({
      success: true,
      message: "Copy evaluated successfully",
      data: {
        evaluationId: evaluation._id,
        finalSummary: evaluation.finalSummary,
        totalQuestions: evaluation.evaluations.length,
        overallScore: evaluation.finalSummary.overallScore
      }
    });

  } catch (error) {
    console.error("Error in uploadAndEvaluateCopy:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get evaluation by ID
 * GET /api/copy-evaluation/:id
 */
export const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const evaluation = await CopyEvaluation.findOne({
      _id: id,
      userId
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found"
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });

  } catch (error) {
    console.error("Error in getEvaluationById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get all evaluations for user
 * GET /api/copy-evaluation/history
 */
export const getUserEvaluationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const evaluations = await CopyEvaluation.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('subject paper year pdfFileName finalSummary.overallScore status createdAt _id');

    const total = await CopyEvaluation.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        evaluations,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Error in getUserEvaluationHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get user analytics
 * GET /api/copy-evaluation/analytics
 */
export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const analytics = await CopyEvaluation.getUserAnalytics(userId);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error("Error in getUserAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete evaluation
 * DELETE /api/copy-evaluation/:id
 */
export const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const evaluation = await CopyEvaluation.findOneAndDelete({
      _id: id,
      userId
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Evaluation deleted successfully"
    });

  } catch (error) {
    console.error("Error in deleteEvaluation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get evaluation statistics
 * GET /api/copy-evaluation/:id/stats
 */
export const getEvaluationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const evaluation = await CopyEvaluation.findOne({
      _id: id,
      userId
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found"
      });
    }

    const stats = evaluation.calculateStats();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getEvaluationStats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export default {
  uploadAndEvaluateCopy,
  getEvaluationById,
  getUserEvaluationHistory,
  getUserAnalytics,
  deleteEvaluation,
  getEvaluationStats
};
