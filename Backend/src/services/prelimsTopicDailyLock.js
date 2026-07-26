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

/** Next midnight IST as ISO string. */
export function getNextIstMidnightIso(now = new Date()) {
  const { end } = getAsiaKolkataDayBounds(now);
  return end.toISOString();
}

/**
 * Daily lock disabled — users may generate unlimited Prelims practice tests.
 * Kept for API compatibility with /prelims-daily-status.
 */
export async function getPrelimsDailyLockStatus(_userId, _role) {
  const unlocksAt = getNextIstMidnightIso();
  const { dateKey } = getAsiaKolkataDayBounds();

  return {
    locked: false,
    usedToday: false,
    dateKey,
    unlocksAt,
    todayTest: null,
    bypass: true,
  };
}

export const PRELIMS_DAILY_LIMIT_MESSAGE =
  "You've already taken today's Practice Test. You can generate a new test after midnight (IST) tomorrow.";
