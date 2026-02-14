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
export const testAPI = {
  generateTest: async (params: { subject: string; topic: string; difficulty: string; count: number }) => {
    return api.post("/api/tests/generate", params);
  },

  getTest: async (id: string) => {
    return api.get(`/api/tests/${id}`);
  },

  submitTest: async (id: string, answers: { answers: { [key: string]: string } }) => {
    return api.post(`/api/tests/submit/${id}`, answers);
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

// Prelims Topper (Excel-based tests) API
export const prelimsTopperAPI = {
  // Admin: create test from Excel
  createExcelTest: async (formData: FormData) => {
    return api.post("/api/admin/excel-test/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Student: list available scheduled tests
  getStudentTests: () => api.get("/api/student/tests"),

  // Student: start test (returns questions without correctAnswer)
  startTest: (testId: string) => api.post(`/api/student/test/start/${testId}`),

  // Student: submit test
  submitTest: (testId: string, answers: { [questionId: string]: string }) =>
    api.post(`/api/student/test/submit/${testId}`, { answers }),

  // Student: get result by attemptId
  getResult: (attemptId: string) =>
    api.get(`/api/student/test/result/${attemptId}`),

  // Student: get in-progress attempt (for exam page refresh)
  getAttempt: (attemptId: string) =>
    api.get(`/api/student/test/attempt/${attemptId}`),

  // Student: attempt history
  getAttempts: () => api.get("/api/student/test/attempts"),
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