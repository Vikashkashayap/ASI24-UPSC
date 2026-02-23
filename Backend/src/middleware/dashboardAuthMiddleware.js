import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Student } from "../models/Student.js";

/**
 * Dashboard auth: accept either original User JWT or ASI24 student JWT (examType upsc).
 * Sets req.user so all dashboard APIs (performance, tests, copy-evaluation, etc.)
 * store and return data under that user/student ID — new ASI24 UPSC registrations
 * get their own data under their name.
 */
export const dashboardAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ASI24 student token (from /upsc/login): allow only UPSC so they use existing dashboard
    if (decoded.type === "asi24_student") {
      const student = await Student.findById(decoded.id).select("-password");
      if (!student) {
        return res.status(401).json({ message: "User not found" });
      }
      if (student.examType !== "upsc") {
        return res.status(403).json({ message: "Use your exam dashboard" });
      }
      req.user = {
        _id: student._id,
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: "student",
      };
      return next();
    }

    // Original User token (from /login)
    if (decoded.id === "000000000000000000000000") {
      req.user = {
        _id: "000000000000000000000000",
        name: "Admin User",
        email: process.env.ADMIN_EMAIL,
        role: "admin",
      };
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token failed" });
  }
};
