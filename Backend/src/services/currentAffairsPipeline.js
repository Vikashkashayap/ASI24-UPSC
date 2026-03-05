/**
 * UPSC Current Affairs Pipeline
 * 1. Fetch latest news (GNews top-headlines, single request to avoid 429)
 * 2. Filter UPSC relevance (LLM)
 * 3. Deduplicate by sourceUrl only
 * 4. Publish min 5, max 7 live current affairs per run
 * 5. Generate structured content and save (no deletion of old records)
 */

import CurrentAffair, { slugify } from "../models/CurrentAffair.js";
import { fetchTopHeadlines } from "./gnewsService.js";
import { isUpscRelevant, generateCurrentAffairFromNews } from "./aiService.js";

const MIN_DAILY = 5;
const MAX_DAILY = 7;

/**
 * Check if article already exists by sourceUrl
 */
async function isDuplicate(article) {
  const url = (article.url || "").trim();
  if (!url) return true;
  const exists = await CurrentAffair.findOne({ sourceUrl: url });
  return !!exists;
}

/**
 * Run full pipeline: fetch (1 request) → relevance filter → dedupe by sourceUrl → publish 5–7 → generate & save.
 * Does NOT delete any existing current affairs.
 * @returns {{ created: number, skipped: number, totalFetched: number, message: string }}
 */
export async function runCurrentAffairsPipeline() {
  const result = { created: 0, skipped: 0, totalFetched: 0, message: "" };

  let articles = [];
  try {
    articles = await fetchTopHeadlines({ max: 20 });
  } catch (err) {
    result.message = `Fetch failed: ${err.message}`;
    return result;
  }

  result.totalFetched = articles.length;
  if (!articles.length) {
    result.message = "No articles fetched from GNews.";
    return result;
  }

  const toProcess = [];
  for (const article of articles) {
    if (toProcess.length >= MAX_DAILY) break;

    const title = (article.title || "").trim();
    if (!title) continue;

    const duplicate = await isDuplicate(article);
    if (duplicate) {
      result.skipped += 1;
      continue;
    }

    try {
      const relevant = await isUpscRelevant(article);
      if (!relevant) {
        result.skipped += 1;
        continue;
      }
      toProcess.push(article);
    } catch (err) {
      console.warn("[Pipeline] Relevance check failed for:", title, err.message);
      result.skipped += 1;
    }
  }

  const finalArticles = toProcess.slice(0, MAX_DAILY);

  for (const article of finalArticles) {
    const title = (article.title || "").trim();
    try {
      const structured = await generateCurrentAffairFromNews(article, article.url || "");

      let slug = slugify(structured.title);
      let counter = 0;
      while (await CurrentAffair.findOne({ slug })) {
        counter += 1;
        slug = `${slugify(structured.title)}-${counter}`;
      }

      await CurrentAffair.create({
        title: structured.title,
        summary: structured.summary,
        keyPoints: structured.keyPoints || [],
        gsPaper: structured.gsPaper,
        prelimsFocus: structured.prelimsFocus || "",
        mainsAngle: structured.mainsAngle || "",
        keywords: structured.keywords || [],
        difficulty: structured.difficulty || "Moderate",
        sourceUrl: structured.sourceUrl || article.url || "",
        date: new Date(),
        slug,
        isActive: true,
      });
      result.created += 1;
    } catch (err) {
      console.error("[Pipeline] Save failed for:", title, err.message);
      result.skipped += 1;
    }
  }

  const rangeNote =
    result.created < MIN_DAILY
      ? ` (target ${MIN_DAILY}-${MAX_DAILY}; fewer relevant articles this run)`
      : "";
  result.message = `Fetched ${result.totalFetched}; published ${result.created} (target ${MIN_DAILY}-${MAX_DAILY})${rangeNote}, skipped ${result.skipped}.`;
  return result;
}
