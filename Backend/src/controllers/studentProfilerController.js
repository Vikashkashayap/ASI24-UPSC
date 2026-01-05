import { generateStudentStudyPlanService } from "../services/studentProfilerService.js";

/**
 * Generate personalized study plan for student
 * POST /api/agents/student-profiler
 */
export const generateStudyPlan = async (req, res) => {
  try {
    const { targetYear, dailyHours, weakSubjects, examStage, currentDate } = req.body;

    console.log("📋 Student Profiler Request:", {
      targetYear,
      dailyHours,
      weakSubjects,
      examStage,
      currentDate,
    });

    // Call service
    const result = await generateStudentStudyPlanService({
      targetYear,
      dailyHours,
      weakSubjects,
      examStage,
      currentDate,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "Study plan generated successfully",
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("❌ Error in generateStudyPlan controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      error: error.message,
    });
  }
};

export default {
  generateStudyPlan,
};

