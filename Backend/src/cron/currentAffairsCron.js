/**
 * Daily cron: fetch GNews → generate UPSC current affairs with Claude → save to DB
 * Schedule: 35 14 * * * (2:35 PM daily, Asia/Kolkata) – set for live testing
 */

import cron from "node-cron";
import CurrentAffair from "../models/CurrentAffair.js";
import { slugify } from "../models/CurrentAffair.js";
import { fetchGNews } from "../services/gnewsService.js";
import { generateCurrentAffairFromNews } from "../services/aiService.js";

export const CRON_SCHEDULE = "0 6 * * *"; // 6 AM every day (Asia/Kolkata)

async function runJob() {
  if (!process.env.GNEWS_API_KEY || !process.env.OPENROUTER_API_KEY) {
    console.warn("[CurrentAffairs Cron] GNEWS_API_KEY or OPENROUTER_API_KEY not set; skipping.");
    return;
  }

  console.log("[CurrentAffairs Cron] Starting daily run...");
  let articles = [];
  try {
    articles = await fetchGNews({ max: 5 });
  } catch (err) {
    console.error("[CurrentAffairs Cron] GNews fetch failed:", err.message);
    return;
  }

  if (!articles.length) {
    console.log("[CurrentAffairs Cron] No articles returned.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const title = (article.title || "").trim();
    if (!title) continue;

    const existing = await CurrentAffair.findOne({
      title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    try {
      const structured = await generateCurrentAffairFromNews(article, article.url);
      let slug = slugify(structured.title);
      let counter = 0;
      while (await CurrentAffair.findOne({ slug })) {
        counter += 1;
        slug = `${slugify(structured.title)}-${counter}`;
      }
      await CurrentAffair.create({
        ...structured,
        slug,
        sourceUrl: structured.sourceUrl || article.url || "",
        date: new Date(),
        isActive: true,
      });
      created += 1;
    } catch (err) {
      console.error("[CurrentAffairs Cron] AI save failed for:", title, err.message);
      skipped += 1;
    }
  }

  console.log("[CurrentAffairs Cron] Done. created:", created, "skipped:", skipped);
}

export function startCurrentAffairsCron() {
  cron.schedule(CRON_SCHEDULE, runJob, { timezone: process.env.SCHEDULER_TIMEZONE || "Asia/Kolkata" });
  console.log("[CurrentAffairs Cron] Scheduled daily at 6 AM (timezone:", process.env.SCHEDULER_TIMEZONE || "Asia/Kolkata", ")");
}
