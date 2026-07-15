import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  Upload,
  Database,
  FileText,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { notesAPI, type NotesChapter, type NotesTopic } from "../../services/api";

type VectorHealth = {
  embedding?: {
    configured?: boolean;
    provider?: string;
    model?: string;
    dimension?: number;
  };
  qdrant?: {
    ok?: boolean;
    pointsCount?: number;
    collection?: string;
    error?: string;
  };
};

function formatBytes(n?: number): string {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfChapter(c: NotesChapter): boolean {
  return (
    c.sourceType === "pdf" ||
    Boolean(c.hasPdf) ||
    String(c.url || "").startsWith("pdf://")
  );
}

function isWebChapter(c: NotesChapter): boolean {
  return /^https?:\/\//i.test(String(c.url || "")) && !isPdfChapter(c);
}

export const KnowledgeBaseAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<NotesChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [topics, setTopics] = useState<NotesTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [syncingUrl, setSyncingUrl] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NotesChapter | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [vectorHealth, setVectorHealth] = useState<VectorHealth | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    matchedChunks: number;
    source: string;
    preview: Array<{ heading: string; page: number | null; excerpt: string }>;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const inputCls = isDark
    ? "bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

  const selectedChapter = useMemo(
    () => chapters.find((c) => c._id === selectedChapterId || c.url === selectedChapterId) || null,
    [chapters, selectedChapterId]
  );

  const subjectChunkTotal = useMemo(
    () => chapters.reduce((sum, c) => sum + (c.chunkCount || 0), 0),
    [chapters]
  );
  const pdfCount = useMemo(() => chapters.filter(isPdfChapter).length, [chapters]);
  const webCount = useMemo(() => chapters.filter(isWebChapter).length, [chapters]);
  const syncedCount = useMemo(
    () => chapters.filter((c) => c.synced && (c.chunkCount || 0) > 0).length,
    [chapters]
  );
  const webChapters = useMemo(() => chapters.filter(isWebChapter), [chapters]);
  const webPending = useMemo(() => webChapters.filter((c) => !c.synced), [webChapters]);

  useEffect(() => {
    void loadSubjects();
    void loadVectorHealth();
  }, []);

  useEffect(() => {
    if (!subject) {
      setChapters([]);
      setSelectedChapterId("");
      setTopics([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setChaptersLoading(true);
      setError(null);
      try {
        const res = await notesAPI.getChapters(subject);
        if (!cancelled && res.data?.success) {
          const list = res.data.data || [];
          setChapters(list);
          const prefer =
            list.find((c) => c._id && c.synced && (c.chunkCount || 0) > 0) ||
            list.find((c) => c._id) ||
            list[0];
          setSelectedChapterId(prefer?._id || prefer?.url || "");
        }
      } catch {
        if (!cancelled) {
          setChapters([]);
          setError("Failed to load subject knowledge sources.");
        }
      } finally {
        if (!cancelled) setChaptersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(() => {
    if (!selectedChapterId || selectedChapterId.startsWith("http")) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTopicsLoading(true);
      try {
        const res = await notesAPI.getTopics(selectedChapterId);
        if (!cancelled && res.data?.success) setTopics(res.data.data || []);
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChapterId]);

  useEffect(() => {
    const q = searchQ.trim();
    if (!subject || q.length < 2) {
      setSearchResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await notesAPI.searchChunks({ subject, q });
        if (!cancelled && res.data?.success) {
          setSearchResult({
            matchedChunks: res.data.data.matchedChunks,
            source: res.data.data.source,
            preview: res.data.data.preview || [],
          });
        }
      } catch {
        if (!cancelled) setSearchResult(null);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQ, subject]);

  const loadSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const res = await notesAPI.getSubjects();
      if (res.data?.success) {
        const list = res.data.data || [];
        setSubjects(list);
        if (list.length && !subject) setSubject(list[0]);
      }
    } catch {
      setError("Failed to load subjects.");
    } finally {
      setSubjectsLoading(false);
    }
  };

  const loadVectorHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await notesAPI.vectorHealth();
      if (res.data?.success) setVectorHealth(res.data.data as VectorHealth);
    } catch {
      setVectorHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const refreshChapters = async (preferId?: string) => {
    if (!subject) return;
    const res = await notesAPI.getChapters(subject);
    if (res.data?.success) {
      const list = res.data.data || [];
      setChapters(list);
      if (preferId) setSelectedChapterId(preferId);
    }
  };

  const handleSyncChapter = async (ch: NotesChapter) => {
    if (!subject || !isWebChapter(ch)) return;
    const slug = ch.slug || ch.url.replace(/\/$/, "").split("/").pop() || "";
    if (!slug) {
      setError("Could not resolve chapter slug for sync.");
      return;
    }
    setSyncingUrl(ch.url);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.syncBySlug({ slug, subject, title: ch.title });
      if (!res.data?.success) {
        setError(res.data?.message || "Sync failed");
        return;
      }
      const syncedId = res.data.data?.chapterId as string | undefined;
      if (syncedId) {
        try {
          await notesAPI.repairChapter(syncedId);
        } catch {
          /* non-fatal */
        }
      }
      await refreshChapters(syncedId || ch._id || undefined);
      setSuccess(res.data.message || `Synced "${ch.title}".`);
      void loadVectorHealth();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to sync chapter");
    } finally {
      setSyncingUrl(null);
    }
  };

  const handleSyncAllWebsite = async () => {
    if (!subject) return;
    const targets = webPending.length > 0 ? webPending : webChapters;
    if (!targets.length) {
      setError("No website chapters to sync for this subject.");
      return;
    }
    setError(null);
    setSuccess(null);
    let ok = 0;
    for (const ch of targets) {
      const slug = ch.slug || ch.url.replace(/\/$/, "").split("/").pop() || "";
      if (!slug) continue;
      setSyncingUrl(ch.url);
      try {
        const res = await notesAPI.syncBySlug({ slug, subject, title: ch.title });
        if (res.data?.success) {
          ok += 1;
          const syncedId = res.data.data?.chapterId as string | undefined;
          if (syncedId) {
            try {
              await notesAPI.repairChapter(syncedId);
            } catch {
              /* non-fatal */
            }
          }
        }
      } catch {
        /* continue */
      }
    }
    setSyncingUrl(null);
    await refreshChapters();
    void loadVectorHealth();
    if (ok > 0) {
      setSuccess(`Synced ${ok} website chapter${ok !== 1 ? "s" : ""} into the knowledge base.`);
    } else {
      setError("Website sync failed. Try syncing a single chapter.");
    }
  };

  const handleUploadPdf = async (files: File[]) => {
    if (!subject) {
      setError("Select a subject first");
      return;
    }
    if (!files.length) return;
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
    }
    setUploadingPdf(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.uploadPdf({
        files,
        subject,
        forceNew: true,
        addToKnowledge: true,
      });
      if (!res.data?.success) {
        setError(res.data?.message || "PDF upload failed");
        return;
      }
      const nextId = res.data.data?.chapter?._id;
      await refreshChapters(nextId ?? undefined);
      setSuccess(
        res.data.message ||
          `Added ${files.length} PDF(s) to ${subject} knowledge. Available for Topic Practice, module tests, and practice questions.`
      );
      void loadVectorHealth();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to upload / process PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleReprocessPdf = async (ch: NotesChapter) => {
    if (!ch._id || !isPdfChapter(ch)) return;
    setProcessingId(ch._id);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.processPdf(ch._id);
      if (!res.data?.success) {
        setError(res.data?.message || "Re-process failed");
        return;
      }
      await refreshChapters(ch._id);
      setSuccess(res.data.message || `Re-processed PDF "${ch.title}".`);
      void loadVectorHealth();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to re-process PDF");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReindex = async (ch: NotesChapter, force = false) => {
    if (!ch._id) return;
    setReindexingId(ch._id);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.reindexChapter(ch._id, force);
      if (!res.data?.success) {
        setError(res.data?.message || "Re-index failed");
        return;
      }
      await refreshChapters(ch._id);
      setSuccess(res.data.message || `Re-indexed embeddings for "${ch.title}".`);
      void loadVectorHealth();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to re-index chapter");
    } finally {
      setReindexingId(null);
    }
  };

  const handleDeletePdf = async (ch: NotesChapter) => {
    if (!ch._id) return;
    setDeletingId(ch._id);
    setError(null);
    setSuccess(null);
    try {
      const res = await notesAPI.deleteChapter(ch._id);
      if (!res.data?.success) {
        setError(res.data?.message || "Failed to remove PDF");
        return;
      }
      if (selectedChapterId === ch._id) {
        setSelectedChapterId("");
        setTopics([]);
      }
      setConfirmDelete(null);
      await refreshChapters();
      setSuccess(res.data.message || `Removed "${ch.title}" from knowledge base.`);
      void loadVectorHealth();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to remove PDF");
    } finally {
      setDeletingId(null);
    }
  };

  const busy = Boolean(syncingUrl || uploadingPdf || reindexingId || processingId || deletingId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className={`text-2xl font-semibold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <Database className="w-6 h-6 text-blue-500" />
          Knowledge Base
        </h1>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Central store for website notes + PDFs. Sync or upload once — then use the same knowledge for Topic
          Practice, module tests, and practice question generation (RAG).
        </p>
      </div>

      {error && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            isDark
              ? "bg-green-950/30 border-green-800 text-green-300"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          {success}
        </div>
      )}

      {/* Vector health */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Vector index status
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              disabled={healthLoading}
              onClick={() => void loadVectorHealth()}
            >
              {healthLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
              )}
              Refresh
            </Button>
          </div>
          <CardDescription>
            Embeddings + Qdrant power RAG search across all features that use this knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading && !vectorHealth ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking…
            </div>
          ) : vectorHealth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div
                className={`rounded-lg border px-3 py-2 ${
                  isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  Embedding
                </p>
                <p className={`mt-1 font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {vectorHealth.embedding?.configured ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {vectorHealth.embedding.model || "configured"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      Not configured
                    </span>
                  )}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {[vectorHealth.embedding?.provider, vectorHealth.embedding?.dimension
                    ? `${vectorHealth.embedding.dimension}-dim`
                    : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div
                className={`rounded-lg border px-3 py-2 ${
                  isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  Qdrant
                </p>
                <p className={`mt-1 font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {vectorHealth.qdrant?.ok ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      {vectorHealth.qdrant?.error || "Unavailable"}
                    </span>
                  )}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {[
                    vectorHealth.qdrant?.collection,
                    typeof vectorHealth.qdrant?.pointsCount === "number"
                      ? `${vectorHealth.qdrant.pointsCount} points`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Could not load vector health.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subject + sources */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Subject knowledge
          </CardTitle>
          <CardDescription>
            Pick a UPSC subject, sync notes.mentorsdaily.com chapters and/or add PDFs. All sources under one
            subject are searchable together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Subject
            </label>
            {subjectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading subjects…
              </div>
            ) : (
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setSearchQ("");
                  setSearchResult(null);
                }}
                disabled={busy}
                className={`w-full max-w-md px-4 py-2.5 rounded-lg border text-sm ${inputCls}`}
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              {subjects.length} UPSC subjects · GS Paper 1–4 + Current Affairs
            </p>
          </div>

          {subject && (
            <div
              className={`rounded-lg border px-3 py-3 text-sm ${
                isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {subject}
                    <span className={`ml-2 font-normal text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {chapters.length} source{chapters.length !== 1 ? "s" : ""} · {subjectChunkTotal} chunks
                      {pdfCount > 0 ? ` · ${pdfCount} PDF` : ""}
                      {webCount > 0 ? ` · ${webCount} web` : ""}
                    </span>
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    {syncedCount > 0
                      ? `${syncedCount} source(s) ready for RAG`
                      : "No synced knowledge yet — sync website or add PDF(s)"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []);
                      if (list.length) void handleUploadPdf(list);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy || !webChapters.length}
                    onClick={() => void handleSyncAllWebsite()}
                  >
                    {syncingUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    )}
                    Sync website notes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {uploadingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1" />
                    )}
                    {uploadingPdf ? "Uploading…" : "Add PDF(s)"}
                  </Button>
                </div>
              </div>

              {chaptersLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading sources…
                </div>
              ) : chapters.length === 0 ? (
                <p className={`mt-3 text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  No sources for this subject yet. Sync from the website or upload PDF(s).
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {chapters.map((c) => {
                    const pdf = isPdfChapter(c);
                    const web = isWebChapter(c);
                    const selected = (c._id || c.url) === selectedChapterId;
                    const isSyncing = syncingUrl === c.url;
                    const isReindexing = reindexingId === c._id;
                    const isProcessing = processingId === c._id;
                    const isDeleting = deletingId === c._id;
                    return (
                      <li
                        key={c._id || c.url}
                        className={`rounded-md border px-3 py-2 transition-colors ${
                          selected
                            ? isDark
                              ? "border-blue-600/60 bg-blue-950/20"
                              : "border-blue-300 bg-blue-50/60"
                            : isDark
                              ? "border-slate-700 hover:border-slate-600"
                              : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          disabled={busy}
                          onClick={() => setSelectedChapterId(c._id || c.url)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="min-w-0 flex-1">
                              <span className={`font-medium text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {c.title}
                              </span>
                              <span
                                className={`ml-1.5 text-[10px] font-semibold uppercase ${
                                  isDark ? "text-slate-500" : "text-slate-500"
                                }`}
                              >
                                {pdf ? "PDF" : web ? "WEB" : "SRC"}
                              </span>
                              <span className={`ml-2 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                {c.synced
                                  ? `${c.topicCount || 0} topics · ${c.chunkCount || 0} chunks`
                                  : "not synced yet"}
                              </span>
                              {c.embeddingStatus && (
                                <span className={`ml-2 text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                                  embed: {c.embeddingStatus}
                                </span>
                              )}
                              {pdf && c.originalFileName && (
                                <span className={`block mt-0.5 text-[11px] truncate ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                                  <FileText className="w-3 h-3 inline mr-1" />
                                  {c.originalFileName}
                                  {c.fileSize ? ` · ${formatBytes(c.fileSize)}` : ""}
                                </span>
                              )}
                            </span>
                            <span
                              className="flex flex-wrap gap-2 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {web && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleSyncChapter(c)}
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    isDark
                                      ? "text-blue-400 hover:text-blue-300"
                                      : "text-blue-600 hover:text-blue-700"
                                  } disabled:opacity-50`}
                                >
                                  {isSyncing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  {c.synced ? "Re-sync" : "Sync"}
                                </button>
                              )}
                              {pdf && c._id && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleReprocessPdf(c)}
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    isDark
                                      ? "text-blue-400 hover:text-blue-300"
                                      : "text-blue-600 hover:text-blue-700"
                                  } disabled:opacity-50`}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <FileText className="w-3 h-3" />
                                  )}
                                  Re-process
                                </button>
                              )}
                              {c._id && c.synced && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleReindex(c, false)}
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    isDark
                                      ? "text-blue-400 hover:text-blue-300"
                                      : "text-blue-600 hover:text-blue-700"
                                  } disabled:opacity-50`}
                                >
                                  {isReindexing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Database className="w-3 h-3" />
                                  )}
                                  Re-index
                                </button>
                              )}
                              {pdf && c._id && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirmDelete(c)}
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    isDark
                                      ? "text-red-400 hover:text-red-300"
                                      : "text-red-600 hover:text-red-700"
                                  } disabled:opacity-50`}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  Remove
                                </button>
                              )}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Topics for selected source */}
          {selectedChapter && selectedChapter._id && (
            <div>
              <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Topics in &ldquo;{selectedChapter.title}&rdquo;
              </h3>
              {topicsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
                </div>
              ) : topics.length === 0 ? (
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  No topics yet. Sync or re-process this source first.
                </p>
              ) : (
                <ul
                  className={`max-h-56 overflow-y-auto rounded-lg border divide-y text-xs ${
                    isDark ? "border-slate-700 divide-slate-700" : "border-slate-200 divide-slate-100"
                  }`}
                >
                  {topics.map((t) => (
                    <li
                      key={t._id}
                      className={`px-3 py-2 flex justify-between gap-2 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      <span className="min-w-0 truncate">{t.name}</span>
                      <span className={`shrink-0 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        {t.chunkCount || 0} chunks
                        {t.pageStart != null ? ` · p.${t.pageStart}${t.pageEnd != null && t.pageEnd !== t.pageStart ? `–${t.pageEnd}` : ""}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAG search tester */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            Test knowledge search
          </CardTitle>
          <CardDescription>
            Type a topic keyword to preview RAG matches from this subject&apos;s PDF + website chunks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-lg">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              disabled={!subject || syncedCount === 0}
              placeholder='e.g. "Basic Structure", "Harappan Civilization"'
              className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${inputCls}`}
            />
          </div>
          {!subject || syncedCount === 0 ? (
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Add synced knowledge for this subject before searching.
            </p>
          ) : searching ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </span>
          ) : searchResult ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                searchResult.matchedChunks > 0
                  ? isDark
                    ? "border-green-800/50 bg-green-950/20 text-green-200"
                    : "border-green-200 bg-green-50 text-green-800"
                  : isDark
                    ? "border-amber-800/50 bg-amber-950/20 text-amber-200"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <p className="font-medium">
                {searchResult.matchedChunks > 0
                  ? `Matched ${searchResult.matchedChunks} chunk(s) via ${searchResult.source}`
                  : `No chunks matched "${searchQ.trim()}"`}
              </p>
              {searchResult.preview?.length > 0 && (
                <ul className="mt-1.5 space-y-1 opacity-90">
                  {searchResult.preview.map((p, i) => (
                    <li key={i} className="truncate">
                      {p.heading ? `${p.heading}: ` : ""}
                      {p.excerpt}
                      {p.page != null ? ` (p.${p.page})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : searchQ.trim().length >= 2 ? null : (
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Enter at least 2 characters to search.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Use knowledge */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Ready to generate from this knowledge?
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Topic Practice uses the same subject knowledge base (RAG) you manage here.
              </p>
            </div>
            <Link
              to="/admin/topic-practice"
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium ${
                isDark
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Open Topic Practice
            </Link>
          </div>
        </CardContent>
      </Card>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-xl ${
              isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Remove PDF from knowledge base?
            </h3>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              This will permanently delete{" "}
              <strong>{confirmDelete.title}</strong>
              {confirmDelete.originalFileName ? ` (${confirmDelete.originalFileName})` : ""}
              , including {confirmDelete.chunkCount || 0} chunks and vector index entries. This cannot be undone.
            </p>
            <div className="flex gap-2 mt-5 justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!!deletingId}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!!deletingId}
                onClick={() => void handleDeletePdf(confirmDelete)}
              >
                {deletingId === confirmDelete._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Remove PDF"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseAdminPage;
