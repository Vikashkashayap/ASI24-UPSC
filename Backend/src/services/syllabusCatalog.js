import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SUBJECT_NAME_HI,
  MODULE_NAME_HI,
  localizeDurationChip,
  normalizeMedium,
} from "./foundationSyllabusHindi.js";
import { getChapterNameHi } from "./foundationSyllabusChapterHi.js";

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
  const moduleId = String(mod.module_code || `${subject.id}_m${index + 1}`);
  const moduleName = String(mod.module_name || "").trim();
  const rawChapters = (mod.chapters || []).map((c, i) => {
    const chapter = String(c.chapter ?? "");
    const nameEn = String(c.name || "").trim();
    const nameHi = getChapterNameHi(nameEn, moduleId, chapter) || nameEn;
    return { chapter, nameEn, nameHi, index: i };
  });

  const chaptersAsTopics = rawChapters.map((c) => ({
    topicId: `${subject.id}_${mod.module_code || index + 1}_ch${c.chapter || c.index + 1}`,
    topicName: c.nameEn,
    topicNameHi: c.nameHi,
    chapter: c.chapter,
    hours: undefined,
  }));

  return {
    subjectKey: subject.id,
    subjectName: subject.name,
    subjectNameHi: SUBJECT_NAME_HI[subject.id] || subject.name,
    moduleId,
    moduleName,
    moduleNameHi: MODULE_NAME_HI[moduleId] || moduleName,
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
    topicCount: rawChapters.length,
    topics: chaptersAsTopics,
    chapters: rawChapters.map((c) => ({
      chapter: c.chapter,
      name: c.nameEn,
      nameEn: c.nameEn,
      nameHi: c.nameHi,
    })),
    chips: mod.chips || [],
  };
}

export function listSyllabusSubjects(medium = "en") {
  const lang = normalizeMedium(medium);
  const data = loadFoundation();
  return (data.subjects || []).map((s) => {
    const durationEn = (s.chips || []).find((c) => /month|week/i.test(c)) || null;
    return {
      key: s.id,
      name: s.name,
      nameHi: SUBJECT_NAME_HI[s.id] || s.name,
      displayName: lang === "hi" ? SUBJECT_NAME_HI[s.id] || s.name : s.name,
      primarySource: s.primary_source || "",
      sourceNote: s.source_note || null,
      duration: localizeDurationChip(durationEn, lang),
      moduleCount: (s.modules || []).length,
      chips: (s.chips || []).map((c) => localizeDurationChip(c, lang)),
    };
  });
}

export function getSubjectModules(subjectKey, medium = "en") {
  const lang = normalizeMedium(medium);
  const data = loadFoundation();
  const subject = (data.subjects || []).find((s) => s.id === subjectKey);
  if (!subject) return null;

  const durationEn = (subject.chips || []).find((c) => /month|week/i.test(c)) || null;
  const modules = (subject.modules || []).map((m, i) => {
    const base = normalizeModule(m, subject, i);
    const chapters =
      lang === "hi"
        ? (base.chapters || []).map((c) => ({
            ...c,
            name: c.nameHi || c.nameEn || c.name,
          }))
        : (base.chapters || []).map((c) => ({
            ...c,
            name: c.nameEn || c.name,
          }));
    const topics =
      lang === "hi"
        ? (base.topics || []).map((t) => ({
            ...t,
            topicName: t.topicNameHi || t.topicName,
          }))
        : base.topics;
    return {
      ...base,
      moduleName: lang === "hi" ? base.moduleNameHi : base.moduleName,
      subjectName: lang === "hi" ? base.subjectNameHi : base.subjectName,
      durationLabel: localizeDurationChip(base.durationLabel, lang),
      chips: (base.chips || []).map((c) => localizeDurationChip(c, lang)),
      testLabel:
        lang === "hi" && base.testLabel
          ? String(base.testLabel).replace(/Test:\s*/i, "टेस्ट: ")
          : base.testLabel,
      chapters,
      topics,
    };
  });

  return {
    subject: {
      key: subject.id,
      name: subject.name,
      nameHi: SUBJECT_NAME_HI[subject.id] || subject.name,
      displayName: lang === "hi" ? SUBJECT_NAME_HI[subject.id] || subject.name : subject.name,
      primarySource: subject.primary_source || "",
      sourceNote: subject.source_note || null,
      duration: localizeDurationChip(durationEn, lang),
      chips: (subject.chips || []).map((c) => localizeDurationChip(c, lang)),
    },
    modules,
  };
}

export function getModuleDetail(subjectKey, moduleId, medium = "en") {
  const packed = getSubjectModules(subjectKey, medium);
  if (!packed) return null;
  const mod = packed.modules.find((m) => m.moduleId === String(moduleId));
  if (!mod) return null;
  return { subject: packed.subject, module: mod };
}

export function getFullCatalog(medium = "en") {
  return listSyllabusSubjects(medium).map((s) => {
    const packed = getSubjectModules(s.key, medium);
    return {
      ...s,
      modules: (packed?.modules || []).map((m) => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        moduleNameHi: m.moduleNameHi,
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
