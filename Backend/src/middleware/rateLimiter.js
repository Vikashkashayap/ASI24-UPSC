/**
 * In-memory IP rate limiters for public auth endpoints.
 */

const forgotPasswordHits = new Map();

const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const FORGOT_PASSWORD_MAX = 5;

function pruneExpired(store, now) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * Max 5 forgot-password requests per hour per IP.
 */
export const forgotPasswordRateLimiter = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  let entry = forgotPasswordHits.get(ip);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + FORGOT_PASSWORD_WINDOW_MS };
    forgotPasswordHits.set(ip, entry);
  }

  if (entry.count >= FORGOT_PASSWORD_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({
      success: false,
      message: "Too many password reset requests. Please try again later.",
      retryAfter: retryAfterSec,
    });
  }

  entry.count += 1;
  if (forgotPasswordHits.size > 2000) pruneExpired(forgotPasswordHits, now);

  next();
};
