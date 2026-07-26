import axios from "axios";

// VITE_API_URL can be:
//   - "http://localhost:5000" (local) → base = localhost backend
//   - "/api" (production same-origin) → base = "" so /api/auth/login goes to same host
//   - "https://studentportal.mentorsdaily.com/api" (production explicit) → base = https://studentportal.mentorsdaily.com
const defaultApiUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/api");
const raw = defaultApiUrl.replace(/\/$/, "");
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

// Copy Evaluation API (vision-based — PDF or image upload)
export const copyEvaluationAPI = {
  uploadAndEvaluate: async (
    file: File,
    metadata: { subject?: string; paper?: string; year?: number; maxMarks?: number }
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.subject) formData.append('subject', metadata.subject);
    if (metadata.paper) formData.append('paper', metadata.paper);
    if (metadata.year) formData.append('year', metadata.year.toString());
    if (metadata.maxMarks) formData.append('maxMarks', metadata.maxMarks.toString());

    return api.post('/api/copy-evaluation/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000,
    });
  },

  getEvaluationById: (id: string, includeRawText?: boolean) => {
    const params = includeRawText ? { includeRawText: 'true' } : {};
    return api.get(`/api/copy-evaluation/${id}`, { params });
  },

  getHistory: (page = 1, limit = 10) => {
    return api.get('/api/copy-evaluation/history', {
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
export interface PrelimsDailyStatus {
  locked: boolean;
  usedToday: boolean;
  dateKey: string;
  unlocksAt: string;
  bypass?: boolean;
  todayTest?: {
    _id: string;
    topic: string;
    subject: string;
    createdAt: string;
    isSubmitted: boolean;
  } | null;
}

export const testAPI = {
  generateTest: async (params: GenerateTestParams) => {
    return api.post("/api/tests/generate", params);
  },

  getPrelimsDailyStatus: async () => {
    return api.get<{ success: boolean; data: PrelimsDailyStatus; message?: string }>(
      "/api/tests/prelims-daily-status"
    );
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
  registerSendOtp: async (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    attempt?: string;
    targetYear?: string;
    prepStartDate?: string;
    dailyStudyHours?: string;
    educationBackground?: string;
  }) => {
    return api.post("/api/auth/register/send-otp", payload);
  },
  verifyRegisterOtp: async (payload: { email: string; otp: string; password: string }) => {
    return api.post("/api/auth/register/verify-otp", payload);
  },
  resendRegisterOtp: async (payload: { email: string }) => {
    return api.post("/api/auth/register/resend-otp", payload);
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
  getMentors: () => api.get("/api/admin/mentors"),
  resetMentorPassword: (id: string) => api.post(`/api/admin/mentors/${id}/reset-password`),
  deleteMentor: (id: string) => api.delete(`/api/admin/mentors/${id}`),
};

/** Human mentor (staff): roster, feedback, analytics — under /api/mentor (distinct from AI chat paths). */
export const mentorStaffAPI = {
  createMentor: (body: { name: string; email: string }) => api.post("/api/mentor/create", body),
  assignStudents: (body: { mentorUserId: string; studentIds: string[] }) =>
    api.post("/api/mentor/assign-students", body),
  getStudents: () => api.get("/api/mentor/students"),
  getStudentDetail: (studentId: string) => api.get(`/api/mentor/students/${studentId}`),
  postFeedback: (body: { studentId: string; message: string }) =>
    api.post("/api/mentor/feedback", body),
  getAnalytics: () => api.get("/api/mentor/analytics"),
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

// Assigned topic practice – admin generates 50/100Q by subject+topic and assigns to students
export interface AssignedPracticeGeneratePayload {
  subject: string;
  topic: string;
  chapter?: string;
  chapterId?: string;
  /** Free-text topic keyword — searches subject PDF/notes chunks via RAG */
  searchQuery?: string;
  notesTopicIds?: string[];
  notesTopicId?: string;
  difficulty?: "easy" | "moderate" | "hard";
  title?: string;
  /** Optional source / book reference shown with the practice set */
  reference?: string;
  patternsToInclude?: string[];
  /** 50 (default) or 100 */
  questionCount?: 50 | 100;
}

export interface NotesChapter {
  _id: string | null;
  title: string;
  subject: string;
  url: string;
  slug?: string;
  gsPaper?: string;
  sourceType?: "url" | "pdf";
  topicCount: number;
  expectedTopicCount?: number;
  chunkCount: number;
  status: string;
  synced?: boolean;
  lastSyncedAt?: string;
  hasPdf?: boolean;
  originalFileName?: string;
  fileSize?: number;
  embeddingStatus?: "pending" | "indexing" | "indexed" | "failed" | "skipped";
  embeddingModel?: string;
  embeddingsIndexedAt?: string | null;
}

export interface NotesTopic {
  _id: string;
  name: string;
  slug: string;
  subject: string;
  chapterId: string;
  heading: string;
  summary: string;
  chunkCount: number;
  sourceUrl: string;
  sourceFormat?: "web" | "pdf";
  pageStart?: number | null;
  pageEnd?: number | null;
}

export const notesAPI = {
  getSubjects: () => api.get<{ success: boolean; data: string[] }>("/api/admin/notes/subjects"),
  getChapters: (subject: string) =>
    api.get<{ success: boolean; data: NotesChapter[] }>("/api/admin/notes/chapters", {
      params: { subject },
    }),
  getTopics: (chapterId: string) =>
    api.get<{ success: boolean; data: NotesTopic[] }>("/api/admin/notes/topics", {
      params: { chapterId },
    }),
  previewTopic: (topicId: string) =>
    api.get(`/api/admin/notes/topics/${topicId}/preview`),
  syncChapter: (data: { url: string; subject: string; title?: string }) =>
    api.post("/api/admin/notes/sync-chapter", data),
  syncBySlug: (data: { slug: string; subject: string; title?: string }) =>
    api.post("/api/admin/notes/sync-by-slug", data),
  repairChapter: (chapterId: string) =>
    api.post(`/api/admin/notes/repair-chapter/${chapterId}`),
  getCatalog: () => api.get("/api/admin/notes/catalog"),
  syncTopic: (topicId: string, url?: string) =>
    api.post(`/api/admin/notes/sync-topic/${topicId}`, url ? { url } : {}),
  /** Upload one or many PDFs into subject knowledge (RAG searchable with website notes). */
  uploadPdf: async (params: {
    file?: File;
    files?: File[];
    subject: string;
    title?: string;
    chapterId?: string;
    skipProcess?: boolean;
    /** Always add as new knowledge PDF (do not replace chapter). Default true when files[].length > 1 */
    forceNew?: boolean;
    addToKnowledge?: boolean;
  }) => {
    const formData = new FormData();
    const list = params.files?.length ? params.files : params.file ? [params.file] : [];
    if (!list.length) throw new Error("No PDF file provided");

    if (list.length === 1 && !params.forceNew && !params.addToKnowledge) {
      formData.append("file", list[0]);
    } else {
      list.forEach((f) => formData.append("files", f));
    }
    formData.append("subject", params.subject);
    if (params.title) formData.append("title", params.title);
    if (params.chapterId) formData.append("chapterId", params.chapterId);
    if (params.skipProcess) formData.append("skipProcess", "true");
    if (params.forceNew || params.addToKnowledge || list.length > 1) {
      formData.append("forceNew", "true");
      formData.append("addToKnowledge", "true");
    }
    return api.post<{
      success: boolean;
      message: string;
      data: {
        count?: number;
        chapter: NotesChapter;
        chapters?: NotesChapter[];
        processed?: boolean;
        pageCount?: number;
        topics?: Array<{ _id: string; name: string; chunkCount: number }>;
      };
    }>("/api/admin/notes/upload-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000,
    });
  },
  /** Re-run Step 2 for an already-uploaded PDF chapter. */
  processPdf: (chapterId: string) =>
    api.post(`/api/admin/notes/process-pdf/${chapterId}`, null, { timeout: 300000 }),
  /** Step 3: sync / re-index embeddings → Qdrant (hash-gated unless force). */
  reindexChapter: (chapterId: string, force = false) =>
    api.post(`/api/admin/notes/reindex/${chapterId}`, { force }, { timeout: 300000 }),
  reindexTopic: (topicId: string, force = true) =>
    api.post(`/api/admin/notes/reindex-topic/${topicId}`, { force }, { timeout: 300000 }),
  vectorHealth: () => api.get("/api/admin/notes/vector-health"),
  /** Preview chunk matches for a typed topic keyword (subject-wide PDF + website). */
  searchChunks: (params: { subject?: string; chapterId?: string; q: string }) =>
    api.get<{
      success: boolean;
      data: {
        query: string;
        matchedChunks: number;
        source: string;
        tokens: number;
        scope?: string;
        preview: Array<{ heading: string; page: number | null; excerpt: string; source?: string }>;
      };
    }>("/api/admin/notes/search-chunks", {
      params: {
        q: params.q,
        ...(params.subject ? { subject: params.subject } : {}),
        ...(params.chapterId ? { chapterId: params.chapterId } : {}),
      },
    }),
  /** Remove an uploaded PDF source from subject knowledge (topics, chunks, vectors, file). */
  deleteChapter: (chapterId: string) =>
    api.delete<{ success: boolean; message: string; data: { chapterId: string; title: string } }>(
      `/api/admin/notes/chapters/${chapterId}`
    ),
};

export interface PreviewQuestion {
  index: number;
  question: string;
  question_en?: string;
  question_hi?: string;
  options: { A: string; B: string; C: string; D: string };
  options_hi?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer: string;
  explanation: string;
  questionType?: string;
  patternLabel?: string;
  sourceNote?: string;
  difficulty?: string;
  matchColumns?: { columnA: string[]; columnB: string[] } | null;
  matchColumns_hi?: { columnA: string[]; columnB: string[] } | null;
  backupReason?: string;
}

export interface GenerationProgress {
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  generatedQuestions: number;
  failedBatches?: number;
  isComplete?: boolean;
  currentStep?: string;
  readingNotes?: boolean;
  cleaningHtml?: boolean;
  batchSteps?: Record<string, boolean>;
  approved?: boolean;
}

export const assignedPracticeAPI = {
  // Admin
  generate: (data: AssignedPracticeGeneratePayload) =>
    api.post("/api/admin/assigned-practice", data),
  getById: (id: string) => api.get(`/api/admin/assigned-practice/${id}`),
  assign: (id: string, studentIds: string[]) =>
    api.post(`/api/admin/assigned-practice/${id}/assign`, { studentIds }),
  listAdmin: (params?: {
    page?: number;
    limit?: number;
    filter?: "all" | "assigned" | "unassigned";
    subject?: string;
  }) => api.get("/api/admin/assigned-practice", { params }),
  delete: (id: string) => api.delete(`/api/admin/assigned-practice/${id}`),
  updateQuestion: (id: string, index: number, data: Partial<PreviewQuestion>) =>
    api.patch(`/api/admin/assigned-practice/${id}/questions/${index}`, data),
  deleteQuestion: (id: string, index: number) =>
    api.delete(`/api/admin/assigned-practice/${id}/questions/${index}`),
  regenerateQuestion: (id: string, index: number) =>
    api.post(`/api/admin/assigned-practice/${id}/questions/${index}/regenerate`),
  saveQuestions: (id: string, questions: PreviewQuestion[]) =>
    api.patch(`/api/admin/assigned-practice/${id}/questions`, { questions }),
  approve: (id: string) => api.post(`/api/admin/assigned-practice/${id}/approve`),
  fillHindi: (id: string) => api.post(`/api/admin/assigned-practice/${id}/fill-hindi`),
  // Student
  listMine: () => api.get("/api/tests/assigned-practice"),
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get("/api/tests/assigned-practice/history", { params }),
  startAttempt: (id: string) => api.post(`/api/tests/assigned-practice/${id}/start`),
};

/** Admin-assigned syllabus modules → student home targets */
export interface SyllabusCatalogSubject {
  key: string;
  name: string;
  nameHi?: string;
  displayName?: string;
  primarySource?: string;
  sourceNote?: string | null;
  duration?: string | null;
  moduleCount: number;
  chips?: string[];
}

export interface SyllabusCatalogModule {
  moduleId: string;
  moduleName: string;
  moduleNameHi?: string;
  subjectKey?: string;
  subjectName?: string;
  subjectNameHi?: string;
  sequence?: number | null;
  chapterRange?: string | null;
  estimatedDays?: number | null;
  estimatedHours?: number | null;
  durationLabel?: string | null;
  hasModuleTest?: boolean;
  testLabel?: string | null;
  focus?: string | null;
  importance?: string | null;
  overview?: string | null;
  topicCount?: number;
  chips?: string[];
  chapters?: Array<{ chapter: string; name: string; nameEn?: string; nameHi?: string }>;
  topics?: Array<{
    topicId: string;
    topicName: string;
    topicNameHi?: string;
    chapter?: string;
    hours?: number;
  }>;
}

export interface SyllabusModuleTargetItem {
  _id: string;
  subjectKey: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
  medium?: "en" | "hi";
  estimatedDays?: number | null;
  estimatedHours?: number | null;
  chapterRange?: string;
  durationLabel?: string;
  topicCount: number;
  topicsPreview: string[];
  note?: string;
  dueDate?: string | null;
  status: "active" | "archived";
  assignedCount: number;
  completedCount: number;
  assignedStudents: { _id: string; name: string; email: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface StudentSyllabusTarget {
  _id: string;
  subjectKey: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
  medium?: "en" | "hi";
  estimatedDays?: number | null;
  estimatedHours?: number | null;
  chapterRange?: string;
  durationLabel?: string;
  topicCount: number;
  topicsPreview: string[];
  /** Chapter preview lines the student has marked done */
  completedChapters?: string[];
  /** All chapter tests submitted (Module Final still required to unlock next) */
  chaptersComplete?: boolean;
  /** Cached related UPSC topics per chapter label (from KB search prefetch) */
  relatedTopicsByChapter?: Record<string, string[]>;
  note?: string;
  dueDate?: string | null;
  completed: boolean;
  createdAt: string;
}

export const syllabusTargetsAPI = {
  // Admin
  getCatalog: (params?: { medium?: "en" | "hi" }) =>
    api.get<{ success: boolean; data: { subjects: SyllabusCatalogSubject[]; medium?: "en" | "hi" } }>(
      "/api/admin/syllabus-targets/catalog",
      { params }
    ),
  getSubjectModules: (subjectKey: string, params?: { medium?: "en" | "hi" }) =>
    api.get<{
      success: boolean;
      data: {
        subject: {
          key: string;
          name: string;
          nameHi?: string;
          displayName?: string;
          primarySource?: string;
          sourceNote?: string | null;
          duration?: string | null;
          chips?: string[];
        };
        modules: SyllabusCatalogModule[];
        medium?: "en" | "hi";
      };
    }>(`/api/admin/syllabus-targets/catalog/${subjectKey}`, { params }),
  listAdmin: (params?: {
    page?: number;
    limit?: number;
    filter?: string;
    subjectKey?: string;
    studentId?: string;
    student?: string;
  }) =>
    api.get<{
      success: boolean;
      data: {
        targets: SyllabusModuleTargetItem[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasPrev: boolean;
          hasNext: boolean;
        };
      };
    }>("/api/admin/syllabus-targets", { params }),
  assign: (body: {
    subjectKey: string;
    moduleIds: string[];
    studentIds: string[];
    dueDate?: string | null;
    note?: string;
    medium?: "en" | "hi";
  }) => api.post("/api/admin/syllabus-targets", body),
  updateAssign: (
    id: string,
    body: { studentIds: string[]; dueDate?: string | null; note?: string }
  ) => api.patch(`/api/admin/syllabus-targets/${id}/assign`, body),
  archive: (id: string) => api.patch(`/api/admin/syllabus-targets/${id}/archive`),
  delete: (id: string) => api.delete(`/api/admin/syllabus-targets/${id}`),
  // Student
  listMine: (params?: { includeCompleted?: boolean }) =>
    api.get<{
      success: boolean;
      data: {
        targets: StudentSyllabusTarget[];
        activeCount: number;
        completedCount: number;
      };
    }>("/api/syllabus-targets/mine", { params }),
  toggleComplete: (id: string, completed = true) =>
    api.post<{
      success: boolean;
      data: { _id: string; completed: boolean; completedChapters?: string[] };
    }>(`/api/syllabus-targets/${id}/complete`, { completed }),
  toggleChapterComplete: (id: string, chapter: string, completed = true) =>
    api.post<{
      success: boolean;
      data: {
        _id: string;
        chapter: string;
        completedChapters: string[];
        completed: boolean;
      };
    }>(`/api/syllabus-targets/${id}/chapters/complete`, { chapter, completed }),
  /** Tick chapter → 20 Hard RAG questions from Knowledge Base + start test */
  startChapterPractice: (id: string, chapter: string) =>
    api.post<{
      success: boolean;
      message?: string;
      data: {
        testId: string;
        test: { _id: string; subject: string; topic: string; difficulty?: string; totalQuestions: number };
        fromCache?: boolean;
        chapter: string;
        topicName: string;
        relatedTopics?: string[];
        nextChapter?: string | null;
        completedChapters: string[];
        completed: boolean;
      };
    }>(
      `/api/syllabus-targets/${id}/chapters/practice`,
      { chapter },
      { timeout: 300000 }
    ),
  /** All chapters done → 50Q final: chapter-bank reuse + RAG top-up for shortfall */
  startModuleFinal: (id: string) =>
    api.post<{
      success: boolean;
      message?: string;
      data: {
        testId: string;
        test: { _id: string; subject: string; topic: string; totalQuestions: number };
        chaptersComplete: boolean;
        completed: boolean;
      };
    }>(`/api/syllabus-targets/${id}/module-final`, {}, { timeout: 300000 }),
};

// DART – Daily Activity & Reflection Tracker API
export const dartAPI = {
  submit: (body: Record<string, unknown>) => api.post("/api/dart", body),
  getEntries: (params?: { from?: string; to?: string }) =>
    api.get("/api/dart/entries", { params }),
  getAnalytics: (params?: { days?: number }) =>
    api.get("/api/dart/analytics", { params }),
  downloadReport: (params: { days?: number; from?: string; to?: string }) =>
    api.get("/api/dart/report", { params, responseType: "blob" }),
  download15DayReport: () =>
    api.get("/api/dart/report-15day", { responseType: "blob" }),
  // Admin: view student DART analytics
  getStudentAnalytics: (studentId: string, days?: number) =>
    api.get(`/api/admin/students/${studentId}/dart-analytics`, {
      params: days ? { days } : undefined,
    }),
  getStudentReport20Day: (studentId: string) =>
    api.get(`/api/admin/students/${studentId}/dart-report-15day`, {
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
  syllabusModule?: string | null;
  syllabusTopicId?: string | null;
  taskType: "subject_study" | "current_affairs" | "mcq_practice" | "revision" | "mock_test";
  duration: number;
  difficulty?: "easy" | "medium" | "hard";
  priority?: "low" | "medium" | "high";
  sortOrder?: number;
  startTime?: string | null;
  endTime?: string | null;
  completed: boolean;
  completedAt: string | null;
  rescheduledFrom?: string | null;
  readingStartedAt?: string | null;
  practiceUnlocked?: boolean;
  parentTaskId?: string | null;
  revisionDueDate?: string | null;
}

export interface StudyPlanBadge {
  id: string;
  name: string;
  icon: string;
  earnedAt?: string;
}

export interface StudyPlanInsight {
  _id?: string;
  type: "warning" | "success" | "tip";
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  subject?: string | null;
  createdAt?: string;
}

export interface StudyPlanType {
  _id: string;
  userId: string;
  examDate: string;
  examType?: "UPSC" | "MPPSC";
  targetYear?: string;
  dailyHours: number;
  preparationLevel: "beginner" | "intermediate" | "advanced";
  weakSubjects?: string[];
  strongSubjects?: string[];
  optionalSubject?: string;
  sleepTime?: string;
  wakeTime?: string;
  preferredSession?: "morning" | "afternoon" | "evening" | "night";
  mockTestAverageScore?: number;
  motivationalLine?: string;
  weeklyGoals?: string[];
  monthlyTargets?: string[];
  revisionStrategy?: string;
  readinessScore?: number;
  readinessBreakdown?: {
    mockScores: number;
    completion: number;
    revision: number;
    consistency: number;
    studyHours: number;
  };
  xpPoints?: number;
  badges?: StudyPlanBadge[];
  aiInsights?: StudyPlanInsight[];
  heatmap?: { date: string; completedTasks: number; totalTasks: number; studyMinutes: number }[];
  dailyQuote?: string;
  subjects: string[];
  tasks: StudyPlanTask[];
  currentStreak: number;
  lastCompletedDate: string | null;
  longestStreak: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvancedPlannerSetup {
  examDate: string;
  examType?: "UPSC" | "MPPSC";
  targetYear?: string;
  dailyHours?: number;
  weakSubjects?: string[];
  strongSubjects?: string[];
  optionalSubject?: string;
  preparationLevel?: string;
  sleepTime?: string;
  wakeTime?: string;
  preferredSession?: string;
  mockTestAverageScore?: number;
}

export interface PlannerAnalytics {
  consistency: { date: string; label: string; completed: number; total: number; percent: number }[];
  subjectStrength: { subject: string; strength: number; completed: number; total: number }[];
  weakTopics: { topic: string; accuracy: number }[];
  dailyHours: { date: string; label: string; hours: number }[];
  mockPerformance: { date: string; score: number; name: string }[];
  completionPercent: number;
  heatmap: { date: string; completedTasks: number; totalTasks: number; studyMinutes: number }[];
}

export interface PlannerDashboard {
  plan: StudyPlanType;
  progress: StudyPlanProgress;
  daysRemaining: number | null;
  dailyTasks: StudyPlanTask[];
  analytics: PlannerAnalytics;
  insights: StudyPlanInsight[];
  streak: { current: number; longest: number; xp: number; badges: StudyPlanBadge[] };
  readiness: { score: number; breakdown: StudyPlanType["readinessBreakdown"] };
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

// Advanced AI Study Planner
export const advancedStudyPlannerAPI = {
  generatePlan: (data: AdvancedPlannerSetup) =>
    api.post<{ success: boolean; plan: StudyPlanType; progress: StudyPlanProgress; daysRemaining: number }>(
      "/api/study-planner/generate-plan",
      data
    ),
  regeneratePlan: (data: AdvancedPlannerSetup) =>
    api.post<{ success: boolean; plan: StudyPlanType; progress: StudyPlanProgress; daysRemaining: number }>(
      "/api/study-planner/regenerate-plan",
      data
    ),
  getDashboard: (date?: string) =>
    api.get<PlannerDashboard | { plan: null }>("/api/study-planner/dashboard", {
      params: date ? { date } : undefined,
    }),
  getDailyTasks: (date?: string) =>
    api.get("/api/study-planner/daily-tasks", { params: date ? { date } : undefined }),
  completeTask: (taskId: string) =>
    api.post<{ plan: StudyPlanType; task: StudyPlanTask; progress: StudyPlanProgress }>(
      "/api/study-planner/complete-task",
      { taskId }
    ),
  reorderTasks: (date: string, taskIds: string[]) =>
    api.post<{ plan: StudyPlanType }>("/api/study-planner/reorder-tasks", { date, taskIds }),
  analyzeMock: (data: Record<string, unknown>) =>
    api.post("/api/study-planner/analyze-mock", data),
  getAnalytics: () => api.get<{ analytics: PlannerAnalytics }>("/api/study-planner/analytics"),
  aiChat: (message: string) => api.post<{ reply: string }>("/api/study-planner/ai-chat", { message }),
  refreshInsights: () => api.post<{ insights: StudyPlanInsight[] }>("/api/study-planner/refresh-insights"),
  regenerateMotivation: () => api.post<{ motivationalLine: string }>("/api/study-planner/regenerate-motivation"),
  generateSmartPlan: (data: AdvancedPlannerSetup) =>
    api.post<{ success: boolean; plan: StudyPlanType; progress: StudyPlanProgress; daysRemaining: number }>(
      "/api/study-planner/generate-smart-plan",
      data
    ),
  getDailyPlan: (date?: string) =>
    api.get<PlannerDashboard | { plan: null }>("/api/study-planner/daily-plan", {
      params: date ? { date } : undefined,
    }),
  completeTopic: (taskId: string) =>
    api.post<{
      success: boolean;
      plan: StudyPlanType;
      task: StudyPlanTask;
      mcqTask?: StudyPlanTask;
      practiceRoute: string;
      progress: StudyPlanProgress;
      readiness: { readinessScore: number; readinessBreakdown: StudyPlanType["readinessBreakdown"] };
    }>("/api/study-planner/complete-topic", { taskId }),
  startPractice: (taskId: string) =>
    api.post<{
      success: boolean;
      task: StudyPlanTask;
      routes: { mcq: string; pyq: string };
      questionCount: number;
    }>("/api/study-planner/practice-start", { taskId }),
  getRevisionTasks: (date?: string) =>
    api.get<{ date: string; tasks: StudyPlanTask[]; schedule: unknown[] }>("/api/study-planner/revision-tasks", {
      params: date ? { date } : undefined,
    }),
  getReadinessScore: () =>
    api.get<{ score: number; breakdown: StudyPlanType["readinessBreakdown"]; examType: string; targetYear?: string }>(
      "/api/study-planner/readiness-score"
    ),
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