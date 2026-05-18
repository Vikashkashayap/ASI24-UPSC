import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, ArrowRight, GraduationCap, BookOpen, TrendingUp, UserMinus } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { mentorStaffAPI } from "../../services/api";

type Row = {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  testsSubmitted: number;
  averageTestScore: number;
  mainsEvaluations: number;
  latestMainsScorePct: number | null;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

export const MentorStudentsPage: React.FC = () => {
  const { theme } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mentorStaffAPI.getStudents();
        if (!cancelled && res.data?.success) {
          setRows(res.data.data.students || []);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const totalActivitySum = useMemo(
    () => rows.reduce((acc, s) => acc + s.mainsEvaluations + s.testsSubmitted, 0),
    [rows]
  );

  const avgAchievement = useMemo(() => {
    if (rows.length === 0) return 0;
    const vals = rows.map((s) => s.latestMainsScorePct ?? s.averageTestScore).filter((n) => n != null);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rows]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-500 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              Students Management
            </h1>
            <p className={`mt-2 text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Students assigned to you — open a profile for full activity and performance.
            </p>
          </div>
          <Link to="/mentor-dashboard">
            <Button
              variant="outline"
              className={`h-auto py-3 px-6 rounded-2xl border-2 ${
                theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
              }`}
            >
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`${
              theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"
            } rounded-3xl overflow-hidden border-2`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrollment</p>
                <p className="text-2xl font-black">{rows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`${
              theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"
            } rounded-3xl overflow-hidden border-2`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active This Month</p>
                <p className="text-2xl font-black">--</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`${
              theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"
            } rounded-3xl overflow-hidden border-2`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Activity</p>
                <p className="text-2xl font-black">{totalActivitySum}+</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`${
              theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-md" : "bg-white border-slate-100"
            } rounded-3xl overflow-hidden border-2`}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Achievement</p>
                <p className="text-2xl font-black">{rows.length ? `${avgAchievement}%` : "--"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Card
            className={`flex-1 transition-all duration-300 ${
              theme === "dark" ? "bg-slate-900/40 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-200 shadow-sm"
            } rounded-[2.5rem] overflow-hidden border-2`}
          >
            <CardContent className="p-2 px-4 flex items-center gap-2">
              <Search className={`h-5 w-5 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find a student by name or email..."
                  className={`w-full py-3 bg-transparent border-none focus:outline-none focus:ring-0 ${
                    theme === "dark" ? "text-slate-100 placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                  }`}
                />
              </form>
              <Button type="submit" onClick={handleSearch} className="rounded-2xl px-6 bg-slate-800 hover:bg-slate-700 text-white">
                Search
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div
            className={`p-5 rounded-3xl border flex items-center gap-4 ${
              theme === "dark" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="font-medium">{error}</span>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-20 rounded-2xl animate-pulse ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-200/50"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card
            className={`rounded-[3rem] border-dashed border-4 flex flex-col items-center justify-center py-24 ${
              theme === "dark" ? "bg-slate-900/20 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className={`p-8 rounded-[2rem] mb-6 ${theme === "dark" ? "bg-slate-800/50" : "bg-white"}`}>
              <UserMinus className="h-16 w-16 opacity-20" />
            </div>
            <h3 className="text-2xl font-bold">No students found</h3>
            <p className={`mt-2 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
              {rows.length === 0 ? "No students assigned yet." : "Try a different search."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => (
              <Card
                key={student._id}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/40 ${
                  theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
                }`}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <CardContent className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black transition-transform group-hover:scale-110 duration-300 shrink-0 ${
                          theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/mentor-dashboard/students/${student._id}`}
                          className="text-sm font-semibold truncate leading-tight group-hover:text-purple-400 transition-colors block hover:underline"
                        >
                          {student.name}
                        </Link>
                        <p className={`text-xs truncate mt-0.5 opacity-60`}>{student.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex flex-1 gap-4 md:gap-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Total Activity</p>
                        <p className="text-base font-semibold">{student.mainsEvaluations + student.testsSubmitted}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {student.mainsEvaluations} mains • {student.testsSubmitted} prelims
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Success Rate</p>
                        <p className="text-base font-semibold text-emerald-500">
                          {(() => {
                            const success =
                              student.latestMainsScorePct ?? (student.averageTestScore !== undefined ? student.averageTestScore : null);
                            return success !== null && success !== undefined ? `${Math.round(success)}%` : "N/A";
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 md:min-w-[220px]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold opacity-50">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {student.createdAt
                            ? new Date(student.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                      <Link to={`/mentor-dashboard/students/${student._id}`}>
                        <Button
                          variant="ghost"
                          className="rounded-xl h-8 px-3 hover:bg-purple-500/10 hover:text-purple-400 flex items-center gap-1.5 group/btn text-xs font-semibold"
                        >
                          Profile
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
      </div>
    </div>
  );
};
