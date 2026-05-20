import {
  generateAdvancedPlan,
  getDashboard,
  completeTaskAdvanced,
  reorderTasks,
  analyzeMockTest,
  buildAnalytics,
  refreshAiInsights,
  mentorChat,
  regenerateMotivation,
} from "../services/advancedStudyPlannerService.js";

export const generatePlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      examDate,
      examType,
      targetYear,
      dailyHours,
      weakSubjects,
      strongSubjects,
      optionalSubject,
      preparationLevel,
      sleepTime,
      wakeTime,
      preferredSession,
      mockTestAverageScore,
    } = req.body;

    if (!examDate) {
      return res.status(400).json({ message: "Exam date is required" });
    }

    const result = await generateAdvancedPlan(userId, {
      examDate,
      examType: examType || "UPSC",
      targetYear: targetYear || "2026",
      dailyHours: dailyHours ?? 6,
      weakSubjects: Array.isArray(weakSubjects) ? weakSubjects : [],
      strongSubjects: Array.isArray(strongSubjects) ? strongSubjects : [],
      optionalSubject: optionalSubject || "",
      preparationLevel: preparationLevel || "intermediate",
      sleepTime: sleepTime || "23:00",
      wakeTime: wakeTime || "06:00",
      preferredSession: preferredSession || "morning",
      mockTestAverageScore: mockTestAverageScore ?? 0,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("generatePlan:", error);
    res.status(400).json({ message: error.message || "Failed to generate plan" });
  }
};

export const regeneratePlan = async (req, res) => {
  return generatePlan(req, res);
};

export const getDailyTasks = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const date = req.query.date;
    const dashboard = await getDashboard(userId, date);
    if (!dashboard.plan) {
      return res.json({ plan: null, dailyTasks: [], progress: null });
    }
    res.json({
      plan: dashboard.plan,
      dailyTasks: dashboard.dailyTasks,
      progress: dashboard.progress,
      daysRemaining: dashboard.daysRemaining,
      readiness: dashboard.readiness,
      streak: dashboard.streak,
      motivationalLine: dashboard.plan.motivationalLine,
      dailyQuote: dashboard.plan.dailyQuote,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load tasks" });
  }
};

export const getFullDashboard = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const dashboard = await getDashboard(userId, req.query.date);
    if (!dashboard.plan) {
      return res.json({ plan: null });
    }
    const insights = dashboard.insights?.length
      ? dashboard.insights
      : await refreshAiInsights(userId).catch(() => []);
    res.json({ ...dashboard, insights });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load dashboard" });
  }
};

export const completeTask = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ message: "taskId is required" });
    }
    const result = await completeTaskAdvanced(userId, taskId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to complete task" });
  }
};

export const reorderDailyTasks = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { date, taskIds } = req.body;
    if (!date || !Array.isArray(taskIds)) {
      return res.status(400).json({ message: "date and taskIds array required" });
    }
    const plan = await reorderTasks(userId, date, taskIds);
    res.json({ plan });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to reorder" });
  }
};

export const analyzeMock = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const result = await analyzeMockTest(userId, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ message: error.message || "Mock analysis failed" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const analytics = await buildAnalytics(userId);
    res.json({ analytics });
  } catch (error) {
    res.status(400).json({ message: error.message || "Analytics failed" });
  }
};

export const aiChat = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: "message is required" });
    }
    const result = await mentorChat(userId, message.trim());
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Chat failed" });
  }
};

export const refreshInsights = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const insights = await refreshAiInsights(userId);
    res.json({ insights });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to refresh insights" });
  }
};

export const regenerateMotivationLine = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const result = await regenerateMotivation(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed" });
  }
};
