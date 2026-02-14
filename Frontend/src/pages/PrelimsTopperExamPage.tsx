import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Bookmark,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { api, prelimsTopperAPI } from "../services/api";

const OPTIONS = ["A", "B", "C", "D"];

type LanguageMode = "english" | "hindi" | "both";

interface BilingualOption {
  key: string;
  textHindi: string;
  textEnglish: string;
}

interface BilingualQuestion {
  questionNumber?: number;
  questionHindi?: string;
  questionEnglish?: string;
  options?: BilingualOption[];
}

interface LegacyQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
}

type QuestionItem = BilingualQuestion | LegacyQuestion;

function isBilingual(q: QuestionItem): q is BilingualQuestion {
  return "questionHindi" in q || "questionEnglish" in q;
}

const PrelimsTopperExamPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [test, setTest] = useState<{
    _id: string;
    title: string;
    totalQuestions: number;
    totalMarks: number;
    negativeMarking: number;
    questionPdfUrl?: string;
    questions?: QuestionItem[];
    hasBilingual?: boolean;
  } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [allowedSeconds, setAllowedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markForReview, setMarkForReview] = useState<Set<number>>(new Set());
  const [language, setLanguage] = useState<LanguageMode>("english");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const markForReviewRef = useRef<Set<number>>(new Set());
  answersRef.current = answers;
  markForReviewRef.current = markForReview;

  const loadAndStart = useCallback(async () => {
    if (!testId) return;
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.startTest(testId);
      if (!res.data.success) {
        setError(res.data.message || "Failed to start test");
        return;
      }
      const d = res.data.data;
      setTest(d.test);
      setAttemptId(d.attemptId);
      setAllowedSeconds(d.allowedTimeSeconds);
      setStartedAt(new Date(d.startedAt));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to start test");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    loadAndStart();
  }, [loadAndStart]);

  useEffect(() => {
    if (!startedAt || allowedSeconds <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= allowedSeconds) {
        clearInterval(interval);
        setSubmitting(true);
        prelimsTopperAPI
          .submitTest(testId!, {
            timeTakenSeconds: allowedSeconds,
            answers: answersRef.current,
            markForReview: Array.from(markForReviewRef.current),
          })
          .then((res) => {
            if (res.data.success && res.data.data?.attemptId)
              navigate(`/prelims-topper/result/${res.data.data.attemptId}`);
          })
          .finally(() => setSubmitting(false));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, allowedSeconds, testId, navigate]);

  const handleSubmitClick = () => {
    const answered = Object.keys(answers).filter((k) => answers[k]).length;
    setShowSubmitConfirm(true);
  };

  const handleSubmit = async () => {
    if (!testId || submitting) return;
    setShowSubmitConfirm(false);
    setSubmitting(true);
    try {
      const res = await prelimsTopperAPI.submitTest(testId, {
        timeTakenSeconds: elapsedSeconds,
        answers,
        markForReview: Array.from(markForReview),
      });
      if (res.data.success && res.data.data?.attemptId) {
        navigate(`/prelims-topper/result/${res.data.data.attemptId}`);
        return;
      }
      setError(res.data.message || "Submit failed");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (qIndex: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [String(qIndex)]: value }));
  };

  const toggleMarkForReview = (idx: number) => {
    setMarkForReview((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const remainingSeconds = Math.max(0, allowedSeconds - elapsedSeconds);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="pt-6 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </CardContent>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
              Back to list
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test) return null;

  const totalQuestions = test.totalQuestions;
  const hasBilingual = !!test.hasBilingual;
  const hasParsedQuestions = Array.isArray(test.questions) && test.questions.length > 0;
  const currentQuestion = hasParsedQuestions && currentIndex < test.questions!.length ? test.questions![currentIndex] : null;

  const getQuestionDisplay = () => {
    if (!currentQuestion) return { text: "", opts: { A: "", B: "", C: "", D: "" } };
    if (isBilingual(currentQuestion)) {
      const q = currentQuestion as BilingualQuestion;
      const opts: Record<string, string> = {};
      (q.options || []).forEach((o) => {
        const txt =
          language === "hindi"
            ? o.textHindi || o.textEnglish
            : language === "english"
              ? o.textEnglish || o.textHindi
              : [o.textHindi, o.textEnglish].filter(Boolean).join(" / ");
        opts[o.key] = txt;
      });
      OPTIONS.forEach((k) => {
        if (!opts[k]) opts[k] = "";
      });
      const qText =
        language === "hindi"
          ? q.questionHindi || q.questionEnglish || ""
          : language === "english"
            ? q.questionEnglish || q.questionHindi || ""
            : [q.questionHindi, q.questionEnglish].filter(Boolean).join("\n\n");
      return { text: qText, opts };
    }
    const leg = currentQuestion as LegacyQuestion;
    return { text: leg.question || "", opts: leg.options || { A: "", B: "", C: "", D: "" } };
  };

  const { text: questionText, opts } = getQuestionDisplay();

  const openQuestionPdf = () => {
    if (!test.questionPdfUrl) return;
    api
      .get(test.questionPdfUrl, { responseType: "blob" })
      .then((res) => {
        const blob = new Blob([res.data], { type: "application/pdf" });
        window.open(URL.createObjectURL(blob), "_blank");
      })
      .catch(() => setError("Could not load question PDF"));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      <div className="space-y-3 sticky top-0 z-10 py-2 bg-inherit border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">{test.title}</CardTitle>
            <span
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-mono ${
                remainingSeconds < 300
                  ? "bg-red-500/20 text-red-400"
                  : theme === "dark"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-slate-200 text-slate-800"
              }`}
            >
              <Clock className="w-4 h-4" />
              {timerStr}
            </span>
            <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {Object.keys(answers).filter((k) => answers[k]).length}/{totalQuestions} answered
            </span>
            {hasBilingual && (
              <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                {(["english", "hindi", "both"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLanguage(mode)}
                    className={`px-3 py-1 text-xs font-medium capitalize ${
                      language === mode
                        ? "bg-purple-600 text-white"
                        : theme === "dark"
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          {test.questionPdfUrl && (
            <button
              type="button"
              onClick={openQuestionPdf}
              className="inline-flex items-center gap-2 text-sm text-purple-500 hover:underline"
            >
              <FileText className="w-4 h-4" />
              {hasParsedQuestions ? "View Question PDF" : "Open Question PDF"}
            </button>
          )}
        </div>
        <div
          className={`h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}
        >
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
            style={{
              width: `${(Object.keys(answers).filter((k) => answers[k]).length / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Question {currentIndex + 1} of {totalQuestions}
            </CardTitle>
            <Button
              variant={markForReview.has(currentIndex) ? "default" : "outline"}
              onClick={() => toggleMarkForReview(currentIndex)}
            >
              <Bookmark className={`w-4 h-4 mr-1 ${markForReview.has(currentIndex) ? "fill-current" : ""}`} />
              {markForReview.has(currentIndex) ? "Marked" : "Mark for Review"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasParsedQuestions && currentQuestion ? (
            <>
              <div
                className={`text-base leading-relaxed whitespace-pre-wrap ${
                  theme === "dark" ? "text-slate-200" : "text-slate-900"
                }`}
              >
                {questionText.split("\n").map((line, lineIdx) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
                  if (numberedMatch) {
                    return (
                      <div key={lineIdx} className="ml-4 mt-2 first:mt-1">
                        <span className="font-bold mr-1">{numberedMatch[1]}.</span>
                        <span>{numberedMatch[2]}</span>
                      </div>
                    );
                  }
                  if (trimmedLine.match(/^(List-I|List-II|Statement I|Statement II|Assertion|Reason):?$/i)) {
                    return (
                      <div
                        key={lineIdx}
                        className={`mt-3 mb-2 font-bold ${
                          theme === "dark" ? "text-purple-300" : "text-purple-700"
                        }`}
                      >
                        {trimmedLine}
                      </div>
                    );
                  }
                  return <div key={lineIdx} className={lineIdx === 0 ? "" : "mt-2"}>{trimmedLine}</div>;
                })}
              </div>
              <div className="space-y-3">
                {OPTIONS.map((opt) => {
                  const optionText = opts[opt] || "";
                  const isSelected = answers[String(currentIndex)] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswer(currentIndex, opt)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                          : theme === "dark"
                            ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                            : "border-slate-300 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-sm ${
                            isSelected
                              ? "border-purple-600 bg-purple-600 text-white"
                              : theme === "dark"
                                ? "border-slate-600 text-slate-400"
                                : "border-slate-400 text-slate-600"
                          }`}
                        >
                          {isSelected ? <CheckCircle className="w-4 h-4" /> : opt}
                        </div>
                        <span className={`flex-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          ({opt}) {optionText || `Option ${opt}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
                <Button variant="outline" onClick={() => setAnswer(currentIndex, "")} className="mt-2">
                  Skip
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm opacity-80">
                {hasParsedQuestions
                  ? "This question could not be extracted. Refer to the Question PDF and select your answer below:"
                  : "Select your answer (refer to the Question PDF):"}
              </p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    variant={answers[String(currentIndex)] === opt ? "default" : "outline"}
                    onClick={() => setAnswer(currentIndex, opt)}
                  >
                    {opt}
                  </Button>
                ))}
                <Button variant="outline" onClick={() => setAnswer(currentIndex, "")}>
                  Skip
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <div className="flex flex-wrap gap-1 justify-center max-w-lg overflow-x-auto">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded text-sm font-medium shrink-0 ${
                currentIndex === i
                  ? "bg-purple-600 text-white"
                  : markForReview.has(i)
                    ? "bg-amber-500/30 text-amber-400 border border-amber-500/50"
                    : answers[String(i)]
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : theme === "dark"
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAnswer(currentIndex, answers[String(currentIndex)] || "");
              setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
            }}
            disabled={currentIndex >= totalQuestions - 1}
          >
            Save & Next
          </Button>
          <Button
            variant="outline"
            disabled={currentIndex >= totalQuestions - 1}
            onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmitClick} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Submit Test
        </Button>
      </div>

      {showSubmitConfirm && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            theme === "dark" ? "bg-black/70" : "bg-black/50"
          }`}
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            className={`max-w-md w-full p-6 rounded-xl shadow-xl ${
              theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            } border`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              Submit Test?
            </h3>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              You have answered {Object.keys(answers).filter((k) => answers[k]).length} of {totalQuestions} questions.
              Once submitted, you cannot change your answers. Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrelimsTopperExamPage;
