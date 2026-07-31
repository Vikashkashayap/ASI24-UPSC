import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  History,
  ArrowLeft,
  Target,
  Play,
  Search,
  BookOpen,
  Calendar,
  FileText,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ConfirmationDialog } from "../components/ui/dialog";
import { Pagination } from "../components/ui/pagination";
import { useTheme } from "../hooks/useTheme";
import { assignedPracticeAPI, testAPI } from "../services/api";

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

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
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

export const PracticeTestHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadHistory(1, subjectFilter);
  }, [subjectFilter]);

  const loadHistory = async (page = 1, subject = subjectFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignedPracticeAPI.getHistory({
        page,
        limit: ITEMS_PER_PAGE,
        ...(subject ? { subject } : {}),
      });
      if (res.data.success) {
        setHistory(res.data.data?.tests || []);
        setPagination(res.data.data?.pagination || null);
        setCurrentPage(page);
        if (Array.isArray(res.data.data?.subjects)) {
          setSubjects(res.data.data.subjects);
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.difficulty && t.difficulty.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

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

  const handleDeleteTest = (testId: string) => {
    setTestToDelete(testId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    setDeleting(true);
    try {
      const response = await testAPI.deleteTest(testToDelete);
      if (response.data.success) {
        setShowDeleteDialog(false);
        setTestToDelete(null);
        await loadHistory(currentPage, subjectFilter);
      } else {
        alert("Failed to delete test. Please try again.");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete test. Please try again.";
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || subjectFilter.trim());

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 transition-all duration-300 ${
          isDark
            ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10"
            : "bg-gradient-to-br from-white via-blue-50/40 to-white border-blue-200/50 shadow-xl shadow-blue-100/30"
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
              <History className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h1
                className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                  isDark
                    ? "from-blue-200 via-blue-300 to-sky-300 bg-clip-text text-transparent"
                    : "from-blue-700 via-blue-800 to-slate-800 bg-clip-text text-transparent"
                }`}
              >
                Modular Test History
              </h1>
              <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Your admin-assigned modular practice test attempts
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/practice-test")}
            className="shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Practice Test
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, topic, or difficulty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-shadow ${
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
          className={`sm:w-52 shrink-0 px-3 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-shadow ${
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

      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-center text-sm ${
            isDark
              ? "bg-red-950/30 border-red-800 text-red-300"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
        </div>
      ) : filteredHistory.length === 0 ? (
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
              {hasActiveFilters ? "No tests found" : "No modular tests yet"}
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {hasActiveFilters
                ? "Try adjusting your search or subject filter"
                : "Start an assigned modular test to see it here"}
            </p>
            {!hasActiveFilters && (
              <Button
                onClick={() => navigate("/practice-test")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Target className="mr-2 h-4 w-4" />
                Go to Modular Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {pagination?.total ?? filteredHistory.length} test
              {(pagination?.total ?? filteredHistory.length) === 1 ? "" : "s"}
              {hasActiveFilters ? " found" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {filteredHistory.map((test) => (
              <Card
                key={test._id}
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                          test.isSubmitted
                            ? isDark
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-emerald-50 text-emerald-700"
                            : isDark
                              ? "bg-amber-900/40 text-amber-400"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {test.isSubmitted ? "Done" : "In progress"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTest(test._id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark
                            ? "text-slate-400 hover:text-red-400 hover:bg-red-950/40"
                            : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title="Delete test"
                        aria-label="Delete test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className={`font-semibold text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] ${
                      isDark ? "text-slate-100" : "text-slate-900"
                    }`}
                    title={test.title || test.topic}
                  >
                    {test.title || test.topic}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span
                      className={`text-xs font-medium truncate max-w-[60%] ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                      title={test.subject}
                    >
                      {test.subject}
                    </span>
                    {test.difficulty ? (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${getDifficultyColor(
                          test.difficulty
                        )}`}
                      >
                        {test.difficulty}
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
                      <span>{test.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatDate(test.createdAt)}</span>
                    </div>
                  </div>

                  {test.isSubmitted && test.score !== undefined ? (
                    <div
                      className={`mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 ${
                        isDark ? "bg-emerald-900/25" : "bg-emerald-50"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-sm font-semibold text-emerald-600">
                        {test.score}/{test.totalQuestions}
                      </span>
                      {test.accuracy !== undefined && (
                        <span className="text-[11px] text-emerald-600/80 ml-auto">
                          {Math.round(test.accuracy)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 h-[38px]" aria-hidden />
                  )}

                  <div className="mt-auto pt-3">
                    {test.isSubmitted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/result/${test._id}`)}
                      >
                        View Review
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/test/${test._id}`)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Continue
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.pages > 1 && !searchQuery && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) => void loadHistory(page, subjectFilter)}
            />
          )}
        </>
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Test"
        message="Are you sure you want to delete this modular test attempt? This action cannot be undone."
        confirmText="Delete Test"
        onConfirm={confirmDeleteTest}
        onCancel={() => {
          setShowDeleteDialog(false);
          setTestToDelete(null);
        }}
        loading={deleting}
      />
    </div>
  );
};

export default PracticeTestHistoryPage;
