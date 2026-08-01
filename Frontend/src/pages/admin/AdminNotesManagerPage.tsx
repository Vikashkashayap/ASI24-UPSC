import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { notesPortalAdminAPI, type NotesPortalUserRow } from "../../services/api";

export const AdminNotesManagerPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<NotesPortalUserRow[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentSearch, setStudentSearch] = useState("");

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"
  }`;
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notesPortalAdminAPI.listUsers({
        search: studentSearch.trim() || undefined,
        limit: 100,
      });
      if (res.data.success) {
        setStudents(res.data.data?.items || []);
        setStudentsTotal(res.data.data?.pagination?.total || 0);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load registered students");
      setStudents([]);
      setStudentsTotal(0);
    } finally {
      setLoading(false);
    }
  }, [studentSearch]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className={`text-xl font-bold flex items-center gap-2 ${
              isDark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            <Users className="w-5 h-5" />
            Registered Notes Users
          </h1>
          <p className={`text-sm mt-1 ${muted}`}>
            source = notes only — total{" "}
            <span className={isDark ? "text-slate-200 font-medium" : "text-slate-800 font-medium"}>
              {studentsTotal}
            </span>
          </p>
        </div>
        <div className="relative max-w-sm w-full sm:w-72">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by name, email or mobile…"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadStudents()}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className={isDark ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}>
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Name</th>
                <th className="text-left px-3 py-2.5 font-medium">Email</th>
                <th className="text-left px-3 py-2.5 font-medium">Mobile</th>
                <th className="text-left px-3 py-2.5 font-medium">Registration Date</th>
                <th className="text-left px-3 py-2.5 font-medium">Subscription</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s._id}
                  className={isDark ? "border-t border-slate-700" : "border-t border-slate-100"}
                >
                  <td className={`px-3 py-2.5 font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {s.name}
                  </td>
                  <td className={`px-3 py-2.5 ${muted}`}>{s.email}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{s.phone || "—"}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.subscription?.status === "active" ? (
                      <span className="text-emerald-600 text-xs font-medium">
                        {s.subscription.planTitle || "Active"}
                      </span>
                    ) : (
                      <span className={`text-xs ${muted}`}>None</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.isActive === false || s.status === "suspended" ? (
                      <span className="text-red-600 text-xs">Inactive</span>
                    ) : (
                      <span className="text-emerald-600 text-xs">Active</span>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 ${muted}`}>
                    {s.notesLastLoginAt
                      ? new Date(s.notesLastLoginAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan={7} className={`px-3 py-10 text-center ${muted}`}>
                    No Notes Website registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminNotesManagerPage;
