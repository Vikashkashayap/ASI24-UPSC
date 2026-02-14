import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, BarChart3, Download, Loader2, AlertCircle, Trophy, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAdminAPI } from "../../services/api";

interface PrelimsTestRow {
  _id: string;
  title: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

const PrelimsTopperAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<PrelimsTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [totalMarks, setTotalMarks] = useState(200);
  const [negativeMarking, setNegativeMarking] = useState(0.66);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [questionPdf, setQuestionPdf] = useState<File | null>(null);
  const [solutionPdf, setSolutionPdf] = useState<File | null>(null);
  const [useBilingualPdf, setUseBilingualPdf] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAdminAPI.listTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!startTime || !endTime) {
      setFormError("Start and end date/time are required");
      return;
    }
    if (useBilingualPdf && !questionPdf) {
      setFormError("Question PDF is required for bilingual PDF mode");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("startTime", new Date(startTime).toISOString());
      formData.append("endTime", new Date(endTime).toISOString());

      if (useBilingualPdf) {
        formData.append("totalMarks", String(totalMarks));
        formData.append("negativeMarking", String(negativeMarking));
        formData.append("durationMinutes", String(durationMinutes));
        formData.append("questionPdf", questionPdf!);
        if (solutionPdf) formData.append("answerKeyPdf", solutionPdf);
        const res = await prelimsTopperAdminAPI.uploadPdf(formData);
        if (res.data.success) {
          setShowForm(false);
          resetForm();
          loadTests();
        } else {
          setFormError(res.data.message || "PDF upload failed");
        }
      } else {
        formData.append("totalQuestions", String(totalQuestions));
        formData.append("totalMarks", String(totalMarks));
        formData.append("negativeMarking", String(negativeMarking));
        formData.append("durationMinutes", String(durationMinutes));
        if (answerKey.trim()) formData.append("answerKey", answerKey.trim());
        if (questionPdf) formData.append("questionPdf", questionPdf);
        if (solutionPdf) formData.append("solutionPdf", solutionPdf);
        const res = await prelimsTopperAdminAPI.createTest(formData);
        if (res.data.success) {
          setShowForm(false);
          resetForm();
          loadTests();
        } else {
          setFormError(res.data.message || "Create failed");
        }
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to create test");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTotalQuestions(100);
    setTotalMarks(200);
    setNegativeMarking(0.66);
    setDurationMinutes(120);
    setStartTime("");
    setEndTime("");
    setAnswerKey("");
    setQuestionPdf(null);
    setSolutionPdf(null);
    setUseBilingualPdf(false);
  };

  const handleReparse = async (testId: string) => {
    try {
      const res = await prelimsTopperAdminAPI.reparsePdf(testId);
      if (res.data.success) {
        loadTests();
      } else {
        alert(res.data.message || "Re-parse failed");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Re-parse failed");
    }
  };

  const handleExportCsv = async (testId: string) => {
    try {
      const res = await prelimsTopperAdminAPI.exportCsv(testId);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prelims-topper-${testId}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          Prelims Topper Test (Admin)
        </h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Manual Test
        </Button>
      </div>

      {showForm && (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle>Create Prelims Topper Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <p className="text-sm text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </p>
              )}
              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  id="bilingualPdf"
                  checked={useBilingualPdf}
                  onChange={(e) => setUseBilingualPdf(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="bilingualPdf" className="text-sm font-medium">
                  Create from PDF (Bilingual Hindi + English)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" required />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {!useBilingualPdf && (
                <div>
                  <label className="block text-sm font-medium mb-1">Total Questions</label>
                  <Input type="number" min={1} value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} />
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Total Marks</label>
                  <Input type="number" min={0} value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Negative per wrong</label>
                  <Input type="number" min={0} step={0.01} value={negativeMarking} onChange={(e) => setNegativeMarking(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <Input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date & Time</label>
                  <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              {!useBilingualPdf && (
              <div>
                <label className="block text-sm font-medium mb-1">Answer Key (JSON, e.g. {`{"0":"A","1":"B"}`})</label>
                <textarea
                  className={`w-full min-h-[80px] px-3 py-2 rounded border text-sm font-mono ${
                    theme === "dark" ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300"
                  }`}
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  placeholder='{"0":"A","1":"B","2":"C",...}'
                />
              </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Question PDF {useBilingualPdf && <span className="text-amber-500">(required)</span>}
                  </label>
                  <Input type="file" accept=".pdf" onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {useBilingualPdf ? "Answer Key PDF (optional)" : "Solution PDF"}
                  </label>
                  <Input type="file" accept=".pdf" onChange={(e) => setSolutionPdf(e.target.files?.[0] || null)} />
                </div>
              </div>
              {useBilingualPdf && (
                <p className="text-xs text-slate-500">
                  Bilingual mode: Parses Hindi + English from PDF. Questions numbered 1-100. Answer key format: 1. (c), 2. (a), etc.
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Test
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
      ) : error ? (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="pt-6 text-red-500">{error}</CardContent>
        </Card>
      ) : tests.length === 0 ? (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="py-12 text-center text-slate-500">No Prelims Topper tests yet. Create one above.</CardContent>
        </Card>
      ) : (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map((t) => (
                <div
                  key={t._id}
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border ${
                    theme === "dark" ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm opacity-80">
                      {t.totalQuestions} Q · {t.totalMarks} marks · {t.durationMinutes} min · Start: {formatDate(t.startTime)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleReparse(t._id)} title="Re-parse Question PDF">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reparse PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/prelims-topper/analytics/${t._id}`)}>
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCsv(t._id)}>
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrelimsTopperAdminPage;
