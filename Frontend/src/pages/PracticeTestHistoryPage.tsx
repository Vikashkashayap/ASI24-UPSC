import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, History, ArrowLeft, Target, Eye, Play } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { assignedPracticeAPI } from "../services/api";

interface HistoryItem {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty?: string;
  totalQuestions: number;
  score?: number;
  accuracy?: number;
  isSubmitted: boolean;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export const PracticeTestHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignedPracticeAPI.getHistory({ page: 1, limit: 50 });
      if (res.data.success) {
        setHistory(res.data.data?.tests || []);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className={`rounded-xl border-2 p-4 md:p-6 ${isDark ? "bg-slate-800/50 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <History className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                Practice Test History
              </h1>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Your admin-assigned practice test attempts
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/practice-test")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Practice Test
          </Button>
        </div>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}

      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="text-base">All Attempts</CardTitle>
          <CardDescription>Completed and in-progress assigned practice tests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${isDark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
              <Target className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>No practice test attempts yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {history.map((t) => (
                <li
                  key={t._id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{t.title || `${t.subject} — ${t.topic}`}</div>
                    <div className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t.subject} · {t.topic}
                    </div>
                    <div className={`text-xs mt-1 flex flex-wrap gap-2 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      <span>{t.totalQuestions} Q</span>
                      <span>·</span>
                      <span>{formatDate(t.createdAt)}</span>
                      {t.isSubmitted && t.score != null && (
                        <>
                          <span>·</span>
                          <span className={isDark ? "text-green-400" : "text-green-600"}>
                            Score: {t.score}
                            {t.accuracy != null ? ` · ${Math.round(t.accuracy)}% accuracy` : ""}
                          </span>
                        </>
                      )}
                      {!t.isSubmitted && (
                        <>
                          <span>·</span>
                          <span className={isDark ? "text-amber-400" : "text-amber-600"}>In progress</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(t.isSubmitted ? `/result/${t._id}` : `/test/${t._id}`)}
                    className="shrink-0"
                  >
                    {t.isSubmitted ? (
                      <>
                        <Eye className="w-4 h-4 mr-1.5" />
                        View Result
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1.5" />
                        Resume
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeTestHistoryPage;
