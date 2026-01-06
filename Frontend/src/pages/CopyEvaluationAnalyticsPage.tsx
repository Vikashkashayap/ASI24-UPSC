import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Target, BarChart3, HeatMap, Calendar, Award } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useTheme } from '../hooks/useTheme';

interface AnalyticsData {
  totalEvaluations: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  improvementTrend: number;
  subjectWisePerformance: {
    [subject: string]: {
      count: number;
      totalScore: number;
      avgScore: number;
    };
  };
  recentEvaluations: Array<{
    id: string;
    subject: string;
    score: number;
    date: string;
  }>;
}

interface WeaknessData {
  topic: string;
  frequency: number;
  avgScore: number;
}

const CopyEvaluationAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weaknessHeatmap, setWeaknessHeatmap] = useState<WeaknessData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await copyEvaluationAPI.getAnalytics();
      if (response.data.success) {
        setAnalytics(response.data.data);
        // Generate weakness heatmap from analytics
        generateWeaknessHeatmap(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeaknessHeatmap = (data: AnalyticsData) => {
    // This would ideally come from backend, but we'll generate from available data
    const weaknesses: WeaknessData[] = [];
    
    // Group by subject and calculate weakness frequency
    Object.entries(data.subjectWisePerformance).forEach(([subject, perf]) => {
      if (perf.avgScore < 50) {
        weaknesses.push({
          topic: subject,
          frequency: perf.count,
          avgScore: perf.avgScore
        });
      }
    });

    // Sort by frequency (most common weaknesses first)
    weaknesses.sort((a, b) => b.frequency - a.frequency);
    setWeaknessHeatmap(weaknesses.slice(0, 10)); // Top 10
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${theme === "dark" ? "border-purple-600" : "border-purple-600"}`}></div>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                No evaluation data available yet. Upload and evaluate some answer copies to see analytics.
              </p>
              <Button onClick={() => navigate('/copy-evaluation')} className="mt-4">
                Go to Copy Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
          Copy Evaluation Analytics
        </h1>
        <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Track your performance, identify weaknesses, and monitor improvement over time
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Total Evaluations</p>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  {analytics.totalEvaluations}
                </p>
              </div>
              <BarChart3 className={`w-8 h-8 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Average Score</p>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  {analytics.averageScore}%
                </p>
              </div>
              <Target className={`w-8 h-8 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Highest Score</p>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                  {analytics.highestScore}%
                </p>
              </div>
              <Award className={`w-8 h-8 ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Improvement Trend</p>
                <div className="flex items-center gap-2">
                  {analytics.improvementTrend >= 0 ? (
                    <TrendingUp className={`w-5 h-5 text-green-600`} />
                  ) : (
                    <TrendingDown className={`w-5 h-5 text-red-600`} />
                  )}
                  <p className={`text-2xl font-bold ${analytics.improvementTrend >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {analytics.improvementTrend > 0 ? '+' : ''}{analytics.improvementTrend}%
                  </p>
                </div>
              </div>
              <Calendar className={`w-8 h-8 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Subject-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.subjectWisePerformance).map(([subject, perf]) => (
              <div key={subject}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    {subject}
                  </span>
                  <span className={`text-sm font-semibold ${
                    perf.avgScore >= 70 ? 'text-green-600' :
                    perf.avgScore >= 50 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {perf.avgScore}% ({perf.count} evaluations)
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}>
                  <div
                    className={`h-full transition-all ${
                      perf.avgScore >= 70 ? 'bg-green-600' :
                      perf.avgScore >= 50 ? 'bg-orange-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${perf.avgScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weakness Heatmap */}
      {weaknessHeatmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeatMap className="w-5 h-5" />
              Topic-wise Weakness Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weaknessHeatmap.map((weakness, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    theme === "dark" ? "bg-red-950/20 border-red-800" : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold text-sm ${theme === "dark" ? "text-red-300" : "text-red-800"}`}>
                      {weakness.topic}
                    </span>
                    <span className={`text-xs ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                      {weakness.frequency}x
                    </span>
                  </div>
                  <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Avg Score: {weakness.avgScore}%
                  </div>
                  <div className={`h-1.5 rounded-full mt-2 ${theme === "dark" ? "bg-red-900" : "bg-red-200"}`}>
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${(weakness.frequency / weaknessHeatmap[0].frequency) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Evaluations */}
      {analytics.recentEvaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentEvaluations.map((eval) => (
                <div
                  key={eval.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    theme === "dark" ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => navigate(`/copy-evaluation/${eval.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                        {eval.subject}
                      </p>
                      <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        {new Date(eval.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-lg font-semibold ${
                      eval.score >= 70 ? 'text-green-600' :
                      eval.score >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {eval.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CopyEvaluationAnalyticsPage;

