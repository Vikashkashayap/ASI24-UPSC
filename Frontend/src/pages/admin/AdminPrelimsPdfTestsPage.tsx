import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useTheme } from "../../hooks/useTheme";
import { adminPrelimsPdfAPI, PrelimsPdfTestAdminItem } from "../../services/api";
import { Upload, FileText, Calendar, Clock, List, Loader2, AlertCircle } from "lucide-react";

export const AdminPrelimsPdfTestsPage = () => {
  const { theme } = useTheme();
  const [list, setList] = useState<PrelimsPdfTestAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(120);
  const [negativeMarking, setNegativeMarking] = useState(0.66);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questionPdf, setQuestionPdf] = useState<File | null>(null);
  const [solutionPdf, setSolutionPdf] = useState<File | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await adminPrelimsPdfAPI.list();
      if (res.data.success) setList(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Test title is required");
      return;
    }
    if (!questionPdf) {
      setError("Question Paper PDF is required");
      return;
    }
    if (!solutionPdf) {
      setError("Solution PDF is required");
      return;
    }
    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    if (end <= start) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("duration", String(duration));
      formData.append("negativeMarking", String(negativeMarking));
      formData.append("startTime", start.toISOString());
      formData.append("endTime", end.toISOString());
      formData.append("questionPdf", questionPdf);
      formData.append("solutionPdf", solutionPdf);
      const res = await adminPrelimsPdfAPI.create(formData);
      if (res.data.success) {
        setTitle("");
        setDuration(120);
        setNegativeMarking(0.66);
        setStartTime("");
        setEndTime("");
        setQuestionPdf(null);
        setSolutionPdf(null);
        loadList();
      } else {
        setError(res.data.message || "Create failed");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create test");
    } finally {
      setCreating(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">PDF-Based Scheduled Prelims Tests</h1>

        <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className={isDark ? "text-slate-200" : "text-slate-900"}>Create New Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Test Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GS Paper 1 Mock - Feb 2025"
                  className={isDark ? "bg-slate-800 border-slate-600" : ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Duration (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 120)}
                    className={isDark ? "bg-slate-800 border-slate-600" : ""}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Negative marking</label>
                  <Input
                    type="number"
                    step={0.01}
                    min={0}
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(parseFloat(e.target.value) || 0.66)}
                    className={isDark ? "bg-slate-800 border-slate-600" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Start Time</label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={isDark ? "bg-slate-800 border-slate-600" : ""}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>End Time</label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={isDark ? "bg-slate-800 border-slate-600" : ""}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Question Paper PDF (UPSC format, bilingual)</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)}
                  className={isDark ? "bg-slate-800 border-slate-600" : ""}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Solution PDF (answer key)</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSolutionPdf(e.target.files?.[0] || null)}
                  className={isDark ? "bg-slate-800 border-slate-600" : ""}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" disabled={creating} className="bg-purple-600 hover:bg-purple-700">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating... </> : <><Upload className="w-4 h-4 mr-2" /> Create Test</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className={isDark ? "text-slate-200" : "text-slate-900"}>Existing PDF Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : list.length === 0 ? (
              <p className={isDark ? "text-slate-400" : "text-slate-600"}>No PDF tests yet. Create one above.</p>
            ) : (
              <ul className="space-y-3">
                {list.map((t) => (
                  <li
                    key={t._id}
                    className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">{t.title}</span>
                    <span className={isDark ? "text-slate-500" : "text-slate-500"}>
                      <Clock className="w-3 h-3 inline mr-0.5" />{t.duration} min
                    </span>
                    <span className={isDark ? "text-slate-500" : "text-slate-500"}>
                      <Calendar className="w-3 h-3 inline mr-0.5" />
                      {new Date(t.startTime).toLocaleString()} – {new Date(t.endTime).toLocaleString()}
                    </span>
                    <span className={isDark ? "text-slate-500" : "text-slate-500"}>
                      <List className="w-3 h-3 inline mr-0.5" />{t.totalQuestions} Q
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
