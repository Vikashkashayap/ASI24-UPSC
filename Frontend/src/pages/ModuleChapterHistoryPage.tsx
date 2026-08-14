import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  History,
  Play,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { syllabusTargetsAPI, testAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ConfirmationDialog } from "../components/ui/dialog";
import { Pagination } from "../components/ui/pagination";

type ChapterAttempt = {
  _id: string;
  subject: string;
  topic: string;
  difficulty?: string;
  totalQuestions: number;
  score?: number;
  accuracy?: number;
  isSubmitted: boolean;
  correctAnswers?: number;
  wrongAnswers?: number;
  createdAt: string;
};

const ITEMS_PER_PAGE = 8;

const ModuleChapterHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const topicFromUrl = searchParams.get("topic") || "";
  const subjectFromUrl = searchParams.get("subject") || "";
  const [history, setHistory] = useState<ChapterAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(topicFromUrl);
  const [subjectFilter, setSubjectFilter] = useState(subjectFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSearchQuery(topicFromUrl);
  }, [topicFromUrl]);

  useEffect(() => {
    setSubjectFilter(subjectFromUrl);
  }, [subjectFromUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await syllabusTargetsAPI.listMyChapterHistory();
        if (!cancelled && res.data?.success) {
          const attempts = res.data.data.attempts || [];
          const seen = new Set<string>();
          const unique: ChapterAttempt[] = [];
          for (const row of attempts) {
            const key = String(row.topic || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            unique.push(row);
          }
          setHistory(unique);
        }
      } catch {
        if (!cancelled) setError("Could not load chapter test history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => {
    const set = new Set(
      history
        .map((t) => String(t.subject || "").trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [history]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subject = subjectFilter.trim().toLowerCase();
    return history.filter((t) => {
      if (subject && t.subject.toLowerCase() !== subject) return false;
      if (!q) return true;
      return (
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.difficulty && t.difficulty.toLowerCase().includes(q))
      );
    });
  }, [history, searchQuery, subjectFilter]);

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

  const syncUrl = (topic: string, subject: string) => {
    const next = new URLSearchParams(searchParams);
    if (topic.trim()) next.set("topic", topic.trim());
    else next.delete("topic");
    if (subject.trim()) next.set("subject", subject.trim());
    else next.delete("subject");
    setSearchParams(next, { replace: true });
  };

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    syncUrl(value, subjectFilter);
  };

  const onSubjectChange = (value: string) => {
    setSubjectFilter(value);
    syncUrl(searchQuery, value);
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
        setHistory((prev) => prev.filter((t) => t._id !== testToDelete));
        setShowDeleteDialog(false);
        setTestToDelete(null);
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

  const cancelDeleteTest = () => {
    setShowDeleteDialog(false);
    setTestToDelete(null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || subjectFilter.trim());

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 transition-all duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10"
            : "bg-gradient-to-br from-white via-blue-50/40 to-white border-blue-200/50 shadow-xl shadow-blue-100/30"
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div
              className={`p-2.5 md:p-3 rounded-xl shrink-0 ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}
            >
              <History
                className={`w-6 h-6 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h1
                className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                  theme === "dark"
                    ? "from-blue-200 via-blue-300 to-sky-300 bg-clip-text text-transparent"
                    : "from-blue-700 via-blue-800 to-slate-800 bg-clip-text text-transparent"
                }`}
              >
                Chapter Test History
              </h1>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {topicFromUrl
                  ? `Filtered for: ${topicFromUrl}`
                  : "View and review your Module Targets chapter-wise practice tests"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/daily-targets")}
            className="shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by chapter topic or difficulty..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-shadow ${
              theme === "dark"
                ? "bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
                : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-sm"
            }`}
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => onSubjectChange(e.target.value)}
          aria-label="Filter by subject"
          className={`sm:w-52 shrink-0 px-3 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-shadow ${
            theme === "dark"
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText
              className={`w-16 h-16 mx-auto mb-4 ${
                theme === "dark" ? "text-slate-600" : "text-slate-400"
              }`}
            />
            <h3
              className={`text-lg font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {hasActiveFilters ? "No tests found" : "No chapter tests yet"}
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {hasActiveFilters
                ? "Try adjusting your search or subject filter"
                : "Take a chapter Test from Module Targets on Daily Targets to see it here"}
            </p>
            {!hasActiveFilters && (
              <Button
                onClick={() => navigate("/daily-targets")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Target className="mr-2 h-4 w-4" />
                Go to Module Targets
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {filtered.length} test{filtered.length === 1 ? "" : "s"}
              {hasActiveFilters ? " found" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {pageItems.map((test) => (
              <Card
                key={test._id}
                className={`group relative flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  theme === "dark"
                    ? "bg-slate-800/70 border-slate-700/80 hover:border-blue-500/40"
                    : "bg-white border-slate-200/90 hover:border-blue-300 shadow-sm"
                }`}
              >
                <CardContent className="flex flex-col flex-1 p-4 pt-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        theme === "dark" ? "bg-blue-900/40" : "bg-blue-50"
                      }`}
                    >
                      <BookOpen
                        className={`w-[18px] h-[18px] ${
                          theme === "dark" ? "text-blue-400" : "text-blue-600"
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                          test.isSubmitted
                            ? theme === "dark"
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-emerald-50 text-emerald-700"
                            : theme === "dark"
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
                          theme === "dark"
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
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                    title={test.topic}
                  >
                    {test.topic}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span
                      className={`text-xs font-medium truncate max-w-[60%] ${
                        theme === "dark" ? "text-slate-300" : "text-slate-600"
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
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
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
                        theme === "dark" ? "bg-emerald-900/25" : "bg-emerald-50"
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Test"
        message="This chapter test will move to trash. Only an admin can restore it. After 30 days it is permanently deleted."
        confirmText="Delete Test"
        onConfirm={confirmDeleteTest}
        onCancel={cancelDeleteTest}
        loading={deleting}
      />
    </div>
  );
};

export default ModuleChapterHistoryPage;
