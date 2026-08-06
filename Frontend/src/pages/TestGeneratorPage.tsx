import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, BookOpen, Target, TrendingUp, History, Lock, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { SubjectToggle } from "../components/SubjectToggle";
import { useTheme } from "../hooks/useTheme";
import { testAPI, type PrelimsDailyStatus } from "../services/api";
import {
  SUBJECTS,
  GS_SUBJECTS,
  CSAT_CATEGORIES,
  type ExamType,
} from "../constants/testGenerator";
import { sanitizePlannerTopic } from "../components/advancedStudyPlanner/plannerUtils";
import {
  TestPageHeader,
  TestStatCard,
  AISummaryCard,
} from "../components/tests";

function matchSubjectFromUrl(raw: string): string {
  const decoded = decodeURIComponent(raw).trim();
  const hit = SUBJECTS.find((s) => s.toLowerCase() === decoded.toLowerCase());
  return hit || decoded;
}

function formatUnlockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "midnight (IST) tomorrow";
  }
}

const TestGeneratorPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateInFlightRef = useRef(false);

  const [subjects, setSubjects] = useState<string[]>(["Polity"]);
  const [topic, setTopic] = useState("");
  const [fromPlanner, setFromPlanner] = useState(false);
  const [difficulty, setDifficulty] = useState("Hard");
  const [questionCount, setQuestionCount] = useState(10);
  const [dailyStatus, setDailyStatus] = useState<PrelimsDailyStatus | null>(null);
  const [dailyStatusLoading, setDailyStatusLoading] = useState(true);

  useEffect(() => {
    const sub = searchParams.get("subject");
    const top = searchParams.get("topic");
    const pyq = searchParams.get("pyq");
    const from = searchParams.get("from");

    if (from === "planner" || sub || top) setFromPlanner(true);

    if (sub) {
      const matched = matchSubjectFromUrl(sub);
      if (SUBJECTS.includes(matched as (typeof SUBJECTS)[number])) {
        setSubjects([matched]);
      } else {
        setSubjects([sub]);
      }
    }

    if (top) {
      const cleaned = sanitizePlannerTopic(decodeURIComponent(top), sub || "");
      setTopic(cleaned);
    }

    if (pyq === "1") setDifficulty("Hard");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDailyStatusLoading(true);
        const res = await testAPI.getPrelimsDailyStatus();
        if (!cancelled && res.data?.success) {
          setDailyStatus(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load prelims daily status:", err);
      } finally {
        if (!cancelled) setDailyStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [csatCategories, setCsatCategories] = useState<string[]>([]);
  // Current Affairs: optional month/year (future ready)
  const [currentAffairsMonth, setCurrentAffairsMonth] = useState<string>("");
  const [currentAffairsYear, setCurrentAffairsYear] = useState<string>("");

  const isDailyLocked = Boolean(dailyStatus?.locked);
  const dailyLimit = dailyStatus?.limit ?? 4;
  const usedCount = dailyStatus?.usedCount ?? 0;
  const remaining = dailyStatus?.remaining ?? dailyLimit;
  const formDisabled = isGenerating || isDailyLocked;

  const hasCsat = subjects.includes("CSAT");
  const hasGsSubject = subjects.some((s) => s !== "CSAT" && GS_SUBJECTS.includes(s as any));
  const examType: ExamType = hasCsat && !hasGsSubject ? "CSAT" : "GS";

  const csatMixedError =
    hasCsat && hasGsSubject
      ? "CSAT cannot be mixed with GS subjects."
      : null;

  const showCsatCategories = examType === "CSAT";
  const showGsOptions = examType === "GS";
  const showCurrentAffairsOptions = subjects.includes("Current Affairs");

  const canSubmit = useMemo(() => {
    if (isDailyLocked) return false;
    if (!topic.trim()) return false;
    if (csatMixedError) return false;
    if (examType === "CSAT" && csatCategories.length === 0) return false;
    if (subjects.length === 0) return false;
    return true;
  }, [isDailyLocked, topic, csatMixedError, examType, csatCategories.length, subjects.length]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generateInFlightRef.current || isGenerating || isDailyLocked) return;
    setError(null);

    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }
    if (csatMixedError) {
      setError(csatMixedError);
      return;
    }
    if (examType === "CSAT" && csatCategories.length === 0) {
      setError("Please select at least one CSAT category.");
      return;
    }
    if (subjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    generateInFlightRef.current = true;
    setIsGenerating(true);
    setError(null);

    const allowedCounts = [5, 10, 20] as const;
    const safeQuestionCount = allowedCounts.includes(questionCount as (typeof allowedCounts)[number])
      ? questionCount
      : 10;

    try {
      const response = await testAPI.generateTest({
        subjects,
        topic: topic.trim(),
        examType,
        questionCount: safeQuestionCount,
        ...(showGsOptions && { difficulty }),
        ...(examType === "CSAT" && { csatCategories }),
        ...(showCurrentAffairsOptions && (currentAffairsMonth || currentAffairsYear) && {
          currentAffairsPeriod: {
            month: currentAffairsMonth || undefined,
            year: currentAffairsYear || undefined,
          },
        }),
      });

      if (response.data.success) {
        navigate(`/test/${response.data.data._id}`);
      } else {
        setError(response.data.message || "Failed to generate test");
      }
    } catch (err: any) {
      console.error("Error generating test:", err);
      const msg = err.response?.data?.message;
      const code = err.response?.data?.code;
      if (err.response?.status === 403 && (code === "PRELIMS_DAILY_LIMIT" || err.response?.data?.data?.locked)) {
        const lockData = err.response?.data?.data as PrelimsDailyStatus | undefined;
        if (lockData) setDailyStatus(lockData);
        setError(msg || "You've used all Practice Tests for today. Try again tomorrow.");
      } else if (err.response?.status === 429) {
        setError(msg || "Test generation is already running. Please wait.");
      } else {
        setError(msg || "Failed to generate test. Please try again.");
      }
    } finally {
      generateInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:space-y-8 md:px-4 md:pb-8">
      <TestPageHeader
        title="Practice Test"
        subtitle="Generate UPSC Prelims MCQs from your Knowledge Base"
        icon={BookOpen}
        accent="amber"
        action={
          <button
            type="button"
            onClick={() => navigate("/test-history")}
            className="app-chrome-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 text-[13px] font-bold text-white shadow-md shadow-amber-600/20 active:scale-95 sm:w-auto"
          >
            <History className="h-4 w-4" />
            View History
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <TestStatCard
          label="Used today"
          value={dailyStatusLoading ? "…" : `${usedCount}/${dailyLimit}`}
          icon={Target}
          tone="bg-amber-50 text-amber-600"
        />
        <TestStatCard
          label="Remaining"
          value={dailyStatusLoading ? "…" : String(remaining)}
          icon={Sparkles}
          tone="bg-blue-50 text-blue-600"
        />
        <TestStatCard label="Mode" value={examType} icon={BookOpen} tone="bg-violet-50 text-violet-600" />
        <TestStatCard
          label="Questions"
          value={String(questionCount)}
          icon={TrendingUp}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <AISummaryCard
        message={
          isDailyLocked
            ? `Daily practice limit reached (${usedCount}/${dailyLimit}). Review today's paper or continue an unfinished attempt.`
            : fromPlanner && topic
              ? `Planner handoff ready — practice ${subjects[0] || "this subject"}: ${topic}.`
              : `Pick a subject & topic, then generate. You have ${remaining} practice run${remaining === 1 ? "" : "s"} left today.`
        }
        cta={
          isDailyLocked && dailyStatus?.todayTest?._id
            ? dailyStatus.todayTest.isSubmitted
              ? "View Result"
              : "Continue Test"
            : undefined
        }
        onAction={
          isDailyLocked && dailyStatus?.todayTest?._id
            ? () =>
                navigate(
                  dailyStatus.todayTest?.isSubmitted
                    ? `/result/${dailyStatus.todayTest!._id}`
                    : `/test/${dailyStatus.todayTest!._id}`
                )
            : undefined
        }
      />

      {fromPlanner && topic && !isDailyLocked && (
        <div
          className={`rounded-xl px-4 py-3 text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
            theme === "dark" ? "bg-blue-950/40 border-blue-500/30 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span>
            Practice from Study Planner — <strong>{subjects[0]}</strong>: <strong>{topic}</strong>
            {searchParams.get("pyq") === "1" ? " (PYQ)" : ""}
          </span>
          <span className="text-xs opacity-80">Subject & topic pre-filled · tap Generate Test</span>
        </div>
      )}

      {!dailyStatusLoading && dailyStatus && !dailyStatus.bypass && !isDailyLocked && (
        <div
          className={`rounded-xl px-4 py-3 text-sm border flex items-center justify-between gap-2 ${
            theme === "dark" ? "bg-slate-800/60 border-slate-600 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <span>
            Daily practice limit: <strong>{usedCount}/{dailyLimit}</strong> used today
          </span>
          <span className={`text-xs font-medium ${remaining === 1 ? "text-amber-600" : ""}`}>
            {remaining} left today
          </span>
        </div>
      )}

      {isDailyLocked && dailyStatus && (
        <div
          className={`rounded-xl px-4 py-4 border-2 flex flex-col sm:flex-row sm:items-center gap-3 ${
            theme === "dark"
              ? "bg-amber-950/40 border-amber-500/40 text-amber-100"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              theme === "dark" ? "bg-amber-500/20" : "bg-amber-200/60"
            }`}
          >
            <Lock className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-700"}`} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-sm md:text-base">Practice Test locked for today</p>
            <p className={`text-xs md:text-sm ${theme === "dark" ? "text-amber-200/80" : "text-amber-900/80"}`}>
              You can generate only {dailyLimit} tests per day ({usedCount}/{dailyLimit} used).
              {dailyStatus.todayTest?.topic
                ? ` Last topic: ${dailyStatus.todayTest.subject} — ${dailyStatus.todayTest.topic}.`
                : ""}{" "}
              Unlocks after {formatUnlockTime(dailyStatus.unlocksAt)}.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {dailyStatus.todayTest?._id && (
              <Button
                type="button"
                onClick={() =>
                  navigate(
                    dailyStatus.todayTest?.isSubmitted
                      ? `/result/${dailyStatus.todayTest._id}`
                      : `/test/${dailyStatus.todayTest?._id}`
                  )
                }
                className={`min-h-[40px] ${
                  theme === "dark"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                {dailyStatus.todayTest.isSubmitted ? "View Result" : "Continue Test"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/test-history")}
              className="min-h-[40px]"
            >
              View History
            </Button>
          </div>
        </div>
      )}

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl rounded-2xl ${theme === "dark"
        ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg"
        : "bg-gradient-to-br from-white to-amber-50/20 border-amber-200/50 shadow-lg"
        } ${isDailyLocked ? "opacity-90" : ""}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative z-10 pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
              {isDailyLocked ? (
                <Lock className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              ) : (
                <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className={`text-base md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                {isDailyLocked ? "Test Locked for Today" : "Test Configuration"}
              </CardTitle>
              <CardDescription className="mt-0.5 md:mt-1 text-xs md:text-sm">
                {isDailyLocked
                  ? "You can generate again after midnight (IST) tomorrow"
                  : "Questions are grounded in your Admin Knowledge Base for the selected subject & topic"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleGenerate} className="space-y-4 md:space-y-6">
            {/* Subject Selection – multi-select */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Subject
              </label>
              <SubjectToggle
                options={SUBJECTS}
                selected={subjects}
                onChange={setSubjects}
                disabled={formDisabled}
              />
            </div>

            {/* CSAT categories – shown only when examType is CSAT */}
            {showCsatCategories && (
              <div>
                <SubjectToggle
                  label="CSAT categories (select at least one)"
                  options={CSAT_CATEGORIES}
                  selected={csatCategories}
                  onChange={setCsatCategories}
                  disabled={formDisabled}
                />
              </div>
            )}

            {/* Topic Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Topic <span className="text-red-500">*</span>
                {fromPlanner && topic && (
                  <span className="ml-2 text-xs font-normal text-blue-600">(from your study plan)</span>
                )}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Fundamental Rights, Ancient History, Climate Change"
                className={`w-full px-4 py-3 md:py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation ${
                  fromPlanner && topic
                    ? theme === "dark"
                      ? "bg-blue-950/30 border-blue-500/50 text-slate-100 ring-1 ring-blue-500/30"
                      : "bg-blue-50/80 border-blue-400 text-slate-900 ring-1 ring-blue-300"
                    : theme === "dark"
                      ? "bg-slate-800 border-slate-700 text-slate-200"
                      : "border-slate-300 bg-white"
                }`}
                disabled={formDisabled}
                required
                autoFocus={fromPlanner && !!topic && !isDailyLocked}
              />
            </div>

            {/* Current Affairs: optional month/year (future ready) */}
            {showCurrentAffairsOptions && (
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <p className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Current Affairs period (optional, for future use)
                </p>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className={`block text-xs mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={currentAffairsMonth}
                      onChange={(e) => setCurrentAffairsMonth(e.target.value)}
                      placeholder="e.g. 1–12"
                      disabled={formDisabled}
                      className={`w-24 px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Year</label>
                    <input
                      type="number"
                      min={2020}
                      max={2030}
                      value={currentAffairsYear}
                      onChange={(e) => setCurrentAffairsYear(e.target.value)}
                      placeholder="e.g. 2024"
                      disabled={formDisabled}
                      className={`w-24 px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Validation error: CSAT mixed with GS */}
            {csatMixedError && !isDailyLocked && (
              <div className={`border rounded-lg p-4 flex items-start gap-3 ${theme === "dark"
                ? "bg-red-950/50 border-red-800"
                : "bg-red-50 border-red-200"
                }`}>
                <span className={`text-red-500 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>⚠</span>
                <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{csatMixedError}</p>
              </div>
            )}

            {/* Error Message */}
            {error && !csatMixedError && (
              <div className={`border rounded-lg p-4 flex items-start gap-3 ${theme === "dark"
                ? "bg-red-950/50 border-red-800"
                : "bg-red-50 border-red-200"
                }`}>
                <span className={`text-red-500 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>⚠</span>
                <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              type="submit"
              disabled={isGenerating || !canSubmit || dailyStatusLoading}
              className={`w-full px-6 py-4 md:py-4 text-base font-semibold min-h-[48px] touch-manipulation ${isGenerating || !canSubmit || dailyStatusLoading
                ? "bg-slate-400 border-slate-400 text-slate-200 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Test... This may take 30-60 seconds
                </>
              ) : isDailyLocked ? (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Locked — Available Tomorrow
                </>
              ) : dailyStatusLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking daily limit...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" />
                  {fromPlanner && topic ? `Practice MCQs — ${topic}` : "Generate Test"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Cards - hidden on small mobile for cleaner full mobile view */}
      <div className="max-sm:hidden grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"}`}>
                <BookOpen className={`w-6 h-6 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Knowledge Base
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Admin RAG sources
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100"}`}>
                <Target className={`w-6 h-6 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  UPSC Standard
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Real exam style
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-green-900/30" : "bg-green-100"}`}>
                <TrendingUp className={`w-6 h-6 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Instant Results
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Detailed feedback
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestGeneratorPage;
