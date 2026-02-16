import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  BarChart3,
  Calendar,
  Edit2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { prelimsTopperAPI } from "../../services/api";

interface PrelimsTest {
  _id: string;
  title: string;
  duration: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  totalQuestions: number;
  createdAt: string;
}

export const PrelimsTopperAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<PrelimsTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(120);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questionPdf, setQuestionPdf] = useState<File | null>(null);
  const [answerKeyPdf, setAnswerKeyPdf] = useState<File | null>(null);
  const [explanationPdf, setExplanationPdf] = useState<File | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.adminListTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !questionPdf || !answerKeyPdf || !startTime || !endTime) {
      setError("Please fill all fields and upload both PDFs");
      return;
    }
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("duration", String(duration));
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);
      formData.append("questionPdf", questionPdf);
      formData.append("answerKeyPdf", answerKeyPdf);
      if (explanationPdf) formData.append("explanationPdf", explanationPdf);

      const res = await prelimsTopperAPI.adminUpload(formData);
      if (res.data.success) {
        setSuccess("Test created successfully!");
        setTitle("");
        setDuration(120);
        setStartTime("");
        setEndTime("");
        setQuestionPdf(null);
        setAnswerKeyPdf(null);
        setExplanationPdf(null);
        loadTests();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create test");
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    try {
      const test = tests.find((t) => t._id === id);
      if (!test) return;
      await prelimsTopperAPI.adminUpdateTest(id, { isPublished: !current });
      setSuccess(current ? "Test unpublished" : "Test published");
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test? All attempts will be removed.")) return;
    try {
      await prelimsTopperAPI.adminDeleteTest(id);
      setSuccess("Test deleted");
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className={`rounded-xl p-6 border-2 ${theme === "dark" ? "bg-slate-800/50 border-amber-500/20" : "bg-white border-amber-200"}`}>
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <FileText className="w-6 h-6 text-amber-500" />
          Prelims Topper Test - Admin Panel
        </h1>
        <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Upload Question Paper + Answer Key. Add Explanation PDF to show explanations after submit.
        </p>
      </div>

      {/* Upload Form */}
      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Test
          </CardTitle>
        <CardDescription>
          Upload Question Paper + Answer Key. Explanation PDF optional (for post-submit explanations).
        </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Prelims Topper Test - January 2025"
                className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 120)}
                  min={60}
                  max={300}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                />
              </div>
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Question Paper PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Answer Key PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAnswerKeyPdf(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Explanation PDF (optional)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setExplanationPdf(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Shown after submit</p>
              </div>
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
                  Processing PDFs...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tests List */}
      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle>Created Tests</CardTitle>
          <CardDescription>Manage Prelims Topper Tests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : tests.length === 0 ? (
            <p className={`text-center py-8 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              No tests yet. Upload PDFs above to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {tests.map((t) => (
                <div
                  key={t._id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${
                    theme === "dark" ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{t.title}</h3>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      {t.totalQuestions} questions • {t.duration} mins •{" "}
                      {new Date(t.startTime).toLocaleString()} – {new Date(t.endTime).toLocaleString()}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                        t.isPublished ? "bg-green-500/20 text-green-600" : "bg-slate-500/20 text-slate-500"
                      }`}
                    >
                      {t.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(t._id, t.isPublished)}
                      className={t.isPublished ? "border-amber-500 text-amber-600" : ""}
                    >
                      {t.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/prelims-topper/analytics/${t._id}`)}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-500/10"
                      onClick={() => handleDelete(t._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
