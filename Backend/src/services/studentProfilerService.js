import { generateStudentStudyPlan } from "../agents/studentProfilerAgent.js";

/**
 * Student Profiler Service
 * Service layer for student study plan generation
 */

/**
 * Validate student profiler input
 * @param {Object} input - Input to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const validateStudentProfilerInput = (input) => {
  const errors = [];

  if (!input.targetYear) {
    errors.push("targetYear is required");
  } else {
    const year = parseInt(input.targetYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < currentYear || year > currentYear + 5) {
      errors.push("targetYear must be a valid year between current year and 5 years ahead");
    }
  }

  if (input.dailyHours === undefined || input.dailyHours === null) {
    errors.push("dailyHours is required");
  } else {
    const hours = parseFloat(input.dailyHours);
    if (isNaN(hours) || hours < 1 || hours > 16) {
      errors.push("dailyHours must be between 1 and 16 hours");
    }
  }

  if (!Array.isArray(input.weakSubjects)) {
    errors.push("weakSubjects must be an array");
  }

  const validExamStages = ["Prelims", "Mains", "Both"];
  if (!input.examStage || !validExamStages.includes(input.examStage)) {
    errors.push(`examStage must be one of: ${validExamStages.join(", ")}`);
  }

  if (!input.currentDate) {
    errors.push("currentDate is required");
  } else {
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.currentDate)) {
      errors.push("currentDate must be in YYYY-MM-DD format");
    } else {
      const date = new Date(input.currentDate);
      if (isNaN(date.getTime())) {
        errors.push("currentDate must be a valid date");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Generate student study plan
 * @param {Object} input - Student profile input
 * @returns {Promise<Object>} - Generated study plan with metadata
 */
export const generateStudentStudyPlanService = async (input) => {
  // Validate input
  const validation = validateStudentProfilerInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(", ")}`,
      data: null,
    };
  }

  try {
    // Normalize input
    const normalizedInput = {
      targetYear: String(input.targetYear),
      dailyHours: parseFloat(input.dailyHours),
      weakSubjects: Array.isArray(input.weakSubjects) ? input.weakSubjects : [],
      examStage: input.examStage,
      currentDate: input.currentDate,
    };

    // Generate plan using agent
    const result = await generateStudentStudyPlan(normalizedInput);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to generate study plan",
        data: null,
      };
    }

    return {
      success: true,
      data: result.plan,
      metadata: {
        model: result.model,
        usage: result.usage,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error in generateStudentStudyPlanService:", error);
    return {
      success: false,
      error: error.message || "Internal server error",
      data: null,
    };
  }
};

export default {
  generateStudentStudyPlanService,
  validateStudentProfilerInput,
};

