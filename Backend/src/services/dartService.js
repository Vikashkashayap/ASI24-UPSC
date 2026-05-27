import { DartEntry } from "../models/DartEntry.js";

/** Local testing only: set DART_REPORT_BYPASS_15_DAY=true in .env to unlock download without 15 entries. */
const bypass15DayReportLock = () => process.env.DART_REPORT_BYPASS_15_DAY === "true";

/** Parse "HH:mm" to minutes since midnight for early wake-up check (before 6 AM) */
function isWakeUpBefore6AM(wakeUpTime) {
  if (!wakeUpTime || typeof wakeUpTime !== "string") return false;
  const [h, m] = wakeUpTime.trim().split(":").map(Number);
  if (Number.isNaN(h)) return false;
  const minutes = (h || 0) * 60 + (m || 0);
  return minutes < 6 * 60; // before 06:00
}

/**
 * Analytics engine: WasteTime formula
 * Full Time: WasteTime = 24 - (sleepHours + totalStudyHours)
 * Working Professional: WasteTime = 24 - (sleepHours + totalStudyHours + officialWorkHours)
 */
export function computeWasteTime(entry) {
  const sleep = Number(entry.sleepHours) || 0;
  const study = Number(entry.totalStudyHours) || 0;
  const work = entry.category === "working_professional" ? (Number(entry.officialWorkHours) || 0) : 0;
  const waste = 24 - (sleep + study + work);
  return Math.max(0, Math.min(24, waste));
}

/**
 * Performance score for one day:
 * (totalStudyHours × 10) + (answerWritingDone ? 20 : 0) + (newspaperRead ? 10 : 0)
 * + (wakeUp before 6AM ? 10 : 0) - (wasteTime × 5)
 */
export function computeDailyScore(entry) {
  const study = Number(entry.totalStudyHours) || 0;
  const waste = computeWasteTime(entry);
  let score =
    study * 10 +
    (entry.answerWritingDone ? 20 : 0) +
    (entry.newspaperRead ? 10 : 0) +
    (isWakeUpBefore6AM(entry.wakeUpTime) ? 10 : 0) -
    waste * 5;
  return Math.round(Math.max(0, score));
}

/** Score level label */
export function getScoreLevel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Improvement";
}

/**
 * Create or update DART entry for a day (upsert by enrollmentId + date).
 * date should be start of day in UTC or stored as date-only.
 */
export async function upsertDartEntry(enrollmentId, enrollmentName, body) {
  const date = body.date ? new Date(body.date) : new Date();
  date.setUTCHours(0, 0, 0, 0);

  const doc = {
    enrollmentId,
    enrollmentName,
    category: body.category === "working_professional" ? "working_professional" : "full_time",
    date,
    wakeUpTime: body.wakeUpTime ?? "",
    sleepHours: Number(body.sleepHours) || 0,
    officialWorkHours: Number(body.officialWorkHours) || 0,
    totalStudyHours: Number(body.totalStudyHours) || 0,
    subjectStudied: Array.isArray(body.subjectStudied) ? body.subjectStudied : [],
    chaptersCovered: body.chaptersCovered ?? "",
    newspaperRead: Boolean(body.newspaperRead),
    answerWritingDone: Boolean(body.answerWritingDone),
    emotionalStatus: body.emotionalStatus ?? "",
    physicalHealthStatus: body.physicalHealthStatus ?? "",
    targetStudyHours: Number(body.targetStudyHours) || 0,
    challengeCompleted: Boolean(body.challengeCompleted),
  };

  const entry = await DartEntry.findOneAndUpdate(
    { enrollmentId, date: doc.date },
    { $set: doc },
    { new: true, upsert: true }
  );
  return entry;
}

/** Get entries for an enrollment in a date range */
export async function getDartEntries(enrollmentId, fromDate, toDate) {
  const from = fromDate ? new Date(fromDate) : new Date(0);
  const to = toDate ? new Date(toDate) : new Date();
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  const entries = await DartEntry.find({
    enrollmentId,
    date: { $gte: from, $lte: to },
  })
    .sort({ date: 1 })
    .lean();

  return entries.map((e) => ({
    ...e,
    wasteTime: computeWasteTime(e),
    dailyScore: computeDailyScore(e),
    scoreLevel: getScoreLevel(computeDailyScore(e)),
  }));
}

/** Chart datasets for PDF report (matches dashboard analytics shape). */
export function buildChartDataFromEntries(entries) {
  if (!entries?.length) return null;

  const last7 = entries.slice(-7);
  const lastEntry = entries[entries.length - 1];
  const forPie = last7.length ? last7 : [lastEntry];
  const avg = (fn) => forPie.reduce((s, e) => s + fn(e), 0) / forPie.length;

  const dailyTimeDistribution = [
    { name: "Study", value: Math.round(avg((e) => e.totalStudyHours || 0) * 10) / 10, color: "#8b5cf6" },
    { name: "Sleep", value: Math.round(avg((e) => e.sleepHours || 0) * 10) / 10, color: "#06b6d4" },
    { name: "Work", value: Math.round(avg((e) => e.officialWorkHours || 0) * 10) / 10, color: "#f59e0b" },
    { name: "Waste", value: Math.round(avg((e) => computeWasteTime(e) || 0) * 10) / 10, color: "#64748b" },
  ].filter((d) => d.value > 0);

  const subjectCount = {};
  entries.forEach((e) => {
    (e.subjectStudied || []).forEach((s) => {
      subjectCount[s] = (subjectCount[s] || 0) + 1;
    });
  });

  const emotionalCount = {};
  entries.forEach((e) => {
    const status = e.emotionalStatus || "Not set";
    emotionalCount[status] = (emotionalCount[status] || 0) + 1;
  });

  const scores = entries.map((e) => e.dailyScore ?? computeDailyScore(e));
  const performanceScore = scores.length ? scores[scores.length - 1] : 0;
  const consistentDays = entries.filter((e) => (e.totalStudyHours || 0) >= 6).length;
  const totalStudy = entries.reduce((s, e) => s + (e.totalStudyHours || 0), 0);
  const totalWaste = entries.reduce((s, e) => s + (computeWasteTime(e) || 0), 0);

  return {
    dailyTimeDistribution: dailyTimeDistribution.length
      ? dailyTimeDistribution
      : [{ name: "No data", value: 1, color: "#64748b" }],
    sevenDayStudyTrend: last7.map((e) => ({
      day: new Date(e.date).toLocaleDateString("en-IN", { weekday: "short" }),
      studyHours: e.totalStudyHours || 0,
      targetHours: e.targetStudyHours || 0,
    })),
    targetVsActual: last7.map((e) => ({
      date: new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      target: e.targetStudyHours || 0,
      actual: e.totalStudyHours || 0,
    })),
    subjectFrequency: Object.entries(subjectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    wakeUpConsistency: last7.map((e) => ({
      date: new Date(e.date).toLocaleDateString("en-IN", { weekday: "short" }),
      wakeUpTime: e.wakeUpTime || "—",
      before6: isWakeUpBefore6AM(e.wakeUpTime),
    })),
    answerWritingWeeklyCount: last7.filter((e) => e.answerWritingDone).length,
    emotionalStatusPie: Object.entries(emotionalCount).map(([name, value]) => ({ name, value })),
    performanceScore,
    performanceScoreLevel: getScoreLevel(performanceScore),
    performanceScoreAverage: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    consistencyIndex: entries.length ? Math.round((consistentDays / entries.length) * 100) : 0,
    avgStudyHours: Math.round((totalStudy / entries.length) * 10) / 10,
    avgWasteTime: Math.round((totalWaste / entries.length) * 10) / 10,
  };
}

/**
 * Analytics for dashboard: charts and summary.
 * Returns data needed for all DART charts and performance score.
 */
export async function getDartAnalytics(enrollmentId, days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Math.max(1, Number(days) || 30));

  // We use a rolling window for the "15-day report":
  // the report unlocks only when the user has filled DART
  // for 15 distinct days in the last 15-day window.
  const firstEntryDoc = await DartEntry.findOne({ enrollmentId })
    .sort({ date: 1 })
    .lean();

  const firstDartDate = firstEntryDoc?.date || null;

  // For the "15-day report", we require the user to have filled
  // DART for 15 distinct calendar days in the last 15-day window.
  // (So if they have only ~15 entries, the 15-day PDF should unlock only at 15.)
  const last15From = new Date();
  last15From.setDate(last15From.getDate() - 14); // inclusive => 15 days including today
  last15From.setUTCHours(0, 0, 0, 0);
  const last15Entries = await getDartEntries(enrollmentId, last15From, new Date());

  const last7From = new Date();
  last7From.setDate(last7From.getDate() - 6);
  last7From.setUTCHours(0, 0, 0, 0);
  const last30From = new Date();
  last30From.setDate(last30From.getDate() - 29);
  last30From.setUTCHours(0, 0, 0, 0);

  const [last7Entries, last30Entries] = await Promise.all([
    getDartEntries(enrollmentId, last7From, new Date()),
    getDartEntries(enrollmentId, last30From, new Date()),
  ]);

  const daysSinceFirstDart = last15Entries.length; // used by frontend display "/15 days"
  const daysUntil15DayReport = Math.max(0, 15 - daysSinceFirstDart);
  const entriesCountLast7 = last7Entries.length;
  const entriesCountLast15 = last15Entries.length;
  const entriesCountLast30 = last30Entries.length;
  const canDownload7DayReport = bypass15DayReportLock() || entriesCountLast7 >= 7;
  const canDownload15DayReport = bypass15DayReportLock() || entriesCountLast15 >= 15;
  const canDownload30DayReport = bypass15DayReportLock() || entriesCountLast30 >= 30;

  // Now load entries only for the requested analytics range
  const entries = await getDartEntries(enrollmentId, from, new Date());
  if (entries.length === 0) {
    return getEmptyAnalytics(from, new Date(), {
      firstDartDate,
      daysSinceFirstDart,
      daysUntil15DayReport,
      canDownload7DayReport,
      canDownload15DayReport,
      canDownload30DayReport,
      entriesCountLast7,
      entriesCountLast15,
      entriesCountLast30,
    });
  }

  const lastEntry = entries[entries.length - 1];
  const enrollmentName = lastEntry.enrollmentName;

  // Last 7 days for trend
  const last7 = entries.slice(-7);
  const sevenDayStudyTrend = last7.map((e) => ({
    date: e.date,
    day: new Date(e.date).toLocaleDateString("en-IN", { weekday: "short" }),
    studyHours: e.totalStudyHours || 0,
    targetHours: e.targetStudyHours || 0,
  }));

  // Daily time distribution (average of last 7 or last entry)
  const forPie = last7.length ? last7 : [lastEntry];
  const avgStudy =
    forPie.reduce((s, e) => s + (e.totalStudyHours || 0), 0) / forPie.length;
  const avgSleep =
    forPie.reduce((s, e) => s + (e.sleepHours || 0), 0) / forPie.length;
  const avgWork =
    forPie.reduce((s, e) => s + (e.officialWorkHours || 0), 0) / forPie.length;
  const avgWaste =
    forPie.reduce((s, e) => s + (computeWasteTime(e) || 0), 0) / forPie.length;

  const dailyTimeDistribution = [
    { name: "Study", value: Math.round(avgStudy * 10) / 10, color: "#8b5cf6" },
    { name: "Sleep", value: Math.round(avgSleep * 10) / 10, color: "#06b6d4" },
    { name: "Work", value: Math.round(avgWork * 10) / 10, color: "#f59e0b" },
    { name: "Waste", value: Math.round(avgWaste * 10) / 10, color: "#64748b" },
  ].filter((d) => d.value > 0);

  if (dailyTimeDistribution.length === 0) {
    dailyTimeDistribution.push({ name: "No data", value: 1, color: "#64748b" });
  }

  // Target vs Actual (last 7)
  const targetVsActual = last7.map((e) => ({
    date: new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    target: e.targetStudyHours || 0,
    actual: e.totalStudyHours || 0,
  }));

  // Subject frequency (all entries in range)
  const subjectCount = {};
  entries.forEach((e) => {
    (e.subjectStudied || []).forEach((s) => {
      subjectCount[s] = (subjectCount[s] || 0) + 1;
    });
  });
  const subjectFrequency = Object.entries(subjectCount).map(([name, count]) => ({
    name,
    count,
  })).sort((a, b) => b.count - a.count);

  // Wake-up consistency: last 7 days wake-up times
  const wakeUpConsistency = last7.map((e) => ({
    date: new Date(e.date).toLocaleDateString("en-IN", { weekday: "short" }),
    wakeUpTime: e.wakeUpTime || "—",
    before6: isWakeUpBefore6AM(e.wakeUpTime),
  }));

  // Answer writing weekly count (last 7 days)
  const answerWritingWeeklyCount = last7.filter((e) => e.answerWritingDone).length;

  // Emotional status distribution (all entries)
  const emotionalCount = {};
  entries.forEach((e) => {
    const status = e.emotionalStatus || "Not set";
    emotionalCount[status] = (emotionalCount[status] || 0) + 1;
  });
  const emotionalStatusPie = Object.entries(emotionalCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Performance score (latest day and average)
  const scores = entries.map((e) => e.dailyScore ?? computeDailyScore(e));
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const latestScore = entries.length ? (entries[entries.length - 1].dailyScore ?? computeDailyScore(entries[entries.length - 1])) : 0;

  // Consistency index: (days with study >= 6 hours) / total days * 100
  const totalDays = entries.length;
  const consistentDays = entries.filter((e) => (e.totalStudyHours || 0) >= 6).length;
  const consistencyIndex = totalDays ? Math.round((consistentDays / totalDays) * 100) : 0;

  return {
    enrollmentId,
    enrollmentName,
    dateRange: { from, to },
    entriesCount: entries.length,
    // Charts data
    dailyTimeDistribution,
    sevenDayStudyTrend,
    targetVsActual,
    subjectFrequency,
    wakeUpConsistency,
    answerWritingWeeklyCount,
    emotionalStatusPie,
    // Metrics
    performanceScore: latestScore,
    performanceScoreLevel: getScoreLevel(latestScore),
    performanceScoreAverage: avgScore,
    consistencyIndex,
    // Report download meta
    firstDartDate,
    daysSinceFirstDart,
    daysUntil15DayReport,
    canDownload7DayReport,
    canDownload15DayReport,
    canDownload30DayReport,
    entriesCountLast7,
    entriesCountLast15,
    entriesCountLast30,
    // Today's summary (last entry)
    todaySummary: lastEntry,
  };
}

function getEmptyAnalytics(from, to, reportMeta = {}) {
  return {
    enrollmentId: null,
    enrollmentName: null,
    dateRange: { from, to },
    entriesCount: 0,
    dailyTimeDistribution: [{ name: "No data", value: 1, color: "#64748b" }],
    sevenDayStudyTrend: [],
    targetVsActual: [],
    subjectFrequency: [],
    wakeUpConsistency: [],
    answerWritingWeeklyCount: 0,
    emotionalStatusPie: [],
    performanceScore: 0,
    performanceScoreLevel: "Needs Improvement",
    performanceScoreAverage: 0,
    consistencyIndex: 0,
    firstDartDate: reportMeta.firstDartDate || null,
    daysSinceFirstDart: reportMeta.daysSinceFirstDart || 0,
    daysUntil15DayReport: reportMeta.daysUntil15DayReport ?? 15,
    canDownload7DayReport: reportMeta.canDownload7DayReport || false,
    canDownload15DayReport: reportMeta.canDownload15DayReport || false,
    canDownload30DayReport: reportMeta.canDownload30DayReport || false,
    entriesCountLast7: reportMeta.entriesCountLast7 ?? 0,
    entriesCountLast15: reportMeta.entriesCountLast15 ?? 0,
    entriesCountLast30: reportMeta.entriesCountLast30 ?? 0,
    todaySummary: null,
  };
}

/** Resolve report window from preset days or custom from/to (YYYY-MM-DD). */
export function parseReportDateRange({ days, from: fromStr, to: toStr }) {
  const presetDays = Number(days);
  if (presetDays === 7 || presetDays === 15 || presetDays === 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (presetDays - 1));
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);
    return {
      from,
      to,
      presetDays,
      reportTitle: `DART – ${presetDays} Day Performance Report`,
      filenameSuffix: `${presetDays}-Day`,
    };
  }

  

  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("Invalid date range. Use YYYY-MM-DD for from and to.");
    }
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);
    if (from > to) {
      throw new Error("Start date must be before or equal to end date.");
    }
    const spanMs = to.getTime() - from.getTime();
    const maxSpan = 90 * 24 * 60 * 60 * 1000;
    if (spanMs > maxSpan) {
      throw new Error("Custom range cannot exceed 90 days.");
    }
    const labelFrom = from.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const labelTo = to.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return {
      from,
      to,
      presetDays: null,
      reportTitle: `DART – Custom Report (${labelFrom} – ${labelTo})`,
      filenameSuffix: "Custom",
    };
  }

  throw new Error("Provide days (7, 15, or 30) or both from and to dates.");
}

/**
 * DART report for a date range (preset 7/15/30 days or custom from–to).
 */
export async function getDartReport(enrollmentId, rangeOptions) {
  const { from, to, presetDays, reportTitle, filenameSuffix } = parseReportDateRange(rangeOptions);

  const entriesInWindow = await getDartEntries(enrollmentId, from, to);
  if (entriesInWindow.length === 0) {
    throw new Error("No DART entries found for this period. Fill your DART form to generate a report.");
  }

  if (presetDays && !bypass15DayReportLock() && entriesInWindow.length < presetDays) {
    const remaining = presetDays - entriesInWindow.length;
    throw new Error(
      `${presetDays}-day report will be available after ${remaining} more day${remaining === 1 ? "" : "s"} of DART entries.`
    );
  }

  const entries = entriesInWindow;
  const firstEntry = entries[0];
  const enrollmentName = firstEntry?.enrollmentName || "Student";

  const totalStudy = entries.reduce((s, e) => s + (e.totalStudyHours || 0), 0);
  const totalWaste = entries.reduce((s, e) => s + (computeWasteTime(e) || 0), 0);
  const avgStudyHours = entries.length ? totalStudy / entries.length : 0;
  const avgWasteTime = entries.length ? totalWaste / entries.length : 0;

  const subjectDist = {};
  entries.forEach((e) => {
    (e.subjectStudied || []).forEach((sub) => {
      subjectDist[sub] = (subjectDist[sub] || 0) + 1;
    });
  });
  const subjectDistribution = Object.entries(subjectDist).map(([name, count]) => ({
    name,
    count,
  })).sort((a, b) => b.count - a.count);

  const consistentDays = entries.filter((e) => (e.totalStudyHours || 0) >= 6).length;
  const consistencyPercent = entries.length ? Math.round((consistentDays / entries.length) * 100) : 0;

  const scores = entries.map((e) => computeDailyScore(e));
  const performanceScoreAverage = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const charts = buildChartDataFromEntries(entries);

  return {
    enrollmentId: String(enrollmentId),
    enrollmentName,
    dateRange: { from, to },
    reportTitle,
    filenameSuffix,
    presetDays,
    avgStudyHours: charts?.avgStudyHours ?? Math.round(avgStudyHours * 10) / 10,
    avgWasteTime: charts?.avgWasteTime ?? Math.round(avgWasteTime * 10) / 10,
    subjectDistribution,
    consistencyPercent: charts?.consistencyIndex ?? consistencyPercent,
    performanceScoreAverage: charts?.performanceScoreAverage ?? performanceScoreAverage,
    totalDays: entries.length,
    charts,
    improvementSuggestions: generateImprovementSuggestions(entries, performanceScoreAverage, consistencyPercent),
  };
}

/** @deprecated Use getDartReport(enrollmentId, { days: 15 }) */
export async function getDart15DayReport(enrollmentId) {
  return getDartReport(enrollmentId, { days: 15 });
}

function generateImprovementSuggestions(entries, avgScore, consistencyPercent) {
  const suggestions = [];
  const avgStudy =
    entries.length
      ? entries.reduce((s, e) => s + (e.totalStudyHours || 0), 0) / entries.length
      : 0;

  if (avgStudy < 6) suggestions.push("Aim for at least 6 hours of study per day for better consistency.");
  if (consistencyPercent < 50) suggestions.push("Try to study 6+ hours more days per week to improve consistency.");
  if (avgScore < 60) suggestions.push("Focus on completing newspaper reading and answer writing for bonus score.");
  const withEarlyWake = entries.filter((e) => isWakeUpBefore6AM(e.wakeUpTime)).length;
  if (entries.length && withEarlyWake / entries.length < 0.5) suggestions.push("Waking up before 6 AM adds +10 to your daily score.");
  return suggestions.length ? suggestions : ["Keep up the good work. Maintain consistency."];
}

export { build15DayReportPdf } from "./dartReportPdf.js";
