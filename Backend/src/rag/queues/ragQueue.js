/**
 * In-process RAG job queue (BullMQ-compatible shape).
 * Uses Redis/BullMQ when REDIS_URL is set; otherwise runs inline.
 */

import { ragLogger } from "../utils/logger.js";

const jobs = new Map();
let bullQueue = null;
let worker = null;

async function tryInitBull() {
  if (bullQueue || !process.env.REDIS_URL) return null;
  try {
    const { Queue, Worker } = await import("bullmq");
    const connection = { url: process.env.REDIS_URL };
    bullQueue = new Queue("rag-jobs", { connection });
    worker = new Worker(
      "rag-jobs",
      async (job) => {
        const { runRagJob } = await import("../jobs/ingestJob.js");
        return runRagJob(job.name, job.data);
      },
      { connection }
    );
    worker.on("failed", (job, err) => {
      ragLogger.error("rag.queue.failed", { id: job?.id, error: err.message });
    });
    ragLogger.info("rag.queue.bullmqReady");
    return bullQueue;
  } catch (err) {
    ragLogger.warn("rag.queue.bullUnavailable", { error: err.message });
    return null;
  }
}

/**
 * Enqueue a named job. Returns job id + optional result (inline mode).
 */
export async function enqueueRagJob(name, data = {}, opts = {}) {
  await tryInitBull();

  if (bullQueue && !opts.inline) {
    const job = await bullQueue.add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    jobs.set(String(job.id), { id: String(job.id), name, status: "queued" });
    return { id: String(job.id), status: "queued", mode: "bullmq" };
  }

  const id = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(id, { id, name, status: "running" });
  try {
    const { runRagJob } = await import("../jobs/ingestJob.js");
    const result = await runRagJob(name, data);
    jobs.set(id, { id, name, status: "completed", result });
    return { id, status: "completed", mode: "inline", result };
  } catch (err) {
    jobs.set(id, { id, name, status: "failed", error: err.message });
    throw err;
  }
}

export function getRagJob(id) {
  return jobs.get(String(id)) || null;
}

export default { enqueueRagJob, getRagJob };
