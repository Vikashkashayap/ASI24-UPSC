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
  TrendingUp,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { syllabusTargetsAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
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

const ITEMS_PER_PAGE = 10;

const ModuleChapterHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const topicFromUrl = searchParams.get("topic") || "";
  const [history, setHistory] = useState<ChapterAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(topicFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(topicFromUrl);
  }, [topicFromUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await syllabusTargetsAPI.listMyChapterHistory();
        if (!cancelled && res.data?.success) {
          setHistory(res.data.data.attempts || []);
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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (t) =>
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.difficulty && t.difficulty.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("topic", value.trim());
    else next.delete("topic");
    setSearchParams(next, { replace: true });
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-8 px-3 md:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
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
            <div className="flex flex-col gap-1 md:gap-2 min-w-0">
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
                className={`text-sm md:text-base ${
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
            onClick={() => navigate("/home")}
            className="shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      <Card
        className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark"
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg"
            : "bg-gradient-to-br from-white to-blue-50/20 border-blue-200/50 shadow-lg"
        }`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <CardContent className="pt-6 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by chapter topic, subject, or difficulty..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "border-slate-300 bg-white"
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-red-600 text-sm">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
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
              {searchQuery ? "No tests found" : "No chapter tests yet"}
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {searchQuery
                ? "Try adjusting your search query"
                : "Take a chapter Test from Module Targets on Home to see it here"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate("/home")}
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
          <div className="grid gap-4">
            {pageItems.map((test) => (
              <Card key={test._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
                          }`}
                        >
                          <BookOpen
                            className={`w-5 h-5 ${
                              theme === "dark" ? "text-blue-400" : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold text-lg ${
                              theme === "dark" ? "text-slate-200" : "text-slate-900"
                            }`}
                          >
                            {test.topic}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
                                theme === "dark" ? "text-slate-300" : "text-slate-700"
                              }`}
                            >
                              {test.subject}
                            </span>
                            {test.difficulty ? (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                                  test.difficulty
                                )}`}
                              >
                                {test.difficulty}
                              </span>
                            ) : null}
                            <span
                              className={`text-sm ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {test.totalQuestions} questions
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar
                              className={`w-4 h-4 ${
                                theme === "dark" ? "text-slate-400" : "text-slate-500"
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {formatDate(test.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {test.isSubmitted && test.score !== undefined && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {test.score}/{test.totalQuestions}
                            </span>
                          </div>
                          {test.accuracy !== undefined && (
                            <span className="text-sm text-green-600">
                              {Math.round(test.accuracy)}% accuracy
                            </span>
                          )}
                        </div>
                      )}

                      {test.isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/result/${test._id}`)}
                        >
                          View Review
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/test/${test._id}`)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Continue Test
                        </Button>
                      )}
                    </div>
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
    </div>
  );
};

export default ModuleChapterHistoryPage;
