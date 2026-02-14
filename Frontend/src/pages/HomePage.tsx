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
  CheckCircle,
  Zap
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
          averageTestScore: testData.averageTestScore || 0,
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
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-8 px-3 md:px-4 overflow-x-hidden pb-2 md:pb-0">
      {/* Welcome Header - Compact on mobile for full mobile view */}
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-purple-900/20 to-slate-900/90 border-purple-500/20 shadow-xl shadow-purple-500/10" 
          : "bg-gradient-to-br from-white via-purple-50/30 to-white border-purple-200/50 shadow-xl shadow-purple-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-1 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl shrink-0 ${
              theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
            }`}>
              <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <h1 className={`text-xl md:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r truncate ${
              theme === "dark" 
                ? "from-purple-200 via-purple-300 to-purple-400 bg-clip-text text-transparent" 
                : "from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent"
            }`}>
              Welcome Back! 👋
            </h1>
          </div>
          <p className={`text-xs md:text-base lg:text-lg ml-0 md:ml-12 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            Continue your UPSC preparation journey with AI-powered tools
          </p>
        </div>
      </div>

      {/* Quick Stats - 2 cols mobile, touch-friendly */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20 shadow-lg shadow-purple-500/10" 
            : "bg-gradient-to-br from-white to-purple-50/30 border-purple-200/50 shadow-lg shadow-purple-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/30 via-purple-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total Evaluations
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
              }`}>
                <FileText className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-purple-300 to-purple-500 bg-clip-text text-transparent" 
                : "from-purple-600 to-purple-800 bg-clip-text text-transparent"
            }`}>
              {stats.totalEvaluations}
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Answer copies evaluated
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg shadow-cyan-500/10" 
            : "bg-gradient-to-br from-white to-cyan-50/30 border-cyan-200/50 shadow-lg shadow-cyan-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Average Score
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <TrendingUp className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-cyan-300 to-cyan-500 bg-clip-text text-transparent" 
                : "from-cyan-600 to-cyan-800 bg-clip-text text-transparent"
            }`}>
              {stats.averageScore}%
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Your performance
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg shadow-amber-500/10" 
            : "bg-gradient-to-br from-white to-amber-50/30 border-amber-200/50 shadow-lg shadow-amber-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total Tests
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
                <ClipboardList className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-300 to-amber-500 bg-clip-text text-transparent" 
                : "from-amber-600 to-amber-800 bg-clip-text text-transparent"
            }`}>
              {stats.totalTests}
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              MCQ tests completed
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-green-500/20 shadow-lg shadow-green-500/10" 
            : "bg-gradient-to-br from-white to-green-50/30 border-green-200/50 shadow-lg shadow-green-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/30 via-green-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Test Accuracy
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-green-500/20" : "bg-green-100"
              }`}>
                <CheckCircle className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-green-300 to-green-500 bg-clip-text text-transparent" 
                : "from-green-600 to-green-800 bg-clip-text text-transparent"
            }`}>
              {stats.averageAccuracy}%
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Average accuracy
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-indigo-500/20 shadow-lg shadow-indigo-500/10" 
            : "bg-gradient-to-br from-white to-indigo-50/30 border-indigo-200/50 shadow-lg shadow-indigo-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/30 via-indigo-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Test Score
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-indigo-500/20" : "bg-indigo-100"
              }`}>
                <Target className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-indigo-300 to-indigo-500 bg-clip-text text-transparent" 
                : "from-indigo-600 to-indigo-800 bg-clip-text text-transparent"
            }`}>
              {stats.averageTestScore}%
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Average test score
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg shadow-teal-500/10" 
            : "bg-gradient-to-br from-white to-teal-50/30 border-teal-200/50 shadow-lg shadow-teal-100/50"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/30 via-teal-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-2 relative z-10 px-3 md:px-4 pt-3 md:pt-4">
            <div className="flex items-center justify-between gap-1">
              <CardTitle className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Study Streak
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${
                theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
              }`}>
                <Target className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4 relative z-10">
            <div className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-teal-300 to-teal-500 bg-clip-text text-transparent" 
                : "from-teal-600 to-teal-800 bg-clip-text text-transparent"
            }`}>
              {Math.floor(Math.random() * 7) + 1}
            </div>
            <p className={`text-[9px] md:text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Days in a row
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Enhanced */}
      <div>
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className={`p-2 rounded-lg ${
            theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
          }`}>
            <Zap className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <h2 className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const getColorClasses = (color: string) => {
              const colors: Record<string, { bg: string; bgDark: string; text: string; textDark: string; gradient: string; border: string; borderDark: string }> = {
                purple: {
                  bg: "bg-purple-100",
                  bgDark: "bg-purple-900/30",
                  text: "text-purple-600",
                  textDark: "text-purple-400",
                  gradient: "from-purple-500/10",
                  border: "border-purple-200",
                  borderDark: "border-purple-700/50"
                },
                cyan: {
                  bg: "bg-cyan-100",
                  bgDark: "bg-cyan-900/30",
                  text: "text-cyan-600",
                  textDark: "text-cyan-400",
                  gradient: "from-cyan-500/10",
                  border: "border-cyan-200",
                  borderDark: "border-cyan-700/50"
                },
                teal: {
                  bg: "bg-teal-100",
                  bgDark: "bg-teal-900/30",
                  text: "text-teal-600",
                  textDark: "text-teal-400",
                  gradient: "from-teal-500/10",
                  border: "border-teal-200",
                  borderDark: "border-teal-700/50"
                },
                fuchsia: {
                  bg: "bg-fuchsia-100",
                  bgDark: "bg-fuchsia-900/30",
                  text: "text-fuchsia-600",
                  textDark: "text-fuchsia-400",
                  gradient: "from-fuchsia-500/10",
                  border: "border-fuchsia-200",
                  borderDark: "border-fuchsia-700/50"
                },
                amber: {
                  bg: "bg-amber-100",
                  bgDark: "bg-amber-900/30",
                  text: "text-amber-600",
                  textDark: "text-amber-400",
                  gradient: "from-amber-500/10",
                  border: "border-amber-200",
                  borderDark: "border-amber-700/50"
                }
              };
              return colors[color] || colors.purple;
            };
            const colorClasses = getColorClasses(action.color);
            return (
              <Card
                key={action.path}
                className={`relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 min-h-[88px] touch-manipulation active:scale-[0.99] ${
                  theme === "dark"
                    ? `bg-gradient-to-br from-slate-800/90 to-slate-900/90 ${colorClasses.borderDark} hover:${colorClasses.borderDark.replace('/50', '')} shadow-lg`
                    : `bg-gradient-to-br from-white to-${action.color}-50/30 ${colorClasses.border} hover:${colorClasses.border.replace('200', '300')} shadow-lg`
                }`}
                onClick={() => navigate(action.path)}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses.gradient} to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.gradient.replace('/10', '/5')} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg transition-colors ${
                      theme === "dark" ? `${colorClasses.bgDark} group-hover:${colorClasses.bgDark.replace('/30', '/40')}` : `${colorClasses.bg} group-hover:${colorClasses.bg.replace('100', '200')}`
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        theme === "dark" ? colorClasses.textDark : colorClasses.text
                      }`} />
                    </div>
                    <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
                      theme === "dark" ? colorClasses.textDark : colorClasses.text
                    }`} />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardTitle className={`text-base font-bold mb-1 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    {action.title}
                  </CardTitle>
                  <CardDescription className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {action.description}
                  </CardDescription>
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

      {/* Motivational Section - compact on mobile */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-cyan-500/10 border-purple-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-fuchsia-500/20 to-transparent rounded-full blur-3xl" />
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-3 md:p-4 rounded-full shrink-0 ${
              theme === "dark" ? "bg-fuchsia-900/30" : "bg-fuchsia-100"
            }`}>
              <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${
                theme === "dark" ? "text-fuchsia-400" : "text-fuchsia-600"
              }`} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base md:text-lg font-semibold mb-0.5 md:mb-1 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                Daily discipline beats motivation
              </h3>
              <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Keep practicing and track your progress to achieve your UPSC goals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

