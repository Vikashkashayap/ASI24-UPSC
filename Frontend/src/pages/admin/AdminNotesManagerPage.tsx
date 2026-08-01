import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2, Users } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { notesPortalAdminAPI, type NotesPortalUserRow } from "../../services/api";

const PAGE_SIZE = 10;

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const AdminNotesManagerPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<NotesPortalUserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [userToDelete, setUserToDelete] = useState<NotesPortalUserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"
  }`;
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const btnClass = `inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
    isDark
      ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  }`;

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notesPortalAdminAPI.listUsers({
        search: activeSearch.trim() || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      if (res.data.success) {
        setStudents(res.data.data?.items || []);
        const p = res.data.data?.pagination;
        setPagination({
          page: p?.page || currentPage,
          limit: p?.limit || PAGE_SIZE,
          total: p?.total || 0,
          totalPages: p?.totalPages || 1,
        });
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load registered students");
      setStudents([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [activeSearch, currentPage]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setCurrentPage(1);
    setActiveSearch(studentSearch.trim());
  };

  const openDeleteConfirm = (user: NotesPortalUserRow) => {
    setDeleteError(null);
    setUserToDelete(user);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) return;
    setUserToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await notesPortalAdminAPI.deleteUser(userToDelete._id);
      if (!res.data.success) {
        setDeleteError(res.data.message || "Failed to delete user");
        return;
      }
      setUserToDelete(null);
      // If last item on page was deleted, go back a page when possible
      if (students.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        await loadStudents();
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setDeleteError(ax.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  const pageNumbers = (() => {
    const total = pagination.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, currentPage, currentPage - 1, currentPage + 1]);
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b);
  })();

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
            Notes Website registrations only —{" "}
            {pagination.total > 0 ? (
              <>
                showing{" "}
                <span className={isDark ? "text-slate-200 font-medium" : "text-slate-800 font-medium"}>
                  {from}–{to}
                </span>{" "}
                of{" "}
                <span className={isDark ? "text-slate-200 font-medium" : "text-slate-800 font-medium"}>
                  {pagination.total}
                </span>
              </>
            ) : (
              <>
                total{" "}
                <span className={isDark ? "text-slate-200 font-medium" : "text-slate-800 font-medium"}>
                  0
                </span>
              </>
            )}
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative max-w-sm w-full sm:w-80 flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search by name, email or mobile…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
          <button type="submit" className={`${btnClass} shrink-0`}>
            Search
          </button>
        </form>
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
        <>
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
                  <th className="text-right px-3 py-2.5 font-medium">Action</th>
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
                        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {s.subscription.planTitle || "Notes"}
                        </span>
                      ) : (
                        <span className={`text-xs ${muted}`}>None</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.isActive === false || s.status === "suspended" ? (
                        <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-600">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 ${muted}`}>
                      {s.notesLastLoginAt
                        ? new Date(s.notesLastLoginAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!students.length && (
                  <tr>
                    <td colSpan={8} className={`px-3 py-10 text-center ${muted}`}>
                      No Notes Website registrations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className={`text-sm ${muted}`}>
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={btnClass}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                {pageNumbers.map((page, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev != null && page - prev > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className={`px-1 text-sm ${muted}`}>…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : isDark
                              ? "border border-slate-600 text-slate-200 hover:bg-slate-800"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
                <button
                  type="button"
                  className={btnClass}
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${
              isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <h2 className={`text-lg font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                Are you sure you want to delete?
              </h2>
              <p className={`mt-2 text-sm ${muted}`}>
                This will permanently delete{" "}
                <span className={isDark ? "text-slate-100 font-semibold" : "text-slate-800 font-semibold"}>
                  {userToDelete.name}
                </span>{" "}
                ({userToDelete.email}) and their Notes subscription data. This cannot be undone.
              </p>
              {deleteError && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
                  {deleteError}
                </div>
              )}
            </div>
            <div
              className={`flex gap-3 border-t px-6 py-4 ${
                isDark ? "border-slate-700" : "border-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                  isDark
                    ? "border-slate-600 text-slate-200 hover:bg-slate-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotesManagerPage;
