import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { prelimsTopperAPI } from "../services/api";
import { ArrowLeft, Award, CheckCircle, XCircle, BookOpen, TrendingUp, AlertCircle } from "lucide-react";

interface Option {
  key: string;
  text: string;
}

interface QuestionResult {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: Option[];
  correctAnswer: string;
  userAnswer: string | null;
  explanation: string;
  isCorrect: boolean;
}

interface ResultData {
  _id: string;
  test: { _id: string; title: string; totalQuestions: number };
  score: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  questions: QuestionResult[];
  submittedAt: string;
}

export const PrelimsTopperResultPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setError("Missing attempt ID");
      setLoading(false);
      return;
    }
    prelimsTopperAPI
      .getResult(attemptId)
      .then((res) => {
        if (res.data.success) setResult(res.data.data);
      })
      .catch(() => setError("Failed to load result"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <Button onClick={() => navigate("/prelims-topper")} className="mt-4">
              Back to Prelims Topper
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <Button variant="outline" onClick={() => navigate("/prelims-topper")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Prelims Topper
      </Button>

      <Card className="bg-gradient-to-br from-amber-600 to-amber-700 text-white">
        <CardContent className="pt-6">
          <div className="text-center">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h2 className="text-xl font-semibold mb-2">Prelims Topper – Result</h2>
            <p className="text-lg font-medium mb-2">{result.test.title}</p>
            <div className="text-3xl font-bold mb-2">
              Score: {result.score.toFixed(2)}
            </div>
            <div className="text-sm opacity-90">
              {result.correctCount} Correct | {result.wrongCount} Wrong | {result.accuracy.toFixed(1)}% Accuracy
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">{result.score.toFixed(2)}</div>
            <div className="text-sm text-slate-500">Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">{result.correctCount}</div>
            <div className="text-sm text-slate-500">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-red-600">{result.wrongCount}</div>
            <div className="text-sm text-slate-500">Wrong</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{result.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-slate-500">Accuracy</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Question Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.questions.map((q) => {
              const isExpanded = expandedId === q._id;
              return (
                <div
                  key={q._id}
                  className={`border rounded-lg p-4 ${
                    q.isCorrect
                      ? theme === "dark" ? "border-green-800 bg-green-950/20" : "border-green-200 bg-green-50"
                      : theme === "dark" ? "border-red-800 bg-red-950/20" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {q.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                        Q{q.questionNumber}. {q.questionText}
                      </p>
                      <div className="space-y-1 mb-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt.key}
                            className={`p-2 rounded border ${
                              opt.key === q.correctAnswer
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : opt.key === q.userAnswer && !q.isCorrect
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <span className="font-medium">{opt.key}.</span> {opt.text}
                            {opt.key === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />}
                          </div>
                        ))}
                      </div>
                      <p className={`text-sm mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        Your answer: <span className={q.isCorrect ? "text-green-600" : "text-red-600"}>{q.userAnswer || "—"}</span>
                        {" "} | Correct: <span className="text-green-600">{q.correctAnswer}</span>
                      </p>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q._id)}
                        className={`text-sm font-medium ${theme === "dark" ? "text-amber-400 hover:bg-amber-900/20" : "text-amber-600 hover:bg-amber-50"} px-2 py-1 rounded`}
                      >
                        {isExpanded ? "Hide" : "Show"} Explanation
                      </button>
                      {isExpanded && (
                        <div className={`mt-2 p-3 rounded ${theme === "dark" ? "bg-slate-800" : "bg-blue-50"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-sm">Explanation</span>
                          </div>
                          <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                            {q.explanation || "No explanation provided."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
