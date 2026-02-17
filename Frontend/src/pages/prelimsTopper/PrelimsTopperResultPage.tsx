import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";
import { cleanDisplayText } from "../../utils/prelimsImportText";

interface QuestionResult {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean;
  notAttempted: boolean;
}

interface ResultData {
  _id: string;
  testId: string;
  title: string;
  totalQuestions: number;
  totalMarks?: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  notAttempted: number;
  accuracy: number;
  questions: QuestionResult[];
  submittedAt: string;
}

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
      const res = await prelimsImportAPI.getResult(id!);
      if (res.data.success) setResult(res.data.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionBorderStyle = (q: QuestionResult) => {
    if (q.isCorrect) {
      return theme === "dark"
        ? "border-green-500 bg-green-900/20"
        : "border-green-500 bg-green-50";
    }
    if (q.notAttempted) {
      return theme === "dark"
        ? "border-amber-500 bg-amber-900/20"
        : "border-amber-500 bg-amber-50";
    }
    return theme === "dark"
      ? "border-red-500 bg-red-900/20"
      : "border-red-500 bg-red-50";
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
      <div className="p-4 max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-center text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
              Back to Prelims Topper
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  const hasScore = result.correctCount + result.wrongCount > 0;
  const maxScore = result.totalMarks ?? result.totalQuestions * 2;
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen pb-12 ${isDark ? "bg-[#0f0a1a]" : "bg-slate-100"}`}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
            {result.title} — Result
          </h1>
        </div>

        <Card
          className={`mb-8 rounded-2xl shadow-lg ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200 shadow-slate-200/50"}`}
        >
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Award className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {result.score.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    / {maxScore} marks
                  </p>
                </div>
              </div>
              {hasScore && (
                <>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{result.correctCount} Correct</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">{result.wrongCount} Wrong</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="font-medium">{result.notAttempted} Not attempted</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Accuracy
                    </span>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {result.accuracy}%
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border-2 border-green-500 bg-green-100 dark:bg-green-900/30" />
            Correct
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border-2 border-red-500 bg-red-100 dark:bg-red-900/30" />
            Wrong
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-100 dark:bg-amber-900/30" />
            Not attempted
          </span>
        </div>

        <div className="space-y-3">
          {result.questions.map((q) => {
            const isExpanded = expandedId === q._id;
            return (
              <Card
                key={q._id}
                className={`border-2 rounded-xl ${getQuestionBorderStyle(q)} ${isDark ? "bg-slate-800/50" : "bg-white"}`}
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-2"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : q._id)
                    }
                  >
                    <span className="font-medium">
                      Q{q.questionNumber}.{" "}
                      {q.notAttempted
                        ? "Not attempted"
                        : q.isCorrect
                          ? "Correct"
                          : "Wrong"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-200 dark:border-slate-700">
                      <p className="mt-3 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {cleanDisplayText(q.questionText)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span>
                          Your answer:{" "}
                          <strong className={q.isCorrect ? "text-green-600 dark:text-green-400" : q.notAttempted ? "text-slate-500" : "text-red-600 dark:text-red-400"}>
                            {q.userAnswer || "—"}
                          </strong>
                        </span>
                        {q.correctAnswer && (
                          <span>
                            Correct:{" "}
                            <strong className="text-green-600 dark:text-green-400">
                              {q.correctAnswer}
                            </strong>
                          </span>
                        )}
                      </div>
                      {q.options && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Options</p>
                          <div className="flex flex-wrap gap-2">
                            {(["A", "B", "C", "D"] as const).map((k) => {
                              const opt = cleanDisplayText(q.options[k]);
                              if (!opt) return null;
                              const isCorrectOpt = q.correctAnswer === k;
                              const isUserOpt = q.userAnswer === k;
                              return (
                                <span
                                  key={k}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                                    isCorrectOpt
                                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                                      : isUserOpt
                                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  <span className="font-semibold">{k}.</span>
                                  {opt}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
            Back to Prelims Topper
          </Button>
        </div>
      </div>
    </div>
  );
};
