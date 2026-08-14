import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Play, Target, Calendar, Search, BookOpen, TrendingUp, Eye, X, CheckCircle, XCircle, History } from 'lucide-react';
import { testAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmationDialog } from '../components/ui/dialog';
import { Pagination } from '../components/ui/pagination';
import { ExamReviewExplanation } from '../components/exam/ExamQuestionBody';
import { ExamLanguageToggle } from '../components/exam/ExamLanguageToggle';
import { useExamLanguage } from '../hooks/useExamLanguage';
import { useClientSideHindiQuestions } from '../hooks/useClientSideHindiQuestions';
import { resolveOption, resolveStem } from '../utils/bilingualQuestion';

interface TestHistory {
  _id: string;
  subject: string;
  examType?: "GS" | "CSAT";
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

interface TestHistoryResponse {
  tests: TestHistory[];
  pagination: PaginationData;
}

const TestHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { lang: examLang, setLang: setExamLang } = useExamLanguage();
  const [history, setHistory] = useState<TestHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<TestHistory[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [loadingTestDetails, setLoadingTestDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const itemsPerPage = 8;

  const { questions: historyDisplayQuestions } = useClientSideHindiQuestions(
    selectedTest?.questions || [],
    examLang,
    0,
    { includeExplanations: true, prefetchAll: true }
  );

  useEffect(() => {
    loadHistory(1, subjectFilter);
  }, [subjectFilter]);

  const handlePageChange = (page: number) => {
    loadHistory(page, subjectFilter);
  };

  // Listen for test completion events
  useEffect(() => {
    const handleTestComplete = () => {
      loadHistory(currentPage, subjectFilter);
    };

    window.addEventListener('test-complete', handleTestComplete);
    return () => {
      window.removeEventListener('test-complete', handleTestComplete);
    };
  }, [currentPage, subjectFilter]);

  // Filter current page by search query (subject is handled server-side)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = history.filter(test =>
        test.topic.toLowerCase().includes(q) ||
        test.subject.toLowerCase().includes(q) ||
        (test.difficulty && test.difficulty.toLowerCase().includes(q)) ||
        (test.examType && test.examType.toLowerCase().includes(q))
      );
      setFilteredHistory(filtered);
    }
  }, [searchQuery, history]);

  const loadHistory = async (page = 1, subject = subjectFilter) => {
    setLoadingHistory(true);
    try {
      const response = await testAPI.getTests(page, itemsPerPage, subject);
      if (response.data.success) {
        const data: TestHistoryResponse & { subjects?: string[] } = response.data.data;
        setHistory(data.tests);
        setPagination(data.pagination);
        setCurrentPage(page);
        if (Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
        }
      }
    } catch (error) {
      console.error('Error loading test history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadTestDetails = async (testId: string) => {
    setLoadingTestDetails(true);
    try {
      const response = await testAPI.getTest(testId);
      if (response.data.success) {
        setSelectedTest(response.data.data);
        setShowTestDetails(true);
      }
    } catch (error) {
      console.error('Error loading test details:', error);
    } finally {
      setLoadingTestDetails(false);
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
        // Reload the current page to get updated pagination
        await loadHistory(currentPage, subjectFilter);
        // Close modal if the deleted test was being viewed
        if (selectedTest && selectedTest._id === testToDelete) {
          setShowTestDetails(false);
          setSelectedTest(null);
        }
        setShowDeleteDialog(false);
        setTestToDelete(null);
      } else {
        alert('Failed to delete test. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting test:', error);
      alert(error.response?.data?.message || 'Failed to delete test. Please try again.');
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
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-8 px-3 md:px-4">
      {/* Enhanced Header */}
      <div className={`relative overflow-hidden rounded-2xl p-5 md:p-6 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-amber-900/20 to-slate-900/90 border-amber-500/20 shadow-xl shadow-amber-500/10" 
          : "bg-gradient-to-br from-white via-amber-50/30 to-white border-amber-200/50 shadow-xl shadow-amber-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3 md:gap-4">
          <div className={`p-2.5 md:p-3 rounded-xl ${
            theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
          }`}>
            <History className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent" 
                : "from-amber-600 via-amber-700 to-amber-800 bg-clip-text text-transparent"
            }`}>
              Test History
            </h1>
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              View and manage your previously generated UPSC Prelims tests
            </p>
          </div>
        </div>
      </div>

      {/* Search + subject filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by topic or difficulty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-shadow ${
              theme === "dark"
                ? "bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
                : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-sm"
            }`}
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          aria-label="Filter by subject"
          className={`sm:w-52 shrink-0 px-3 py-3 rounded-xl border-2 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-shadow ${
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

      {/* History Grid */}
      {loadingHistory ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className={`w-16 h-16 mx-auto mb-4 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`} />
            <h3 className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {searchQuery || subjectFilter ? 'No tests found' : 'No tests yet'}
            </h3>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {searchQuery || subjectFilter
                ? 'Try adjusting your search or subject filter'
                : 'Generate your first test to see it here'}
            </p>
            {!searchQuery && !subjectFilter && (
              <Button
                onClick={() => navigate('/test-generator')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Target className="mr-2 h-4 w-4" />
                Generate Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              {pagination?.total ?? filteredHistory.length} test
              {(pagination?.total ?? filteredHistory.length) === 1 ? "" : "s"}
              {searchQuery || subjectFilter ? " found" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {filteredHistory.map((test) => (
              <Card
                key={test._id}
                className={`group relative flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  theme === "dark"
                    ? "bg-slate-800/70 border-slate-700/80 hover:border-amber-500/40"
                    : "bg-white border-slate-200/90 hover:border-amber-300 shadow-sm"
                }`}
              >
                <CardContent className="flex flex-col flex-1 p-4 pt-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        theme === "dark" ? "bg-amber-900/40" : "bg-amber-50"
                      }`}
                    >
                      <BookOpen
                        className={`w-[18px] h-[18px] ${
                          theme === "dark" ? "text-amber-400" : "text-amber-600"
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
                      className={`text-xs font-medium truncate max-w-[55%] ${
                        theme === "dark" ? "text-slate-300" : "text-slate-600"
                      }`}
                      title={test.subject}
                    >
                      {test.subject}
                    </span>
                    {test.examType === "CSAT" ? (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        CSAT
                      </span>
                    ) : test.difficulty ? (
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
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && !searchQuery && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
        />
      )}

      {/* Test Details Modal */}
      {showTestDetails && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          } border shadow-xl`}>
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-inherit gap-3">
              <div className="min-w-0">
                <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  {selectedTest.topic}
                </h2>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  {selectedTest.subject} • {selectedTest.difficulty} • {selectedTest.totalQuestions} questions
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ExamLanguageToggle lang={examLang} onChange={setExamLang} compact />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTestDetails(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Test Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Target className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                      <div>
                        <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          Score
                        </p>
                        <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {selectedTest.score}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-5 h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                      <div>
                        <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          Accuracy
                        </p>
                        <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {selectedTest.accuracy}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                      <div>
                        <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          Correct Answers
                        </p>
                        <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {selectedTest.correctAnswers}/{selectedTest.totalQuestions}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  Questions & Answers
                </h3>
                {historyDisplayQuestions.map((question: any, index: number) => {
                  const stem = resolveStem(question, examLang);
                  const optionKeys = Object.keys(question.options_en || question.options || {});
                  return (
                  <Card key={index} className={`${
                    question.userAnswer === question.correctAnswer
                      ? theme === "dark" ? "border-green-700 bg-green-950/20" : "border-green-200 bg-green-50"
                      : theme === "dark" ? "border-red-700 bg-red-950/20" : "border-red-200 bg-red-50"
                  }`}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Question */}
                        <div>
                          <p className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            Q{index + 1}.{" "}
                            {examLang === "hi" && stem.source === "missing"
                              ? "अनुवाद हो रहा है…"
                              : stem.primary}
                          </p>
                          {examLang === "both" && stem.secondary ? (
                            <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              {stem.secondary}
                            </p>
                          ) : null}
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {optionKeys.map((key) => {
                            const opt = resolveOption(question, key as "A" | "B" | "C" | "D", examLang);
                            const value =
                              examLang === "hi" && opt.source === "missing"
                                ? "अनुवाद हो रहा है…"
                                : opt.primary;
                            return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border text-sm ${
                                key === question.correctAnswer
                                  ? theme === "dark" ? "border-green-600 bg-green-900/30 text-green-300" : "border-green-600 bg-green-100 text-green-800"
                                  : key === question.userAnswer && key !== question.correctAnswer
                                  ? theme === "dark" ? "border-red-600 bg-red-900/30 text-red-300" : "border-red-600 bg-red-100 text-red-800"
                                  : theme === "dark" ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span className="font-medium">{key}.</span> {value}
                              {examLang === "both" && opt.secondary ? (
                                <span className="block text-xs opacity-70 mt-0.5">{opt.secondary}</span>
                              ) : null}
                              {key === question.correctAnswer && (
                                <CheckCircle className="inline w-4 h-4 ml-2 text-green-600" />
                              )}
                              {key === question.userAnswer && key !== question.correctAnswer && (
                                <XCircle className="inline w-4 h-4 ml-2 text-red-600" />
                              )}
                            </div>
                            );
                          })}
                        </div>

                        {/* Explanation — bilingual, per-option why (correct / wrong) */}
                        {(question.explanation ||
                          question.explanation_en ||
                          question.explanation_hi) && (
                          <ExamReviewExplanation
                            question={question}
                            userAnswer={question.userAnswer ?? null}
                            lang={examLang}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Test"
        message="This test will move to trash. Only an admin can restore it. After 30 days it is permanently deleted."
        confirmText="Delete Test"
        onConfirm={confirmDeleteTest}
        onCancel={cancelDeleteTest}
        loading={deleting}
      />
    </div>
  );
};

export default TestHistoryPage;
