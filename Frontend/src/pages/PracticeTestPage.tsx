import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Target,
  Play,
  BookOpen,
  History,
  Search,
  Calendar,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Pagination } from "../components/ui/pagination";
import { useTheme } from "../hooks/useTheme";
import { assignedPracticeAPI } from "../services/api";

interface AssignedPracticeItem {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  difficulty: string;
  createdAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

const ITEMS_PER_PAGE = 8;

function formatAssignedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PracticeTestPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [assignedTests, setAssignedTests] = useState<AssignedPracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadAssignedTests();
  }, []);

  const loadAssignedTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignedPracticeAPI.listMine();
      if (res.data.success) setAssignedTests(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(
      assignedTests.map((t) => String(t.subject || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assignedTests]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subject = subjectFilter.trim().toLowerCase();
    return assignedTests.filter((t) => {
      if (subject && t.subject.toLowerCase() !== subject) return false;
      if (!q) return true;
      return (
        (t.title || "").toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.difficulty && t.difficulty.toLowerCase().includes(q))
      );
    });
  }, [assignedTests, searchQuery, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subjectFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleStart = async (id: string) => {
    setError(null);
    setStartingId(id);
    try {
      const res = await assignedPracticeAPI.startAttempt(id);
      if (res.data.success && res.data.data?.testId) {
        navigate(`/test/${res.data.data.testId}`);
        return;
      }
      setError(res.data.message || "Could not start test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Could not start test");
    } finally {
      setStartingId(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-600 bg-green-100";
      case "moderate":
        return "text-yellow-600 bg-yellow-100";
      case "hard":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const statusLabel = (t: AssignedPracticeItem) => {
    if (t.attempted && t.attempt?.isSubmitted) return "Done";
    if (t.attempted && t.attempt && !t.attempt.isSubmitted) return "In progress";
    return "Not started";
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || subjectFilter.trim());

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 ${
          isDark
            ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10"
            : "bg-gradient-to-br from-white via-blue-50/30 to-white border-blue-200/50 shadow-xl shadow-blue-100/30"
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div
              className={`p-2.5 md:p-3 rounded-xl shrink-0 ${
                isDark ? "bg-blue-500/20" : "bg-blue-100"
              }`}
            >
              <Target className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div className="min-w-0">
              <h1
                className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                  isDark
                    ? "from-blue-200 via-blue-300 to-sky-300 bg-clip-text text-transparent"
                    : "from-blue-700 via-blue-800 to-slate-800 bg-clip-text text-transparent"
                }`}
              >
                Practice Test
              </h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Tests assigned to you by your admin — topic-based practice
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigate("/practice-test/history")}
            className="flex items-center gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <History className="w-4 h-4" />
            View History
          </Button>
        </div>
      </div>

      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm text-center ${
            isDark
              ? "bg-red-950/30 border-red-800 text-red-300"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, topic, or difficulty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none ${
              isDark
                ? "bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
                : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-sm"
            }`}
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          aria-label="Filter by subject"
          className={`sm:w-52 shrink-0 px-3 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none ${
            isDark
              ? "bg-slate-800/80 border-slate-700 text-slate-200"
              : "bg-white border-slate-200 text-slate-800 shadow-sm"
          }`}
        >
          <option value="">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading practice tests…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Target
              className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-slate-600" : "text-slate-400"}`}
            />
            <h3
              className={`text-lg font-medium mb-2 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {hasActiveFilters ? "No tests found" : "No practice tests assigned yet"}
            </h3>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {hasActiveFilters
                ? "Try adjusting your search or subject filter"
                : "When your admin assigns a topic practice test, it will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {filtered.length} test{filtered.length === 1 ? "" : "s"}
              {hasActiveFilters ? " found" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {pageItems.map((t) => {
              const status = statusLabel(t);
              return (
                <Card
                  key={t._id}
                  className={`group relative flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    isDark
                      ? "bg-slate-800/70 border-slate-700/80 hover:border-blue-500/40"
                      : "bg-white border-slate-200/90 hover:border-blue-300 shadow-sm"
                  }`}
                >
                  <CardContent className="flex flex-col flex-1 p-4 pt-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isDark ? "bg-blue-900/40" : "bg-blue-50"
                        }`}
                      >
                        <BookOpen
                          className={`w-[18px] h-[18px] ${
                            isDark ? "text-blue-400" : "text-blue-600"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                          status === "Done"
                            ? isDark
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-emerald-50 text-emerald-700"
                            : status === "In progress"
                              ? isDark
                                ? "bg-amber-900/40 text-amber-400"
                                : "bg-amber-50 text-amber-700"
                              : isDark
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <h3
                      className={`font-semibold text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] ${
                        isDark ? "text-slate-100" : "text-slate-900"
                      }`}
                      title={t.title || `${t.subject} — ${t.topic}`}
                    >
                      {t.title || `${t.subject} — ${t.topic}`}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span
                        className={`text-xs font-medium truncate max-w-[55%] ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                        title={t.subject}
                      >
                        {t.subject}
                      </span>
                      {t.difficulty ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold capitalize ${getDifficultyColor(
                            t.difficulty
                          )}`}
                        >
                          {t.difficulty}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`mt-3 space-y-1.5 text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t.totalQuestions} Q · {t.durationMinutes} min
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Assigned {formatAssignedDate(t.createdAt)}
                        </span>
                      </div>
                    </div>

                    {t.attempted && t.attempt?.isSubmitted && t.attempt.score != null ? (
                      <div
                        className={`mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 ${
                          isDark ? "bg-emerald-900/25" : "bg-emerald-50"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-emerald-600">
                          Score: {t.attempt.score}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 h-[38px]" aria-hidden />
                    )}

                    <div className="mt-auto pt-3">
                      {t.attempted && t.attempt ? (
                        t.attempt.isSubmitted ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/result/${t.attempt!.testId}`)}
                          >
                            View Result
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            onClick={() => navigate(`/test/${t.attempt!.testId}`)}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Continue
                          </Button>
                        )
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          onClick={() => void handleStart(t._id)}
                          disabled={startingId === t._id}
                        >
                          {startingId === t._id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                          ) : (
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Start Test
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default PracticeTestPage;
