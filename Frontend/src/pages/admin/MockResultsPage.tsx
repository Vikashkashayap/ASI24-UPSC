import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Download,
  Search,
  Trophy,
  Users,
  TrendingUp,
  Award,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { prelimsMockAPI } from "../../services/api";
import Papa from "papaparse";

interface ResultRow {
  rank: number;
  studentId: string;
  name: string;
  email: string;
  attempted: number;
  correct: number;
  wrong: number;
  score: number;
  accuracy: number;
  timeTaken: number;
}

interface MockResultsData {
  mock: { _id: string; title: string; subject: string; totalQuestions: number };
  results: ResultRow[];
  stats: {
    totalAttempted: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
}

const PAGE_SIZE = 15;

function formatTimeTaken(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

export const MockResultsPage: React.FC = () => {
  const { mockId } = useParams<{ mockId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<MockResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "score">("rank");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!mockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    prelimsMockAPI
      .getResults(mockId)
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          setData(res.data.data as MockResultsData);
        } else {
          setError("Failed to load results");
        }
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to load results");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const filteredAndSorted = useMemo(() => {
    if (!data?.results) return [];
    let list = [...data.results];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.email && r.email.toLowerCase().includes(q))
      );
    }
    if (sortBy === "score") {
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return a.timeTaken - b.timeTaken;
      });
    }
    return list;
  }, [data?.results, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, page]);

  const handleDownloadCSV = () => {
    if (!data?.results?.length) return;
    const rows = data.results.map((r) => ({
      Rank: r.rank,
      Name: r.name,
      "No. of Q": data.mock?.totalQuestions ?? "",
      Attempted: r.attempted,
      Correct: r.correct,
      Wrong: r.wrong,
      Score: r.score,
      Accuracy: `${r.accuracy}%`,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-results-${data.mock?.title?.replace(/\s+/g, "-") || mockId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl" title="1st">🥇</span>;
    if (rank === 2) return <span className="text-xl" title="2nd">🥈</span>;
    if (rank === 3) return <span className="text-xl" title="3rd">🥉</span>;
    return null;
  };

  const isDark = theme === "dark";

  if (!mockId) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className={isDark ? "text-slate-400" : "text-slate-600"}>Invalid mock.</p>
        <Button variant="outline" className="mt-2" onClick={() => navigate("/admin/prelims-mock")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Prelims Mock
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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
          {error || "Results not found"}
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/prelims-mock")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Prelims Mock
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/prelims-mock")}
            className={isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-800"}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Prelims Mock
          </Button>
          <h1 className="text-xl font-semibold mt-1 truncate">
            {data.mock.title || data.mock.subject || "Mock Results"}
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {data.mock.subject} · {data.mock.totalQuestions} questions
          </p>
        </div>
        <Button onClick={handleDownloadCSV} disabled={!data.results?.length} className="bg-amber-600 hover:bg-amber-500">
          <Download className="w-4 h-4 mr-2" /> Download Results (CSV)
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`rounded-lg border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <Users className="w-4 h-4" /> Total Attempted
          </div>
          <p className="text-2xl font-bold mt-1">{data.stats.totalAttempted}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
            <TrendingUp className="w-4 h-4" /> Average Score
          </div>
          <p className="text-2xl font-bold mt-1">{data.stats.averageScore}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
            <Award className="w-4 h-4" /> Highest
          </div>
          <p className="text-2xl font-bold mt-1">{data.stats.highestScore}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Trophy className="w-4 h-4" /> Lowest
          </div>
          <p className="text-2xl font-bold mt-1">{data.stats.lowestScore}</p>
        </div>
      </div>

      {/* Search & sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm ${
              isDark ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"
            }`}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "rank" | "score")}
          className={`px-3 py-2 rounded-lg border text-sm ${
            isDark ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"
          }`}
        >
          <option value="rank">Sort by Rank</option>
          <option value="score">Sort by Score</option>
        </select>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-slate-700" : "border-slate-200"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className={isDark ? "bg-slate-800/80 text-slate-300" : "bg-slate-100 text-slate-700"}>
              <tr>
                <th className="text-left py-3 px-4 font-semibold sticky left-0 z-10 bg-inherit">Rank</th>
                <th className="text-left py-3 px-4 font-semibold">Student Name</th>
                <th className="text-left py-3 px-4 font-semibold hidden sm:table-cell">Email</th>
                <th className="text-right py-3 px-4 font-semibold">No. of Q</th>
                <th className="text-right py-3 px-4 font-semibold">Attempted</th>
                <th className="text-right py-3 px-4 font-semibold">Correct</th>
                <th className="text-right py-3 px-4 font-semibold">Wrong</th>
                <th className="text-right py-3 px-4 font-semibold">Score</th>
                <th className="text-right py-3 px-4 font-semibold">Accuracy</th>
                <th className="text-right py-3 px-4 font-semibold">Time Taken</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`py-8 text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {data.results.length === 0
                      ? "No submissions yet for this mock."
                      : "No students match your search."}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.studentId || row.rank}
                    className={`border-t ${
                      row.rank <= 3
                        ? isDark
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-amber-50/80 border-amber-200"
                        : isDark
                          ? "border-slate-700 hover:bg-slate-800/50"
                          : "hover:bg-slate-50"
                    }`}
                  >
                    <td className={`py-3 px-4 font-medium sticky left-0 z-10 ${isDark ? "bg-inherit" : ""}`}>
                      <span className="inline-flex items-center gap-1">
                        {getRankBadge(row.rank)}
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {row.studentId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/student-performance/${row.studentId}`)}
                          className={`font-medium text-left w-full hover:underline focus:outline-none focus:underline ${
                            theme === "dark" ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"
                          }`}
                        >
                          {row.name || "—"}
                        </button>
                      ) : (
                        <span className="font-medium">{row.name || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell truncate max-w-[180px]">
                      {row.email || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">{data.mock?.totalQuestions ?? "—"}</td>
                    <td className="py-3 px-4 text-right">{row.attempted}</td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{row.correct}</td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{row.wrong}</td>
                    <td className="py-3 px-4 text-right font-semibold">{row.score}</td>
                    <td className="py-3 px-4 text-right">{row.accuracy}%</td>
                    <td className="py-3 px-4 text-right">{formatTimeTaken(row.timeTaken)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAndSorted.length)} of{" "}
            {filteredAndSorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className={`text-sm px-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
