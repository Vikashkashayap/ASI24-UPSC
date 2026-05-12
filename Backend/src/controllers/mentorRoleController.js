import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { MentorFeedback } from "../models/MentorFeedback.js";
import Test from "../models/Test.js";
import CopyEvaluation from "../models/CopyEvaluation.js";
import { StudyPlan } from "../models/StudyPlan.js";

/** Keep Mentor.assignedStudents aligned with User.mentorId */
export async function syncMentorAssignedStudents(mentorUserId) {
  const ids = await User.find({
    mentorId: mentorUserId,
    role: "student",
  }).distinct("_id");
  await Mentor.findOneAndUpdate(
    { userId: mentorUserId },
    { $set: { assignedStudents: ids } },
    { upsert: true, new: true }
  );
}

const assertAdmin = (req) => req.user?.role === "admin";

const isAssignedMentor = async (mentorUserId, studentId) => {
  const sid = new mongoose.Types.ObjectId(studentId);
  const muid = new mongoose.Types.ObjectId(mentorUserId);
  const u = await User.findById(sid).select("mentorId role").lean();
  if (!u || u.role !== "student") return false;
  return u.mentorId && String(u.mentorId) === String(muid);
};

/** POST /api/mentor/create — admin */
export const createMentorAccount = async (req, res) => {
  try {
    if (!assertAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const tempPassword =
      Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const mentorUser = await User.create({
      name,
      email: String(email).toLowerCase(),
      password: tempPassword,
      role: "mentor",
      isActive: true,
      mustChangePassword: true,
      createdBy: req.user?._id,
      accountType: "admin-created",
      subscriptionStatus: "active",
      subscriptionPlanId: null,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: null,
    });

    await Mentor.create({
      userId: mentorUser._id,
      assignedStudents: [],
    });

    return res.status(201).json({
      success: true,
      message: "Mentor account created",
      data: {
        mentor: {
          id: mentorUser._id,
          name: mentorUser.name,
          email: mentorUser.email,
        },
        tempPassword,
      },
    });
  } catch (error) {
    console.error("createMentorAccount:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create mentor",
    });
  }
};

/** POST /api/mentor/assign-students — admin */
export const assignStudentsToMentor = async (req, res) => {
  try {
    if (!assertAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { mentorUserId, studentIds } = req.body;
    if (!mentorUserId || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: "mentorUserId and studentIds (array) are required",
      });
    }

    const mentor = await User.findById(mentorUserId).select("role").lean();
    if (!mentor || mentor.role !== "mentor") {
      return res.status(404).json({ success: false, message: "Mentor user not found" });
    }

    const uniqueIds = [...new Set(studentIds.map((id) => String(id)))];
    const results = { assigned: [], skipped: [] };

    for (const sid of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(sid)) {
        results.skipped.push({ id: sid, reason: "invalid id" });
        continue;
      }
      const student = await User.findById(sid);
      if (!student || student.role !== "student") {
        results.skipped.push({ id: sid, reason: "not a student" });
        continue;
      }

      const prev = student.mentorId ? String(student.mentorId) : null;
      student.mentorId = mentorUserId;
      await student.save();
      if (prev && prev !== String(mentorUserId)) {
        await syncMentorAssignedStudents(prev);
      }
      results.assigned.push(sid);
    }

    await syncMentorAssignedStudents(mentorUserId);

    return res.json({
      success: true,
      message: "Students assigned",
      data: results,
    });
  } catch (error) {
    console.error("assignStudentsToMentor:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign students",
    });
  }
};

/** GET /api/mentor/students — mentor */
export const getMentorStudents = async (req, res) => {
  try {
    if (req.user.role !== "mentor") {
      return res.status(403).json({ success: false, message: "Mentor access only" });
    }

    const students = await User.find({
      mentorId: req.user._id,
      role: "student",
    })
      .select("name email createdAt status subscriptionStatus")
      .sort({ name: 1 })
      .lean();

    const enriched = await Promise.all(
      students.map(async (s) => {
        const [testAgg, evalCount, lastEval] = await Promise.all([
          Test.aggregate([
            {
              $match: {
                userId: s._id,
                isSubmitted: true,
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgScore: { $avg: "$score" },
              },
            },
          ]),
          CopyEvaluation.countDocuments({ userId: s._id, status: "completed" }),
          CopyEvaluation.findOne({ userId: s._id, status: "completed" })
            .sort({ createdAt: -1 })
            .select("finalSummary.overallScore.percentage createdAt")
            .lean(),
        ]);
        const t = testAgg[0] || { count: 0, avgScore: 0 };
        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          createdAt: s.createdAt,
          status: s.status,
          subscriptionStatus: s.subscriptionStatus,
          testsSubmitted: t.count,
          averageTestScore: Math.round(t.avgScore || 0),
          mainsEvaluations: evalCount,
          latestMainsScorePct: lastEval?.finalSummary?.overallScore?.percentage ?? null,
        };
      })
    );

    return res.json({
      success: true,
      data: { students: enriched },
    });
  } catch (error) {
    console.error("getMentorStudents:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list students",
    });
  }
};

async function buildStudentProgressSummary(userId) {
  const plan = await StudyPlan.findOne({ userId }).lean();
  if (!plan || !plan.tasks?.length) {
    return {
      hasPlan: false,
      streak: 0,
      taskCompletionRate: 0,
      totalTasks: 0,
      completedTasks: 0,
    };
  }
  const total = plan.tasks.length;
  const completed = plan.tasks.filter((t) => t.completed).length;
  return {
    hasPlan: true,
    streak: plan.currentStreak || 0,
    longestStreak: plan.longestStreak || 0,
    taskCompletionRate: total ? Math.round((completed / total) * 100) : 0,
    totalTasks: total,
    completedTasks: completed,
    examDate: plan.examDate,
  };
}

/** GET /api/mentor/students/:studentId — mentor */
export const getMentorStudentDetail = async (req, res) => {
  try {
    if (req.user.role !== "mentor") {
      return res.status(403).json({ success: false, message: "Mentor access only" });
    }
    const { studentId } = req.params;
    const ok = await isAssignedMentor(req.user._id, studentId);
    if (!ok) {
      return res.status(403).json({ success: false, message: "Student not assigned to you" });
    }

    const student = await User.findById(studentId)
      .select("name email createdAt status accountType subscriptionStatus")
      .lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const [testAgg, testsRecent, mainsAgg, progress] = await Promise.all([
      Test.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(studentId),
            isSubmitted: true,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgScore: { $avg: "$score" },
            maxScore: { $max: "$score" },
            minScore: { $min: "$score" },
          },
        },
      ]),
      Test.find({
        userId: studentId,
        isSubmitted: true,
      })
        .sort({ updatedAt: -1 })
        .limit(15)
        .select("subject topic score accuracy createdAt updatedAt prelimsMockId")
        .lean(),
      CopyEvaluation.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(studentId),
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgPct: {
              $avg: "$finalSummary.overallScore.percentage",
            },
          },
        },
      ]),
      buildStudentProgressSummary(studentId),
    ]);

    const t0 = testAgg[0] || { count: 0, avgScore: 0, maxScore: 0, minScore: 0 };
    const m0 = mainsAgg[0] || { count: 0, avgPct: 0 };

    const feedback = await MentorFeedback.find({
      mentorUserId: req.user._id,
      studentUserId: studentId,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("message createdAt")
      .lean();

    return res.json({
      success: true,
      data: {
        student,
        tests: {
          totalSubmitted: t0.count,
          averageScore: Math.round((t0.avgScore || 0) * 100) / 100,
          highestScore: t0.maxScore != null ? Number(t0.maxScore) : 0,
          lowestScore: t0.minScore != null ? Number(t0.minScore) : 0,
          recent: testsRecent,
        },
        mains: {
          completedEvaluations: m0.count,
          averageScorePct: Math.round(m0.avgPct || 0),
        },
        progress,
        feedback,
      },
    });
  } catch (error) {
    console.error("getMentorStudentDetail:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load student",
    });
  }
};

/** POST /api/mentor/feedback — mentor */
export const postMentorFeedback = async (req, res) => {
  try {
    if (req.user.role !== "mentor") {
      return res.status(403).json({ success: false, message: "Mentor access only" });
    }
    const { studentId, message } = req.body;
    if (!studentId || !message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "studentId and message are required",
      });
    }

    const ok = await isAssignedMentor(req.user._id, studentId);
    if (!ok) {
      return res.status(403).json({ success: false, message: "Student not assigned to you" });
    }

    const doc = await MentorFeedback.create({
      mentorUserId: req.user._id,
      studentUserId: studentId,
      message: String(message).trim(),
    });

    return res.status(201).json({
      success: true,
      data: {
        feedback: {
          _id: doc._id,
          message: doc.message,
          createdAt: doc.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("postMentorFeedback:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save feedback",
    });
  }
};

/** GET /api/mentor/analytics — mentor */
export const getMentorAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "mentor") {
      return res.status(403).json({ success: false, message: "Mentor access only" });
    }

    const students = await User.find({
      mentorId: req.user._id,
      role: "student",
    })
      .select("_id")
      .lean();
    const ids = students.map((s) => s._id);
    if (ids.length === 0) {
      return res.json({
        success: true,
        data: {
          rosterSize: 0,
          totalTestsAcrossRoster: 0,
          avgTestScoreAcrossRoster: 0,
          totalMainsEvaluationsAcrossRoster: 0,
          studentsWithActivePlan: 0,
        },
      });
    }

    const oids = ids.map((id) => new mongoose.Types.ObjectId(id));

    const [testStats, mainsCount, plansCount] = await Promise.all([
      Test.aggregate([
        {
          $match: {
            userId: { $in: oids },
            isSubmitted: true,
          },
        },
        {
          $group: {
            _id: null,
            totalTests: { $sum: 1 },
            avgScore: { $avg: "$score" },
          },
        },
      ]),
      CopyEvaluation.countDocuments({
        userId: { $in: ids },
        status: "completed",
      }),
      StudyPlan.countDocuments({ userId: { $in: ids } }),
    ]);

    const ts = testStats[0] || { totalTests: 0, avgScore: 0 };

    return res.json({
      success: true,
      data: {
        rosterSize: ids.length,
        totalTestsAcrossRoster: ts.totalTests || 0,
        avgTestScoreAcrossRoster: Math.round((ts.avgScore || 0) * 100) / 100,
        totalMainsEvaluationsAcrossRoster: mainsCount,
        studentsWithActivePlan: plansCount,
      },
    });
  } catch (error) {
    console.error("getMentorAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load analytics",
    });
  }
};
