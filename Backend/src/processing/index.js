/**
 * Knowledge Processing Engine bootstrap.
 */

import { registerAllWorkers } from "./workers/index.js";
import { initProcessingQueues } from "./queues/queueManager.js";

let started = false;

export async function startProcessingEngine() {
  if (started) return;
  started = true;
  registerAllWorkers();
  const info = await initProcessingQueues();
  console.log(
    `[processing] Engine started (mode=${info.mode}, redis=${info.redis?.ok ? "ok" : "off"})`
  );
  return info;
}

export { maybeAutoStartProcessing, startProcessing } from "./services/orchestrator.service.js";
