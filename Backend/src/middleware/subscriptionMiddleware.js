import { authMiddleware } from "./authMiddleware.js";
import { User } from "../models/User.js";

/**
 * Subscription guard for student-facing APIs.
 *
 * Rules:
 * - Admin users are always allowed.
 * - Admin-created students (accountType === "admin-created") bypass payment.
 * - Paid users must have subscriptionStatus === "active".
 * - If subscriptionEndDate < now, mark subscription inactive and redirect to /pricing.
 */
const subscriptionCheck = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Admins, agents, and human mentors are never blocked by subscription checks
  if (user.role === "admin" || user.role === "agent" || user.role === "mentor") {
    return next();
  }

  // Admin-created users bypass payment
  if (user.accountType === "admin-created") {
    return next();
  }

  // Paid-user: check expiry; if expired, mark inactive and redirect
  if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
    try {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: "inactive",
        subscriptionPlanId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      });
    } catch (err) {
      console.error("Subscription expiry update failed:", err);
    }
    return res.status(402).json({
      success: false,
      message: "Your subscription has expired",
      code: "SUBSCRIPTION_EXPIRED",
      redirectTo: "/pricing",
    });
  }

  if (user.subscriptionStatus === "active") {
    return next();
  }

  return res.status(402).json({
    success: false,
    message: "Active subscription required",
    code: "SUBSCRIPTION_REQUIRED",
    redirectTo: "/pricing",
  });
};

export const requireActiveSubscription = [authMiddleware, subscriptionCheck];

