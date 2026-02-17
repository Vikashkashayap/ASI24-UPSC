import { DartEntry } from "../models/DartEntry.js";

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

/**
 * Analytics for dashboard: charts and summary.
 * Returns data needed for all DART charts and performance score.
 */
export async function getDartAnalytics(enrollmentId, days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Math.max(1, Number(days) || 30));

  // Find very first DART entry for this enrollment (lifetime),
  // so that we can compute how many days the student has been
  // using DART and whether the 20-day report should be unlocked.
  const firstEntryDoc = await DartEntry.findOne({ enrollmentId })
    .sort({ date: 1 })
    .lean();

  const firstDartDate = firstEntryDoc?.date || null;

  // Inclusive day difference between today and first entry date
  const daysSinceFirstDart = firstDartDate
    ? Math.max(
        0,
        Math.floor(
          (to.setHours(0, 0, 0, 0) - new Date(firstDartDate).setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 0;

  const daysUntil20DayReport = firstDartDate
    ? Math.max(0, 20 - daysSinceFirstDart)
    : 20;

  const canDownload20DayReport = daysSinceFirstDart >= 20;

  // Now load entries only for the requested analytics range
  const entries = await getDartEntries(enrollmentId, from, new Date());
  if (entries.length === 0) {
    return getEmptyAnalytics(from, new Date(), {
      firstDartDate,
      daysSinceFirstDart,
      daysUntil20DayReport,
      canDownload20DayReport,
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
    // 20-day report unlock information
    firstDartDate,
    daysSinceFirstDart,
    daysUntil20DayReport,
    canDownload20DayReport,
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
    daysUntil20DayReport: reportMeta.daysUntil20DayReport ?? 20,
    canDownload20DayReport: reportMeta.canDownload20DayReport || false,
    todaySummary: null,
  };
}

/**
 * 20-day report: last 20 days summary for PDF.
 */
export async function getDart20DayReport(enrollmentId) {
  const to = new Date();

  // Make sure the student has at least 20 calendar days
  // since their first-ever DART entry before allowing the
  // report to be generated.
  const firstEntryDoc = await DartEntry.findOne({ enrollmentId })
    .sort({ date: 1 })
    .lean();

  if (!firstEntryDoc) {
    throw new Error("Please fill the DART form daily. 20-day report will unlock after 20 days of entries.");
  }

  const firstDate = new Date(firstEntryDoc.date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const firstDateStart = new Date(firstDate);
  firstDateStart.setHours(0, 0, 0, 0);
  const daysSinceFirstDart =
    Math.floor((todayStart.getTime() - firstDateStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (daysSinceFirstDart < 20) {
    const remaining = 20 - daysSinceFirstDart;
    throw new Error(
      `20-day report will be available after ${remaining} more day${remaining === 1 ? "" : "s"} of DART entries.`
    );
  }

  const from = new Date();
  from.setDate(from.getDate() - 20);

  const entries = await getDartEntries(enrollmentId, from, to);
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

  return {
    enrollmentId: String(enrollmentId),
    enrollmentName,
    dateRange: { from, to },
    avgStudyHours: Math.round(avgStudyHours * 10) / 10,
    avgWasteTime: Math.round(avgWasteTime * 10) / 10,
    subjectDistribution,
    consistencyPercent,
    performanceScoreAverage,
    totalDays: entries.length,
    improvementSuggestions: generateImprovementSuggestions(entries, performanceScoreAverage, consistencyPercent),
  };
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

/**
 * Build 20-day report PDF buffer from report object (shared by student + admin).
 */
export async function build20DayReportPdf(report) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;
  const lineHeight = 18;
  const margin = 50;

  const drawText = (text, x, size = 11, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(String(text).substring(0, 100), { x: margin + x, y, size, font: f, color: rgb(0.1, 0.1, 0.2) });
  };

  drawText("DART – 20 Day Performance Report", 0, 18, true);
  y -= lineHeight;
  drawText(`Student: ${report.enrollmentName}`, 0, 12);
  y -= lineHeight;
  drawText(`Enrollment ID: ${report.enrollmentId}`, 0, 12);
  y -= lineHeight;
  drawText(
    `Date Range: ${report.dateRange.from.toLocaleDateString()} - ${report.dateRange.to.toLocaleDateString()}`,
    0,
    12
  );
  y -= lineHeight * 1.5;

  drawText("Performance Summary", 0, 14, true);
  y -= lineHeight;
  drawText(`Average Study Hours: ${report.avgStudyHours}`, 0, 11);
  y -= lineHeight;
  drawText(`Average Waste Time (hrs): ${report.avgWasteTime}`, 0, 11);
  y -= lineHeight;
  drawText(`Consistency % (days with 6+ hrs study): ${report.consistencyPercent}%`, 0, 11);
  y -= lineHeight;
  drawText(`Performance Score Average: ${report.performanceScoreAverage}`, 0, 11);
  y -= lineHeight * 1.5;

  if (report.subjectDistribution && report.subjectDistribution.length > 0) {
    drawText("Subject Distribution (days studied)", 0, 14, true);
    y -= lineHeight;
    report.subjectDistribution.slice(0, 15).forEach((s) => {
      drawText(`  ${s.name}: ${s.count} days`, 0, 10);
      y -= lineHeight * 0.8;
    });
    y -= lineHeight * 0.5;
  }

  drawText("Improvement Suggestions", 0, 14, true);
  y -= lineHeight;
  (report.improvementSuggestions || []).forEach((s) => {
    const line = String(s).substring(0, 80);
    drawText(`  • ${line}`, 0, 10);
    y -= lineHeight * 0.8;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
