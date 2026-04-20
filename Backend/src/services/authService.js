import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const createToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("Email already registered");
  }
  // Self-registered users are treated as paid users who must purchase a plan.
  const user = await User.create({
    name,
    email,
    password,
    accountType: "paid-user",
    subscriptionStatus: "inactive",
  });
  const token = createToken(user);
  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  // First try to find user in database
  const user = await User.findOne({ email });
  if (user) {
    if (!user.googleId && user.isEmailVerified === false) {
      throw new Error("Please verify your email with OTP before login.");
    }

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

/**
 * Find or create user from Google profile (for OAuth login/register).
 * Returns { user, token }.
 */
export const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  const name = profile.displayName || profile.name?.givenName || email?.split("@")[0] || "User";
  const googleId = profile.id;

  if (!email) {
    throw new Error("Google profile has no email");
  }

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    user = await User.create({
      name,
      email,
      googleId,
      accountType: "paid-user",
      subscriptionStatus: "inactive",
      isEmailVerified: true,
    });
  }

  if (user.isActive === false || user.status === "suspended") {
    throw new Error("Your account is deactivated. Please contact admin.");
  }

  const token = createToken(user);
  return { user, token };
};
