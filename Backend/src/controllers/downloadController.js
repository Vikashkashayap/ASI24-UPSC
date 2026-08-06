import { ApkDownloadEvent } from "../models/ApkDownloadEvent.js";

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    ""
  );
}

/**
 * POST /api/download
 * Body: { version, device?, userAgent?, source? }
 */
export async function trackApkDownload(req, res) {
  try {
    const version = String(req.body?.version || "").trim();
    if (!version) {
      return res.status(400).json({ success: false, message: "version is required" });
    }

    const device = String(req.body?.device || "unknown").slice(0, 120);
    const userAgent = String(
      req.body?.userAgent || req.headers["user-agent"] || ""
    ).slice(0, 512);
    const source = String(req.body?.source || "download_page").slice(0, 80);
    const ip = String(clientIp(req)).slice(0, 64);

    const event = await ApkDownloadEvent.create({
      ip,
      version,
      device,
      userAgent,
      source,
    });

    return res.status(201).json({
      success: true,
      id: event._id,
      time: event.createdAt,
    });
  } catch (err) {
    console.error("[download] track failed:", err?.message || err);
    return res.status(500).json({ success: false, message: "Failed to record download" });
  }
}
