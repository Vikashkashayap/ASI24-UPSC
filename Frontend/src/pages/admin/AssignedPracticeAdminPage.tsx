import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2,
  Trash2,
  Check,
  UserCheck,
  Search,
  Users,
  Sparkles,
  UserPlus,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Pencil,
  Link2,
  RefreshCw,
  BookOpen,
  Eye,
  Upload,
  FileText,
  Database,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { assignedPracticeAPI, adminAPI, notesAPI, type NotesChapter, type NotesTopic, type PreviewQuestion, type GenerationProgress } from "../../services/api";
import { PRELIM_MOCK_PATTERNS } from "../../constants/testGenerator";

const DEFAULT_PATTERNS = PRELIM_MOCK_PATTERNS.map((p) => p.id);

interface AssignedPracticeItem {
  _id: string;
  subject: string;
  topic: string;
  chapter?: string;
  title: string;
  displayTitle?: string;
  searchQuery?: string;
  difficulty: string;
  totalQuestions: number;
  status: "generating" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  attemptCount: number;
  isAssigned: boolean;
  assignedCount?: number;
  startedStudentIds?: string[];
  assignedStudents: { _id: string; name: string; email: string }[];
}

interface ListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

interface StudentRow {
  _id: string;
  name: string;
  email: string;
}

interface GeneratedTestSummary {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  totalQuestions: number;
  difficulty: string;
  generationStats?: {
    notesSource?: string;
    chunksRetrieved?: number;
    totalTokens?: number;
  };
}

function buildSelectedTopicLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} · +${names.length - 2} more`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function studentInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

function listItemTitle(item: AssignedPracticeItem): string {
  if (item.displayTitle) return item.displayTitle;
  const raw = item.title || `${item.subject} — ${item.topic}`;
  if (raw.length <= 100) return raw;
  return `${raw.slice(0, 97).trim()}…`;
}

/** Short topic line for list rows (never dumps full multi-topic string). */
function listTopicFocus(item: AssignedPracticeItem): string {
  const search = item.searchQuery?.trim();
  if (search) return search.length > 72 ? `${search.slice(0, 69)}…` : search;

  const topic = String(item.topic || "").trim();
  if (!topic) return "";

  const parts = topic
    .split(/\s*[·•|]\s*|\s+·\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\+\d+\s+more$/i.test(p));

  if (parts.length <= 2) {
    const joined = parts.join(" · ") || topic;
    return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;
  }
  return `${parts.slice(0, 2).join(" · ")} · +${parts.length - 2} more`;
}

export const AssignedPracticeAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Step 1 — generate (notes-linked)
  const [notesSubjects, setNotesSubjects] = useState<string[]>([]);
  const [notesSubjectsLoading, setNotesSubjectsLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<NotesChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chapterId, setChapterId] = useState("");
  const [topics, setTopics] = useState<NotesTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [topicKeyword, setTopicKeyword] = useState("");
  const [keywordMatch, setKeywordMatch] = useState<{
    matchedChunks: number;
    source: string;
    preview: Array<{ heading: string; page: number | null; excerpt: string }>;
  } | null>(null);
  const [keywordSearching, setKeywordSearching] = useState(false);
  const [syncingChapterUrl, setSyncingChapterUrl] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reindexingChapter, setReindexingChapter] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfAddInputRef = useRef<HTMLInputElement>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [questionCount, setQuestionCount] = useState<50 | 100>(50);
  const [patternsToInclude, setPatternsToInclude] = useState<string[]>(DEFAULT_PATTERNS);
  const [generating, setGenerating] = useState(false);
  const [generationTestId, setGenerationTestId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationProgress | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<PreviewQuestion | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [fillingHindi, setFillingHindi] = useState(false);

  // Step 1.5 — preview AI-generated questions from notes
  const [flowStep, setFlowStep] = useState<"form" | "preview" | "assign">("form");
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [backupQuestions, setBackupQuestions] = useState<PreviewQuestion[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 10;

  // Step 2 — assign
  const [activeTest, setActiveTest] = useState<GeneratedTestSummary | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lockedStudentIds, setLockedStudentIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  // List
  const [list, setList] = useState<AssignedPracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listFilter, setListFilter] = useState<"all" | "unassigned" | "assigned">("all");
  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 5;
  const [listPagination, setListPagination] = useState<ListPagination | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
    loadNotesSubjects();
  }, []);

  useEffect(() => {
    loadList();
  }, [listPage, listFilter]);

  useEffect(() => {
    if (!generationTestId) return;
    const timer = setInterval(async () => {
      try {
        const res = await assignedPracticeAPI.getById(generationTestId);
        if (!res.data?.success || !res.data?.data) return;
        const data = res.data.data;
        const gp = (data.generationProgress || {}) as GenerationProgress;
        setGenerationStatus({
          totalBatches: gp.totalBatches || Math.ceil(questionCount / 10),
          completedBatches: gp.completedBatches || 0,
          currentBatch: gp.currentBatch || 0,
          generatedQuestions: gp.generatedQuestions || 0,
          failedBatches: gp.failedBatches,
          isComplete: gp.isComplete,
          currentStep: gp.currentStep,
          readingNotes: gp.readingNotes,
          cleaningHtml: gp.cleaningHtml,
          batchSteps: gp.batchSteps,
          approved: gp.approved,
        });

        const liveQuestions = data.questions || data.partialQuestions || [];
        if (liveQuestions.length > 0) {
          setPreviewQuestions(liveQuestions);
          setFlowStep("preview");
          if (!activeTest) {
            setActiveTest({
              _id: data._id,
              subject: data.subject,
              topic: data.topic,
              title: data.title || `${data.subject} — ${data.topic}`,
              // Keep intended target (50/100), not live partial count
              totalQuestions: questionCount,
              difficulty: data.difficulty,
            });
          }
        }

        if (data.status === "ready") {
          setGenerationTestId(null);
          setGenerating(false);
          setPreviewQuestions(data.questions || liveQuestions);
          setBackupQuestions(Array.isArray(data.backupQuestions) ? data.backupQuestions : []);
          setPreviewPage(1);
          setActiveTest({
            _id: data._id,
            subject: data.subject,
            topic: data.topic,
            title: data.title || `${data.subject} — ${data.topic}`,
            totalQuestions: data.totalQuestions,
            difficulty: data.difficulty,
            generationStats: data.generationStats
              ? {
                  notesSource: data.generationStats.notesSource,
                  chunksRetrieved: data.generationStats.chunksRetrieved,
                  totalTokens: data.generationStats.totalTokens,
                }
              : undefined,
          });
          setFlowStep("preview");
          setSuccess(
            `${data.totalQuestions || questionCount} questions generated via ${
              data.generationStats?.notesSource?.includes("rag") ? "RAG knowledge base" : "Notes"
            }.`
          );
          setListPage(1);
          loadList({ page: 1 });
        } else if (data.status === "failed") {
          setGenerationTestId(null);
          setGenerating(false);
          if (liveQuestions.length > 0) {
            setError(data.errorMessage || "Generation incomplete — review partial questions below.");
          } else {
            setError(data.errorMessage || "Generation failed");
          }
          loadList();
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [generationTestId]);

  const loadNotesSubjects = async () => {
    setNotesSubjectsLoading(true);
    try {
      const res = await notesAPI.getSubjects();
      if (res.data?.success) {
        const list = res.data.data || [];
        setNotesSubjects(list);
        if (list.length && !subject) setSubject(list[0]);
      }
    } catch {
      setError("Failed to load notes subjects. Sync chapters from notes.mentorsdaily.com first.");
    } finally {
      setNotesSubjectsLoading(false);
    }
  };

  useEffect(() => {
    if (!subject) {
      setChapters([]);
      setChapterId("");
      setTopics([]);
      setSelectedTopicIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setChaptersLoading(true);
      try {
        const res = await notesAPI.getChapters(subject);
        if (!cancelled && res.data?.success) {
          const list = res.data.data || [];
          setChapters(list);
          const firstSynced = list.find((c) => c._id && c.synced);
          const first = firstSynced || list[0];
          setChapterId(first ? (first._id || first.url) : "");
        }
      } catch {
        if (!cancelled) setChapters([]);
      } finally {
        if (!cancelled) setChaptersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(() => {
    if (!chapterId || chapterId.startsWith("http")) {
      setTopics([]);
      setSelectedTopicIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTopicsLoading(true);
      try {
        const res = await notesAPI.getTopics(chapterId);
        if (!cancelled && res.data?.success) {
          const list = res.data.data || [];
          setTopics(list);
          setSelectedTopicIds(list[0]?._id ? [list[0]._id] : []);
        }
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c._id === chapterId || c.url === chapterId) || null,
    [chapters, chapterId]
  );

  const isPdfChapter = Boolean(
    selectedChapter &&
      (selectedChapter.sourceType === "pdf" ||
        selectedChapter.hasPdf ||
        String(selectedChapter.url || "").startsWith("pdf://"))
  );

  const isWebChapter = Boolean(
    selectedChapter && /^https?:\/\//i.test(String(selectedChapter.url || ""))
  );

  /** Ready when synced from notes/PDF, or topics already have chunks. */
  const chapterReady = Boolean(
    selectedChapter?.synced ||
      (topics.length > 0 && topics.some((t) => (t.chunkCount || 0) > 0))
  );

  const chapterNeedsSync = selectedChapter && !selectedChapter.synced && isWebChapter && !chapterReady;
  const chapterNeedsContent = Boolean(selectedChapter && !chapterReady);
  const knowledgeReady =
    chapterReady || chapters.some((c) => Boolean(c.synced && (c.chunkCount || 0) > 0));
  const pdfKnowledgeCount = chapters.filter((c) => c.sourceType === "pdf" || c.hasPdf).length;

  const selectedPatternsLabel = useMemo(() => {
    if (patternsToInclude.length === DEFAULT_PATTERNS.length) return "All 10 UPSC patterns";
    if (patternsToInclude.length === 0) return "No patterns selected";
    return patternsToInclude
      .map((id) => PRELIM_MOCK_PATTERNS.find((p) => p.id === id)?.label || id)
      .join(", ");
  }, [patternsToInclude]);

  const selectedTopics = useMemo(
    () => topics.filter((t) => selectedTopicIds.includes(t._id)),
    [topics, selectedTopicIds]
  );

  const keywordTrimmed = topicKeyword.trim();
  const keywordMode = keywordTrimmed.length >= 2;

  const filteredTopics = useMemo(() => {
    if (!keywordTrimmed) return topics;
    const q = keywordTrimmed.toLowerCase();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.heading || "").toLowerCase().includes(q)
    );
  }, [topics, keywordTrimmed]);

  const selectedTopicChunkTotal = useMemo(
    () => selectedTopics.reduce((sum, t) => sum + (t.chunkCount || 0), 0),
    [selectedTopics]
  );

  // Debounced chapter keyword search preview
  useEffect(() => {
    if (!selectedChapter?._id || keywordTrimmed.length < 2) {
      setKeywordMatch(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setKeywordSearching(true);
      try {
        const res = await notesAPI.searchChunks({
          subject,
          q: keywordTrimmed,
        });
        if (!cancelled && res.data?.success) {
          setKeywordMatch({
            matchedChunks: res.data.data.matchedChunks,
            source: res.data.data.source,
            preview: res.data.data.preview || [],
          });
        }
      } catch {
        if (!cancelled) setKeywordMatch(null);
      } finally {
        if (!cancelled) setKeywordSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [topicKeyword, subject]);

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopicIds(topics.map((t) => t._id));
  };

  const clearTopicSelection = () => {
    setSelectedTopicIds([]);
  };

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await adminAPI.getStudents({ page: 1, limit: 10000, mentorPicker: true });
      if (res.data?.success) setStudents(res.data.data.students || []);
    } catch {
      /* non-fatal */
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadList = async (override?: { page?: number; filter?: "all" | "unassigned" | "assigned" }) => {
    const page = override?.page ?? listPage;
    const filter = override?.filter ?? listFilter;
    try {
      setLoading(true);
      const res = await assignedPracticeAPI.listAdmin({
        page,
        limit: LIST_PAGE_SIZE,
        filter,
      });
      if (res.data.success) {
        setList(res.data.data || []);
        const p = res.data.pagination;
        if (p) {
          setListPagination({
            page: p.page,
            limit: p.limit,
            total: p.total,
            totalPages: p.totalPages,
            hasPrev: p.hasPrev,
            hasNext: p.hasNext,
          });
          if (p.page !== listPage) setListPage(p.page);
        } else {
          setListPagination(null);
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s._id)),
    [students, selectedStudentIds]
  );

  const setFilterAndResetPage = (f: "all" | "unassigned" | "assigned") => {
    setListFilter(f);
    setListPage(1);
  };

  const toggleStudent = (id: string) => {
    if (lockedStudentIds.has(id)) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      lockedStudentIds.forEach((id) => next.add(id));
      filteredStudents.forEach((s) => next.add(s._id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set(lockedStudentIds));
  };

  const startAssignFlow = (item: AssignedPracticeItem | GeneratedTestSummary) => {
    setIsEditMode(false);
    setLockedStudentIds(new Set());
    setActiveTest({
      _id: item._id,
      subject: item.subject,
      topic: item.topic,
      title: item.title || `${item.subject} — ${item.topic}`,
      totalQuestions: item.totalQuestions,
      difficulty: item.difficulty,
    });
    setSelectedStudentIds(new Set());
    setStudentSearch("");
    setError(null);
    setSuccess(null);
    setFlowStep("assign");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditAssignFlow = (item: AssignedPracticeItem) => {
    const locked = new Set((item.startedStudentIds || []).map(String));
    setIsEditMode(true);
    setLockedStudentIds(locked);
    setActiveTest({
      _id: item._id,
      subject: item.subject,
      topic: item.topic,
      title: item.title || `${item.subject} — ${item.topic}`,
      totalQuestions: item.totalQuestions,
      difficulty: item.difficulty,
    });
    setSelectedStudentIds(new Set(item.assignedStudents.map((s) => String(s._id))));
    setStudentSearch("");
    setError(null);
    setSuccess(null);
    setFlowStep("assign");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startPreviewFromList = async (item: AssignedPracticeItem) => {
    setError(null);
    try {
      const res = await assignedPracticeAPI.getById(item._id);
      if (res.data?.success && res.data.data) {
        const data = res.data.data;
        setPreviewQuestions(data.questions || []);
        setBackupQuestions(Array.isArray(data.backupQuestions) ? data.backupQuestions : []);
        setPreviewPage(1);
        setActiveTest({
          _id: data._id,
          subject: data.subject,
          topic: data.topic,
          title: data.title,
          totalQuestions: data.totalQuestions,
          difficulty: data.difficulty,
        });
        setFlowStep("preview");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Failed to load questions for preview");
    }
  };

  const resetFlow = () => {
    setActiveTest(null);
    setFlowStep("form");
    setPreviewQuestions([]);
    setBackupQuestions([]);
    setPreviewPage(1);
    setIsEditMode(false);
    setLockedStudentIds(new Set());
    setSelectedStudentIds(new Set());
    setStudentSearch("");
    setSelectedTopicIds(topics[0]?._id ? [topics[0]._id] : []);
  };

  const handleRepairNames = async () => {
    if (!selectedChapter?._id || !selectedChapter.synced) return;
    setSyncingChapterUrl(selectedChapter.url);
    setError(null);
    try {
      const res = await notesAPI.repairChapter(selectedChapter._id);
      if (res.data?.success) {
        setSuccess(res.data.message || "Topic names updated.");
        const topicsRes = await notesAPI.getTopics(selectedChapter._id);
        if (topicsRes.data?.success) {
          setTopics(topicsRes.data.data || []);
          setSelectedTopicIds(topicsRes.data.data?.[0]?._id ? [topicsRes.data.data[0]._id] : []);
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to fix topic names");
    } finally {
      setSyncingChapterUrl(null);
    }
  };

  const handleSyncChapter = async (chapter?: NotesChapter) => {
    const ch = chapter || selectedChapter;
    if (!ch || !subject) {
      setError("Select a chapter to sync");
      return;
    }
    if (ch.sourceType === "pdf" || String(ch.url || "").startsWith("pdf://")) {
      setError("This is a PDF chapter. Use Upload PDF / Re-process instead of website sync.");
      return;
    }
    const slug = ch.slug || ch.url.replace(/\/$/, "").split("/").pop() || "";
    setSyncingChapterUrl(ch.url);
    setError(null);
    try {
      const res = await notesAPI.syncBySlug({ slug, subject, title: ch.title });
      if (res.data?.success) {
        setSuccess(res.data.message || `Synced "${ch.title}" from notes website.`);
        const chaptersRes = await notesAPI.getChapters(subject);
        if (chaptersRes.data?.success) {
          const list = chaptersRes.data.data || [];
          setChapters(list);
          const synced = list.find((c) => c.url === ch.url && c._id);
          if (synced?._id) {
            setChapterId(synced._id);
            // Auto-repair names after sync (handles any edge cases)
            try {
              await notesAPI.repairChapter(synced._id);
            } catch {
              /* non-fatal */
            }
            const topicsRes = await notesAPI.getTopics(synced._id);
            if (topicsRes.data?.success) {
              setTopics(topicsRes.data.data || []);
              setSelectedTopicIds(topicsRes.data.data?.[0]?._id ? [topicsRes.data.data[0]._id] : []);
            }
          }
        }
      } else {
        setError(res.data?.message || "Sync failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to sync chapter");
    } finally {
      setSyncingChapterUrl(null);
    }
  };

  const refreshChapterTopics = async (subjectStr: string, nextChapterId: string) => {
    const chaptersRes = await notesAPI.getChapters(subjectStr);
    if (chaptersRes.data?.success) {
      setChapters(chaptersRes.data.data || []);
    }
    setChapterId(nextChapterId);
    const topicsRes = await notesAPI.getTopics(nextChapterId);
    if (topicsRes.data?.success) {
      const nextTopics = topicsRes.data.data || [];
      setTopics(nextTopics);
      setSelectedTopicIds(nextTopics[0]?._id ? [nextTopics[0]._id] : []);
    }
  };

  const handleUploadPdf = async (fileOrFiles: File | File[], opts?: { replaceChapter?: boolean }) => {
    if (!subject) {
      setError("Select a subject first");
      return;
    }
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (!files.length) return;

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
    }

    const replaceChapter = Boolean(opts?.replaceChapter && selectedChapter?._id && files.length === 1);

    setUploadingPdf(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.uploadPdf({
        files,
        subject,
        ...(replaceChapter
          ? { chapterId: selectedChapter!._id!, title: selectedChapter!.title, forceNew: false }
          : {
              forceNew: true,
              addToKnowledge: true,
              title: selectedChapter?.title,
            }),
      });
      if (!res.data?.success) {
        setError(res.data?.message || "PDF upload failed");
        return;
      }

      setSuccess(
        res.data.message ||
          `Added ${files.length} PDF(s) to knowledge. Topic keyword search uses PDF + website notes.`
      );

      const chaptersRes = await notesAPI.getChapters(subject);
      if (chaptersRes.data?.success) {
        const list = chaptersRes.data.data || [];
        setChapters(list);
        const nextId =
          res.data.data?.chapter?._id ||
          list.find((c) => c.sourceType === "pdf" && c.synced)?._id ||
          selectedChapter?._id;
        if (nextId) {
          setChapterId(nextId);
          const topicsRes = await notesAPI.getTopics(nextId);
          if (topicsRes.data?.success) {
            const nextTopics = topicsRes.data.data || [];
            setTopics(nextTopics);
            setSelectedTopicIds(nextTopics[0]?._id ? [nextTopics[0]._id] : []);
          }
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to upload / process PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      if (pdfAddInputRef.current) pdfAddInputRef.current.value = "";
    }
  };

  const handleReindexChapter = async () => {
    if (!selectedChapter?._id) {
      setError("Select a synced chapter to re-index embeddings");
      return;
    }
    setReindexingChapter(true);
    setError(null);
    try {
      const res = await notesAPI.reindexChapter(selectedChapter._id, false);
      if (res.data?.success) {
        setSuccess(res.data.message || "Embeddings re-indexed.");
        await refreshChapterTopics(subject, selectedChapter._id);
      } else {
        setError(res.data?.message || "Re-index failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to re-index embeddings");
    } finally {
      setReindexingChapter(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectStr = subject || "";
    const topicNames = selectedTopics.map((t) => t.name.trim()).filter(Boolean);
    const topicStrFromList = buildSelectedTopicLabel(topicNames);
    const chapterStr = selectedChapter?.title?.trim() || "";
    const useKeyword = keywordTrimmed.length >= 2;

    if (!subjectStr) {
      setError("Select a subject");
      return;
    }
    if (!useKeyword && !selectedChapter?._id) {
      setError("Select a synced chapter (sync from notes or upload a PDF first)");
      return;
    }
    if (!knowledgeReady) {
      setError("No knowledge yet. Upload PDF(s) and/or sync website notes for this subject.");
      return;
    }
    if (!useKeyword && (selectedTopicIds.length === 0 || topicNames.length === 0)) {
      setError("Type a topic keyword above, or select at least one topic from the list");
      return;
    }
    if (!useKeyword && selectedTopicChunkTotal === 0) {
      setError("Selected topics have no chunks. Re-upload PDF or sync the chapter.");
      return;
    }
    if (useKeyword && keywordMatch && keywordMatch.matchedChunks === 0) {
      setError(`No matching content for "${keywordTrimmed}" in PDF/notes knowledge. Try another keyword.`);
      return;
    }
    if (patternsToInclude.length === 0) {
      setError("Select at least one question pattern");
      return;
    }
    setError(null);
    setSuccess(null);
    setGenerating(true);
    try {
      const payloadBase = {
        difficulty,
        patternsToInclude,
        questionCount,
      };
      const res = await assignedPracticeAPI.generate(
        useKeyword
          ? {
              subject: subjectStr,
              topic: keywordTrimmed,
              chapter: chapterStr,
              chapterId: selectedChapter._id,
              searchQuery: keywordTrimmed,
              ...payloadBase,
            }
          : {
              subject: subjectStr,
              topic: topicStrFromList,
              chapter: chapterStr,
              chapterId: selectedChapter._id,
              notesTopicIds: selectedTopicIds,
              notesTopicId: selectedTopicIds[0],
              ...payloadBase,
            }
      );
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setGenerationTestId(data._id);
        setGenerationStatus({
          completedBatches: data.generationProgress?.completedBatches || 0,
          totalBatches: data.generationProgress?.totalBatches || Math.ceil(questionCount / 10),
          generatedQuestions: data.generationProgress?.generatedQuestions || 0,
          currentBatch: data.generationProgress?.currentBatch || 0,
        });
        setActiveTest({
          _id: data._id,
          subject: data.subject,
          topic: data.topic,
          title: data.title || `${data.subject} — ${data.topic}`,
          totalQuestions: data.totalQuestions || questionCount,
          difficulty: data.difficulty || difficulty,
        });
        const planned =
          data.generationProgress?.totalBatches || Math.ceil(questionCount / 10);
        setSuccess(
          useKeyword
            ? `Searching PDF/notes for "${keywordTrimmed}" and generating ${questionCount} questions via RAG…`
            : `Generation started. Creating ${questionCount} questions (~${planned} RAG batches).`
        );
        loadList();
      } else {
        setError(res.data.message || "Failed to generate test");
        setGenerating(false);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to generate test");
      setGenerating(false);
    }
  };

  const continueToAssign = () => {
    setFlowStep("assign");
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditQuestion = (q: PreviewQuestion) => {
    setEditingQuestionIndex(q.index - 1);
    setEditDraft({ ...q });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionIndex(null);
    setEditDraft(null);
  };

  const handleSaveQuestion = async () => {
    if (!activeTest || editingQuestionIndex === null || !editDraft) return;
    setSavingQuestions(true);
    setError(null);
    try {
      const res = await assignedPracticeAPI.updateQuestion(activeTest._id, editingQuestionIndex, {
        question: editDraft.question,
        options: editDraft.options,
        correctAnswer: editDraft.correctAnswer,
        explanation: editDraft.explanation,
        difficulty: editDraft.difficulty,
        questionType: editDraft.questionType,
      });
      if (res.data?.success) {
        setPreviewQuestions(res.data.data || []);
        setSuccess("Question saved.");
        cancelEditQuestion();
      } else {
        setError(res.data?.message || "Failed to save question");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to save question");
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (q: PreviewQuestion) => {
    if (!activeTest) return;
    if (!window.confirm(`Delete question ${q.index}?`)) return;
    setError(null);
    try {
      const res = await assignedPracticeAPI.deleteQuestion(activeTest._id, q.index - 1);
      if (res.data?.success) {
        setPreviewQuestions(res.data.data || []);
        setActiveTest((prev) =>
          prev ? { ...prev, totalQuestions: (res.data.data || []).length } : prev
        );
        setSuccess("Question deleted.");
        if (editingQuestionIndex === q.index - 1) cancelEditQuestion();
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to delete question");
    }
  };

  const handleRegenerateQuestion = async (q: PreviewQuestion) => {
    if (!activeTest) return;
    setRegeneratingIndex(q.index - 1);
    setError(null);
    try {
      const res = await assignedPracticeAPI.regenerateQuestion(activeTest._id, q.index - 1);
      if (res.data?.success) {
        setPreviewQuestions(res.data.data || []);
        setSuccess(`Question ${q.index} regenerated from notes.`);
      } else {
        setError(res.data?.message || "Regeneration failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to regenerate question");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleApproveTest = async () => {
    if (!activeTest) return;
    setApproving(true);
    setError(null);
    try {
      const res = await assignedPracticeAPI.approve(activeTest._id);
      if (res.data?.success) {
        setPreviewQuestions(res.data.data?.questions || previewQuestions);
        setSuccess(res.data.message || "Test approved. You can assign students.");
        setGenerating(false);
        setGenerationTestId(null);
        loadList();
      } else {
        setError(res.data?.message || "Approve failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to approve test");
    } finally {
      setApproving(false);
    }
  };

  const handleFillMissingHindi = async () => {
    if (!activeTest) return;
    setFillingHindi(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await assignedPracticeAPI.fillHindi(activeTest._id);
      if (res.data?.success) {
        const qs = res.data.data?.questions;
        if (Array.isArray(qs) && qs.length) setPreviewQuestions(qs);
        setSuccess(res.data.message || "Missing Hindi filled");
        loadList();
      } else {
        setError(res.data?.message || "Fill Hindi failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to fill missing Hindi");
    } finally {
      setFillingHindi(false);
    }
  };

  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    const gs = generationStatus;
    const targetQ = activeTest?.totalQuestions || questionCount;
    const totalBatches = Math.max(1, gs.totalBatches || Math.ceil(targetQ / 10));
    const completed = Math.min(
      totalBatches,
      Math.max(0, Number(gs.completedBatches) || 0)
    );
    const current = Math.min(
      totalBatches,
      Math.max(completed, Number(gs.currentBatch) || 0)
    );
    const batchDone = (n: number) =>
      completed >= n || Boolean(gs.batchSteps?.[String(n - 1)]);
    const showAllBatches = totalBatches <= 6;
    const isFinalizing =
      gs.currentStep === "finalizing" ||
      gs.currentStep === "translating_hindi" ||
      (gs.generatedQuestions || 0) >= targetQ;
    const steps = [
      { key: "reading", label: "Reading Notes", done: Boolean(gs.readingNotes) },
      { key: "cleaning", label: "Cleaning HTML", done: Boolean(gs.cleaningHtml) },
      ...(showAllBatches
        ? Array.from({ length: totalBatches }, (_, i) => ({
            key: `batch-${i + 1}`,
            label: `Generating Batch ${i + 1} of ${totalBatches}`,
            done: batchDone(i + 1) || isFinalizing,
          }))
        : [
            {
              key: "batches",
              label: `Generating batches (${isFinalizing ? totalBatches : Math.max(completed, current)}/${totalBatches})`,
              done: completed >= totalBatches || isFinalizing,
            },
          ]),
      {
        key: "done",
        label:
          gs.currentStep === "translating_hindi"
            ? "Translating Hindi…"
            : isFinalizing && !gs.isComplete
              ? "Finalizing…"
              : "Completed",
        done: Boolean(gs.isComplete),
      },
    ];

    return (
      <div className={`rounded-lg border p-3 space-y-2 ${isDark ? "border-blue-800/40 bg-blue-950/20" : "border-blue-200 bg-blue-50"}`}>
        <p className={`text-sm font-medium ${isDark ? "text-blue-200" : "text-blue-900"}`}>
          Generating {targetQ} questions from MentorsDaily Notes
        </p>
        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.key} className={`flex items-center gap-2 text-xs ${isDark ? "text-blue-200" : "text-blue-800"}`}>
              {step.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />
              )}
              {step.label}
            </li>
          ))}
        </ul>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${Math.min(100, (gs.generatedQuestions / Math.max(1, targetQ)) * 100)}%` }}
          />
        </div>
        <p className={`text-xs ${isDark ? "text-blue-300/80" : "text-blue-700"}`}>
          Questions Generated: {gs.generatedQuestions}/{targetQ}
        </p>
      </div>
    );
  };

  const previewSlice = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return previewQuestions.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [previewQuestions, previewPage]);

  const previewTotalPages = Math.max(1, Math.ceil(previewQuestions.length / PREVIEW_PAGE_SIZE));

  const handleAssign = async () => {
    if (!activeTest) return;
    if (selectedStudentIds.size === 0) {
      setError("Select at least one student to assign");
      return;
    }
    setError(null);
    setSuccess(null);
    setAssigning(true);
    try {
      const res = await assignedPracticeAPI.assign(activeTest._id, Array.from(selectedStudentIds));
      if (res.data.success) {
        setSuccess(
          isEditMode
            ? res.data.message || `Assignment updated for ${selectedStudentIds.size} student(s).`
            : `Test assigned to ${selectedStudentIds.size} student(s). They will see it under Practice Test.`
        );
        resetFlow();
        setListPage(1);
        loadList({ page: 1 });
      } else {
        setError(res.data.message || "Failed to assign test");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to assign test");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await assignedPracticeAPI.delete(id);
      if (res.data.success) {
        setSuccess("Practice test deleted.");
        setDeleteId(null);
        if (activeTest?._id === id) resetFlow();
        loadList();
      } else {
        setError(res.data.message || "Delete failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = isDark
    ? "bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
    : "bg-white border-slate-300 text-slate-900";

  return (
    <div className={`max-w-5xl mx-auto space-y-6 px-1 ${flowStep === "assign" ? "pb-10" : "pb-8"}`}>
      {/* Header */}
      <div className={`rounded-xl border-2 p-4 md:p-6 ${isDark ? "bg-slate-800/50 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
        <h1 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-500" />
          Topic Practice
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {flowStep === "assign"
            ? "Select students to assign this practice test. They will see it under Practice Test."
            : "Select chapter & topic from Notes → AI generates 50 or 100 MCQs (RAG) → Preview & edit → Assign students"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
            flowStep === "form"
              ? "bg-blue-600 text-white"
              : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> 1. Select & Generate
        </span>
        <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
            flowStep === "preview"
              ? "bg-blue-600 text-white"
              : flowStep === "assign"
                ? isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                : isDark ? "bg-slate-700/50 text-slate-500" : "bg-slate-100 text-slate-400"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> 2. Preview Questions
        </span>
        <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
            flowStep === "assign"
              ? "bg-blue-600 text-white"
              : isDark ? "bg-slate-700/50 text-slate-500" : "bg-slate-100 text-slate-400"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> 3. Assign Students
        </span>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-green-950/30 border-green-800 text-green-300" : "bg-green-50 border-green-200 text-green-800"}`}>
          {success}
        </div>
      )}

      {/* Step 1 — Generate */}
      {flowStep === "form" && (
        <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Step 1 — Generate Test
            </CardTitle>
            <CardDescription>
              Select subject → upload one or more PDFs and/or sync website notes. Type a topic keyword —
              we search <strong>PDF + website</strong> knowledge via RAG (only matching chunks go to the AI —
              never the whole document).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Subject (from Notes)
                </label>
                {notesSubjectsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading subjects…
                  </div>
                ) : notesSubjects.length === 0 ? (
                  <p className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                    No synced subjects yet. Add a chapter URL from notes.mentorsdaily.com below.
                  </p>
                ) : (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={generating}
                    className={`w-full px-4 py-2.5 rounded-lg border ${inputCls}`}
                  >
                    {notesSubjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  {notesSubjects.length} UPSC subjects · GS Paper 1–4 + Current Affairs
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Chapters <span className="text-red-500">*</span>
                  {chapters.length > 0 && (
                    <span className={`ml-2 font-normal text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} · click to select
                    </span>
                  )}
                </label>
                {chaptersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading chapters…
                  </div>
                ) : chapters.length === 0 ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    No chapters for this subject.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chapters.map((c) => {
                      const key = c._id || c.url;
                      const val = c._id || c.url;
                      const isSelected = chapterId === val;
                      const isSyncing = syncingChapterUrl === c.url;
                      const isPdf =
                        c.sourceType === "pdf" ||
                        c.hasPdf ||
                        String(c.url || "").startsWith("pdf://");
                      const isWeb = /^https?:\/\//i.test(String(c.url || ""));
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={generating || uploadingPdf}
                          onClick={() => setChapterId(val)}
                          className={`text-left rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? isDark
                                ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500"
                                : "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : isDark
                                ? "border-slate-600 bg-slate-900/40 hover:border-slate-500"
                                : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-medium text-sm leading-snug ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                              {c.title}
                            </p>
                            <span className="flex items-center gap-1 shrink-0">
                              {isPdf && (
                                <span
                                  className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                    isDark ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  PDF
                                </span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {c.synced ? (
                              <span className="text-green-600 dark:text-green-400">
                                ✓ {c.topicCount} topics · {c.chunkCount || 0} chunks
                                {c.embeddingStatus === "indexed" ? " · embedded" : ""}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                {isPdf
                                  ? "↻ PDF pending — upload/process to enable"
                                  : `↻ ~${c.expectedTopicCount || "?"} topics · sync or upload PDF`}
                              </span>
                            )}
                          </p>
                          {c.hasPdf && c.originalFileName && (
                            <p className={`text-[11px] mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                              <FileText className="w-3 h-3 inline mr-1" />
                              {c.originalFileName}
                            </p>
                          )}
                          {!c.synced && isSelected && isWeb && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSyncing) handleSyncChapter(c);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isSyncing) handleSyncChapter(c);
                                }
                              }}
                              className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${
                                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                              }`}
                            >
                              {isSyncing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Sync from notes website
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {chapterNeedsSync && selectedChapter && (
                  <div className={`mt-2 flex flex-wrap items-center gap-2 rounded-lg border p-3 ${isDark ? "border-amber-800/50 bg-amber-950/20" : "border-amber-200 bg-amber-50"}`}>
                    <p className={`text-xs flex-1 min-w-0 ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                      This chapter is not synced yet. Sync from{" "}
                      <a href={selectedChapter.url} target="_blank" rel="noopener noreferrer" className="underline">
                        notes.mentorsdaily.com
                      </a>{" "}
                      or upload a PDF for this chapter below.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSyncChapter(selectedChapter)}
                      disabled={!!syncingChapterUrl || uploadingPdf}
                    >
                      {syncingChapterUrl === selectedChapter.url ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Sync Chapter
                    </Button>
                  </div>
                )}
                {subject && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadPdf(file, { replaceChapter: true });
                      }}
                    />
                    <input
                      ref={pdfAddInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const list = Array.from(e.target.files || []);
                        if (list.length) void handleUploadPdf(list, { replaceChapter: false });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={!subject || generating || uploadingPdf || !!syncingChapterUrl}
                      onClick={() => pdfAddInputRef.current?.click()}
                    >
                      {uploadingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      {uploadingPdf ? "Uploading PDF(s)…" : "Add PDF(s) to knowledge"}
                    </Button>
                    {selectedChapter?._id && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-xs"
                        disabled={!subject || generating || uploadingPdf || !!syncingChapterUrl}
                        onClick={() => pdfInputRef.current?.click()}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Replace selected chapter PDF
                      </Button>
                    )}
                    {selectedChapter?.synced && selectedChapter._id && isWebChapter && (
                      <>
                        <a
                          href={selectedChapter.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs ${isDark ? "text-blue-400" : "text-blue-600"} hover:underline`}
                        >
                          <Link2 className="w-3 h-3" />
                          Open on notes.mentorsdaily.com
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={handleRepairNames}
                          disabled={!!syncingChapterUrl || uploadingPdf}
                        >
                          {syncingChapterUrl === selectedChapter.url ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Fix Topic Names
                        </Button>
                      </>
                    )}
                    {selectedChapter?._id && chapterReady && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={handleReindexChapter}
                        disabled={reindexingChapter || uploadingPdf || generating}
                      >
                        {reindexingChapter ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Database className="w-3 h-3 mr-1" />
                        )}
                        Sync Embeddings
                      </Button>
                    )}
                  </div>
                )}
                {subject && (
                  <p className={`mt-1.5 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Knowledge for <strong>{subject}</strong>: {pdfKnowledgeCount} PDF source
                    {pdfKnowledgeCount !== 1 ? "s" : ""} + website notes. Multi-PDF upload supported.
                    Topic keyword searches all of them; only top matched chunks go to the LLM (KB-first, low tokens).
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Topic keyword (search PDF + website knowledge)
                </label>
                <div className="relative">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  />
                  <input
                    type="text"
                    value={topicKeyword}
                    onChange={(e) => setTopicKeyword(e.target.value)}
                    disabled={generating || uploadingPdf || !subject || !knowledgeReady}
                    placeholder='e.g. "Basic Structure Doctrine", "Preamble", "Article 368"'
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${inputCls}`}
                  />
                </div>
                <p className={`mt-1.5 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  Type a topic — we search matching chunks across all PDFs + synced notes for this subject,
                  then generate questions from those chunks only (knowledge base first — LLM open knowledge only if nothing matches). Or leave empty and use the topic list.
                </p>
                {keywordMode && (
                  <div
                    className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                      keywordMatch && keywordMatch.matchedChunks > 0
                        ? isDark
                          ? "border-green-800/50 bg-green-950/20 text-green-200"
                          : "border-green-200 bg-green-50 text-green-800"
                        : isDark
                          ? "border-amber-800/50 bg-amber-950/20 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {keywordSearching ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching chapter content…
                      </span>
                    ) : keywordMatch ? (
                      <>
                        <p className="font-medium">
                          {keywordMatch.matchedChunks > 0
                            ? `Matched ${keywordMatch.matchedChunks} chunk(s) in subject knowledge via ${keywordMatch.source} (~RAG top-k only)`
                            : `No chunks matched "${keywordTrimmed}" in PDF/notes knowledge`}
                        </p>
                        {keywordMatch.preview?.length > 0 && (
                          <ul className="mt-1.5 space-y-1 opacity-90">
                            {keywordMatch.preview.map((p, i) => (
                              <li key={i} className="truncate">
                                {p.heading ? `${p.heading}: ` : ""}
                                {p.excerpt}
                                {p.page != null ? ` (p.${p.page})` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <span>Enter at least 2 characters to search…</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className={`block text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Topics{" "}
                    {!keywordMode && <span className="text-red-500">*</span>}
                    <span className={`ml-2 font-normal text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      {keywordMode ? "optional when keyword is set · filtered by keyword" : "select one or more"}
                    </span>
                  </label>
                  {topics.length > 0 && chapterReady && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllTopics}
                        disabled={generating || selectedTopicIds.length === topics.length}
                        className={`text-xs font-medium ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"} disabled:opacity-50`}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearTopicSelection}
                        disabled={generating || selectedTopicIds.length === 0}
                        className={`text-xs font-medium ${isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-600 hover:text-slate-700"} disabled:opacity-50`}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {chapterNeedsContent ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Sync from the notes website or upload a PDF above to load topics.
                  </p>
                ) : topicsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
                  </div>
                ) : topics.length === 0 ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    No topics in this chapter yet. Upload a PDF or sync from the notes website.
                  </p>
                ) : filteredTopics.length === 0 ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    No topic titles match &quot;{keywordTrimmed}&quot; — you can still generate using keyword search above.
                  </p>
                ) : (
                  <>
                    <div
                      className={`max-h-56 overflow-y-auto rounded-lg border divide-y ${isDark ? "border-slate-600 divide-slate-700 bg-slate-900/30" : "border-slate-200 divide-slate-100 bg-white"}`}
                    >
                      {filteredTopics.map((t) => {
                        const checked = selectedTopicIds.includes(t._id);
                        return (
                          <label
                            key={t._id}
                            className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                              checked
                                ? isDark
                                  ? "bg-blue-950/30"
                                  : "bg-blue-50"
                                : isDark
                                  ? "hover:bg-slate-800/50"
                                  : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTopicSelection(t._id)}
                              disabled={generating || uploadingPdf}
                              className="mt-1 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className={`block text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                                {t.name}
                                {t.sourceFormat === "pdf" && (
                                  <span className={`ml-2 text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    PDF
                                  </span>
                                )}
                              </span>
                              <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {t.chunkCount} chunks
                                {t.pageStart != null
                                  ? ` · p.${t.pageStart}${t.pageEnd != null && t.pageEnd !== t.pageStart ? `–${t.pageEnd}` : ""}`
                                  : ""}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedTopics.length > 0 && (
                      <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${isDark ? "border-blue-800/40 bg-blue-950/20" : "border-blue-200 bg-blue-50"}`}>
                        <p className={`font-medium ${isDark ? "text-blue-200" : "text-blue-900"}`}>
                          {selectedTopics.length} topic{selectedTopics.length !== 1 ? "s" : ""} selected
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-blue-300/80" : "text-blue-700"}`}>
                          {selectedChapter?.title} · {selectedTopicChunkTotal} chunks total · RAG retrieves top chunks per batch
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-blue-300/70" : "text-blue-600"}`}>
                          {buildSelectedTopicLabel(selectedTopics.map((t) => t.name))}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "moderate" | "hard")}
                    disabled={generating}
                    className={`w-full px-3 py-2 rounded-lg border text-sm capitalize ${inputCls}`}
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Number of questions
                  </label>
                  <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
                    {([50, 100] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={generating}
                        onClick={() => setQuestionCount(n)}
                        className={`flex-1 px-3 py-2 transition-colors ${
                          questionCount === n
                            ? "bg-blue-600 text-white"
                            : isDark
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {n} Q
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-1.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    {questionCount === 100
                      ? "Full-length set (~120 pool → 100 shown)"
                      : "Standard set (~70 pool → 50 shown, extras avoid repeats)"}
                  </p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Patterns to include
                </label>
                <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Equal weightage: {questionCount} questions split evenly across selected patterns
                  {patternsToInclude.length > 0
                    ? ` (~${Math.round(questionCount / patternsToInclude.length)} each if ${patternsToInclude.length} selected).`
                    : "."}{" "}
                  Leave all selected for the full UPSC mix, or choose specific patterns.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {PRELIM_MOCK_PATTERNS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patternsToInclude.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setPatternsToInclude((prev) => [...prev, p.id]);
                          else setPatternsToInclude((prev) => prev.filter((id) => id !== p.id));
                        }}
                        disabled={generating}
                        className="rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(selectedTopics.length > 0 || keywordMode) && (
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Will generate a <strong>{questionCount === 100 ? 120 : 70}-question pool</strong>, keep the best{" "}
                  <strong>{questionCount}</strong> (extras drop duplicates / incomplete; explanations 50–70 words) from{" "}
                  {keywordMode ? (
                    <>
                      keyword <strong>&quot;{keywordTrimmed}&quot;</strong>
                    </>
                  ) : (
                    <>
                      <strong>{selectedTopics.length}</strong> topic{selectedTopics.length !== 1 ? "s" : ""} (
                      {buildSelectedTopicLabel(selectedTopics.map((t) => t.name))})
                    </>
                  )}{" "}
                  using <strong>{patternsToInclude.length}</strong> pattern
                  {patternsToInclude.length !== 1 ? "s" : ""} ({selectedPatternsLabel}).
                </p>
              )}
              {generating && renderGenerationProgress()}
              <Button
                type="submit"
                disabled={
                  generating ||
                  uploadingPdf ||
                  !subject ||
                  !knowledgeReady ||
                  (!keywordMode && !selectedChapter?._id) ||
                  patternsToInclude.length === 0 ||
                  (keywordMode
                    ? keywordSearching || (keywordMatch != null && keywordMatch.matchedChunks === 0)
                    : selectedTopicIds.length === 0 || selectedTopicChunkTotal === 0)
                }
                className="w-full sm:w-auto"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {generating
                  ? "Generating via RAG…"
                  : keywordMode
                    ? `Generate ${questionCount}Q for "${keywordTrimmed.slice(0, 28)}${keywordTrimmed.length > 28 ? "…" : ""}"`
                    : `Generate ${questionCount} Questions (RAG)`}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Preview AI-generated questions */}
      {flowStep === "preview" && activeTest && (
        <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Preview — {activeTest.totalQuestions} Questions from Notes
              {generating && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            </CardTitle>
            <CardDescription>
              Generated from Notes for{" "}
              <strong>{selectedChapter?.title || activeTest.subject}</strong> →{" "}
              <strong>{activeTest.topic}</strong>
              {patternsToInclude.length > 0 && (
                <>
                  {" "}
                  · Patterns: <strong>{patternsToInclude.length}</strong> selected
                </>
              )}
              . Review, edit, or regenerate before assigning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generating && renderGenerationProgress()}

            <div className={`rounded-lg border px-3 py-2 text-xs flex flex-wrap gap-2 items-center ${isDark ? "border-blue-800/40 bg-blue-950/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
              <span className="font-medium">
                📚 Knowledge base RAG (top chunks only — not full PDF)
              </span>
              {activeTest?.generationStats?.notesSource ? (
                <>
                  <span>·</span>
                  <span>
                    source: {String(activeTest.generationStats.notesSource).replace(/^rag_/, "")}
                    {activeTest.generationStats.chunksRetrieved
                      ? ` · ${activeTest.generationStats.chunksRetrieved} chunk hits`
                      : ""}
                  </span>
                </>
              ) : null}
              <span>·</span>
              <span>Gemini Flash Lite</span>
              <span>·</span>
              <span>{activeTest.difficulty} difficulty</span>
              <span>·</span>
              <span>{selectedPatternsLabel}</span>
              {selectedTopics.length === 1 && selectedTopics[0]?.sourceUrl && (
                <>
                  <span>·</span>
                  <a href={selectedTopics[0].sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    View source notes
                  </a>
                </>
              )}
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {previewSlice.map((q) => {
                const isEditing = editingQuestionIndex === q.index - 1 && editDraft;
                return (
                  <div
                    key={q.index}
                    className={`rounded-lg border p-4 ${isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <p className={`text-xs font-medium flex flex-wrap items-center gap-2 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        <span>Q{q.index}</span>
                        {q.patternLabel && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                            {q.patternLabel}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 min-h-0 text-xs px-2"
                          onClick={() => (isEditing ? cancelEditQuestion() : startEditQuestion(q))}
                          disabled={regeneratingIndex !== null}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          {isEditing ? "Cancel" : "Edit"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 min-h-0 text-xs px-2"
                          onClick={() => handleRegenerateQuestion(q)}
                          disabled={regeneratingIndex === q.index - 1 || generating}
                        >
                          {regeneratingIndex === q.index - 1 ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Regenerate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 min-h-0 text-xs px-2 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteQuestion(q)}
                          disabled={generating}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {isEditing && editDraft ? (
                      <div className="space-y-2">
                        <textarea
                          value={editDraft.question}
                          onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                          rows={3}
                          className={`w-full text-sm rounded border px-2 py-1.5 ${inputCls}`}
                        />
                        {(["A", "B", "C", "D"] as const).map((key) => (
                          <input
                            key={key}
                            value={editDraft.options[key]}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                options: { ...editDraft.options, [key]: e.target.value },
                              })
                            }
                            placeholder={`Option ${key}`}
                            className={`w-full text-sm rounded border px-2 py-1.5 ${inputCls}`}
                          />
                        ))}
                        <select
                          value={editDraft.correctAnswer}
                          onChange={(e) => setEditDraft({ ...editDraft, correctAnswer: e.target.value })}
                          className={`text-sm rounded border px-2 py-1.5 ${inputCls}`}
                        >
                          {(["A", "B", "C", "D"] as const).map((k) => (
                            <option key={k} value={k}>{k} — Correct</option>
                          ))}
                        </select>
                        <textarea
                          value={editDraft.explanation}
                          onChange={(e) => setEditDraft({ ...editDraft, explanation: e.target.value })}
                          rows={2}
                          placeholder="Explanation"
                          className={`w-full text-sm rounded border px-2 py-1.5 ${inputCls}`}
                        />
                        <Button type="button" className="h-8 min-h-0 text-xs px-3" onClick={handleSaveQuestion} disabled={savingQuestions}>
                          {savingQuestions ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm font-medium mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm mb-3">
                          {(["A", "B", "C", "D"] as const).map((key) => (
                            <div
                              key={key}
                              className={`px-2 py-1 rounded ${
                                q.correctAnswer === key
                                  ? isDark
                                    ? "bg-green-950/40 text-green-300 border border-green-800/50"
                                    : "bg-green-50 text-green-800 border border-green-200"
                                  : isDark
                                    ? "text-slate-300"
                                    : "text-slate-700"
                              }`}
                            >
                              <span className="font-medium">{key}.</span> {q.options[key]}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            <span className="font-medium">Explanation:</span> {q.explanation}
                          </p>
                        )}
                        {q.sourceNote && (
                          <p className={`text-xs mt-1 italic ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                            Source: {q.sourceNote.slice(0, 120)}{q.sourceNote.length > 120 ? "…" : ""}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {previewTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Page {previewPage} of {previewTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={previewPage >= previewTotalPages}
                  onClick={() => setPreviewPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}

            {backupQuestions.length > 0 && !generating && (
              <div className={`rounded-xl border p-3 space-y-2 ${isDark ? "border-amber-800/40 bg-amber-950/20" : "border-amber-200 bg-amber-50"}`}>
                <p className={`text-sm font-medium ${isDark ? "text-amber-200" : "text-amber-900"}`}>
                  Backup pool — {backupQuestions.length} held aside
                </p>
                <p className={`text-xs ${isDark ? "text-amber-300/80" : "text-amber-800"}`}>
                  Extra / duplicate / incomplete questions removed from the final set so the assigned test stays unique and complete.
                </p>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {backupQuestions.slice(0, 15).map((q, i) => (
                    <li
                      key={`bk-${i}`}
                      className={`text-xs rounded-lg px-2.5 py-1.5 ${isDark ? "bg-slate-900/40 text-slate-300" : "bg-white text-slate-700"}`}
                    >
                      <span className={`mr-2 font-semibold uppercase ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                        {q.backupReason || "extra"}
                      </span>
                      {(q.question || "").slice(0, 120)}
                      {(q.question || "").length > 120 ? "…" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {!generating && (
                <Button type="button" onClick={continueToAssign}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Continue to Assign Students
                </Button>
              )}
              {generating && previewQuestions.length >= questionCount && (
                <Button type="button" variant="outline" onClick={handleApproveTest} disabled={approving}>
                  {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve {questionCount} Questions
                </Button>
              )}
              {generating && previewQuestions.length > 0 && previewQuestions.length < questionCount && (
                <span className={`text-xs self-center ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  Generating… {previewQuestions.length}/{questionCount} (RAG refill continues until {questionCount})
                </span>
              )}
              {previewQuestions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFillMissingHindi}
                  disabled={fillingHindi || generating}
                  title="Translate any questions still missing Hindi"
                >
                  {fillingHindi ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Fill Missing Hindi
                </Button>
              )}
              <Button type="button" variant="outline" onClick={resetFlow} disabled={generating && previewQuestions.length === 0}>
                Generate New Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign students */}
      {flowStep === "assign" && activeTest && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={resetFlow} disabled={assigning} className="px-2 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to tests
            </Button>
          </div>

          <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${isDark ? "bg-green-950/20 border-green-800/40" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDark ? "text-green-400/80" : "text-green-700"}`}>
                  {isEditMode ? "Editing assignment" : "Ready to assign"}
                </p>
                <p className={`font-semibold ${isDark ? "text-green-200" : "text-green-800"}`}>
                  {activeTest.title}
                </p>
                <p className={`text-sm mt-0.5 ${isDark ? "text-green-300/70" : "text-green-700"}`}>
                  {activeTest.totalQuestions} questions · {activeTest.difficulty} · {activeTest.subject}
                </p>
              </div>
            </div>
          </div>

          <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-blue-500" />
                {isEditMode ? "Manage assigned students" : "Assign to students"}
              </CardTitle>
              <CardDescription>
                {isEditMode
                  ? "Add or remove students. Students who already started cannot be removed."
                  : "Search and select students. Only assigned students will see this test."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStudents.length > 0 ? (
                <div className={`rounded-xl border p-3 ${isDark ? "bg-blue-950/20 border-blue-800/40" : "bg-blue-50 border-blue-200"}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className={`text-xs font-semibold ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                      Selected ({selectedStudents.length})
                    </p>
                    {selectedStudentIds.size > lockedStudentIds.size && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        disabled={assigning}
                        className={`text-xs font-medium ${isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-700 hover:text-blue-900"}`}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map((s) => (
                      <span
                        key={s._id}
                        className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium ${
                          isDark ? "bg-blue-500/25 text-blue-100 border border-blue-400/30" : "bg-white text-blue-900 border border-blue-200 shadow-sm"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isDark ? "bg-blue-600 text-white" : "bg-blue-600 text-white"}`}>
                          {studentInitial(s.name)}
                        </span>
                        {s.name}
                        {!lockedStudentIds.has(s._id) ? (
                          <button
                            type="button"
                            onClick={() => toggleStudent(s._id)}
                            className={`p-0.5 rounded-full ${isDark ? "hover:bg-blue-400/20" : "hover:bg-blue-100"}`}
                            aria-label={`Remove ${s.name}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1 ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                            started
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border border-dashed px-4 py-3 text-sm ${isDark ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500"}`}>
                  No students selected yet — pick from the list below.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm ${inputCls}`}
                    disabled={assigning || studentsLoading}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={selectAllVisible} disabled={assigning || filteredStudents.length === 0}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} disabled={assigning || selectedStudentIds.size === 0}>
                    Clear
                  </Button>
                </div>
              </div>

              {studentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${isDark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
                  <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {studentSearch ? "No students match your search." : "No students found."}
                  </p>
                </div>
              ) : (
                <div className={`rounded-xl border overflow-hidden ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className={`px-4 py-2.5 text-xs font-medium flex justify-between ${isDark ? "bg-slate-900/60 text-slate-400 border-b border-slate-700" : "bg-slate-50 text-slate-600 border-b border-slate-200"}`}>
                    <span>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</span>
                    <span className={selectedStudentIds.size > 0 ? (isDark ? "text-blue-300" : "text-blue-700") : ""}>
                      {selectedStudentIds.size} selected
                    </span>
                  </div>
                  <div className="max-h-[min(52vh,480px)] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      {filteredStudents.map((s) => {
                        const selected = selectedStudentIds.has(s._id);
                        const locked = lockedStudentIds.has(s._id);
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => toggleStudent(s._id)}
                            disabled={assigning || locked}
                            title={locked ? "This student already started — cannot remove" : undefined}
                            className={`flex items-center gap-3 text-left px-4 py-3 transition-colors w-full border-b sm:border-b-0 sm:odd:border-r ${
                              isDark ? "border-slate-700/80" : "border-slate-100"
                            } ${
                              locked
                                ? isDark ? "bg-amber-500/10 cursor-not-allowed" : "bg-amber-50 cursor-not-allowed"
                                : selected
                                ? isDark ? "bg-blue-500/15" : "bg-blue-50"
                                : isDark ? "bg-slate-800/50 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {studentInitial(s.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium truncate text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                                {s.name}
                                {locked && (
                                  <span className={`ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                                    started
                                  </span>
                                )}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {s.email}
                              </p>
                            </div>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 ${
                                selected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : isDark ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sticky assign CTA — stays visible while scrolling the student list */}
          <div
            className={`sticky bottom-3 z-30 rounded-xl border px-4 py-3 ${
              isDark
                ? "bg-slate-900/95 border-slate-600 shadow-lg shadow-black/40 backdrop-blur"
                : "bg-white/95 border-slate-200 shadow-lg shadow-slate-900/10 backdrop-blur"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {selectedStudentIds.size === 0 ? (
                  <span>Select at least one student to assign</span>
                ) : (
                  <span>
                    <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedStudentIds.size}</strong>
                    {" "}student{selectedStudentIds.size !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetFlow} disabled={assigning}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAssign}
                  disabled={assigning || selectedStudentIds.size === 0}
                  className="min-w-[180px]"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {isEditMode
                    ? `Update assignment`
                    : `Assign to ${selectedStudentIds.size || 0}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List — hide while assigning so focus stays on students */}
      {flowStep !== "assign" && (
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>All Practice Tests</CardTitle>
              <CardDescription>
                {listPagination
                  ? `${listPagination.total} test${listPagination.total !== 1 ? "s" : ""} — assign or review`
                  : "Generated tests — assign unassigned ones or review assigned."}
              </CardDescription>
            </div>
            <div className="flex rounded-lg border overflow-hidden text-xs font-medium shrink-0">
              {(["all", "unassigned", "assigned"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterAndResetPage(f)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    listFilter === f
                      ? "bg-blue-600 text-white"
                      : isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : list.length === 0 ? (
            <p className={`text-sm py-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {listFilter === "all" ? "No practice tests yet. Generate one above." : `No ${listFilter} tests.`}
            </p>
          ) : (
            <>
              <div className={`rounded-xl border overflow-hidden divide-y ${isDark ? "border-slate-700 divide-slate-700/80" : "border-slate-200 divide-slate-100"}`}>
                {list.map((item) => {
                  const topicFocus = listTopicFocus(item);
                  const chapterLabel = (item.chapter || "").trim();
                  const studentsPreview = item.assignedStudents.slice(0, 2);
                  const extraStudents = Math.max(0, (item.assignedCount ?? item.assignedStudents.length) - studentsPreview.length);
                  return (
                    <div
                      key={item._id}
                      className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 sm:px-4 py-3 ${
                        isDark ? "bg-slate-800/40 hover:bg-slate-800/70" : "bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              isDark ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.subject || "Subject"}
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              item.status === "ready"
                                ? isDark ? "bg-green-500/15 text-green-400" : "bg-green-50 text-green-700"
                                : item.status === "generating"
                                ? isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-700"
                                : isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.status === "ready" && (
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                item.isAssigned
                                  ? isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"
                                  : isDark ? "bg-orange-500/15 text-orange-300" : "bg-orange-50 text-orange-700"
                              }`}
                            >
                              {item.isAssigned
                                ? `${item.assignedCount ?? item.assignedStudents.length} assigned`
                                : "Not assigned"}
                            </span>
                          )}
                          <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {item.totalQuestions} Q · {item.difficulty} · {formatDate(item.createdAt)}
                          </span>
                        </div>

                        {chapterLabel ? (
                          <p className={`text-sm font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`} title={chapterLabel}>
                            {chapterLabel}
                          </p>
                        ) : (
                          <p className={`text-sm font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`} title={listItemTitle(item)}>
                            {listItemTitle(item)}
                          </p>
                        )}

                        {topicFocus && (
                          <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`} title={item.topic}>
                            {topicFocus}
                          </p>
                        )}

                        {item.isAssigned && studentsPreview.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {studentsPreview.map((s) => (
                              <span
                                key={s._id}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] ${isDark ? "bg-slate-700/80 text-slate-300" : "bg-slate-100 text-slate-700"}`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isDark ? "bg-slate-600" : "bg-slate-300"}`}>
                                  {studentInitial(s.name)}
                                </span>
                                {s.name}
                              </span>
                            ))}
                            {extraStudents > 0 && (
                              <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                +{extraStudents}
                              </span>
                            )}
                            {item.attemptCount > 0 && (
                              <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                                · {item.attemptCount} attempt{item.attemptCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                        {item.status === "failed" && item.errorMessage && (
                          <p className="text-xs text-red-400 line-clamp-1">{item.errorMessage}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-center">
                        {item.status === "ready" && (
                          <Button
                            type="button"
                            className="h-8 min-h-0 px-3 text-xs"
                            onClick={() => (item.isAssigned ? startEditAssignFlow(item) : startAssignFlow(item))}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Assign
                          </Button>
                        )}
                        {item.status === "ready" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 min-h-0 px-3 text-xs"
                            onClick={() => startPreviewFromList(item)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Preview
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className={`h-8 min-h-0 px-2.5 text-xs ${
                            isDark
                              ? "border-red-800/80 text-red-400 hover:bg-red-950/40"
                              : "border-red-200 text-red-600 hover:bg-red-50"
                          }`}
                          onClick={() => setDeleteId(item._id)}
                          disabled={!!deletingId}
                          title="Delete practice test"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {listPagination && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Showing {(listPagination.page - 1) * listPagination.limit + 1}
                    –
                    {Math.min(listPagination.page * listPagination.limit, listPagination.total)}
                    {" of "}
                    {listPagination.total}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 min-h-0 px-2.5 text-xs"
                      disabled={!listPagination.hasPrev || loading}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </Button>
                    {Array.from({ length: listPagination.totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        const cur = listPagination.page;
                        return page === 1 || page === listPagination.totalPages || Math.abs(page - cur) <= 1;
                      })
                      .reduce<number[]>((acc, page, idx, arr) => {
                        if (idx > 0 && page - arr[idx - 1] > 1) acc.push(-page);
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((page) =>
                        page < 0 ? (
                          <span key={`e${page}`} className={`px-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            …
                          </span>
                        ) : (
                          <Button
                            key={page}
                            type="button"
                            variant={page === listPagination.page ? "default" : "outline"}
                            className="h-8 min-h-0 w-8 p-0 text-xs"
                            disabled={loading}
                            onClick={() => setListPage(page)}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 min-h-0 px-2.5 text-xs"
                      disabled={!listPagination.hasNext || loading}
                      onClick={() => setListPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {deleteId && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? "bg-black/70" : "bg-black/50"}`} onClick={() => setDeleteId(null)}>
          <div
            className={`rounded-xl border p-6 max-w-sm w-full shadow-xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Delete this practice test?</p>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {(() => {
                const item = list.find((i) => i._id === deleteId);
                return item && item.attemptCount > 0
                  ? `This will also remove ${item.attemptCount} student attempt(s). This cannot be undone.`
                  : "This cannot be undone.";
              })()}
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={!!deletingId}>Cancel</Button>
              <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(deleteId)} disabled={!!deletingId}>
                {deletingId === deleteId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
