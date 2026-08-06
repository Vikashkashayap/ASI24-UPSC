import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  Flag,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { ConfirmationDialog } from "../components/ui/dialog";
import { ExamQuestionBody, ExamOptionRow, examPaletteCols, getQuestionOptionKeys } from "../components/exam/ExamQuestionBody";
import { ExamLanguageToggle } from "../components/exam/ExamLanguageToggle";
import { UpscExamPaperShell } from "../components/exam/UpscExamPaperShell";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { useClientSideHindiQuestions } from "../hooks/useClientSideHindiQuestions";
import { testAPI, syllabusTargetsAPI } from "../services/api";
import {
  ExamTimer,
  QuestionPalette,
  BottomSheetPalette,
  type PaletteStatus,
} from "../components/tests";

interface Question {
  _id: string;
  question: string;
  question_en?: string;
  question_hi?: string;
  options: { A: string; B: string; C: string; D: string };
  options_en?: { A: string; B: string; C: string; D: string };
  options_hi?: { A: string; B: string; C: string; D: string };
  userAnswer?: string | null;
  questionType?: string;
  tableData?: { headers: string[]; rows: string[][] } | null;
  matchColumns?: { columnA: string[]; columnB: string[] } | null;
  matchColumns_hi?: { columnA: string[]; columnB: string[] } | null;
  assertionReason?: { assertion: string; reason: string } | null;
}

interface TestData {
  _id: string;
  subject: string;
  examType?: "GS" | "CSAT";
  topic: string;
  difficulty?: string;
  totalQuestions: number;
  durationMinutes?: number;
  totalMarks?: number;
  questions: Question[];
  isSubmitted: boolean;
}

/** 50Q → 60 min; 20Q → 24 min (proportional). */
function resolveExamDurationMinutes(test: { durationMinutes?: number; totalQuestions?: number } | null): number {
  if (!test) return 60;
  if (test.durationMinutes != null && Number(test.durationMinutes) > 0) {
    return Number(test.durationMinutes);
  }
  const n = Number(test.totalQuestions) || 20;
  return Math.max(15, Math.round((n * 60) / 50));
}

const TestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const HANDOFF_KEY = id ? `moduleHandoff:${id}` : "";
  const stateHandoff = (location.state || {}) as {
    fromModuleTarget?: boolean;
    fromModuleFinal?: boolean;
    targetId?: string;
    chapter?: string;
    nextChapter?: string | null;
    moduleId?: string;
  };
  // Persist handoff so refresh / result navigation still unlocks module
  if (HANDOFF_KEY && (stateHandoff.fromModuleFinal || stateHandoff.fromModuleTarget)) {
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(stateHandoff));
    } catch {
      /* ignore */
    }
  }
  let storedHandoff: typeof stateHandoff = {};
  if (HANDOFF_KEY) {
    try {
      storedHandoff = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || "{}") || {};
    } catch {
      storedHandoff = {};
    }
  }
  const moduleHandoff = {
    ...storedHandoff,
    ...stateHandoff,
  };
  const { lang: examLang, setLang: setExamLang } = useExamLanguage();
  const [test, setTest] = useState<TestData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { questions: displayQuestions } = useClientSideHindiQuestions(
    test?.questions || [],
    examLang,
    currentIndex
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const questionStartTimeRef = useRef(Date.now());
  const autoSubmitFiredRef = useRef(false);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    if (id) loadTest();
    autoSubmitFiredRef.current = false;
    setTimeElapsed(0);
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (test) questionStartTimeRef.current = Date.now();
  }, [test, currentIndex]);

  useEffect(() => {
    setVisitedIndices((prev) => new Set(prev).add(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const loadTest = async () => {
    try {
      setIsLoading(true);
      const response = await testAPI.getTest(id!);
      if (response.data.success) {
        const testData = response.data.data;
        if (testData.isSubmitted) {
          navigate(`/result/${id}`);
          return;
        }
        setTest(testData);
        const initial: Record<string, string> = {};
        testData.questions.forEach((q: Question) => {
          if (q.userAnswer) initial[q._id] = q.userAnswer;
        });
        setAnswers(initial);
      } else {
        setError("Failed to load test");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load test");
    } finally {
      setIsLoading(false);
    }
  };

  const recordTimeForCurrentQuestion = () => {
    if (!test) return;
    const q = test.questions[currentIndex];
    if (!q) return;
    const elapsed = (Date.now() - questionStartTimeRef.current) / 1000;
    setQuestionTimeSpent((prev) => ({ ...prev, [q._id]: (prev[q._id] || 0) + elapsed }));
  };

  const goToQuestion = (index: number) => {
    if (!test || index < 0 || index >= test.questions.length) return;
    recordTimeForCurrentQuestion();
    setCurrentIndex(index);
    setPaletteOpen(false);
  };

  const handleAnswerSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      if (prev[questionId] === option) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: option };
    });
  };

  const toggleMarkReview = () => {
    if (!test) return;
    const qid = test.questions[currentIndex]._id;
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const handlePrevious = () => goToQuestion(currentIndex - 1);

  const handleSaveAndNext = () => {
    if (test && currentIndex < test.questions.length - 1) goToQuestion(currentIndex + 1);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  const handleConfirmSubmit = async () => {
    if (!test || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setShowSubmitDialog(false);
    setIsSubmitting(true);
    setError(null);
    const currentQ = test.questions[currentIndex];
    const timeForCurrent = currentQ ? (Date.now() - questionStartTimeRef.current) / 1000 : 0;
    const finalTimeSpent = { ...questionTimeSpent };
    if (currentQ) {
      finalTimeSpent[currentQ._id] = (finalTimeSpent[currentQ._id] || 0) + timeForCurrent;
    }
    try {
      const answersObject: Record<string, string> = {};
      test.questions.forEach((q) => {
        if (answers[q._id]) answersObject[q._id] = answers[q._id];
      });
      const response = await testAPI.submitTest(id!, {
        answers: answersObject,
        questionTimeSpent: finalTimeSpent,
      });
      if (response.data.success) {
        // Chapter practice: unlock next chapter
        if (moduleHandoff.fromModuleTarget && moduleHandoff.targetId && moduleHandoff.chapter) {
          try {
            console.log("[ModuleTargets] submit unlock payload →", {
              targetId: moduleHandoff.targetId,
              chapter: moduleHandoff.chapter,
              nextChapter: moduleHandoff.nextChapter || null,
            });
            await syllabusTargetsAPI.toggleChapterComplete(
              moduleHandoff.targetId,
              moduleHandoff.chapter,
              true
            );
          } catch (unlockErr) {
            console.warn("[ModuleTargets] chapter unlock after submit failed", unlockErr);
          }
        }
        // Module Final: mark module complete → unlock next module
        if (moduleHandoff.fromModuleFinal && moduleHandoff.targetId) {
          try {
            console.log("[ModuleTargets] module final submit → unlock next module", {
              targetId: moduleHandoff.targetId,
            });
            await syllabusTargetsAPI.toggleComplete(moduleHandoff.targetId, true);
          } catch (unlockErr) {
            console.warn("[ModuleTargets] module unlock after final failed", unlockErr);
          }
        }
        if (HANDOFF_KEY) {
          try {
            sessionStorage.removeItem(HANDOFF_KEY);
          } catch {
            /* ignore */
          }
        }
        navigate(`/result/${id}`);
      } else setError(response.data.message || "Failed to submit test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to submit test");
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  const attemptedCount = Object.keys(answers).length;
  const totalMarks = test?.totalMarks ?? (test ? test.totalQuestions * 2 : 0);
  const durationSec = resolveExamDurationMinutes(test) * 60;
  const timeRemaining = Math.max(0, durationSec - timeElapsed);

  // Time over → auto-submit (no manual submit needed)
  useEffect(() => {
    if (!test || isLoading || isSubmitting) return;
    if (timeRemaining > 0) return;
    if (autoSubmitFiredRef.current) return;
    autoSubmitFiredRef.current = true;
    void handleConfirmSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when timer hits 0
  }, [timeRemaining, test, isLoading, isSubmitting]);

  const paletteStats = useMemo(() => {
    if (!test) return { done: 0, marked: 0, left: 0 };
    const done = test.questions.filter((q) => answers[q._id]).length;
    const marked = test.questions.filter((q) => markedIds.has(q._id)).length;
    return { done, marked, left: test.totalQuestions - done };
  }, [test, answers, markedIds]);

  const getPaletteStatus = (index: number): PaletteStatus => {
    if (!test) return "not-visited";
    const q = test.questions[index];
    const answered = Boolean(answers[q._id]);
    const marked = markedIds.has(q._id);
    if (index === currentIndex) return "current";
    if (answered && marked) return "answered-marked";
    if (answered) return "answered";
    if (marked) return "marked";
    return visitedIndices.has(index) ? "not-visited" : "not-visited";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] bg-slate-100 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-800 mb-4">{error}</p>
          <Button onClick={() => navigate("/prelims-test")}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  const currentQuestion = displayQuestions[currentIndex] || test.questions[currentIndex];
  const optionKeys = getQuestionOptionKeys(currentQuestion);
  const isMarked = markedIds.has(currentQuestion._id);
  const paletteColsDesktop = examPaletteCols(test.totalQuestions, false);
  const paletteColsMobile = examPaletteCols(test.totalQuestions, true);
  const paletteBtnH =
    test.totalQuestions > 75 ? "h-[22px] sm:h-[24px]" : "h-[24px] sm:h-[26px]";

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* ── Exam App Bar ── */}
      <header className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        {/* Row 1: progress · timer · actions */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-12 sm:h-14 max-w-[1600px] mx-auto w-full">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate leading-none mb-0.5 hidden sm:block">
              {test.topic}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums tracking-tight">
                Q {currentIndex + 1}
              </span>
              <span className="text-xs font-medium text-slate-400 tabular-nums">
                / {test.totalQuestions}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums ml-1">
                · {attemptedCount} done
              </span>
            </div>
          </div>

          <ExamTimer remainingSeconds={timeRemaining} className="shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="app-chrome-btn hidden md:flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitDialog(true)}
              className="app-chrome-btn hidden sm:inline-flex h-9 px-3 items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="app-chrome-btn xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
              aria-label="Question palette"
              title="Palette"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: marking scheme + language */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pb-2.5 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-hide">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold whitespace-nowrap">
              +2
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold whitespace-nowrap">
              −0.66
            </span>
            {test.difficulty ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold whitespace-nowrap">
                {test.difficulty}
              </span>
            ) : null}
          </div>
          <ExamLanguageToggle lang={examLang} onChange={setExamLang} compact className="shrink-0" />
        </div>

        {/* Progress strip */}
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / test.totalQuestions) * 100}%` }}
          />
        </div>
      </header>

      {/* Main + palette */}
      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Question area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-3 md:px-4 pt-2 sm:pt-3 pb-2">
            <UpscExamPaperShell>
              <div className="px-3 sm:px-5 py-3 sm:py-4">
                <ExamQuestionBody question={currentQuestion} compact lang={examLang} />
              </div>

              <div className="flex-shrink-0 mx-3 sm:mx-5 border-t border-slate-100" />

              <div className="flex-shrink-0 flex flex-col gap-2 sm:gap-2.5 px-3 sm:px-5 py-3 sm:py-4 pb-4 sm:pb-5">
                {optionKeys.map((key) => (
                  <ExamOptionRow
                    key={key}
                    optionKey={key}
                    question={currentQuestion}
                    selected={answers[currentQuestion._id] === key}
                    onSelect={() => handleAnswerSelect(currentQuestion._id, key)}
                    compact
                    lang={examLang}
                  />
                ))}
              </div>
            </UpscExamPaperShell>
          </div>

          {/* Fixed bottom action bar */}
          <div className="flex-shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(15,23,42,0.06)] px-2 sm:px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)]">
            <div className="grid grid-cols-[1fr_auto_1.4fr] gap-2 max-w-[1600px] mx-auto">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="app-chrome-btn inline-flex items-center justify-center gap-1 h-11 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-35 active:scale-[0.98] transition-transform"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="hidden min-[380px]:inline">Prev</span>
              </button>
              <button
                type="button"
                onClick={toggleMarkReview}
                className={`app-chrome-btn inline-flex items-center justify-center gap-1.5 h-11 px-3 sm:px-4 rounded-2xl border text-xs font-semibold active:scale-[0.98] transition-transform ${
                  isMarked
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 shrink-0 ${isMarked ? "fill-amber-500 text-amber-500" : ""}`} />
                <span>Mark</span>
              </button>
              {currentIndex < test.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="app-chrome-btn inline-flex items-center justify-center gap-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-[0.98] transition-transform"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isSubmitting}
                  className="app-chrome-btn inline-flex items-center justify-center gap-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-transform"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question palette — desktop sidebar */}
        <aside className="hidden xl:flex w-[260px] 2xl:w-[280px] flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white">
          <QuestionPalette
            total={test.totalQuestions}
            cols={paletteColsDesktop}
            btnH={paletteBtnH}
            getStatus={getPaletteStatus}
            onSelect={goToQuestion}
            stats={paletteStats}
            onSubmit={() => setShowSubmitDialog(true)}
            submitting={isSubmitting}
          />
        </aside>

        <BottomSheetPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          title="Question Palette"
          subtitle={`${paletteStats.done} done · ${paletteStats.marked} marked · ${paletteStats.left} left`}
        >
          <QuestionPalette
            total={test.totalQuestions}
            cols={paletteColsMobile}
            btnH={paletteBtnH}
            getStatus={getPaletteStatus}
            onSelect={goToQuestion}
            stats={paletteStats}
            onSubmit={() => setShowSubmitDialog(true)}
            submitting={isSubmitting}
            compact
          />
        </BottomSheetPalette>
      </div>

      {error && (
        <div className="mx-3 mb-2 flex flex-shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? `No answers yet · ${paletteStats.marked} marked · ${Math.floor(timeRemaining / 60)}m left. Submit anyway?`
            : `Answered ${attemptedCount}/${test.totalQuestions} · Marked ${paletteStats.marked} · ${Math.floor(timeRemaining / 60)}m remaining. You cannot change answers after submit.`
        }
        confirmText="Submit Test"
        cancelText="Resume"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitDialog(false)}
        loading={isSubmitting}
      />
    </div>
  );
};

export default TestPage;
