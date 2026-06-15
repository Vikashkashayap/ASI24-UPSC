import { StudyPlan } from "../models/StudyPlan.js";
import { MockResult } from "../models/MockResult.js";
import { WeakTopic } from "../models/WeakTopic.js";
import { callOpenRouterAPI, parseJSONFromResponse } from "./openRouterService.js";
import { getChatModel } from "../config/openRouterModels.js";
import { PLANNER_MAX_TOKENS, CHAT_MAX_TOKENS } from "../config/openRouterDefaults.js";
import crypto from "crypto";
import { generateTasks, getProgress, getDaysRemaining, toggleTaskComplete, recalculateStreak } from "./studyPlanService.js";
import { getPerformanceSummary } from "./performanceService.js";
import { applySyllabusToTasks } from "./syllabusTopicPool.js";
import {
  prioritizeWeakSubjectsInTasks,
  syncRevisionSchedules,
  cachePlannerAnalytics,
} from "./smartDailyPlannerService.js";
import { calculateReadinessFromPlan } from "./readinessService.js";

export { calculateReadinessFromPlan };
import {
  STUDY_PLAN_GENERATION_SYSTEM,
  WEAKNESS_ANALYSIS_SYSTEM,
  READINESS_PREDICTION_SYSTEM,
  AI_RECOMMENDATIONS_SYSTEM,
  MENTOR_CHAT_SYSTEM,
  buildStudyPlanUserPrompt,
  buildMentorChatUserPrompt,
  buildMockAnalysisUserPrompt,
} from "../prompts/studyPlannerPrompts.js";

const SUBJECTS = [
  "Polity", "History", "Geography", "Economy",
  "Environment", "Science & Tech", "Current Affairs", "CSAT",
];

const DEFAULT_BADGES = [
  { id: "first_task", name: "First Step", icon: "🎯", xp: 10 },
  { id: "streak_3", name: "3 Day Streak", icon: "🔥", xp: 30 },
  { id: "streak_7", name: "7 Day Streak", icon: "🔥", xp: 70 },
  { id: "streak_30", name: "Consistency Hero", icon: "📈", xp: 200 },
  { id: "mcq_master", name: "MCQ Master", icon: "🏆", xp: 50 },
  { id: "mock_ace", name: "Mock Ace", icon: "⭐", xp: 80 },
];

const QUOTES = [
  "Small daily improvements lead to stunning results.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your competition is yesterday's you.",
  "Consistency beats intensity when intensity is inconsistent.",
  "The syllabus is vast; your daily focus is not.",
];

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function getStartTimeForSession(preferredSession, wakeTime) {
  const map = {
    morning: wakeTime || "06:00",
    afternoon: "14:00",
    evening: "18:00",
    night: "21:00",
  };
  return map[preferredSession] || wakeTime || "07:00";
}

async function callAI(systemPrompt, userPrompt, maxTokens = PLANNER_MAX_TOKENS) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = getChatModel();
  if (!apiKey) return null;
  const res = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature: 0.4,
    maxTokens,
  });
  if (!res.success) return null;
  return parseJSONFromResponse(res.content) || null;
}

function enrichTasksWithMeta(tasks, profile) {
  const weak = new Set((profile.weakSubjects || []).map((s) => s.toLowerCase()));
  let order = 0;
  return tasks.map((t) => {
    const isWeak = weak.has((t.subject || "").toLowerCase());
    return {
      ...t,
      difficulty: t.taskType === "mock_test" ? "hard" : t.taskType === "revision" ? "medium" : isWeak ? "hard" : "medium",
      priority: isWeak || t.taskType === "mock_test" ? "high" : t.taskType === "current_affairs" ? "medium" : "medium",
      sortOrder: order++,
    };
  });
}

function buildFallbackPlanMeta(profile, performance) {
  const weak = profile.weakSubjects?.[0] || performance?.weakSubjects?.[0] || "Polity";
  return {
    motivationalLine: `Focus on ${weak} today — every hour compounds toward ${profile.examType || "UPSC"} ${profile.targetYear || "2026"}.`,
    weeklyGoals: [
      `Complete daily tasks for ${weak} and Current Affairs`,
      "Maintain your study streak — finish at least 3 tasks daily",
      "Take one full mock test this week",
    ],
    monthlyTargets: [
      "Cover 4 core GS subjects with revision cycles",
      "Improve mock average by 10%",
      "Build 20+ day consistency streak",
    ],
    revisionStrategy: "Use 1-7-30 spaced revision: revise each studied topic after 1 day, 7 days, and 30 days.",
    insights: [
      { type: "tip", title: "Weak area focus", message: `Allocate extra time to ${weak} this week.`, priority: "high", subject: weak },
      { type: "success", title: "Daily CA", message: "20 min current affairs keeps Prelims GS updated.", priority: "medium" },
    ],
  };
}

function awardBadgesAndXp(plan) {
  const badges = [...(plan.badges || [])];
  const earnedIds = new Set(badges.map((b) => b.id));
  let xp = plan.xpPoints || 0;

  const addBadge = (id) => {
    const def = DEFAULT_BADGES.find((b) => b.id === id);
    if (def && !earnedIds.has(id)) {
      badges.push({ id: def.id, name: def.name, icon: def.icon, earnedAt: new Date() });
      xp += def.xp;
      earnedIds.add(id);
    }
  };

  const completedCount = (plan.tasks || []).filter((t) => t.completed).length;
  if (completedCount >= 1) addBadge("first_task");
  if ((plan.currentStreak || 0) >= 3) addBadge("streak_3");
  if ((plan.currentStreak || 0) >= 7) addBadge("streak_7");
  if ((plan.currentStreak || 0) >= 30) addBadge("streak_30");
  const mcqDone = (plan.tasks || []).filter((t) => t.taskType === "mcq_practice" && t.completed).length;
  if (mcqDone >= 10) addBadge("mcq_master");
  if ((plan.mockTestAverageScore || 0) >= 70) addBadge("mock_ace");

  return { badges, xpPoints: xp };
}

function updateHeatmap(plan, dateStr) {
  const heatmap = [...(plan.heatmap || [])];
  const dayTasks = (plan.tasks || []).filter((t) => t.date === dateStr);
  const completed = dayTasks.filter((t) => t.completed).length;
  const studyMinutes = dayTasks.filter((t) => t.completed).reduce((s, t) => s + (t.duration || 0), 0);
  const idx = heatmap.findIndex((h) => h.date === dateStr);
  const entry = { date: dateStr, completedTasks: completed, totalTasks: dayTasks.length, studyMinutes };
  if (idx >= 0) heatmap[idx] = entry;
  else heatmap.push(entry);
  return heatmap.slice(-90);
}

export async function rolloverMissedTasks(userId) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) return;
  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  let changed = false;
  for (const task of plan.tasks) {
    if (!task.completed && task.date < today && task.date <= yesterday) {
      task.date = today;
      task.rescheduledFrom = task.rescheduledFrom || task.date;
      task.priority = "high";
      changed = true;
    }
  }
  if (changed) await plan.save();
}

export async function generateAdvancedPlan(userId, profile) {
  const performance = await getPerformanceSummary(userId);
  const examDate = new Date(profile.examDate);
  if (isNaN(examDate.getTime())) throw new Error("Valid exam date is required");

  const weakSubjects =
    profile.weakSubjects?.length > 0
      ? profile.weakSubjects
      : performance.weakSubjects?.length > 0
        ? performance.weakSubjects
        : ["Polity", "Economy"];

  const mergedProfile = {
    ...profile,
    weakSubjects,
    startDate: toDateString(new Date()),
  };

  const daysUntilExam = Math.max(1, Math.ceil((examDate - new Date()) / 86400000));
  let aiMeta = await callAI(
    STUDY_PLAN_GENERATION_SYSTEM,
    buildStudyPlanUserPrompt(mergedProfile, performance, daysUntilExam)
  );
  if (!aiMeta) aiMeta = buildFallbackPlanMeta(mergedProfile, performance);

  let tasks = generateTasks(examDate, profile.dailyHours ?? 6, profile.preparationLevel ?? "intermediate");
  tasks = prioritizeWeakSubjectsInTasks(tasks, weakSubjects);
  tasks = applySyllabusToTasks(tasks, weakSubjects);
  tasks = enrichTasksWithMeta(tasks, mergedProfile);

  if (aiMeta.recommendedTasks?.length > 0) {
    const startTime = getStartTimeForSession(profile.preferredSession, profile.wakeTime);
    for (const rt of aiMeta.recommendedTasks.slice(0, 30)) {
      const exists = tasks.some(
        (t) => t.date === rt.date && t.subject === rt.subject && t.topic === rt.topic
      );
      if (!exists && rt.date) {
        const dur = rt.duration || 45;
        tasks.push({
          date: rt.date,
          subject: rt.subject || "General",
          topic: rt.topic || rt.subject,
          taskType: rt.taskType || "subject_study",
          duration: dur,
          startTime: rt.startTime || startTime,
          endTime: addMinutesToTime(rt.startTime || startTime, dur),
          completed: false,
          completedAt: null,
          difficulty: rt.difficulty || "medium",
          priority: rt.priority || "medium",
          sortOrder: tasks.length,
        });
      }
    }
    tasks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }

  const readiness = calculateReadinessFromPlan(
    { tasks, dailyHours: profile.dailyHours, currentStreak: 0, mockTestAverageScore: profile.mockTestAverageScore },
    profile.mockTestAverageScore
  );

  const existing = await StudyPlan.findOne({ userId }).lean();
  const { badges, xpPoints } = awardBadgesAndXp({
    badges: existing?.badges || [],
    xpPoints: existing?.xpPoints || 0,
    tasks: existing?.tasks || [],
    currentStreak: existing?.currentStreak || 0,
    mockTestAverageScore: profile.mockTestAverageScore,
  });

  const data = {
    userId,
    examDate,
    examType: profile.examType || "UPSC",
    targetYear: profile.targetYear || "2026",
    dailyHours: profile.dailyHours ?? 6,
    preparationLevel: profile.preparationLevel ?? "intermediate",
    weakSubjects,
    strongSubjects: profile.strongSubjects || [],
    optionalSubject: profile.optionalSubject || "",
    sleepTime: profile.sleepTime || "23:00",
    wakeTime: profile.wakeTime || "06:00",
    preferredSession: profile.preferredSession || "morning",
    mockTestAverageScore: profile.mockTestAverageScore ?? 0,
    subjects: SUBJECTS,
    tasks,
    motivationalLine: aiMeta.motivationalLine || buildFallbackPlanMeta(mergedProfile, performance).motivationalLine,
    weeklyGoals: aiMeta.weeklyGoals || [],
    monthlyTargets: aiMeta.monthlyTargets || [],
    revisionStrategy: aiMeta.revisionStrategy || "",
    aiInsights: (aiMeta.insights || []).map((i) => ({ ...i, createdAt: new Date() })),
    revisionSchedule: buildRevisionSchedule(tasks),
    readinessScore: readiness.readinessScore,
    readinessBreakdown: readiness.readinessBreakdown,
    dailyQuote: QUOTES[Math.floor(Math.random() * QUOTES.length)],
    badges,
    xpPoints,
    currentStreak: existing?.currentStreak ?? 0,
    longestStreak: existing?.longestStreak ?? 0,
    lastCompletedDate: existing?.lastCompletedDate ?? null,
    lastAiGeneratedAt: new Date(),
  };

  const plan = await StudyPlan.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  await WeakTopic.deleteMany({ userId, source: "planner" });
  if (weakSubjects?.length) {
    await WeakTopic.insertMany(
      weakSubjects.map((subject) => ({
        userId,
        subject,
        source: "planner",
        priority: "high",
      }))
    );
  }

  return {
    plan,
    progress: getProgress(plan),
    daysRemaining: getDaysRemaining(plan),
  };
}

function buildRevisionSchedule(tasks) {
  const studyTasks = (tasks || []).filter((t) => t.taskType === "subject_study").slice(0, 20);
  return studyTasks.map((t) => {
    const d = new Date(t.date);
    const revDates = [1, 7, 30].map((offset) => {
      const rd = new Date(d);
      rd.setDate(rd.getDate() + offset);
      return toDateString(rd);
    });
    return { topic: t.topic, subject: t.subject, studyDate: t.date, revisionDates: revDates, cycle: "7-day" };
  });
}

export async function getDashboard(userId, date) {
  await rolloverMissedTasks(userId);
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) return { plan: null };
  const dateStr = date || toDateString(new Date());
  const dayTasks = (plan.tasks || [])
    .filter((t) => t.date === dateStr)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.startTime || "").localeCompare(b.startTime || ""));

  const analytics = await buildAnalytics(userId, plan);
  await cachePlannerAnalytics(userId, analytics).catch(() => {});

  return {
    plan,
    progress: getProgress(plan, dateStr),
    daysRemaining: getDaysRemaining(plan),
    dailyTasks: dayTasks,
    analytics,
    insights: plan.aiInsights || [],
    streak: {
      current: plan.currentStreak ?? 0,
      longest: plan.longestStreak ?? 0,
      xp: plan.xpPoints ?? 0,
      badges: plan.badges || [],
    },
    readiness: {
      score: plan.readinessScore ?? 0,
      breakdown: plan.readinessBreakdown || {},
    },
  };
}

export async function completeTaskAdvanced(userId, taskId) {
  const result = await toggleTaskComplete(userId, taskId);
  const planDoc = await StudyPlan.findOne({ userId });
  if (planDoc) {
    const today = toDateString(new Date());
    planDoc.heatmap = updateHeatmap(planDoc, today);
    if (result.task?.completed) {
      planDoc.totalStudyMinutes = (planDoc.totalStudyMinutes || 0) + (result.task.duration || 0);
      planDoc.xpPoints = (planDoc.xpPoints || 0) + 15;
      if (result.task.taskType === "subject_study") {
        result.task.practiceUnlocked = true;
        await syncRevisionSchedules(userId, planDoc, result.task).catch(() => {});
      }
    }
    const { badges, xpPoints } = awardBadgesAndXp(planDoc);
    planDoc.badges = badges;
    planDoc.xpPoints = xpPoints;
    const readiness = calculateReadinessFromPlan(planDoc, planDoc.mockTestAverageScore);
    planDoc.readinessScore = readiness.readinessScore;
    planDoc.readinessBreakdown = readiness.readinessBreakdown;
    await planDoc.save();
  }
  const plan = await StudyPlan.findOne({ userId }).lean();
  return { plan, task: result.task, progress: getProgress(plan) };
}

export async function reorderTasks(userId, date, taskIds) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");
  taskIds.forEach((id, index) => {
    const task = plan.tasks.id(id);
    if (task && task.date === date) task.sortOrder = index;
  });
  await plan.save();
  return StudyPlan.findOne({ userId }).lean();
}

export async function analyzeMockTest(userId, mockData) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  const scorePercent =
    mockData.scorePercent ??
    Math.round(((mockData.correctAnswers || 0) / (mockData.totalQuestions || 100)) * 100);

  let aiAnalysis = null;
  const aiResult = await callAI(
    WEAKNESS_ANALYSIS_SYSTEM,
    buildMockAnalysisUserPrompt({ ...mockData, scorePercent }, plan)
  );
  if (aiResult) aiAnalysis = aiResult;

  const mock = await MockResult.create({
    userId,
    examType: mockData.examType || plan?.examType || "UPSC",
    testName: mockData.testName || "Mock Test",
    totalQuestions: mockData.totalQuestions || 100,
    correctAnswers: mockData.correctAnswers || Math.round((scorePercent / 100) * (mockData.totalQuestions || 100)),
    scorePercent,
    subjectBreakdown: mockData.subjectBreakdown || [],
    weakTopics: aiAnalysis?.weakTopics || mockData.weakTopics || [],
    durationMinutes: mockData.durationMinutes || 120,
    aiAnalysis: aiAnalysis
      ? { summary: aiAnalysis.summary, recommendations: aiAnalysis.recommendations, accuracyTrend: aiAnalysis.accuracyTrend }
      : null,
  });

  if (plan) {
    const recentMocks = await MockResult.find({ userId }).sort({ takenAt: -1 }).limit(5).lean();
    const avg = Math.round(recentMocks.reduce((s, m) => s + m.scorePercent, 0) / recentMocks.length);
    await StudyPlan.updateOne(
      { userId },
      {
        $set: { mockTestAverageScore: avg },
        $push: {
          aiInsights: {
            $each: [
              {
                type: scorePercent >= 60 ? "success" : "warning",
                title: scorePercent >= 60 ? "Mock improvement" : "Mock needs work",
                message: aiAnalysis?.summary || `Scored ${scorePercent}% — review weak topics.`,
                priority: "high",
                createdAt: new Date(),
              },
            ],
            $slice: -10,
          },
        },
      }
    );
    const updated = await StudyPlan.findOne({ userId });
    const readiness = calculateReadinessFromPlan(updated, avg);
    updated.readinessScore = readiness.readinessScore;
    updated.readinessBreakdown = readiness.readinessBreakdown;
    await updated.save();
  }

  return { mock, analysis: aiAnalysis };
}

export async function buildAnalytics(userId, plan) {
  const p = plan || (await StudyPlan.findOne({ userId }).lean());
  const mocks = await MockResult.find({ userId }).sort({ takenAt: -1 }).limit(12).lean();
  const tasks = p?.tasks || [];
  const today = new Date();

  const consistency = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = toDateString(d);
    const dayTasks = tasks.filter((t) => t.date === ds);
    const completed = dayTasks.filter((t) => t.completed).length;
    consistency.push({
      date: ds,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      completed,
      total: dayTasks.length,
      percent: dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : 0,
    });
  }

  const subjectMap = {};
  for (const t of tasks) {
    if (!subjectMap[t.subject]) subjectMap[t.subject] = { total: 0, completed: 0 };
    subjectMap[t.subject].total++;
    if (t.completed) subjectMap[t.subject].completed++;
  }
  const subjectStrength = Object.entries(subjectMap).map(([subject, v]) => ({
    subject,
    strength: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    completed: v.completed,
    total: v.total,
  }));

  const weakTopics = (p?.weakSubjects || []).map((s) => ({
    topic: s,
    accuracy: Math.max(20, 100 - (subjectMap[s]?.completed / (subjectMap[s]?.total || 1)) * 100),
  }));

  const dailyHours = consistency.map((c) => {
    const mins = tasks
      .filter((t) => t.date === c.date && t.completed)
      .reduce((s, t) => s + (t.duration || 0), 0);
    return { date: c.date, label: c.label, hours: Math.round((mins / 60) * 10) / 10 };
  });

  const mockPerformance = mocks.length
    ? mocks.reverse().map((m) => ({
        date: toDateString(new Date(m.takenAt)),
        score: m.scorePercent,
        name: m.testName,
      }))
    : generateDummyMockData();

  const totalTasks = tasks.length || 1;
  const completedTasks = tasks.filter((t) => t.completed).length;

  return {
    consistency,
    subjectStrength,
    weakTopics: weakTopics.length ? weakTopics : [{ topic: "Polity", accuracy: 45 }, { topic: "Economy", accuracy: 52 }],
    dailyHours,
    mockPerformance,
    completionPercent: Math.round((completedTasks / totalTasks) * 100),
    heatmap: p?.heatmap || [],
  };
}

function generateDummyMockData() {
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    data.push({ date: toDateString(d), score: 52 + Math.floor(Math.random() * 20), name: `Mock ${6 - i}` });
  }
  return data;
}

export async function refreshAiInsights(userId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) return [];
  const analytics = await buildAnalytics(userId, plan);
  const aiInsights = await callAI(
    AI_RECOMMENDATIONS_SYSTEM,
    `Analytics: ${JSON.stringify({ subjectStrength: analytics.subjectStrength, completion: analytics.completionPercent, streak: plan.currentStreak })}`
  );
  const insights = Array.isArray(aiInsights)
    ? aiInsights
    : [
        { type: "tip", title: "Stay consistent", message: "Your consistency improved — keep the streak alive!", priority: "medium" },
        ...(plan.weakSubjects || []).slice(0, 1).map((s) => ({
          type: "warning",
          title: `Revise ${s}`,
          message: `${s} needs focused revision based on your plan.`,
          priority: "high",
          subject: s,
        })),
      ];

  await StudyPlan.updateOne(
    { userId },
    { $set: { aiInsights: insights.map((i) => ({ ...i, createdAt: new Date() })) } }
  );
  return insights;
}

export async function mentorChat(userId, message) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  const performance = await getPerformanceSummary(userId);
  const analytics = plan ? await buildAnalytics(userId, plan) : null;
  const context = {
    examType: plan?.examType,
    targetYear: plan?.targetYear,
    readinessScore: plan?.readinessScore,
    streak: plan?.currentStreak,
    weakSubjects: plan?.weakSubjects,
    mockAverage: plan?.mockTestAverageScore,
    todayProgress: plan ? getProgress(plan) : null,
    performanceWeak: performance.weakSubjects,
    subjectStrength: analytics?.subjectStrength?.slice(0, 5),
  };

  const cacheKey = crypto
    .createHash("sha256")
    .update(JSON.stringify({ message, context }))
    .digest("hex")
    .slice(0, 24);

  const aiReply = await callOpenRouterAPI({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: getChatModel(),
    systemPrompt: MENTOR_CHAT_SYSTEM,
    userPrompt: buildMentorChatUserPrompt(message, context),
    temperature: 0.6,
    maxTokens: CHAT_MAX_TOKENS,
    cacheTtlSec: 3600,
    cacheKey: `mentor-chat:${cacheKey}`,
    label: "mentor-chat",
  });

  const reply =
    aiReply.success && aiReply.content
      ? aiReply.content
      : getFallbackMentorReply(message, context);

  return { reply, context };
}

function getFallbackMentorReply(message, ctx) {
  const lower = message.toLowerCase();
  if (lower.includes("today") || lower.includes("study")) {
    const weak = ctx.weakSubjects?.[0] || "Polity";
    return `Today, prioritize ${weak} for 2 hours, then Current Affairs (20 min) and MCQ practice. Your readiness is ${ctx.readinessScore ?? 0}% — ${ctx.streak ?? 0} day streak. Keep going!`;
  }
  if (lower.includes("weak") || lower.includes("low")) {
    return `Your weakest areas: ${(ctx.weakSubjects || ctx.performanceWeak || ["Polity"]).join(", ")}. Focus 60% of study time here this week.`;
  }
  if (lower.includes("csat")) {
    return "For CSAT: practice 20 questions daily, focus on comprehension and logical reasoning. Take one timed sectional weekly.";
  }
  return `You're at ${ctx.readinessScore ?? 0}% readiness with a ${ctx.streak ?? 0}-day streak. Focus on weak subjects and maintain daily CA + MCQs.`;
}

export async function regenerateMotivation(userId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) throw new Error("No study plan found");
  const meta = buildFallbackPlanMeta(plan, { weakSubjects: plan.weakSubjects });
  const line = await callOpenRouterAPI({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: getChatModel(),
    systemPrompt: "Generate one short motivational line (under 20 words) for a UPSC aspirant. Plain text only.",
    userPrompt: `Streak: ${plan.currentStreak}, Readiness: ${plan.readinessScore}%, Weak: ${(plan.weakSubjects || []).join(", ")}`,
    temperature: 0.8,
    maxTokens: 60,
  });
  const motivationalLine = line.success ? line.content.trim() : meta.motivationalLine;
  await StudyPlan.updateOne({ userId }, { $set: { motivationalLine, dailyQuote: QUOTES[Math.floor(Math.random() * QUOTES.length)] } });
  return { motivationalLine };
}
