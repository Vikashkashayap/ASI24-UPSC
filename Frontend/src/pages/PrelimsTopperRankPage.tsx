import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { prelimsTopperAPI } from "../services/api";

interface RankEntry {
  rank: number;
  name: string;
  email: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeTaken: number;
  submittedAt: string;
}

interface RankData {
  test: string;
  myRank: number | null;
  myScore: number | null;
  totalAttempted: number;
  topScore: number;
  averageScore: number;
  rankList: RankEntry[];
}

const PrelimsTopperRankPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testId) {
      prelimsTopperAPI
        .getRank(testId)
        .then((res) => {
          if (res.data.success) setData(res.data.data);
          else setError("Failed to load rank");
        })
        .catch((err) => setError(err?.response?.data?.message || "Failed to load rank"))
        .finally(() => setLoading(false));
    }
  }, [testId]);

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
            <p>{error || "Rank not found"}</p>
          </CardContent>
          <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
            Back to list
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          Rank List
        </h1>
        <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle>{data.test}</CardTitle>
          <div className="flex flex-wrap gap-4 text-sm opacity-80">
            <span>Total attempted: <strong>{data.totalAttempted}</strong></span>
            <span>Top score: <strong>{data.topScore}</strong></span>
            <span>Average: <strong>{data.averageScore}</strong></span>
            {data.myRank != null && (
              <span>Your rank: <strong>{data.myRank}</strong> (Score: {data.myScore})</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theme === "dark" ? "text-slate-400 border-b border-slate-700" : "text-slate-600 border-b border-slate-200"}>
                  <th className="text-left py-2">Rank</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-right py-2">Score</th>
                  <th className="text-right py-2">Correct</th>
                  <th className="text-right py-2">Wrong</th>
                  <th className="text-right py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.rankList.map((r) => (
                  <tr key={r.rank} className={theme === "dark" ? "border-b border-slate-700/50" : "border-b border-slate-100"}>
                    <td className="py-2 font-medium">{r.rank}</td>
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right">{r.score}</td>
                    <td className="py-2 text-right">{r.correctAnswers}</td>
                    <td className="py-2 text-right">{r.wrongAnswers}</td>
                    <td className="py-2 text-right">{formatTime(r.timeTaken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrelimsTopperRankPage;
