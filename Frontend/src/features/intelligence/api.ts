import { api } from "../../services/api";

export type IntelligenceDashboard = {
  stats: {
    total: number;
    pending: number;
    queued: number;
    generating: number;
    completed: number;
    failed: number;
    synced: number;
  };
  qdrant: {
    ok?: boolean;
    configured?: boolean;
    collection?: string;
    pointsCount?: number | null;
    message?: string;
  };
  embedding: {
    configured: boolean;
    provider?: string;
    model?: string;
    dimension?: number;
  };
  queueMode: string;
  items: Array<Record<string, unknown>>;
  failed: Array<Record<string, unknown>>;
  syncLogs: Array<Record<string, unknown>>;
  page: number;
  total: number;
  totalPages: number;
};

export type SearchResult = {
  score: number;
  similarity?: number;
  chunk: string;
  topic?: string;
  subject?: string;
  chapter?: string;
  page?: number | null;
  source?: string;
  document?: { id?: string; title?: string; year?: number; url?: string };
};

export const intelligenceAPI = {
  dashboard: (params?: { page?: number; status?: string }) =>
    api.get<{ success: boolean; data: IntelligenceDashboard }>(
      "/api/intelligence/dashboard",
      { params }
    ),

  search: (body: {
    query: string;
    topK?: number;
    filters?: Record<string, string | number>;
  }) => api.post("/api/search", body),

  searchConcept: (body: { query: string; topK?: number }) =>
    api.post("/api/search/concept", body),

  reindex: (documentId: string) =>
    api.post(`/api/intelligence/reindex/${documentId}`),

  retryFailed: (documentId?: string) =>
    api.post("/api/intelligence/retry", documentId ? { documentId } : {}),
};
