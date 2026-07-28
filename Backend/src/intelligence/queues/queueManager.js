/**
 * Intelligence queues — reuse processing queue manager pattern (BullMQ / inline).
 */

import { INTELLIGENCE_QUEUES } from "../utils/constants.js";
import {
  getBullConnection,
  getRedisUrl,
  isInlineFallbackEnabled,
  pingRedis,
} from "../../processing/queues/connection.js";

const queues = new Map();
const workers = new Map();
const handlers = new Map();
let mode = "uninitialized";

export function registerIntelligenceHandler(queueName, handler) {
  handlers.set(queueName, handler);
}

export function getIntelligenceQueueMode() {
  return mode;
}

async function ensureQueue(name) {
  const connection = getBullConnection();
  if (!connection) return null;
  if (queues.has(name)) return queues.get(name);
  const { Queue } = await import("bullmq");
  const q = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 4000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  });
  queues.set(name, q);
  return q;
}

async function ensureWorker(name) {
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
      concurrency: Number(process.env.INTEL_WORKER_CONCURRENCY || 2),
    }
  );
  worker.on("failed", (job, err) => {
    console.error(`[intelligence] ${name} failed:`, err?.message || err);
  });
  workers.set(name, worker);
  return worker;
}

async function runInline(queueName, data) {
  const handler = handlers.get(queueName);
  if (!handler) throw new Error(`No intelligence handler for ${queueName}`);
  const jobId = `inline-${queueName}-${Date.now()}`;
  setImmediate(() => {
    handler(data, { jobId, queueName }).catch((err) => {
      console.error(`[intelligence:inline] ${queueName}:`, err?.message || err);
    });
  });
  return { id: jobId, mode: "inline", status: "queued" };
}

export async function initIntelligenceQueues() {
  const redis = await pingRedis();
  if (redis.ok) {
    mode = "bullmq";
    for (const name of Object.values(INTELLIGENCE_QUEUES)) {
      await ensureQueue(name);
      await ensureWorker(name);
    }
    console.log("[intelligence] BullMQ workers ready");
    return { mode, redis };
  }
  if (isInlineFallbackEnabled()) {
    mode = "inline";
    console.warn(
      "[intelligence] Redis unavailable — inline workers.",
      redis.message || (getRedisUrl() ? "" : "Set REDIS_URL for BullMQ.")
    );
    return { mode, redis };
  }
  mode = "disabled";
  return { mode, redis };
}

export async function enqueueIntelligence(queueName, data, opts = {}) {
  if (mode === "uninitialized") await initIntelligenceQueues();
  if (mode === "bullmq") {
    const q = await ensureQueue(queueName);
    if (q) {
      const job = await q.add(opts.name || "run", data, {
        jobId: opts.jobId,
        delay: opts.delay,
      });
      return { id: String(job.id), mode: "bullmq", status: "queued" };
    }
  }
  if (mode === "inline" || isInlineFallbackEnabled()) {
    return runInline(queueName, data);
  }
  throw new Error("Intelligence queues unavailable");
}
