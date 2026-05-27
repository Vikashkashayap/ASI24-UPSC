import {
  getDartReport,
  getDart15DayReport,
  build15DayReportPdf,
  upsertDartEntry,
  getDartEntries,
  getDartAnalytics,
  getScoreLevel,
  computeDailyScore,
} from "../services/dartService.js";

/**
 * POST /api/dart – Submit or update daily DART entry.
 * Uses logged-in user as enrollment (enrollmentId = user._id, enrollmentName = user.name).
 */
export const submitDartEntry = async (req, res) => {
  try {
    const enrollmentId = req.user._id;
    const enrollmentName = req.user.name || "Student";
    const entry = await upsertDartEntry(enrollmentId, enrollmentName, req.body);
    res.status(200).json({
      success: true,
      message: "DART entry saved successfully",
      data: {
        id: entry._id,
        date: entry.date,
        dailyScore: computeDailyScore(entry),
        scoreLevel: getScoreLevel(computeDailyScore(entry)),
      },
    });
  } catch (error) {
    console.error("DART submit error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to save DART entry" });
  }
};

/**
 * GET /api/dart/entries – List DART entries for date range.
 * Query: from, to (ISO date strings); default last 30 days.
 */
export const listDartEntries = async (req, res) => {
  try {
    const enrollmentId = req.user._id;
    const { from, to } = req.query;
    const entries = await getDartEntries(enrollmentId, from, to);
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error("DART list error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to list entries" });
  }
};

/**
 * GET /api/dart/analytics – Full analytics for dashboard (charts + score + consistency).
 * Query: days (default 30).
 */
export const getAnalytics = async (req, res) => {
  try {
    const enrollmentId = req.user._id;
    const days = req.query.days || 30;
    const analytics = await getDartAnalytics(enrollmentId, days);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("DART analytics error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to load analytics" });
  }
};

/**
 * GET /api/dart/report – Download DART report PDF.
 * Query: days=7|15|30 OR from & to (YYYY-MM-DD).
 */
export const downloadDartReport = async (req, res) => {
  try {
    const enrollmentId = req.user._id;
    const { days, from, to } = req.query;
    const report = await getDartReport(enrollmentId, { days, from, to });
    const pdfBuffer = await build15DayReportPdf(report);
    const suffix = report.filenameSuffix || "Report";
    const safeName = String(report.enrollmentName).replace(/\s+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="DART-${suffix}-Report-${safeName}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("DART report PDF error:", error);
    const status = error.message?.includes("Provide days") || error.message?.includes("Invalid") ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || "Failed to generate report" });
  }
};

/** GET /api/dart/report-15day – Legacy alias for 15-day report. */
export const download15DayReport = async (req, res) => {
  req.query.days = "15";
  return downloadDartReport(req, res);
};
