/**
 * Sync + embed the full notes.mentorsdaily.com catalog into Mongo + Qdrant,
 * then promote each chapter into Knowledge Base (KbDocument + intelligence).
 */

import { getFullCatalog, NOTES_BASE_URL } from "../../config/notesCatalog.js";
import { syncChapterFromUrl } from "./notesSync.service.js";
import SourceUrl from "../../models/SourceUrl.js";
import { promoteWebsiteChapterToKb } from "./promoteWebsiteNotesToKb.service.js";

/** In-memory job status (single active sync). */
const job = {
  running: false,
  startedAt: null,
  finishedAt: null,
  total: 0,
  done: 0,
  failed: 0,
  skipped: 0,
  current: null,
  results: [],
  error: null,
  force: false,
  subjects: [],
  chunking: null,
  topicsDone: 0,
  topicsTotal: 0,
  currentTopic: null,
};

export function getWebsiteNotesSyncStatus() {
  return {
    running: job.running,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    total: job.total,
    done: job.done,
    failed: job.failed,
    skipped: job.skipped,
    current: job.current,
    results: job.results.slice(-40),
    error: job.error,
    baseUrl: NOTES_BASE_URL,
    force: Boolean(job.force),
    subjects: job.subjects || [],
    chunking: job.chunking || null,
    topicsDone: job.topicsDone || 0,
    topicsTotal: job.topicsTotal || 0,
    currentTopic: job.currentTopic || null,
  };
}

function normalizeChunking(raw) {
  if (!raw || typeof raw !== "object") return null;
  const minWords = raw.minWords != null ? Number(raw.minWords) : undefined;
  const maxWords = raw.maxWords != null ? Number(raw.maxWords) : undefined;
  const overlapWords = raw.overlapWords != null ? Number(raw.overlapWords) : undefined;
  const out = {};
  if (Number.isFinite(minWords) && minWords > 0) out.minWords = Math.floor(minWords);
  if (Number.isFinite(maxWords) && maxWords > 0) out.maxWords = Math.floor(maxWords);
  if (Number.isFinite(overlapWords) && overlapWords >= 0) {
    out.overlapWords = Math.floor(overlapWords);
  }
  if (out.minWords && out.maxWords && out.minWords > out.maxWords) {
    const t = out.minWords;
    out.minWords = out.maxWords;
    out.maxWords = t;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Sync all catalog chapters from notes.mentorsdaily.com (fetch → chunk → embed → KB).
 * Skips chapters already synced+indexed unless force=true.
 * @param {{ subjects?: string[], force?: boolean, createdBy?: unknown, chunking?: { minWords?: number, maxWords?: number, overlapWords?: number } }} [opts]
 */
export async function syncAllWebsiteNotes(opts = {}) {
  if (job.running) {
    const err = new Error("Website notes sync already running");
    err.statusCode = 409;
    throw err;
  }

  const catalog = getFullCatalog();
  const subjectFilter = (opts.subjects || [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const force = Boolean(opts.force);
  const chunking = normalizeChunking(opts.chunking);
  const chapters = catalog.flatMap((group) =>
    group.chapters
      .filter((ch) => !subjectFilter.length || subjectFilter.includes(group.subject))
      .map((ch) => ({
        subject: group.subject,
        title: ch.title,
        slug: ch.slug,
        url: ch.url || `${NOTES_BASE_URL}/${ch.slug}`,
        expectedTopicCount: ch.expectedTopicCount || 0,
      }))
  );

  job.running = true;
  job.startedAt = new Date().toISOString();
  job.finishedAt = null;
  job.total = chapters.length;
  job.done = 0;
  job.failed = 0;
  job.skipped = 0;
  job.current = null;
  job.results = [];
  job.error = null;
  job.force = force;
  job.subjects = subjectFilter;
  job.chunking = chunking;
  job.topicsDone = 0;
  job.topicsTotal = chapters.reduce(
    (sum, ch) => sum + (ch.expectedTopicCount || 0),
    0
  );
  job.currentTopic = null;
  job.topicsDoneBase = 0;

  console.log(
    `[notesWebsite] Starting sync of ${chapters.length} chapters from ${NOTES_BASE_URL}` +
      (subjectFilter.length ? ` [subjects: ${subjectFilter.join(", ")}]` : "") +
      (force ? " [force update — full subject refresh]" : "") +
      (chunking ? ` [chunking ${JSON.stringify(chunking)}]` : "")
  );

  try {
    for (const ch of chapters) {
      job.current = { subject: ch.subject, title: ch.title, url: ch.url };
      const urlKey = ch.url.replace(/\/$/, "");
      try {
        const existing = await SourceUrl.findOne({
          $or: [{ url: urlKey }, { url: `${urlKey}/` }],
        }).lean();

        if (
          !force &&
          existing?.status === "synced" &&
          existing?.embeddingStatus === "indexed" &&
          (existing?.chunkCount || 0) > 0
        ) {
          let kb = null;
          try {
            kb = await promoteWebsiteChapterToKb(existing._id, { userId: opts.createdBy });
          } catch (kbErr) {
            console.warn(`[notesWebsite] KB promote skip-path:`, kbErr?.message || kbErr);
          }
          job.skipped += 1;
          job.done += 1;
          job.topicsDoneBase =
            (job.topicsDoneBase || 0) + (existing.topicCount || ch.expectedTopicCount || 0);
          job.topicsDone = job.topicsDoneBase;
          job.results.push({
            ok: true,
            skipped: true,
            subject: ch.subject,
            title: ch.title,
            url: ch.url,
            topicCount: existing.topicCount,
            chunkCount: existing.chunkCount,
            kbDocumentId: kb?.documentId,
          });
          console.log(
            `[notesWebsite] SKIP+KB ${ch.subject}/${ch.title}: ${existing.chunkCount} chunks → KB indexed ${kb?.indexed ?? 0}`
          );
          continue;
        }

        const result = await syncChapterFromUrl({
          url: ch.url,
          subject: ch.subject,
          title: ch.title,
          createdBy: opts.createdBy,
          chunking: chunking || undefined,
          onProgress: ({ topicIndex, topicTotal, topicTitle }) => {
            job.currentTopic = {
              subject: ch.subject,
              chapter: ch.title,
              title: topicTitle,
              index: topicIndex,
              total: topicTotal,
            };
            job.topicsDone = (job.topicsDoneBase || 0) + topicIndex;
            if (topicTotal > 0) {
              job.topicsTotal =
                (job.topicsDoneBase || 0) +
                topicTotal +
                chapters
                  .slice(job.done + 1)
                  .reduce((s, x) => s + (x.expectedTopicCount || 0), 0);
            }
          },
        });
        job.topicsDoneBase = (job.topicsDoneBase || 0) + (result.topicCount || 0);
        job.topicsDone = job.topicsDoneBase;
        job.currentTopic = null;

        let kb = null;
        try {
          kb = await promoteWebsiteChapterToKb(result.chapterId, { userId: opts.createdBy });
        } catch (kbErr) {
          console.warn(`[notesWebsite] KB promote failed:`, kbErr?.message || kbErr);
        }

        job.done += 1;
        job.results.push({
          ok: true,
          subject: ch.subject,
          title: ch.title,
          url: ch.url,
          topicCount: result.topicCount,
          chunkCount: result.chunkCount,
          indexed: result.embedding?.indexed ?? 0,
          kbDocumentId: kb?.documentId,
          kbIndexed: kb?.indexed ?? 0,
        });
        console.log(
          `[notesWebsite] OK ${ch.subject}/${ch.title}: ${result.topicCount} topics → KB`
        );
      } catch (err) {
        job.failed += 1;
        job.done += 1;
        job.results.push({
          ok: false,
          subject: ch.subject,
          title: ch.title,
          url: ch.url,
          error: err?.message || String(err),
        });
        console.warn(`[notesWebsite] FAIL ${ch.subject}/${ch.title}:`, err?.message || err);
      }
    }
  } catch (err) {
    job.error = err?.message || String(err);
    throw err;
  } finally {
    job.running = false;
    job.current = null;
    job.finishedAt = new Date().toISOString();
    console.log(
      `[notesWebsite] Finished: ${job.done}/${job.total} (failed ${job.failed}, skipped ${job.skipped})`
    );
  }

  return getWebsiteNotesSyncStatus();
}

export function startWebsiteNotesSyncBackground(opts = {}) {
  if (job.running) {
    const err = new Error("Website notes sync already running");
    err.statusCode = 409;
    throw err;
  }
  setImmediate(() => {
    syncAllWebsiteNotes(opts).catch((err) => {
      job.error = err?.message || String(err);
      job.running = false;
      job.finishedAt = new Date().toISOString();
      console.error("[notesWebsite] background sync crashed:", err);
    });
  });
  return {
    started: true,
    message: "Syncing notes.mentorsdaily.com → Knowledge Base in background",
    status: getWebsiteNotesSyncStatus(),
  };
}

export default {
  syncAllWebsiteNotes,
  startWebsiteNotesSyncBackground,
  getWebsiteNotesSyncStatus,
};
