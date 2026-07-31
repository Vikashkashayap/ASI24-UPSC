import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Loader2,
  Play,
  Clock,
  FileText,
  Search,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Pagination } from "../../components/ui/pagination";
import { useTheme } from "../../hooks/useTheme";
import { prelimsMockAPI } from "../../services/api";

interface LiveMock {
  _id: string;
  subject: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  negativeMark: number;
  liveAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

const ITEMS_PER_PAGE = 8;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PrelimsMockPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [mocks, setMocks] = useState<LiveMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await prelimsMockAPI.listLive();
      if (res.data.success) setMocks(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load mocks");
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(
      mocks.map((m) => String(m.subject || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mocks]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subject = subjectFilter.trim().toLowerCase();
    return mocks.filter((m) => {
      if (subject && m.subject.toLowerCase() !== subject) return false;
      if (!q) return true;
      return (
        (m.title || "").toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q)
      );
    });
  }, [mocks, searchQuery, subjectFilter]);

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

  const handleStart = async (mockId: string) => {
    setError(null);
    setStartingId(mockId);
    try {
      const res = await prelimsMockAPI.startAttempt(mockId);
      if (res.data.success && res.data.data?.testId) {
        navigate(`/test/${res.data.data.testId}`);
        return;
      }
      setError(res.data.message || "Could not start test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; code?: string } } };
      const code = ax.response?.data?.code;
      setError(ax.response?.data?.message || "Could not start test");
      if (code === "MOCK_NOT_LIVE") {
        void load();
      }
    } finally {
      setStartingId(null);
    }
  };

  const statusLabel = (m: LiveMock) => {
    if (m.attempted && m.attempt?.isSubmitted) return "Done";
    if (m.attempted && m.attempt && !m.attempt.isSubmitted) return "In progress";
    return "Live";
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || subjectFilter.trim());

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 ${
          isDark
            ? "bg-gradient-to-br from-slate-800/90 via-amber-900/20 to-slate-900/90 border-amber-500/20 shadow-xl shadow-amber-500/10"
            : "bg-gradient-to-br from-white via-amber-50/40 to-white border-amber-200/50 shadow-xl shadow-amber-100/30"
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3 md:gap-4">
          <div
            className={`p-2.5 md:p-3 rounded-xl shrink-0 ${
              isDark ? "bg-amber-500/20" : "bg-amber-100"
            }`}
          >
            <BookOpen className={`w-6 h-6 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <div>
            <h1
              className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                isDark
                  ? "from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent"
                  : "from-amber-600 via-amber-700 to-amber-800 bg-clip-text text-transparent"
              }`}
            >
              Prelims Mock
            </h1>
            <p className={`text-sm mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Full-length GS Paper 1 mocks (100 Q · 200 marks · 120 min) scheduled by admin
            </p>
          </div>
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
            placeholder="Search by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none ${
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
          className={`sm:w-52 shrink-0 px-3 py-3 rounded-xl border-2 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none ${
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <BookOpen
              className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-slate-600" : "text-slate-400"}`}
            />
            <h3
              className={`text-lg font-medium mb-2 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {hasActiveFilters ? "No mocks found" : "No live mocks right now"}
            </h3>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {hasActiveFilters
                ? "Try adjusting your search or subject filter"
                : "Check back after your admin schedules one."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {filtered.length} live test{filtered.length === 1 ? "" : "s"}
              {hasActiveFilters ? " found" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {pageItems.map((m) => {
              const status = statusLabel(m);
              return (
                <Card
                  key={m._id}
                  className={`group relative flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    isDark
                      ? "bg-slate-800/70 border-slate-700/80 hover:border-amber-500/40"
                      : "bg-white border-slate-200/90 hover:border-amber-300 shadow-sm"
                  }`}
                >
                  <CardContent className="flex flex-col flex-1 p-4 pt-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isDark ? "bg-amber-900/40" : "bg-amber-50"
                        }`}
                      >
                        <BookOpen
                          className={`w-[18px] h-[18px] ${
                            isDark ? "text-amber-400" : "text-amber-600"
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
                                ? "bg-emerald-900/30 text-emerald-300"
                                : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <h3
                      className={`font-semibold text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] ${
                        isDark ? "text-slate-100" : "text-slate-900"
                      }`}
                      title={m.title || m.subject}
                    >
                      {m.title || m.subject}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span
                        className={`text-xs font-medium truncate max-w-[80%] ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                        title={m.subject}
                      >
                        {m.subject}
                      </span>
                    </div>

                    <div
                      className={`mt-3 space-y-1.5 text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {m.totalQuestions} Q · {m.durationMinutes} min · {m.totalMarks} marks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Live from {formatDate(m.liveAt)}</span>
                      </div>
                    </div>

                    {m.attempted && m.attempt?.isSubmitted && m.attempt.score != null ? (
                      <div
                        className={`mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 ${
                          isDark ? "bg-emerald-900/25" : "bg-emerald-50"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-emerald-600">
                          Score: {m.attempt.score}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 h-[38px]" aria-hidden />
                    )}

                    <div className="mt-auto pt-3">
                      {m.attempted && m.attempt ? (
                        m.attempt.isSubmitted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/result/${m.attempt!.testId}`)}
                          >
                            View Result
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                            onClick={() => navigate(`/test/${m.attempt!.testId}`)}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Continue
                          </Button>
                        )
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                          onClick={() => void handleStart(m._id)}
                          disabled={!!startingId}
                        >
                          {startingId === m._id ? (
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
