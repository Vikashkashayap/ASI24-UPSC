import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Database,
  Upload,
  RefreshCw,
  Cloud,
  CloudOff,
  Activity,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { knowledgeAPI } from "../../features/knowledge/api";
import { processingAPI } from "../../features/processing/api";
import { KnowledgeStatsCards } from "../../features/knowledge/components/KnowledgeStatsCards";
import { KnowledgeUploadDialog } from "../../features/knowledge/components/KnowledgeUploadDialog";
import { KnowledgeDocumentTable } from "../../features/knowledge/components/KnowledgeDocumentTable";
import { KnowledgeTaxonomyPanel } from "../../features/knowledge/components/KnowledgeTaxonomyPanel";
import type {
  KnowledgeDashboard,
  KnowledgeDocument,
  KbSubject,
  KbCategory,
} from "../../features/knowledge/types";

export const KnowledgeBaseAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<KnowledgeDashboard | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [items, setItems] = useState<KnowledgeDocument[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [subjects, setSubjects] = useState<KbSubject[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    q: "",
    subjectId: "",
    categoryId: "",
    processingStatus: "",
    year: "",
    sort: "createdAt",
    order: "desc" as "asc" | "desc",
  });

  const loadTaxonomy = useCallback(async () => {
    const [s, c] = await Promise.all([
      knowledgeAPI.subjects.list(),
      knowledgeAPI.categories.list(),
    ]);
    setSubjects(s.data.data || []);
    setCategories(c.data.data || []);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await knowledgeAPI.dashboard();
      setStats(res.data.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load dashboard";
      toast.error(msg);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setListLoading(true);
      const res = await knowledgeAPI.list({
        page,
        limit: 20,
        q: filters.q || undefined,
        subjectId: filters.subjectId || undefined,
        categoryId: filters.categoryId || undefined,
        processingStatus: filters.processingStatus || undefined,
        year: filters.year ? Number(filters.year) : undefined,
        sort: filters.sort,
        order: filters.order,
      });
      const data = res.data.data;
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load documents";
      toast.error(msg);
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [page, filters]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDashboard(), loadList(), loadTaxonomy()]);
  }, [loadDashboard, loadList, loadTaxonomy]);

  useEffect(() => {
    loadTaxonomy().catch(() => {});
    loadDashboard().catch(() => {});
  }, [loadTaxonomy, loadDashboard]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadList().catch(() => {});
    }, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadList, filters.q]);

  const onFilterChange = (key: string, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const onToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onToggleAll = () => {
    if (items.every((i) => selected.has(i._id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i._id)));
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this document from the Knowledge Base?")) return;
    try {
      await knowledgeAPI.remove(id);
      toast.success("Deleted");
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      refreshAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  const onRetry = async (id: string) => {
    try {
      await knowledgeAPI.retry([id]);
      toast.success("Marked for retry");
      refreshAll();
    } catch {
      toast.error("Retry failed");
    }
  };

  const onProcess = async (id: string) => {
    try {
      await processingAPI.start(id, true);
      toast.success("Queued for AI processing");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to start processing";
      toast.error(msg);
    }
  };

  const onBulk = async (action: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;

    if (action === "download") {
      items
        .filter((i) => selected.has(i._id) && i.storageUrl)
        .forEach((i) => window.open(i.storageUrl, "_blank"));
      return;
    }

    if (action === "changeCategory") {
      const categoryId = window.prompt("Paste category ID to apply:") || "";
      if (!categoryId) return;
      try {
        await knowledgeAPI.bulk({ ids, action: "changeCategory", categoryId });
        toast.success("Category updated");
        setSelected(new Set());
        refreshAll();
      } catch {
        toast.error("Bulk update failed");
      }
      return;
    }

    if (action === "changeSubject") {
      const subjectId = window.prompt("Paste subject ID to apply:") || "";
      if (!subjectId) return;
      try {
        await knowledgeAPI.bulk({ ids, action: "changeSubject", subjectId });
        toast.success("Subject updated");
        setSelected(new Set());
        refreshAll();
      } catch {
        toast.error("Bulk update failed");
      }
      return;
    }

    if (action === "delete" && !window.confirm(`Delete ${ids.length} document(s)?`)) {
      return;
    }

    try {
      await knowledgeAPI.bulk({ ids, action });
      toast.success("Bulk action complete");
      setSelected(new Set());
      refreshAll();
    } catch {
      toast.error("Bulk action failed");
    }
  };

  const s3Ok = stats?.s3?.ok;
  const s3Configured = stats?.s3?.configured;

  return (
    <div
      className={`min-h-full w-full ${
        isDark
          ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-sky-50/40"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto space-y-6 px-3 md:px-6 pb-10 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-100 text-sky-700"
                }`}
              >
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1
                  className={`text-2xl md:text-3xl font-semibold tracking-tight ${
                    isDark ? "text-slate-50" : "text-slate-900"
                  }`}
                >
                  Knowledge Base
                </h1>
                <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Upload notes, PDFs, PYQs & archives — foundation for AI question practice
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${
                s3Ok
                  ? isDark
                    ? "border-emerald-800 text-emerald-400"
                    : "border-emerald-200 text-emerald-700"
                  : isDark
                    ? "border-amber-800 text-amber-400"
                    : "border-amber-200 text-amber-700"
              }`}
            >
              {s3Ok ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {s3Configured
                ? s3Ok
                  ? `S3 · ${stats?.s3?.bucket}`
                  : `S3 error`
                : "S3 not configured"}
            </div>
            <Button variant="outline" onClick={refreshAll}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Link to="/admin/processing">
              <Button variant="outline">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Processing
              </Button>
            </Link>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload
            </Button>
          </div>
        </motion.div>

        <KnowledgeStatsCards stats={stats} loading={statsLoading} isDark={isDark} />

        {stats?.recentUploads && stats.recentUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl border p-4 ${
              isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-white/80"
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-3 ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              Recent uploads
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {stats.recentUploads.map((doc) => (
                <div
                  key={doc._id}
                  className={`shrink-0 min-w-[180px] rounded-xl border px-3 py-2 ${
                    isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div
                    className={`text-sm font-medium truncate ${
                      isDark ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    {doc.title}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {doc.processingStatus}
                    {doc.createdAt
                      ? ` · ${new Date(doc.createdAt).toLocaleDateString()}`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <KnowledgeTaxonomyPanel
          isDark={isDark}
          subjects={subjects}
          categories={categories}
          onRefresh={loadTaxonomy}
        />

        <KnowledgeDocumentTable
          isDark={isDark}
          items={items}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          total={total}
          selected={selected}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          subjects={subjects}
          categories={categories}
          filters={filters}
          onFilterChange={onFilterChange}
          onPageChange={setPage}
          onBulk={onBulk}
          onDelete={onDelete}
          onRetry={onRetry}
          onProcess={onProcess}
        />
      </div>

      <KnowledgeUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          refreshAll();
        }}
        isDark={isDark}
        subjects={subjects}
        categories={categories}
      />
    </div>
  );
};

export default KnowledgeBaseAdminPage;
