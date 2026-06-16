import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  ExamQuestionBody,
  ExamReviewOptionRow,
  ExamReviewExplanation,
  examPaletteCols,
  getQuestionOptionKeys,
} from "../components/exam/ExamQuestionBody";
import { ExamLanguageToggle } from "../components/exam/ExamLanguageToggle";
import { UpscExamPaperShell } from "../components/exam/UpscExamPaperShell";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { testAPI } from "../services/api";

interface QuestionResult {
  _id: string;
  question: string;
  question_en?: string;
  question_hi?: string;
  options: { A: string; B: string; C: string; D: string };
  options_en?: { A: string; B: string; C: string; D: string };
  options_hi?: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  userAnswer: string | null;
  explanation: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_en?: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_hi?: { A?: string; B?: string; C?: string; D?: string };
  isCorrect: boolean;
  timeSpent?: number;
  questionType?: string;
  tableData?: { headers: string[]; rows: string[][] } | null;
  matchColumns?: { columnA: string[]; columnB: string[] } | null;
  matchColumns_hi?: { columnA: string[]; columnB: string[] } | null;
  assertionReason?: { assertion: string; reason: string } | null;
  eliminationLogic?: string;
  conceptualSource?: string;
}

interface TestResult {
  _id: string;
  subject: string;
  examType?: "GS" | "CSAT";
  topic: string;
  difficulty?: string;
  totalQuestions: number;
  durationMinutes?: number;
  totalMarks?: number;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  questions: QuestionResult[];
  createdAt: string;
  submittedAt: string;
}

type ReviewPaletteStatus = "correct" | "wrong" | "unattempted" | "current";

function formatTimeSpent(seconds: number): string {
  if (seconds == null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ReviewPalettePanel({
  result,
  currentIndex,
  paletteCols,
  paletteBtnH,
  getPaletteStatus,
  paletteBtnClass,
  goToQuestion,
  compact = false,
}: {
  result: TestResult;
  currentIndex: number;
  paletteCols: number;
  paletteBtnH: string;
  getPaletteStatus: (i: number) => ReviewPaletteStatus;
  paletteBtnClass: (s: ReviewPaletteStatus) => string;
  goToQuestion: (i: number) => void;
  compact?: boolean;
}) {
  const correct = result.correctAnswers;
  const wrong = result.wrongAnswers;
  const unattempted = result.totalQuestions - correct - wrong;

  return (
    <>
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100">
        {!compact && <h2 className="font-bold text-slate-800 text-xs">Question Review</h2>}
        <div className="flex gap-2 mt-1 text-[10px] font-medium flex-wrap">
          <span className="text-emerald-600">{correct} correct</span>
          <span className="text-red-500">{wrong} wrong</span>
          <span className="text-slate-400">{unattempted} skipped</span>
        </div>
      </div>
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" /> Correct
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-red-500 shrink-0" /> Wrong
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-slate-300 bg-white shrink-0" /> Skipped
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border-2 border-blue-600 bg-blue-50 shrink-0" /> Current
        </div>
      </div>
      <div className="flex-1 min-h-0 px-2 sm:px-3 py-2 overflow-y-auto">
        <div
          className="w-full grid gap-1"
          style={{ gridTemplateColumns: `repeat(${paletteCols}, minmax(0, 1fr))` }}
        >
          {result.questions.map((_, index) => (
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
        <div className="text-center text-[10px] sm:text-xs text-slate-500">
          Score: <strong className="text-slate-800">{result.score.toFixed(2)}</strong>
          <span className="text-slate-400"> / {result.totalMarks ?? result.totalQuestions * 2}</span>
        </div>
      </div>
    </>
  );
}

const TestResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang: examLang, setLang: setExamLang } = useExamLanguage();
  const [result, setResult] = useState<TestResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (id) loadResult();
  }, [id]);

  const loadResult = async () => {
    try {
      setIsLoading(true);
      const response = await testAPI.getTest(id!);
      if (response.data.success) {
        const testData = response.data.data;
        if (!testData.isSubmitted) {
          navigate(`/test/${id}`);
          return;
        }
        setResult(testData);
      } else {
        setError("Failed to load results");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  const goToQuestion = (index: number) => {
    if (!result || index < 0 || index >= result.questions.length) return;
    setCurrentIndex(index);
    setPaletteOpen(false);
  };

  const getPaletteStatus = (index: number): ReviewPaletteStatus => {
    if (!result) return "unattempted";
    if (index === currentIndex) return "current";
    const q = result.questions[index];
    if (!q.userAnswer) return "unattempted";
    return q.isCorrect ? "correct" : "wrong";
  };

  const paletteBtnClass = (status: ReviewPaletteStatus) => {
    switch (status) {
      case "current":
        return "border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold";
      case "correct":
        return "bg-emerald-500 text-white border-emerald-500";
      case "wrong":
        return "bg-red-500 text-white border-red-500";
      default:
        return "bg-white text-slate-600 border-slate-200 hover:border-slate-300";
    }
  };

  const fromAdmin = searchParams.get("fromAdmin") === "1";
  const fromMentor = searchParams.get("fromMentor") === "1";
  const studentId = searchParams.get("studentId");

  const backPath = useMemo(() => {
    if (fromMentor && studentId) return `/mentor-dashboard/students/${studentId}`;
    if (fromAdmin && studentId) return `/admin/students/${studentId}`;
    return "/test-history";
  }, [fromAdmin, fromMentor, studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] bg-slate-100 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-800 mb-4">{error}</p>
          <Button onClick={() => navigate(backPath)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const currentQuestion = result.questions[currentIndex];
  const optionKeys = getQuestionOptionKeys(currentQuestion);
  const totalMarks = result.totalMarks ?? result.totalQuestions * 2;
  const paletteColsDesktop = examPaletteCols(result.totalQuestions, false);
  const paletteColsMobile = examPaletteCols(result.totalQuestions, true);
  const paletteBtnH =
    result.totalQuestions > 75 ? "h-[22px] sm:h-[24px]" : "h-[24px] sm:h-[26px]";

  return (
    <div className="h-[100dvh] flex flex-col upsc-exam-page-bg text-slate-900 overflow-hidden">
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-2 sm:px-4 py-2 shadow-sm safe-area-inset-top">
        <div className="flex items-start sm:items-center justify-between gap-2 max-w-[1600px] mx-auto w-full">
          <div className="min-w-0 flex-1 flex items-start gap-2">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 text-slate-500 mt-0.5"
              title="Back to history"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[11px] sm:text-sm font-bold text-slate-900 truncate leading-tight">
                {result.topic}
              </h1>
              <p className="text-[9px] sm:text-[11px] text-slate-500 leading-tight mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0">
                <span>Q {currentIndex + 1}/{result.totalQuestions}</span>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-emerald-600 font-medium">{result.correctAnswers} correct</span>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-red-500 font-medium">{result.wrongAnswers} wrong</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExamLanguageToggle lang={examLang} onChange={setExamLang} compact />
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px] sm:text-xs">
              <Award className="w-3.5 h-3.5 shrink-0" />
              {result.score.toFixed(2)}/{totalMarks}
            </div>
            {currentQuestion.timeSpent != null && currentQuestion.timeSpent > 0 && (
              <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                <Clock className="w-3 h-3" />
                {formatTimeSpent(currentQuestion.timeSpent)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="xl:hidden inline-flex px-2 py-1 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700"
            >
              Review
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-1.5 sm:p-2 md:p-3">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <UpscExamPaperShell
              questionNumber={currentIndex + 1}
              examType={result.examType}
              topic={result.topic}
              totalMarks={totalMarks}
              durationMinutes={result.durationMinutes}
            >
              <div className="px-2.5 sm:px-4 py-2 sm:py-3">
                <ExamQuestionBody question={currentQuestion} compact lang={examLang} paperMode />
              </div>

              <div className="flex-shrink-0 mx-2.5 sm:mx-4 border-t border-dashed border-black/20" />

              <div className="flex-shrink-0 flex flex-col gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3">
                {optionKeys.map((key) => (
                  <ExamReviewOptionRow
                    key={key}
                    optionKey={key}
                    question={currentQuestion}
                    correctAnswer={currentQuestion.correctAnswer}
                    userAnswer={currentQuestion.userAnswer}
                    compact
                    lang={examLang}
                    paperMode
                  />
                ))}
              </div>

              <div className="flex-shrink-0 mx-2.5 sm:mx-4 border-t border-dashed border-black/20" />

              <div className="flex-shrink-0 py-2 sm:py-3">
                <ExamReviewExplanation
                  question={currentQuestion}
                  userAnswer={currentQuestion.userAnswer}
                  paperMode
                />
              </div>
            </UpscExamPaperShell>
          </div>

          <div className="flex-shrink-0 pt-1.5 sm:pt-2">
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 rounded-lg border border-slate-300 bg-white text-[10px] sm:text-xs font-medium text-slate-600 disabled:opacity-40 min-h-[40px]"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToQuestion(currentIndex + 1)}
                disabled={currentIndex >= result.questions.length - 1}
                className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-semibold disabled:opacity-40 min-h-[40px]"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden xl:flex flex-shrink-0 w-[260px] 2xl:w-[280px] bg-white border-l border-slate-200 flex-col overflow-hidden">
          <ReviewPalettePanel
            result={result}
            currentIndex={currentIndex}
            paletteCols={paletteColsDesktop}
            paletteBtnH={paletteBtnH}
            getPaletteStatus={getPaletteStatus}
            paletteBtnClass={paletteBtnClass}
            goToQuestion={goToQuestion}
          />
        </aside>

        {paletteOpen && (
          <>
            <button
              type="button"
              className="xl:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setPaletteOpen(false)}
              aria-label="Close review palette"
            />
            <aside className="xl:hidden fixed inset-y-0 right-0 z-50 w-[min(280px,88vw)] bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-800">Question Review</span>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  className="text-xs font-medium text-slate-500 px-2 py-1 rounded hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <ReviewPalettePanel
                result={result}
                currentIndex={currentIndex}
                paletteCols={paletteColsMobile}
                paletteBtnH={paletteBtnH}
                getPaletteStatus={getPaletteStatus}
                paletteBtnClass={paletteBtnClass}
                goToQuestion={goToQuestion}
                compact
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
};

export default TestResultPage;
