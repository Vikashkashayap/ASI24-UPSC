/**
 * Daily UPSC Current Affairs cron: run pipeline at 6:00 AM (Asia/Kolkata).
 * Pipeline: fetch top-headlines (1 request) → relevance filter → dedupe by sourceUrl → max 5 → save.
 * Does NOT delete old current affairs.
 */

import cron from "node-cron";
import { runCurrentAffairsPipeline } from "../services/currentAffairsPipeline.js";

/** 6:00 AM every day (minute 0, hour 6) */
export const CRON_SCHEDULE = "0 6 * * *";

async function runJob() {
  if (!process.env.GNEWS_API_KEY || !process.env.OPENROUTER_API_KEY) {
    console.warn("[CurrentAffairs Cron] GNEWS_API_KEY or OPENROUTER_API_KEY not set; skipping.");
    return;
  }

  console.log("[CurrentAffairs Cron] Starting daily run...");
  try {
    const result = await runCurrentAffairsPipeline();
    console.log("[CurrentAffairs Cron] Done.", result.message);
    console.log("[CurrentAffairs Cron] created:", result.created, "skipped:", result.skipped);
  } catch (err) {
    console.error("[CurrentAffairs Cron] Pipeline error:", err.message);
  }
}

export function startCurrentAffairsCron() {
  const tz = process.env.SCHEDULER_TIMEZONE || "Asia/Kolkata";
  cron.schedule(CRON_SCHEDULE, runJob, { timezone: tz });
  console.log("[CurrentAffairs Cron] Scheduled daily at 6:00 AM (timezone:", tz, ")");
}
