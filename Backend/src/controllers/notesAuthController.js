import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const createToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const serializeNotesUser = (user) => {
  const source = user.source === "notes" ? "notes" : user.source || "portal";
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    source,
    // Notes-origin accounts are never portal "Premium Student"
    isPremiumStudent: source === "notes" ? false : Boolean(user.isPremiumStudent),
    accountType: user.accountType,
    subscriptionStatus: user.subscriptionStatus,
    isEmailVerified: Boolean(user.isEmailVerified),
    notesLastLoginAt: user.notesLastLoginAt || null,
  };
};

/**
 * Register from the public Notes Website into the shared users collection.
 * source = "notes", isPremiumStudent = false
 */
export const registerNotesUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login with the same credentials.",
      });
    }

    const now = new Date();
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: String(req.body.phone || req.body.mobile || "").trim(),
      role: "student",
      source: "notes",
      isPremiumStudent: false,
      accountType: "paid-user",
      subscriptionStatus: "inactive",
      isEmailVerified: true,
      notesLastLoginAt: now,
    });

    console.log("New Notes User", {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      source: user.source,
      isPremiumStudent: user.isPremiumStudent,
      role: user.role,
    });

    const token = createToken(user);
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: serializeNotesUser(user),
      token,
    });
  } catch (err) {
    console.error("registerNotesUser:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Registration failed",
    });
  }
};

/**
 * Login for Notes Website — same credentials as Student Portal (shared users collection).
 */
export const loginNotesUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (user.isActive === false || user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact admin.",
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Notes-origin users stay freemium (buy Notes plan). Portal MD / paid only.
    if (user.source === "notes") {
      user.isPremiumStudent = false;
    } else if (
      !user.isPremiumStudent &&
      (user.accountType === "admin-created" || user.subscriptionStatus === "active")
    ) {
      user.isPremiumStudent = true;
    }

    // Track Notes Website activity so admin "Registered Student List" can show them
    user.notesLastLoginAt = new Date();
    await user.save();

    const token = createToken(user);
    return res.json({
      success: true,
      message: "Login successful",
      user: serializeNotesUser(user),
      token,
    });
  } catch (err) {
    console.error("loginNotesUser:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};

export const getNotesMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: serializeNotesUser(req.user),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
