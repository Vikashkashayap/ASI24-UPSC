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
    })
      .sort({ dueDate: 1, updatedAt: -1 })
      .lean();

    const mapped = records.map((r) => {
      const completed = (r.completedStudentIds || []).some((id) => String(id) === String(userId));
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
        topicsPreview: r.topicsPreview || [],
        note: r.note || "",
        dueDate: r.dueDate || null,
        completed,
        createdAt: r.createdAt,
      };
    });

    const active = mapped.filter((t) => !t.completed);
    const completed = mapped.filter((t) => t.completed);

    return res.json({
      success: true,
      data: {
        targets: includeCompleted ? mapped : active,
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

    if (markComplete && !already) {
      record.completedStudentIds = [...(record.completedStudentIds || []), userId];
    } else if (!markComplete && already) {
      record.completedStudentIds = (record.completedStudentIds || []).filter(
        (id) => String(id) !== String(userId)
      );
    }
    await record.save();

    return res.json({
      success: true,
      message: markComplete ? "Module marked complete" : "Module marked incomplete",
      data: { _id: record._id, completed: markComplete },
    });
  } catch (error) {
    console.error("toggleMySyllabusTargetComplete:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update" });
  }
};
