import { OFFLINE_KEYS } from "./types";
import type { OfflineQueueItem } from "./types";
import { readOfflineCache, writeOfflineCache } from "./offlineCache";
import { api } from "../services/api";

const MAX_ATTEMPTS = 5;

async function loadQueue(): Promise<OfflineQueueItem[]> {
  const env = await readOfflineCache<OfflineQueueItem[]>(OFFLINE_KEYS.queue);
  return env?.data ?? [];
}

async function saveQueue(items: OfflineQueueItem[]): Promise<void> {
  await writeOfflineCache(OFFLINE_KEYS.queue, items);
}

export async function enqueueOfflineRequest(
  item: Omit<OfflineQueueItem, "id" | "createdAt" | "attempts">
): Promise<string> {
  const queue = await loadQueue();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  queue.push({
    ...item,
    id,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await saveQueue(queue);
  return id;
}

export async function getOfflineQueueLength(): Promise<number> {
  return (await loadQueue()).length;
}

/**
 * Replay queued mutations when back online.
 * Does not invent new API contracts — replays stored method/url/body.
 */
export async function flushOfflineQueue(): Promise<{ ok: number; failed: number }> {
  const queue = await loadQueue();
  if (!queue.length) return { ok: 0, failed: 0 };

  const remaining: OfflineQueueItem[] = [];
  let ok = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await api.request({
        method: item.method,
        url: item.url,
        data: item.body,
        headers: item.headers,
      });
      ok += 1;
    } catch (err) {
      const attempts = item.attempts + 1;
      failed += 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.push({
          ...item,
          attempts,
          lastError: err instanceof Error ? err.message : "request failed",
        });
      }
    }
  }

  await saveQueue(remaining);
  return { ok, failed };
}
