/**
 * In-memory rate limit for copy evaluation uploads (per user)
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOADS = 8;

const store = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.start > WINDOW_MS) store.delete(key);
  }
};

export const copyEvalRateLimit = (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) return next();

  cleanup();
  const now = Date.now();
  let entry = store.get(userId);

  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    store.set(userId, entry);
  }

  if (entry.count >= MAX_UPLOADS) {
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded",
      error: `Maximum ${MAX_UPLOADS} copy evaluations per 15 minutes. Please try again later.`,
    });
  }

  entry.count += 1;
  next();
};

export default copyEvalRateLimit;
