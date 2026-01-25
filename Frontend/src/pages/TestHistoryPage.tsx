import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Play, Target, Calendar, Search, BookOpen, TrendingUp, Eye, X, CheckCircle, XCircle, History } from 'lucide-react';
import { testAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmationDialog } from '../components/ui/dialog';
import { Pagination } from '../components/ui/pagination';

interface TestHistory {
  _id: string;
  subject: string;
  topic: string;
  difficulty: string;
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
  const [history, setHistory] = useState<TestHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<TestHistory[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [loadingTestDetails, setLoadingTestDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePageChange = (page: number) => {
    loadHistory(page);
  };

  // Listen for test completion events
  useEffect(() => {
    const handleTestComplete = () => {
      loadHistory();
    };

    window.addEventListener('test-complete', handleTestComplete);
    return () => {
      window.removeEventListener('test-complete', handleTestComplete);
    };
  }, []);

  // Filter history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const filtered = history.filter(test =>
        test.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.difficulty.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [searchQuery, history]);

  const loadHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const response = await testAPI.getTests(page, itemsPerPage);
      if (response.data.success) {
        const data: TestHistoryResponse = response.data.data;
        setHistory(data.tests);
        setPagination(data.pagination);
        setCurrentPage(page);
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
        await loadHistory(currentPage);
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
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-8 px-3 md:px-4">
      {/* Enhanced Header */}
      <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
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
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent" 
                : "from-amber-600 via-amber-700 to-amber-800 bg-clip-text text-transparent"
            }`}>
              Test History
            </h1>
            <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              View and manage your previously generated UPSC Prelims tests
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-amber-50/20 border-amber-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <CardContent className="pt-6 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by topic, subject, or difficulty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "border-slate-300 bg-white"
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      {loadingHistory ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className={`w-16 h-16 mx-auto mb-4 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`} />
            <h3 className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {searchQuery ? 'No tests found' : 'No tests yet'}
            </h3>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {searchQuery ? 'Try adjusting your search query' : 'Generate your first test to see it here'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate('/test-generator')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Target className="mr-2 h-4 w-4" />
                Generate Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((test) => (
            <Card key={test._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"}`}>
                        <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {test.topic}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                            {test.subject}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(test.difficulty)}`}>
                            {test.difficulty}
                          </span>
                          <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {test.totalQuestions} questions
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`} />
                          <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {formatDate(test.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score and Actions */}
                  <div className="flex items-center gap-3">
                    {test.isSubmitted && test.score !== undefined && (
                      <div className="text-right">
                        <div className="flex items-center gap-1">
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

                    <div className="flex gap-2">
                      {test.isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadTestDetails(test._id)}
                          disabled={loadingTestDetails}
                        >
                          {loadingTestDetails ? 'Loading...' : 'View Details'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/test/${test._id}`)}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Continue Test
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTest(test._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
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
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-inherit">
              <div>
                <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  {selectedTest.topic}
                </h2>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  {selectedTest.subject} • {selectedTest.difficulty} • {selectedTest.totalQuestions} questions
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTestDetails(false)}
              >
                <X className="w-4 h-4" />
              </Button>
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
                      <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
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
                {selectedTest.questions.map((question: any, index: number) => (
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
                            Q{index + 1}. {question.question}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(question.options).map(([key, value]: [string, any]) => (
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
                              {key === question.correctAnswer && (
                                <CheckCircle className="inline w-4 h-4 ml-2 text-green-600" />
                              )}
                              {key === question.userAnswer && key !== question.correctAnswer && (
                                <XCircle className="inline w-4 h-4 ml-2 text-red-600" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {question.explanation && (
                          <div className={`p-3 rounded-lg ${
                            theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                          } border`}>
                            <p className={`text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                              Explanation:
                            </p>
                            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Test"
        message="Are you sure you want to delete this test? This action cannot be undone."
        confirmText="Delete Test"
        onConfirm={confirmDeleteTest}
        onCancel={cancelDeleteTest}
        loading={deleting}
      />
    </div>
  );
};

export default TestHistoryPage;
