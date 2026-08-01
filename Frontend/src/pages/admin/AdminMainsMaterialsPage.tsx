import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  Video,
  FileText,
  Presentation,
  IdCard,
  X,
  Upload,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { ConfirmationDialog } from "../../components/ui/dialog";
import { useTheme } from "../../hooks/useTheme";
import {
  mainsMaterialsAPI,
  openMainsMaterialPdf,
  type MainsMaterialSession,
  type MainsMaterialFileType,
} from "../../services/api";

type FormState = {
  sessionNumber: string;
  title: string;
  description: string;
  videoUrl: string;
  status: "published" | "draft";
  ppt: File | null;
  workbook: File | null;
  referenceCards: File | null;
  clearPpt: boolean;
  clearWorkbook: boolean;
  clearReferenceCards: boolean;
};

const emptyForm = (): FormState => ({
  sessionNumber: "",
  title: "",
  description: "",
  videoUrl: "",
  status: "draft",
  ppt: null,
  workbook: null,
  referenceCards: null,
  clearPpt: false,
  clearWorkbook: false,
  clearReferenceCards: false,
});

function formatBytes(n: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function PdfField({
  label,
  icon: Icon,
  file,
  existing,
  cleared,
  isDark,
  onPick,
  onClearExisting,
  onClearNew,
  inputRef,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  file: File | null;
  existing: MainsMaterialSession["ppt"];
  cleared: boolean;
  isDark: boolean;
  onPick: (f: File | null) => void;
  onClearExisting: () => void;
  onClearNew: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const showExisting = existing?.hasFile && !cleared && !file;

  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col h-full min-w-0 ${
        isDark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-2.5 mb-3 min-w-0">
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-tight truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            {label}
          </p>
          <p className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>PDF only · max 50MB</p>
        </div>
      </div>

      <div className="flex-1 mb-3 min-h-[2.25rem]">
        {showExisting && (
          <div className={`flex items-start justify-between gap-2 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <span className="truncate" title={existing!.originalName}>
              {existing!.originalName}
              {existing!.fileSize ? ` (${formatBytes(existing!.fileSize)})` : ""}
            </span>
            <button
              type="button"
              onClick={onClearExisting}
              className={`shrink-0 font-medium ${isDark ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"}`}
            >
              Remove
            </button>
          </div>
        )}

        {file && (
          <div className={`flex items-start justify-between gap-2 text-xs ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
            <span className="truncate" title={file.name}>
              New: {file.name}
            </span>
            <button type="button" onClick={onClearNew} className="shrink-0 p-0.5" aria-label="Clear file">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {(cleared || (!showExisting && !file)) && (
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {cleared ? "Will be removed on save" : "No file uploaded"}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (f && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
            onPick(null);
            return;
          }
          onPick(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-full min-h-[38px] text-xs mt-auto"
      >
        <Upload className="w-3.5 h-3.5 mr-1.5 shrink-0" />
        {file || showExisting ? "Replace PDF" : "Upload PDF"}
      </Button>
    </div>
  );
}

export const AdminMainsMaterialsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [sessions, setSessions] = useState<MainsMaterialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MainsMaterialSession | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const pptRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<HTMLInputElement>(null);
  const refCardsRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await mainsMaterialsAPI.listAdmin();
      if (res.data.success) setSessions(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (session: MainsMaterialSession) => {
    setEditing(session);
    setForm({
      sessionNumber: String(session.sessionNumber),
      title: session.title,
      description: session.description || "",
      videoUrl: session.videoUrl || "",
      status: session.status,
      ppt: null,
      workbook: null,
      referenceCards: null,
      clearPpt: false,
      clearWorkbook: false,
      clearReferenceCards: false,
    });
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaveLoading(true);

    try {
      const fd = new FormData();
      fd.append("sessionNumber", form.sessionNumber.trim());
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("videoUrl", form.videoUrl.trim());
      fd.append("status", form.status);
      if (form.ppt) fd.append("ppt", form.ppt);
      if (form.workbook) fd.append("workbook", form.workbook);
      if (form.referenceCards) fd.append("referenceCards", form.referenceCards);
      if (editing) {
        if (form.clearPpt) fd.append("clearPpt", "true");
        if (form.clearWorkbook) fd.append("clearWorkbook", "true");
        if (form.clearReferenceCards) fd.append("clearReferenceCards", "true");
        await mainsMaterialsAPI.update(editing._id, fd);
        setSuccess("Session updated successfully.");
      } else {
        await mainsMaterialsAPI.create(fd);
        setSuccess("Session created successfully.");
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to save session");
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setError(null);
    setDeleteLoading(true);
    try {
      await mainsMaterialsAPI.delete(deleteId);
      setSuccess("Session deleted.");
      setDeleteId(null);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to delete session");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openFile = async (id: string, type: MainsMaterialFileType) => {
    const key = `${id}:${type}`;
    setOpeningFile(key);
    try {
      await openMainsMaterialPdf(id, type, true);
    } catch {
      setError("Failed to open PDF");
    } finally {
      setOpeningFile(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            Mains Materials
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Create and publish Mains 360 sessions for students.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {error && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            isDark ? "bg-red-500/10 border-red-500/40 text-red-200" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            isDark
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {success}
        </div>
      )}

      <Card className={`rounded-2xl ${isDark ? "border-blue-800/60 bg-slate-900/50" : ""}`}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-16 px-4 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <BookOpen className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center font-medium">No sessions yet</p>
              <p className="text-sm mt-1 text-center">Create your first Mains Materials session.</p>
              <Button onClick={openCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? "border-b border-slate-700" : "border-b border-slate-200"}>
                    {["#", "Title", "Materials", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${
                          h === "Actions" ? "text-right" : ""
                        } ${isDark ? "text-slate-400" : "text-slate-600"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr
                      key={s._id}
                      className={
                        isDark
                          ? "border-b border-slate-800 hover:bg-slate-800/30"
                          : "border-b border-slate-100 hover:bg-slate-50"
                      }
                    >
                      <td className={`py-3 px-4 font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        {s.sessionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-medium ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                          {s.title}
                        </div>
                        {s.description && (
                          <div className={`text-xs mt-0.5 line-clamp-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {s.videoUrl && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              <Video className="w-3 h-3" /> Video
                            </span>
                          )}
                          {s.ppt?.hasFile && (
                            <button
                              type="button"
                              onClick={() => openFile(s._id, "ppt")}
                              disabled={openingFile === `${s._id}:ppt`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700"
                              }`}
                            >
                              <Presentation className="w-3 h-3" /> PPT
                            </button>
                          )}
                          {s.workbook?.hasFile && (
                            <button
                              type="button"
                              onClick={() => openFile(s._id, "workbook")}
                              disabled={openingFile === `${s._id}:workbook`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              <FileText className="w-3 h-3" /> Workbook
                            </button>
                          )}
                          {s.referenceCards?.hasFile && (
                            <button
                              type="button"
                              onClick={() => openFile(s._id, "referenceCards")}
                              disabled={openingFile === `${s._id}:referenceCards`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              <IdCard className="w-3 h-3" /> Cards
                            </button>
                          )}
                          {!s.videoUrl && !s.ppt?.hasFile && !s.workbook?.hasFile && !s.referenceCards?.hasFile && (
                            <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.status === "published"
                              ? isDark
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-100 text-emerald-700"
                              : isDark
                                ? "bg-slate-600/50 text-slate-400"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(s)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"
                            }`}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(s._id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-600"
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saveLoading && setModalOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mains-session-modal-title"
            className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-xl border ${
              isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
                isDark ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h2
                id="mains-session-modal-title"
                className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
              >
                {editing ? "Edit Session" : "Create Session"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saveLoading}
                className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
                  <div>
                    <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Session Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={form.sessionNumber}
                      onChange={(e) => setForm((f) => ({ ...f, sessionNumber: e.target.value }))}
                      placeholder="1"
                      className={isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200"}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Session Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Essay Writing Fundamentals"
                      className={isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200"}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className={`flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      isDark
                        ? "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    }`}
                    placeholder="What this session covers…"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                  <div>
                    <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Video URL (YouTube / Vimeo)
                    </label>
                    <Input
                      type="url"
                      value={form.videoUrl}
                      onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className={isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200"}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Status
                    </label>
                    <div
                      className={`inline-flex rounded-xl p-1 ${
                        isDark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    >
                      {(["draft", "published"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, status: st }))}
                          className={`px-3.5 py-2 rounded-lg text-sm font-medium capitalize transition-colors min-h-[36px] ${
                            form.status === st
                              ? "bg-blue-600 text-white shadow-sm"
                              : isDark
                                ? "text-slate-300 hover:text-white"
                                : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium mb-2 block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Session Materials
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <PdfField
                      label="PPT"
                      icon={Presentation}
                      file={form.ppt}
                      existing={editing?.ppt || null}
                      cleared={form.clearPpt}
                      isDark={isDark}
                      inputRef={pptRef}
                      onPick={(f) => setForm((prev) => ({ ...prev, ppt: f, clearPpt: false }))}
                      onClearExisting={() => setForm((prev) => ({ ...prev, clearPpt: true, ppt: null }))}
                      onClearNew={() => setForm((prev) => ({ ...prev, ppt: null }))}
                    />
                    <PdfField
                      label="Workbook"
                      icon={FileText}
                      file={form.workbook}
                      existing={editing?.workbook || null}
                      cleared={form.clearWorkbook}
                      isDark={isDark}
                      inputRef={workbookRef}
                      onPick={(f) => setForm((prev) => ({ ...prev, workbook: f, clearWorkbook: false }))}
                      onClearExisting={() => setForm((prev) => ({ ...prev, clearWorkbook: true, workbook: null }))}
                      onClearNew={() => setForm((prev) => ({ ...prev, workbook: null }))}
                    />
                    <PdfField
                      label="Reference Cards"
                      icon={IdCard}
                      file={form.referenceCards}
                      existing={editing?.referenceCards || null}
                      cleared={form.clearReferenceCards}
                      isDark={isDark}
                      inputRef={refCardsRef}
                      onPick={(f) => setForm((prev) => ({ ...prev, referenceCards: f, clearReferenceCards: false }))}
                      onClearExisting={() =>
                        setForm((prev) => ({ ...prev, clearReferenceCards: true, referenceCards: null }))
                      }
                      onClearNew={() => setForm((prev) => ({ ...prev, referenceCards: null }))}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`flex justify-end gap-3 px-5 py-4 border-t shrink-0 ${
                  isDark ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saveLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveLoading}>
                  {saveLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Create Session"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete session"
        message="Are you sure you want to delete this session and its uploaded PDFs? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
};
