import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2, Users, Award, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAPI } from "../../services/api";

interface Analytics {
  totalAttempts: number;
  averageScore: number;
  topScore: number;
  highPerformersCount: number;
  highPerformers: Array<{
    studentId: string;
    name: string;
    email: string;
    score: number;
    accuracy: number;
  }>;
}

export const PrelimsTopperAdminAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadAnalytics();
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.adminGetAnalytics(id!);
      if (res.data.success) setAnalytics(res.data.data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/admin/prelims-topper")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div
        className={`rounded-xl p-6 border-2 ${
          theme === "dark" ? "bg-slate-800/50 border-amber-500/20" : "bg-white border-amber-200"
        }`}
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          Test Analytics
        </h1>
        <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Prelims Topper Test performance overview
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
                    <p className="text-sm text-slate-500">Total Attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.averageScore.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.topScore}</p>
                    <p className="text-sm text-slate-500">Top Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.highPerformersCount}</p>
                    <p className="text-sm text-slate-500">High Performers (≥80%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {analytics.highPerformers.length > 0 && (
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardHeader>
                <CardTitle>High Performers (≥80% accuracy)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.highPerformers.map((p) => (
                    <div
                      key={p.studentId}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{p.name || "Unknown"}</p>
                        <p className="text-sm text-slate-500">{p.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{p.score} pts</p>
                        <p className="text-sm">{p.accuracy.toFixed(1)}% accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No analytics data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
