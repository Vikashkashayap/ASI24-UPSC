/**
 * In-memory AI job queue stats (lightweight — no Redis required).
 */

const jobs = new Map();
const MAX_JOBS = 500;
let maxConcurrency = Number(process.env.AI_MAX_CONCURRENCY) || 3;

export function createJobId() {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function enqueueJob(payload = {}) {
  const id = payload.id || createJobId();
  const job = {
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };
  jobs.set(id, job);
  trimJobs();
  return job;
}

export function getJob(id) {
  return jobs.get(String(id)) || null;
}

export function updateJob(id, patch = {}) {
  const job = jobs.get(String(id));
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  jobs.set(String(id), job);
  return job;
}

export function cancelJob(id) {
  return updateJob(id, { status: "cancelled" });
}

function trimJobs() {
  if (jobs.size <= MAX_JOBS) return;
  const keys = [...jobs.keys()].slice(0, jobs.size - MAX_JOBS);
  for (const k of keys) jobs.delete(k);
}

export function getQueueStats() {
  let pending = 0;
  let running = 0;
  let completed = 0;
  let failed = 0;
  for (const job of jobs.values()) {
    if (job.status === "pending" || job.status === "queued") pending += 1;
    else if (job.status === "running" || job.status === "active") running += 1;
    else if (job.status === "completed" || job.status === "done") completed += 1;
    else if (job.status === "failed" || job.status === "error") failed += 1;
  }
  return {
    size: jobs.size,
    queued: pending,
    active: running,
    completed,
    failed,
    maxConcurrency,
  };
}

export default { createJobId, enqueueJob, getJob, updateJob, cancelJob, getQueueStats };
