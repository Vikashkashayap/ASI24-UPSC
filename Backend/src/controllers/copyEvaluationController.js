import CopyEvaluation from "../models/CopyEvaluation.js";
import {
  processUploadToImages,
  saveTempFile,
  removeTempFile,
} from "../services/copyFileService.js";
import { evaluateCopyWithVision } from "../services/visionCopyEvaluationService.js";
import {
  saveEvaluationPageImages,
  getPageImagePath,
  deleteEvaluationFiles,
} from "../services/copyEvaluationStorageService.js";
import fs from "fs";

const VISION_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

/**
 * Upload answer copy (PDF/image) and evaluate via vision AI
 * POST /api/copy-evaluation/upload
 */
export const uploadAndEvaluateCopy = async (req, res) => {
  let tempPath = null;

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        error: "Please upload a PDF or image file (JPEG, PNG, WebP)",
      });
    }

    const {
      subject = "General Studies",
      paper = "",
      year = new Date().getFullYear(),
      maxMarks = 15,
    } = req.body;

    const userId = req.user._id;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service not configured",
        error: "OPENROUTER_API_KEY is missing in server configuration",
      });
    }

    console.log(`📤 Vision copy upload: ${file.originalname} (${file.size} bytes)`);

    tempPath = await saveTempFile(file.buffer, file.originalname);

    let imageData;
    try {
      imageData = await processUploadToImages(file);
    } catch (convError) {
      return res.status(400).json({
        success: false,
        message: "Failed to process uploaded file",
        error: convError.message?.replace(/^[A-Z_]+:\s*/, "") || convError.message,
      });
    }

    const evaluation = new CopyEvaluation({
      userId,
      fileName: imageData.fileName,
      fileType: imageData.fileType,
      pdfFileName: imageData.fileName,
      pdfFileSize: imageData.fileSize,
      subject,
      paper: paper || "Unknown",
      year: parseInt(year, 10) || new Date().getFullYear(),
      totalPages: imageData.totalPages,
      evaluationMode: "vision",
      status: "processing",
    });

    await evaluation.save();

    const parsedMaxMarks = parseInt(maxMarks, 10) || 15;

    const visionResult = await evaluateCopyWithVision({
      pages: imageData.pages,
      metadata: { subject, paper, year },
      apiKey,
      model: VISION_MODEL,
      maxMarks: parsedMaxMarks,
    });

    if (!visionResult.success) {
      evaluation.status = "failed";
      evaluation.errorMessage = visionResult.error;
      await evaluation.save();

      return res.status(500).json({
        success: false,
        message: "AI evaluation failed",
        error: visionResult.error,
        evaluationId: evaluation._id,
      });
    }

    const result = visionResult.data;
    if (!result.maxMarks) result.maxMarks = parsedMaxMarks;
    if (result.marks == null && result.overallMarks != null) {
      result.marks = result.overallMarks;
    }
    result.overallMarks = result.marks;

    evaluation.visionResult = result;
    evaluation.aiModel = visionResult.model || VISION_MODEL;

    try {
      evaluation.storedPages = await saveEvaluationPageImages(
        evaluation._id,
        imageData.pages
      );
    } catch (storeErr) {
      console.warn("⚠️ Could not store page images:", storeErr.message);
    }

    evaluation.status = "completed";
    const obtained = result.marks ?? result.overallMarks;
    evaluation.finalSummary = {
      overallScore: {
        obtained,
        maximum: result.maxMarks,
        percentage: Math.round((obtained / result.maxMarks) * 100),
        grade: getGrade(obtained, result.maxMarks),
      },
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      improvementPlan: result.improvementPriority?.length
        ? result.improvementPriority
        : result.suggestions,
      upscRange: getUpscRange(obtained, result.maxMarks),
      metadata: {
        subject,
        paper: paper || "Unknown",
        year: evaluation.year,
        totalQuestions: 1,
        evaluationDate: new Date(),
      },
    };

    await evaluation.save();
    await removeTempFile(tempPath);
    tempPath = null;

    console.log(`✅ Vision evaluation completed: ${evaluation._id}`);

    return res.status(200).json({
      success: true,
      message: "Answer copy evaluated successfully",
      data: {
        evaluationId: evaluation._id,
        status: "completed",
        visionResult: result,
        storedPages: evaluation.storedPages,
        fileType: imageData.fileType,
        totalPages: imageData.totalPages,
        processedPages: imageData.processedPages,
        truncated: imageData.truncated,
      },
    });
  } catch (error) {
    console.error("Error in uploadAndEvaluateCopy:", error);
    if (tempPath) await removeTempFile(tempPath);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Legacy: process endpoint (redirects clients to re-upload for vision mode)
 * POST /api/copy-evaluation/:id/process
 */
export const processEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const evaluation = await CopyEvaluation.findOne({ _id: id, userId });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    if (evaluation.status === "completed" && evaluation.visionResult) {
      return res.status(200).json({
        success: true,
        message: "Evaluation already completed",
        data: {
          evaluationId: evaluation._id,
          status: "completed",
          visionResult: evaluation.visionResult,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Re-upload required",
      error:
        "Vision evaluation runs on upload. Please upload your answer copy again.",
    });
  } catch (error) {
    console.error("Error in processEvaluation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * GET /api/copy-evaluation/:id
 */
export const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const evaluation = await CopyEvaluation.findOne({ _id: id, userId });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation.toObject(),
    });
  } catch (error) {
    console.error("Error in getEvaluationById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * GET /api/copy-evaluation/history
 * GET /api/copy-evaluation/history/list (alias)
 */
export const getUserEvaluationHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const evaluations = await CopyEvaluation.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select(
        "subject paper year pdfFileName fileName fileType status evaluationMode visionResult finalSummary createdAt"
      );

    const total = await CopyEvaluation.countDocuments({ userId });

    const mapped = evaluations.map((e) => ({
      _id: e._id,
      subject: e.subject,
      paper: e.paper,
      year: e.year,
      fileName: e.fileName || e.pdfFileName,
      status: e.status,
      evaluationMode: e.evaluationMode,
      createdAt: e.createdAt,
      overallMarks:
        e.visionResult?.marks ??
        e.visionResult?.overallMarks ??
        e.finalSummary?.overallScore?.obtained,
      maxMarks:
        e.visionResult?.maxMarks ?? e.finalSummary?.overallScore?.maximum,
      percentage: e.finalSummary?.overallScore?.percentage,
    }));

    res.status(200).json({
      success: true,
      data: {
        evaluations: mapped,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error("Error in getUserEvaluationHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const analytics = await CopyEvaluation.getUserAnalytics(userId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error in getUserAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * GET /api/copy-evaluation/:id/pages/:pageNum
 * Serve stored page image (JPEG)
 */
export const getEvaluationPageImage = async (req, res) => {
  try {
    const { id, pageNum } = req.params;
    const userId = req.user._id;
    const pageNumber = parseInt(pageNum, 10);

    const evaluation = await CopyEvaluation.findOne({ _id: id, userId });
    if (!evaluation) {
      return res.status(404).json({ success: false, message: "Evaluation not found" });
    }

    const hasPage = evaluation.storedPages?.some((p) => p.pageNumber === pageNumber);
    if (!hasPage) {
      return res.status(404).json({ success: false, message: "Page image not found" });
    }

    const filePath = getPageImagePath(id, pageNumber);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Page file missing" });
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Error in getEvaluationPageImage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const evaluation = await CopyEvaluation.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    await deleteEvaluationFiles(id);

    res.status(200).json({
      success: true,
      message: "Evaluation deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteEvaluation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getEvaluationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const evaluation = await CopyEvaluation.findOne({ _id: id, userId });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    if (evaluation.visionResult) {
      const v = evaluation.visionResult;
      const obtained = v.marks ?? v.overallMarks ?? 0;
      return res.status(200).json({
        success: true,
        data: {
          overallMarks: obtained,
          marks: obtained,
          maxMarks: v.maxMarks,
          percentage: Math.round((obtained / v.maxMarks) * 100),
          wordCount: v.wordCount,
          wordLimitStatus: v.wordLimitStatus,
          strengthsCount: v.strengths?.length || 0,
          weaknessesCount: v.weaknesses?.length || 0,
          suggestionsCount:
            v.improvementPriority?.length || v.suggestions?.length || 0,
          bodySections: v.body?.length || 0,
        },
      });
    }

    const stats = evaluation.calculateStats?.() || {};
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error in getEvaluationStats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

function getGrade(obtained, maximum) {
  const pct = (obtained / maximum) * 100;
  if (pct >= 80) return "A";
  if (pct >= 65) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}

function getUpscRange(obtained, maximum) {
  const pct = (obtained / maximum) * 100;
  if (pct >= 75) return "Toppers Range";
  if (pct >= 55) return "Above Average";
  if (pct >= 40) return "Average";
  return "Below Average";
}

export default {
  uploadAndEvaluateCopy,
  processEvaluation,
  getEvaluationById,
  getEvaluationPageImage,
  getUserEvaluationHistory,
  getUserAnalytics,
  deleteEvaluation,
  getEvaluationStats,
};
