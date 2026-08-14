import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Trash2, RotateCcw, Search, Loader2, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ConfirmationDialog } from "../../components/ui/dialog";
import { Pagination } from "../../components/ui/pagination";
import { useTheme } from "../../hooks/useTheme";
import { adminAPI } from "../../services/api";

type TrashKind = "test" | "evaluation";
type FilterType = "all" | "evaluation" | "chapter" | "practice" | "module" | "other";

interface TrashItem {
  id: string;
  kind: TrashKind;
  category: FilterType | "evaluation";
  title: string;
  subtitle: string;
  user: { _id: string; name: string; email: string } | null;
  trashedAt: string | null;
  daysLeft: number;
}

interface TrashStudent {
  _id: string;
  name: string;
  email: string;
}

interface TrashCounts {
  evaluation: number;
  chapter: number;
  practice: number;
  module: number;
  other: number;
  total: number;
}

interface TrashData {
  items: TrashItem[];
  ttlDays: number;
  students: TrashStudent[];
  counts: TrashCounts;
  pagination: { total: number; page: number; limit: number; pages: number };
}

const PAGE_SIZE = 10;

const CATEGORY_STYLE: Record<string, { dark: string; light: string; label: string }> = {
  evaluation: {
    label: "Copy Evaluation",
    dark: "bg-amber-500/15 text-amber-300",
    light: "bg-amber-50 text-amber-700",
  },
  chapter: {
    label: "Chapter-wise",
    dark: "bg-emerald-500/15 text-emerald-300",
    light: "bg-emerald-50 text-emerald-700",
  },
  practice: {
    label: "Practice",
    dark: "bg-blue-500/15 text-blue-300",
    light: "bg-blue-50 text-blue-700",
  },
  module: {
    label: "Module",
    dark: "bg-violet-500/15 text-violet-300",
    light: "bg-violet-50 text-violet-700",
  },
  other: {
    label: "Other",
    dark: "bg-slate-500/15 text-slate-300",
    light: "bg-slate-100 text-slate-700",
  },
};

function itemKey(item: Pick<TrashItem, "kind" | "id">) {
  return `${item.kind}:${item.id}`;
}

export const AdminTrashPage: FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<TrashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<"one" | "bulk" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminAPI.getTrash({
        type,
        page,
        limit: PAGE_SIZE,
        search,
        student,
      });
      if (res.data?.success) {
        setData(res.data.data);
        setSelected(new Set());
      } else {
        setError("Failed to load trash");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load trash");
    } finally {
      setLoading(false);
    }
  }, [type, page, search, student]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];
  const pageKeys = useMemo(() => items.map(itemKey), [items]);
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const selectedItems = items.filter((item) => selected.has(itemKey(item)));

  const toggleOne = (item: TrashItem) => {
    const key = itemKey(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(pageKeys));
  };

  const restoreOne = async (item: TrashItem) => {
    try {
      setBusy(true);
      await adminAPI.restoreTrashItem(item.kind, item.id);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const restoreSelected = async () => {
    if (!selectedItems.length) return;
    try {
      setBusy(true);
      await adminAPI.bulkRestoreTrash(
        selectedItems.map((item) => ({ kind: item.kind, id: item.id }))
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmPermanentDelete = async () => {
    try {
      setBusy(true);
      if (pendingDelete === "one" && deleteTarget) {
        await adminAPI.permanentlyDeleteTrashItem(deleteTarget.kind, deleteTarget.id);
      } else if (pendingDelete === "bulk" && selectedItems.length) {
        await adminAPI.bulkDeleteTrash(
          selectedItems.map((item) => ({ kind: item.kind, id: item.id }))
        );
      }
      setPendingDelete(null);
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const titleCls = isDark ? "text-slate-100" : "text-slate-900";
  const tabActive = isDark
    ? "bg-slate-800 text-white border-slate-600"
    : "bg-slate-900 text-white border-slate-900";
  const tabIdle = isDark
    ? "bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800/60"
    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
  const inputCls = isDark
    ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400";

  const counts = data?.counts || {
    evaluation: 0,
    chapter: 0,
    practice: 0,
    module: 0,
    other: 0,
    total: 0,
  };
  const ttl = data?.ttlDays || 30;
  const tabs: Array<[FilterType, string]> = [
    ["all", `All (${counts.total})`],
    ["evaluation", `Copy Evaluation (${counts.evaluation})`],
    ["chapter", `Chapter-wise (${counts.chapter})`],
    ["practice", `Practice (${counts.practice})`],
    ["module", `Module (${counts.module})`],
  ];
  if (counts.other > 0 || type === "other") {
    tabs.push(["other", `Other (${counts.other})`]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-semibold tracking-tight ${titleCls}`}>Trash</h1>
        <p className={`mt-1 text-sm ${muted}`}>
          Deleted tests and copy-evaluation history stay here for {ttl} days. Only admins can
          restore. Permanent delete cannot be undone. Auto-purge runs daily.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setType(key);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              type === key ? tabActive : tabIdle
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search subject, topic, file…"
            className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none ${inputCls}`}
          />
        </div>
        <div className="relative w-full lg:w-72">
          <User className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
          <select
            value={student}
            onChange={(e) => {
              setStudent(e.target.value);
              setPage(1);
            }}
            className={`w-full appearance-none rounded-lg border py-2 pl-9 pr-8 text-sm outline-none ${inputCls}`}
          >
            <option value="">All students</option>
            {(data?.students || []).map((s) => (
              <option key={s._id} value={s.email || s.name}>
                {s.name || s.email}{s.email ? ` (${s.email})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items.length > 0 && (
        <div
          className={`flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
            isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"
          }`}
        >
          <label className={`flex items-center gap-2 text-sm ${titleCls}`}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            Select all on this page
            {selected.size > 0 && (
              <span className={muted}>({selected.size} selected)</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || selected.size === 0}
              onClick={() => void restoreSelected()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore selected
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || selected.size === 0}
              onClick={() => {
                setDeleteTarget(null);
                setPendingDelete("bulk");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className={`flex items-center justify-center py-16 ${muted}`}>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !items.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trash2 className={`mb-3 h-8 w-8 ${muted}`} />
            <p className={`text-sm ${muted}`}>No items in this category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.other;
            const checked = selected.has(itemKey(item));
            return (
              <Card key={itemKey(item)}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(item)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                      aria-label={`Select ${item.title}`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            isDark ? style.dark : style.light
                          }`}
                        >
                          {style.label}
                        </span>
                        <p className={`truncate font-medium ${titleCls}`}>{item.title}</p>
                      </div>
                      <p className={`mt-1 truncate text-sm ${muted}`}>{item.subtitle}</p>
                      <p className={`mt-1 text-xs ${muted}`}>
                        {item.user
                          ? `${item.user.name} · ${item.user.email}`
                          : "Unknown student"}
                        {item.trashedAt
                          ? ` · Trashed ${new Date(item.trashedAt).toLocaleString()}`
                          : ""}
                        {` · ${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 pl-7 sm:pl-0">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void restoreOne(item)}
                    >
                      {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        setDeleteTarget(item);
                        setPendingDelete("one");
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete forever
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {data && data.pagination.total > 0 && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={Math.max(1, data.pagination.pages)}
          totalItems={data.pagination.total}
          itemsPerPage={data.pagination.limit}
          onPageChange={setPage}
        />
      )}

      <ConfirmationDialog
        isOpen={pendingDelete === "one" || pendingDelete === "bulk"}
        title="Permanently delete"
        message={
          pendingDelete === "bulk"
            ? `Permanently delete ${selected.size} selected item(s)? This cannot be undone.`
            : "This will permanently delete the item from trash. This cannot be undone."
        }
        confirmText="Delete forever"
        onConfirm={() => void confirmPermanentDelete()}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteTarget(null);
        }}
        loading={busy}
      />
    </div>
  );
};

export default AdminTrashPage;
