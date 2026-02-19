import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
export const prelimsMockAPI = {
  // Admin
  createSchedule: (data: { subject: string; scheduledAt: string; isMix?: boolean; isPyo?: boolean; isCsat?: boolean; yearFrom?: number; yearTo?: number }) =>
    api.post("/api/admin/prelims-mock", data),
  listAdmin: () => api.get("/api/admin/prelims-mock"),
  goLive: (id: string) => api.post(`/api/admin/prelims-mock/${id}/go-live`),
  updateSchedule: (id: string, data: { scheduledAt: string }) =>
    api.patch(`/api/admin/prelims-mock/${id}`, data),
  delete: (id: string) => api.delete(`/api/admin/prelims-mock/${id}`),
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