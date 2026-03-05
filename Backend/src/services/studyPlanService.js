import { StudyPlan } from "../models/StudyPlan.js";

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

// Vision IAS style: Day 1→Polity, 2→Economy, 3→Geography, 4→Environment, 5→History, 6→Mock Test, 7→Revision
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

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Add minutes to "HH:mm", return "HH:mm". */
function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function getTaskLabel(taskType, subject) {
  switch (taskType) {
    case "subject_study":
      return `Study ${subject}`;
    case "current_affairs":
      return "Daily Current Affairs – 20 minutes";
    case "mcq_practice":
      return "MCQ practice";
    case "revision":
      return subject ? `Revision – ${subject}` : "Revision";
    case "mock_test":
      return "Mock Test";
    default:
      return subject || "Study";
  }
}

/**
 * Build one task object (no start/end time; caller assigns).
 */
function makeTask(dateStr, subject, topic, taskType, duration, startTime = null, endTime = null) {
  return {
    date: dateStr,
    subject,
    topic: topic || getTaskLabel(taskType, subject),
    taskType,
    duration,
    startTime,
    endTime,
    completed: false,
    completedAt: null,
  };
}

/**
 * Generate tasks from today to examDate.
 * - 7-day rotation: Polity, Economy, Geography, Environment, History, Mock Test, Revision.
 * - Current Affairs: 20 min every day.
 * - 1-3-7 revision: for each subject_study on date D, add revision tasks on D+3 and D+7.
 * - Daily timetable: startTime/endTime from DEFAULT_START_TIME.
 */
export function generateTasks(examDate, dailyHours, preparationLevel = "intermediate") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(examDate);
  end.setHours(0, 0, 0, 0);
  if (end <= start) return [];

  const totalMinutes = Math.max(60, dailyHours * 60);
  const tasks = [];
  const revisionQueue = []; // { dateStr, subject } for 1-3-7

  for (let dayIndex = 0, d = new Date(start); d <= end; d = addDays(d, 1), dayIndex++) {
    const dateStr = toDateString(d);
    const slot = dayIndex % 7;
    const rot = ROTATION_DAYS[slot];

    let dayMinutes = totalMinutes - CURRENT_AFFAIRS_MINUTES; // reserve 20 min for CA
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

      const t2 = makeTask(dateStr, "Current Affairs", getTaskLabel("current_affairs", null), "current_affairs", CURRENT_AFFAIRS_MINUTES, timeCursor, addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES));
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(dateStr, subject, getTaskLabel("mcq_practice", null), "mcq_practice", mcqMins, timeCursor, addMinutesToTime(timeCursor, mcqMins));
      dayTasks.push(t3);
      timeCursor = addMinutesToTime(timeCursor, mcqMins);

      const t4 = makeTask(dateStr, subject, getTaskLabel("revision", subject), "revision", revMins, timeCursor, addMinutesToTime(timeCursor, revMins));
      dayTasks.push(t4);
    } else if (rot.type === "mock_test") {
      const mockMins = Math.min(120, Math.floor(dayMinutes * 0.7));
      const mcqMins = Math.max(20, dayMinutes - mockMins);

      const t1 = makeTask(dateStr, "CSAT", getTaskLabel("mock_test", null), "mock_test", mockMins, timeCursor, addMinutesToTime(timeCursor, mockMins));
      dayTasks.push(t1);
      timeCursor = addMinutesToTime(timeCursor, mockMins);

      const t2 = makeTask(dateStr, "Current Affairs", getTaskLabel("current_affairs", null), "current_affairs", CURRENT_AFFAIRS_MINUTES, timeCursor, addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES));
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(dateStr, "General", getTaskLabel("mcq_practice", null), "mcq_practice", mcqMins, timeCursor, addMinutesToTime(timeCursor, mcqMins));
      dayTasks.push(t3);
    } else {
      // revision_day
      const revMins = Math.min(90, Math.floor(dayMinutes * 0.5));
      const mcqMins = Math.max(30, dayMinutes - revMins);

      const t1 = makeTask(dateStr, "Revision", getTaskLabel("revision", null), "revision", revMins, timeCursor, addMinutesToTime(timeCursor, revMins));
      dayTasks.push(t1);
      timeCursor = addMinutesToTime(timeCursor, revMins);

      const t2 = makeTask(dateStr, "Current Affairs", getTaskLabel("current_affairs", null), "current_affairs", CURRENT_AFFAIRS_MINUTES, timeCursor, addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES));
      dayTasks.push(t2);
      timeCursor = addMinutesToTime(timeCursor, CURRENT_AFFAIRS_MINUTES);

      const t3 = makeTask(dateStr, "General", getTaskLabel("mcq_practice", null), "mcq_practice", mcqMins, timeCursor, addMinutesToTime(timeCursor, mcqMins));
      dayTasks.push(t3);
    }

    tasks.push(...dayTasks);
  }

  // 1-3-7 revision: for each subject_study on D, add revision on D+3 and D+7
  const endStr = toDateString(end);
  const revisionByDate = {}; // dateStr -> [{ subject }]
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

  // Sort by date then startTime so calendar order is correct
  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  return tasks;
}

/**
 * Get study plan for user (no create).
 */
export async function getPlan(userId) {
  return StudyPlan.findOne({ userId }).lean();
}

/**
 * Create or update study plan for user. Generates tasks from today to examDate.
 */
export async function createOrUpdatePlan(userId, payload) {
  const examDate = new Date(payload.examDate);
  const dailyHours = payload.dailyHours ?? 6;
  const preparationLevel = payload.preparationLevel ?? "intermediate";
  if (!payload.examDate || isNaN(examDate.getTime())) {
    throw new Error("Valid exam date is required");
  }

  const tasks = generateTasks(examDate, dailyHours, preparationLevel);
  const existing = await StudyPlan.findOne({ userId }).lean();

  const data = {
    userId,
    examDate,
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

/**
 * Get or create study plan for user. If payload provided, create/update; otherwise return existing or null.
 */
export async function getOrCreatePlan(userId, payload = null) {
  if (payload && (payload.examDate || payload.dailyHours != null || payload.preparationLevel)) {
    return createOrUpdatePlan(userId, {
      examDate: payload.examDate,
      dailyHours: payload.dailyHours,
      preparationLevel: payload.preparationLevel,
    });
  }
  return getPlan(userId);
}

/**
 * Toggle task completion and update streak.
 */
export async function toggleTaskComplete(userId, taskId) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");

  const task = plan.tasks.id(taskId);
  if (!task) throw new Error("Task not found");

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date() : null;
  await plan.save();

  await recalculateStreak(plan);
  const updated = await StudyPlan.findOne({ userId }).lean();
  const updatedTask = (updated.tasks || []).find(
    (t) => t._id && t._id.toString() === taskId
  );
  return { plan: updated, task: updatedTask || task };
}

/**
 * Recalculate currentStreak and longestStreak from tasks.
 * Streak = consecutive days (going backwards from today) where at least one task was completed.
 */
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

/**
 * Days remaining until exam (whole days).
 */
export function getDaysRemaining(plan) {
  if (!plan || !plan.examDate) return null;
  const exam = new Date(plan.examDate);
  exam.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.ceil((exam - today) / (24 * 60 * 60 * 1000)));
  return diff;
}

/**
 * Daily progress: for a given date (default today), completed / total tasks.
 * Weekly progress: for the week containing the given date.
 */
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
  const weekTasks = (plan.tasks || []).filter(
    (t) => t.date >= weekStartStr && t.date <= weekEndStr
  );
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
