/**
 * Daily copy-evaluation limit per student (IST calendar day).
 * Default: 2 evaluations / day. Admins bypass.
 * Counts DB rows (survives server restarts) — failed jobs do not consume quota.
 */

import CopyEvaluation from "../models/CopyEvaluation.js";
import { User } from "../models/User.js";

export const COPY_EVAL_DAILY_LIMIT = Math.max(
  1,
  parseInt(process.env.COPY_EVAL_DAILY_LIMIT, 10) || 2
);

/** Start of today in Asia/Kolkata as a UTC Date */
export function getIstDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  // IST = UTC+5:30 → midnight IST = 18:30 previous UTC day
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

export function getIstDayEnd(dayStart = getIstDayStart()) {
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * @returns {{ limit: number, used: number, remaining: number, locked: boolean, resetsAt: string, unlimited?: boolean, resetAt?: string | null }}
 */
export async function getCopyEvalDailyStatus(userId, role) {
  const limit = COPY_EVAL_DAILY_LIMIT;

  if (role === "admin" || role === "mentor") {
    return {
      limit,
      used: 0,
      remaining: limit,
      locked: false,
      resetsAt: getIstDayEnd().toISOString(),
      unlimited: true,
      resetAt: null,
    };
  }

  if (!userId) {
    return {
      limit,
      used: limit,
      remaining: 0,
      locked: true,
      resetsAt: getIstDayEnd().toISOString(),
      resetAt: null,
    };
  }

  const dayStart = getIstDayStart();
  let user = null;
  try {
    user = await User.findById(userId).select("copyEvalResetAt").lean();
  } catch (err) {
    console.error("Error loading user for copy eval status:", err);
  }

  const resetAtDate = user?.copyEvalResetAt ? new Date(user.copyEvalResetAt) : null;
  const effectiveStart =
    resetAtDate && !isNaN(resetAtDate.getTime()) && resetAtDate > dayStart
      ? resetAtDate
      : dayStart;

  const used = await CopyEvaluation.countDocuments({
    userId,
    createdAt: { $gte: effectiveStart },
    status: { $in: ["completed", "processing", "pending"] },
  }).setOptions({ withTrashed: true });

  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    locked: remaining <= 0,
    resetsAt: getIstDayEnd(dayStart).toISOString(),
    resetAt: resetAtDate ? resetAtDate.toISOString() : null,
  };
}

export const COPY_EVAL_DAILY_LIMIT_MESSAGE = `Daily limit reached: you can evaluate only ${COPY_EVAL_DAILY_LIMIT} answer copies per day. Try again tomorrow.`;

/**
 * Express middleware — blocks upload when daily quota exhausted.
 */
export const copyEvalRateLimit = async (req, res, next) => {
  try {
    if (req.user?.role === "admin" || req.user?.role === "mentor") {
      return next();
    }

    const userId = req.user?._id ?? req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const status = await getCopyEvalDailyStatus(userId, req.user?.role);
    if (status.locked) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((new Date(status.resetsAt).getTime() - Date.now()) / 1000)
      );
      return res.status(429).json({
        success: false,
        code: "COPY_EVAL_DAILY_LIMIT",
        message: COPY_EVAL_DAILY_LIMIT_MESSAGE,
        error: COPY_EVAL_DAILY_LIMIT_MESSAGE,
        retryAfter: retryAfterSec,
        data: status,
      });
    }

    req.copyEvalQuota = status;
    next();
  } catch (err) {
    console.error("copyEvalRateLimit error:", err);
    // Fail open would burn money — fail closed lightly with 503
    return res.status(503).json({
      success: false,
      message: "Could not verify daily evaluation limit. Please try again.",
      error: err.message,
    });
  }
};

export default copyEvalRateLimit;
