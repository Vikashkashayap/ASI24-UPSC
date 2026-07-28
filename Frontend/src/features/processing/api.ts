import { api } from "../../services/api";

export type ProcessingItem = {
  _id: string;
  documentId: string;
  title?: string;
  stage?: string;
  progress?: number;
  status?: string;
  pageCount?: number;
  sectionCount?: number;
  chunkCount?: number;
  questionCount?: number;
  lastError?: string | null;
  isScanned?: boolean;
  documentKind?: string;
  detectedSubject?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  retryCount?: number;
  currentQueue?: string | null;
};

export type ProcessingDashboard = {
  stats: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    retrying: number;
  };
  queues: Record<string, Record<string, number | string>>;
  mode: string;
  redis: { ok?: boolean; configured?: boolean; message?: string };
  providers: { llamaParse: boolean; mistralOcr: boolean };
  items: ProcessingItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProcessingStatus = {
  found: boolean;
  documentId: string;
  stage?: string;
  progress?: number;
  status?: string;
  pageCount?: number;
  chunkCount?: number;
  questionCount?: number;
  lastError?: string | null;
  detectedSubject?: string;
  documentKind?: string;
};

export type ProcessingLog = {
  _id: string;
  stage: string;
  workerName: string;
  queueName?: string;
  status: string;
  message?: string;
  errorMessage?: string | null;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
};

export const processingAPI = {
  dashboard: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ success: boolean; data: ProcessingDashboard }>("/api/processing/dashboard", {
      params,
    }),

  start: (documentId: string, force = false) =>
    api.post(`/api/processing/start/${documentId}`, { force }),

  retry: (documentId: string, fromStage?: string) =>
    api.post(`/api/processing/retry/${documentId}`, { fromStage }),

  status: (documentId: string) =>
    api.get<{ success: boolean; data: ProcessingStatus }>(
      `/api/processing/status/${documentId}`
    ),

  logs: (documentId: string) =>
    api.get<{ success: boolean; data: ProcessingLog[] }>(
      `/api/processing/logs/${documentId}`
    ),

  errors: (documentId: string) =>
    api.get<{ success: boolean; data: unknown[] }>(
      `/api/processing/errors/${documentId}`
    ),
};
