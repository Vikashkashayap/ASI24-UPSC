import { StudyPlan } from "../models/StudyPlan.js";
import { TopicProgress } from "../models/TopicProgress.js";
import { RevisionSchedule } from "../models/RevisionSchedule.js";
import { PlannerAnalytics } from "../models/PlannerAnalytics.js";
import { applySyllabusToTasks } from "./syllabusTopicPool.js";
import { generateTasks, getProgress, recalculateStreak } from "./studyPlanService.js";
import { calculateReadinessFromPlan } from "./readinessService.js";

const REVISION_OFFSETS = [1, 7, 30];

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, offset) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return toDateString(d);
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Boost weak subjects in 7-day rotation slots */
export function prioritizeWeakSubjectsInTasks(tasks, weakSubjects = []) {
  if (!weakSubjects?.length) return tasks;
  const weak = weakSubjects.map((s) => s.toLowerCase());
  const byDate = {};
  for (const t of tasks) {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  }
  for (const date of Object.keys(byDate)) {
    const day = byDate[date];
    const study = day.find((t) => t.taskType === "subject_study");
    if (study && !weak.includes((study.subject || "").toLowerCase())) {
      const weakSub = weakSubjects.find((w) => w) || study.subject;
      study.subject = weakSub;
      study.topic = study.topic?.replace(/^Study /, `Study ${weakSub}`) || `Study ${weakSub}`;
      const mcq = day.find((t) => t.taskType === "mcq_practice" && t.subject === study.subject);
      if (mcq) mcq.subject = weakSub;
    }
  }
  return tasks;
}

export async function syncRevisionSchedules(userId, plan, studyTask) {
  if (!studyTask?.topic || studyTask.taskType !== "subject_study") return [];
  const entries = [];
  for (const offset of REVISION_OFFSETS) {
    const revisionDate = addDays(studyTask.date, offset);
    const examEnd = plan.examDate ? toDateString(new Date(plan.examDate)) : "2099-12-31";
    if (revisionDate > examEnd) continue;

    const cycle = offset === 1 ? "1-day" : offset === 7 ? "7-day" : "30-day";
    const existing = await RevisionSchedule.findOne({
      userId,
      subject: studyTask.subject,
      topic: studyTask.topic,
      cycle,
      studyDate: studyTask.date,
    });
    if (existing) {
      entries.push(existing);
      continue;
    }

    const revTask = (plan.tasks || []).find(
      (t) =>
        t.date === revisionDate &&
        t.taskType === "revision" &&
        t.subject === studyTask.subject &&
        (t.topic || "").includes(studyTask.topic)
    );

    const doc = await RevisionSchedule.findOneAndUpdate(
      {
        userId,
        subject: studyTask.subject,
        topic: studyTask.topic,
        cycle,
        studyDate: studyTask.date,
      },
      {
        $set: {
          studyPlanId: plan._id,
          revisionDate,
          taskId: revTask?._id?.toString() || null,
          syllabusTopicId: studyTask.syllabusTopicId || null,
        },
      },
      { upsert: true, new: true }
    );
    entries.push(doc);
  }
  return entries;
}

export async function upsertTopicProgress(userId, planId, task, status) {
  return TopicProgress.findOneAndUpdate(
    { userId, subject: task.subject, topic: task.topic },
    {
      $set: {
        studyPlanId: planId,
        syllabusTopicId: task.syllabusTopicId || null,
        syllabusModule: task.syllabusModule || null,
        status,
        lastTaskId: task._id?.toString(),
        ...(status === "reading" ? { firstStudiedAt: new Date() } : {}),
        ...(status === "completed" ? { completedAt: new Date() } : {}),
      },
    },
    { upsert: true, new: true }
  );
}

export async function cachePlannerAnalytics(userId, analytics) {
  await PlannerAnalytics.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...analytics,
        lastComputedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export function sanitizeTopicForPractice(rawTopic, subject = "") {
  let t = String(rawTopic || "").trim();
  t = t.replace(/^MCQs\s*[—–-]\s*/i, "");
  t = t.replace(/^Revision\s*[—–-]\s*/i, "");
  t = t.replace(/^Study\s+/i, "");
  if (subject && new RegExp(`^${subject}\\s*`, "i").test(t)) {
    t = t.replace(new RegExp(`^${subject}\\s*`, "i"), "").trim();
  }
  return t || subject || "";
}

export function buildPracticeRoute(task, mode = "mcq") {
  const params = new URLSearchParams();
  params.set("from", "planner");
  params.set("subject", task.subject || "");
  params.set("topic", sanitizeTopicForPractice(task.topic, task.subject));
  if (task.syllabusTopicId) params.set("syllabusTopicId", task.syllabusTopicId);
  if (mode === "pyq") params.set("pyq", "1");
  return `/prelims-test?${params.toString()}`;
}

export async function completeTopic(userId, taskId) {
  const plan = await StudyPlan.findOne({ userId });
  if (!plan) throw new Error("Study plan not found");

  const task = plan.tasks.id(taskId);
  if (!task) throw new Error("Task not found");

  if (!task.completed) {
    task.completed = true;
    task.completedAt = new Date();
    task.practiceUnlocked = true;
  }

  if (task.taskType === "subject_study") {
    await upsertTopicProgress(userId, plan._id, task, "completed");
    await syncRevisionSchedules(userId, plan, task);

    const mcqExists = plan.tasks.some(
      (t) =>
        t.date === task.date &&
        t.taskType === "mcq_practice" &&
        t.subject === task.subject &&
        (t.topic || "").includes(task.topic)
    );
    if (!mcqExists) {
      const dur = Math.min(45, Math.max(25, Math.round((task.duration || 60) * 0.4)));
      const start = task.endTime || "10:00";
      plan.tasks.push({
        date: task.date,
        subject: task.subject,
        topic: `MCQs — ${task.topic}`,
        syllabusModule: task.syllabusModule,
        syllabusTopicId: task.syllabusTopicId,
        taskType: "mcq_practice",
        duration: dur,
        difficulty: task.difficulty || "medium",
        priority: "high",
        sortOrder: (task.sortOrder ?? 0) + 0.5,
        startTime: start,
        endTime: addMinutesToTime(start, dur),
        completed: false,
        practiceUnlocked: true,
        parentTaskId: task._id?.toString(),
      });
    } else {
      const mcq = plan.tasks.find(
        (t) =>
          t.date === task.date &&
          t.taskType === "mcq_practice" &&
          t.subject === task.subject
      );
      if (mcq) {
        mcq.practiceUnlocked = true;
        mcq.topic = `MCQs — ${task.topic}`;
      }
    }
  }

  await plan.save();
  await recalculateStreak(plan);

  const updated = await StudyPlan.findOne({ userId }).lean();
  const readiness = calculateReadinessFromPlan(updated);
  await StudyPlan.updateOne(
    { userId },
    { $set: { readinessScore: readiness.readinessScore, readinessBreakdown: readiness.readinessBreakdown } }
  );

  const finalPlan = await StudyPlan.findOne({ userId }).lean();
  const completedTask = (finalPlan.tasks || []).find((t) => t._id?.toString() === taskId);
  const mcqTask = (finalPlan.tasks || []).find(
    (t) =>
      t.taskType === "mcq_practice" &&
      t.date === completedTask?.date &&
      t.subject === completedTask?.subject &&
      t.practiceUnlocked
  );

  return {
    plan: finalPlan,
    task: completedTask,
    mcqTask,
    practiceRoute: mcqTask ? buildPracticeRoute(mcqTask) : buildPracticeRoute(completedTask || task),
    progress: getProgress(finalPlan),
    readiness,
  };
}

export async function startPractice(userId, taskId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) throw new Error("Study plan not found");

  const task = (plan.tasks || []).find((t) => t._id?.toString() === taskId);
  if (!task) throw new Error("Task not found");

  const planDoc = await StudyPlan.findOne({ userId });
  const t = planDoc.tasks.id(taskId);
  if (t) {
    t.readingStartedAt = t.readingStartedAt || new Date();
    if (t.taskType === "subject_study" || t.taskType === "mcq_practice") {
      t.practiceUnlocked = true;
    }
    await planDoc.save();
  }

  if (task.taskType === "subject_study") {
    await upsertTopicProgress(userId, plan._id, task, "reading");
  }

  const pyqRoute = buildPracticeRoute(task, "pyq");
  const mcqRoute = buildPracticeRoute(task, "mcq");

  return {
    task,
    routes: { mcq: mcqRoute, pyq: pyqRoute },
    questionCount: 20,
  };
}

export async function getRevisionTasksForUser(userId, date) {
  const dateStr = date || toDateString(new Date());
  const plan = await StudyPlan.findOne({ userId }).lean();
  const fromPlan = (plan?.tasks || []).filter(
    (t) => t.date === dateStr && t.taskType === "revision"
  );
  const fromDb = await RevisionSchedule.find({ userId, revisionDate: dateStr }).lean();
  return {
    date: dateStr,
    tasks: fromPlan,
    schedule: fromDb,
  };
}

export async function getReadinessForUser(userId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan) return { score: 0, breakdown: {}, examType: "UPSC" };
  const readiness = calculateReadinessFromPlan(plan);
  return {
    score: readiness.readinessScore,
    breakdown: readiness.readinessBreakdown,
    examType: plan.examType,
    targetYear: plan.targetYear,
  };
}

export async function generateSmartPlanTasks(userId, profile) {
  const examDate = new Date(profile.examDate);
  let tasks = generateTasks(
    examDate,
    profile.dailyHours ?? 6,
    profile.preparationLevel ?? "intermediate"
  );
  tasks = prioritizeWeakSubjectsInTasks(tasks, profile.weakSubjects);
  tasks = applySyllabusToTasks(tasks, profile.weakSubjects);
  return tasks;
}
