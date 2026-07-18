import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../Frontend/src/data");
const FOUNDATION_FILE = "mentorsdaily_foundation_cse2028.json";

let foundationCache = null;

function loadFoundation() {
  if (foundationCache) return foundationCache;
  const filePath = path.join(DATA_DIR, FOUNDATION_FILE);
  if (!fs.existsSync(filePath)) {
    foundationCache = { meta: {}, subjects: [] };
    return foundationCache;
  }
  try {
    foundationCache = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    foundationCache = { meta: {}, subjects: [] };
  }
  return foundationCache;
}

function formatDurationLabel(mod) {
  if (mod.duration_label) return mod.duration_label;
  if (mod.estimated_hours != null && mod.estimated_days != null) {
    return `~${mod.estimated_hours} h · ${mod.estimated_days} days`;
  }
  if (mod.estimated_days != null) return `${mod.estimated_days} days`;
  if (mod.estimated_hours != null) return `~${mod.estimated_hours} h`;
  return null;
}

function normalizeModule(mod, subject, index) {
  const chapters = (mod.chapters || []).map((c, i) => ({
    topicId: `${subject.id}_${mod.module_code || index + 1}_ch${c.chapter || i + 1}`,
    topicName: c.name,
    chapter: String(c.chapter ?? ""),
    hours: undefined,
  }));

  return {
    subjectKey: subject.id,
    subjectName: subject.name,
    moduleId: String(mod.module_code || `${subject.id}_m${index + 1}`),
    moduleName: String(mod.module_name || "").trim(),
    sequence: index + 1,
    chapterRange: mod.chapter_range || null,
    estimatedDays: mod.estimated_days ?? null,
    estimatedHours: mod.estimated_hours ?? null,
    durationLabel: formatDurationLabel(mod),
    hasModuleTest: Boolean(mod.has_module_test),
    testLabel: mod.test_label || (mod.has_module_test ? "Test: 50 Q" : null),
    focus: mod.focus || null,
    importance: null,
    overview: mod.focus || null,
    topicCount: chapters.length,
    topics: chapters,
    chapters: (mod.chapters || []).map((c) => ({
      chapter: String(c.chapter ?? ""),
      name: c.name,
    })),
    chips: mod.chips || [],
  };
}

export function listSyllabusSubjects() {
  const data = loadFoundation();
  return (data.subjects || []).map((s) => ({
    key: s.id,
    name: s.name,
    primarySource: s.primary_source || "",
    sourceNote: s.source_note || null,
    duration: (s.chips || []).find((c) => /month|week/i.test(c)) || null,
    moduleCount: (s.modules || []).length,
    chips: s.chips || [],
  }));
}

export function getSubjectModules(subjectKey) {
  const data = loadFoundation();
  const subject = (data.subjects || []).find((s) => s.id === subjectKey);
  if (!subject) return null;

  return {
    subject: {
      key: subject.id,
      name: subject.name,
      primarySource: subject.primary_source || "",
      sourceNote: subject.source_note || null,
      duration: (subject.chips || []).find((c) => /month|week/i.test(c)) || null,
      chips: subject.chips || [],
    },
    modules: (subject.modules || []).map((m, i) => normalizeModule(m, subject, i)),
  };
}

export function getModuleDetail(subjectKey, moduleId) {
  const packed = getSubjectModules(subjectKey);
  if (!packed) return null;
  const mod = packed.modules.find((m) => m.moduleId === String(moduleId));
  if (!mod) return null;
  return { subject: packed.subject, module: mod };
}

export function getFullCatalog() {
  return listSyllabusSubjects().map((s) => {
    const packed = getSubjectModules(s.key);
    return {
      ...s,
      modules: (packed?.modules || []).map((m) => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        sequence: m.sequence,
        chapterRange: m.chapterRange,
        estimatedDays: m.estimatedDays,
        estimatedHours: m.estimatedHours,
        durationLabel: m.durationLabel,
        topicCount: m.topicCount,
        hasModuleTest: m.hasModuleTest,
        testLabel: m.testLabel,
        chapters: m.chapters,
        focus: m.focus,
        chips: m.chips,
      })),
    };
  });
}

export function getFoundationMeta() {
  return loadFoundation().meta || {};
}
