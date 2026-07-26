import SyllabusModuleTarget from "../models/SyllabusModuleTarget.js";
import { User } from "../models/User.js";
import {
  listSyllabusSubjects,
  getSubjectModules,
  getModuleDetail,
  getFullCatalog,
} from "../services/syllabusCatalog.js";
import {
  formatChapterPreview,
  normalizeMedium,
} from "../services/foundationSyllabusHindi.js";
import {
  parseChapterPreviewLine,
  resolveKbSubject,
  createChapterPracticeTest,
  createModuleFinalTestFromChapterBank,
  prefetchNextChapter,
  loadRelatedTopicsMap,
} from "../services/chapterModulePractice.service.js";

async function validateStudentIds(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { ok: false, message: "At least one student must be selected" };
  }
  const uniqueIds = [...new Set(studentIds.map((id) => String(id)))];
  const students = await User.find({
    _id: { $in: uniqueIds },
    role: "student",
  }).select("_id name email");
  if (students.length !== uniqueIds.length) {
    return { ok: false, message: "One or more selected users are invalid or not students" };
  }
  return { ok: true, students, uniqueIds };
}

function serializeTarget(doc, studentMap = new Map()) {
  const assignedStudentIds = (doc.assignedStudentIds || []).map(String);
  const completedStudentIds = (doc.completedStudentIds || []).map(String);
  return {
    _id: doc._id,
    subjectKey: doc.subjectKey,
    subjectName: doc.subjectName,
    moduleId: doc.moduleId,
    moduleName: doc.moduleName,
    medium: doc.medium === "hi" ? "hi" : "en",
    estimatedDays: doc.estimatedDays,
    estimatedHours: doc.estimatedHours,
    chapterRange: doc.chapterRange || "",
    durationLabel: doc.durationLabel || "",
    topicCount: doc.topicCount,
    topicsPreview: doc.topicsPreview || [],
    note: doc.note || "",
    dueDate: doc.dueDate || null,
    status: doc.status,
    assignedCount: assignedStudentIds.length,
    completedCount: completedStudentIds.length,
    assignedStudents: assignedStudentIds.map((id) => {
      const s = studentMap.get(id);
      return s || { _id: id, name: "Unknown", email: "" };
    }),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/admin/syllabus-targets/catalog
 * Query: medium=en|hi
 */
export const getSyllabusCatalog = async (req, res) => {
  try {
    const medium = normalizeMedium(req.query?.medium);
    const subjects = listSyllabusSubjects(medium);
    return res.json({ success: true, data: { subjects, medium } });
  } catch (error) {
    console.error("getSyllabusCatalog:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load catalog" });
  }
};

/**
 * GET /api/admin/syllabus-targets/catalog/full
 */
export const getSyllabusCatalogFull = async (req, res) => {
  try {
    const medium = normalizeMedium(req.query?.medium);
    const subjects = getFullCatalog(medium);
    return res.json({ success: true, data: { subjects, medium } });
  } catch (error) {
    console.error("getSyllabusCatalogFull:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load catalog" });
  }
};

/**
 * GET /api/admin/syllabus-targets/catalog/:subjectKey
 * Query: medium=en|hi
 */
export const getSyllabusSubjectModules = async (req, res) => {
  try {
    const medium = normalizeMedium(req.query?.medium);
    const packed = getSubjectModules(req.params.subjectKey, medium);
    if (!packed) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    return res.json({ success: true, data: { ...packed, medium } });
  } catch (error) {
    console.error("getSyllabusSubjectModules:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load modules" });
  }
};

/**
 * POST /api/admin/syllabus-targets
 * Body: { subjectKey, moduleIds: string[], studentIds: string[], dueDate?, note?, medium?: 'en'|'hi' }
 */
export const createSyllabusTargets = async (req, res) => {
  try {
    const { subjectKey, moduleIds, studentIds, dueDate, note, medium: mediumRaw } = req.body || {};
    const medium = normalizeMedium(mediumRaw);

    if (!subjectKey || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select a subject and at least one module",
      });
    }

    const validation = await validateStudentIds(studentIds);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const uniqueModuleIds = [...new Set(moduleIds.map((id) => String(id).trim()).filter(Boolean))];
    const created = [];
    const skipped = [];

    for (const moduleId of uniqueModuleIds) {
      const detail = getModuleDetail(subjectKey, moduleId, medium);
      if (!detail?.module) {
        skipped.push({ moduleId, reason: "Module not found" });
        continue;
      }

      const { subject, module: mod } = detail;
      const subjectName = subject.displayName || subject.name;
      const moduleName = mod.moduleName;

      // Upsert-style: same module + medium already active → merge student ids
      let existing = await SyllabusModuleTarget.findOne({
        subjectKey: subject.key,
        moduleId: mod.moduleId,
        medium,
        status: "active",
      });

      // Legacy rows without medium: treat as English
      if (!existing && medium === "en") {
        existing = await SyllabusModuleTarget.findOne({
          subjectKey: subject.key,
          moduleId: mod.moduleId,
          status: "active",
          $or: [{ medium: { $exists: false } }, { medium: null }, { medium: "en" }],
        });
      }

      if (existing) {
        const merged = new Set([
          ...(existing.assignedStudentIds || []).map(String),
          ...validation.uniqueIds,
        ]);
        existing.assignedStudentIds = [...merged];
        existing.medium = medium;
        existing.subjectName = subjectName;
        existing.moduleName = moduleName;
        existing.durationLabel = mod.durationLabel || existing.durationLabel || "";
        existing.topicsPreview = (mod.chapters || mod.topics || [])
          .slice(0, 12)
          .map((t) => {
            const nameHi = t.nameHi || t.name;
            const nameEn = t.nameEn || t.name;
            if (t.name || t.topicName) {
              return formatChapterPreview(
                t.chapter,
                medium === "hi" ? nameHi : nameEn,
                medium,
                medium === "hi" ? nameEn : ""
              );
            }
            return t.topicName;
          })
          .filter(Boolean);
        if (dueDate) existing.dueDate = new Date(dueDate);
        if (typeof note === "string" && note.trim()) existing.note = note.trim().slice(0, 500);
        await existing.save();
        created.push(existing);
      } else {
        const doc = await SyllabusModuleTarget.create({
          subjectKey: subject.key,
          subjectName,
          moduleId: mod.moduleId,
          moduleName,
          medium,
          estimatedDays: mod.estimatedDays,
          estimatedHours: mod.estimatedHours,
          chapterRange: mod.chapterRange || "",
          durationLabel: mod.durationLabel || "",
          topicCount: mod.topicCount,
          topicsPreview: (mod.chapters || mod.topics || [])
            .slice(0, 12)
            .map((t) => {
              const nameHi = t.nameHi || t.name;
              const nameEn = t.nameEn || t.name;
              if (t.name || t.topicName) {
                return formatChapterPreview(
                  t.chapter,
                  medium === "hi" ? nameHi : nameEn,
                  medium,
                  medium === "hi" ? nameEn : ""
                );
              }
              return t.topicName;
            })
            .filter(Boolean),
          note: typeof note === "string" ? note.trim().slice(0, 500) : "",
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedStudentIds: validation.students.map((s) => s._id),
          createdBy: req.user?._id,
          status: "active",
        });
        created.push(doc);
      }
    }

    if (!created.length) {
      return res.status(400).json({
        success: false,
        message: "No valid modules could be assigned",
        data: { skipped },
      });
    }

    const studentMap = new Map(
      validation.students.map((s) => [String(s._id), { _id: s._id, name: s.name, email: s.email }])
    );

    return res.status(201).json({
      success: true,
      message: `Assigned ${created.length} module(s) to ${validation.students.length} student(s)`,
      data: {
        targets: created.map((d) => serializeTarget(d, studentMap)),
        skipped,
      },
    });
  } catch (error) {
    console.error("createSyllabusTargets:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to assign modules" });
  }
};

/**
 * GET /api/admin/syllabus-targets
 */
export const listAdminSyllabusTargets = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = req.query.filter || "active";
    const subjectKey = req.query.subjectKey ? String(req.query.subjectKey) : "";

    const query = {};
    if (filter === "active") query.status = "active";
    else if (filter === "archived") query.status = "archived";
    if (subjectKey) query.subjectKey = subjectKey;

    const total = await SyllabusModuleTarget.countDocuments(query);
    const records = await SyllabusModuleTarget.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const allStudentIds = [
      ...new Set(records.flatMap((r) => (r.assignedStudentIds || []).map(String))),
    ];
    const students = allStudentIds.length
      ? await User.find({ _id: { $in: allStudentIds } }).select("_id name email").lean()
      : [];
    const studentMap = new Map(students.map((s) => [String(s._id), s]));

    return res.json({
      success: true,
      data: {
        targets: records.map((r) => serializeTarget(r, studentMap)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasPrev: page > 1,
          hasNext: page * limit < total,
        },
      },
    });
  } catch (error) {
    console.error("listAdminSyllabusTargets:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to list targets" });
  }
};

/**
 * PATCH /api/admin/syllabus-targets/:id/assign
 * Body: { studentIds: string[] } — replaces assignment list
 */
export const updateSyllabusTargetAssignment = async (req, res) => {
  try {
    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const validation = await validateStudentIds(req.body?.studentIds);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    record.assignedStudentIds = validation.students.map((s) => s._id);
    // Drop completions for students no longer assigned
    const keep = new Set(validation.uniqueIds);
    record.completedStudentIds = (record.completedStudentIds || []).filter((id) =>
      keep.has(String(id))
    );
    if (req.body?.dueDate !== undefined) {
      record.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    }
    if (typeof req.body?.note === "string") {
      record.note = req.body.note.trim().slice(0, 500);
    }
    await record.save();

    const studentMap = new Map(
      validation.students.map((s) => [String(s._id), { _id: s._id, name: s.name, email: s.email }])
    );

    return res.json({
      success: true,
      message: `Assignment updated — ${validation.students.length} student(s)`,
      data: serializeTarget(record, studentMap),
    });
  } catch (error) {
    console.error("updateSyllabusTargetAssignment:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update assignment" });
  }
};

/**
 * DELETE /api/admin/syllabus-targets/:id
 */
export const deleteSyllabusTarget = async (req, res) => {
  try {
    const record = await SyllabusModuleTarget.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }
    return res.json({ success: true, message: "Syllabus target deleted" });
  } catch (error) {
    console.error("deleteSyllabusTarget:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete" });
  }
};

/**
 * PATCH /api/admin/syllabus-targets/:id/archive
 */
export const archiveSyllabusTarget = async (req, res) => {
  try {
    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }
    record.status = "archived";
    await record.save();
    return res.json({ success: true, message: "Target archived", data: { _id: record._id, status: record.status } });
  } catch (error) {
    console.error("archiveSyllabusTarget:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to archive" });
  }
};

/** Foundation subject order (polity/P1 first), then natural module id (P1 < P2 < P10 < P16). */
function compareTargetsBySyllabusOrder(a, b, subjectRank) {
  const ra = subjectRank.has(a.subjectKey) ? subjectRank.get(a.subjectKey) : 999;
  const rb = subjectRank.has(b.subjectKey) ? subjectRank.get(b.subjectKey) : 999;
  if (ra !== rb) return ra - rb;
  return String(a.moduleId || "").localeCompare(String(b.moduleId || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Student home order: syllabus sequence from P1.
 * Completed modules stay in place (not removed / not dumped to the end).
 */
function sortStudentTargets(targets) {
  const subjectRank = new Map(listSyllabusSubjects("en").map((s, i) => [s.key, i]));
  return [...targets].sort((a, b) => compareTargetsBySyllabusOrder(a, b, subjectRank));
}

/**
 * GET /api/syllabus-targets/mine — student home
 */
export const listMySyllabusTargets = async (req, res) => {
  try {
    const userId = req.user._id;
    const includeCompleted = String(req.query.includeCompleted || "true") === "true";

    const records = await SyllabusModuleTarget.find({
      status: "active",
      assignedStudentIds: userId,
    }).lean();

    const mapped = await Promise.all(
      records.map(async (r) => {
        const completed = (r.completedStudentIds || []).some((id) => String(id) === String(userId));
        const chapterEntry = (r.chapterCompletions || []).find(
          (c) => String(c.studentId) === String(userId)
        );
        const kbSubject = resolveKbSubject(r.subjectKey, r.subjectName);
        const topicsPreview = r.topicsPreview || [];
        let relatedTopicsByChapter = {};
        try {
          relatedTopicsByChapter = await loadRelatedTopicsMap(kbSubject, topicsPreview);
        } catch {
          relatedTopicsByChapter = {};
        }
        return {
          _id: r._id,
          subjectKey: r.subjectKey,
          subjectName: r.subjectName,
          moduleId: r.moduleId,
          moduleName: r.moduleName,
          medium: r.medium === "hi" ? "hi" : "en",
          estimatedDays: r.estimatedDays,
          estimatedHours: r.estimatedHours,
          chapterRange: r.chapterRange || "",
          durationLabel: r.durationLabel || "",
          topicCount: r.topicCount,
          topicsPreview,
          completedChapters: chapterEntry?.chapters || [],
          chaptersComplete:
            topicsPreview.length > 0 &&
            topicsPreview.every((line) => (chapterEntry?.chapters || []).includes(line)),
          relatedTopicsByChapter,
          note: r.note || "",
          dueDate: r.dueDate || null,
          completed,
          createdAt: r.createdAt,
        };
      })
    );

    const sorted = sortStudentTargets(mapped);
    const active = sorted.filter((t) => !t.completed);
    const completed = sorted.filter((t) => t.completed);

    return res.json({
      success: true,
      data: {
        targets: includeCompleted ? sorted : active,
        activeCount: active.length,
        completedCount: completed.length,
      },
    });
  } catch (error) {
    console.error("listMySyllabusTargets:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load targets" });
  }
};

/**
 * POST /api/syllabus-targets/:id/complete
 * Body: { completed?: boolean }
 */
export const toggleMySyllabusTargetComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const isAssigned = (record.assignedStudentIds || []).some((id) => String(id) === String(userId));
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "This target is not assigned to you" });
    }

    const markComplete = req.body?.completed !== false;
    const already = (record.completedStudentIds || []).some((id) => String(id) === String(userId));
    const topics = record.topicsPreview || [];

    if (markComplete && !already) {
      record.completedStudentIds = [...(record.completedStudentIds || []), userId];
      // Mark every chapter complete when the whole module is checked
      if (topics.length > 0) {
        const idx = (record.chapterCompletions || []).findIndex(
          (c) => String(c.studentId) === String(userId)
        );
        if (idx >= 0) {
          record.chapterCompletions[idx].chapters = [...topics];
        } else {
          record.chapterCompletions = [
            ...(record.chapterCompletions || []),
            { studentId: userId, chapters: [...topics] },
          ];
        }
        record.markModified("chapterCompletions");
      }
    } else if (!markComplete && already) {
      record.completedStudentIds = (record.completedStudentIds || []).filter(
        (id) => String(id) !== String(userId)
      );
      // Clear chapter ticks when the whole module is unchecked
      const idx = (record.chapterCompletions || []).findIndex(
        (c) => String(c.studentId) === String(userId)
      );
      if (idx >= 0) {
        record.chapterCompletions[idx].chapters = [];
        record.markModified("chapterCompletions");
      }
    }
    await record.save();

    const chapterEntry = (record.chapterCompletions || []).find(
      (c) => String(c.studentId) === String(userId)
    );

    return res.json({
      success: true,
      message: markComplete ? "Module marked complete" : "Module marked incomplete",
      data: {
        _id: record._id,
        completed: markComplete,
        completedChapters: chapterEntry?.chapters || [],
      },
    });
  } catch (error) {
    console.error("toggleMySyllabusTargetComplete:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update" });
  }
};

/**
 * POST /api/syllabus-targets/:id/chapters/complete
 * Body: { chapter: string, completed?: boolean }
 * Toggle a single chapter within an assigned module (same check UX as module).
 */
export const toggleMySyllabusChapterComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const chapter = typeof req.body?.chapter === "string" ? req.body.chapter.trim() : "";
    if (!chapter) {
      return res.status(400).json({ success: false, message: "Chapter is required" });
    }

    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const isAssigned = (record.assignedStudentIds || []).some((id) => String(id) === String(userId));
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "This target is not assigned to you" });
    }

    const topics = record.topicsPreview || [];
    if (topics.length > 0 && !topics.includes(chapter)) {
      return res.status(400).json({ success: false, message: "Chapter is not part of this module" });
    }

    const markComplete = req.body?.completed !== false;
    let entry = (record.chapterCompletions || []).find(
      (c) => String(c.studentId) === String(userId)
    );
    if (!entry) {
      record.chapterCompletions.push({ studentId: userId, chapters: [] });
      entry = record.chapterCompletions[record.chapterCompletions.length - 1];
    }

    const set = new Set(entry.chapters || []);
    if (markComplete) set.add(chapter);
    else set.delete(chapter);
    entry.chapters = [...set];
    record.markModified("chapterCompletions");

    // Module unlock requires Module Final (50Q) — do NOT auto-complete module when chapters finish.
    // If a chapter is unmarked, clear module-complete so next module locks again.
    const allChaptersDone = topics.length > 0 && topics.every((t) => set.has(t));
    const alreadyModule = (record.completedStudentIds || []).some(
      (id) => String(id) === String(userId)
    );
    if (!allChaptersDone && alreadyModule) {
      record.completedStudentIds = (record.completedStudentIds || []).filter(
        (id) => String(id) !== String(userId)
      );
    }

    await record.save();

    return res.json({
      success: true,
      message: markComplete ? "Chapter marked complete" : "Chapter marked incomplete",
      data: {
        _id: record._id,
        chapter,
        completedChapters: [...(entry.chapters || [])],
        chaptersComplete: allChaptersDone,
        completed: (record.completedStudentIds || []).some(
          (id) => String(id) === String(userId)
        ),
      },
    });
  } catch (error) {
    console.error("toggleMySyllabusChapterComplete:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update chapter" });
  }
};

/**
 * POST /api/syllabus-targets/:id/chapters/practice
 * Body: { chapter: string }
 * Generate 25 Hard RAG MCQs (5×5 batches), show 20 (does NOT unlock next chapter —
 * unlock happens when the student submits the test via chapters/complete).
 * Prefetches related UPSC topics for the *next* chapter into cache.
 */
export const startChapterPractice = async (req, res) => {
  try {
    const userId = req.user._id;
    const chapter = typeof req.body?.chapter === "string" ? req.body.chapter.trim() : "";
    if (!chapter) {
      return res.status(400).json({ success: false, message: "Chapter is required" });
    }

    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const isAssigned = (record.assignedStudentIds || []).some((id) => String(id) === String(userId));
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "This target is not assigned to you" });
    }

    const topics = record.topicsPreview || [];
    if (topics.length > 0 && !topics.includes(chapter)) {
      return res.status(400).json({ success: false, message: "Chapter is not part of this module" });
    }

    // Module lock: previous assigned module (syllabus order) must be fully complete
    const allAssigned = await SyllabusModuleTarget.find({
      status: "active",
      assignedStudentIds: userId,
    }).lean();
    const subjectRank = new Map(listSyllabusSubjects("en").map((s, i) => [s.key, i]));
    const orderedModules = allAssigned
      .map((r) => ({
        _id: r._id,
        subjectKey: r.subjectKey,
        moduleId: r.moduleId,
        moduleName: r.moduleName,
        completed: (r.completedStudentIds || []).some((id) => String(id) === String(userId)),
      }))
      .sort((a, b) => compareTargetsBySyllabusOrder(a, b, subjectRank));
    const moduleIdx = orderedModules.findIndex((m) => String(m._id) === String(record._id));
    if (moduleIdx > 0 && !orderedModules[moduleIdx - 1].completed) {
      const prev = orderedModules[moduleIdx - 1];
      return res.status(403).json({
        success: false,
        message: `Complete previous module first: ${prev.moduleId} ${prev.moduleName}`,
      });
    }

    // Sequential lock: previous chapter must be completed (test submitted) first
    const chapterIdx = topics.indexOf(chapter);
    if (chapterIdx > 0) {
      const entry = (record.chapterCompletions || []).find(
        (c) => String(c.studentId) === String(userId)
      );
      const doneSet = new Set(entry?.chapters || []);
      const prev = topics[chapterIdx - 1];
      if (!doneSet.has(prev)) {
        return res.status(403).json({
          success: false,
          message: `Complete and submit the previous chapter test first: ${prev}`,
        });
      }
    }

    const parsed = parseChapterPreviewLine(chapter);
    const topicName = parsed.topicName;
    if (!topicName) {
      return res.status(400).json({ success: false, message: "Could not read chapter topic" });
    }

    const kbSubject = resolveKbSubject(record.subjectKey, record.subjectName);

    const payload = {
      targetId: String(record._id),
      subjectKey: record.subjectKey,
      subjectName: record.subjectName,
      moduleId: record.moduleId,
      moduleName: record.moduleName,
      chapter,
      chapterNum: parsed.chapterNum || null,
      topicName,
      kbSubject,
      difficulty: "Hard",
      generateCount: 30,
      showCount: 20,
      minAcceptable: 20,
      batchSize: 10,
      batches: "10×3",
      userId: String(userId),
    };
    console.log("\n========== [chapterPractice] REQUEST PAYLOAD ==========");
    console.log(JSON.stringify(payload, null, 2));
    console.log("=======================================================\n");

    // Related topics already cached for *this* chapter (from a previous student's next-chapter prefetch)
    let relatedTopics = [];
    try {
      const map = await loadRelatedTopicsMap(kbSubject, [chapter]);
      relatedTopics = map[chapter] || [];
    } catch {
      relatedTopics = [];
    }

    const { test, fromCache } = await createChapterPracticeTest({
      userId,
      kbSubject,
      topicName,
      chapterLabel: chapter,
    });

    console.log("[chapterPractice] test created", {
      testId: String(test._id),
      fromCache,
      topic: topicName,
      questions: test.totalQuestions,
    });

    // Prefetch next chapter related topics + warm question cache (non-blocking)
    const nextLabel = chapterIdx >= 0 && chapterIdx < topics.length - 1 ? topics[chapterIdx + 1] : null;
    if (nextLabel) {
      void prefetchNextChapter({
        subjectKey: record.subjectKey,
        kbSubject,
        currentLabel: chapter,
        nextLabel,
      }).catch((err) => console.warn("[startChapterPractice] prefetch:", err.message));
    }

    const entry = (record.chapterCompletions || []).find(
      (c) => String(c.studentId) === String(userId)
    );

    return res.status(201).json({
      success: true,
      message: fromCache
        ? "Chapter practice ready (cached questions)"
        : "Chapter practice generated from Knowledge Base",
      data: {
        testId: test._id,
        test,
        fromCache,
        chapter,
        topicName,
        kbSubject,
        relatedTopics,
        nextChapter: nextLabel,
        completedChapters: entry?.chapters || [],
        completed: (record.completedStudentIds || []).some((id) => String(id) === String(userId)),
        payload,
      },
    });
  } catch (error) {
    console.error("startChapterPractice:", error);
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to start chapter practice",
    });
  }
};

/**
 * POST /api/syllabus-targets/:id/module-final
 * All chapter tests done → 50Q module final:
 * reuse chapter-bank questions from DB, RAG-generate only the shortfall.
 * Submit of this test marks the module complete and unlocks the next module.
 */
export const startModuleFinal = async (req, res) => {
  try {
    const userId = req.user._id;
    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const isAssigned = (record.assignedStudentIds || []).some((id) => String(id) === String(userId));
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "This target is not assigned to you" });
    }

    const topics = record.topicsPreview || [];
    const entry = (record.chapterCompletions || []).find(
      (c) => String(c.studentId) === String(userId)
    );
    const doneSet = new Set(entry?.chapters || []);
    const chaptersComplete = topics.length > 0 && topics.every((t) => doneSet.has(t));
    if (!chaptersComplete) {
      return res.status(400).json({
        success: false,
        message: "Complete all chapter tests in this module before the Module Final",
      });
    }

    // Previous module must be complete (same lock as chapter practice)
    const allAssigned = await SyllabusModuleTarget.find({
      status: "active",
      assignedStudentIds: userId,
    }).lean();
    const subjectRank = new Map(listSyllabusSubjects("en").map((s, i) => [s.key, i]));
    const orderedModules = allAssigned
      .map((r) => ({
        _id: r._id,
        subjectKey: r.subjectKey,
        moduleId: r.moduleId,
        moduleName: r.moduleName,
        completed: (r.completedStudentIds || []).some((id) => String(id) === String(userId)),
      }))
      .sort((a, b) => compareTargetsBySyllabusOrder(a, b, subjectRank));
    const moduleIdx = orderedModules.findIndex((m) => String(m._id) === String(record._id));
    if (moduleIdx > 0 && !orderedModules[moduleIdx - 1].completed) {
      const prev = orderedModules[moduleIdx - 1];
      return res.status(403).json({
        success: false,
        message: `Complete previous module first: ${prev.moduleId} ${prev.moduleName}`,
      });
    }

    const kbSubject = resolveKbSubject(record.subjectKey, record.subjectName);
    const payload = {
      targetId: String(record._id),
      subjectKey: record.subjectKey,
      moduleId: record.moduleId,
      moduleName: record.moduleName,
      chapterCount: topics.length,
      chapters: topics,
      questionCount: 50,
      source: "chapter_bank_plus_rag_topup",
      userId: String(userId),
    };
    console.log("\n========== [moduleFinal] REQUEST PAYLOAD ==========");
    console.log(JSON.stringify(payload, null, 2));
    console.log("===================================================\n");

    const { test } = await createModuleFinalTestFromChapterBank({
      userId,
      kbSubject,
      moduleId: record.moduleId,
      moduleName: record.moduleName,
      chapterLabels: topics,
      showCount: 50,
    });

    const bankPart = test.bankCount != null ? test.bankCount : null;
    const genPart = test.generatedCount || 0;
    const detail =
      genPart > 0
        ? `${test.totalQuestions}Q ready (${Math.min(bankPart ?? test.totalQuestions, 50)} from chapter bank + ${genPart} newly generated)`
        : `${test.totalQuestions} questions shuffled from chapter bank`;

    return res.status(201).json({
      success: true,
      message: `Module Final ready — ${detail}`,
      data: {
        testId: test._id,
        test,
        chaptersComplete: true,
        completed: (record.completedStudentIds || []).some(
          (id) => String(id) === String(userId)
        ),
        payload,
      },
    });
  } catch (error) {
    console.error("startModuleFinal:", error);
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to start module final",
    });
  }
};
