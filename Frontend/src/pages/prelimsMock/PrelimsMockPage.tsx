import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Trophy,
  Play,
  CheckCircle2,
  Clock3,
  Crosshair,
} from "lucide-react";
import { Pagination } from "../../components/ui/pagination";
import { prelimsMockAPI } from "../../services/api";
import {
  TestCard,
  TestPageHeader,
  TestFilterBar,
  TestEmptyState,
  TestSkeleton,
  TestStatCard,
  AISummaryCard,
  LeaderboardCard,
  type TestCardStatus,
} from "../../components/tests";

interface LiveMock {
  _id: string;
  subject: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  negativeMark: number;
  liveAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

const ITEMS_PER_PAGE = 8;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cardStatus(m: LiveMock): TestCardStatus {
  if (m.attempted && m.attempt?.isSubmitted) return "done";
  if (m.attempted && m.attempt && !m.attempt.isSubmitted) return "in_progress";
  return "live";
}

export const PrelimsMockPage: React.FC = () => {
  const navigate = useNavigate();
  const [mocks, setMocks] = useState<LiveMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusChip, setStatusChip] = useState("all");
  const [sortChip, setSortChip] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await prelimsMockAPI.listLive();
      if (res.data.success) setMocks(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load mocks");
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(mocks.map((m) => String(m.subject || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mocks]);

  const stats = useMemo(() => {
    const done = mocks.filter((m) => m.attempted && m.attempt?.isSubmitted);
    const inProgress = mocks.filter((m) => m.attempted && m.attempt && !m.attempt.isSubmitted);
    const scored = done.filter((m) => m.attempt?.score != null);
    const avg =
      scored.length > 0
        ? scored.reduce((s, m) => s + (m.attempt?.score || 0), 0) / scored.length
        : null;
    return {
      live: mocks.length - done.length - inProgress.length,
      resume: inProgress.length,
      completed: done.length,
      avgScore: avg,
    };
  }, [mocks]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subject = subjectFilter.trim().toLowerCase();
    let list = mocks.filter((m) => {
      if (subject && m.subject.toLowerCase() !== subject) return false;
      const st = cardStatus(m);
      if (statusChip === "attempted" && st !== "done" && st !== "in_progress") return false;
      if (statusChip === "not_attempted" && st !== "live") return false;
      if (statusChip === "in_progress" && st !== "in_progress") return false;
      if (!q) return true;
      return (m.title || "").toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.liveAt).getTime();
      const db = new Date(b.liveAt).getTime();
      return sortChip === "oldest" ? da - db : db - da;
    });
    return list;
  }, [mocks, searchQuery, subjectFilter, statusChip, sortChip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subjectFilter, statusChip, sortChip]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleStart = async (mockId: string) => {
    setError(null);
    setStartingId(mockId);
    try {
      const res = await prelimsMockAPI.startAttempt(mockId);
      if (res.data.success && res.data.data?.testId) {
        navigate(`/test/${res.data.data.testId}`);
        return;
      }
      setError(res.data.message || "Could not start test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; code?: string } } };
      const code = ax.response?.data?.code;
      setError(ax.response?.data?.message || "Could not start test");
      if (code === "MOCK_NOT_LIVE") {
        void load();
      }
    } finally {
      setStartingId(null);
    }
  };

  const resumeItem = mocks.find(
    (m) => m.attempted && m.attempt && !m.attempt.isSubmitted && m.attempt.testId
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() || subjectFilter.trim() || statusChip !== "all"
  );

  const topScores = useMemo(() => {
    return mocks
      .filter((m) => m.attempted && m.attempt?.isSubmitted && m.attempt.score != null)
      .sort((a, b) => (b.attempt!.score || 0) - (a.attempt!.score || 0))
      .slice(0, 5)
      .map((m, i) => ({
        rank: i + 1,
        name: m.title || m.subject,
        score: String(m.attempt!.score),
        you: true,
      }));
  }, [mocks]);

  const aiMessage =
    stats.resume > 0
      ? `You have a Prelims mock in progress. Finish it before the timer pressure builds.`
      : stats.live > 0
        ? `${stats.live} live mock${stats.live === 1 ? "" : "s"} available. Sit in exam conditions — 100Q · 120 min.`
        : "No new live mocks right now. Review completed papers and revise weak GS areas.";

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))] px-3 md:space-y-6 md:px-4">
      <TestPageHeader
        title="Prelims Test Series"
        subtitle="Full-length GS Paper 1 mocks · 100 Q · 200 marks · 120 min"
        icon={BookOpen}
        accent="amber"
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <TestStatCard label="Live" value={String(stats.live)} icon={Play} tone="bg-emerald-50 text-emerald-600" />
        <TestStatCard label="Resume" value={String(stats.resume)} icon={Clock3} tone="bg-amber-50 text-amber-600" />
        <TestStatCard label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="bg-blue-50 text-blue-600" />
        <TestStatCard
          label="Avg Score"
          value={stats.avgScore == null ? "—" : stats.avgScore.toFixed(1)}
          icon={Trophy}
          tone="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AISummaryCard
            message={aiMessage}
            cta={resumeItem ? "Resume Mock" : stats.live > 0 ? "Browse Live" : undefined}
            onAction={
              resumeItem?.attempt?.testId
                ? () => navigate(`/test/${resumeItem.attempt!.testId}`)
                : undefined
            }
          />
        </div>
        {topScores.length > 0 ? (
          <LeaderboardCard rows={topScores} />
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-slate-800">Your mock timeline</p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Completed papers will appear here as your personal leaderboard.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
              <Crosshair className="h-3.5 w-3.5" /> Mock · Revision · PYQ ready
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
          {error}
        </div>
      )}

      <TestFilterBar
        search={searchQuery}
        onSearch={setSearchQuery}
        placeholder="Search by title or subject…"
        subject={subjectFilter}
        subjects={subjects}
        onSubject={setSubjectFilter}
        accentFocus="focus:border-amber-500 focus:ring-amber-100"
        chips={[
          { id: "all", label: "All" },
          { id: "not_attempted", label: "Live" },
          { id: "in_progress", label: "In progress" },
          { id: "attempted", label: "Completed" },
        ]}
        activeChip={statusChip}
        onChipChange={setStatusChip}
      />
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Sort">
        {(
          [
            ["newest", "Newest"],
            ["oldest", "Oldest"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sortChip === id}
            onClick={() => setSortChip(id)}
            className={`app-chrome-btn h-10 shrink-0 rounded-full px-4 text-[12px] font-bold ${
              sortChip === id
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <TestSkeleton />
      ) : filtered.length === 0 ? (
        <TestEmptyState
          icon={BookOpen}
          title={hasActiveFilters ? "No mocks found" : "No live mocks right now"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Check back after your admin schedules one."
          }
        />
      ) : (
        <>
          <p className="px-0.5 text-sm font-medium text-slate-500">
            {filtered.length} live test{filtered.length === 1 ? "" : "s"}
            {hasActiveFilters ? " found" : ""}
          </p>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((m) => {
              const status = cardStatus(m);
              return (
                <TestCard
                  key={m._id}
                  title={m.title || m.subject}
                  subject={m.subject}
                  questions={m.totalQuestions}
                  durationMinutes={m.durationMinutes}
                  marks={m.totalMarks}
                  meta={`Live from ${formatDate(m.liveAt)} · −${m.negativeMark}`}
                  status={status}
                  accent="amber"
                  scoreLabel={
                    status === "done" && m.attempt?.score != null
                      ? `Score: ${m.attempt.score}`
                      : undefined
                  }
                  starting={startingId === m._id}
                  onStart={status === "live" ? () => void handleStart(m._id) : undefined}
                  onResume={
                    status === "in_progress" && m.attempt?.testId
                      ? () => navigate(`/test/${m.attempt!.testId}`)
                      : undefined
                  }
                  onReview={
                    status === "done" && m.attempt?.testId
                      ? () => navigate(`/result/${m.attempt!.testId}`)
                      : undefined
                  }
                />
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};
