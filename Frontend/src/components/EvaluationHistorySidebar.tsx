import React, { useState, useEffect } from 'react';
import { FileText, Trash2, ExternalLink } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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

export const EvaluationHistorySidebar: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState<EvaluationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  // Refresh history when navigating to copy-evaluation page
  useEffect(() => {
    if (location.pathname === '/copy-evaluation') {
      loadHistory();
    }
  }, [location.pathname]);

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

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await copyEvaluationAPI.getHistory(1, 50);
      if (response.data.success) {
        setHistory(response.data.data.evaluations);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteEvaluation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this evaluation?')) return;
    
    try {
      await copyEvaluationAPI.deleteEvaluation(id);
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
    }
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

  const viewAllHistory = () => {
    navigate('/evaluation-history');
  };

  return (
    <Card className={`h-full flex flex-col ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Evaluation History
          </CardTitle>
          <button
            onClick={viewAllHistory}
            className={`text-xs px-2 py-1 rounded hover:bg-slate-800/50 transition-colors ${
              theme === "dark" ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
            }`}
            title="View all history"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <Button
          onClick={startNewEvaluation}
          className={`w-full border-2 font-medium ${
            theme === "dark" 
              ? "bg-slate-800 border-purple-500 text-white hover:bg-slate-700 hover:border-purple-400" 
              : "bg-white border-purple-500 text-purple-700 hover:bg-purple-50"
          }`}
          variant="outline"
        >
          + New Evaluation
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 px-3">
        {loadingHistory ? (
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Loading...</p>
        ) : history.length === 0 ? (
          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>No evaluations yet</p>
        ) : (
          history.map((evaluation) => (
            <div
              key={evaluation._id}
              onClick={() => handleEvaluationClick(evaluation._id)}
              className={`group relative cursor-pointer rounded-lg p-3 text-xs transition-colors ${
                theme === "dark"
                  ? "hover:bg-slate-800 bg-slate-800/50 border border-slate-700"
                  : "hover:bg-slate-100 bg-slate-50 border border-slate-200"
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className={`truncate font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    {evaluation.pdfFileName}
                  </div>
                  <div className={`text-[10px] mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {evaluation.subject} • {formatDate(evaluation.createdAt)}
                  </div>
                  {evaluation.finalSummary?.overallScore && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`text-[10px] font-semibold ${
                        evaluation.finalSummary.overallScore.percentage >= 70 ? 'text-green-500' :
                        evaluation.finalSummary.overallScore.percentage >= 50 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {evaluation.finalSummary.overallScore.percentage}%
                      </span>
                      <span className={`text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                        • Grade {evaluation.finalSummary.overallScore.grade}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => deleteEvaluation(evaluation._id, e)}
                className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                  theme === "dark" ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"
                }`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

