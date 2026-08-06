import { OFFLINE_KEYS } from "./types";
import { writeOfflineCache, readOfflineCache } from "./offlineCache";

const DAY = 24 * 60 * 60 * 1000;

/** Cache helpers for common student surfaces — call from pages after successful fetches. */
export const offlineStore = {
  saveDashboard: <T,>(data: T) => writeOfflineCache(OFFLINE_KEYS.dashboard, data, 6 * 60 * 60 * 1000),
  loadDashboard: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.dashboard),

  saveProfile: <T,>(data: T) => writeOfflineCache(OFFLINE_KEYS.profile, data, 7 * DAY),
  loadProfile: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.profile),

  saveNotes: <T,>(data: T) => writeOfflineCache(OFFLINE_KEYS.notes, data, 3 * DAY),
  loadNotes: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.notes),

  saveCurrentAffairs: <T,>(data: T) =>
    writeOfflineCache(OFFLINE_KEYS.currentAffairs, data, 2 * DAY),
  loadCurrentAffairs: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.currentAffairs),

  savePlanner: <T,>(data: T) => writeOfflineCache(OFFLINE_KEYS.planner, data, DAY),
  loadPlanner: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.planner),

  saveAiHistory: <T,>(data: T) => writeOfflineCache(OFFLINE_KEYS.aiHistory, data, 7 * DAY),
  loadAiHistory: <T,>() => readOfflineCache<T>(OFFLINE_KEYS.aiHistory),
};

export { OFFLINE_KEYS } from "./types";
export { enqueueOfflineRequest, flushOfflineQueue, getOfflineQueueLength } from "./offlineQueue";
export { useNetworkStatus, NetworkProvider } from "./NetworkProvider";
export { readOfflineCache, writeOfflineCache, clearOfflineCache } from "./offlineCache";
