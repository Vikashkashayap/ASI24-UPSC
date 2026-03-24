import {
  getPlan,
  getOrCreatePlan,
  toggleTaskComplete,
  getProgress,
  getDaysRemaining,
  getPlanWithRollForward,
  buildPlannerDashboardSummary,
  explainStudyPlan,
  recordPlannerTestResult,
  skipPlannerTestTask,
} from "../services/studyPlanService.js";

function clientToday(req) {
  const q = req.query?.today || req.body?.clientToday;
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(String(q))) return String(q);
  return new Date().toISOString().slice(0, 10);
}

export const setupStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { examDate, dailyHours, preparationLevel, startDate, endDate, syllabusId, syllabusJson } = req.body;

    if (startDate && endDate) {
      const plan = await getOrCreatePlan(userId, {
        startDate,
        endDate,
        dailyHours: dailyHours ?? 6,
        preparationLevel: preparationLevel ?? "intermediate",
        syllabusId: syllabusId || undefined,
        syllabusJson: syllabusJson || undefined,
      });
      const today = clientToday(req);
      const rolled = await getPlanWithRollForward(userId, today);
      const progress = getProgress(rolled, new Date(`${today}T12:00:00`));
      const dashboard = buildPlannerDashboardSummary(rolled, today);
      return res.json({ plan: rolled, progress, daysRemaining: getDaysRemaining(rolled), dashboard });
    }

    if (!examDate) {
      return res.status(400).json({
        message: "Provide either startDate + endDate (syllabus plan) or examDate (classic plan).",
      });
    }

    const plan = await getOrCreatePlan(userId, {
      examDate,
      dailyHours: dailyHours ?? 6,
      preparationLevel: preparationLevel ?? "intermediate",
    });
    const today = clientToday(req);
    const rolled = await getPlanWithRollForward(userId, today);
    const progress = getProgress(rolled, new Date(`${today}T12:00:00`));
    const dashboard = buildPlannerDashboardSummary(rolled, today);
    res.json({ plan: rolled, progress, daysRemaining: getDaysRemaining(rolled), dashboard });
  } catch (error) {
    res.status(400).json({ message: error.message || "Setup failed" });
  }
};

export const getStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const today = clientToday(req);
    const plan = await getPlanWithRollForward(userId, today);
    if (!plan) {
      return res.json({
        plan: null,
        progress: null,
        daysRemaining: null,
        dashboard: null,
      });
    }
    const progress = getProgress(plan, new Date(`${today}T12:00:00`));
    const daysRemaining = getDaysRemaining(plan);
    const dashboard = buildPlannerDashboardSummary(plan, today);
    res.json({ plan, progress, daysRemaining, dashboard });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load plan" });
  }
};

export const completeTask = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { taskId } = req.params;
    const { plan, task } = await toggleTaskComplete(userId, taskId);
    const today = clientToday(req);
    const progress = getProgress(plan, new Date(`${today}T12:00:00`));
    const dashboard = buildPlannerDashboardSummary(plan, today);
    res.json({ plan, task, progress, dashboard });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to update task" });
  }
};

export const postExplainStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const result = await explainStudyPlan(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Explain failed" });
  }
};

export const patchPlannerTestResult = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { taskId } = req.params;
    const { accuracy } = req.body;
    const { plan, progress } = await recordPlannerTestResult(userId, taskId, accuracy);
    const today = clientToday(req);
    const dashboard = buildPlannerDashboardSummary(plan, today);
    res.json({ plan, progress, dashboard });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to save test result" });
  }
};

export const postSkipPlannerTest = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { taskId } = req.params;
    const { plan, progress } = await skipPlannerTestTask(userId, taskId);
    const today = clientToday(req);
    const dashboard = buildPlannerDashboardSummary(plan, today);
    res.json({ plan, progress, dashboard });
  } catch (error) {
    res.status(400).json({ message: error.message || "Skip failed" });
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
    const progress = getProgress(plan, date ? new Date(`${date}T12:00:00`) : null);
    res.json({ progress });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to load progress" });
  }
};
