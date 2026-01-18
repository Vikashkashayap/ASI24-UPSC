import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import {
  LineChart,
  FileText,
  MessageCircle,
  CalendarClock,
  ClipboardList,
  TrendingUp,
  BookOpen,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { api, testAPI } from "../services/api";

export const HomePage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvaluations: 0,
    averageScore: 0,
    recentActivity: [],
    totalTests: 0,
    averageTestScore: 0,
    averageAccuracy: 0,
    recentTests: []
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load evaluation stats
        const evalRes = await api.get("/api/performance");
        const evalData = evalRes.data || {};

        // Load test stats
        let testData = {
          totalTests: 0,
          averageTestScore: 0,
          averageAccuracy: 0,
          recentTests: []
        };

        try {
          const testRes = await testAPI.getAnalytics();
          if (testRes.data?.success) {
            testData = testRes.data.data;
          }
        } catch (testError) {
          // Silently fail for test analytics
          console.log("Test analytics not available yet");
        }

        setStats({
          totalEvaluations: evalData.totalEvaluations || 0,
          averageScore: evalData.averageScore || 0,
          recentActivity: evalData.recentPerformance || [],
          totalTests: testData.totalTests || 0,
          averageTestScore: testData.averageScore || 0,
          averageAccuracy: testData.averageAccuracy || 0,
          recentTests: testData.recentTests || []
        });
      } catch (error) {
        // Silently fail, show default stats
        console.log("Error loading stats:", error);
      }
    };
    loadStats();
  }, []);

  const quickActions = [
    {
      title: "Copy Evaluation",
      description: "Upload and evaluate your answer copies",
      icon: FileText,
      color: "purple",
      path: "/copy-evaluation"
    },
    {
      title: "AI Mentor",
      description: "Get personalized guidance from AI",
      icon: MessageCircle,
      color: "cyan",
      path: "/mentor"
    },
    {
      title: "Study Planner",
      description: "Plan and track your study schedule",
      icon: CalendarClock,
      color: "teal",
      path: "/planner"
    },
    {
      title: "Performance",
      description: "View your progress and analytics",
      icon: LineChart,
      color: "fuchsia",
      path: "/performance"
    },
    {
      title: "Prelims Test",
      description: "Practice with MCQ tests",
      icon: ClipboardList,
      color: "amber",
      path: "/prelims-test"
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 px-3 md:px-4 overflow-x-hidden">
      {/* Welcome Header - Mobile-first */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <h1 className={`text-xl md:text-2xl lg:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
          Welcome Back! 👋
        </h1>
        <p className={`text-xs md:text-sm lg:text-base ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Continue your UPSC preparation journey with AI-powered tools
        </p>
      </div>

      {/* Quick Stats - Mobile-first: 2 columns on mobile, 3 on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Total Evaluations</CardTitle>
              <FileText className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.totalEvaluations}
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Answer copies evaluated
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Average Score</CardTitle>
              <TrendingUp className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.averageScore}%
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Your performance
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Total Tests</CardTitle>
              <ClipboardList className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.totalTests}
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              MCQ tests completed
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Test Accuracy</CardTitle>
              <CheckCircle className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.averageAccuracy}%
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Average accuracy
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Test Score</CardTitle>
              <Target className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.averageTestScore}%
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Average test score
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-1.5 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className="text-[10px] md:text-xs lg:text-sm font-medium truncate">Study Streak</CardTitle>
              <Target className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {Math.floor(Math.random() * 7) + 1}
            </div>
            <p className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Days in a row
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile-first */}
      <div>
        <h2 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const getColorClasses = (color: string) => {
              const colors: Record<string, { bg: string; bgDark: string; text: string; textDark: string; gradient: string }> = {
                purple: {
                  bg: "bg-purple-100",
                  bgDark: "bg-purple-900/30",
                  text: "text-purple-600",
                  textDark: "text-purple-400",
                  gradient: "from-purple-500/10"
                },
                cyan: {
                  bg: "bg-cyan-100",
                  bgDark: "bg-cyan-900/30",
                  text: "text-cyan-600",
                  textDark: "text-cyan-400",
                  gradient: "from-cyan-500/10"
                },
                teal: {
                  bg: "bg-teal-100",
                  bgDark: "bg-teal-900/30",
                  text: "text-teal-600",
                  textDark: "text-teal-400",
                  gradient: "from-teal-500/10"
                },
                fuchsia: {
                  bg: "bg-fuchsia-100",
                  bgDark: "bg-fuchsia-900/30",
                  text: "text-fuchsia-600",
                  textDark: "text-fuchsia-400",
                  gradient: "from-fuchsia-500/10"
                },
                amber: {
                  bg: "bg-amber-100",
                  bgDark: "bg-amber-900/30",
                  text: "text-amber-600",
                  textDark: "text-amber-400",
                  gradient: "from-amber-500/10"
                }
              };
              return colors[color] || colors.purple;
            };
            const colorClasses = getColorClasses(action.color);
            return (
              <Card
                key={action.path}
                className={`relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] ${
                  theme === "dark"
                    ? "hover:border-purple-700/50"
                    : "hover:border-purple-300"
                }`}
                onClick={() => navigate(action.path)}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses.gradient} to-transparent rounded-full blur-3xl`} />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${
                      theme === "dark" ? colorClasses.bgDark : colorClasses.bg
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        theme === "dark" ? colorClasses.textDark : colorClasses.text
                      }`} />
                    </div>
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base font-semibold mb-1">{action.title}</CardTitle>
                  <CardDescription className="text-xs">{action.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity - Mobile-first */}
      {stats.recentActivity.length > 0 && (
        <div>
          <h2 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
            Recent Activity
          </h2>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
            <CardHeader>
              <CardTitle className="text-base font-semibold">Your Latest Evaluations</CardTitle>
              <CardDescription>Keep up the momentum!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border transition-all hover:scale-[1.01] ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700/50 hover:border-purple-700/50"
                        : "bg-slate-50 border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
                        }`}>
                          <BookOpen className={`w-4 h-4 ${
                            theme === "dark" ? "text-purple-400" : "text-purple-600"
                          }`} />
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            {item.subject || "Evaluation"}
                          </p>
                          <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {new Date(item.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${
                        item.score >= 70
                          ? theme === "dark" ? "text-emerald-300" : "text-emerald-600"
                          : item.score >= 50
                          ? theme === "dark" ? "text-amber-300" : "text-amber-600"
                          : theme === "dark" ? "text-red-300" : "text-red-600"
                      }`}>
                        {item.score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Tests - Mobile-first */}
      {stats.recentTests.length > 0 && (
        <div>
          <h2 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
            Recent Tests
          </h2>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
            <CardHeader>
              <CardTitle className="text-base font-semibold">Your Latest MCQ Tests</CardTitle>
              <CardDescription>Track your progress in prelims preparation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentTests.slice(0, 5).map((test: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border transition-all hover:scale-[1.01] ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700/50 hover:border-amber-700/50"
                        : "bg-slate-50 border-slate-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          theme === "dark" ? "bg-amber-900/30" : "bg-amber-100"
                        }`}>
                          <ClipboardList className={`w-4 h-4 ${
                            theme === "dark" ? "text-amber-400" : "text-amber-600"
                          }`} />
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            {test.topic} - {test.subject}
                          </p>
                          <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {new Date(test.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })} • {test.difficulty} • {test.totalQuestions} questions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-sm font-medium ${
                          test.accuracy >= 70
                            ? theme === "dark" ? "text-emerald-300" : "text-emerald-600"
                            : test.accuracy >= 50
                            ? theme === "dark" ? "text-amber-300" : "text-amber-600"
                            : theme === "dark" ? "text-red-300" : "text-red-600"
                        }`}>
                          {test.accuracy}% accuracy
                        </div>
                        <div className={`text-lg font-bold ${
                          test.score >= 70
                            ? theme === "dark" ? "text-emerald-300" : "text-emerald-600"
                            : test.score >= 50
                            ? theme === "dark" ? "text-amber-300" : "text-amber-600"
                            : theme === "dark" ? "text-red-300" : "text-red-600"
                        }`}>
                          {test.score}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Motivational Section */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-cyan-500/10 border-purple-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-fuchsia-500/20 to-transparent rounded-full blur-3xl" />
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full ${
              theme === "dark" ? "bg-fuchsia-900/30" : "bg-fuchsia-100"
            }`}>
              <Sparkles className={`w-6 h-6 ${
                theme === "dark" ? "text-fuchsia-400" : "text-fuchsia-600"
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold mb-1 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                Daily discipline beats motivation
              </h3>
              <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Keep practicing and track your progress to achieve your UPSC goals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

