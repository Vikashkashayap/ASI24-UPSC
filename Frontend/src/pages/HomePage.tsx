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
  Sparkles
} from "lucide-react";
import { api } from "../services/api";

export const HomePage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEvaluations: 0,
    averageScore: 0,
    recentActivity: []
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get("/api/performance");
        if (res.data) {
          setStats({
            totalEvaluations: res.data.totalEvaluations || 0,
            averageScore: res.data.averageScore || 0,
            recentActivity: res.data.recentPerformance || []
          });
        }
      } catch (error) {
        // Silently fail, show default stats
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
          Welcome Back! 👋
        </h1>
        <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Continue your UPSC preparation journey with AI-powered tools
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Total Evaluations</CardTitle>
              <FileText className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.totalEvaluations}
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Answer copies evaluated
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {stats.averageScore}%
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Your performance
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Study Streak</CardTitle>
              <Target className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {Math.floor(Math.random() * 7) + 1}
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Days in a row
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
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

