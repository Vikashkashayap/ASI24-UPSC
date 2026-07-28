import { api } from "../../services/api";
import type {
  KnowledgeDashboard,
  KnowledgeDocument,
  KnowledgeListResponse,
  KbSubject,
  KbChapter,
  KbTopic,
  KbCategory,
  UploadMetadata,
} from "./types";

function appendMeta(form: FormData, meta: UploadMetadata) {
  Object.entries(meta).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    form.append(key, String(value));
  });
}

export const knowledgeAPI = {
  dashboard: () =>
    api.get<{ success: boolean; data: KnowledgeDashboard }>("/api/knowledge/dashboard"),

  list: (params?: Record<string, string | number | undefined>) =>
    api.get<{ success: boolean; data: KnowledgeListResponse }>("/api/knowledge", { params }),

  get: (id: string) =>
    api.get<{ success: boolean; data: KnowledgeDocument }>(`/api/knowledge/${id}`),

  update: (id: string, body: Partial<KnowledgeDocument>) =>
    api.patch<{ success: boolean; data: KnowledgeDocument }>(`/api/knowledge/${id}`, body),

  remove: (id: string) => api.delete(`/api/knowledge/${id}`),

  upload: (
    files: File[],
    meta: UploadMetadata,
    options?: {
      onUploadProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    appendMeta(form, meta);
    return api.post("/api/knowledge/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000,
      signal: options?.signal,
      onUploadProgress: (evt) => {
        if (!options?.onUploadProgress || !evt.total) return;
        options.onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },

  bulkUpload: (
    files: File[],
    meta: UploadMetadata,
    options?: {
      onUploadProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    appendMeta(form, meta);
    return api.post("/api/knowledge/bulk-upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000,
      signal: options?.signal,
      onUploadProgress: (evt) => {
        if (!options?.onUploadProgress || !evt.total) return;
        options.onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },

  retry: (ids: string[]) => api.post("/api/knowledge/retry", { ids }),
  archive: (ids: string[]) => api.post("/api/knowledge/archive", { ids }),
  bulk: (body: {
    ids: string[];
    action: string;
    subjectId?: string;
    chapterId?: string;
    topicId?: string;
    categoryId?: string;
  }) => api.post("/api/knowledge/bulk", body),

  subjects: {
    list: () => api.get<{ success: boolean; data: KbSubject[] }>("/api/knowledge/subjects"),
    create: (body: Partial<KbSubject>) => api.post("/api/knowledge/subjects", body),
    update: (id: string, body: Partial<KbSubject>) =>
      api.patch(`/api/knowledge/subjects/${id}`, body),
    remove: (id: string) => api.delete(`/api/knowledge/subjects/${id}`),
  },

  chapters: {
    list: (subjectId?: string) =>
      api.get<{ success: boolean; data: KbChapter[] }>("/api/knowledge/chapters", {
        params: subjectId ? { subjectId } : undefined,
      }),
    create: (body: Partial<KbChapter> & { subjectId: string; name: string }) =>
      api.post("/api/knowledge/chapters", body),
    update: (id: string, body: Partial<KbChapter>) =>
      api.patch(`/api/knowledge/chapters/${id}`, body),
    remove: (id: string) => api.delete(`/api/knowledge/chapters/${id}`),
  },

  topics: {
    list: (params?: { subjectId?: string; chapterId?: string }) =>
      api.get<{ success: boolean; data: KbTopic[] }>("/api/knowledge/topics", { params }),
    create: (body: {
      name: string;
      subjectId: string;
      chapterId: string;
      description?: string;
    }) => api.post("/api/knowledge/topics", body),
    update: (id: string, body: Partial<KbTopic>) =>
      api.patch(`/api/knowledge/topics/${id}`, body),
    remove: (id: string) => api.delete(`/api/knowledge/topics/${id}`),
  },

  categories: {
    list: () => api.get<{ success: boolean; data: KbCategory[] }>("/api/knowledge/categories"),
    create: (body: Partial<KbCategory>) => api.post("/api/knowledge/categories", body),
    update: (id: string, body: Partial<KbCategory>) =>
      api.patch(`/api/knowledge/categories/${id}`, body),
    remove: (id: string) => api.delete(`/api/knowledge/categories/${id}`),
  },
};

export function formatBytes(n?: number): string {
  if (!n || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function entityName(
  ref?: { name?: string } | string | null
): string {
  if (!ref) return "—";
  if (typeof ref === "string") return ref;
  return ref.name || "—";
}

export const ALLOWED_UPLOAD_ACCEPT =
  ".pdf,.docx,.txt,.md,.zip,application/pdf,application/zip,text/plain,text/markdown";

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".zip"];
