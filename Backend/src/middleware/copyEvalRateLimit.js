/**
 * Per-user rate limit for vision copy evaluation uploads (expensive AI calls).
 */

const WINDOW_MS =
  parseInt(process.env.COPY_EVAL_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;
const MAX_UPLOADS =
  parseInt(process.env.COPY_EVAL_RATE_LIMIT_MAX, 10) || 10;

/** @type {Map<string, { count: number, resetAt: number }>} */
const hits = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [userId, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(userId);
  }
}

export const copyEvalRateLimit = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }

  const userId = req.user?._id?.toString();
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const now = Date.now();
  let entry = hits.get(userId);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(userId, entry);
  }

  if (entry.count >= MAX_UPLOADS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({
      success: false,
      message: "Copy evaluation upload limit reached",
      error: `Maximum ${MAX_UPLOADS} evaluations per hour. Try again in ${retryAfterSec} seconds.`,
      retryAfter: retryAfterSec,
    });
  }

  entry.count += 1;
  if (hits.size > 500) pruneExpired();

  next();
};
