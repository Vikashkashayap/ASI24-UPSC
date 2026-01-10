import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Upload, Search, Calendar } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmationDialog } from '../components/ui/dialog';
import { Pagination } from '../components/ui/pagination';

interface EvaluationHistory {
  _id: string;
  pdfFileName: string;
  subject: string;
  paper: string;
  year: number;
  finalSummary?: {
    overallScore: {
      obtained: number;
      maximum: number;
      percentage: number;
      grade: string;
    };
  };
  status: string;
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface EvaluationHistoryResponse {
  evaluations: EvaluationHistory[];
  pagination: PaginationData;
}

const EvaluationHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [history, setHistory] = useState<EvaluationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<EvaluationHistory[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<string | null>(null);
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

  // Listen for evaluation completion events
  useEffect(() => {
    const handleEvaluationComplete = () => {
      loadHistory();
    };
    
    window.addEventListener('evaluation-complete', handleEvaluationComplete);
    return () => {
      window.removeEventListener('evaluation-complete', handleEvaluationComplete);
    };
  }, []);

  // Filter history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = history.filter((evaluation) => {
        return (
          evaluation.pdfFileName.toLowerCase().includes(query) ||
          evaluation.subject.toLowerCase().includes(query) ||
          evaluation.paper.toLowerCase().includes(query) ||
          evaluation.year.toString().includes(query)
        );
      });
      setFilteredHistory(filtered);
    }
  }, [searchQuery, history]);

  const loadHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const response = await copyEvaluationAPI.getHistory(page, itemsPerPage);
      if (response.data.success) {
        const data: EvaluationHistoryResponse = response.data.data;
        setHistory(data.evaluations);
        setFilteredHistory(data.evaluations);
        setPagination(data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteEvaluation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvaluationToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteEvaluation = async () => {
    if (!evaluationToDelete) return;

    setDeleting(true);
    try {
      await copyEvaluationAPI.deleteEvaluation(evaluationToDelete);
      await loadHistory(currentPage);
      setShowDeleteDialog(false);
      setEvaluationToDelete(null);
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
      alert('Failed to delete evaluation. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteEvaluation = () => {
    setShowDeleteDialog(false);
    setEvaluationToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleEvaluationClick = (evaluationId: string) => {
    navigate(`/copy-evaluation?id=${evaluationId}`);
  };

  const startNewEvaluation = () => {
    navigate('/copy-evaluation');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
            Evaluation History
          </h1>
          <p className={`text-sm md:text-base mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            View and manage all your answer copy evaluations
          </p>
        </div>
        <Button
          onClick={startNewEvaluation}
          className={`bg-purple-600 hover:bg-purple-700 text-white ${theme === "dark" ? "" : ""}`}
        >
          <Upload className="w-4 h-4 mr-2" />
          New Evaluation
        </Button>
      </div>

      {/* Search Bar */}
      <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`} />
            <input
              type="text"
              placeholder="Search by file name, subject, paper, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      {loadingHistory ? (
        <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className={`mt-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Loading evaluations...</p>
          </CardContent>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}>
          <CardContent className="p-8 text-center">
            <FileText className={`w-16 h-16 mx-auto mb-4 ${
              theme === "dark" ? "text-slate-600" : "text-slate-400"
            }`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
              {searchQuery ? 'No evaluations found' : 'No evaluations yet'}
            </h3>
            <p className={`mb-6 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Upload your first answer copy to get started with AI-powered evaluation'
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={startNewEvaluation}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload First Evaluation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHistory.map((evaluation) => (
            <Card
              key={evaluation._id}
              onClick={() => handleEvaluationClick(evaluation._id)}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700 hover:border-purple-500/50"
                  : "bg-white border-slate-200 hover:border-purple-300"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      theme === "dark" ? "bg-slate-800" : "bg-purple-50"
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        theme === "dark" ? "text-purple-400" : "text-purple-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`text-sm font-semibold mb-1 truncate ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}>
                        {evaluation.pdfFileName}
                      </CardTitle>
                      <div className={`flex items-center gap-2 text-xs ${
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(evaluation.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteEvaluation(evaluation._id, e)}
                    className={`p-1.5 rounded hover:bg-red-500/10 transition-colors ${
                      theme === "dark" ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-xs ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    <span className="font-medium">Subject:</span>
                    <span>{evaluation.subject}</span>
                  </div>
                  {evaluation.paper && (
                    <div className={`flex items-center gap-2 text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      <span className="font-medium">Paper:</span>
                      <span>{evaluation.paper}</span>
                    </div>
                  )}
                  {evaluation.finalSummary?.overallScore && (
                    <div className={`mt-3 pt-3 border-t ${
                      theme === "dark" ? "border-slate-700" : "border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>
                          Score
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            evaluation.finalSummary.overallScore.percentage >= 70 ? 'text-green-500' :
                            evaluation.finalSummary.overallScore.percentage >= 50 ? 'text-orange-500' : 'text-red-500'
                          }`}>
                            {evaluation.finalSummary.overallScore.percentage}%
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                          }`}>
                            Grade {evaluation.finalSummary.overallScore.grade}
                          </span>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      }`}>
                        {evaluation.finalSummary.overallScore.obtained} / {evaluation.finalSummary.overallScore.maximum} marks
                      </div>
                    </div>
                  )}
                  {!evaluation.finalSummary?.overallScore && (
                    <div className={`mt-3 pt-3 border-t ${
                      theme === "dark" ? "border-slate-700" : "border-slate-200"
                    }`}>
                      <span className={`text-xs ${
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      }`}>
                        {evaluation.status === 'processing' ? 'Processing...' : 'Pending evaluation'}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {history.length > 0 && (
        <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-slate-900"}>
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {history.length}
                </div>
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Total Evaluations
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {history.filter(e => e.finalSummary?.overallScore).length}
                </div>
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Completed
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {history.filter(e => e.finalSummary?.overallScore && e.finalSummary.overallScore.percentage >= 70).length}
                </div>
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Above 70%
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  history.length > 0 && history.filter(e => e.finalSummary?.overallScore).length > 0
                    ? (() => {
                        const completed = history.filter(e => e.finalSummary?.overallScore);
                        const avg = completed.reduce((sum, e) => sum + (e.finalSummary?.overallScore?.percentage || 0), 0) / completed.length;
                        return avg >= 70 ? 'text-green-500' : avg >= 50 ? 'text-orange-500' : 'text-red-500';
                      })()
                    : theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {history.length > 0 && history.filter(e => e.finalSummary?.overallScore).length > 0
                    ? Math.round(
                        history
                          .filter(e => e.finalSummary?.overallScore)
                          .reduce((sum, e) => sum + (e.finalSummary?.overallScore?.percentage || 0), 0) /
                        history.filter(e => e.finalSummary?.overallScore).length
                      )
                    : 0}%
                </div>
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Average Score
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Evaluation"
        message="Are you sure you want to delete this evaluation? This action cannot be undone."
        confirmText="Delete Evaluation"
        onConfirm={confirmDeleteEvaluation}
        onCancel={cancelDeleteEvaluation}
        loading={deleting}
      />
    </div>
  );
};

export default EvaluationHistoryPage;

