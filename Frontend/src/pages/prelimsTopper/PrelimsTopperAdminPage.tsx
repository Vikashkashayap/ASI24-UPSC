import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  BarChart3,
  Calendar,
  Edit2,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { prelimsImportAPI } from "../../services/api";

const EXAM_TYPES = [
  { value: "", label: "Custom (set manually)" },
  { value: "UPSC Prelims GS Paper 1", label: "UPSC Prelims GS Paper 1" },
] as const;

const UPSC_GS_PAPER_1_CONFIG = {
  totalQuestions: 100,
  duration: 120,
  marksPerQuestion: 2,
  negativeMark: 0.66,
  totalMarks: 200,
};

interface ImportedTest {
  _id: string;
  title: string;
  totalQuestions: number;
  startTime: string | null;
  endTime: string | null;
  examType?: string | null;
  duration?: number;
  marksPerQuestion?: number;
  negativeMark?: number;
  totalMarks?: number;
  createdAt: string;
}

function toDatetimeLocal(d: string | Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatSchedule(start: string | null, end: string | null): string {
  if (!start && !end) return "Always active";
  const s = start ? new Date(start).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—";
  const e = end ? new Date(end).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—";
  return `${s} → ${e}`;
}

export const PrelimsTopperAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<ImportedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questionPdf, setQuestionPdf] = useState<File | null>(null);
  const [answerKeyPdf, setAnswerKeyPdf] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsImportAPI.listImportedTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a test title");
      return;
    }
    if (!questionPdf) {
      setError("Please upload the question paper PDF");
      return;
    }
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (examType) formData.append("examType", examType);
      if (examType === "UPSC Prelims GS Paper 1") {
        formData.append("duration", String(UPSC_GS_PAPER_1_CONFIG.duration));
        formData.append("marksPerQuestion", String(UPSC_GS_PAPER_1_CONFIG.marksPerQuestion));
        formData.append("negativeMark", String(UPSC_GS_PAPER_1_CONFIG.negativeMark));
        formData.append("totalMarks", String(UPSC_GS_PAPER_1_CONFIG.totalMarks));
      }
      if (startTime) formData.append("startTime", new Date(startTime).toISOString());
      if (endTime) formData.append("endTime", new Date(endTime).toISOString());
      formData.append("questionPdf", questionPdf);
      if (answerKeyPdf) formData.append("answerKeyPdf", answerKeyPdf);

      const res = await prelimsImportAPI.uploadTest(formData);
      if (res.data.success) {
        setSuccess(
          `Test imported: ${res.data.data.totalQuestions} questions saved. Set schedule so students see it only during the chosen time.`
        );
        setTitle("");
        setExamType("");
        setStartTime("");
        setEndTime("");
        setQuestionPdf(null);
        setAnswerKeyPdf(null);
        loadTests();
      } else {
        setError(res.data.message || "Upload failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openEditSchedule = (t: ImportedTest) => {
    setEditId(t._id);
    setEditStart(toDatetimeLocal(t.startTime));
    setEditEnd(toDatetimeLocal(t.endTime));
  };

  const saveSchedule = async () => {
    if (!editId) return;
    setSavingSchedule(true);
    setError(null);
    try {
      await prelimsImportAPI.updateImportedTest(editId, {
        startTime: editStart || null,
        endTime: editEnd || null,
      });
      setSuccess("Schedule updated.");
      setEditId(null);
      loadTests();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to update schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDelete = async (t: ImportedTest) => {
    if (!confirm(`Delete "${t.title}"? All questions and attempts will be removed. This cannot be undone.`)) return;
    setDeletingId(t._id);
    setError(null);
    try {
      await prelimsImportAPI.deleteImportedTest(t._id);
      setSuccess("Test deleted.");
      loadTests();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to delete test");
    } finally {
      setDeletingId(null);
    }
  };

  const isDark = theme === "dark";
  const isUpscGsPaper1 = examType === "UPSC Prelims GS Paper 1";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className={`rounded-xl p-6 border-2 ${isDark ? "bg-slate-800/50 border-amber-500/20" : "bg-white border-amber-200"}`}>
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <FileText className="w-6 h-6 text-amber-500" />
          Prelims Topper Test - Admin Panel
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Upload a typed UPSC question paper PDF (e.g. 100 questions). Only English questions are extracted. Set start and end time so the test is active only in that window for students.
        </p>
      </div>

      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Test
          </CardTitle>
          <CardDescription>
            PDF must contain typed text. Format: 1. In the / With reference to / Consider the / Which of the ... (a) ... (b) ... (c) ... (d)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Test title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UPSC 2024 GS Paper 1"
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Exam type
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
              >
                {EXAM_TYPES.map((opt) => (
                  <option key={opt.value || "custom"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {isUpscGsPaper1 && (
              <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900/50 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm font-medium mb-3 ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                  UPSC Prelims GS Paper 1 — fixed marking (read-only)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className={isDark ? "text-slate-500" : "text-slate-600"}>Questions</span>
                    <p className="font-semibold">{UPSC_GS_PAPER_1_CONFIG.totalQuestions}</p>
                  </div>
                  <div>
                    <span className={isDark ? "text-slate-500" : "text-slate-600"}>Duration</span>
                    <p className="font-semibold">{UPSC_GS_PAPER_1_CONFIG.duration} mins</p>
                  </div>
                  <div>
                    <span className={isDark ? "text-slate-500" : "text-slate-600"}>Marks/Q</span>
                    <p className="font-semibold">+{UPSC_GS_PAPER_1_CONFIG.marksPerQuestion}</p>
                  </div>
                  <div>
                    <span className={isDark ? "text-slate-500" : "text-slate-600"}>Negative</span>
                    <p className="font-semibold">-{UPSC_GS_PAPER_1_CONFIG.negativeMark}</p>
                  </div>
                </div>
                <p className={`text-xs mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Total marks = {UPSC_GS_PAPER_1_CONFIG.totalMarks}. Actual question count will be from uploaded PDF.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start time (when test becomes active)
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Leave empty = active immediately</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  End time (when test closes)
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Leave empty = no end</p>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Question Paper PDF *
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Answer Key PDF (optional)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setAnswerKeyPdf(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Import Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle>Created Tests</CardTitle>
          <CardDescription>Manage schedule and view analytics. Students see tests only when status is Live (within start–end time).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : tests.length === 0 ? (
            <p className={`text-center py-8 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              No tests yet. Upload a question paper PDF above to create one.
            </p>
          ) : (
            <ul className="space-y-3">
              {tests.map((t) => (
                <li
                  key={t._id}
                  className={`p-4 rounded-xl border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{t.title}</p>
                      <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {t.totalQuestions} Questions | {t.duration ?? 120} mins | -{(t.negativeMark ?? 0.66).toFixed(2)} Negative
                      </p>
                      <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatSchedule(t.startTime, t.endTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                        onClick={() => openEditSchedule(t)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/admin/prelims-topper/analytics/${t._id}`)}
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Analytics
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-500/50 hover:bg-red-500/10"
                        onClick={() => handleDelete(t)}
                        disabled={deletingId === t._id}
                      >
                        {deletingId === t._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit schedule</CardTitle>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start time</label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End time</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                <Button onClick={saveSchedule} disabled={savingSchedule} className="bg-amber-600 hover:bg-amber-700">
                  {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
