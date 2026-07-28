import { api } from "../../services/api";

export type BuilderTest = {
  _id: string;
  title?: string;
  subject?: string;
  topic?: string;
  status?: string;
  totalQuestions?: number;
  durationMinutes?: number;
  totalMarks?: number;
  assignedCount?: number;
  qiSessionId?: string;
  createdAt?: string;
};

export const testBuilderAPI = {
  dashboard: () =>
    api.get<{
      success: boolean;
      data: { stats: Record<string, number>; recent: BuilderTest[] };
    }>("/api/test-builder/dashboard"),

  list: (params?: { page?: number }) =>
    api.get<{
      success: boolean;
      data: { items: BuilderTest[]; total: number; totalPages: number; page: number };
    }>("/api/test-builder/tests", { params }),

  fromSession: (body: {
    sessionId: string;
    title?: string;
    durationMinutes?: number;
    totalMarks?: number;
    negativeMark?: number;
    difficulty?: string;
    maxQuestions?: number;
  }) => api.post("/api/test-builder/from-session", body),

  buildAndCreate: (body: {
    subject?: string;
    topic?: string;
    chapter?: string;
    query?: string;
    count?: number;
    title?: string;
    durationMinutes?: number;
    totalMarks?: number;
    allowGeneration?: boolean;
    difficulty?: string;
    /** When true, returns immediately and generates in background (poll assigned-practice by id). */
    async?: boolean;
  }) =>
    api.post("/api/test-builder/build-and-create", body, { timeout: 300000 }),
};
