import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Upload, Search, CheckCircle2, Trophy, TrendingUp } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ConfirmationDialog } from '../components/ui/dialog';
import { Pagination } from '../components/ui/pagination';
import { CopyCard, PerformanceCard, AnalyticsSkeleton } from '../components/analytics';

interface EvaluationHistory {
  _id: string;
  pdfFileName: string;
  fileName?: string;
  subject: string;
  paper: string;
  year: number;
  overallMarks?: number;
  maxMarks?: number;
  percentage?: number;
  questionText?: string;
  grade?: string;
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

const getEvaluationScore = (evaluation: EvaluationHistory) => {
  if (evaluation.overallMarks != null && evaluation.maxMarks) {
    const pct =
      evaluation.percentage ??
      Math.round((evaluation.overallMarks / evaluation.maxMarks) * 100);
    return {
      obtained: evaluation.overallMarks,
      maximum: evaluation.maxMarks,
      percentage: pct,
    };
  }
  if (evaluation.finalSummary?.overallScore) {
    return evaluation.finalSummary.overallScore;
  }
  return null;
};

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
          (evaluation.fileName || evaluation.pdfFileName).toLowerCase().includes(query) ||
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

  const summary = useMemo(() => {
    const completed = history.filter((e) => getEvaluationScore(e));
    const avg =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, e) => sum + (getEvaluationScore(e)?.percentage || 0), 0) /
              completed.length
          )
        : 0;
    const top = completed.reduce((max, e) => Math.max(max, getEvaluationScore(e)?.percentage || 0), 0);
    return {
      total: history.length,
      completed: completed.length,
      pending: history.length - completed.length,
      avg,
      top,
      above70: completed.filter((e) => (getEvaluationScore(e)?.percentage || 0) >= 70).length,
    };
  }, [history]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 pb-[max(2rem,env(safe-area-inset-bottom))] md:space-y-6 md:px-4">
      <header className="flex flex-col gap-4 rounded-[20px] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/40 to-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Evaluation History
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              Submitted copies Â· pending Â· evaluated Â· AI feedback
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startNewEvaluation}
          className="app-chrome-btn inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-[13px] font-bold text-white shadow-md shadow-blue-600/20 active:scale-95"
        >
          <Upload className="h-4 w-4" />
          New Evaluation
        </button>
      </header>

      {history.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <PerformanceCard label="Submitted" value={String(summary.total)} icon={FileText} tone="blue" />
          <PerformanceCard label="Evaluated" value={String(summary.completed)} icon={CheckCircle2} tone="emerald" />
          <PerformanceCard label="Average" value={`${summary.avg}%`} icon={TrendingUp} tone="violet" />
          <PerformanceCard label="Top score" value={`${summary.top}%`} icon={Trophy} tone="amber" />
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search by file name, subject, paper, or yearâ€¦"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[14px] font-medium text-slate-900 shadow-soft outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          aria-label="Search evaluations"
        />
      </div>

      {loadingHistory ? (
        <AnalyticsSkeleton />
      ) : filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-16 text-center shadow-soft">
          <FileText className="mb-3 h-14 w-14 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? "No evaluations found" : "No evaluations yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm font-medium text-slate-500">
            {searchQuery
              ? "Try adjusting your search query"
              : "Upload your first answer copy to get AI-powered evaluation"}
          </p>
          {!searchQuery ? (
            <button
              type="button"
              onClick={startNewEvaluation}
              className="app-chrome-btn mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-[13px] font-bold text-white"
            >
              <Upload className="h-4 w-4" /> Upload First Evaluation
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((evaluation) => {
            const score = getEvaluationScore(evaluation);
            return (
              <CopyCard
                key={evaluation._id}
                title={evaluation.fileName || evaluation.pdfFileName}
                question={evaluation.questionText}
                subject={evaluation.subject}
                paper={evaluation.paper}
                year={evaluation.year}
                status={evaluation.status}
                grade={evaluation.grade || evaluation.finalSummary?.overallScore?.grade}
                submittedAt={formatDate(evaluation.createdAt)}
                marksLabel={score ? `${score.obtained}/${score.maximum} Â· ${score.percentage}%` : undefined}
                evaluator="AI Examiner"
                onOpen={() => handleEvaluationClick(evaluation._id)}
                onDelete={(e) => deleteEvaluation(evaluation._id, e)}
                onAiReview={() => handleEvaluationClick(evaluation._id)}
              />
            );
          })}
        </div>
      )}

      {history.length > 0 ? (
        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-slate-900">Recent feedback snapshot</p>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            {summary.pending} pending Â· {summary.above70} copies above 70% Â· open any card for full AI review
          </p>
        </div>
      ) : null}

      {pagination && pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
        />
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Evaluation"
        message="This evaluation will move to trash. Only an admin can restore it. After 30 days it is permanently deleted."
        confirmText="Delete Evaluation"
        onConfirm={confirmDeleteEvaluation}
        onCancel={cancelDeleteEvaluation}
        loading={deleting}
      />
    </div>
  );
};

export default EvaluationHistoryPage;
