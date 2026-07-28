import React from "react";
import {
  Search,
  Trash2,
  Archive,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { entityName, formatBytes } from "../api";
import type {
  KnowledgeDocument,
  KbSubject,
  KbCategory,
  ProcessingStatus,
} from "../types";

type Props = {
  isDark: boolean;
  items: KnowledgeDocument[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  subjects: KbSubject[];
  categories: KbCategory[];
  filters: {
    q: string;
    subjectId: string;
    categoryId: string;
    processingStatus: string;
    year: string;
    sort: string;
    order: "asc" | "desc";
  };
  onFilterChange: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
  onBulk: (action: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onProcess?: (id: string) => void;
};

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Queued: "bg-violet-100 text-violet-700",
  Uploading: "bg-sky-100 text-sky-700",
  Uploaded: "bg-emerald-100 text-emerald-700",
  Processing: "bg-amber-100 text-amber-800",
  Completed: "bg-teal-100 text-teal-800",
  Failed: "bg-rose-100 text-rose-700",
};

export const KnowledgeDocumentTable: React.FC<Props> = ({
  isDark,
  items,
  loading,
  page,
  totalPages,
  total,
  selected,
  onToggle,
  onToggleAll,
  subjects,
  categories,
  filters,
  onFilterChange,
  onPageChange,
  onBulk,
  onDelete,
  onRetry,
  onProcess,
}) => {
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const allSelected = items.length > 0 && items.every((i) => selected.has(i._id));

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="p-4 space-y-3 border-b border-inherit">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <input
              value={filters.q}
              onChange={(e) => onFilterChange("q", e.target.value)}
              placeholder="Search title, tags, filename…"
              className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm ${inputCls}`}
            />
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onBulk("delete")}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button variant="outline" onClick={() => onBulk("archive")}>
                <Archive className="w-3.5 h-3.5 mr-1" /> Archive
              </Button>
              <Button variant="outline" onClick={() => onBulk("retry")}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
              </Button>
              <Button variant="outline" onClick={() => onBulk("download")}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
              <Button variant="outline" onClick={() => onBulk("changeCategory")}>
                Change category
              </Button>
              <Button variant="outline" onClick={() => onBulk("changeSubject")}>
                Change subject
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select
            className={`rounded-lg border px-2 py-2 text-sm ${inputCls}`}
            value={filters.subjectId}
            onChange={(e) => onFilterChange("subjectId", e.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={`rounded-lg border px-2 py-2 text-sm ${inputCls}`}
            value={filters.categoryId}
            onChange={(e) => onFilterChange("categoryId", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={`rounded-lg border px-2 py-2 text-sm ${inputCls}`}
            value={filters.processingStatus}
            onChange={(e) => onFilterChange("processingStatus", e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Year"
            className={`rounded-lg border px-2 py-2 text-sm ${inputCls}`}
            value={filters.year}
            onChange={(e) => onFilterChange("year", e.target.value)}
          />
          <select
            className={`rounded-lg border px-2 py-2 text-sm ${inputCls}`}
            value={`${filters.sort}:${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split(":");
              onFilterChange("sort", sort);
              onFilterChange("order", order);
            }}
          >
            <option value="createdAt:desc">Newest</option>
            <option value="createdAt:asc">Oldest</option>
            <option value="title:asc">Title A–Z</option>
            <option value="title:desc">Title Z–A</option>
            <option value="fileSize:desc">Largest</option>
            <option value="year:desc">Year</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className={`text-left text-xs uppercase tracking-wide ${
                isDark ? "text-slate-500 bg-slate-950/50" : "text-slate-500 bg-slate-50"
              }`}
            >
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
              </th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-inherit">
                  <td colSpan={8} className="px-4 py-4">
                    <div
                      className={`h-4 rounded animate-pulse ${
                        isDark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className={`px-4 py-12 text-center ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  No documents yet. Upload notes, PDFs, or PYQs to get started.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((doc) => (
                <tr
                  key={doc._id}
                  className={`border-t border-inherit hover:${
                    isDark ? "bg-slate-800/40" : "bg-slate-50/80"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(doc._id)}
                      onChange={() => onToggle(doc._id)}
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {doc.title}
                    </div>
                    <div className={`text-xs truncate max-w-[240px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {doc.originalFileName}
                    </div>
                  </td>
                  <td className="px-4 py-3">{entityName(doc.subjectId)}</td>
                  <td className="px-4 py-3">{entityName(doc.categoryId)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        STATUS_COLORS[doc.processingStatus] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {doc.processingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatBytes(doc.fileSize)}</td>
                  <td className="px-4 py-3">{doc.year || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {onProcess && (
                        <button
                          type="button"
                          onClick={() => onProcess(doc._id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium ${
                            isDark
                              ? "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25"
                              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          }`}
                          title="Start AI processing"
                        >
                          Process
                        </button>
                      )}
                      {doc.storageUrl && (
                        <a
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-1.5 rounded-lg ${
                            isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                          }`}
                          title="Open"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {doc.processingStatus === "Failed" && (
                        <button
                          type="button"
                          onClick={() => onRetry(doc._id)}
                          className={`p-1.5 rounded-lg ${
                            isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                          }`}
                          title="Retry"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(doc._id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div
        className={`flex items-center justify-between px-4 py-3 border-t text-sm ${
          isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
        }`}
      >
        <span>
          {total} document{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
           
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
           
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
