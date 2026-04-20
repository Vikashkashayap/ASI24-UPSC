import { registerUser, loginUser, changeUserPassword } from "../services/authService.js";
import { PricingPlan } from "../models/PricingPlan.js";
import { User } from "../models/User.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = (10 ** OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const serializeUser = (user, subscriptionPlan) => ({
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
  phone: user.phone || "",
  city: user.city || "",
  attempt: user.attempt || "",
  targetYear: user.targetYear || "",
  prepStartDate: user.prepStartDate || "",
  dailyStudyHours: user.dailyStudyHours || "",
  educationBackground: user.educationBackground || "",
  isEmailVerified: Boolean(user.isEmailVerified),
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerUser({ name, email, password });
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
        phone: phone || "",
        city: city || "",
        attempt: attempt || "",
        targetYear: targetYear || "",
        prepStartDate: prepStartDate || "",
        dailyStudyHours: dailyStudyHours || "",
        educationBackground: educationBackground || "",
        accountType: "paid-user",
        subscriptionStatus: "inactive",
        isEmailVerified: false,
        otpCode: otp,
        otpExpiresAt,
        otpLastSentAt: now,
        otpVerifyAttempts: 0,
      });
    } else {
      user.name = name;
      user.password = password;
      user.phone = phone || "";
      user.city = city || "";
      user.attempt = attempt || "";
      user.targetYear = targetYear || "";
      user.prepStartDate = prepStartDate || "";
      user.dailyStudyHours = dailyStudyHours || "";
      user.educationBackground = educationBackground || "";
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

export const me = async (req, res) => {
  const user = req.user;
  // Virtual admin user has no subscription
  if (user._id === "000000000000000000000000") {
    return res.json({ user: { ...user, id: user._id } });
  }
  let subscriptionPlan = null;
  if (user.subscriptionPlanId) {
    const plan = await PricingPlan.findById(user.subscriptionPlanId)
      .select("name duration")
      .lean();
    if (plan) subscriptionPlan = plan;
  }
  const userObj = user.toObject ? user.toObject() : { ...user };
  res.json({
    user: {
      ...userObj,
      id: userObj._id || userObj.id,
      createdAt: userObj.createdAt,
      subscriptionPlan: subscriptionPlan || undefined,
      phone: userObj.phone || "",
      city: userObj.city || "",
      attempt: userObj.attempt || "",
      targetYear: userObj.targetYear || "",
      prepStartDate: userObj.prepStartDate || "",
      dailyStudyHours: userObj.dailyStudyHours || "",
      educationBackground: userObj.educationBackground || "",
      isEmailVerified: Boolean(userObj.isEmailVerified),
    },
  });
};
