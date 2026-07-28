/**
 * Queue manager — BullMQ when Redis is available, else async inline workers.
 * Never blocks HTTP upload requests.
 */

import { QUEUE_NAMES } from "../utils/constants.js";
import {
  getBullConnection,
  getRedisUrl,
  isInlineFallbackEnabled,
  pingRedis,
} from "./connection.js";

const queues = new Map();
const workers = new Map();
const handlers = new Map();
let mode = "uninitialized"; // bullmq | inline

export function getQueueMode() {
  return mode;
}

export function registerHandler(queueName, handler) {
  handlers.set(queueName, handler);
}

async function ensureBullQueue(name) {
  const connection = getBullConnection();
  if (!connection) return null;
  if (queues.has(name)) return queues.get(name);
  const { Queue } = await import("bullmq");
  const q = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  });
  queues.set(name, q);
  return q;
}

async function ensureBullWorker(name) {
  const connection = getBullConnection();
  if (!connection) return null;
  if (workers.has(name)) return workers.get(name);
  const handler = handlers.get(name);
  if (!handler) return null;
  const { Worker } = await import("bullmq");
  const worker = new Worker(
    name,
    async (job) => handler(job.data, { jobId: String(job.id), queueName: name }),
    {
      connection,
      concurrency: Number(process.env.PROCESSING_WORKER_CONCURRENCY || 2),
    }
  );
  worker.on("failed", (job, err) => {
    console.error(`[processing] ${name} job ${job?.id} failed:`, err?.message || err);
  });
  workers.set(name, worker);
  return worker;
}

async function runInline(queueName, data) {
  const handler = handlers.get(queueName);
  if (!handler) throw new Error(`No handler registered for queue: ${queueName}`);
  const jobId = `inline-${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  // Fire-and-forget for chaining; await only the first tick scheduling
  setImmediate(() => {
    handler(data, { jobId, queueName }).catch((err) => {
      console.error(`[processing:inline] ${queueName} failed:`, err?.message || err);
    });
  });
  return { id: jobId, mode: "inline", status: "queued" };
}

/**
 * Initialize all processing queues/workers.
 */
export async function initProcessingQueues() {
  const redis = await pingRedis();
  if (redis.ok) {
    mode = "bullmq";
    for (const name of Object.values(QUEUE_NAMES)) {
      await ensureBullQueue(name);
      await ensureBullWorker(name);
    }
    console.log("[processing] BullMQ workers ready");
    return { mode, redis };
  }

  if (isInlineFallbackEnabled()) {
    mode = "inline";
    console.warn(
      "[processing] Redis unavailable — using inline async workers.",
      redis.message || (getRedisUrl() ? "" : "Set REDIS_URL for BullMQ.")
    );
    return { mode, redis };
  }

  mode = "disabled";
  console.error("[processing] Queues disabled — Redis required and inline fallback off");
  return { mode, redis };
}

/**
 * Enqueue a job on a named queue.
 */
export async function enqueue(queueName, data, opts = {}) {
  if (mode === "uninitialized") {
    await initProcessingQueues();
  }

  if (mode === "bullmq") {
    const q = await ensureBullQueue(queueName);
    if (q) {
      const job = await q.add(opts.name || "process", data, {
        jobId: opts.jobId,
        priority: opts.priority,
        delay: opts.delay,
      });
      return { id: String(job.id), mode: "bullmq", status: "queued" };
    }
  }

  if (mode === "inline" || isInlineFallbackEnabled()) {
    return runInline(queueName, data);
  }

  throw new Error("Processing queues are not available");
}

export async function getQueueCounts() {
  if (mode !== "bullmq") {
    return Object.fromEntries(
      Object.values(QUEUE_NAMES).map((n) => [
        n,
        { waiting: 0, active: 0, completed: 0, failed: 0, mode: mode },
      ])
    );
  }
  const out = {};
  for (const name of Object.values(QUEUE_NAMES)) {
    const q = await ensureBullQueue(name);
    if (!q) continue;
    const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    out[name] = { ...counts, mode: "bullmq" };
  }
  return out;
}

export async function closeProcessingQueues() {
  for (const w of workers.values()) {
    await w.close().catch(() => {});
  }
  for (const q of queues.values()) {
    await q.close().catch(() => {});
  }
  workers.clear();
  queues.clear();
}
