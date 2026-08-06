import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  History,
  Trophy,
  Crosshair,
  Clock3,
  CheckCircle2,
  Play,
} from "lucide-react";
import { Pagination } from "../components/ui/pagination";
import { assignedPracticeAPI } from "../services/api";
import {
  TestCard,
  TestPageHeader,
  TestFilterBar,
  TestEmptyState,
  TestSkeleton,
  TestStatCard,
  AISummaryCard,
  type TestCardStatus,
} from "../components/tests";

interface AssignedPracticeItem {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  difficulty: string;
  createdAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

const ITEMS_PER_PAGE = 8;

function formatAssignedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cardStatus(t: AssignedPracticeItem): TestCardStatus {
  if (t.attempted && t.attempt?.isSubmitted) return "done";
  if (t.attempted && t.attempt && !t.attempt.isSubmitted) return "in_progress";
  return "not_started";
}

export const PracticeTestPage: React.FC = () => {
  const navigate = useNavigate();

  const [assignedTests, setAssignedTests] = useState<AssignedPracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusChip, setStatusChip] = useState("all");
  const [sortChip, setSortChip] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadAssignedTests();
  }, []);

  const loadAssignedTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignedPracticeAPI.listMine();
      if (res.data.success) setAssignedTests(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const set = new Set(
      assignedTests.map((t) => String(t.subject || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assignedTests]);

  const stats = useMemo(() => {
    const done = assignedTests.filter((t) => t.attempted && t.attempt?.isSubmitted);
    const inProgress = assignedTests.filter(
      (t) => t.attempted && t.attempt && !t.attempt.isSubmitted
    );
    const scored = done.filter((t) => t.attempt?.score != null);
    const avg =
      scored.length > 0
        ? scored.reduce((s, t) => s + (t.attempt?.score || 0), 0) / scored.length
        : null;
    const mins = assignedTests.reduce((s, t) => s + (t.durationMinutes || 0), 0);
    return {
      upcoming: assignedTests.length - done.length - inProgress.length,
      resume: inProgress.length,
      completed: done.length,
      avgScore: avg,
      timeSpentLabel: mins > 0 ? `${mins}m` : "—",
    };
  }, [assignedTests]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subject = subjectFilter.trim().toLowerCase();
    let list = assignedTests.filter((t) => {
      if (subject && t.subject.toLowerCase() !== subject) return false;
      const st = cardStatus(t);
      if (statusChip === "attempted" && st !== "done" && st !== "in_progress") return false;
      if (statusChip === "not_attempted" && st !== "not_started") return false;
      if (statusChip === "in_progress" && st !== "in_progress") return false;
      if (!q) return true;
      return (
        (t.title || "").toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.difficulty && t.difficulty.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortChip === "oldest" ? da - db : db - da;
    });
    return list;
  }, [assignedTests, searchQuery, subjectFilter, statusChip, sortChip]);

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

  const handleStart = async (id: string) => {
    setError(null);
    setStartingId(id);
    try {
      const res = await assignedPracticeAPI.startAttempt(id);
      if (res.data.success && res.data.data?.testId) {
        navigate(`/test/${res.data.data.testId}`);
        return;
      }
      setError(res.data.message || "Could not start test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Could not start test");
    } finally {
      setStartingId(null);
    }
  };

  const resumeItem = assignedTests.find(
    (t) => t.attempted && t.attempt && !t.attempt.isSubmitted && t.attempt.testId
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() || subjectFilter.trim() || statusChip !== "all"
  );

  const aiMessage =
    stats.resume > 0
      ? `You have ${stats.resume} modular test${stats.resume === 1 ? "" : "s"} in progress. Resume now to protect your attempt streak.`
      : stats.completed > 0
        ? `You've completed ${stats.completed} modular test${stats.completed === 1 ? "" : "s"}. Keep practicing weak topics from your results.`
        : "Start your first assigned modular test. Focus on accuracy before speed.";

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))] px-3 md:space-y-6 md:px-4">
      <TestPageHeader
        title="Modular Test"
        subtitle="Admin-assigned topic practice — start, resume, and review"
        icon={Target}
        accent="blue"
        action={
          <button
            type="button"
            onClick={() => navigate("/practice-test/history")}
            className="app-chrome-btn inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-[13px] font-bold text-white shadow-md shadow-blue-600/20 active:scale-95"
          >
            <History className="h-4 w-4" />
            View History
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <TestStatCard label="Upcoming" value={String(stats.upcoming)} icon={Play} tone="bg-sky-50 text-sky-600" />
        <TestStatCard label="Resume" value={String(stats.resume)} icon={Clock3} tone="bg-amber-50 text-amber-600" />
        <TestStatCard label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
        <TestStatCard
          label="Avg Score"
          value={stats.avgScore == null ? "—" : stats.avgScore.toFixed(1)}
          icon={Trophy}
          tone="bg-violet-50 text-violet-600"
        />
        <TestStatCard
          label="Scheduled"
          value={stats.timeSpentLabel}
          hint="Total duration"
          icon={Crosshair}
          tone="bg-blue-50 text-blue-600"
        />
      </div>

      <AISummaryCard
        message={aiMessage}
        cta={resumeItem ? "Resume Test" : undefined}
        onAction={
          resumeItem?.attempt?.testId
            ? () => navigate(`/test/${resumeItem.attempt!.testId}`)
            : undefined
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
          {error}
        </div>
      )}

      <TestFilterBar
        search={searchQuery}
        onSearch={setSearchQuery}
        placeholder="Search by title, topic, or difficulty…"
        subject={subjectFilter}
        subjects={subjects}
        onSubject={setSubjectFilter}
        chips={[
          { id: "all", label: "All" },
          { id: "not_attempted", label: "Not attempted" },
          { id: "in_progress", label: "In progress" },
          { id: "attempted", label: "Attempted" },
        ]}
        activeChip={statusChip}
        onChipChange={setStatusChip}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Sort">
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
          icon={Target}
          title={hasActiveFilters ? "No tests found" : "No practice tests assigned yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters"
              : "When your admin assigns a topic practice test, it will appear here."
          }
        />
      ) : (
        <>
          <p className="px-0.5 text-sm font-medium text-slate-500">
            {filtered.length} test{filtered.length === 1 ? "" : "s"}
            {hasActiveFilters ? " found" : ""}
          </p>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((t) => {
              const status = cardStatus(t);
              return (
                <TestCard
                  key={t._id}
                  title={t.title || `${t.subject} — ${t.topic}`}
                  subject={t.subject}
                  difficulty={t.difficulty}
                  questions={t.totalQuestions}
                  durationMinutes={t.durationMinutes}
                  marks={t.totalMarks}
                  meta={`Assigned ${formatAssignedDate(t.createdAt)}`}
                  status={status}
                  accent="blue"
                  scoreLabel={
                    status === "done" && t.attempt?.score != null
                      ? `Score: ${t.attempt.score}`
                      : undefined
                  }
                  starting={startingId === t._id}
                  onStart={status === "not_started" ? () => void handleStart(t._id) : undefined}
                  onResume={
                    status === "in_progress" && t.attempt?.testId
                      ? () => navigate(`/test/${t.attempt!.testId}`)
                      : undefined
                  }
                  onReview={
                    status === "done" && t.attempt?.testId
                      ? () => navigate(`/result/${t.attempt!.testId}`)
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

export default PracticeTestPage;
