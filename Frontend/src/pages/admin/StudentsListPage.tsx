import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import {
  Search, User, Mail, Calendar, ArrowRight, UserPlus, X, Copy, Check,
  Trash2, AlertCircle, TrendingUp, BookOpen, GraduationCap, MoreVertical,
  Filter, UserCheck, UserMinus, ShieldAlert
} from "lucide-react";
import { adminAPI } from "../../services/api";

interface Student {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  totalEvaluations: number;
  latestScore: number | null;
  lastEvaluationDate: string | null;
  lastSubject: string | null;
  lastPaper: string | null;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  pages: number;
}

export const StudentsListPage = () => {
  const { theme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");

  // Student creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", email: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{ name: string; email: string; tempPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 12 }; // Grid looks better with multiples of 3 or 4
      if (searchTerm) {
        params.search = searchTerm;
      }
      const res = await api.get("/api/admin/students", { params });
      if (res.data.success) {
        setStudents(res.data.data.students);
        setPagination(res.data.data.pagination);
      } else {
        setError("Failed to load students");
      }
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError(err?.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStudents();
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setError("");
      const res = await adminAPI.createStudent(newStudentData);
      if (res.data.success) {
        setCreatedStudent({
          ...newStudentData,
          tempPassword: res.data.data.tempPassword
        });
        fetchStudents();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create student");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError("");

      console.log(`Initiating delete for student: ${studentToDelete._id}`);

      const res = await adminAPI.deleteStudent(studentToDelete._id);

      if (res.data.success) {
        setShowDeleteConfirm(false);
        setStudentToDelete(null);
        fetchStudents();
      }
    } catch (err: any) {
      console.error("Error deleting student:", err);
      // Extra detailed error logging
      if (err.response?.status === 404) {
        setDeleteError("API endpoint not found (404). Please ensure the backend server is updated.");
      } else {
        setDeleteError(err?.response?.data?.message || "Failed to delete student. Check console for details.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className={`min-h-screen p-6 transition-colors duration-500 ${theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              Student Management
            </h1>
            <p className={`mt-2 text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Manage your cohort, track performance, and oversee registrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setShowCreateModal(true);
                setCreatedStudent(null);
                setNewStudentData({ name: "", email: "" });
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 h-auto rounded-2xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] flex items-center gap-2 group"
            >
              <UserPlus className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="font-semibold">Add New Student</span>
            </Button>
            <Link to="/admin/dashboard">
              <Button variant="outline" className={`h-auto py-3 px-6 rounded-2xl border-2 ${theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                }`}>
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Summary Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`${theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"} rounded-3xl overflow-hidden border-2`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrollment</p>
                <p className="text-2xl font-black">{pagination?.total || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`${theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"} rounded-3xl overflow-hidden border-2`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active This Month</p>
                <p className="text-2xl font-black">--</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`${theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"} rounded-3xl overflow-hidden border-2`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Evaluations</p>
                <p className="text-2xl font-black">{students.reduce((acc, s) => acc + s.totalEvaluations, 0)}+</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`${theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"} rounded-3xl overflow-hidden border-2`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Achievement</p>
                <p className="text-2xl font-black">74%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Card className={`flex-1 transition-all duration-300 ${theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-200 shadow-sm"
            } rounded-[2.5rem] overflow-hidden border-2`}>
            <CardContent className="p-2 px-4 flex items-center gap-2">
              <Search className={`h-5 w-5 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find a student by name or email..."
                  className={`w-full py-3 bg-transparent border-none focus:outline-none focus:ring-0 ${theme === "dark" ? "text-slate-100 placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                    }`}
                />
              </form>
              <Button type="submit" onClick={handleSearch} className="rounded-2xl px-6 bg-slate-800 hover:bg-slate-700 text-white">Search</Button>
            </CardContent>
          </Card>

          <Button variant="outline" className={`rounded-[2rem] px-6 h-auto border-2 ${theme === "dark" ? "border-slate-800 bg-slate-900/40" : "border-slate-200"
            }`}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {error && (
          <div className={`p-5 rounded-3xl border flex items-center gap-4 ${theme === "dark" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700"
            }`}>
            <ShieldAlert className="h-6 w-6" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Students Grid */}
        {loading && students.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`h-64 rounded-[2rem] animate-pulse ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-200/50"}`}></div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card className={`rounded-[3rem] border-dashed border-4 flex flex-col items-center justify-center py-24 ${theme === "dark" ? "bg-slate-900/20 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
            <div className={`p-8 rounded-[2rem] mb-6 ${theme === "dark" ? "bg-slate-800/50" : "bg-white"}`}>
              <UserMinus className="h-16 w-16 opacity-20" />
            </div>
            <h3 className="text-2xl font-bold">No students found</h3>
            <p className={`mt-2 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
              Try broadening your search or add a new student.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <Card
                key={student._id}
                className={`group relative overflow-hidden rounded-[2.5rem] border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30 ${theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100"
                  }`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

                <CardContent className="p-7">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black transition-transform group-hover:scale-110 duration-500 ${theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"
                        }`}>
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate leading-tight group-hover:text-purple-400 transition-colors">
                          {student.name}
                        </h3>
                        <p className={`text-sm truncate mt-0.5 opacity-60`}>
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setStudentToDelete(student);
                          setShowDeleteConfirm(true);
                          setDeleteError("");
                        }}
                        className="h-12 w-12 p-0 rounded-2xl hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all duration-300 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-4 rounded-3xl ${theme === "dark" ? "bg-slate-800/40" : "bg-slate-50"}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Evaluations</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold">{student.totalEvaluations}</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-3xl ${theme === "dark" ? "bg-slate-800/40" : "bg-slate-50"}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-emerald-500">
                            {student.latestScore ? `${Math.round(student.latestScore)}%` : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold opacity-40">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>

                      <Link to={`/admin/students/${student._id}`}>
                        <Button variant="ghost" className="rounded-xl h-auto py-2 px-4 hover:bg-purple-500/10 hover:text-purple-400 flex items-center gap-2 group/btn">
                          <span className="text-xs font-bold uppercase tracking-wider">Profile</span>
                          <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
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
            <Card className={`rounded-3xl border-2 p-1.5 ${theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-md"}`}>
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
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 p-0 rounded-xl font-bold ${currentPage === page ? "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20" : ""
                        }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNext}
                  className="rounded-2xl px-4 py-2 hover:bg-slate-500/10"
                >
                  Next
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Improved Create Student Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020012]/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <Card className={`w-full max-w-lg rounded-[3rem] border-2 shadow-2xl ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              } overflow-hidden`}>
              <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
                <CardTitle className="text-3xl font-black tracking-tight">
                  {createdStudent ? "Student Profile Ready" : "Onboard New Student"}
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-2xl h-12 w-12 p-0 hover:bg-slate-500/10">
                  <X className="h-6 w-6" />
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                {createdStudent ? (
                  <div className="space-y-8 mt-4">
                    <div className={`p-8 rounded-[2.5rem] border-2 text-center ${theme === "dark" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
                      }`}>
                      <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                        <UserCheck className="h-10 w-10 text-emerald-500" />
                      </div>
                      <h4 className="text-xl font-bold mb-2">Registration Successful</h4>
                      <p className={`text-sm opacity-70 mb-8`}>
                        Account for {createdStudent.name} has been created. Use the following credentials for access.
                      </p>

                      <div className="space-y-4">
                        <div className="group relative">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2 px-4 text-left">Login Email</label>
                          <div className={`flex items-center justify-between p-4 px-6 rounded-3xl border-2 transition-all ${theme === "dark" ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                            }`}>
                            <span className="font-mono font-bold tracking-tight truncate">{createdStudent.email}</span>
                            <Button variant="ghost" onClick={() => copyToClipboard(createdStudent.email)} className="rounded-xl h-10 w-10 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="group relative">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2 px-4 text-left">Access Passphrase</label>
                          <div className={`flex items-center justify-between p-4 px-6 rounded-3xl border-2 transition-all ${theme === "dark" ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                            }`}>
                            <span className="font-mono font-bold tracking-tight truncate">{createdStudent.tempPassword}</span>
                            <Button variant="ghost" onClick={() => copyToClipboard(createdStudent.tempPassword || "")} className="rounded-xl h-10 w-10 p-0">
                              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setShowCreateModal(false)} className="w-full py-7 rounded-[2rem] bg-slate-900 hover:bg-black text-white text-lg font-bold">Close Portal</Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateStudent} className="space-y-6 mt-4">
                    <div className="space-y-3">
                      <label className="text-sm font-black uppercase tracking-widest text-slate-500 px-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newStudentData.name}
                        onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                        className={`w-full p-5 px-6 rounded-3xl border-2 focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all ${theme === "dark" ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        placeholder="Rahul Sharma"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black uppercase tracking-widest text-slate-500 px-2">Email Identity</label>
                      <input
                        type="email"
                        required
                        value={newStudentData.email}
                        onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                        className={`w-full p-5 px-6 rounded-3xl border-2 focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all ${theme === "dark" ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        placeholder="rahul@mentorsdaily.com"
                      />
                    </div>
                    <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-600 leading-relaxed font-medium">
                        An encrypted temporary passphrase will be generated upon confirmation. Detailed credentials will be visible on the next screen.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full py-7 rounded-[2rem] bg-purple-600 hover:bg-purple-700 text-white text-lg font-black shadow-xl shadow-purple-500/20 transition-transform active:scale-[0.98]"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Creating Profile...
                        </div>
                      ) : "Onboard Student"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Premium Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020012]/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
            <Card className={`w-full max-w-md rounded-[3rem] border-2 shadow-[0_25px_80px_-15px_rgba(239,68,68,0.3)] ${theme === "dark" ? "bg-slate-900 border-red-500/20" : "bg-white border-red-100"
              } overflow-hidden`}>
              <CardHeader className="flex flex-col items-center pt-10 pb-4 text-center">
                <div className="p-6 rounded-[2rem] bg-red-500/10 mb-6 group">
                  <Trash2 className="h-12 w-12 text-red-500 transition-transform group-hover:rotate-12 duration-300" />
                </div>
                <CardTitle className="text-3xl font-black tracking-tight">Erase Student?</CardTitle>
                <p className={`mt-3 px-8 text-sm opacity-60 font-medium`}>
                  You are about to permanently delete <span className="text-white font-bold">{studentToDelete?.name}</span>'s profile.
                </p>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-6">
                <div className={`p-6 rounded-3xl border flex items-start gap-4 ${theme === "dark" ? "bg-red-500/5 border-red-500/10 text-red-400" : "bg-red-50 border-red-100 text-red-600"
                  }`}>
                  <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed font-bold uppercase tracking-wide">
                    This action wipes all evaluations, test history, and analytics records. Recovery is not possible.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-4 rounded-2xl bg-slate-800 text-red-400 text-xs font-mono border border-red-500/30 overflow-hidden break-all">
                    {deleteError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-7 rounded-[1.5rem] font-bold text-slate-500 hover:bg-slate-800"
                    disabled={isDeleting}
                  >
                    Keep Profile
                  </Button>
                  <Button
                    onClick={handleDeleteStudent}
                    className="flex-1 py-7 rounded-[1.5rem] bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/20"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Erasing...
                      </div>
                    ) : "Confirm Deletion"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};
