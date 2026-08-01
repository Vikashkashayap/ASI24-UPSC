import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/sendEmail.js";
import { getNotesFrontendOrigin } from "../utils/notesClient.js";

const PASSWORD_RESET_TTL_MINUTES = 15;
const GENERIC_FORGOT_MESSAGE =
  "If an account exists, a reset link has been sent.";

const createToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

/**
 * @param {{ name: string, email: string, password: string, phone?: string, source?: "notes"|"portal" }} params
 */
export const registerUser = async ({
  name,
  email,
  password,
  phone = "",
  source = "portal",
}) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error("Email already registered");
  }

  const forcedSource = source === "notes" ? "notes" : "portal";
  const now = new Date();

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    phone: String(phone || "").trim(),
    role: "student",
    accountType: "paid-user",
    subscriptionStatus: "inactive",
    isEmailVerified: true,
    source: forcedSource,
    isPremiumStudent: false,
    notesLastLoginAt: forcedSource === "notes" ? now : null,
  });

  if (forcedSource === "notes") {
    console.log("New Notes User", {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      source: user.source,
      isPremiumStudent: user.isPremiumStudent,
      role: user.role,
    });
  }

  const token = createToken(user);
  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  // First try to find user in database
  const user = await User.findOne({ email });
  if (user) {
    if (user.isActive === false || user.status === 'suspended') {
      throw new Error("Your account is deactivated. Please contact admin.");
    }

    // Auto-expire subscription if end date has passed (paid users only)
    if (
      user.accountType === "paid-user" &&
      user.subscriptionEndDate &&
      new Date(user.subscriptionEndDate) < new Date()
    ) {
      user.subscriptionStatus = "inactive";
      user.subscriptionPlanId = undefined;
      user.subscriptionStartDate = undefined;
      user.subscriptionEndDate = undefined;
      // Notes Website: expired portal subscribers lose global premium notes access
      if (user.source !== "notes") {
        user.isPremiumStudent = false;
      }
      await user.save();
    }

    // Notes Website self-registrations must never get portal premium access
    if (user.source === "notes") {
      if (user.isPremiumStudent) {
        user.isPremiumStudent = false;
        await user.save();
      }
    } else if (
      !user.isPremiumStudent &&
      (user.accountType === "admin-created" || user.subscriptionStatus === "active")
    ) {
      // Keep Notes premium flag in sync for MD / active portal students only
      user.isPremiumStudent = true;
      await user.save();
    }

    const match = await user.comparePassword(password);
    if (match) {
      const token = createToken(user);
      return { user, token };
    }
  }

  // If database authentication fails, check admin credentials from env vars
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
    // Create a virtual admin user object for JWT token
    const adminUser = {
      _id: "000000000000000000000000",
      name: "Admin User",
      email: adminEmail,
      role: "admin",
      mustChangePassword: false
    };
    const token = createToken(adminUser);
    return { user: adminUser, token };
  }

  throw new Error("Invalid credentials");
};

export const changeUserPassword = async (userId, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  return user;
};

export const GOOGLE_LOGIN_NOT_REGISTERED =
  "This email is not registered. Please register yourself first, then sign in with Google.";

/**
 * Sign in with Google only if the user already registered (email exists in DB).
 * Links googleId on first Google login for email/password accounts.
 */
export const loginGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value?.toLowerCase()?.trim();
  const googleId = profile.id;

  if (!email) {
    throw new Error("Google profile has no email");
  }

  const user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    throw new Error(GOOGLE_LOGIN_NOT_REGISTERED);
  }

  if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  if (user.isActive === false || user.status === "suspended") {
    throw new Error("Your account is deactivated. Please contact admin.");
  }

  const token = createToken(user);
  return { user, token };
};

/**
 * Request a password reset email. Never reveals whether the email exists.
 * @param {{ email: string }} params
 */
export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { success: true, message: GENERIC_FORGOT_MESSAGE };
  }

  if (user.isActive === false || user.status === "suspended") {
    // Same response to avoid account-status enumeration
    return { success: true, message: GENERIC_FORGOT_MESSAGE };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expiresAt;
  await user.save();

  const resetUrl = `${getNotesFrontendOrigin()}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    toEmail: user.email,
    resetUrl,
    ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
    name: user.name,
  });

  return { success: true, message: GENERIC_FORGOT_MESSAGE };
};

/**
 * Reset password using a one-time token from the email link.
 * @param {{ token: string, password: string, confirmPassword: string }} params
 */
export const resetPasswordWithToken = async ({
  token,
  password,
  confirmPassword,
}) => {
  if (!token || !password || !confirmPassword) {
    const err = new Error("Token, password and confirmPassword are required");
    err.statusCode = 400;
    throw err;
  }

  if (String(password) !== String(confirmPassword)) {
    const err = new Error("Password and confirmPassword do not match");
    err.statusCode = 400;
    throw err;
  }

  if (String(password).length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.statusCode = 400;
    throw err;
  }

  const hashedToken = hashResetToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Invalid or expired reset token");
    err.statusCode = 400;
    throw err;
  }

  user.password = password;
  user.mustChangePassword = false;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return {
    success: true,
    message: "Password updated successfully.",
  };
};
