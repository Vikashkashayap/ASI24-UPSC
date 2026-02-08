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

    const userId = req.user._id;

    console.log(`📤 Received PDF upload from user ${userId}`);
    console.log(`📄 File: ${req.file.originalname} (${req.file.size} bytes)`);

    // Step 1: Create initial evaluation record with status 'pending'
    const evaluation = new CopyEvaluation({
      userId,
      pdfFileName: req.file.originalname,
      pdfFileSize: req.file.size,
      subject,
      paper,
      year,
      totalPages: 0,
      status: 'pending'
    });

    await evaluation.save();

    // Step 2: Process PDF (extract text, detect questions)
    console.log("🔄 Processing PDF...");
    const pdfBuffer = req.file.buffer;
    
    // Validate PDF buffer before processing
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      evaluation.status = 'failed';
      evaluation.errorMessage = "Invalid PDF file: File is empty or corrupted";
      await evaluation.save();

      return res.status(400).json({
        success: false,
        message: "Invalid PDF file",
        error: "The uploaded file is empty or not a valid PDF. Please check the file and try again."
      });
    }

    // Check PDF header
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      evaluation.status = 'failed';
      evaluation.errorMessage = "Invalid PDF file: Missing PDF header";
      await evaluation.save();

      return res.status(400).json({
        success: false,
        message: "Invalid PDF file",
        error: "The uploaded file does not appear to be a valid PDF. Please ensure you're uploading a PDF file."
      });
    }
    
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
        error: pdfError.message || "Unknown error during PDF processing",
        suggestion: "The PDF may be corrupted. Try re-saving the PDF or use a different file."
      });
    }

    if (!processResult || !processResult.success) {
      evaluation.status = 'failed';
      evaluation.errorMessage = processResult?.error || "PDF processing failed";
      await evaluation.save();

      // Provide helpful error messages based on error type
      let userFriendlyError = processResult?.error || "Unknown error during PDF processing";
      let suggestion = "Please try uploading a different PDF file.";

      if (processResult?.error?.includes("bad XRef entry") || 
          processResult?.error?.includes("corrupted") ||
          processResult?.error?.includes("invalid structure") ||
          processResult?.error?.includes("FormatError")) {
        suggestion = "The PDF appears to be corrupted or has an invalid structure. Please try:\n1. Re-saving the PDF in a PDF editor (like Adobe Acrobat)\n2. Exporting the document as a new PDF\n3. Using a different PDF file";
        userFriendlyError = "PDF file is corrupted or has invalid structure. Please re-save the PDF or use a different file.";
      } else if (processResult?.error?.includes("password") || processResult?.error?.includes("encrypted")) {
        suggestion = "The PDF is password-protected. Please remove the password and try again.";
      } else if (processResult?.error?.includes("no text")) {
        suggestion = "The PDF appears to be image-only. Please use a PDF with selectable text, or ensure OCR is enabled.";
      }

      return res.status(500).json({
        success: false,
        message: "Failed to process PDF",
        error: userFriendlyError,
        suggestion: suggestion
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

    // Store extracted answers and metadata for later AI evaluation
    evaluation.extractedAnswers = processResult.extractedAnswers;
    evaluation.pdfProcessingMetadata = processResult.metadata;
    evaluation.totalPages = processResult.metadata.totalPages;
    evaluation.isScanned = processResult.metadata.isScanned;
    evaluation.rawText = processResult.raw_text || null; // Store raw text for preview
    evaluation.confidenceScore = processResult.confidence_score || 1.0; // Store confidence score
    await evaluation.save();

    console.log(`✅ PDF processed successfully. Evaluation ID: ${evaluation._id}`);

    // Return immediately with evaluationId and raw text for preview
    res.status(200).json({
      success: true,
      message: "PDF uploaded and processed successfully. Please review the extracted text before evaluation.",
      data: {
        evaluationId: evaluation._id,
        status: 'pending',
        rawText: processResult.raw_text || null,
        confidenceScore: processResult.confidence_score || 1.0,
        totalAnswers: processResult.extractedAnswers?.length || 0
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
    const userId = req.user._id;
    const { includeRawText } = req.query; // Optional query param to include raw text

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

    // Prepare response data
    const responseData = evaluation.toObject();
    
    // Include raw text if requested and available
    if (includeRawText === 'true' && evaluation.rawText) {
      responseData.rawText = evaluation.rawText;
      responseData.confidenceScore = evaluation.confidenceScore || 1.0;
    }

    res.status(200).json({
      success: true,
      data: responseData
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
    const userId = req.user._id;
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
    const userId = req.user._id;

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
    const userId = req.user._id;

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
    const userId = req.user._id;

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

/**
 * Process AI evaluation for an uploaded PDF
 * POST /api/copy-evaluation/:id/process
 */
export const processEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log(`🤖 Starting AI evaluation for evaluation ID: ${id}`);

    // Find the evaluation record
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

    // Check if already processed
    if (evaluation.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: "Evaluation already completed",
        data: {
          evaluationId: evaluation._id,
          finalSummary: evaluation.finalSummary,
          totalQuestions: evaluation.evaluations.length,
          overallScore: evaluation.finalSummary.overallScore
        }
      });
    }

    // Check if processing
    if (evaluation.status === 'processing') {
      return res.status(200).json({
        success: true,
        message: "Evaluation is already being processed",
        data: {
          evaluationId: evaluation._id,
          status: 'processing'
        }
      });
    }

    // Validate that we have extracted answers
    if (!evaluation.extractedAnswers || evaluation.extractedAnswers.length === 0) {
      evaluation.status = 'failed';
      evaluation.errorMessage = "No extracted answers found. Please re-upload the PDF.";
      await evaluation.save();

      return res.status(400).json({
        success: false,
        message: "No extracted answers found",
        error: "The PDF was not processed correctly. Please re-upload the PDF."
      });
    }

    // Update status to processing
    evaluation.status = 'processing';
    await evaluation.save();

    // Step 3: Evaluate using AI agent
    console.log("🤖 Starting AI evaluation...");
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-1.5-flash";

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
        extractedAnswers: evaluation.extractedAnswers,
        metadata: evaluation.pdfProcessingMetadata,
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
    
    // Clean up temporary data (optional, to save space)
    evaluation.extractedAnswers = undefined;
    evaluation.pdfProcessingMetadata = undefined;
    
    await evaluation.save();

    console.log(`✅ Evaluation completed for ${evaluation.pdfFileName}`);

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
    console.error("Error in processEvaluation:", error);
    
    // Try to update evaluation status to failed
    try {
      const evaluation = await CopyEvaluation.findById(req.params.id);
      if (evaluation) {
        evaluation.status = 'failed';
        evaluation.errorMessage = error.message || "Internal server error";
        await evaluation.save();
      }
    } catch (updateError) {
      console.error("Failed to update evaluation status:", updateError);
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export default {
  uploadAndEvaluateCopy,
  processEvaluation,
  getEvaluationById,
  getUserEvaluationHistory,
  getUserAnalytics,
  deleteEvaluation,
  getEvaluationStats
};
