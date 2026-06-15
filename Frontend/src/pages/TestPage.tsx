import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  Flag,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Send,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { ConfirmationDialog } from "../components/ui/dialog";
import { ExamQuestionBody, ExamOptionRow, examPaletteCols, getQuestionOptionKeys } from "../components/exam/ExamQuestionBody";
import { ExamLanguageToggle } from "../components/exam/ExamLanguageToggle";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { testAPI } from "../services/api";

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

type PaletteStatus = "not-visited" | "answered" | "marked" | "answered-marked" | "current";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PalettePanel({
  paletteStats,
  paletteCols,
  paletteBtnH,
  test,
  getPaletteStatus,
  paletteBtnClass,
  goToQuestion,
  onSubmit,
  isSubmitting,
  compact = false,
}: {
  paletteStats: { done: number; marked: number; left: number };
  paletteCols: number;
  paletteBtnH: string;
  test: TestData;
  getPaletteStatus: (i: number) => PaletteStatus;
  paletteBtnClass: (s: PaletteStatus) => string;
  goToQuestion: (i: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-xs">Question Palette</h2>
          <div className="flex gap-2 mt-1 text-[10px] font-medium">
            <span className="text-emerald-600">{paletteStats.done} done</span>
            <span className="text-amber-500">{paletteStats.marked} marked</span>
            <span className="text-slate-400">{paletteStats.left} left</span>
          </div>
        </div>
      )}
      {compact && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100">
          <div className="flex gap-3 text-[11px] font-medium">
            <span className="text-emerald-600">{paletteStats.done} done</span>
            <span className="text-amber-500">{paletteStats.marked} marked</span>
            <span className="text-slate-400">{paletteStats.left} left</span>
          </div>
        </div>
      )}
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-slate-300 bg-white shrink-0" /> Not visited
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" /> Answered
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-amber-400 shrink-0" /> Marked
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-violet-600 shrink-0" /> Ans+Marked
        </div>
      </div>
      <div className="flex-1 min-h-0 px-2 sm:px-3 py-2 overflow-y-auto">
        <div
          className="w-full grid gap-1"
          style={{ gridTemplateColumns: `repeat(${paletteCols}, minmax(0, 1fr))` }}
        >
          {test.questions.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToQuestion(index)}
              className={`${paletteBtnH} rounded text-[10px] sm:text-[11px] font-semibold border transition-colors ${paletteBtnClass(getPaletteStatus(index))}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 p-2 sm:p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs sm:text-sm transition-colors"
        >
          <Send className="w-4 h-4" />
          Submit Test
        </button>
      </div>
    </>
  );
}

const TestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang: examLang, setLang: setExamLang } = useExamLanguage();
  const [test, setTest] = useState<TestData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  useEffect(() => {
    if (id) loadTest();
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
    if (!test) return;
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
      if (response.data.success) navigate(`/result/${id}`);
      else setError(response.data.message || "Failed to submit test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to submit test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const attemptedCount = Object.keys(answers).length;
  const totalMarks = test?.totalMarks ?? (test ? test.totalQuestions * 2 : 0);
  const durationSec = (test?.durationMinutes ?? 60) * 60;
  const timeRemaining = Math.max(0, durationSec - timeElapsed);

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

  const paletteBtnClass = (status: PaletteStatus) => {
    switch (status) {
      case "current":
        return "border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold";
      case "answered":
        return "bg-emerald-500 text-white border-emerald-500";
      case "marked":
        return "bg-amber-400 text-white border-amber-400";
      case "answered-marked":
        return "bg-violet-600 text-white border-violet-600";
      default:
        return "bg-white text-slate-600 border-slate-200 hover:border-slate-300";
    }
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

  const currentQuestion = test.questions[currentIndex];
  const optionKeys = getQuestionOptionKeys(currentQuestion);
  const isMarked = markedIds.has(currentQuestion._id);
  const paletteColsDesktop = examPaletteCols(test.totalQuestions, false);
  const paletteColsMobile = examPaletteCols(test.totalQuestions, true);
  const paletteBtnH =
    test.totalQuestions > 75 ? "h-[22px] sm:h-[24px]" : "h-[24px] sm:h-[26px]";

  return (
    <div className="h-[100dvh] flex flex-col bg-[#eef2f7] text-slate-900 overflow-hidden">
      {/* Top exam bar */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-2 sm:px-4 py-2 shadow-sm safe-area-inset-top">
        <div className="flex items-start sm:items-center justify-between gap-2 max-w-[1600px] mx-auto w-full">
          <div className="min-w-0 flex-1">
            <h1 className="text-[11px] sm:text-sm font-bold text-slate-900 truncate leading-tight">
              {test.topic}
            </h1>
            <p className="text-[9px] sm:text-[11px] text-slate-500 leading-tight mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0">
              <span>Q {currentIndex + 1}/{test.totalQuestions}</span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-emerald-600 font-medium">+2 marks</span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-red-500 font-medium">-0.66 wrong</span>
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExamLanguageToggle lang={examLang} onChange={setExamLang} compact />
            <span className="text-[9px] sm:text-[11px] font-semibold text-slate-500 tabular-nums">
              {attemptedCount}/{test.totalQuestions}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[11px] sm:text-xs font-bold ${
                timeRemaining < 300 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {formatCountdown(timeRemaining)}
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitDialog(true)}
              className="hidden sm:inline-flex px-2.5 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-[10px] sm:text-xs font-bold"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="xl:hidden inline-flex px-2 py-1 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700"
            >
              Palette
            </button>
          </div>
        </div>
      </header>

      {/* Main + palette */}
      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Question area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-1.5 sm:p-2 md:p-3">
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs font-bold shadow-sm">
                  {currentIndex + 1}
                </span>
                <span className="font-semibold text-slate-800 text-[11px] sm:text-sm">
                  Question {currentIndex + 1}
                </span>
              </div>
              <span className="text-[9px] sm:text-[11px] font-medium text-slate-400">
                {totalMarks} total marks
              </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              {/* Question stem — scrollable container */}
              <div className="flex-shrink-0 px-2.5 sm:px-4 py-2 sm:py-3">
                <ExamQuestionBody question={currentQuestion} compact lang={examLang} />
              </div>

              {/* Divider */}
              <div className="flex-shrink-0 mx-2.5 sm:mx-4 border-t border-slate-100" />

              {/* Options — scrollable with padding */}
              <div className="flex-shrink-0 flex flex-col gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 pb-3 sm:pb-4">
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
            </div>
          </div>

          {/* Bottom nav */}
          <div className="flex-shrink-0 pt-1.5 sm:pt-2">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 rounded-lg border border-slate-300 bg-white text-[10px] sm:text-xs font-medium text-slate-600 disabled:opacity-40 min-h-[40px]"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden min-[400px]:inline">Previous</span>
                <span className="min-[400px]:hidden">Prev</span>
              </button>
              <button
                type="button"
                onClick={toggleMarkReview}
                className={`inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-2 rounded-lg border text-[10px] sm:text-xs font-medium min-h-[40px] ${
                  isMarked
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                <Flag className={`w-3 h-3 shrink-0 ${isMarked ? "fill-amber-500 text-amber-500" : ""}`} />
                <span className="truncate">Mark</span>
              </button>
              {currentIndex < test.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-semibold min-h-[40px]"
                >
                  <span className="truncate">Save &amp; Next</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-semibold min-h-[40px]"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question palette — desktop sidebar */}
        <aside className="hidden xl:flex flex-shrink-0 w-[260px] 2xl:w-[280px] bg-white border-l border-slate-200 flex-col overflow-hidden">
          <PalettePanel
            paletteStats={paletteStats}
            paletteCols={paletteColsDesktop}
            paletteBtnH={paletteBtnH}
            test={test}
            getPaletteStatus={getPaletteStatus}
            paletteBtnClass={paletteBtnClass}
            goToQuestion={goToQuestion}
            onSubmit={() => setShowSubmitDialog(true)}
            isSubmitting={isSubmitting}
          />
        </aside>

        {/* Mobile / tablet palette drawer */}
        {paletteOpen && (
          <>
            <button
              type="button"
              className="xl:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setPaletteOpen(false)}
              aria-label="Close palette"
            />
            <aside className="xl:hidden fixed inset-y-0 right-0 z-50 w-[min(280px,88vw)] bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-800">Question Palette</span>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  className="text-xs font-medium text-slate-500 px-2 py-1 rounded hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <PalettePanel
                paletteStats={paletteStats}
                paletteCols={paletteColsMobile}
                paletteBtnH={paletteBtnH}
                test={test}
                getPaletteStatus={getPaletteStatus}
                paletteBtnClass={paletteBtnClass}
                goToQuestion={goToQuestion}
                onSubmit={() => setShowSubmitDialog(true)}
                isSubmitting={isSubmitting}
                compact
              />
            </aside>
          </>
        )}
      </div>

      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? "You haven't answered any questions. Are you sure you want to submit?"
            : `You have attempted ${attemptedCount} of ${test.totalQuestions} questions. Once submitted, you cannot change your answers.`
        }
        confirmText="Submit Test"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitDialog(false)}
        loading={isSubmitting}
      />
    </div>
  );
};

export default TestPage;
