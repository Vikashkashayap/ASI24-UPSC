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

// Premil API
export const premilAPI = {
  generateTest: async (params: { subject: string; topic: string; difficulty: string; questionCount: number }) => {
    return api.post("/api/premil/generate", params);
  },

  submitTest: async (data: { sessionId: string; answers: any[]; timeSpent: number }) => {
    return api.post("/api/premil/submit", data);
  },

  getHistory: async (page = 1, limit = 10) => {
    return api.get("/api/premil/history", {
      params: { page, limit },
    });
  },

  getSession: async (sessionId: string) => {
    return api.get(`/api/premil/session/${sessionId}`);
  },

  getSubjects: async () => {
    return api.get("/api/premil/subjects");
  },

  getConfig: async () => {
    return api.get("/api/premil/config");
  }
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