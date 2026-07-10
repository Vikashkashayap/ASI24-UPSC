import React, { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  Pencil,
  Link2,
  RefreshCw,
  BookOpen,
  Eye,
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
  difficulty: string;
  totalQuestions: number;
  status: "generating" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  attemptCount: number;
  isAssigned: boolean;
  startedStudentIds?: string[];
  assignedStudents: { _id: string; name: string; email: string }[];
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
  const [syncingChapterUrl, setSyncingChapterUrl] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [patternsToInclude, setPatternsToInclude] = useState<string[]>(DEFAULT_PATTERNS);
  const [generating, setGenerating] = useState(false);
  const [generationTestId, setGenerationTestId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationProgress | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<PreviewQuestion | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);

  // Step 1.5 — preview AI-generated questions from notes
  const [flowStep, setFlowStep] = useState<"form" | "preview" | "assign">("form");
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadList();
    loadStudents();
    loadNotesSubjects();
  }, []);

  useEffect(() => {
    if (!generationTestId) return;
    const timer = setInterval(async () => {
      try {
        const res = await assignedPracticeAPI.getById(generationTestId);
        if (!res.data?.success || !res.data?.data) return;
        const data = res.data.data;
        const gp = (data.generationProgress || {}) as GenerationProgress;
        setGenerationStatus({
          totalBatches: gp.totalBatches || 5,
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
              totalQuestions: liveQuestions.length,
              difficulty: data.difficulty,
            });
          } else {
            setActiveTest((prev) =>
              prev ? { ...prev, totalQuestions: liveQuestions.length } : prev
            );
          }
        }

        if (data.status === "ready") {
          setGenerationTestId(null);
          setGenerating(false);
          setPreviewQuestions(data.questions || liveQuestions);
          setPreviewPage(1);
          setActiveTest({
            _id: data._id,
            subject: data.subject,
            topic: data.topic,
            title: data.title || `${data.subject} — ${data.topic}`,
            totalQuestions: data.totalQuestions,
            difficulty: data.difficulty,
          });
          setFlowStep("preview");
          setSuccess("50 questions generated successfully from Notes.");
          loadList();
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

  const chapterNeedsSync = selectedChapter && !selectedChapter.synced;

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

  const selectedTopicChunkTotal = useMemo(
    () => selectedTopics.reduce((sum, t) => sum + (t.chunkCount || 0), 0),
    [selectedTopics]
  );

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

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await assignedPracticeAPI.listAdmin();
      if (res.data.success) setList(res.data.data || []);
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

  const filteredList = useMemo(() => {
    if (listFilter === "unassigned") return list.filter((i) => i.status === "ready" && !i.isAssigned);
    if (listFilter === "assigned") return list.filter((i) => i.isAssigned);
    return list;
  }, [list, listFilter]);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectStr = subject || "";
    const topicNames = selectedTopics.map((t) => t.name.trim()).filter(Boolean);
    const topicStr = buildSelectedTopicLabel(topicNames);
    const chapterStr = selectedChapter?.title?.trim() || "";
    if (!subjectStr) {
      setError("Select a subject from Notes");
      return;
    }
    if (!chapterId) {
      setError("Select a chapter");
      return;
    }
    if (selectedTopicIds.length === 0 || topicNames.length === 0) {
      setError("Select at least one topic from Notes");
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
      const res = await assignedPracticeAPI.generate({
        subject: subjectStr,
        topic: topicStr,
        chapter: chapterStr,
        notesTopicIds: selectedTopicIds,
        notesTopicId: selectedTopicIds[0],
        difficulty,
        patternsToInclude,
      });
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setGenerationTestId(data._id);
        setGenerationStatus({
          completedBatches: data.generationProgress?.completedBatches || 0,
          totalBatches: data.generationProgress?.totalBatches || 5,
          generatedQuestions: data.generationProgress?.generatedQuestions || 0,
        });
        setSuccess("Generation started. Creating 10 questions per batch (5 batches total).");
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

  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    const gs = generationStatus;
    const batchDone = (n: number) =>
      gs.completedBatches >= n || Boolean(gs.batchSteps?.[String(n - 1)]);
    const steps = [
      { key: "reading", label: "Reading Notes", done: Boolean(gs.readingNotes) },
      { key: "cleaning", label: "Cleaning HTML", done: Boolean(gs.cleaningHtml) },
      ...Array.from({ length: gs.totalBatches || 5 }, (_, i) => ({
        key: `batch-${i + 1}`,
        label: `Generating Batch ${i + 1} of ${gs.totalBatches || 5}`,
        done: batchDone(i + 1),
      })),
      { key: "done", label: "Completed", done: Boolean(gs.isComplete) },
    ];

    return (
      <div className={`rounded-lg border p-3 space-y-2 ${isDark ? "border-blue-800/40 bg-blue-950/20" : "border-blue-200 bg-blue-50"}`}>
        <p className={`text-sm font-medium ${isDark ? "text-blue-200" : "text-blue-900"}`}>
          Generating from MentorsDaily Notes
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
            style={{ width: `${Math.min(100, (gs.generatedQuestions / 50) * 100)}%` }}
          />
        </div>
        <p className={`text-xs ${isDark ? "text-blue-300/80" : "text-blue-700"}`}>
          Questions Generated: {gs.generatedQuestions}/50
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
        loadList();
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
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-1">
      {/* Header */}
      <div className={`rounded-xl border-2 p-4 md:p-6 ${isDark ? "bg-slate-800/50 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
        <h1 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-500" />
          Topic Practice
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Select chapter & topic from Notes → AI fetches live notes → generates 50 MCQs → Preview & edit → Assign students
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
              Select chapter &amp; topic from notes.mentorsdaily.com. Questions are generated only from live-fetched notes content (no external AI knowledge).
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
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={generating}
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
                            {isSelected && <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {c.synced ? (
                              <span className="text-green-600 dark:text-green-400">
                                ✓ {c.topicCount} topics synced
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                ↻ ~{c.expectedTopicCount || "?"} topics · sync needed
                              </span>
                            )}
                          </p>
                          {!c.synced && isSelected && (
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
                      This chapter is not synced yet. Link it from{" "}
                      <a href={selectedChapter.url} target="_blank" rel="noopener noreferrer" className="underline">
                        notes.mentorsdaily.com
                      </a>{" "}
                      to enable question generation.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSyncChapter(selectedChapter)}
                      disabled={!!syncingChapterUrl}
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
                {selectedChapter?.synced && selectedChapter._id && (
                  <div className="mt-2 flex flex-wrap gap-2">
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
                      disabled={!!syncingChapterUrl}
                    >
                      {syncingChapterUrl === selectedChapter.url ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Fix Topic Names
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className={`block text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Topics <span className="text-red-500">*</span>
                    <span className={`ml-2 font-normal text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      select one or more
                    </span>
                  </label>
                  {topics.length > 0 && !chapterNeedsSync && (
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
                {chapterNeedsSync ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Sync the chapter above to load topics.
                  </p>
                ) : topicsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
                  </div>
                ) : topics.length === 0 ? (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>No topics in this chapter.</p>
                ) : (
                  <>
                    <div
                      className={`max-h-56 overflow-y-auto rounded-lg border divide-y ${isDark ? "border-slate-600 divide-slate-700 bg-slate-900/30" : "border-slate-200 divide-slate-100 bg-white"}`}
                    >
                      {topics.map((t) => {
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
                              disabled={generating}
                              className="mt-1 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className={`block text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                                {t.name}
                              </span>
                              <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {t.chunkCount} chunks
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
                          {selectedChapter?.title} · {selectedTopicChunkTotal} note chunks total · questions rotate across selected topics
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-blue-300/70" : "text-blue-600"}`}>
                          {buildSelectedTopicLabel(selectedTopics.map((t) => t.name))}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "moderate" | "hard")}
                  disabled={generating}
                  className={`px-3 py-2 rounded-lg border text-sm capitalize ${inputCls}`}
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Patterns to include
                </label>
                <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Equal weightage: 50 questions split evenly across selected patterns (all 10 selected = 5 each).
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
              {selectedTopics.length > 0 && (
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Will generate <strong>50 questions</strong> from{" "}
                  <strong>{selectedTopics.length}</strong> topic{selectedTopics.length !== 1 ? "s" : ""} (
                  {buildSelectedTopicLabel(selectedTopics.map((t) => t.name))}) using{" "}
                  <strong>{patternsToInclude.length}</strong> pattern{patternsToInclude.length !== 1 ? "s" : ""} ({selectedPatternsLabel}).
                </p>
              )}
              {generating && renderGenerationProgress()}
              <Button type="submit" disabled={generating || !subject || chapterNeedsSync || !chapterId || selectedTopicIds.length === 0 || patternsToInclude.length === 0} className="w-full sm:w-auto">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {generating ? "Generating from Notes…" : "Generate 50 Questions from Notes"}
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
              <span className="font-medium">📚 Notes-only (live fetch)</span>
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

            <div className="flex flex-wrap gap-2 pt-2">
              {!generating && (
                <Button type="button" onClick={continueToAssign}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Continue to Assign Students
                </Button>
              )}
              {generating && previewQuestions.length > 0 && (
                <Button type="button" variant="outline" onClick={handleApproveTest} disabled={approving}>
                  {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve &amp; Finish Early
                </Button>
              )}
              <Button type="button" variant="outline" onClick={resetFlow} disabled={generating && previewQuestions.length === 0}>
                Generate New Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Assign */}
      {flowStep === "assign" && activeTest && (
        <div className="space-y-4">
          {/* Generated test summary */}
          <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${isDark ? "bg-green-950/20 border-green-800/40" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className={`font-semibold ${isDark ? "text-green-200" : "text-green-800"}`}>
                  {activeTest.title}
                </p>
                <p className={`text-sm mt-0.5 ${isDark ? "text-green-300/70" : "text-green-700"}`}>
                  {activeTest.totalQuestions} questions · {activeTest.difficulty} · {activeTest.subject}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={resetFlow} disabled={assigning}>
              Generate New Test
            </Button>
          </div>

          <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Step 2 — {isEditMode ? "Edit Assignment" : "Assign to Students"}
              </CardTitle>
              <CardDescription>
                {isEditMode
                  ? "Add or remove students. Students who already started cannot be removed."
                  : "Search and select students. Only assigned students will see this test on Practice Test."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected chips */}
              {selectedStudents.length > 0 && (
                <div className={`rounded-lg border p-3 ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-blue-50/50 border-blue-200"}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Selected ({selectedStudents.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map((s) => (
                      <span
                        key={s._id}
                        className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-medium ${
                          isDark ? "bg-blue-500/20 text-blue-200 border border-blue-500/30" : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {s.name}
                        {!lockedStudentIds.has(s._id) && (
                          <button
                            type="button"
                            onClick={() => toggleStudent(s._id)}
                            className="p-0.5 rounded-full hover:bg-black/10"
                            aria-label={`Remove ${s.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search + bulk actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm ${inputCls}`}
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

              {/* Student grid */}
              {studentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className={`text-center py-12 rounded-lg border ${isDark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
                  <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {studentSearch ? "No students match your search." : "No students found."}
                  </p>
                </div>
              ) : (
                <div className={`rounded-xl border overflow-hidden ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className={`px-4 py-2.5 text-xs font-medium flex justify-between ${isDark ? "bg-slate-900/60 text-slate-400 border-b border-slate-700" : "bg-slate-50 text-slate-600 border-b border-slate-200"}`}>
                    <span>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</span>
                    <span>{selectedStudentIds.size} selected</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:gap-px sm:bg-slate-200/50 sm:dark:bg-slate-700/50">
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
                            className={`flex items-center gap-3 text-left px-4 py-3 transition-colors w-full ${
                              locked
                                ? isDark ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 cursor-not-allowed" : "bg-amber-50 ring-1 ring-inset ring-amber-300 cursor-not-allowed"
                                : selected
                                ? isDark ? "bg-blue-500/15 ring-1 ring-inset ring-blue-500/40" : "bg-blue-50 ring-1 ring-inset ring-blue-300"
                                : isDark ? "bg-slate-800/80 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
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
                              className={`flex h-5 w-5 items-center justify-center rounded border shrink-0 ${
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

              <Button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedStudentIds.size === 0}
                className="w-full sm:w-auto"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isEditMode
                  ? `Update Assignment (${selectedStudentIds.size} students)`
                  : `Assign to ${selectedStudentIds.size || ""} Selected Student${selectedStudentIds.size !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>All Practice Tests</CardTitle>
              <CardDescription>Generated tests — assign unassigned ones or review assigned.</CardDescription>
            </div>
            <div className="flex rounded-lg border overflow-hidden text-xs font-medium shrink-0">
              {(["all", "unassigned", "assigned"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setListFilter(f)}
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
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filteredList.length === 0 ? (
            <p className={`text-sm py-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {listFilter === "all" ? "No practice tests yet. Generate one above." : `No ${listFilter} tests.`}
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredList.map((item) => (
                <li
                  key={item._id}
                  className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.title || `${item.subject} — ${item.topic}`}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === "ready"
                              ? "bg-green-500/20 text-green-400"
                              : item.status === "generating"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status === "ready" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.isAssigned
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-orange-500/20 text-orange-400"
                            }`}
                          >
                            {item.isAssigned ? "Assigned" : "Not assigned"}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {item.totalQuestions} Q · {item.difficulty} · {formatDate(item.createdAt)}
                      </p>
                      {item.isAssigned && item.assignedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.assignedStudents.map((s) => (
                            <span
                              key={s._id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"}`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isDark ? "bg-slate-600" : "bg-slate-300"}`}>
                                {studentInitial(s.name)}
                              </span>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.status === "failed" && item.errorMessage && (
                        <p className="text-xs text-red-400 mt-1">{item.errorMessage}</p>
                      )}
                      {item.attemptCount > 0 && (
                        <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                          {item.attemptCount} attempt(s) started
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "ready" && (
                        <Button type="button" variant="outline" onClick={() => startPreviewFromList(item)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          Preview
                        </Button>
                      )}
                      {item.status === "ready" && !item.isAssigned && item.attemptCount === 0 && (
                        <Button type="button" variant="default" onClick={() => startAssignFlow(item)}>
                          <UserPlus className="w-4 h-4 mr-1.5" />
                          Assign
                        </Button>
                      )}
                      {item.status === "ready" && item.isAssigned && (
                        <Button type="button" variant="outline" onClick={() => startEditAssignFlow(item)}>
                          <Pencil className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDeleteId(item._id)}
                        disabled={!!deletingId}
                        title="Delete practice test"
                        className={isDark ? "border-red-800 text-red-400 hover:bg-red-950/30" : "border-red-200 text-red-600 hover:bg-red-50"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
