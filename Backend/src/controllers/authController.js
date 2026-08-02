import {
  registerUser,
  loginUser,
  changeUserPassword,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/authService.js";
import { PricingPlan } from "../models/PricingPlan.js";
import { User } from "../models/User.js";
import { sendOtpEmail } from "../utils/sendEmail.js";
import {
  isNotesWebsiteRequest,
  resolveRegistrationSource,
} from "../utils/notesClient.js";

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = (10 ** OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const serializeUser = (user, subscriptionPlan) => {
  const source = user.source === "notes" ? "notes" : user.source || "portal";
  return {
    id: user._id,
    createdAt: user.createdAt,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    accountType: user.accountType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlanId: user.subscriptionPlanId,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    subscriptionPlan: subscriptionPlan || undefined,
    source,
    // Notes-origin accounts are never portal "Premium Student"
    isPremiumStudent: source === "notes" ? false : Boolean(user.isPremiumStudent),
    phone: user.phone || "",
    mobile: user.phone || "",
    city: user.city || "",
    gender: user.gender || "",
    attempt: user.attempt || "",
    targetYear: user.targetYear || "",
    prepStartDate: user.prepStartDate || "",
    dailyStudyHours: user.dailyStudyHours || "",
    educationBackground: user.educationBackground || "",
    isEmailVerified: Boolean(user.isEmailVerified),
    notesLastLoginAt: user.notesLastLoginAt || null,
  };
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Never trust body.source — force from Notes Website Origin/Referer
    const source = resolveRegistrationSource(req);
    const phone = req.body.phone || req.body.mobile || "";

    const { user, token } = await registerUser({
      name,
      email,
      password,
      phone,
      source,
    });

    res.status(201).json({ user: serializeUser(user), token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const registerSendOtp = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      city,
      attempt,
      targetYear,
      prepStartDate,
      dailyStudyHours,
      educationBackground,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const now = new Date();
    const otp = generateOtp();
    const otpExpiresAt = new Date(now.getTime() + (OTP_TTL_MINUTES * 60 * 1000));
    const source = resolveRegistrationSource(req);
    const mobile = phone || req.body.mobile || "";

    let user = await User.findOne({ email: normalizedEmail });

    if (user?.isEmailVerified) {
      return res.status(400).json({ message: "Email already registered. Please login." });
    }

    if (user?.otpLastSentAt) {
      const elapsedSeconds = Math.floor((now.getTime() - new Date(user.otpLastSentAt).getTime()) / 1000);
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds}s before requesting a new OTP`,
          retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        });
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        password,
        phone: mobile,
        city: city || "",
        attempt: attempt || "",
        targetYear: targetYear || "",
        prepStartDate: prepStartDate || "",
        dailyStudyHours: dailyStudyHours || "",
        educationBackground: educationBackground || "",
        accountType: "paid-user",
        subscriptionStatus: "inactive",
        isEmailVerified: false,
        source,
        isPremiumStudent: false,
        notesLastLoginAt: source === "notes" ? now : null,
        otpCode: otp,
        otpExpiresAt,
        otpLastSentAt: now,
        otpVerifyAttempts: 0,
      });
      if (source === "notes") {
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
    } else {
      user.name = name;
      user.password = password;
      user.phone = mobile;
      user.city = city || "";
      user.attempt = attempt || "";
      user.targetYear = targetYear || "";
      user.prepStartDate = prepStartDate || "";
      user.dailyStudyHours = dailyStudyHours || "";
      user.educationBackground = educationBackground || "";
      // Force source from request origin (never trust body)
      user.source = source;
      if (source === "notes") {
        user.isPremiumStudent = false;
        user.notesLastLoginAt = user.notesLastLoginAt || now;
      }
      user.otpCode = otp;
      user.otpExpiresAt = otpExpiresAt;
      user.otpLastSentAt = now;
      user.otpVerifyAttempts = 0;
      user.isEmailVerified = false;
      await user.save();
    }

    await sendOtpEmail({
      toEmail: normalizedEmail,
      otp,
      ttlMinutes: OTP_TTL_MINUTES,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to send OTP" });
  }
};

export const resendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found for this email" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email is already verified" });

    const now = new Date();
    if (user.otpLastSentAt) {
      const elapsedSeconds = Math.floor((now.getTime() - new Date(user.otpLastSentAt).getTime()) / 1000);
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds}s before requesting a new OTP`,
          retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        });
      }
    }

    const otp = generateOtp();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(now.getTime() + (OTP_TTL_MINUTES * 60 * 1000));
    user.otpLastSentAt = now;
    user.otpVerifyAttempts = 0;
    await user.save();

    await sendOtpEmail({
      toEmail: normalizedEmail,
      otp,
      ttlMinutes: OTP_TTL_MINUTES,
    });

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to resend OTP" });
  }
};

export const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found for this email" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified. Please login." });

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No active OTP. Please request OTP again." });
    }

    if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    if ((user.otpVerifyAttempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ message: "Maximum OTP attempts reached. Please request a new OTP." });
    }

    if (String(user.otpCode) !== String(otp).trim()) {
      user.otpVerifyAttempts = (user.otpVerifyAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isEmailVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpLastSentAt = null;
    user.otpVerifyAttempts = 0;
    await user.save();

    const { token } = await loginUser({ email: normalizedEmail, password: req.body.password || user.password });
    return res.status(200).json({
      success: true,
      message: "Registration successful",
      user: serializeUser(user),
      token,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "OTP verification failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });

    // Notes Website login: stamp last login for notes-registered users only
    // Do NOT convert portal users to source=notes
    if (
      user &&
      user._id !== "000000000000000000000000" &&
      isNotesWebsiteRequest(req) &&
      user.source === "notes"
    ) {
      try {
        await User.findByIdAndUpdate(user._id, { notesLastLoginAt: new Date() });
        user.notesLastLoginAt = new Date();
      } catch (e) {
        console.error("notesLastLoginAt update failed:", e?.message || e);
      }
    }

    let subscriptionPlan = null;
    if (user.subscriptionPlanId) {
      const plan = await PricingPlan.findById(user.subscriptionPlanId)
        .select("name duration")
        .lean();
      if (plan) subscriptionPlan = plan;
    }
    res.json({ user: serializeUser(user, subscriptionPlan), token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    await changeUserPassword(req.user._id, newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/** POST /api/auth/forgot-password */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await requestPasswordReset({ email, req });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to process password reset request",
    });
  }
};

/** POST /api/auth/reset-password */
export const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    const result = await resetPasswordWithToken({
      token,
      password,
      confirmPassword,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

export const me = async (req, res) => {
  const user = req.user;
  // Virtual admin user has no subscription
  if (user._id === "000000000000000000000000") {
    return res.json({ user: { ...user, id: user._id } });
  }

  // Self-heal: notes-origin accounts must never keep portal premium flag
  if (user.source === "notes" && user.isPremiumStudent) {
    user.isPremiumStudent = false;
    try {
      await user.save();
    } catch (e) {
      console.error("me: clear isPremiumStudent failed:", e?.message || e);
    }
  }

  let subscriptionPlan = null;
  if (user.subscriptionPlanId) {
    const plan = await PricingPlan.findById(user.subscriptionPlanId)
      .select("name duration")
      .lean();
    if (plan) subscriptionPlan = plan;
  }

  return res.json({ user: serializeUser(user, subscriptionPlan) });
};

const ALLOWED_GENDERS = new Set(["", "Male", "Female", "Other"]);

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId || userId === "000000000000000000000000") {
      return res.status(403).json({ message: "Profile update not available for this account" });
    }

    const {
      name,
      phone,
      city,
      gender,
      attempt,
      targetYear,
      prepStartDate,
      dailyStudyHours,
      educationBackground,
    } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Full name is required" });
      }
      user.name = trimmed;
    }
    if (phone !== undefined) user.phone = String(phone).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (gender !== undefined) {
      const nextGender = String(gender).trim();
      if (!ALLOWED_GENDERS.has(nextGender)) {
        return res.status(400).json({ message: "Invalid gender value" });
      }
      user.gender = nextGender;
    }
    if (attempt !== undefined) user.attempt = String(attempt).trim();
    if (targetYear !== undefined) user.targetYear = String(targetYear).trim();
    if (prepStartDate !== undefined) user.prepStartDate = String(prepStartDate).trim();
    if (dailyStudyHours !== undefined) user.dailyStudyHours = String(dailyStudyHours).trim();
    if (educationBackground !== undefined) {
      user.educationBackground = String(educationBackground).trim();
    }

    await user.save();

    let subscriptionPlan = null;
    if (user.subscriptionPlanId) {
      const plan = await PricingPlan.findById(user.subscriptionPlanId)
        .select("name duration")
        .lean();
      if (plan) subscriptionPlan = plan;
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: serializeUser(user, subscriptionPlan),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update profile" });
  }
};
