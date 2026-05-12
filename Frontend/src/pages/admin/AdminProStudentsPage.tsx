import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { api } from "../../services/api";
import { Search, Calendar, ArrowRight, UserMinus, TrendingUp, IndianRupee, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface ProStudent {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  subscriptionStatus: "active" | "inactive";
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  plan?: {
    id: string;
    name: string;
    price: number;
    duration: string;
  } | null;
}

interface ProStats {
  totalProStudents: number;
  activeProStudents: number;
  totalActiveRevenue: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  pages: number;
}

export const AdminProStudentsPage = () => {
  const { theme } = useTheme();
  const [students, setStudents] = useState<ProStudent[]>([]);
  const [stats, setStats] = useState<ProStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 12 };
      if (searchTerm) params.search = searchTerm;
      const res = await api.get("/api/admin/pro-students", { params });
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setPagination(res.data.data.pagination || null);
        setStats(res.data.data.stats || null);
      } else {
        setError("Failed to load pro students");
      }
    } catch (err: any) {
      console.error("Error fetching pro students:", err);
      setError(err?.response?.data?.message || "Failed to load pro students");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStudents();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "--";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-500 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 to-fuchsia-400 bg-clip-text text-transparent">
              Pro Subscribers
            </h1>
            <p
              className={`mt-2 text-sm font-medium ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              View all paid-plan students, monitor active subscriptions, and track revenue.
            </p>
          </div>
          <Link to="/admin/dashboard">
            <Button
              variant="outline"
              className={`h-auto py-3 px-6 rounded-2xl border-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900/60 hover:bg-slate-800"
                  : "border-slate-200 bg-white hover:bg-slate-100"
              }`}
            >
              Admin Dashboard
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className={`rounded-3xl overflow-hidden border-2 ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-800 backdrop-blur-md"
                : "bg-white border-slate-100"
            }`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Pro Students
                </p>
                <p className="text-2xl font-black">
                  {stats?.totalProStudents ?? (pagination?.total || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`rounded-3xl overflow-hidden border-2 ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-800 backdrop-blur-md"
                : "bg-white border-slate-100"
            }`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Subscriptions
                </p>
                <p className="text-2xl font-black">
                  {stats?.activeProStudents ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`rounded-3xl overflow-hidden border-2 ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-800 backdrop-blur-md"
                : "bg-white border-slate-100"
            }`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                <IndianRupee className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Plan Revenue*
                </p>
                <p className="text-lg font-black">
                  {formatCurrency(stats?.totalActiveRevenue || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Card
            className={`flex-1 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800 backdrop-blur-xl"
                : "bg-white border-slate-200 shadow-sm"
            } rounded-[2.5rem] overflow-hidden border-2`}
          >
            <CardContent className="p-2 px-4 flex items-center gap-2">
              <Search
                className={`h-5 w-5 ${
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`}
              />
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find a pro student by name or email..."
                  className={`w-full py-3 bg-transparent border-none focus:outline-none focus:ring-0 ${
                    theme === "dark"
                      ? "text-slate-100 placeholder:text-slate-600"
                      : "text-slate-900 placeholder:text-slate-400"
                  }`}
                />
              </form>
              <Button
                type="submit"
                onClick={handleSearch}
                className="rounded-2xl px-6 bg-slate-800 hover:bg-slate-700 text-white"
              >
                Search
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div
            className={`p-5 rounded-3xl border flex items-center gap-4 ${
              theme === "dark"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* List */}
        {loading && students.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-20 rounded-2xl animate-pulse ${
                  theme === "dark" ? "bg-slate-900/50" : "bg-slate-200/50"
                }`}
              />
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card
            className={`rounded-[3rem] border-dashed border-4 flex flex-col items-center justify-center py-24 ${
              theme === "dark"
                ? "bg-slate-900/20 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div
              className={`p-8 rounded-[2rem] mb-6 ${
                theme === "dark" ? "bg-slate-800/50" : "bg-white"
              }`}
            >
              <UserMinus className="h-16 w-16 opacity-20" />
            </div>
            <h3 className="text-2xl font-bold">No pro students yet</h3>
            <p
              className={`mt-2 ${
                theme === "dark" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              When students upgrade from pricing, they will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <Card
                key={student._id}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/40 ${
                  theme === "dark"
                    ? "bg-slate-900/60 border-slate-800"
                    : "bg-white border-slate-100"
                }`}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-fuchsia-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <CardContent className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black ${
                          theme === "dark"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate leading-tight">
                          {student.name}
                        </h3>
                        <p className="text-xs truncate mt-0.5 opacity-60">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full font-semibold ${
                          student.subscriptionStatus === "active"
                            ? theme === "dark"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-emerald-50 text-emerald-700"
                            : theme === "dark"
                            ? "bg-slate-800 text-slate-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {student.subscriptionStatus === "active"
                          ? "Active"
                          : "Inactive"}
                      </div>
                      <p className="mt-1 opacity-60">
                        Joined {formatDate(student.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex flex-1 gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                          Plan
                        </p>
                        <p className="text-sm font-semibold">
                          {student.plan?.name || "—"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {student.plan
                            ? `${formatCurrency(student.plan.price)} • ${
                                student.plan.duration
                              }`
                            : "No plan attached"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                          Period
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(student.subscriptionStartDate)} →{" "}
                          {formatDate(student.subscriptionEndDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 md:min-w-[220px]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold opacity-50">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(student.createdAt)}</span>
                      </div>
                      <Link to={`/admin/students/${student._id}`}>
                        <Button
                          variant="ghost"
                          className="rounded-xl h-8 px-3 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-1.5 text-xs font-semibold"
                        >
                          Profile
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-12 mb-8">
            <Card
              className={`rounded-3xl border-2 p-1.5 ${
                theme === "dark"
                  ? "bg-slate-900/60 border-slate-800"
                  : "bg-white border-slate-200 shadow-md"
              }`}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  className="rounded-2xl px-4 py-2 hover:bg-slate-500/10"
                >
                  Prev
                </Button>
                <div className="flex gap-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 p-0 rounded-xl font-bold ${
                        currentPage === page
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                          : ""
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={!pagination.hasNext}
                  className="rounded-2xl px-4 py-2 hover:bg-slate-500/10"
                >
                  Next
                </Button>
              </div>
            </Card>
          </div>
        )}

        <p className="text-[10px] text-slate-500">
          *Revenue is calculated as the sum of current active plan prices. It
          does not replace accounting data.
        </p>
      </div>
    </div>
  );
};

