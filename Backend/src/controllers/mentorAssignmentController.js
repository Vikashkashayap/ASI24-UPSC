import mongoose from "mongoose";
import { User } from "../models/User.js";
import AssignedPracticeTest from "../models/AssignedPracticeTest.js";
import Test from "../models/Test.js";
import SyllabusModuleTarget from "../models/SyllabusModuleTarget.js";
import {
  listSyllabusSubjects,
  getSubjectModules,
  getModuleDetail,
} from "../services/syllabusCatalog.js";
import {
  formatChapterPreview,
  normalizeMedium,
} from "../services/foundationSyllabusHindi.js";

async function getMentorRosterIds(mentorUserId) {
  const ids = await User.find({
    mentorId: mentorUserId,
    role: "student",
  }).distinct("_id");
  return ids.map((id) => String(id));
}

async function validateMentorStudentIds(mentorUserId, studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { ok: false, message: "At least one student must be selected" };
  }
  const uniqueIds = [...new Set(studentIds.map((id) => String(id)))];
  const rosterIds = new Set(await getMentorRosterIds(mentorUserId));
  const notOnRoster = uniqueIds.filter((id) => !rosterIds.has(id));
  if (notOnRoster.length) {
    return {
      ok: false,
      message: "You can only assign students that are under your roster",
    };
  }
  const students = await User.find({
    _id: { $in: uniqueIds },
    role: "student",
    mentorId: mentorUserId,
  }).select("_id name email");
  if (students.length !== uniqueIds.length) {
    return { ok: false, message: "One or more selected users are invalid or not your students" };
  }
  return { ok: true, students, uniqueIds, rosterIds };
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
    topicCount: doc.topicCount || 0,
    topicsPreview: doc.topicsPreview || [],
    note: doc.note || "",
    dueDate: doc.dueDate || null,
    status: doc.status,
    assignedCount: assignedStudentIds.length,
    completedCount: completedStudentIds.length,
    assignedStudents: assignedStudentIds
      .map((id) => studentMap.get(id) || { _id: id, name: "Student", email: "" })
      .filter(Boolean),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function buildListDisplayTitle(record) {
  const customTitle = String(record.title || "").trim();
  if (customTitle) {
    return customTitle.length > 80 ? `${customTitle.slice(0, 77).trim()}…` : customTitle;
  }
  const chapter = String(record.chapter || "").trim();
  const searchQuery = String(record.searchQuery || "").trim();
  const topic = String(record.topic || "").trim();
  if (chapter) return chapter;
  if (searchQuery) return searchQuery;
  if (topic) return topic.length > 80 ? `${topic.slice(0, 77).trim()}…` : topic;
  return String(record.subject || "Practice test");
}

/** GET /api/mentor/syllabus-targets/catalog */
export const mentorGetSyllabusCatalog = async (req, res) => {
  try {
    const medium = normalizeMedium(req.query?.medium);
    const subjects = listSyllabusSubjects(medium);
    return res.json({ success: true, data: { subjects, medium } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load catalog" });
  }
};

/** GET /api/mentor/syllabus-targets/catalog/:subjectKey */
export const mentorGetSyllabusSubjectModules = async (req, res) => {
  try {
    const medium = normalizeMedium(req.query?.medium);
    const packed = getSubjectModules(req.params.subjectKey, medium);
    if (!packed) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    return res.json({ success: true, data: { ...packed, medium } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load modules" });
  }
};

/**
 * POST /api/mentor/syllabus-targets
 * Assign syllabus modules (planner) only to mentor's roster students.
 */
export const mentorCreateSyllabusTargets = async (req, res) => {
  try {
    const { subjectKey, moduleIds, studentIds, dueDate, note, medium: mediumRaw } = req.body || {};
    const medium = normalizeMedium(mediumRaw);

    if (!subjectKey || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select a subject and at least one module",
      });
    }

    const validation = await validateMentorStudentIds(req.user._id, studentIds);
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
      const topicsPreview = (mod.chapters || mod.topics || [])
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

      let existing = await SyllabusModuleTarget.findOne({
        subjectKey: subject.key,
        moduleId: mod.moduleId,
        medium,
        status: "active",
      });

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
        existing.topicsPreview = topicsPreview;
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
          topicsPreview,
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
    console.error("mentorCreateSyllabusTargets:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to assign modules" });
  }
};

/**
 * GET /api/mentor/syllabus-targets
 * Only targets that include at least one of the mentor's students.
 * Response students are roster-filtered.
 */
export const mentorListSyllabusTargets = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = req.query.filter || "active";
    const subjectKey = req.query.subjectKey ? String(req.query.subjectKey) : "";
    const studentId = req.query.studentId ? String(req.query.studentId).trim() : "";

    const rosterIds = await getMentorRosterIds(req.user._id);
    if (rosterIds.length === 0) {
      return res.json({
        success: true,
        data: {
          targets: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
            hasPrev: false,
            hasNext: false,
          },
        },
      });
    }

    const rosterObjectIds = rosterIds.map((id) => new mongoose.Types.ObjectId(id));
    const query = {
      assignedStudentIds: { $in: rosterObjectIds },
    };
    if (filter === "active") query.status = "active";
    else if (filter === "archived") query.status = "archived";
    if (subjectKey) query.subjectKey = subjectKey;

    if (studentId) {
      if (!rosterIds.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: "Student is not on your roster",
        });
      }
      query.assignedStudentIds = studentId;
    }

    const total = await SyllabusModuleTarget.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const records = await SyllabusModuleTarget.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    const rosterSet = new Set(rosterIds);
    const visibleStudentIds = [
      ...new Set(
        records.flatMap((r) =>
          (r.assignedStudentIds || []).map(String).filter((id) => rosterSet.has(id))
        )
      ),
    ];
    const users = visibleStudentIds.length
      ? await User.find({ _id: { $in: visibleStudentIds } }).select("_id name email").lean()
      : [];
    const studentMap = new Map(
      users.map((u) => [String(u._id), { _id: u._id, name: u.name, email: u.email }])
    );

    const targets = records.map((doc) => {
      const filtered = {
        ...doc,
        assignedStudentIds: (doc.assignedStudentIds || []).filter((id) => rosterSet.has(String(id))),
        completedStudentIds: (doc.completedStudentIds || []).filter((id) => rosterSet.has(String(id))),
      };
      return serializeTarget(filtered, studentMap);
    });

    return res.json({
      success: true,
      data: {
        targets,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          hasPrev: safePage > 1,
          hasNext: safePage < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("mentorListSyllabusTargets:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to list targets" });
  }
};

/**
 * PATCH /api/mentor/syllabus-targets/:id/assign
 * Merge: keep non-roster students; replace mentor's portion with selection.
 */
export const mentorUpdateSyllabusTargetAssignment = async (req, res) => {
  try {
    const record = await SyllabusModuleTarget.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Target not found" });
    }

    const validation = await validateMentorStudentIds(req.user._id, req.body?.studentIds);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const rosterSet = validation.rosterIds;
    const outsideRoster = (record.assignedStudentIds || []).filter(
      (id) => !rosterSet.has(String(id))
    );
    record.assignedStudentIds = [...outsideRoster, ...validation.students.map((s) => s._id)];

    const keep = new Set([
      ...outsideRoster.map(String),
      ...validation.uniqueIds,
    ]);
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
    const filtered = {
      ...record.toObject(),
      assignedStudentIds: validation.students.map((s) => s._id),
      completedStudentIds: (record.completedStudentIds || []).filter((id) =>
        validation.uniqueIds.includes(String(id))
      ),
    };

    return res.json({
      success: true,
      message: `Assignment updated — ${validation.students.length} student(s) from your roster`,
      data: serializeTarget(filtered, studentMap),
    });
  } catch (error) {
    console.error("mentorUpdateSyllabusTargetAssignment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update assignment",
    });
  }
};

/** GET /api/mentor/assigned-practice — ready practice sets for mentor to assign */
export const mentorListAssignedPractice = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
    const filter = String(req.query.filter || "all").toLowerCase();
    const subject = String(req.query.subject || "").trim();
    const rosterIds = await getMentorRosterIds(req.user._id);
    const rosterSet = new Set(rosterIds);

    const query = { status: "ready" };
    if (subject) {
      const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.subject = new RegExp(`^${escaped}$`, "i");
    }

    if (filter === "assigned" && rosterIds.length) {
      query.assignedStudentIds = { $in: rosterIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (filter === "unassigned") {
      if (rosterIds.length === 0) {
        // no roster → nothing "assigned by me"; show all ready as unassigned-to-me
      } else {
        query.assignedStudentIds = {
          $nin: rosterIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }
    }

    const total = await AssignedPracticeTest.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const records = await AssignedPracticeTest.find(query)
      .select(
        "subject topic chapter title reference difficulty totalQuestions status errorMessage createdAt assignedStudentIds searchQuery notesTopicIds"
      )
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    const visibleStudentIds = [
      ...new Set(
        records.flatMap((r) =>
          (r.assignedStudentIds || []).map(String).filter((id) => rosterSet.has(id))
        )
      ),
    ];
    const users = visibleStudentIds.length
      ? await User.find({ _id: { $in: visibleStudentIds } }).select("_id name email").lean()
      : [];
    const userMap = Object.fromEntries(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const recordIds = records.map((r) => r._id);
    const attempts = recordIds.length
      ? await Test.find({ assignedPracticeTestId: { $in: recordIds } })
          .select("assignedPracticeTestId userId isSubmitted")
          .lean()
      : [];

    const startedByRecord = {};
    attempts.forEach((t) => {
      const rid = t.assignedPracticeTestId?.toString();
      const uid = t.userId?.toString();
      if (rid && uid && rosterSet.has(uid)) {
        if (!startedByRecord[rid]) startedByRecord[rid] = [];
        if (!startedByRecord[rid].includes(uid)) startedByRecord[rid].push(uid);
      }
    });

    const data = records.map((r) => {
      const rid = r._id.toString();
      const assignedStudents = (r.assignedStudentIds || [])
        .map(String)
        .filter((id) => rosterSet.has(id))
        .map((sid) => ({
          _id: sid,
          name: userMap[sid]?.name || "Student",
          email: userMap[sid]?.email || "",
        }));
      return {
        _id: r._id,
        subject: r.subject,
        topic: r.topic,
        chapter: r.chapter || "",
        title: r.title || "",
        displayTitle: buildListDisplayTitle(r),
        reference: r.reference || "",
        difficulty: r.difficulty,
        totalQuestions: r.totalQuestions,
        status: r.status,
        createdAt: r.createdAt,
        searchQuery: r.searchQuery || "",
        isAssigned: assignedStudents.length > 0,
        assignedStudents,
        startedStudentIds: startedByRecord[rid] || [],
      };
    });

    return res.json({
      success: true,
      data: {
        tests: data,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          hasPrev: safePage > 1,
          hasNext: safePage < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("mentorListAssignedPractice:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to list practice" });
  }
};

/**
 * POST /api/mentor/assigned-practice/:id/assign
 * Merge roster students into practice assignment without removing others.
 */
export const mentorAssignStudentsToPractice = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (record.status !== "ready") {
      return res.status(400).json({
        success: false,
        message:
          record.status === "generating"
            ? "Test is still generating. Please wait."
            : "Cannot assign a failed test.",
      });
    }

    const validation = await validateMentorStudentIds(req.user._id, studentIds);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const rosterSet = validation.rosterIds;
    const startedTests = await Test.find({ assignedPracticeTestId: id }).select("userId").lean();
    const startedOnRoster = new Set(
      startedTests
        .map((t) => String(t.userId))
        .filter((uid) => rosterSet.has(uid))
    );
    const newIdSet = new Set(validation.uniqueIds);
    for (const startedId of startedOnRoster) {
      if (!newIdSet.has(startedId)) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot remove students who have already started this test. Keep them selected or add more.",
        });
      }
    }

    const outsideRoster = (record.assignedStudentIds || []).filter(
      (sid) => !rosterSet.has(String(sid))
    );
    record.assignedStudentIds = [...outsideRoster, ...validation.students.map((s) => s._id)];
    await record.save();

    const studentList = validation.students.map((s) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
    }));

    return res.json({
      success: true,
      message: `Assigned to ${studentList.length} of your student(s). They will see it under Practice Test.`,
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        title: record.title,
        totalQuestions: record.totalQuestions,
        assignedStudents: studentList,
        isAssigned: true,
      },
    });
  } catch (error) {
    console.error("mentorAssignStudentsToPractice:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign practice",
    });
  }
};
