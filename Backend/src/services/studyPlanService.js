import { StudyPlan } from "../models/StudyPlan.js";
import { UpscSyllabus } from "../models/UpscSyllabus.js";
import {
  generateSyllabusBasedTasks,
  flattenSyllabusSubjects,
} from "./upscSyllabusPlannerEngine.js";
import { callOpenRouterAPI } from "./openRouterService.js";

const SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Current Affairs",
  "CSAT",
];

const ROTATION_DAYS = [
  { type: "subject", subject: "Polity" },
  { type: "subject", subject: "Economy" },
  { type: "subject", subject: "Geography" },
  { type: "subject", subject: "Environment" },
  { type: "subject", subject: "History" },
  { type: "mock_test" },
  { type: "revision_day" },
];

const CURRENT_AFFAIRS_MINUTES = 20;
const DEFAULT_START_TIME = "07:00";

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(dateStr, delta) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function normalizeUploadedSyllabusJson(syllabusJson) {
  if (!syllabusJson) return [];
  if (Array.isArray(syllabusJson?.subjects)) {
    return flattenSyllabusSubjects(syllabusJson.subjects);
  }
  if (Array.isArray(syllabusJson)) {
    return syllabusJson
      .map((item) => ({
        subject: item.subject || item.name || "General",
        topic: item.topic,
        subtopics: Array.isArray(item.subtopics) ? item.subtopics : [],
        weight: item.weight,
        estimatedHours: item.estimatedHours,
      }))
      .filter((t) => t.topic);
  }
  return [];
}

function getTaskLabel(taskType, subject) {
  switch (taskType) {
    case "subject_study":
    case "study":
      return `Study ${subject}`;
    case "current_affairs":
      return "Daily Current Affairs – 20 minutes";
    case "mcq_practice":
    case "test":
      return "MCQ practice";
    case "revision":
      return subject ? `Revision – ${subject}` : "Revision";
    case "mock_test":
      return "Mock Test";
    default:
      return subject || "Study";
  }
}

function makeTask(dateStr, subject, topic, taskType, duration, startTime = null, endTime = null) {
  return {
    date: dateStr,
    subject,
    topic: topic || getTaskLabel(taskType, subject),
    subtopics: [],
    taskType,
    duration,
    startTime,
    endTime,
    completed: false,
    completedAt: null,
    questions: null,
    plannerTestType: null,
    testAccuracy: null,
    testSkipped: false,
    revisionTopicSummaries: [],
    linkedTopicKey: null,
    carriedOverFromDate: null,
    carriedCloneOf: null,
    rolledForwardToDate: null,
  };
}

export function generateTasks(examDate, dailyHours, preparationLevel = "intermediate") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(examDate);
  end.setHours(0, 0, 0, 0);
  if (end <= start) return [];

  const totalMinutes = Math.max(60, dailyHours * 60);
  const tasks = [];
  const revisionQueue = [];

  for (let dayIndex = 0, d = new Date(start); d <= end; d = addDays(d, 1), dayIndex++) {
    const dateStr = toDateString(d);
    const slot = dayIndex % 7;
    const rot = ROTATION_DAYS[slot];

    let dayMinutes = totalMinutes - CURRENT_AFFAIRS_MINUTES;
    const dayTasks = [];
    let timeCursor = DEFAULT_START_TIME;

    if (rot.type === "subject") {
      const subject = rot.subject;
      const studyMins = Math.min(90, Math.floor(dayMinutes * 0.5));
      const mcqMins = Math.min(60, Math.floor(dayMinutes * 0.3));
      const revMins = Math.max(20, dayMinutes - studyMins - mcqMins);

      const t1 = makeTask(
        dateStr,
        subject,
        getTaskLabel("subject_study", subject),
        "subject_study",
        studyMins,
        timeCursor,
        addMinutesToTime(timeCursor, studyMins)
      );
      dayTasks.push(t1);
      timeCursor = addMinutesToTime(timeCursor, studyMins);
      revisionQueue.push({ studyDate: dateStr, subject });

      const t2 = makeTask(
        dateStr,
        "Current Affairs",
        getTaskLabel("current_affairs", null),
        "current_affairs",
        CURRENT_AFFAIRS_MINUTES,
        timeCursor,
        addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES)
      );
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(
        dateStr,
        subject,
        getTaskLabel("mcq_practice", null),
        "mcq_practice",
        mcqMins,
        timeCursor,
        addMinutesToTime(timeCursor, mcqMins)
      );
      dayTasks.push(t3);
      timeCursor = addMinutesToTime(timeCursor, mcqMins);

      const t4 = makeTask(
        dateStr,
        subject,
        getTaskLabel("revision", subject),
        "revision",
        revMins,
        timeCursor,
        addMinutesToTime(timeCursor, revMins)
      );
      dayTasks.push(t4);
    } else if (rot.type === "mock_test") {
      const mockMins = Math.min(120, Math.floor(dayMinutes * 0.7));
      const mcqMins = Math.max(20, dayMinutes - mockMins);

      const t1 = makeTask(
        dateStr,
        "CSAT",
        getTaskLabel("mock_test", null),
        "mock_test",
        mockMins,
        timeCursor,
        addMinutesToTime(timeCursor, mockMins)
      );
      dayTasks.push(t1);
      timeCursor = addMinutesToTime(timeCursor, mockMins);

      const t2 = makeTask(
        dateStr,
        "Current Affairs",
        getTaskLabel("current_affairs", null),
        "current_affairs",
        CURRENT_AFFAIRS_MINUTES,
        timeCursor,
        addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES)
      );
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(
        dateStr,
        "General",
        getTaskLabel("mcq_practice", null),
        "mcq_practice",
        mcqMins,
        timeCursor,
        addMinutesToTime(timeCursor, mcqMins)
      );
      dayTasks.push(t3);
    } else {
      const revMins = Math.min(90, Math.floor(dayMinutes * 0.5));
      const mcqMins = Math.max(30, dayMinutes - revMins);

      const t1 = makeTask(
        dateStr,
        "Revision",
        getTaskLabel("revision", null),
        "revision",
        revMins,
        timeCursor,
        addMinutesToTime(timeCursor, revMins)
      );
      dayTasks.push(t1);
      timeCursor = addMinutesToTime(timeCursor, revMins);

      const t2 = makeTask(
        dateStr,
        "Current Affairs",
        getTaskLabel("current_affairs", null),
        "current_affairs",
        CURRENT_AFFAIRS_MINUTES,
        timeCursor,
        addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES)
      );
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(
        dateStr,
        "General",
        getTaskLabel("mcq_practice", null),
        "mcq_practice",
        mcqMins,
        timeCursor,
        addMinutesToTime(timeCursor, mcqMins)
      );
      dayTasks.push(t3);
    }

    tasks.push(...dayTasks);
  }

  const endStr = toDateString(end);
  const revisionByDate = {};
  for (const { studyDate, subject } of revisionQueue) {
    const studyD = new Date(studyDate);
    for (const offset of [3, 7]) {
      const revD = addDays(studyD, offset);
      const revStr = toDateString(revD);
      if (revStr > endStr) continue;
      if (!revisionByDate[revStr]) revisionByDate[revStr] = [];
      revisionByDate[revStr].push({ subject });
    }
  }

  for (const [revStr, items] of Object.entries(revisionByDate)) {
    const existingOnDay = tasks.filter((t) => t.date === revStr);
    let timeCursor = DEFAULT_START_TIME;
    for (const t of existingOnDay) {
      timeCursor = t.endTime ? t.endTime : addMinutesToTime(timeCursor, t.duration);
    }
    const revMins = 30;
    for (const { subject } of items) {
      tasks.push(
        makeTask(
          revStr,
          subject,
          getTaskLabel("revision", subject),
          "revision",
          revMins,
          timeCursor,
          addMinutesToTime(timeCursor, revMins)
        )
      );
      timeCursor = addMinutesToTime(timeCursor, revMins);
    }
  }

  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  return tasks;
}

function planDateBounds(plan) {
  const dates = (plan.tasks || []).map((t) => t.date).filter(Boolean).sort();
  if (!dates.length) return { min: null, max: null };
  return { min: dates[0], max: dates[dates.length - 1] };
}

/**
 * Clone incomplete yesterday tasks onto today (syllabus plans).
 */
export async function applyRollForwardToPlan(userId, todayStr) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan || plan.plannerVersion !== "syllabus") return plan;

  const yesterday = addDaysIso(todayStr, -1);
  let changed = false;

  const candidates = plan.tasks.filter((t) => t.date === yesterday && !t.completed);
  for (const t of candidates) {
    const hasClone = plan.tasks.some(
      (x) =>
        x.date === todayStr &&
        x.carriedCloneOf &&
        x.carriedCloneOf.toString() === t._id.toString()
    );
    if (hasClone) continue;

    plan.tasks.push({
      date: todayStr,
      subject: t.subject,
      topic: t.topic,
      subtopics: [...(t.subtopics || [])],
      taskType: t.taskType,
      duration: t.duration,
      startTime: t.startTime,
      endTime: t.endTime,
      completed: false,
      completedAt: null,
      questions: t.questions,
      plannerTestType: t.plannerTestType,
      testAccuracy: null,
      testSkipped: false,
      revisionTopicSummaries: [...(t.revisionTopicSummaries || [])],
      linkedTopicKey: t.linkedTopicKey,
      carriedOverFromDate: yesterday,
      carriedCloneOf: t._id,
      rolledForwardToDate: null,
    });
    t.rolledForwardToDate = todayStr;
    changed = true;
  }

  if (changed) {
    plan.lastPlannerRollDate = todayStr;
    await plan.save();
  }
  return plan;
}

export async function getPlan(userId) {
  return StudyPlan.findOne({ userId }).lean();
}

export async function getPlanWithRollForward(userId, clientToday) {
  const todayStr =
    clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
      ? clientToday
      : toDateString(new Date());
  await applyRollForwardToPlan(userId, todayStr);
  return StudyPlan.findOne({ userId }).lean();
}

export async function createOrUpdatePlan(userId, payload) {
  const dailyHours = payload.dailyHours ?? 6;
  const preparationLevel = payload.preparationLevel ?? "intermediate";
  const existing = await StudyPlan.findOne({ userId }).lean();

  if (payload.startDate && payload.endDate) {
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new Error("Invalid plan date range");
    }

    let syllabus = null;
    if (payload.syllabusId) {
      syllabus = await UpscSyllabus.findById(payload.syllabusId).lean();
    }
    if (!syllabus && existing?.syllabusId) {
      syllabus = await UpscSyllabus.findById(existing.syllabusId).lean();
    }
    if (!syllabus) {
      syllabus = await UpscSyllabus.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    }

    const fromPayload = normalizeUploadedSyllabusJson(payload.syllabusJson);
    const flatTopics = fromPayload.length
      ? fromPayload
      : syllabus
        ? flattenSyllabusSubjects(syllabus.subjects)
        : [];
    const startStr = payload.startDate.slice(0, 10);
    const endStr = payload.endDate.slice(0, 10);
    const { tasks, intensiveMode } = generateSyllabusBasedTasks({
      startDate: startStr,
      endDate: endStr,
      dailyHours,
      flatTopics,
    });

    const data = {
      userId,
      examDate: end,
      planStartDate: start,
      planEndDate: end,
      plannerVersion: "syllabus",
      intensiveMode,
      syllabusId: syllabus?._id ?? null,
      lastPlannerRollDate: null,
      dailyHours,
      preparationLevel,
      subjects: syllabus?.subjects?.length
        ? syllabus.subjects.map((s) => s.name)
        : SUBJECTS,
      tasks,
      currentStreak: existing?.currentStreak ?? 0,
      lastCompletedDate: existing?.lastCompletedDate ?? null,
      longestStreak: existing?.longestStreak ?? 0,
    };

    const plan = await StudyPlan.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return plan;
  }

  const examDate = new Date(payload.examDate);
  if (!payload.examDate || isNaN(examDate.getTime())) {
    throw new Error("Valid exam date is required");
  }

  const tasks = generateTasks(examDate, dailyHours, preparationLevel);
  const legacyRangeStart = new Date();
  legacyRangeStart.setHours(0, 0, 0, 0);

  const data = {
    userId,
    examDate,
    planStartDate: legacyRangeStart,
    planEndDate: examDate,
    plannerVersion: "legacy",
    intensiveMode: false,
    syllabusId: null,
    lastPlannerRollDate: null,
    dailyHours,
    preparationLevel,
    subjects: SUBJECTS,
    tasks,
    currentStreak: existing?.currentStreak ?? 0,
    lastCompletedDate: existing?.lastCompletedDate ?? null,
    longestStreak: existing?.longestStreak ?? 0,
  };

  const plan = await StudyPlan.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return plan;
}

export async function getOrCreatePlan(userId, payload = null) {
  if (!payload) return getPlan(userId);
  if (payload.startDate && payload.endDate) {
    return createOrUpdatePlan(userId, payload);
  }
  if (payload.examDate || payload.dailyHours != null || payload.preparationLevel) {
    return createOrUpdatePlan(userId, {
      examDate: payload.examDate,
      dailyHours: payload.dailyHours,
      preparationLevel: payload.preparationLevel,
    });
  }
  return getPlan(userId);
}

function syncTaskClones(plan, task, completed, completedAt) {
  if (task.carriedCloneOf) {
    const orig = plan.tasks.id(task.carriedCloneOf);
    if (orig) {
      orig.completed = completed;
      orig.completedAt = completedAt;
    }
  } else {
    for (const x of plan.tasks) {
      if (x.carriedCloneOf && x.carriedCloneOf.toString() === task._id.toString()) {
        x.completed = completed;
        x.completedAt = completedAt;
      }
    }
  }
}

export async function toggleTaskComplete(userId, taskId) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");

  const task = plan.tasks.id(taskId);
  if (!task) throw new Error("Task not found");

  const nextDone = !task.completed;
  task.completed = nextDone;
  task.completedAt = nextDone ? new Date() : null;
  syncTaskClones(plan, task, nextDone, task.completedAt);

  await plan.save();
  await recalculateStreak(plan);
  const updated = await StudyPlan.findOne({ userId }).lean();
  const updatedTask = (updated.tasks || []).find((t) => t._id && t._id.toString() === taskId);
  return { plan: updated, task: updatedTask || task };
}

export async function recordPlannerTestResult(userId, taskId, accuracy) {
  const acc = Number(accuracy);
  if (Number.isNaN(acc) || acc < 0 || acc > 100) {
    throw new Error("accuracy must be 0–100");
  }
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");
  const task = plan.tasks.id(taskId);
  if (!task) throw new Error("Task not found");
  if (task.taskType !== "test" && task.taskType !== "mcq_practice") {
    throw new Error("Task is not a test block");
  }

  task.testAccuracy = acc;
  task.completed = true;
  task.completedAt = new Date();
  syncTaskClones(plan, task, true, task.completedAt);

  const { max } = planDateBounds(plan);
  if (acc < 50 && task.linkedTopicKey && max) {
    const parts = task.linkedTopicKey.split("|");
    const subject = parts[0] || task.subject;
    const topic = parts[1] || task.topic;
    let insertDate = addDaysIso(task.date, 3);
    if (insertDate > max) insertDate = max;

    plan.tasks.push({
      date: insertDate,
      subject,
      topic: `Repeat focus — ${topic}`,
      subtopics: [],
      taskType: "study",
      duration: 60,
      startTime: null,
      endTime: null,
      completed: false,
      completedAt: null,
      questions: null,
      plannerTestType: null,
      testAccuracy: null,
      testSkipped: false,
      revisionTopicSummaries: [],
      linkedTopicKey: task.linkedTopicKey,
      carriedOverFromDate: null,
      carriedCloneOf: null,
      rolledForwardToDate: null,
    });
  }

  await plan.save();
  await recalculateStreak(plan);
  const updated = await StudyPlan.findOne({ userId }).lean();
  return { plan: updated, progress: getProgress(updated) };
}

export async function skipPlannerTestTask(userId, taskId) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");
  const task = plan.tasks.id(taskId);
  if (!task) throw new Error("Task not found");
  if (task.taskType !== "test") throw new Error("Only planner MCQ test blocks can be skipped");

  task.testSkipped = true;
  const { max } = planDateBounds(plan);
  if (!max) {
    await plan.save();
    const updated = await StudyPlan.findOne({ userId }).lean();
    return { plan: updated, progress: getProgress(updated) };
  }

  let nextDate = addDaysIso(task.date, 1);
  if (nextDate > max) nextDate = max;

  plan.tasks.push({
    date: nextDate,
    subject: task.subject,
    topic: task.topic.replace(/\s*—\s*MCQ block$/, "") + " — MCQ block (rescheduled)",
    subtopics: [],
    taskType: "test",
    duration: task.duration || 45,
    startTime: null,
    endTime: null,
    completed: false,
    completedAt: null,
    questions: task.questions || 20,
    plannerTestType: "MCQ",
    testAccuracy: null,
    testSkipped: false,
    revisionTopicSummaries: [],
    linkedTopicKey: task.linkedTopicKey,
    carriedOverFromDate: null,
    carriedCloneOf: null,
    rolledForwardToDate: null,
  });

  await plan.save();
  const updated = await StudyPlan.findOne({ userId }).lean();
  return { plan: updated, progress: getProgress(updated) };
}

function compactPlanSummary(plan) {
  if (!plan) return "";
  const ver = plan.plannerVersion || "legacy";
  const startStr = plan.planStartDate
    ? new Date(plan.planStartDate).toISOString().slice(0, 10)
    : "n/a";
  const endStr = plan.examDate ? new Date(plan.examDate).toISOString().slice(0, 10) : "n/a";
  const lines = [
    `Plan: ${ver}, intensive=${plan.intensiveMode ? "yes" : "no"}, dailyHours=${plan.dailyHours}`,
    `Date range: ${startStr} → ${endStr}`,
  ];
  const sample = (plan.tasks || []).slice(0, 40).map((t) => `${t.date} ${t.taskType} ${t.subject}: ${t.topic}`);
  lines.push("Sample tasks:", ...sample);
  return lines.join("\n");
}

export async function explainStudyPlan(userId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) throw new Error("Study plan not found");

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct";

  if (!apiKey) {
    return {
      explanation:
        "Your plan spreads syllabus topics across the days you chose, with **revision** tied to the previous day and a **daily MCQ block** to check retention. **Intensive mode** packs more topics per day when the calendar is tight. Carried-over tasks from yesterday appear on today so nothing is lost; skipping a test reschedules it; scoring below 50% on a test adds a repeat study slot.",
      fallback: true,
    };
  }

  const summary = compactPlanSummary(plan);
  const res = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt:
      "You are a concise UPSC study coach. Explain in 120–200 words why this study plan structure makes sense (topic spread, revision, daily tests, intensive pacing if applicable). No markdown headings; short paragraphs or bullets. Plain language.",
    userPrompt: `Explain this student's generated plan to them:\n${summary}`,
    temperature: 0.4,
    maxTokens: 500,
  });

  if (!res.success) {
    return {
      explanation:
        "We could not reach the AI service right now. Your plan balances new topics, same-day revision of prior work, and MCQ practice. Open the Study Planner for the full timetable.",
      fallback: true,
      error: res.error,
    };
  }

  return { explanation: res.content || "", fallback: false };
}

export function buildPlannerDashboardSummary(plan, todayStr) {
  if (!plan || !plan.tasks?.length) {
    return {
      todayStr,
      smartMessage: "Create a study plan to see today’s targets.",
      todaysTarget: [],
      pendingFromYesterday: [],
      tomorrowPreview: [],
      pendingYesterdayCount: 0,
    };
  }

  const yesterday = addDaysIso(todayStr, -1);
  const tomorrow = addDaysIso(todayStr, 1);

  const todayTasks = plan.tasks.filter((t) => t.date === todayStr);
  const pendingFromYesterday = plan.tasks.filter((t) => t.date === yesterday && !t.completed);
  const tomorrowTasks = plan.tasks.filter((t) => t.date === tomorrow);

  const todaysTarget = todayTasks.filter(
    (t) => t.taskType === "study" || t.taskType === "test" || t.taskType === "subject_study" || t.taskType === "mcq_practice"
  );

  const tomorrowPreview = tomorrowTasks.filter(
    (t) => t.taskType === "study" || t.taskType === "test" || t.taskType === "subject_study" || t.taskType === "mcq_practice"
  );

  const n = pendingFromYesterday.length;
  const smartMessage =
    n > 0
      ? `You have ${n} pending task(s) from yesterday — they’re also rolled onto today if you need a fresh checkbox.`
      : "You’re caught up from yesterday.";

  return {
    todayStr,
    smartMessage,
    todaysTarget,
    pendingFromYesterday,
    tomorrowPreview,
    pendingYesterdayCount: n,
  };
}

export async function recalculateStreak(plan) {
  const completedByDate = new Set();
  for (const t of plan.tasks) {
    if (t.completed && t.completedAt) {
      completedByDate.add(t.date);
    }
  }

  const today = toDateString(new Date());
  let current = 0;
  let d = new Date(today);
  while (true) {
    const ds = toDateString(d);
    if (!completedByDate.has(ds)) break;
    current++;
    d.setDate(d.getDate() - 1);
  }

  const allDates = [...completedByDate].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const ds of allDates) {
    if (prev === null || toDateString(addDays(new Date(prev), 1)) === ds) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = ds;
  }
  if (run > longest) longest = run;

  const lastCompleted = allDates.length > 0 ? allDates[allDates.length - 1] : null;
  plan.currentStreak = current;
  plan.lastCompletedDate = lastCompleted;
  plan.longestStreak = Math.max(plan.longestStreak || 0, longest, current);
  await plan.save();
}

export function getDaysRemaining(plan) {
  if (!plan || !plan.examDate) return null;
  const exam = new Date(plan.examDate);
  exam.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.ceil((exam - today) / (24 * 60 * 60 * 1000)));
  return diff;
}

export function getProgress(plan, forDate = null) {
  const d = forDate ? new Date(forDate) : new Date();
  const dateStr = toDateString(d);
  const dayTasks = (plan.tasks || []).filter((t) => t.date === dateStr);
  const dayTotal = dayTasks.length;
  const dayCompleted = dayTasks.filter((t) => t.completed).length;
  const dailyPercent = dayTotal ? Math.round((dayCompleted / dayTotal) * 100) : 0;

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = toDateString(weekStart);
  const weekEndStr = toDateString(weekEnd);
  const weekTasks = (plan.tasks || []).filter((t) => t.date >= weekStartStr && t.date <= weekEndStr);
  const weekTotal = weekTasks.length;
  const weekCompleted = weekTasks.filter((t) => t.completed).length;
  const weeklyPercent = weekTotal ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  return {
    date: dateStr,
    daily: { total: dayTotal, completed: dayCompleted, percent: dailyPercent },
    weekly: { total: weekTotal, completed: weekCompleted, percent: weeklyPercent },
    streak: plan.currentStreak ?? 0,
    longestStreak: plan.longestStreak ?? 0,
    daysRemaining: getDaysRemaining(plan),
  };
}
