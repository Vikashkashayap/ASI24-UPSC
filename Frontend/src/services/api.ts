import axios from "axios";

// VITE_API_URL can be:
//   - "http://localhost:5000" (local) → base = origin, paths /api/auth/login
//   - "/api" (production same-origin) → base = "" so /api/auth/login goes to same host
//   - "https://example.com/api" → we strip /api so base = https://example.com
const raw = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const stripped = raw.replace(/\/api$/i, "").trim();
let baseURL: string;
if (stripped === "" && raw === "/api") {
  baseURL = ""; // VITE_API_URL=/api → same-origin, paths are /api/...
} else if (stripped === "") {
  baseURL = "http://localhost:5000";
} else {
  baseURL = stripped;
}
export const apiBaseURL = baseURL;

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("upsc_mentor_auth");
  if (stored) {
    const parsed = JSON.parse(stored) as { token: string };
    if (parsed.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${parsed.token}`;
    }
  }
  return config;
});

// Redirect to /pricing when backend returns 402 (subscription required or expired)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const redirectTo = err?.response?.data?.redirectTo;
    const currentPath = window.location.pathname;

    // For most pages, send user to pricing when subscription is required/expired.
    // On the home dashboard, we handle the "locked" state in the UI instead.
    if (
      status === 402 &&
      redirectTo === "/pricing" &&
      currentPath !== "/home"
    ) {
      const from = currentPath + window.location.search;
      window.location.href = `/pricing?from=${encodeURIComponent(from)}`;
    }
    return Promise.reject(err);
  }
);

// Copy Evaluation API
export const copyEvaluationAPI = {
  uploadAndEvaluate: async (file: File, metadata: { subject?: string; paper?: string; year?: number }) => {
    const formData = new FormData();
    formData.append('pdf', file);
    if (metadata.subject) formData.append('subject', metadata.subject);
    if (metadata.paper) formData.append('paper', metadata.paper);
    if (metadata.year) formData.append('year', metadata.year.toString());

    return api.post('/api/copy-evaluation/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getEvaluationById: (id: string, includeRawText?: boolean) => {
    const params = includeRawText ? { includeRawText: 'true' } : {};
    return api.get(`/api/copy-evaluation/${id}`, { params });
  },

  getHistory: (page = 1, limit = 10) => {
    return api.get('/api/copy-evaluation/history/list', {
      params: { page, limit },
    });
  },

  getAnalytics: () => {
    return api.get('/api/copy-evaluation/analytics/summary');
  },

  getStats: (id: string) => {
    return api.get(`/api/copy-evaluation/${id}/stats`);
  },

  deleteEvaluation: (id: string) => {
    return api.delete(`/api/copy-evaluation/${id}`);
  },

  processEvaluation: (id: string) => {
    return api.post(`/api/copy-evaluation/${id}/process`);
  },
};

// Meeting API
export const meetingAPI = {
  createRoom: async () => {
    return api.post("/api/meeting/create");
  },

  joinRoom: async (roomId: string, passcode: string) => {
    return api.post("/api/meeting/join", { roomId, passcode });
  },

  getRoom: async (roomId: string) => {
    return api.get(`/api/meeting/${roomId}`);
  },
};

// Test API (UPSC Prelims Test Generator)
export interface GenerateTestParams {
  subjects: string[];
  topic: string;
  examType: "GS" | "CSAT";
  questionCount: number;
  difficulty?: string;
  csatCategories?: string[];
  currentAffairsPeriod?: { month?: string; year?: string };
}
export interface GenerateFullMockParams {
  subject: string; // One subject or comma-separated, e.g. "Polity" or "Polity, History, Geography"
}
export const testAPI = {
  generateTest: async (params: GenerateTestParams) => {
    return api.post("/api/tests/generate", params);
  },

  generateFullMockTest: async (params: GenerateFullMockParams) => {
    return api.post("/api/tests/generate-full-mock", params);
  },

  getTest: async (id: string) => {
    return api.get(`/api/tests/${id}`);
  },

  submitTest: async (
    id: string,
    payload: { answers: { [key: string]: string }; questionTimeSpent?: { [questionId: string]: number } }
  ) => {
    return api.post(`/api/tests/submit/${id}`, payload);
  },

  getTests: async (page = 1, limit = 10) => {
    return api.get("/api/tests", {
      params: { page, limit },
    });
  },

  getAnalytics: async () => {
    return api.get("/api/tests/analytics");
  },

  deleteTest: async (id: string) => {
    return api.delete(`/api/tests/${id}`);
  },
};

// Auth API
export const authAPI = {
  login: async (credentials: any) => {
    return api.post("/api/auth/login", credentials);
  },
  changePassword: async (newPassword: string) => {
    return api.post("/api/auth/change-password", { newPassword });
  },
  getMe: async () => {
    return api.get("/api/auth/me");
  },
};

// Admin API
export const adminAPI = {
  getStudents: async (params: any) => {
    return api.get("/api/admin/students", { params });
  },
  getStudentById: async (id: string) => {
    return api.get(`/api/admin/students/${id}`);
  },
  getStudentPerformance: (studentId: string) =>
    api.get<{
      success: boolean;
      data: {
        student: { name: string; email: string };
        summary: {
          totalTests: number;
          avgScore: number;
          avgAccuracy: number;
          highestScore: number;
          lowestScore: number;
        };
        tests: Array<{
          testId: string;
          mockId: string | null;
          mockTitle: string;
          date: string | null;
          score: number;
          accuracy: number;
          rank: number | null;
          attempted: number;
          correct: number;
          wrong: number;
          timeTaken: number;
        }>;
        subjectAnalysis: Array<{
          subject: string;
          accuracy: number;
          attempted: number;
          correct: number;
        }>;
      };
    }>(`/api/admin/students/${studentId}/performance`),
  createStudent: async (studentData: { name: string; email: string }) => {
    return api.post("/api/admin/students", studentData);
  },
  updateStudentStatus: async (id: string, status: string) => {
    return api.patch(`/api/admin/students/${id}/status`, { status });
  },
  resetPassword: async (id: string) => {
    return api.post(`/api/admin/students/${id}/reset-password`);
  },
  getDashboardStats: async () => {
    return api.get("/api/admin/dashboard");
  },
  deleteStudent: async (id: string) => {
    return api.delete(`/api/admin/students/${id}`);
  },
};

// Prelims Import API (PDF parsed → structured test, modern UI)
export const prelimsImportAPI = {
  // Student
  getActiveTests: () => api.get("/api/prelims-import/active"),
  getTest: (id: string) => api.get(`/api/prelims-import/test/${id}`),
  submitTest: (id: string, answers: Record<string | number, string>) =>
    api.post(`/api/prelims-import/submit/${id}`, { answers }),
  getResult: (testId: string) => api.get(`/api/prelims-import/result/${testId}`),
  // Admin
  uploadTest: async (formData: FormData) =>
    api.post("/api/admin/upload-test", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  listImportedTests: () => api.get("/api/admin/imported-tests"),
  updateImportedTest: (id: string, data: { title?: string; startTime?: string | null; endTime?: string | null; examType?: string | null; duration?: number; marksPerQuestion?: number; negativeMark?: number; totalMarks?: number }) =>
    api.patch(`/api/admin/imported-tests/${id}`, data),
  getImportedTestAnalytics: (id: string) => api.get(`/api/admin/imported-tests/${id}/analytics`),
  deleteImportedTest: (id: string) => api.delete(`/api/admin/imported-tests/${id}`),
};

// Prelims Mock – Admin schedules; at scheduled time test goes live; students attempt under "Prelims Mock"
export interface PrelimsMockSchedulePayload {
  subject: string;
  scheduledAt: string;
  isMix?: boolean;
  isPyo?: boolean;
  isCsat?: boolean;
  yearFrom?: number;
  yearTo?: number;
  title?: string;
  totalQuestions?: number;
  difficulty?: "easy" | "moderate" | "hard";
  /** UPSC question pattern IDs to include. Empty = default balanced mix. */
  patternsToInclude?: string[];
  avoidPreviouslyUsed?: boolean;
}

export const prelimsMockAPI = {
  // Admin
  createSchedule: (data: PrelimsMockSchedulePayload) =>
    api.post("/api/admin/prelims-mock", data),
  listAdmin: (params?: { difficulty?: string; subject?: string; year?: string }) =>
    api.get("/api/admin/prelims-mock", { params }),
  goLive: (id: string) => api.post(`/api/admin/prelims-mock/${id}/go-live`),
  updateSchedule: (id: string, data: { scheduledAt: string }) =>
    api.patch(`/api/admin/prelims-mock/${id}`, data),
  delete: (id: string) => api.delete(`/api/admin/prelims-mock/${id}`),
  getResults: (mockId: string) =>
    api.get<{
      success: boolean;
      data: {
        mock: { _id: string; title: string; subject: string; totalQuestions: number };
        results: Array<{
          rank: number;
          studentId: string;
          name: string;
          email: string;
          attempted: number;
          correct: number;
          wrong: number;
          score: number;
          accuracy: number;
          timeTaken: number;
        }>;
        stats: { totalAttempted: number; averageScore: number; highestScore: number; lowestScore: number };
      };
    }>(`/api/admin/prelims-mock/${mockId}/results`),
  // Student
  listLive: () => api.get("/api/prelims-mock"),
  startAttempt: (mockId: string) => api.post(`/api/prelims-mock/${mockId}/start`),
};

// DART – Daily Activity & Reflection Tracker API
export const dartAPI = {
  submit: (body: Record<string, unknown>) => api.post("/api/dart", body),
  getEntries: (params?: { from?: string; to?: string }) =>
    api.get("/api/dart/entries", { params }),
  getAnalytics: (params?: { days?: number }) =>
    api.get("/api/dart/analytics", { params }),
  download20DayReport: () =>
    api.get("/api/dart/report-20day", { responseType: "blob" }),
  // Admin: view student DART analytics
  getStudentAnalytics: (studentId: string, days?: number) =>
    api.get(`/api/admin/students/${studentId}/dart-analytics`, {
      params: days ? { days } : undefined,
    }),
  getStudentReport20Day: (studentId: string) =>
    api.get(`/api/admin/students/${studentId}/dart-report-20day`, {
      responseType: "blob",
    }),
};

// Mentor (AI) – multiple chats & projects
export const mentorAPI = {
  listChats: (project?: string) =>
    api.get("/api/mentor/chats", { params: project ? { project } : undefined }),
  getChat: (sessionId: string) => api.get(`/api/mentor/chats/${sessionId}`),
  createChat: (body?: { title?: string; project?: string }) =>
    api.post("/api/mentor/chats", body || {}),
  updateChat: (sessionId: string, body: { title?: string; project?: string }) =>
    api.patch(`/api/mentor/chats/${sessionId}`, body),
  deleteChat: (sessionId: string) => api.delete(`/api/mentor/chats/${sessionId}`),
  listProjects: () => api.get("/api/mentor/projects"),
  sendMessage: (body: { message: string; sessionId?: string; project?: string }) =>
    api.post("/api/mentor/chat", body),
};

// Study Plan API (UPSC Study Planner: setup, tasks, progress, streak)
export interface StudyPlanTask {
  _id: string;
  date: string;
  subject: string;
  topic: string;
  taskType: "subject_study" | "current_affairs" | "mcq_practice" | "revision" | "mock_test";
  duration: number;
  startTime?: string | null;
  endTime?: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface StudyPlanType {
  _id: string;
  userId: string;
  examDate: string;
  dailyHours: number;
  preparationLevel: "beginner" | "intermediate" | "advanced";
  subjects: string[];
  tasks: StudyPlanTask[];
  currentStreak: number;
  lastCompletedDate: string | null;
  longestStreak: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyPlanProgress {
  date: string | null;
  daily: { total: number; completed: number; percent: number };
  weekly: { total: number; completed: number; percent: number };
  streak: number;
  longestStreak: number;
  daysRemaining?: number | null;
}

export const studyPlanAPI = {
  setup: (data: { examDate: string; dailyHours?: number; preparationLevel?: string }) =>
    api.post<{ plan: StudyPlanType; progress: StudyPlanProgress }>("/api/study-plan/setup", data),
  get: () =>
    api.get<{ plan: StudyPlanType | null; progress: StudyPlanProgress | null; daysRemaining?: number | null }>("/api/study-plan"),
  toggleTask: (taskId: string) =>
    api.patch<{ plan: StudyPlanType; task: StudyPlanTask; progress: StudyPlanProgress }>(
      `/api/study-plan/tasks/${taskId}/complete`
    ),
  getProgress: (date?: string) =>
    api.get<{ progress: StudyPlanProgress }>("/api/study-plan/progress", {
      params: date ? { date } : undefined,
    }),
};

// Student Profiler API
export const studentProfilerAPI = {
  generatePlan: async (params: {
    targetYear: string;
    dailyHours: number;
    weakSubjects: string[];
    examStage: "Prelims" | "Mains" | "Both";
    currentDate: string;
  }) => {
    return api.post("/api/agents/student-profiler", params);
  },
};

// Pricing plans – public (active only) and admin CRUD
export interface PricingPlanType {
  _id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  isPopular: boolean;
  status: "active" | "draft";
  createdAt: string;
}

export const pricingAPI = {
  // Public: fetch active plans only (for landing /pricing page)
  getActive: () => api.get<{ success: boolean; data: PricingPlanType[] }>("/api/pricing"),
  // Admin: list all plans
  list: () => api.get<{ success: boolean; data: PricingPlanType[] }>("/api/admin/pricing"),
  create: (data: Omit<PricingPlanType, "_id" | "createdAt">) =>
    api.post<{ success: boolean; data: PricingPlanType }>("/api/admin/pricing", data),
  update: (id: string, data: Partial<Omit<PricingPlanType, "_id" | "createdAt">>) =>
    api.put<{ success: boolean; data: PricingPlanType }>(`/api/admin/pricing/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/admin/pricing/${id}`),
};

// Festival / offer banner – public (active only) and admin CRUD
export interface OfferType {
  _id: string;
  title: string;
  description: string;
  discount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isHidden: boolean;
  ctaText: string;
  redirectUrl: string;
  createdAt: string;
  updatedAt: string;
}

export const offersAPI = {
  getActive: () =>
    api.get<{ success: boolean; data: OfferType | null }>("/api/offers/active"),
  list: () =>
    api.get<{ success: boolean; data: OfferType[] }>("/api/admin/offers"),
  create: (data: Omit<OfferType, "_id" | "createdAt" | "updatedAt">) =>
    api.post<{ success: boolean; data: OfferType }>("/api/admin/offers", data),
  update: (id: string, data: Partial<Omit<OfferType, "_id" | "createdAt" | "updatedAt">>) =>
    api.put<{ success: boolean; data: OfferType }>(`/api/admin/offers/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/admin/offers/${id}`),
};

// Payments – Razorpay integration
export const paymentAPI = {
  createOrder: (planId: string) =>
    api.post("/api/payment/create-order", { planId }),
  verifyPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
  }) => api.post("/api/payment/verify", payload),
};

// Current Affairs – Daily UPSC (student: list/detail; admin: list all, toggle, run job)
export interface CurrentAffairType {
  _id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  gsPaper: string;
  prelimsFocus: string;
  mainsAngle: string;
  keywords: string[];
  difficulty: "Easy" | "Moderate" | "Hard";
  sourceUrl: string;
  date: string;
  slug: string;
  isActive: boolean;
  createdAt?: string;
}

export const currentAffairsAPI = {
  list: (params?: {
    date?: string;
    gsPaper?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get<{ success: boolean; data: { items: CurrentAffairType[]; total: number; page: number; limit: number; totalPages: number } }>("/api/current-affairs", { params }),
  getBySlug: (slug: string) =>
    api.get<{ success: boolean; data: CurrentAffairType }>(`/api/current-affairs/${slug}`),
  generateMcqs: (id: string) =>
    api.get<{ success: boolean; data: { mcqs: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string }> } }>(`/api/current-affairs/mcqs/${id}`),
};

export const currentAffairsAdminAPI = {
  list: (params?: { page?: number; limit?: number; isActive?: string; gsPaper?: string; difficulty?: string }) =>
    api.get<{ success: boolean; data: { items: CurrentAffairType[]; total: number; page: number; limit: number; totalPages: number } }>("/api/admin/current-affairs/list", { params }),
  runNow: () => api.post<{ success: boolean; data: { created: number; skipped: number }; message: string }>("/api/admin/current-affairs/run-now"),
  toggle: (id: string) => api.patch<{ success: boolean; data: { _id: string; isActive: boolean } }>(`/api/current-affairs/${id}`),
};