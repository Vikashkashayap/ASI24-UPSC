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

  getEvaluationById: (id: string) => {
    return api.get(`/api/copy-evaluation/${id}`);
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