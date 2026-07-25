import Test from "../models/Test.js";

const TZ = "Asia/Kolkata";

/**
 * Calendar day bounds in Asia/Kolkata (IST).
 * @returns {{ dateKey: string, start: Date, end: Date }}
 */
export function getAsiaKolkataDayBounds(now = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const start = new Date(`${dateKey}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dateKey, start, end };
}

/** Next midnight IST as ISO string (when lock lifts). */
export function getNextIstMidnightIso(now = new Date()) {
  const { end } = getAsiaKolkataDayBounds(now);
  return end.toISOString();
}

/**
 * Practice / Prelims generator tests only (not mocks, not admin-assigned practice).
 */
function practiceTestFilter(userId, start, end) {
  return {
    userId,
    createdAt: { $gte: start, $lt: end },
    $and: [
      { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
      { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
    ],
  };
}

/**
 * Whether this user may generate another Prelims practice test today (IST).
 * Admins / agents / mentors are never locked.
 */
export async function getPrelimsDailyLockStatus(userId, role) {
  const unlocksAt = getNextIstMidnightIso();
  const { dateKey, start, end } = getAsiaKolkataDayBounds();

  if (role === "admin" || role === "agent" || role === "mentor") {
    return {
      locked: false,
      usedToday: false,
      dateKey,
      unlocksAt,
      todayTest: null,
      bypass: true,
    };
  }

  if (!userId) {
    return {
      locked: false,
      usedToday: false,
      dateKey,
      unlocksAt,
      todayTest: null,
      bypass: false,
    };
  }

  const todayTest = await Test.findOne(practiceTestFilter(userId, start, end))
    .sort({ createdAt: -1 })
    .select("_id topic subject createdAt isSubmitted")
    .lean();

  if (!todayTest) {
    return {
      locked: false,
      usedToday: false,
      dateKey,
      unlocksAt,
      todayTest: null,
      bypass: false,
    };
  }

  return {
    locked: true,
    usedToday: true,
    dateKey,
    unlocksAt,
    todayTest: {
      _id: String(todayTest._id),
      topic: todayTest.topic,
      subject: todayTest.subject,
      createdAt: todayTest.createdAt,
      isSubmitted: Boolean(todayTest.isSubmitted),
    },
    bypass: false,
  };
}

export const PRELIMS_DAILY_LIMIT_MESSAGE =
  "You've already taken today's Practice Test. You can generate a new test after midnight (IST) tomorrow.";
