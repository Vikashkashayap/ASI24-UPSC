import { User } from "../models/User.js";

/**
 * When caller is a mentor, ensure every studentId belongs to their roster.
 * Admins pass through unchanged.
 */
export async function validateStudentIdsForActor(actor, studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { ok: false, message: "At least one student must be selected" };
  }
  const uniqueIds = [...new Set(studentIds.map((id) => String(id)))];

  if (actor?.role === "mentor") {
    const roster = await User.find({
      mentorId: actor._id,
      role: "student",
      _id: { $in: uniqueIds },
    }).select("_id name email");
    if (roster.length !== uniqueIds.length) {
      return {
        ok: false,
        message: "You can only assign students that are under your roster",
      };
    }
    return {
      ok: true,
      students: roster,
      uniqueIds,
      rosterIds: new Set(
        (await User.find({ mentorId: actor._id, role: "student" }).distinct("_id")).map(String)
      ),
    };
  }

  const students = await User.find({
    _id: { $in: uniqueIds },
    role: "student",
  }).select("_id name email");
  if (students.length !== uniqueIds.length) {
    return { ok: false, message: "One or more selected users are invalid or not students" };
  }
  return { ok: true, students, uniqueIds };
}

export async function getMentorRosterIdSet(mentorUserId) {
  const ids = await User.find({ mentorId: mentorUserId, role: "student" }).distinct("_id");
  return new Set(ids.map(String));
}
