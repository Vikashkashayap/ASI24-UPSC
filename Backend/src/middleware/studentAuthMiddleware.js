import jwt from "jsonwebtoken";
import { Student } from "../models/Student.js";
import { validateExamSlug } from "../controllers/asi24AuthController.js";

export const studentAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "asi24_student") {
      return res.status(401).json({ message: "Invalid token" });
    }
    const student = await Student.findById(decoded.id).select("-password");
    if (!student) {
      return res.status(401).json({ message: "User not found" });
    }
    req.student = student;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token failed" });
  }
};

export const requireExamSlug = (req, res, next) => {
  const slug = (req.params.examSlug || "").toLowerCase();
  if (!validateExamSlug(slug)) {
    return res.status(400).json({ message: "Invalid exam" });
  }
  next();
};
