import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { api } from "../../services/api";
import {
  Search,
  Calendar,
  ArrowRight,
  UserMinus,
  TrendingUp,
  IndianRupee,
  Users,
  Trash2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";

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
  const [studentToDelete, setStudentToDelete] = useState<ProStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [studentToMove, setStudentToMove] = useState<ProStudent | null>(null);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [moveSuccess, setMoveSuccess] = useState("");

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

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      const res = await adminAPI.deleteStudent(studentToDelete._id);
      if (res.data.success) {
        setStudentToDelete(null);
        fetchStudents();
      }
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || "Failed to delete pro student");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveStudent = async () => {
    if (!studentToMove) return;
    try {
      setIsMoving(true);
      setMoveError("");
      const res = await adminAPI.moveProStudentToAdmin(studentToMove._id);
      if (res.data.success) {
        setMoveSuccess(`${studentToMove.name} moved to Admin Students`);
        setStudentToMove(null);
        fetchStudents();
      }
    } catch (err: any) {
      setMoveError(err?.response?.data?.message || "Failed to move student");
    } finally {
      setIsMoving(false);
    }
  };

  const handleMoveAll = async () => {
    try {
      setIsMoving(true);
      setMoveError("");
      const res = await adminAPI.moveAllProStudentsToAdmin();
      if (res.data.success) {
        setMoveSuccess(res.data.message || "All pro students moved to Admin Students");
        setMoveAllConfirm(false);
        setCurrentPage(1);
        fetchStudents();
      }
    } catch (err: any) {
      setMoveError(err?.response?.data?.message || "Failed to move students");
    } finally {
      setIsMoving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const summaryStats = [
    {
      label: "Total Pro Students",
      value: String(stats?.totalProStudents ?? pagination?.total ?? 0),
      icon: Users,
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Active Subscriptions",
      value: String(stats?.activeProStudents ?? 0),
      icon: TrendingUp,
      iconBg: "bg-indigo-500/10 text-indigo-500",
    },
    {
      label: "Active Plan Revenue",
      value: formatCurrency(stats?.totalActiveRevenue ?? 0),
      icon: IndianRupee,
      iconBg: "bg-amber-500/10 text-amber-500",
    },
  ];

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 transition-colors duration-500 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl sm:text-[2rem] font-bold tracking-tight text-emerald-500">
                Pro Subscribers
              </h1>
              {(stats?.totalProStudents ?? pagination?.total) != null && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    theme === "dark"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {stats?.totalProStudents ?? pagination?.total ?? 0}
                </span>
              )}
            </div>
            <p
              className={`mt-1 text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Paid self-registered students only. Move existing users to Admin Students for free access.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => {
                setMoveAllConfirm(true);
                setMoveError("");
              }}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              <span className="font-semibold text-sm">Move All to Students</span>
            </Button>
            <Link to="/admin/dashboard" className="shrink-0">
              <Button
                variant="outline"
                className={`h-11 px-5 rounded-xl border ${
                  theme === "dark"
                    ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                    : "border-slate-200 hover:bg-white text-slate-700"
                }`}
              >
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {moveSuccess && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              theme === "dark"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <span className="text-sm font-medium">{moveSuccess}</span>
            <button
              type="button"
              className="text-xs opacity-70 hover:opacity-100"
              onClick={() => setMoveSuccess("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {summaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className={`rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-800"
                    : "bg-white border-slate-100"
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                  <div
                    className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                      {stat.label}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                      {stat.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className={`flex items-center gap-2 rounded-2xl border px-3.5 h-12 shadow-sm ${
            theme === "dark"
              ? "bg-slate-900/50 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <Search
            className={`h-4 w-4 shrink-0 ${
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            }`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find a pro student by name or email..."
            className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm ${
              theme === "dark"
                ? "text-slate-100 placeholder:text-slate-600"
                : "text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <Button
            type="submit"
            className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shrink-0"
          >
            Search
          </Button>
        </form>

        {error && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 ${
              theme === "dark"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <p
              className={`text-sm font-medium ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Showing{" "}
              <span className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>
                {students.length}
              </span>
              {pagination?.total != null && pagination.total !== students.length && (
                <> of {pagination.total}</>
              )}{" "}
              pro students
            </p>
          </div>
        )}

        {/* Grid — 4 profile boxes per row */}
        {loading && students.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-72 rounded-2xl animate-pulse ${
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
              New self-registered students appear here after they pay.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {students.map((student) => {
              const isActive = student.subscriptionStatus === "active";
              return (
                <Card
                  key={student._id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-md hover:border-emerald-400/50 ${
                    theme === "dark"
                      ? "bg-slate-900/60 border-slate-800"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    title="Delete student"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStudentToDelete(student);
                      setDeleteError("");
                    }}
                    className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${
                      theme === "dark"
                        ? "text-slate-500 hover:text-red-400 hover:bg-red-500/15"
                        : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <CardContent className="p-5 pt-6 flex flex-col items-center text-center h-full">
                    <div
                      className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold mb-3 ring-4 ${
                        theme === "dark"
                          ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/10"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-50"
                      }`}
                    >
                      {getInitials(student.name)}
                    </div>

                    <h3 className="text-[15px] font-semibold truncate w-full px-6 leading-tight">
                      {student.name}
                    </h3>
                    <p
                      className={`text-xs truncate w-full mt-1 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {student.email}
                    </p>

                    <span
                      className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isActive
                          ? theme === "dark"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-emerald-50 text-emerald-700"
                          : theme === "dark"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>

                    <div
                      className={`w-full mt-4 rounded-xl overflow-hidden text-left px-3 py-2.5 ${
                        theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Plan
                      </p>
                      <p className="text-sm font-semibold truncate mt-0.5">
                        {student.plan?.name || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {student.plan
                          ? `${formatCurrency(student.plan.price)} · ${student.plan.duration}`
                          : "No plan attached"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1.5 truncate">
                        {formatDate(student.subscriptionStartDate)} →{" "}
                        {formatDate(student.subscriptionEndDate)}
                      </p>
                    </div>

                    <div className="mt-3 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setStudentToMove(student);
                          setMoveError("");
                        }}
                        className={`w-full rounded-xl h-8 text-xs font-semibold ${
                          theme === "dark"
                            ? "border-emerald-800 text-emerald-400 hover:bg-emerald-950/30"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        To Students
                      </Button>
                    </div>

                    <div
                      className={`mt-auto pt-3 w-full flex items-center justify-between gap-2 border-t ${
                        theme === "dark" ? "border-slate-800" : "border-slate-100"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>
                          {new Date(student.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <Link
                        to={`/admin/students/${student._id}`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group/btn"
                      >
                        Profile
                        <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8 mb-4">
            <Card
              className={`rounded-3xl border p-1.5 shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/60 border-slate-800"
                  : "bg-white border-slate-200"
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

      {studentToDelete && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020012]/90 backdrop-blur-xl p-4"
          onClick={() => !isDeleting && setStudentToDelete(null)}
        >
          <Card
            className={`w-full max-w-md rounded-[2rem] border-2 shadow-xl ${
              theme === "dark" ? "bg-slate-900 border-red-500/20" : "bg-white border-red-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-col items-center pt-8 pb-2 text-center">
              <div className="p-5 rounded-2xl bg-red-500/10 mb-4">
                <Trash2 className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-black">Delete Pro Student?</CardTitle>
              <p className="mt-2 px-6 text-sm opacity-60">
                Permanently delete <span className="font-bold">{studentToDelete.name}</span> ({studentToDelete.email})?
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  theme === "dark"
                    ? "bg-red-500/5 border-red-500/10 text-red-400"
                    : "bg-red-50 border-red-100 text-red-600"
                }`}
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">
                  This removes their account, subscription, test history, and all associated data. This cannot be undone.
                </p>
              </div>
              {deleteError && (
                <p className="text-sm text-red-500 text-center">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {studentToMove && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020012]/90 backdrop-blur-xl p-4"
          onClick={() => !isMoving && setStudentToMove(null)}
        >
          <Card
            className={`w-full max-w-md rounded-[2rem] border-2 shadow-xl ${
              theme === "dark" ? "bg-slate-900 border-emerald-500/20" : "bg-white border-emerald-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-col items-center pt-8 pb-2 text-center">
              <div className="p-5 rounded-2xl bg-emerald-500/10 mb-4">
                <UserCheck className="h-10 w-10 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black">Move to Admin Students?</CardTitle>
              <p className="mt-2 px-6 text-sm opacity-60">
                Move <span className="font-bold">{studentToMove.name}</span> to Admin Students with free access (no payment required).
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              {moveError && (
                <p className="text-sm text-red-500 text-center">{moveError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setStudentToMove(null)}
                  disabled={isMoving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleMoveStudent}
                  disabled={isMoving}
                >
                  {isMoving ? "Moving..." : "Move"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {moveAllConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020012]/90 backdrop-blur-xl p-4"
          onClick={() => !isMoving && setMoveAllConfirm(false)}
        >
          <Card
            className={`w-full max-w-md rounded-[2rem] border-2 shadow-xl ${
              theme === "dark" ? "bg-slate-900 border-emerald-500/20" : "bg-white border-emerald-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-col items-center pt-8 pb-2 text-center">
              <div className="p-5 rounded-2xl bg-emerald-500/10 mb-4">
                <Users className="h-10 w-10 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black">Move All to Admin Students?</CardTitle>
              <p className="mt-2 px-6 text-sm opacity-60">
                All current pro / paid-user students will move to Admin Students and get free access. New self-registered users will still need to pay to appear here.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              {moveError && (
                <p className="text-sm text-red-500 text-center">{moveError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setMoveAllConfirm(false)}
                  disabled={isMoving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleMoveAll}
                  disabled={isMoving}
                >
                  {isMoving ? "Moving..." : "Move All"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
