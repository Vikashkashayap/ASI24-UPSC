/** Offline cache keys — single source of truth for local persistence namespaces. */
export const OFFLINE_KEYS = {
  dashboard: "md.offline.dashboard",
  profile: "md.offline.profile",
  notes: "md.offline.notes",
  currentAffairs: "md.offline.currentAffairs",
  planner: "md.offline.planner",
  aiHistory: "md.offline.aiHistory",
  queue: "md.offline.queue",
  meta: "md.offline.meta",
} as const;

export type OfflineKey = (typeof OFFLINE_KEYS)[keyof typeof OFFLINE_KEYS];

export type OfflineEnvelope<T> = {
  version: 1;
  savedAt: string;
  expiresAt?: string;
  data: T;
};

export type OfflineQueueItem = {
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};
