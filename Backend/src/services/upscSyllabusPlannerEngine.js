/** @typedef {{ subject: string; topic: string; subtopics: string[]; weight?: string; estimatedHours?: number }} FlatTopic */

const DEFAULT_START_TIME = "07:00";
const EVENING_START_TIME = "18:00";

export function enumerateDateRange(startStr, endStr) {
  const days = [];
  const start = String(startStr).slice(0, 10);
  const end = String(endStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return days;
  }
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    const [y, m, d] = cur.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    cur = dt.toISOString().slice(0, 10);
  }
  return days;
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function complexity(t) {
  return Math.max(0, (t.subtopics || []).length);
}

function isHeavyTopic(t) {
  const weight = String(t.weight || "").toLowerCase();
  if (weight === "heavy") return true;
  if (typeof t.estimatedHours === "number" && t.estimatedHours >= 4) return true;
  return complexity(t) >= 5;
}

function normalizeFlatTopic(topic) {
  const cleanSubtopics = Array.isArray(topic?.subtopics)
    ? topic.subtopics.filter(Boolean).map((s) => String(s).trim()).filter(Boolean)
    : [];
  return {
    subject: String(topic?.subject || "General").trim() || "General",
    topic: String(topic?.topic || "").trim(),
    subtopics: cleanSubtopics,
    weight: topic?.weight ? String(topic.weight) : undefined,
    estimatedHours:
      topic?.estimatedHours != null && Number.isFinite(Number(topic.estimatedHours))
        ? Number(topic.estimatedHours)
        : undefined,
  };
}

function splitSubtopicsIntoSessions(subtopics) {
  const items = Array.isArray(subtopics) ? subtopics : [];
  if (items.length <= 1) {
    return { morning: items, evening: items };
  }
  const mid = Math.ceil(items.length / 2);
  return {
    morning: items.slice(0, mid),
    evening: items.slice(mid),
  };
}

function groupBySubjectContinuously(flatTopics) {
  const map = new Map();
  const subjectOrder = [];
  for (const t of flatTopics) {
    if (!map.has(t.subject)) {
      map.set(t.subject, []);
      subjectOrder.push(t.subject);
    }
    map.get(t.subject).push(t);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => complexity(a) - complexity(b));
  }
  const out = [];
  for (const subject of subjectOrder) {
    out.push(...map.get(subject));
  }
  return out;
}

function topicsNeededForDay(remainingTopics, remainingDays, intensiveMode) {
  if (remainingTopics <= 0 || remainingDays <= 0) return 0;
  let need = Math.ceil(remainingTopics / remainingDays);
  if (!intensiveMode) {
    need = Math.min(Math.max(need, 2), 4);
  } else {
    need = Math.max(need, 2);
  }
  return Math.min(need, remainingTopics);
}

export const FALLBACK_FLAT_TOPICS = [
  { subject: "Polity", topic: "Constitutional Framework", subtopics: ["Preamble", "Basic structure"] },
  { subject: "Polity", topic: "Fundamental Rights", subtopics: ["Articles 12-35", "Writ jurisdiction"] },
  { subject: "Economy", topic: "National Income", subtopics: ["GDP", "GNP"] },
  { subject: "Economy", topic: "Banking", subtopics: ["RBI", "Monetary policy"] },
  { subject: "History", topic: "Ancient India", subtopics: ["Harappan", "Mauryan"] },
  { subject: "History", topic: "Modern India", subtopics: ["1857", "Congress"] },
  { subject: "Geography", topic: "Physical Geography", subtopics: ["Geomorphology", "Climatology"] },
  { subject: "Geography", topic: "Indian Geography", subtopics: ["Rivers", "Soils"] },
  { subject: "Environment", topic: "Ecology", subtopics: ["Ecosystems", "Biodiversity"] },
  { subject: "Science & Tech", topic: "Space & Defence", subtopics: ["ISRO", "Missiles"] },
  { subject: "Current Affairs", topic: "Integrated revision", subtopics: ["Editorials", "PT capsules"] },
];

export function generateSyllabusBasedTasks(params) {
  const { startDate, endDate, dailyHours } = params;
  let flatTopics = (params.flatTopics || []).map(normalizeFlatTopic).filter((t) => t && t.topic);
  if (!flatTopics.length) flatTopics = [...FALLBACK_FLAT_TOPICS];

  const days = enumerateDateRange(startDate, endDate);
  const D = days.length;
  const N = flatTopics.length;
  if (D === 0) {
    return { tasks: [], intensiveMode: false, meta: { totalTopics: N, totalDays: 0 } };
  }

  const basePerDay = Math.ceil(N / D);
  const intensiveMode = basePerDay > 4 || N / D > Math.max(2, dailyHours * 0.85);

  const queue = groupBySubjectContinuously(flatTopics);
  const tasks = [];
  const recentStudyTopics = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const dateStr = days[dayIdx];
    const totalMin = Math.max(120, dailyHours * 60);
    let timeCursor = DEFAULT_START_TIME;
    const isSeventhDay = (dayIdx + 1) % 7 === 0;

    if (isSeventhDay) {
      const revisionMin = Math.max(75, Math.floor(totalMin * 0.6));
      const testMin = Math.max(45, totalMin - revisionMin);
      const revLabels =
        recentStudyTopics.length > 0
          ? recentStudyTopics.slice(-10).map((t) => `${t.subject}: ${t.topic}`)
          : ["Consolidation day: revise previous study blocks"];
      tasks.push({
        date: dateStr,
        subject: "Mixed",
        topic: "Weekly Revision",
        subtopics: [],
        taskType: "revision",
        duration: revisionMin,
        startTime: timeCursor,
        endTime: addMinutesToTime(timeCursor, revisionMin),
        completed: false,
        completedAt: null,
        questions: null,
        plannerTestType: null,
        testAccuracy: null,
        testSkipped: false,
        revisionTopicSummaries: revLabels,
        linkedTopicKey: null,
        carriedOverFromDate: null,
      });
      timeCursor = addMinutesToTime(timeCursor, revisionMin);
      const anchor = recentStudyTopics[recentStudyTopics.length - 1] || flatTopics[0];
      tasks.push({
        date: dateStr,
        subject: anchor?.subject || "General",
        topic: `Weekly Test — ${(anchor?.topic || "Mixed Topics").replace(/\s*—\s*MCQ block$/i, "")}`,
        subtopics: [],
        taskType: "test",
        duration: testMin,
        startTime: timeCursor,
        endTime: addMinutesToTime(timeCursor, testMin),
        completed: false,
        completedAt: null,
        questions: 50,
        plannerTestType: "Revision Test",
        testAccuracy: null,
        testSkipped: false,
        revisionTopicSummaries: [],
        linkedTopicKey: anchor ? `${anchor.subject}|${anchor.topic}` : null,
        carriedOverFromDate: null,
      });
      continue;
    }

    const dayStudyTopics = [];
    const remainingDays = days.length - dayIdx;
    const remainingTopics = queue.length;
    const need = topicsNeededForDay(remainingTopics, remainingDays, intensiveMode);
    for (let i = 0; i < need && queue.length; i++) {
      dayStudyTopics.push(queue.shift());
    }

    const hasHeavy = dayStudyTopics.some((t) => isHeavyTopic(t));
    const testMin = hasHeavy ? 30 : 45;
    const revisionMin = hasHeavy ? 30 : Math.min(60, Math.max(25, Math.floor(totalMin * 0.15)));
    let studyMin = totalMin - testMin - revisionMin;
    studyMin = Math.max(60, studyMin);
    const perStudy = dayStudyTopics.length ? Math.max(30, Math.floor(studyMin / dayStudyTopics.length)) : 0;

    // Chapter-wise split: morning + evening sessions for each topic.
    let morningCursor = DEFAULT_START_TIME;
    let eveningCursor = EVENING_START_TIME;

    for (const top of dayStudyTopics) {
      const heavy = isHeavyTopic(top);
      const dur = heavy ? studyMin : perStudy;
      const morningMin = Math.max(30, Math.floor(dur * 0.6));
      const eveningMin = Math.max(25, dur - morningMin);
      const split = splitSubtopicsIntoSessions(top.subtopics || []);
      tasks.push({
        date: dateStr,
        subject: top.subject,
        topic: `${heavy ? `${top.topic} (Heavy Focus)` : top.topic} — Morning Session`,
        subtopics: split.morning.length ? split.morning : top.subtopics || [],
        taskType: "study",
        duration: morningMin,
        startTime: morningCursor,
        endTime: addMinutesToTime(morningCursor, morningMin),
        completed: false,
        completedAt: null,
        questions: null,
        plannerTestType: null,
        testAccuracy: null,
        testSkipped: false,
        revisionTopicSummaries: [],
        linkedTopicKey: `${top.subject}|${top.topic}`,
        carriedOverFromDate: null,
      });
      morningCursor = addMinutesToTime(morningCursor, morningMin);

      tasks.push({
        date: dateStr,
        subject: top.subject,
        topic: `${heavy ? `${top.topic} (Heavy Focus)` : top.topic} — Evening Session`,
        subtopics: split.evening.length ? split.evening : split.morning,
        taskType: "study",
        duration: eveningMin,
        startTime: eveningCursor,
        endTime: addMinutesToTime(eveningCursor, eveningMin),
        completed: false,
        completedAt: null,
        questions: null,
        plannerTestType: null,
        testAccuracy: null,
        testSkipped: false,
        revisionTopicSummaries: [],
        linkedTopicKey: `${top.subject}|${top.topic}`,
        carriedOverFromDate: null,
      });
      eveningCursor = addMinutesToTime(eveningCursor, eveningMin);
      recentStudyTopics.push(top);
    }

    const revLabels =
      dayStudyTopics.length > 0
        ? dayStudyTopics.map((t) => `${t.subject}: ${t.topic}`)
        : ["Warm-up: recap recent notes"];
    timeCursor = eveningCursor;
    tasks.push({
      date: dateStr,
      subject: "Mixed",
      topic: "Daily Revision",
      subtopics: [],
      taskType: "revision",
      duration: revisionMin,
      startTime: timeCursor,
      endTime: addMinutesToTime(timeCursor, revisionMin),
      completed: false,
      completedAt: null,
      questions: null,
      plannerTestType: null,
      testAccuracy: null,
      testSkipped: false,
      revisionTopicSummaries: revLabels,
      linkedTopicKey: null,
      carriedOverFromDate: null,
    });
    timeCursor = addMinutesToTime(timeCursor, revisionMin);

    const anchor = dayStudyTopics[0] || flatTopics[0];
    tasks.push({
      date: dateStr,
      subject: anchor?.subject || "General",
      topic: `${anchor?.topic || "Mixed"} — MCQ block`,
      subtopics: [],
      taskType: "test",
      duration: testMin,
      startTime: timeCursor,
      endTime: addMinutesToTime(timeCursor, testMin),
      completed: false,
      completedAt: null,
      questions: 20,
      plannerTestType: "MCQ",
      testAccuracy: null,
      testSkipped: false,
      revisionTopicSummaries: [],
      linkedTopicKey: anchor ? `${anchor.subject}|${anchor.topic}` : null,
      carriedOverFromDate: null,
    });
  }

  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  return {
    tasks,
    intensiveMode,
    meta: { totalTopics: N, totalDays: D, usedFallback: !(params.flatTopics || []).length },
  };
}

export function flattenSyllabusSubjects(subjects) {
  const out = [];
  for (const s of subjects || []) {
    const subj = s.name || "General";
    for (const row of s.topics || []) {
      out.push({
        subject: subj,
        topic: row.topic,
        subtopics: row.subtopics || [],
        weight: row.weight,
        estimatedHours: row.estimatedHours,
      });
    }
  }
  return out;
}
