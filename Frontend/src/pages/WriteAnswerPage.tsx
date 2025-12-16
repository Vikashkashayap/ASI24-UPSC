import { FormEvent, useState } from "react";
import { api } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { EvaluationView, Evaluation } from "../components/EvaluationView";
import { useTheme } from "../hooks/useTheme";

const subjects = ["GS1", "GS2", "GS3", "GS4", "Essay", "Optional"] as const;

export const WriteAnswerPage = () => {
  const { theme } = useTheme();
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState<(typeof subjects)[number]>("GS1");
  const [wordLimit, setWordLimit] = useState(250);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setEvaluation(null);
    try {
      const res = await api.post("/api/answers", {
        question,
        subject,
        wordLimit,
        answerText,
      });
      const ev = res.data.evaluation as any;
      setEvaluation({
        score: ev.score,
        feedback: ev.feedback,
        strengths: ev.strengths,
        weaknesses: ev.weaknesses,
        improvements: ev.improvements,
        modelAnswer: ev.modelAnswer,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to evaluate answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Write & evaluate</h1>
        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Practice mains-style answers and get instant, examiner-like feedback.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-sm md:text-base">Answer workspace</CardTitle>
          <CardDescription className="text-xs md:text-sm">Set the question, choose the paper, then write under soft word limits.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1 text-xs md:text-sm">
              <label className={theme === "dark" ? "text-slate-200" : "text-slate-700"}>Question</label>
              <textarea
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className={`w-full rounded-lg border px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 text-xs md:text-sm">
              <div className="space-y-1">
                <label className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as any)}
                  className={`w-full rounded-lg border px-2 md:px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                    theme === "dark"
                      ? "border-slate-700 bg-slate-950 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  {subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>Word limit</label>
                <select
                  value={wordLimit}
                  onChange={(e) => setWordLimit(Number(e.target.value))}
                  className={`w-full rounded-lg border px-2 md:px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                    theme === "dark"
                      ? "border-slate-700 bg-slate-950 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  {[150, 200, 250, 300].map((w) => (
                    <option key={w} value={w}>
                      {w} words
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1 text-xs md:text-sm">
              <label className={theme === "dark" ? "text-slate-200" : "text-slate-700"}>Your answer</label>
              <textarea
                required
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={7}
                placeholder="Write as you would in the exam booklet..."
                className={`w-full rounded-lg border px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>
            {error && <p className="text-[10px] md:text-xs text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full md:w-auto text-xs md:text-sm" size="sm">
              {loading ? "Evaluating..." : "Submit for evaluation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {evaluation && <EvaluationView evaluation={evaluation} />}
    </div>
  );
};
