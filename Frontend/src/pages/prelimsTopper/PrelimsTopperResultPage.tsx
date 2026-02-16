import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { PdfViewer } from "../../components/prelimsTopper/PdfViewer";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAPI } from "../../services/api";

interface QuestionResult {
  _id: string;
  questionNumber: number;
  correctAnswer: string;
  userAnswer: string | null;
  explanation: string;
  isCorrect: boolean;
  notAttempted: boolean;
}

interface ResultData {
  _id: string;
  testId: string;
  title: string;
  totalQuestions: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  notAttempted: number;
  accuracy: number;
  questionPdfUrl: string;
  questions: QuestionResult[];
  submittedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const PrelimsTopperResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadResult();
  }, [id]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.getResult(id!);
      if (res.data.success) setResult(res.data.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionBorderStyle = (q: QuestionResult) => {
    if (q.isCorrect) {
      return theme === "dark" ? "border-green-500 bg-green-900/20" : "border-green-500 bg-green-50";
    }
    if (q.notAttempted) {
      return theme === "dark" ? "border-amber-500 bg-amber-900/20" : "border-amber-500 bg-amber-50";
    }
    return theme === "dark" ? "border-red-500 bg-red-900/20" : "border-red-500 bg-red-50";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-center text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={() => navigate("/prelims-topper")}>Back to Prelims Topper</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  const pdfUrl = result.questionPdfUrl
    ? (result.questionPdfUrl.startsWith("http") ? result.questionPdfUrl : `${API_BASE}${result.questionPdfUrl.startsWith("/") ? "" : "/"}${result.questionPdfUrl}`)
    : "";

  const maxScore = result.totalQuestions * 2;
  const scorePercentage = maxScore > 0 ? (result.score / maxScore) * 100 : 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Top: Back + Score Summary */}
      <div className="shrink-0 p-4 flex items-center justify-between gap-4 flex-wrap">
        <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prelims Topper
        </Button>
        <Card className="bg-gradient-to-br from-amber-600 to-amber-700 text-white">
          <CardContent className="py-3 px-6 flex items-center gap-6">
            <Award className="w-10 h-10 opacity-90" />
            <div>
              <div className="text-2xl font-bold">
                {result.score.toFixed(2)}<span className="text-base opacity-75">/{maxScore}</span>
              </div>
              <div className="text-sm opacity-90">
                ✓ {result.correctCount} Correct &nbsp; ✗ {result.wrongCount} Wrong &nbsp; ○ {result.notAttempted} Not Attempted
                &nbsp; | &nbsp; {result.accuracy.toFixed(1)}% Accuracy
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main: PDF left, Results right */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: PDF Viewer - same question paper */}
        <div className="flex-1 min-w-0 overflow-hidden p-4 border-r border-slate-200 dark:border-slate-700">
          <PdfViewer url={pdfUrl} className="h-full" />
        </div>

        {/* Right: Question Review - correct/wrong + explanations */}
        <div className={`w-96 shrink-0 overflow-auto ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"}`}>
          <Card className={`rounded-none border-0 border-l ${theme === "dark" ? "border-slate-700 bg-transparent" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-4 h-4" />
                Question Review
              </CardTitle>
              <p className="text-xs text-slate-500">
                Green = Correct, Red = Wrong, Yellow = Not Attempted
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pb-6">
              {result.questions.map((q) => {
                const isExpanded = expandedId === q._id;
                return (
                  <div
                    key={q._id}
                    className={`rounded-lg border-2 p-3 transition-all ${getQuestionBorderStyle(q)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {q.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : q.notAttempted ? (
                          <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center text-amber-600 text-xs font-bold">
                            ?
                          </div>
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">
                          Q{q.questionNumber}: Your answer{" "}
                          <span className={q.isCorrect ? "text-green-600" : q.notAttempted ? "text-amber-600" : "text-red-600"}>
                            {q.userAnswer || "—"}
                          </span>
                          {" | "}Correct: <span className="text-green-600">{q.correctAnswer}</span>
                        </div>
                        {q.explanation && (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : q._id)}
                              className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mt-2"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" /> Hide Explanation
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" /> Show Explanation
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div
                                className={`mt-2 p-3 rounded text-xs whitespace-pre-wrap ${
                                  theme === "dark" ? "bg-slate-800 border border-slate-700" : "bg-blue-50 border border-blue-200"
                                }`}
                              >
                                {q.explanation}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
