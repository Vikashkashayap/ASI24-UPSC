/**
 * Permanently delete trash items older than TRASH_TTL_DAYS (default 30).
 * Runs daily at 3:00 AM Asia/Kolkata.
 */
import cron from "node-cron";
import { purgeExpiredTrash } from "../services/trash.service.js";

export const TRASH_PURGE_CRON = "0 3 * * *";

async function runJob() {
  console.log("[Trash] Purging items older than retention window...");
  try {
    const result = await purgeExpiredTrash();
    console.log("[Trash] Purge done.", result);
  } catch (err) {
    console.error("[Trash] Purge error:", err?.message || err);
  }
}

export function startTrashPurgeCron() {
  const tz = process.env.SCHEDULER_TIMEZONE || "Asia/Kolkata";
  cron.schedule(TRASH_PURGE_CRON, runJob, { timezone: tz });
  console.log("[Trash] Auto-purge scheduled daily at 3:00 AM (timezone:", tz, ")");
}
