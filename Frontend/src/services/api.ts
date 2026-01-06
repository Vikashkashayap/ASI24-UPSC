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

// Single Question Evaluation API
export const singleQuestionEvaluationAPI = {
  evaluate: async (data: {
    question: string;
    answerText?: string;
    paper?: string;
    marks?: number;
    language?: string;
    wordLimit?: number;
    pdfFile?: File;
  }) => {
    const formData = new FormData();
    formData.append('question', data.question);
    if (data.answerText) formData.append('answerText', data.answerText);
    if (data.paper) formData.append('paper', data.paper);
    if (data.marks) formData.append('marks', data.marks.toString());
    if (data.language) formData.append('language', data.language);
    if (data.wordLimit) formData.append('wordLimit', data.wordLimit.toString());
    if (data.pdfFile) formData.append('pdf', data.pdfFile);

    return api.post('/api/single-question-evaluation/evaluate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  getTests: async () => {
    return api.get("/api/tests");
  },
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