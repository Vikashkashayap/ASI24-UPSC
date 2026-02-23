import jwt from "jsonwebtoken";
import { Student } from "../models/Student.js";

const VALID_EXAM_SLUGS = [
  "upsc", "ssc", "banking", "railway", "state-psc",
  "defence", "teaching", "police"
];

export const validateExamSlug = (slug) => {
  return typeof slug === "string" && VALID_EXAM_SLUGS.includes(slug.toLowerCase());
};

const createToken = (student) => {
  return jwt.sign(
    { id: student._id, type: "asi24_student" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const examSlug = (req.params.examSlug || "").toLowerCase();
    if (!validateExamSlug(examSlug)) {
      return res.status(400).json({ message: "Invalid exam" });
    }
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const student = await Student.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      examType: examSlug,
    });
    const token = createToken(student);
    res.status(201).json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        examType: student.examType,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const examSlug = (req.params.examSlug || "").toLowerCase();
    if (!validateExamSlug(examSlug)) {
      return res.status(400).json({ message: "Invalid exam" });
    }
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const match = await student.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = createToken(student);
    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        examType: student.examType,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Login failed" });
  }
};

export const me = async (req, res) => {
  res.json({ student: req.student });
};
