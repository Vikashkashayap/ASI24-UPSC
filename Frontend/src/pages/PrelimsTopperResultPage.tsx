import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Award, Target, Clock, FileText, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { api, prelimsTopperAPI } from "../services/api";

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
}

const PrelimsTopperResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};

export default PrelimsTopperResultPage;
