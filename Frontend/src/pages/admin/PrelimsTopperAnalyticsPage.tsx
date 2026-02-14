import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Download, Loader2, AlertCircle, Trophy } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAdminAPI } from "../../services/api";

interface AnalyticsData {
  test: {
    _id: string;
    title: string;
    totalQuestions: number;
    totalMarks: number;
    startTime: string;
    endTime: string;
  };
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  rankListTop10: Array<{
    rank: number;
    name: string;
    email: string;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    timeTaken: number;
    submittedAt: string;
  }>;
  attemptTimeline: Array<{ hour: string; count: number }>;
}

const PrelimsTopperAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      prelimsTopperAdminAPI
        .getAnalytics(id)
        .then((res) => {
          if (res.data.success) setData(res.data.data);
          else setError("Failed to load analytics");
        })
        .catch((err) => setError(err?.response?.data?.message || "Failed to load analytics"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleExportCsv = async () => {
    if (!id) return;
    try {
      const res = await prelimsTopperAdminAPI.exportCsv(id);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prelims-topper-${id}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="pt-6 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p>{error || "Analytics not found"}</p>
          </CardContent>
          <Button variant="outline" onClick={() => navigate("/admin/prelims-topper")}>
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const { test, totalAttempts, averageScore, highestScore, lowestScore, rankListTop10, attemptTimeline } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate("/admin/prelims-topper")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            {test.title}
          </CardTitle>
          <p className="text-sm opacity-80">
            {test.totalQuestions} questions · {test.totalMarks} marks · Start: {new Date(test.startTime).toLocaleString()} — End: {new Date(test.endTime).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs opacity-80">Total Attempted</p>
              <p className="text-2xl font-bold">{totalAttempts}</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs opacity-80">Average Score</p>
              <p className="text-2xl font-bold">{averageScore}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs opacity-80">Highest Score</p>
              <p className="text-2xl font-bold">{highestScore}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <p className="text-xs opacity-80">Lowest Score</p>
              <p className="text-2xl font-bold">{lowestScore}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Top 10 Rank List</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={theme === "dark" ? "text-slate-400 border-b border-slate-700" : "text-slate-600 border-b border-slate-200"}>
                    <th className="text-left py-2">Rank</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-right py-2">Score</th>
                    <th className="text-right py-2">Correct</th>
                    <th className="text-right py-2">Wrong</th>
                    <th className="text-right py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rankListTop10.map((r) => (
                    <tr key={r.rank} className={theme === "dark" ? "border-b border-slate-700/50" : "border-b border-slate-100"}>
                      <td className="py-2 font-medium">{r.rank}</td>
                      <td className="py-2">{r.name}</td>
                      <td className="py-2 text-right">{r.score}</td>
                      <td className="py-2 text-right">{r.correctAnswers}</td>
                      <td className="py-2 text-right">{r.wrongAnswers}</td>
                      <td className="py-2 text-right">{formatTime(r.timeTaken)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rankListTop10.length === 0 && (
              <p className="text-sm text-slate-500 py-4">No attempts yet.</p>
            )}
          </div>

          {attemptTimeline.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Attempt Timeline</h3>
              <div className="flex flex-wrap gap-2">
                {attemptTimeline.map(({ hour, count }) => (
                  <div
                    key={hour}
                    className={`px-3 py-1.5 rounded text-sm ${
                      theme === "dark" ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {hour}: {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrelimsTopperAnalyticsPage;
