import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Award, Target, Clock, FileText, TrendingUp, Loader2, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { api, prelimsTopperAPI } from "../services/api";

interface QuestionReview {
  questionNumber: number;
  questionHindi: string;
  questionEnglish: string;
  options: { key: string; textHindi: string; textEnglish: string }[];
  correctAnswer: string;
  explanation: string;
  userAnswer: string | null;
}

interface ResultData {
  attempt: {
    _id: string;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    skipped: number;
    accuracy: number;
    timeTaken: number;
    rank: number | null;
    submittedAt: string;
  };
  test: {
    _id: string;
    title: string;
    totalQuestions: number;
    totalMarks: number;
    solutionPdfUrl?: string;
  };
  totalAttempted: number;
  topperScore: number;
  questionReview?: QuestionReview[];
}

const PrelimsTopperResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (attemptId) {
      prelimsTopperAPI
        .getResult(attemptId)
        .then((res) => {
          if (res.data.success) setData(res.data.data);
          else setError("Failed to load result");
        })
        .catch((err) => setError(err?.response?.data?.message || "Failed to load result"))
        .finally(() => setLoading(false));
    }
  }, [attemptId]);

  const openSolutionPdf = () => {
    if (!data?.test?.solutionPdfUrl) return;
    api.get(data.test.solutionPdfUrl, { responseType: "blob" }).then((res) => {
      const blob = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank");
    });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="pt-6 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p>{error || "Result not found"}</p>
          </CardContent>
          <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
            Back to list
          </Button>
        </Card>
      </div>
    );
  }

  const { attempt, test, totalAttempted, topperScore } = data;
  const avgTimePerQ = attempt.correctAnswers + attempt.wrongAnswers > 0
    ? Math.round(attempt.timeTaken / (attempt.correctAnswers + attempt.wrongAnswers))
    : 0;
  const comparePercent = test.totalMarks > 0 && topperScore > 0
    ? Math.round((attempt.score / topperScore) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Result</h1>
        <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
          Back to list
        </Button>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs opacity-80">Score</p>
              <p className="text-xl font-bold">{attempt.score} / {test.totalMarks}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs opacity-80">Rank</p>
              <p className="text-xl font-bold">{attempt.rank ?? "—"} / {totalAttempted}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs opacity-80">Accuracy</p>
              <p className="text-xl font-bold">{attempt.accuracy}%</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <p className="text-xs opacity-80">Time</p>
              <p className="text-xl font-bold">{formatTime(attempt.timeTaken)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><span className="font-medium">Correct</span> {attempt.correctAnswers}</div>
            <div><span className="font-medium">Wrong</span> {attempt.wrongAnswers}</div>
            <div><span className="font-medium">Skipped</span> {attempt.skipped}</div>
          </div>

          <div className="text-sm">
            <p>Average time per question: <strong>{avgTimePerQ}s</strong></p>
          </div>

          {topperScore > 0 && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Compare with Topper
              </p>
              <p className="mt-1">
                Your score is <strong>{comparePercent}%</strong> of the topper&apos;s score ({topperScore}).
              </p>
            </div>
          )}

          {test.solutionPdfUrl && (
            <Button onClick={openSolutionPdf} variant="outline" className="w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />
              View Solution PDF
            </Button>
          )}
        </CardContent>
      </Card>

      {data.questionReview && data.questionReview.length > 0 && (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Question Review
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Correct answers and explanations (shown only after submission)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.questionReview.map((q) => {
              const isCorrect = q.userAnswer === q.correctAnswer;
              const isExpanded = expandedQuestions.has(q.questionNumber);
              const hasExplanation = q.explanation?.trim().length > 0;
              return (
                <div
                  key={q.questionNumber}
                  className={`rounded-lg border overflow-hidden ${
                    theme === "dark" ? "border-slate-700 bg-slate-800/30" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedQuestions((prev) => {
                        const next = new Set(prev);
                        if (next.has(q.questionNumber)) next.delete(q.questionNumber);
                        else next.add(q.questionNumber);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </span>
                      <span className="font-medium">Q{q.questionNumber}</span>
                      <span className="text-sm opacity-80">
                        Your answer: <strong>{q.userAnswer || "—"}</strong>
                        {" · "}
                        Correct: <strong className="text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</strong>
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className={`p-4 pt-0 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                      <div className="space-y-4 text-sm">
                        {q.questionHindi && (
                          <div
                            className={`whitespace-pre-wrap leading-relaxed ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {q.questionHindi}
                          </div>
                        )}
                        {q.questionEnglish && (
                          <div
                            className={`whitespace-pre-wrap leading-relaxed ${
                              theme === "dark" ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            {q.questionEnglish}
                          </div>
                        )}
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                          <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                            Options:
                          </p>
                          {(q.options || []).map((opt) => {
                            const optText = [opt.textHindi, opt.textEnglish].filter(Boolean).join(" / ") || "—";
                            return (
                              <div
                                key={opt.key}
                                className={`whitespace-pre-wrap py-2 px-3 rounded-lg ${
                                  opt.key === q.correctAnswer
                                    ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                                    : opt.key === q.userAnswer && !isCorrect
                                      ? "bg-red-500/20 text-red-800 dark:text-red-200"
                                      : theme === "dark"
                                        ? "bg-slate-700/50 text-slate-400"
                                        : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                ({opt.key}) {optText}
                              </div>
                            );
                          })}
                        </div>
                        {hasExplanation && (
                          <div
                            className={`mt-3 p-3 rounded-lg ${
                              theme === "dark" ? "bg-slate-900/50 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <p className="text-xs font-medium opacity-80 mb-1">Explanation</p>
                            <p className="whitespace-pre-wrap text-sm">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrelimsTopperResultPage;
