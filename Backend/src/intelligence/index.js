import { registerIntelligenceWorkers } from "./workers/index.js";
import { initIntelligenceQueues } from "./queues/queueManager.js";
import { knowledgeQdrant } from "./services/qdrantKnowledge.service.js";

let started = false;

export async function startIntelligenceEngine() {
  if (started) return;
  started = true;
  registerIntelligenceWorkers();
  const info = await initIntelligenceQueues();
  if (knowledgeQdrant.isConfigured()) {
    knowledgeQdrant.ensureCollection().catch((err) => {
      console.warn("[intelligence] ensureCollection:", err?.message || err);
    });
  }
  console.log(
    `[intelligence] Engine started (mode=${info.mode}, qdrant=${knowledgeQdrant.isConfigured() ? "on" : "off"})`
  );
  return info;
}

export { runIntelligenceForProcessed } from "./services/orchestrator.service.js";
export { enqueueDocumentIndexing } from "./workers/index.js";
