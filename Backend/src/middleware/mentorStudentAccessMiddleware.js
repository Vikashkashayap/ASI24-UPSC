import mongoose from "mongoose";
import { User } from "../models/User.js";

/**
 * After requireMentor: ensures :studentId is a student assigned to this mentor.
 * Sets req.params.id for reuse of admin student handlers.
 */
export const mentorStudentAccessMiddleware = async (req, res, next) => {
  const { studentId } = req.params;
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ success: false, message: "Invalid student id" });
  }

  const u = await User.findById(studentId).select("mentorId role").lean();
  if (!u || u.role !== "student") {
    return res.status(404).json({ success: false, message: "Student not found" });
  }
  if (!u.mentorId || String(u.mentorId) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Student not assigned to you" });
  }

  req.params.id = studentId;
  next();
};
