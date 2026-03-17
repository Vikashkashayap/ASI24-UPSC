import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Download,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  User,
  Mail,
  ClipboardList,
  Award,
  Target,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
} from "recharts";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { adminAPI } from "../../services/api";
import Papa from "papaparse";

interface TestRow {
  testId: string;
  mockId: string | null;
  mockTitle: string;
  date: string | null;
  score: number;
  accuracy: number;
  rank: number | null;
  attempted: number;
  correct: number;
  wrong: number;
  timeTaken: number;
}

interface SubjectRow {
  subject: string;
  accuracy: number;
  attempted: number;
  correct: number;
}

interface PerformanceData {
  student: { name: string; email: string };
  summary: {
    totalTests: number;
    avgScore: number;
    avgAccuracy: number;
    highestScore: number;
    lowestScore: number;
  };
  tests: TestRow[];
  subjectAnalysis: SubjectRow[];
}

function formatTimeTaken(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export const StudentPerformancePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminAPI
      .getStudentPerformance(studentId)
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) setData(res.data.data as PerformanceData);
        else setError("Failed to load performance");
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to load performance");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const improvementTrend = useMemo(() => {
    if (!data?.tests?.length || data.tests.length < 3) return null;
    const chronological = [...data.tests].reverse().slice(-3).map((t) => t.score);
    const increasing = chronological[0] <= chronological[1] && chronological[1] <= chronological[2]
      && (chronological[0] < chronological[2] || chronological[1] < chronological[2]);
    return increasing ? "improving" : "needs_improvement";
  }, [data?.tests]);

  const scoreChartData = useMemo(() => {
    if (!data?.tests?.length) return [];
    return [...data.tests].reverse().map((t, i) => ({
      name: `Test ${i + 1}`,
      testName: t.mockTitle?.slice(0, 20) + (t.mockTitle?.length > 20 ? "…" : ""),
      score: t.score,
      fullName: t.mockTitle,
    }));
  }, [data?.tests]);

  const rankChartData = useMemo(() => {
    if (!data?.tests?.length) return [];
    return [...data.tests]
      .filter((t) => t.rank != null)
      .reverse()
      .map((t, i) => ({
        name: `Test ${i + 1}`,
        testName: t.mockTitle?.slice(0, 20) + (t.mockTitle?.length > 20 ? "…" : ""),
        rank: t.rank,
        fullName: t.mockTitle,
      }));
  }, [data?.tests]);

  const subjectChartData = useMemo(() => {
    if (!data?.subjectAnalysis?.length) return [];
    return data.subjectAnalysis.map((s) => ({
      name: s.subject.length > 15 ? s.subject.slice(0, 15) + "…" : s.subject,
      fullName: s.subject,
      accuracy: s.accuracy,
      attempted: s.attempted,
      correct: s.correct,
    }));
  }, [data?.subjectAnalysis]);

  const handleDownloadCSV = () => {
    if (!data?.tests?.length) return;
    const rows = data.tests.map((t) => ({
      Test: t.mockTitle,
      Score: t.score,
      Rank: t.rank ?? "",
      Accuracy: `${t.accuracy}%`,
      Attempted: t.attempted,
      Correct: t.correct,
      Wrong: t.wrong,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-performance-${data.student?.name?.replace(/\s+/g, "-") || studentId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSubjectBarColor = (accuracy: number) => {
    if (accuracy < 50) return isDark ? "#f87171" : "#dc2626";
    if (accuracy > 70) return isDark ? "#4ade80" : "#16a34a";
    return isDark ? "#fbbf24" : "#ca8a04";
  };

  if (!studentId) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className={isDark ? "text-slate-400" : "text-slate-600"}>Invalid student.</p>
        <Button variant="outline" className="mt-2" onClick={() => navigate("/admin/prelims-mock")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div
          className={`rounded-lg border p-4 flex items-center gap-2 ${
            isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error || "Performance data not found"}
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className={isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-800"}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={handleDownloadCSV} disabled={!data.tests?.length} className="bg-amber-600 hover:bg-amber-500">
          <Download className="w-4 h-4 mr-2" /> Download Student Report (CSV)
        </Button>
      </div>

      {/* Student header */}
      <div
        className={`rounded-xl border-2 p-6 ${
          isDark ? "bg-slate-800/50 border-amber-500/20" : "bg-amber-50/50 border-amber-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              {data.student.name || "—"}
            </h1>
            {data.student.email && (
              <p className={`flex items-center gap-2 mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                <Mail className="w-4 h-4" />
                {data.student.email}
              </p>
            )}
            {improvementTrend !== null && (
              <p className={`mt-2 text-sm font-medium flex items-center gap-1 ${
                improvementTrend === "improving"
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}>
                {improvementTrend === "improving" ? (
                  <>Improving <TrendingUp className="w-4 h-4" /></>
                ) : (
                  <>Needs Improvement <TrendingDown className="w-4 h-4" /></>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <div className={`rounded-lg border px-4 py-2 ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-500">
                <ClipboardList className="w-4 h-4" /> Total Tests
              </div>
              <p className="text-lg font-bold">{data.summary.totalTests}</p>
            </div>
            <div className={`rounded-lg border px-4 py-2 ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 text-xs font-medium text-green-500">
                <Award className="w-4 h-4" /> Avg Score
              </div>
              <p className="text-lg font-bold">{data.summary.avgScore}</p>
            </div>
            <div className={`rounded-lg border px-4 py-2 ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-500">
                <Target className="w-4 h-4" /> Avg Accuracy
              </div>
              <p className="text-lg font-bold">{data.summary.avgAccuracy}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score trend */}
        <div className={`rounded-xl border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}`}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Score Trend
          </h3>
          {scoreChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={scoreChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="testName" tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <YAxis tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <Tooltip
                  contentStyle={isDark ? { background: "#1e293b", border: "1px solid #475569" } : undefined}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className={`py-12 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>No test data for chart</p>
          )}
        </div>

        {/* Rank trend */}
        <div className={`rounded-xl border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}`}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" /> Rank Trend
          </h3>
          {rankChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rankChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="testName" tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <YAxis tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} reversed />
                <Tooltip
                  contentStyle={isDark ? { background: "#1e293b", border: "1px solid #475569" } : undefined}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  formatter={(value: number) => [`Rank ${value}`, "Rank"]}
                />
                <Line type="monotone" dataKey="rank" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} name="Rank" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className={`py-12 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>No rank data (mock tests only)</p>
          )}
        </div>
      </div>

      {/* Subject-wise accuracy bar chart */}
      <div className={`rounded-xl border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}`}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" /> Subject-wise Accuracy
        </h3>
        {subjectChartData.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-3 mb-2 text-xs">
              <span className={isDark ? "text-red-400" : "text-red-600"}>■ &lt;50% Weak</span>
              <span className={isDark ? "text-amber-400" : "text-amber-600"}>■ 50–70%</span>
              <span className={isDark ? "text-green-400" : "text-green-600"}>■ &gt;70% Strong</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectChartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <Tooltip
                  contentStyle={isDark ? { background: "#1e293b", border: "1px solid #475569" } : undefined}
                  formatter={(value: number) => [`${value}%`, "Accuracy"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                />
                <Bar dataKey="accuracy" name="Accuracy" radius={[0, 4, 4, 0]}>
                  {subjectChartData.map((entry, index) => (
                    <Cell key={index} fill={getSubjectBarColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className={`py-12 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>No subject data</p>
        )}
      </div>

      {/* Test history table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-slate-700" : "border-slate-200"}`}>
        <h3 className={`text-sm font-semibold p-4 border-b ${isDark ? "border-slate-700 bg-slate-800/50" : "bg-slate-50 border-slate-200"}`}>
          Test History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className={isDark ? "bg-slate-800/80 text-slate-300" : "bg-slate-100 text-slate-700"}>
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Test Name</th>
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-right py-3 px-4 font-semibold">Score</th>
                <th className="text-right py-3 px-4 font-semibold">Rank</th>
                <th className="text-right py-3 px-4 font-semibold">Accuracy</th>
                <th className="text-right py-3 px-4 font-semibold">Attempted</th>
                <th className="text-right py-3 px-4 font-semibold">Correct</th>
                <th className="text-right py-3 px-4 font-semibold">Wrong</th>
                <th className="text-right py-3 px-4 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {!data.tests?.length ? (
                <tr>
                  <td colSpan={9} className={`py-8 text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    No tests attempted yet.
                  </td>
                </tr>
              ) : (
                data.tests.map((t) => (
                  <tr
                    key={t.testId}
                    className={`border-t ${isDark ? "border-slate-700 hover:bg-slate-800/50" : "hover:bg-slate-50"}`}
                  >
                    <td className="py-3 px-4 font-medium truncate max-w-[200px]" title={t.mockTitle}>
                      {t.mockTitle || "—"}
                    </td>
                    <td className="py-3 px-4">{formatDate(t.date)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{t.score}</td>
                    <td className="py-3 px-4 text-right">{t.rank != null ? t.rank : "—"}</td>
                    <td className="py-3 px-4 text-right">{t.accuracy}%</td>
                    <td className="py-3 px-4 text-right">{t.attempted}</td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{t.correct}</td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{t.wrong}</td>
                    <td className="py-3 px-4 text-right">{formatTimeTaken(t.timeTaken)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
