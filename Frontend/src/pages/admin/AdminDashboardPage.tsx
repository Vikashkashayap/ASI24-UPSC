import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { api } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import { Users, FileText, ClipboardCheck, TrendingUp, UserPlus, Activity, Search, Eye, Calendar, Trophy } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  totalTests: number;
  totalMains: number;
  averageScore: number;
  recentRegistrations: number;
  activeStudents: number;
  highPerformers: number;
}

interface SubjectPerformance {
  subject: string;
  count: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
}

interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  paper: string;
  year: number;
  score: number;
  evaluatedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  totalEvaluations: number;
  latestScore: number | null;
  lastEvaluationDate: string | null;
  lastSubject: string | null;
  lastPaper: string | null;
}

export const AdminDashboardPage = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/dashboard");
      if (res.data.success) {
        // Map the API response to the expected interfaces
        const overview = res.data.data.overview || {};
        setStats({
          totalStudents: overview.totalStudents || 0,
          totalTests: overview.totalEvaluations || 0,
          totalMains: overview.pendingEvaluations || 0,
          averageScore: overview.averageScore || 0,
          recentRegistrations: overview.recentRegistrations || 0,
          activeStudents: overview.activeStudents || 0,
          highPerformers: overview.highPerformers || 0
        });

        setSubjectPerformance(res.data.data.subjectPerformance || []);
        setRecentActivity(res.data.data.recentActivity || []);
      } else {
        setError("Failed to load dashboard statistics");
      }
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await api.get(`/api/admin/search?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.data.success) {
        setSearchResults(res.data.data.users);
        setShowSearch(true);
      }
    } catch (err: any) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      }`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      }`}>
        <div className={`text-red-500 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>{error}</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Completed Evaluations",
      value: stats?.totalTests || 0,
      icon: FileText,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Evaluations",
      value: stats?.totalMains || 0,
      icon: ClipboardCheck,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Average Score",
      value: typeof stats?.averageScore === 'number' ? `${stats.averageScore.toFixed(1)}%` : "0.0%",
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "New Registrations (7d)",
      value: stats?.recentRegistrations || 0,
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Students (30d)",
      value: stats?.activeStudents || 0,
      icon: Activity,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "High Performers (≥80%)",
      value: stats?.highPerformers || 0,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${
            theme === "dark" ? "text-slate-100" : "text-slate-900"
          }`}>Admin Dashboard</h1>
          <Button
            onClick={() => setShowSearch(!showSearch)}
            className={`${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700"
                : "bg-white hover:bg-slate-100 border-slate-300"
            }`}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Users
          </Button>
        </div>

        {/* Search Section */}
        {showSearch && (
          <Card className={`mb-8 transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <CardTitle className={`${
                theme === "dark" ? "text-slate-200" : "text-slate-900"
              }`}>Search Students</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 transition-colors duration-200 ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-600 text-slate-200 focus:ring-purple-500"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500"
                  }`}
                />
                <Button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-lg font-semibold mb-4 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-900"
                  }`}>Search Results</h3>
                  <div className="space-y-3">
                    {searchResults.map((user) => (
                      <div key={user.id} className={`rounded-xl p-5 border transition-all duration-200 ${
                        theme === "dark"
                          ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/80"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold truncate ${
                              theme === "dark" ? "text-slate-200" : "text-slate-900"
                            }`}>{user.name}</h4>
                            <p className={`text-sm mt-1 truncate ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>{user.email}</p>
                            <p className={`text-xs mt-2 ${
                              theme === "dark" ? "text-slate-500" : "text-slate-500"
                            }`}>
                              Joined: {new Date(user.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`${
                              theme === "dark" ? "text-slate-300" : "text-slate-700"
                            }`}>
                              {user.totalEvaluations} evaluations
                            </p>
                            {user.latestScore && (
                              <p className={`font-semibold mt-1 px-2 py-1 rounded-full inline-block ${
                                theme === "dark"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
                                Latest: {user.latestScore.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                        {user.lastSubject && (
                          <p className={`text-xs mt-3 ${
                            theme === "dark" ? "text-slate-500" : "text-slate-500"
                          }`}>
                            Last: {user.lastSubject} - {user.lastPaper}
                            {user.lastEvaluationDate && ` (${new Date(user.lastEvaluationDate).toLocaleDateString()})`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className={`text-sm font-medium ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>{stat.title}</CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subject Performance */}
          <Card className={`transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <CardTitle className={`${
                theme === "dark" ? "text-slate-200" : "text-slate-900"
              }`}>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectPerformance.slice(0, 5).map((subject) => (
                  <div key={subject.subject} className="flex justify-between items-center">
                    <div>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-slate-200" : "text-slate-900"
                      }`}>{subject.subject}</p>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      }`}>{subject.count} evaluations</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-500">{subject.avgScore.toFixed(1)}% avg</p>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      }`}>
                        {subject.minScore.toFixed(1)}% - {subject.maxScore.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
                {subjectPerformance.length === 0 && (
                  <div className={`text-center py-8 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No subject performance data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className={`transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <CardTitle className={`${
                theme === "dark" ? "text-slate-200" : "text-slate-900"
              }`}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        theme === "dark" ? "text-slate-200" : "text-slate-900"
                      }`}>{activity.userName}</p>
                      <p className={`text-sm mt-1 truncate ${
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}>
                        {activity.subject} - {activity.paper}
                      </p>
                      <p className={`text-xs mt-1 ${
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      }`}>
                        {new Date(activity.evaluatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-semibold px-2 py-1 rounded-full inline-block ${
                        activity.score >= 70
                          ? theme === "dark" ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700"
                          : activity.score >= 50
                            ? theme === "dark" ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-700"
                            : theme === "dark" ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"
                      }`}>
                        {activity.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className={`text-center py-8 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
