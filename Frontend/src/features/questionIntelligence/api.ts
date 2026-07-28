import { api } from "../../services/api";

export type QiQuestion = {
  questionText: string;
  options?: Array<{ label: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: string;
  subject?: string;
  topic?: string;
  sourceType?: "extracted" | "generated" | "similar";
  pattern?: string;
  confidence?: number | null;
  validated?: boolean;
};

export type QiBuildResult = {
  sessionId: string;
  status: string;
  requestedCount: number;
  count: number;
  questions: QiQuestion[];
  stats: {
    extractedUsed: number;
    generatedUsed: number;
    duplicatesRemoved: number;
    sourcesRanked: number;
    patterns: Record<string, number>;
    avgConfidence: number | null;
    generationTriggered: boolean;
  };
  concepts?: string[];
  sources?: Array<Record<string, unknown>>;
  generation?: { triggered?: boolean; reason?: string; message?: string };
  durationMs?: number;
};

export const questionIntelligenceAPI = {
  dashboard: () =>
    api.get<{
      success: boolean;
      data: {
        stats: Record<string, number>;
        recent: Array<Record<string, unknown>>;
      };
    }>("/api/question-intelligence/dashboard"),

  build: (body: {
    subject?: string;
    topic?: string;
    chapter?: string;
    query?: string;
    count?: number;
    allowGeneration?: boolean;
    preferExtracted?: boolean;
  }) =>
    api.post<{ success: boolean; data: QiBuildResult }>(
      "/api/question-intelligence/build",
      body,
      { timeout: 300000 }
    ),

  sessions: (params?: { page?: number; subject?: string }) =>
    api.get("/api/question-intelligence/sessions", { params }),

  session: (id: string) => api.get(`/api/question-intelligence/sessions/${id}`),
};
