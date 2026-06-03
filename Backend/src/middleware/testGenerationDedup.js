import crypto from "crypto";

/** userId + payload hash → in-flight generate request */
const inFlight = new Map();

function buildDedupKey(userId, body) {
  const payload = {
    subjects: body?.subjects,
    topic: body?.topic,
    examType: body?.examType,
    questionCount: body?.questionCount,
    difficulty: body?.difficulty,
  };
  const hash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  return `${userId || "anon"}:${hash}`;
}

/**
 * Reject duplicate POST /generate while the same user has an identical request in progress.
 */
export function testGenerationDedup(req, res, next) {
  const key = buildDedupKey(req.user?.id, req.body);

  if (inFlight.has(key)) {
    return res.status(429).json({
      success: false,
      message: "Test generation is already in progress. Please wait for it to finish.",
    });
  }

  inFlight.set(key, Date.now());
  res.on("finish", () => inFlight.delete(key));
  res.on("close", () => {
    if (!res.writableEnded) inFlight.delete(key);
  });
  next();
}
