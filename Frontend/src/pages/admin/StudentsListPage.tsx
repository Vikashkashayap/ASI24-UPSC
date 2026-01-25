import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import { Search, User, Mail, Calendar, ArrowRight } from "lucide-react";

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

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 20 };
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

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Students Management</h1>
          <Link to="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Search Bar */}
        <Card className={`mb-6 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700 text-slate-100 focus:ring-purple-500 focus:border-purple-500"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500 focus:border-purple-500"
                  }`}
                />
              </div>
              <Button type="submit" className="px-6">Search</Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className={`p-4 rounded-lg mb-6 border ${
            theme === "dark"
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {error}
          </div>
        )}

        {/* Students Table */}
        <Card className={`transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <CardHeader>
            <CardTitle>
              {pagination ? `Total Students: ${pagination.total}` : "Students"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className={`text-center py-16 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>
                <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No students found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <Link
                    key={student._id}
                    to={`/admin/students/${student._id}`}
                    className={`block p-5 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                      theme === "dark"
                        ? "bg-slate-800/50 border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/80"
                        : "bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          theme === "dark" ? "bg-purple-500/10" : "bg-purple-50"
                        }`}>
                          <User className={`h-6 w-6 ${
                            theme === "dark" ? "text-purple-400" : "text-purple-600"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-lg truncate ${
                            theme === "dark" ? "text-slate-100" : "text-slate-900"
                          }`}>{student.name}</h3>
                          <div className={`flex items-center gap-2 text-sm mt-1 ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs mt-2 ${
                            theme === "dark" ? "text-slate-500" : "text-slate-500"
                          }`}>
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            Joined: {new Date(student.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-4 text-xs mt-3">
                            <span className={`px-2 py-1 rounded-full ${
                              theme === "dark"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {student.totalEvaluations} evaluations
                            </span>
                            {student.latestScore && (
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                theme === "dark"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
                                Latest: {student.latestScore.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {student.lastSubject && (
                            <p className={`text-xs mt-2 ${
                              theme === "dark" ? "text-slate-500" : "text-slate-500"
                            }`}>
                              Last: {student.lastSubject} {student.lastPaper && `- ${student.lastPaper}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`h-5 w-5 transition-colors ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8 pt-6 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className={`px-4 py-2 text-sm ${
                      theme === "dark"
                        ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    Previous
                  </Button>
                  <span className={`px-4 py-2 text-sm font-medium ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNext}
                    className={`px-4 py-2 text-sm ${
                      theme === "dark"
                        ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    Next
                  </Button>
                </div>
                <div className={`text-xs ${
                  theme === "dark" ? "text-slate-500" : "text-slate-500"
                }`}>
                  Showing {pagination.currentPage * 20 - 19} to {Math.min(pagination.currentPage * 20, pagination.total)} of {pagination.total} students
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
