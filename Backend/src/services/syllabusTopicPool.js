import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../Frontend/src/data");

const SUBJECT_FILES = {
  Polity: "upsc_polity_syllabus.json",
  History: "upsc_history_modern.json",
  Geography: "upsc_geography_physical.json",
  Economy: "upsc_economy.json",
  Environment: "upsc_environment.json",
  "Science & Tech": "upsc_science_tech.json",
  Agriculture: "upsc_agriculture.json",
  CSAT: null,
  "Current Affairs": null,
};

const poolCache = new Map();
const cursorBySubject = new Map();

function normalizeSubject(name) {
  const n = (name || "").trim();
  if (/science/i.test(n)) return "Science & Tech";
  return SUBJECT_FILES[n] !== undefined ? n : n;
}

function loadSubjectPool(subject) {
  const key = normalizeSubject(subject);
  if (poolCache.has(key)) return poolCache.get(key);

  const file = SUBJECT_FILES[key];
  if (!file) {
    poolCache.set(key, []);
    return [];
  }

  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    poolCache.set(key, []);
    return [];
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    poolCache.set(key, []);
    return [];
  }

  const modules = (raw.modules || []).slice().sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const flat = [];
  for (const mod of modules) {
    const topics = (mod.topics || []).slice();
    for (const t of topics) {
      flat.push({
        topicId: String(t.topic_id ?? ""),
        topicName: String(t.topic_name ?? "").trim(),
        moduleName: String(mod.module_name ?? "").trim(),
        moduleId: String(mod.module_id ?? ""),
        hours: Number(t.daily_target_hours ?? mod.estimated_hours ?? 2) || 2,
      });
    }
  }

  poolCache.set(key, flat);
  return flat;
}

function resetCursors(weakSubjects = []) {
  cursorBySubject.clear();
  const weak = new Set((weakSubjects || []).map((s) => normalizeSubject(s)));
  for (const subject of Object.keys(SUBJECT_FILES)) {
    if (!SUBJECT_FILES[subject]) continue;
    cursorBySubject.set(subject, weak.has(subject) ? 0 : 0);
  }
}

function getNextTopic(subject, weakSubjects = []) {
  const key = normalizeSubject(subject);
  const pool = loadSubjectPool(key);
  if (!pool.length) return null;

  if (!cursorBySubject.has(key)) {
    const weak = (weakSubjects || []).map(normalizeSubject);
    cursorBySubject.set(key, 0);
  }

  let idx = cursorBySubject.get(key) ?? 0;
  if (idx >= pool.length) idx = 0;
  const entry = pool[idx];
  cursorBySubject.set(key, idx + 1);
  return entry;
}

function findTopicForRevision(subject, studyDate, tasks) {
  const key = normalizeSubject(subject);
  const studyTasks = (tasks || [])
    .filter((t) => t.taskType === "subject_study" && normalizeSubject(t.subject) === key && t.date === studyDate)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const hit = studyTasks[0];
  if (hit?.syllabusModule) {
    return { topicName: hit.topic, moduleName: hit.syllabusModule };
  }
  if (hit?.topic && !/^Study /i.test(hit.topic)) {
    return { topicName: hit.topic, moduleName: hit.syllabusModule || key };
  }
  return null;
}

/**
 * Replace generic task labels with real syllabus module/topic names in timeline order.
 */
export function applySyllabusToTasks(tasks, weakSubjects = []) {
  if (!Array.isArray(tasks) || !tasks.length) return tasks;

  resetCursors(weakSubjects);
  const sorted = [...tasks].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const studyByDateSubject = new Map();

  for (const task of sorted) {
    const subject = normalizeSubject(task.subject);

    if (task.taskType === "subject_study") {
      const entry = getNextTopic(subject, weakSubjects);
      if (entry) {
        task.topic = entry.topicName;
        task.syllabusModule = entry.moduleName;
        task.syllabusTopicId = entry.topicId;
        const key = `${task.date}|${subject}`;
        studyByDateSubject.set(key, entry);
      }
      continue;
    }

    if (task.taskType === "mcq_practice" && subject !== "General" && subject !== "Current Affairs") {
      const entry = studyByDateSubject.get(`${task.date}|${subject}`) || getNextTopic(subject, weakSubjects);
      if (entry) {
        task.topic = `MCQs — ${entry.topicName}`;
        task.syllabusModule = entry.moduleName;
      }
      continue;
    }

    if (task.taskType === "revision" && subject && subject !== "Revision") {
      const offset1 = offsetDate(task.date, -1);
      const offset7 = offsetDate(task.date, -7);
      const offset30 = offsetDate(task.date, -30);
      const ref =
        findTopicForRevision(subject, offset1, sorted) ||
        findTopicForRevision(subject, offset7, sorted) ||
        findTopicForRevision(subject, offset30, sorted) ||
        getNextTopic(subject, weakSubjects);
      if (ref) {
        task.topic = `Revision — ${ref.topicName}`;
        task.syllabusModule = ref.moduleName;
      }
      continue;
    }

    if (task.taskType === "current_affairs") {
      task.topic = "Daily Current Affairs (The Hindu / IE)";
    }
  }

  return tasks;
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getSyllabusPreviewForSubject(subject, limit = 12) {
  return loadSubjectPool(subject).slice(0, limit);
}
