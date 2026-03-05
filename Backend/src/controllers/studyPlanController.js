import {
  getPlan,
  getOrCreatePlan,
  toggleTaskComplete,
  getProgress,
  getDaysRemaining,
} from "../services/studyPlanService.js";

export const setupStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { examDate, dailyHours, preparationLevel } = req.body;
    if (!examDate) {
      return res.status(400).json({ message: "Exam date is required" });
    }
    const plan = await getOrCreatePlan(userId, {
      examDate,
      dailyHours: dailyHours ?? 6,
      preparationLevel: preparationLevel ?? "intermediate",
    });
    const progress = getProgress(plan);
    res.json({ plan, progress });
  } catch (error) {
    res.status(400).json({ message: error.message || "Setup failed" });
  }
};

export const getStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const plan = await getPlan(userId);
    if (!plan) {
      return res.json({ plan: null, progress: null, daysRemaining: null });
    }
    const progress = getProgress(plan);
    const daysRemaining = getDaysRemaining(plan);
    res.json({ plan, progress, daysRemaining });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load plan" });
  }
};

export const completeTask = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { taskId } = req.params;
    const { plan, task } = await toggleTaskComplete(userId, taskId);
    const progress = getProgress(plan);
    res.json({ plan, task, progress });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to update task" });
  }
};

export const getStudyPlanProgress = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const plan = await getPlan(userId);
    if (!plan) {
      return res.json({
        progress: {
          date: null,
          daily: { total: 0, completed: 0, percent: 0 },
          weekly: { total: 0, completed: 0, percent: 0 },
          streak: 0,
          longestStreak: 0,
        },
      });
    }
    const date = req.query.date || null;
    const progress = getProgress(plan, date);
    res.json({ progress });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load progress" });
  }
};
