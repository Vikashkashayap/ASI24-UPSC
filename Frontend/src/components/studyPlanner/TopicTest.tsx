import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Timer } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { testAPI, type TopicMainsQuestionItem, type TopicQuestionItem } from "../../services/api";

interface TopicTestProps {
  subject: string;
  chapter?: string;
  topic: string;
}

const TEST_DURATION_SECONDS = 20 * 60;

export function TopicTest({ subject, chapter, topic }: TopicTestProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<"prelims" | "mains">("prelims");
  const [questions, setQuestions] = useState<TopicQuestionItem[]>([]);
  const [mainsQuestions, setMainsQuestions] = useState<TopicMainsQuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!startedAt || submitted) return;
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt, submitted]);

  const score = useMemo(() => {
    if (!submitted || questions.length === 0) return 0;
    return questions.reduce((acc, q, idx) => (answers[idx] === q.correctAnswer ? acc + 1 : acc), 0);
  }, [submitted, questions, answers]);

  const remainingSeconds = useMemo(() => {
    if (!startedAt || submitted) return TEST_DURATION_SECONDS;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, TEST_DURATION_SECONDS - elapsed);
  }, [startedAt, submitted, tick]);

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const generateTest = async () => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    try {
      const res = await testAPI.generateTopicQuestions({
        subject,
        chapter: chapter || "General",
        topic,
        questionType: mode,
      });
      if (mode === "mains") {
        setMainsQuestions((res.data.data as TopicMainsQuestionItem[]) || []);
      } else {
        setQuestions((res.data.data as TopicQuestionItem[]) || []);
        setAnswers({});
        setStartedAt(Date.now());
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to generate questions. Please retry.");
      if (mode === "mains") setMainsQuestions([]);
      else setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    setSubmitting(true);
    try {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setSubmitted(false);
    setStartedAt(Date.now());
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant={mode === "prelims" ? "primary" : "outline"} onClick={() => setMode("prelims")}>
          Prelims MCQ
        </Button>
        <Button type="button" variant={mode === "mains" ? "primary" : "outline"} onClick={() => setMode("mains")}>
          Mains Practice
        </Button>
      </div>

      {mode === "mains" ? (
        mainsQuestions.length === 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="primary" onClick={generateTest} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Mains Questions"
              )}
            </Button>
            {error && (
              <Button type="button" variant="outline" onClick={generateTest} disabled={loading}>
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-600")}>
              UPSC Mains answer-writing questions for this topic
            </p>
            {mainsQuestions.map((q, idx) => (
              <div
                key={`m-${idx}-${q.question.slice(0, 24)}`}
                className={cn(
                  "rounded-lg border p-3",
                  theme === "dark" ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/60"
                )}
              >
                <p className={cn("text-sm font-semibold", theme === "dark" ? "text-slate-100" : "text-slate-800")}>
                  {idx + 1}. {q.question}
                </p>
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-400" : "text-slate-600")}>
                  {q.marks} marks · {q.wordLimit} words
                </p>
                <ul className={cn("mt-2 list-disc list-inside text-xs space-y-1", theme === "dark" ? "text-slate-300" : "text-slate-700")}>
                  {q.keyPoints.map((kp, i) => (
                    <li key={`${idx}-kp-${i}`}>{kp}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setMainsQuestions([])}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Regenerate Mains Set
            </Button>
          </div>
        )
      ) : questions.length === 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="primary" onClick={generateTest} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Test"
            )}
          </Button>
          {error && (
            <Button type="button" variant="outline" onClick={generateTest} disabled={loading}>
              Retry
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-600")}>
              20 UPSC MCQs generated for this topic
            </p>
            {!submitted && (
              <span className={cn("inline-flex items-center text-xs", theme === "dark" ? "text-amber-300" : "text-amber-700")}>
                <Timer className="w-3.5 h-3.5 mr-1" />
                {formatClock(remainingSeconds)}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((q, index) => {
              const selected = answers[index];
              return (
                <div
                  key={`${index}-${q.question.slice(0, 24)}`}
                  className={cn(
                    "rounded-lg border p-3",
                    theme === "dark" ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/60"
                  )}
                >
                  <p className={cn("text-sm font-medium mb-2", theme === "dark" ? "text-slate-100" : "text-slate-800")}>
                    {index + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {(["A", "B", "C", "D"] as const).map((opt) => {
                      const isCorrect = submitted && q.correctAnswer === opt;
                      const isWrongPicked = submitted && selected === opt && q.correctAnswer !== opt;
                      return (
                        <label
                          key={opt}
                          className={cn(
                            "flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer",
                            isCorrect
                              ? "border-emerald-500 bg-emerald-500/10"
                              : isWrongPicked
                                ? "border-rose-500 bg-rose-500/10"
                                : theme === "dark"
                                  ? "border-slate-700"
                                  : "border-slate-200"
                          )}
                        >
                          <input
                            type="radio"
                            name={`topic-q-${index}`}
                            checked={selected === opt}
                            disabled={submitted}
                            onChange={() => setAnswers((prev) => ({ ...prev, [index]: opt }))}
                          />
                          <span>
                            <strong>{opt}.</strong> {q.options[opt]}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className={cn("mt-2 text-xs", theme === "dark" ? "text-slate-300" : "text-slate-700")}>
                      <p>
                        Your answer: <strong>{selected || "Not attempted"}</strong> | Correct:{" "}
                        <strong>{q.correctAnswer}</strong>
                      </p>
                      <p className="mt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <Button type="button" variant="primary" onClick={submitTest} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Test"
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn("text-sm font-semibold", theme === "dark" ? "text-slate-100" : "text-slate-800")}>
                Score: {score}/{questions.length}
              </p>
              <Button type="button" variant="outline" onClick={retake}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Retake Test
              </Button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

