import React, { useState, useEffect } from "react";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";

interface ImportedTest {
  _id: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
}

export const PrelimsImportAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const [tests, setTests] = useState<ImportedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [questionPdf, setQuestionPdf] = useState<File | null>(null);
  const [answerKeyPdf, setAnswerKeyPdf] = useState<File | null>(null);

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
      formData.append("questionPdf", questionPdf);
      if (answerKeyPdf) formData.append("answerKeyPdf", answerKeyPdf);

      const res = await prelimsImportAPI.uploadTest(formData);
      if (res.data.success) {
        setSuccess(
          `Test imported: ${res.data.data.totalQuestions} questions saved.`
        );
        setTitle("");
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

  const isDark = theme === "dark";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
        UPSC Prelims Test Import
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Upload a typed UPSC question paper PDF. Only English questions are extracted; Hindi text is ignored.
      </p>

      <Card className={isDark ? "bg-slate-900/50 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Question Paper PDF
          </CardTitle>
          <CardDescription>
            PDF must contain typed text. Format: 1. In the / With reference to / Consider the / Which of the ... (a) ... (b) ... (c) ... (d)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              {success}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Test title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UPSC 2024 GS Paper 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Question paper PDF (required)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-800 dark:file:bg-slate-700 dark:file:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Answer key PDF (optional)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setAnswerKeyPdf(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-800 dark:file:bg-slate-700 dark:file:text-slate-200"
              />
            </div>

            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Import Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-medium mb-3 text-slate-800 dark:text-slate-100">
          Imported tests
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : tests.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No tests imported yet.</p>
        ) : (
          <ul className="space-y-2">
            {tests.map((t) => (
              <li
                key={t._id}
                className={`p-3 rounded-lg ${isDark ? "bg-slate-800/50" : "bg-slate-100"} text-slate-700 dark:text-slate-300`}
              >
                <span className="font-medium">{t.title}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-2">
                  — {t.totalQuestions} questions
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
