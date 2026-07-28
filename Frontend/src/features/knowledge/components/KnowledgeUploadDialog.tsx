import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  FileUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import {
  knowledgeAPI,
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_EXTENSIONS,
  formatBytes,
} from "../api";
import type {
  KbCategory,
  KbChapter,
  KbSubject,
  KbTopic,
  UploadMetadata,
  UploadQueueItem,
} from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  isDark: boolean;
  subjects: KbSubject[];
  categories: KbCategory[];
};

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_ZIP_BYTES = 500 * 1024 * 1024;

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function validateFile(file: File): string | null {
  const ext = extOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid type "${ext}". Allowed: pdf, docx, txt, md, zip`;
  }
  const max = ext === ".zip" ? MAX_ZIP_BYTES : MAX_FILE_BYTES;
  if (file.size > max) {
    return `Exceeds ${Math.round(max / (1024 * 1024))}MB limit`;
  }
  return null;
}

export const KnowledgeUploadDialog: React.FC<Props> = ({
  open,
  onClose,
  onUploaded,
  isDark,
  subjects,
  categories,
}) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chapters, setChapters] = useState<KbChapter[]>([]);
  const [topics, setTopics] = useState<KbTopic[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pausedRef = useRef<Set<string>>(new Set());

  const [meta, setMeta] = useState<UploadMetadata>({
    title: "",
    description: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    categoryId: "",
    source: "",
    publication: "",
    year: "",
    language: "English",
    tags: "",
    difficulty: "Moderate",
    contentType: "Static",
    priority: "Medium",
  });

  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  useEffect(() => {
    if (!meta.subjectId) {
      setChapters([]);
      setTopics([]);
      return;
    }
    knowledgeAPI.chapters.list(meta.subjectId).then((res) => {
      setChapters(res.data.data || []);
    });
  }, [meta.subjectId]);

  useEffect(() => {
    if (!meta.chapterId) {
      setTopics([]);
      return;
    }
    knowledgeAPI.topics
      .list({ chapterId: meta.chapterId, subjectId: meta.subjectId || undefined })
      .then((res) => setTopics(res.data.data || []));
  }, [meta.chapterId, meta.subjectId]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const next: UploadQueueItem[] = [];
    Array.from(fileList).forEach((file) => {
      const err = validateFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        return;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: "queued",
      });
    });
    if (next.length) setQueue((q) => [...q, ...next]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeItem = (id: string) => {
    setQueue((q) => {
      const item = q.find((x) => x.id === id);
      item?.abortController?.abort();
      return q.filter((x) => x.id !== id);
    });
  };

  const cancelItem = (id: string) => {
    setQueue((q) =>
      q.map((item) => {
        if (item.id !== id) return item;
        item.abortController?.abort();
        return { ...item, status: "cancelled", progress: 0 };
      })
    );
  };

  const pauseItem = (id: string) => {
    pausedRef.current.add(id);
    setQueue((q) =>
      q.map((item) => {
        if (item.id !== id) return item;
        item.abortController?.abort();
        return { ...item, status: "paused" };
      })
    );
  };

  const resumeItem = async (id: string) => {
    pausedRef.current.delete(id);
    const item = queue.find((x) => x.id === id);
    if (!item) return;
    setQueue((q) =>
      q.map((x) => (x.id === id ? { ...x, status: "queued", error: undefined } : x))
    );
  };

  const retryItem = (id: string) => {
    pausedRef.current.delete(id);
    setQueue((q) =>
      q.map((x) =>
        x.id === id
          ? { ...x, status: "queued", progress: 0, error: undefined }
          : x
      )
    );
  };

  const pendingCount = useMemo(
    () => queue.filter((q) => q.status === "queued" || q.status === "paused").length,
    [queue]
  );

  const startUpload = async () => {
    const toUpload = queue.filter(
      (q) => q.status === "queued" || q.status === "failed" || q.status === "paused"
    );
    if (!toUpload.length) {
      toast.error("Add at least one file");
      return;
    }

    setUploading(true);
    let anySuccess = false;

    for (const item of toUpload) {
      if (pausedRef.current.has(item.id)) continue;

      const controller = new AbortController();
      setQueue((q) =>
        q.map((x) =>
          x.id === item.id
            ? { ...x, status: "uploading", progress: 0, abortController: controller }
            : x
        )
      );

      try {
        const files = [item.file];
        const apiCall = files.length > 1 ? knowledgeAPI.bulkUpload : knowledgeAPI.upload;
        await apiCall(files, meta, {
          signal: controller.signal,
          onUploadProgress: (percent) => {
            setQueue((q) =>
              q.map((x) => (x.id === item.id ? { ...x, progress: percent } : x))
            );
          },
        });
        setQueue((q) =>
          q.map((x) =>
            x.id === item.id ? { ...x, status: "uploaded", progress: 100 } : x
          )
        );
        anySuccess = true;
      } catch (err: unknown) {
        if (pausedRef.current.has(item.id)) {
          setQueue((q) =>
            q.map((x) => (x.id === item.id ? { ...x, status: "paused" } : x))
          );
          continue;
        }
        const ax = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
        if (ax?.code === "ERR_CANCELED" || ax?.message === "canceled") {
          setQueue((q) =>
            q.map((x) =>
              x.id === item.id && x.status !== "paused"
                ? { ...x, status: "cancelled" }
                : x
            )
          );
          continue;
        }
        const message =
          ax?.response?.data?.message || ax?.message || "Upload failed";
        setQueue((q) =>
          q.map((x) =>
            x.id === item.id ? { ...x, status: "failed", error: message } : x
          )
        );
        toast.error(`${item.file.name}: ${message}`);
      }
    }

    setUploading(false);
    if (anySuccess) {
      toast.success("Upload complete");
      onUploaded();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${
          isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-slate-800 bg-slate-950/95" : "border-slate-100 bg-white/95"
          }`}
        >
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Upload to Knowledge Base
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              PDF, DOCX, TXT, MD, or ZIP — stored on S3 for later AI processing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragging
                ? "border-sky-500 bg-sky-500/10"
                : isDark
                  ? "border-slate-700 bg-slate-900/50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <FileUp className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Drag & drop files here, or click to browse
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Max 100MB per file · 500MB for ZIP · multiple files supported
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ALLOWED_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {queue.length > 0 && (
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.status === "uploaded" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : item.status === "failed" ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <Upload className="w-4 h-4 text-sky-500 shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium truncate ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {item.file.name}
                        </span>
                        <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {formatBytes(item.file.size)}
                        </span>
                      </div>
                      {(item.status === "uploading" || item.progress > 0) && (
                        <div className="mt-2">
                          <Progress value={item.progress} className="h-2" />
                          <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {item.status} · {item.progress}%
                          </div>
                        </div>
                      )}
                      {item.error && (
                        <p className="text-xs text-rose-500 mt-1">{item.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "uploading" && (
                        <>
                          <button type="button" title="Pause" onClick={() => pauseItem(item.id)} className="p-1.5 rounded-lg hover:bg-black/5">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" title="Cancel" onClick={() => cancelItem(item.id)} className="p-1.5 rounded-lg hover:bg-black/5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {item.status === "paused" && (
                        <button type="button" title="Resume" onClick={() => resumeItem(item.id)} className="p-1.5 rounded-lg hover:bg-black/5">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(item.status === "failed" || item.status === "cancelled") && (
                        <button type="button" title="Retry" onClick={() => retryItem(item.id)} className="p-1.5 rounded-lg hover:bg-black/5">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status !== "uploading" && (
                        <button type="button" title="Remove" onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-black/5 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Document name" isDark={isDark}>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                placeholder="Optional — defaults to filename"
              />
            </Field>
            <Field label="Category" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.categoryId}
                onChange={(e) => setMeta((m) => ({ ...m, categoryId: e.target.value }))}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.subjectId}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    subjectId: e.target.value,
                    chapterId: "",
                    topicId: "",
                  }))
                }
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Chapter" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.chapterId}
                disabled={!meta.subjectId}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, chapterId: e.target.value, topicId: "" }))
                }
              >
                <option value="">Select chapter</option>
                {chapters.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.topicId}
                disabled={!meta.chapterId}
                onChange={(e) => setMeta((m) => ({ ...m, topicId: e.target.value }))}
              >
                <option value="">Select topic</option>
                {topics.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source" isDark={isDark}>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.source}
                onChange={(e) => setMeta((m) => ({ ...m, source: e.target.value }))}
                placeholder="e.g. NCERT, MentorsDaily"
              />
            </Field>
            <Field label="Publication" isDark={isDark}>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.publication}
                onChange={(e) => setMeta((m) => ({ ...m, publication: e.target.value }))}
              />
            </Field>
            <Field label="Year" isDark={isDark}>
              <input
                type="number"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.year}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    year: e.target.value ? Number(e.target.value) : "",
                  }))
                }
                placeholder="2024"
              />
            </Field>
            <Field label="Language" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.language}
                onChange={(e) => setMeta((m) => ({ ...m, language: e.target.value }))}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Bilingual</option>
              </select>
            </Field>
            <Field label="Difficulty" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.difficulty}
                onChange={(e) => setMeta((m) => ({ ...m, difficulty: e.target.value }))}
              >
                <option>Easy</option>
                <option>Moderate</option>
                <option>Hard</option>
                <option>Static</option>
                <option>Dynamic</option>
              </select>
            </Field>
            <Field label="Static / Dynamic" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.contentType}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    contentType: e.target.value as "Static" | "Dynamic",
                  }))
                }
              >
                <option value="Static">Static</option>
                <option value="Dynamic">Dynamic</option>
              </select>
            </Field>
            <Field label="Priority" isDark={isDark}>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.priority}
                onChange={(e) => setMeta((m) => ({ ...m, priority: e.target.value }))}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </Field>
            <Field label="Tags (comma separated)" isDark={isDark}>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={meta.tags}
                onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value }))}
                placeholder="ancient, art, culture"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" isDark={isDark}>
                <textarea
                  rows={2}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                  value={meta.description}
                  onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        </div>

        <div
          className={`sticky bottom-0 flex items-center justify-between gap-3 px-5 py-4 border-t ${
            isDark ? "border-slate-800 bg-slate-950/95" : "border-slate-100 bg-white/95"
          }`}
        >
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {queue.length} file(s) · {pendingCount} ready
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Close
            </Button>
            <Button onClick={startUpload} disabled={uploading || queue.length === 0}>
              {uploading ? "Uploading…" : "Start upload"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function Field({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </span>
      {children}
    </label>
  );
}
