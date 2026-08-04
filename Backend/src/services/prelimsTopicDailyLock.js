import Test from "../models/Test.js";

const TZ = "Asia/Kolkata";

/** Max practice tests a student may generate per IST calendar day. */
export const PRELIMS_DAILY_TEST_LIMIT = 4;

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

const notMockOrAssigned = [
  { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
  { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
  { $or: [{ syllabusModuleTargetId: null }, { syllabusModuleTargetId: { $exists: false } }] },
];

/**
 * Count only Practice Test generator attempts (POST /api/tests/generate).
 * Excludes chapter practice, module finals, assigned practice, and prelims mocks.
 *
 * New docs are tagged with isPracticeGenerator: true.
 * Legacy docs (before the flag) are matched by shape: 5/10/20Q, no timer,
 * no mock/assigned/module linkage, and not a Module Final / Full Mock topic.
 */
function practiceTestFilter(userId, start, end) {
  return {
    userId,
    createdAt: { $gte: start, $lt: end },
    $or: [
      // Explicitly tagged Practice Test page generations
      { isPracticeGenerator: true },
      // Legacy practice-generator docs (created before isPracticeGenerator existed)
      {
        $and: [
          {
            $or: [
              { isPracticeGenerator: { $exists: false } },
              { isPracticeGenerator: false },
            ],
          },
          { totalQuestions: { $in: [5, 10, 20] } },
          {
            $or: [
              { durationMinutes: null },
              { durationMinutes: { $exists: false } },
            ],
          },
          { topic: { $not: /module\s*final|full\s*mock/i } },
          ...notMockOrAssigned,
        ],
      },
    ],
  };
}

/**
 * Whether this user may generate another Prelims practice test today (IST).
 * Limit: PRELIMS_DAILY_TEST_LIMIT per calendar day. Resets at midnight IST.
 * Admins / agents / mentors are never locked.
 */
export async function getPrelimsDailyLockStatus(userId, role) {
  const unlocksAt = getNextIstMidnightIso();
  const { dateKey, start, end } = getAsiaKolkataDayBounds();
  const limit = PRELIMS_DAILY_TEST_LIMIT;

  if (role === "admin" || role === "agent" || role === "mentor") {
    return {
      locked: false,
      usedToday: false,
      usedCount: 0,
      remaining: limit,
      limit,
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
      usedCount: 0,
      remaining: limit,
      limit,
      dateKey,
      unlocksAt,
      todayTest: null,
      bypass: false,
    };
  }

  const filter = practiceTestFilter(userId, start, end);
  const [usedCount, todayTest] = await Promise.all([
    Test.countDocuments(filter),
    Test.findOne(filter)
      .sort({ createdAt: -1 })
      .select("_id topic subject createdAt isSubmitted")
      .lean(),
  ]);

  const remaining = Math.max(0, limit - usedCount);
  const locked = usedCount >= limit;

  return {
    locked,
    usedToday: usedCount > 0,
    usedCount,
    remaining,
    limit,
    dateKey,
    unlocksAt,
    todayTest: todayTest
      ? {
          _id: String(todayTest._id),
          topic: todayTest.topic,
          subject: todayTest.subject,
          createdAt: todayTest.createdAt,
          isSubmitted: Boolean(todayTest.isSubmitted),
        }
      : null,
    bypass: false,
  };
}

export const PRELIMS_DAILY_LIMIT_MESSAGE =
  `You've used all ${PRELIMS_DAILY_TEST_LIMIT} Practice Tests for today. You can generate again after midnight (IST) tomorrow.`;
