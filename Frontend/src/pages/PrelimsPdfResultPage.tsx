import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Award, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { prelimsPdfTestAPI, PrelimsPdfTestResultData } from "../services/api";

const PrelimsPdfResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<PrelimsPdfTestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNum, setExpandedNum] = useState<number | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await prelimsPdfTestAPI.getResult(attemptId);
        if (res.data.success) setData(res.data.data);
        else setError("Failed to load result");
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className={isDark ? "text-slate-400" : "text-slate-600"}>Loading result...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className={isDark ? "text-red-300" : "text-red-800"}>{error}</p>
              <Button onClick={() => navigate("/prelims-pdf-tests")} className="mt-4">
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const maxScore = data.totalQuestions * 2;
  const scorePct = maxScore > 0 ? (data.score / maxScore) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 pb-6 md:pb-8 px-3 md:px-4">
      <div className="flex justify-between items-center">
        <Button onClick={() => navigate("/prelims-pdf-tests")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Tests
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
        <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
          <div className="text-center">
            <Award className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-90" />
            <h2 className="text-lg md:text-2xl font-semibold mb-2">Test Results</h2>
            <div className="text-3xl md:text-5xl font-bold mb-2">
              {data.score.toFixed(2)}
              <span className="text-xl md:text-3xl opacity-75">/{maxScore}</span>
            </div>
            <div className="text-sm md:text-lg mb-3 md:mb-4 space-y-1 md:space-y-0">
              <span>{data.correctCount} Correct</span>
              <span className="hidden md:inline"> | </span>
              <span>{data.wrongCount} Wrong</span>
              <span className="hidden md:inline"> | </span>
              <span>{scorePct.toFixed(1)}%</span>
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold">
              {data.title}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-base md:text-lg ${isDark ? "text-slate-200" : "text-slate-900"}`}>
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            Question Review
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="space-y-3 md:space-y-4">
            {data.questions.map((q) => {
              const isExpanded = expandedNum === q.questionNumber;
              const correct = q.isCorrect;
              return (
                <div
                  key={q.questionNumber}
                  className={`border rounded-lg p-3 md:p-4 transition-all overflow-hidden ${
                    correct
                      ? isDark
                        ? "border-green-800 bg-green-950/20"
                        : "border-green-200 bg-green-50"
                      : isDark
                      ? "border-red-800 bg-red-950/20"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div
                    className="flex items-start gap-2 md:gap-3 cursor-pointer"
                    onClick={() => setExpandedNum(isExpanded ? null : q.questionNumber)}
                  >
                    <div className="flex-shrink-0 mt-0.5 md:mt-1">
                      {correct ? (
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm md:text-base ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                        <span className="font-bold">Q{q.questionNumber}.</span>{" "}
                        {(q.questionText.english || q.questionText.hindi || "").slice(0, 120)}...
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs md:text-sm">
                        <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                          Your answer: <strong>{q.userAnswer || "—"}</strong>
                        </span>
                        <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                          Correct: <strong className="text-green-600">{q.correctAnswer}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                      <div className={`space-y-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {q.questionText.english && <p lang="en">{q.questionText.english}</p>}
                        {q.questionText.hindi && (
                          <p lang="hi" dir="ltr" className="mt-1" style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', sans-serif" }}>
                            {q.questionText.hindi}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        {q.options.map((o) => (
                          <div
                            key={o.key}
                            className={`p-2 rounded ${
                              o.key === q.correctAnswer
                                ? "bg-green-500/20 border border-green-600"
                                : o.key === q.userAnswer && !q.isCorrect
                                ? "bg-red-500/20 border border-red-600"
                                : isDark
                                ? "bg-slate-800"
                                : "bg-slate-100"
                            }`}
                          >
                            <span className="font-semibold">{o.key}.</span>{" "}
                            {o.english && <span lang="en">{o.english}</span>}
                            {o.english && o.hindi && " "}
                            {o.hindi && (
                              <span lang="hi" dir="ltr" style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', sans-serif" }}>
                                {o.hindi}
                              </span>
                            )}
                            {!o.english && !o.hindi && "—"}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrelimsPdfResultPage;
