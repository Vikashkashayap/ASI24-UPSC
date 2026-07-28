import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Brain,
  RefreshCw,
  RotateCcw,
  Search,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Globe,
  Scissors,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import {
  intelligenceAPI,
  type IntelligenceDashboard,
  type SearchResult,
} from "../../features/intelligence/api";
import { notesAPI } from "../../services/api";

const DEFAULT_CHUNKING = { minWords: 800, maxWords: 1000, overlapWords: 100 };

type CatalogGroup = {
  subject: string;
  gsPaper?: string;
  topicCount?: number;
  chapterCount?: number;
  chapters: Array<{
    title: string;
    slug?: string;
    expectedTopicCount?: number;
    topicCount?: number;
    status?: string;
  }>;
};

export const IntelligenceDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<IntelligenceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [websiteSyncing, setWebsiteSyncing] = useState(false);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [chunkMin, setChunkMin] = useState(DEFAULT_CHUNKING.minWords);
  const [chunkMax, setChunkMax] = useState(DEFAULT_CHUNKING.maxWords);
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_CHUNKING.overlapWords);
  const [websiteStatus, setWebsiteStatus] = useState<{
    running: boolean;
    done: number;
    total: number;
    failed: number;
    skipped?: number;
    current?: { subject?: string; title?: string } | null;
    finishedAt?: string | null;
    force?: boolean;
    subjects?: string[];
    topicsDone?: number;
    topicsTotal?: number;
    currentTopic?: {
      subject?: string;
      chapter?: string;
      title?: string;
      index?: number;
      total?: number;
    } | null;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await intelligenceAPI.dashboard({ page: 1 });
      setData(res.data.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load intelligence dashboard";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await notesAPI.getCatalog();
      const groups = (res.data?.data || []) as CatalogGroup[];
      setCatalog(groups);
    } catch {
      try {
        const res = await notesAPI.getSubjects();
        setCatalog((res.data.data || []).map((subject: string) => ({ subject, chapters: [] })));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const pollWebsiteSync = useCallback(async () => {
    try {
      const res = await notesAPI.syncAllWebsiteStatus();
      const st = res.data.data;
      setWebsiteStatus({
        running: st.running,
        done: st.done,
        total: st.total,
        failed: st.failed,
        skipped: st.skipped,
        current: st.current,
        finishedAt: st.finishedAt,
        force: st.force,
        subjects: st.subjects,
        topicsDone: st.topicsDone,
        topicsTotal: st.topicsTotal,
        currentTopic: st.currentTopic,
      });
      setWebsiteSyncing(st.running);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    loadSubjects();
    pollWebsiteSync();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load, loadSubjects, pollWebsiteSync]);

  useEffect(() => {
    if (!websiteSyncing) return;
    const t = setInterval(pollWebsiteSync, 4000);
    return () => clearInterval(t);
  }, [websiteSyncing, pollWebsiteSync]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await intelligenceAPI.search({ query: query.trim(), topK: 8 });
      const payload = res.data.data as {
        results?: SearchResult[];
        concepts?: string[];
      };
      setResults(payload.results || []);
      setConcepts(payload.concepts || []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Search failed";
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const onRetryFailed = async () => {
    try {
      await intelligenceAPI.retryFailed();
      toast.success("Failed embeddings queued for retry");
      load();
    } catch {
      toast.error("Retry failed");
    }
  };

  const buildChunkingPayload = () => {
    const minWords = Number(chunkMin) || DEFAULT_CHUNKING.minWords;
    const maxWords = Number(chunkMax) || DEFAULT_CHUNKING.maxWords;
    const overlapWords = Number(chunkOverlap) || DEFAULT_CHUNKING.overlapWords;
    const changed =
      minWords !== DEFAULT_CHUNKING.minWords ||
      maxWords !== DEFAULT_CHUNKING.maxWords ||
      overlapWords !== DEFAULT_CHUNKING.overlapWords;
    return changed ? { minWords, maxWords, overlapWords } : undefined;
  };

  const startWebsiteSync = async (opts: {
    force?: boolean;
    allSubjects?: boolean;
  }) => {
    if (!opts.allSubjects && !selectedSubjects.length) {
      toast.error("Pehle subject select karo (jaise Economy) — uske saare topics update honge");
      return;
    }

    const payloadSubjects = opts.allSubjects ? undefined : selectedSubjects;

    try {
      setWebsiteSyncing(true);
      const chunking = buildChunkingPayload();
      const force = Boolean(opts.force);
      await notesAPI.syncAllWebsite({
        subjects: payloadSubjects,
        force,
        chunking,
      });
      const scope = payloadSubjects?.length
        ? payloadSubjects.join(", ")
        : "all subjects";
      const topicsHint =
        payloadSubjects?.length && selectedTopicTotal
          ? ` (~${selectedTopicTotal} topics)`
          : "";
      toast.success(
        force
          ? `Updating full content for ${scope}${topicsHint} (background)`
          : `Syncing ${scope}${topicsHint} to Knowledge Base (background)`
      );
      pollWebsiteSync();
    } catch (e: unknown) {
      setWebsiteSyncing(false);
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to start website sync";
      toast.error(msg);
    }
  };

  const catalogSubjects = catalog.map((g) => g.subject);
  const selectedGroups = catalog.filter((g) => selectedSubjects.includes(g.subject));
  const selectedTopicTotal = selectedGroups.reduce((sum, g) => {
    if (g.topicCount) return sum + g.topicCount;
    return (
      sum +
      g.chapters.reduce(
        (s, c) => s + (c.expectedTopicCount || c.topicCount || 0),
        0
      )
    );
  }, 0);
  const selectedChapterTotal = selectedGroups.reduce(
    (sum, g) => sum + (g.chapterCount || g.chapters.length || 0),
    0
  );

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const selectAllSubjects = () => setSelectedSubjects([...catalogSubjects]);
  const clearSubjects = () => setSelectedSubjects([]);

  const topicLabelFor = (subject: string) => {
    const g = catalog.find((x) => x.subject === subject);
    if (!g) return null;
    const n =
      g.topicCount ||
      g.chapters.reduce((s, c) => s + (c.expectedTopicCount || c.topicCount || 0), 0);
    return n || null;
  };

  const stats = data?.stats;
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700"
            }`}
          >
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1
              className={`text-xl md:text-2xl font-bold ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Knowledge Intelligence
            </h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Embeddings · Qdrant sync · Hybrid search
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRetryFailed}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Retry failed
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Website notes sync panel */}
      <div
        className={`rounded-2xl border p-4 space-y-4 ${
          isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3
              className={`text-sm font-semibold flex items-center gap-2 ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              <Globe className="w-4 h-4" />
              Website notes → Knowledge Base
            </h3>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Ek subject select karo (jaise <span className="font-medium">Economy</span>) — sync
              uske saare topics update karega (website pe jo 24 chapters dikhte hain).{" "}
              <a
                href="https://notes.mentorsdaily.com/economy"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                notes.mentorsdaily.com
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              size="sm"
              disabled={websiteSyncing || !selectedSubjects.length}
              onClick={() => startWebsiteSync({ force: true })}
              title="Selected subject ke saare topics re-fetch + re-chunk + re-embed"
            >
              {websiteSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              Update subject
              {selectedTopicTotal > 0 ? ` (${selectedTopicTotal})` : ""}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={websiteSyncing || !selectedSubjects.length}
              onClick={() => startWebsiteSync({ force: false })}
              title="Selected subject pehli baar add/sync (already synced skip)"
            >
              <Globe className="w-4 h-4 mr-1.5" />
              Sync selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={websiteSyncing}
              onClick={() => startWebsiteSync({ force: false, allSubjects: true })}
              title="Poora catalog add (already synced skip)"
            >
              Add all
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-medium uppercase tracking-wide ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Subjects ({selectedSubjects.length}/{catalogSubjects.length})
              {selectedTopicTotal > 0
                ? ` · ${selectedTopicTotal} topics selected`
                : ""}
            </span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className={isDark ? "text-violet-300" : "text-violet-700"}
                onClick={selectAllSubjects}
              >
                Select all
              </button>
              <span className={isDark ? "text-slate-600" : "text-slate-300"}>·</span>
              <button
                type="button"
                className={isDark ? "text-slate-400" : "text-slate-500"}
                onClick={clearSubjects}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {catalogSubjects.map((subject) => {
              const on = selectedSubjects.includes(subject);
              const topics = topicLabelFor(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    on
                      ? isDark
                        ? "bg-violet-500/25 border-violet-400/50 text-violet-200"
                        : "bg-violet-100 border-violet-300 text-violet-800"
                      : isDark
                        ? "border-slate-700 text-slate-400 hover:border-slate-500"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {subject}
                  {topics ? (
                    <span className="opacity-70 ml-1">{topics}</span>
                  ) : null}
                </button>
              );
            })}
            {!catalogSubjects.length && (
              <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Loading subjects…
              </span>
            )}
          </div>
        </div>

        {selectedGroups.length > 0 && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs space-y-1.5 ${
              isDark
                ? "border-slate-800 bg-slate-950/40 text-slate-300"
                : "border-slate-100 bg-slate-50 text-slate-700"
            }`}
          >
            <div className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Will fully update {selectedChapterTotal} chapter page
              {selectedChapterTotal === 1 ? "" : "s"} · {selectedTopicTotal} topics
            </div>
            {selectedGroups.map((g) => (
              <div key={g.subject}>
                <span className="font-medium">{g.subject}</span>
                {g.gsPaper ? ` · ${g.gsPaper}` : ""}
                <ul className="mt-0.5 ml-3 list-disc opacity-80">
                  {g.chapters.map((ch) => (
                    <li key={ch.slug || ch.title}>
                      {ch.title}
                      {" — "}
                      {ch.expectedTopicCount || ch.topicCount || "?"} topics
                      {ch.status === "synced" ? " · synced" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div
          className={`rounded-xl border p-3 space-y-2 ${
            isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div
            className={`text-xs font-medium flex items-center gap-1.5 ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Chunking (words)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Min
              </span>
              <input
                type="number"
                min={50}
                max={5000}
                value={chunkMin}
                onChange={(e) => setChunkMin(Number(e.target.value))}
                className={`w-full rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              />
            </label>
            <label className="space-y-1">
              <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Max
              </span>
              <input
                type="number"
                min={50}
                max={5000}
                value={chunkMax}
                onChange={(e) => setChunkMax(Number(e.target.value))}
                className={`w-full rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              />
            </label>
            <label className="space-y-1">
              <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Overlap
              </span>
              <input
                type="number"
                min={0}
                max={1000}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className={`w-full rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              />
            </label>
          </div>
          <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Default {DEFAULT_CHUNKING.minWords}–{DEFAULT_CHUNKING.maxWords} words,{" "}
            {DEFAULT_CHUNKING.overlapWords} overlap. Applied when adding or updating content.
          </p>
        </div>

        {websiteStatus && (websiteStatus.running || websiteStatus.total > 0) && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm ${
              isDark
                ? "border-slate-700 bg-slate-900/60 text-slate-300"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 font-medium text-xs">
              <Globe className="w-3.5 h-3.5" />
              Sync status
              {websiteStatus.running ? (
                <span className="text-amber-600">· running</span>
              ) : (
                <span className="text-emerald-600">· idle</span>
              )}
              {websiteStatus.force ? (
                <span className="text-sky-600">· update mode</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs opacity-80">
              {websiteStatus.done}/{websiteStatus.total} chapter pages
              {websiteStatus.topicsTotal
                ? ` · topics ${websiteStatus.topicsDone ?? 0}/${websiteStatus.topicsTotal}`
                : ""}
              {websiteStatus.skipped ? ` · ${websiteStatus.skipped} skipped` : ""}
              {websiteStatus.failed ? ` · ${websiteStatus.failed} failed` : ""}
              {websiteStatus.subjects?.length
                ? ` · subjects: ${websiteStatus.subjects.join(", ")}`
                : ""}
            </p>
            {websiteStatus.currentTopic ? (
              <p className="mt-1 text-xs opacity-90">
                Now: {websiteStatus.currentTopic.subject} /{" "}
                {websiteStatus.currentTopic.chapter} →{" "}
                {websiteStatus.currentTopic.title}
                {websiteStatus.currentTopic.index && websiteStatus.currentTopic.total
                  ? ` (${websiteStatus.currentTopic.index}/${websiteStatus.currentTopic.total})`
                  : ""}
              </p>
            ) : websiteStatus.current ? (
              <p className="mt-1 text-xs opacity-80">
                Now: {websiteStatus.current.subject} / {websiteStatus.current.title}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          ["Embeddings", stats?.total],
          ["Completed", stats?.completed],
          ["Synced", stats?.synced],
          ["Generating", stats?.generating],
          ["Failed", stats?.failed],
          ["Pending", stats?.pending],
          ["Queued", stats?.queued],
        ].map(([label, value]) => (
          <motion.div
            key={String(label)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-3 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`text-[11px] uppercase tracking-wide ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {label}
            </div>
            <div
              className={`text-2xl font-semibold mt-1 ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {loading && value == null ? "…" : value ?? 0}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
              isDark ? "text-slate-200" : "text-slate-800"
            }`}
          >
            <Database className="w-4 h-4" /> Qdrant
          </h3>
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {data?.qdrant?.ok ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Online · {data.qdrant.collection} · {data.qdrant.pointsCount ?? "—"} points
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {data?.qdrant?.message || "Not connected"}
              </span>
            )}
          </div>
          <div className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Queue mode: {data?.queueMode || "—"}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-2 ${
              isDark ? "text-slate-200" : "text-slate-800"
            }`}
          >
            Embedding provider
          </h3>
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {data?.embedding?.configured ? (
              <>
                {data.embedding.provider} · {data.embedding.model} ·{" "}
                {data.embedding.dimension}-dim
              </>
            ) : (
              "Not configured"
            )}
          </div>
          <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Hybrid search also includes{" "}
            <a
              href="https://notes.mentorsdaily.com/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              notes.mentorsdaily.com
            </a>{" "}
            after website sync.
          </p>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
        }`}
      >
        <h3
          className={`text-sm font-semibold flex items-center gap-2 ${
            isDark ? "text-slate-200" : "text-slate-800"
          }`}
        >
          <Search className="w-4 h-4" /> Hybrid search playground
        </h3>
        <div className="flex gap-2">
          <input
            className={`flex-1 rounded-xl border px-3 py-2 text-sm ${inputCls}`}
            placeholder="e.g. monsoon El Nino ITCZ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <Button onClick={onSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        {concepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setQuery(c)}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  isDark ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2 ${
                isDark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                  {r.subject || "—"} · {r.topic || "—"} · p{r.page ?? "—"}
                  {r.source === "notes.mentorsdaily.com" ||
                  String(r.document?.url || "").includes("notes.mentorsdaily")
                    ? " · 🌐 website"
                    : ""}
                </span>
                <span className="font-medium text-violet-600">
                  {(r.score || 0).toFixed(3)}
                </span>
              </div>
              <p className={`text-sm line-clamp-3 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {r.chunk}
              </p>
              {r.document?.title && (
                <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {r.document.title}
                  {r.source ? ` · ${r.source}` : ""}
                </div>
              )}
            </div>
          ))}
          {!results.length && !searching && (
            <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Process a PDF or sync website notes, then search here.
            </p>
          )}
        </div>
      </div>

      {!!data?.failed?.length && (
        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}
          >
            Failed embeddings
          </h3>
          <ul className={`text-xs space-y-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {data.failed.map((f) => (
              <li key={String(f._id)}>
                chunk {String(f.chunkId)} — {String(f.errorMessage || "error")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default IntelligenceDashboardPage;
