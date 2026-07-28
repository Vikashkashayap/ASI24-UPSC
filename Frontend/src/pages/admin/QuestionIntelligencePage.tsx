import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Wand2,
  Library,
  ClipboardEdit,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import {
  questionIntelligenceAPI,
  type QiBuildResult,
  type QiQuestion,
} from "../../features/questionIntelligence/api";
import { testBuilderAPI } from "../../features/testBuilder/api";
import { knowledgeAPI } from "../../features/knowledge/api";
import type { KbSubject } from "../../features/knowledge/types";

export const QuestionIntelligencePage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [subjects, setSubjects] = useState<KbSubject[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState<Array<Record<string, unknown>>>([]);
  const [building, setBuilding] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [result, setResult] = useState<QiBuildResult | null>(null);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(10);
  const [allowGeneration, setAllowGeneration] = useState(true);

  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const load = useCallback(async () => {
    try {
      const [dash, subs] = await Promise.all([
        questionIntelligenceAPI.dashboard(),
        knowledgeAPI.subjects.list(),
      ]);
      setStats(dash.data.data.stats || null);
      setRecent(dash.data.data.recent || []);
      setSubjects(subs.data.data || []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load";
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subjectName = subjects.find((s) => s._id === subject)?.name || subject;

  const runBuild = async () => {
    if (!subjectName && !topic && !query.trim()) {
      toast.error("Enter subject, topic, or query");
      return;
    }
    setBuilding(true);
    setResult(null);
    try {
      const res = await questionIntelligenceAPI.build({
        subject: subjectName,
        topic,
        query: query.trim() || undefined,
        count,
        allowGeneration,
        preferExtracted: true,
      });
      setResult(res.data.data);
      toast.success(`Built ${res.data.data.count} questions`);
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Build failed";
      toast.error(msg);
    } finally {
      setBuilding(false);
    }
  };

  const createTestFromResult = async () => {
    if (!result?.sessionId) return;
    setCreatingTest(true);
    try {
      await testBuilderAPI.fromSession({
        sessionId: result.sessionId,
        maxQuestions: result.count || count,
      });
      toast.success("Practice test created — open Test Builder or Topic Practice to assign");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Create test failed";
      toast.error(msg);
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <div
      className={`min-h-full w-full ${
        isDark
          ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-amber-50/30"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto space-y-6 px-3 md:px-6 pb-10 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-800"
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1
                className={`text-2xl md:text-3xl font-semibold tracking-tight ${
                  isDark ? "text-slate-50" : "text-slate-900"
                }`}
              >
                Question Intelligence
              </h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Select from bank → rank sources → generate only if needed → validate
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/test-builder">
              <Button variant="outline">
                <ClipboardEdit className="w-3.5 h-3.5 mr-1.5" />
                Test Builder
              </Button>
            </Link>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { label: "Sessions", value: stats?.totalSessions },
            { label: "Completed", value: stats?.completed },
            { label: "Partial", value: stats?.partial },
            { label: "Failed", value: stats?.failed },
            { label: "Questions", value: stats?.questionsBuilt },
            { label: "From bank", value: stats?.extractedUsed },
            { label: "AI generated", value: stats?.generatedUsed },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border p-3.5 ${
                isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                {s.label}
              </div>
              <div
                className={`text-2xl font-semibold mt-1 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {s.value ?? 0}
              </div>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border p-4 space-y-4 ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            Build question set
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-600"}>Subject</span>
              <select
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-600"}>Topic</span>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Monsoon"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-600"}>Free query</span>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Optional natural language"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-600"}>Count</span>
              <input
                type="number"
                min={1}
                max={50}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 10)}
              />
            </label>
          </div>
          <label className={`flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            <input
              type="checkbox"
              checked={allowGeneration}
              onChange={(e) => setAllowGeneration(e.target.checked)}
            />
            Allow AI generation if bank is short (recommended)
          </label>
          <Button onClick={runBuild} disabled={building}>
            {building ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Building…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-1.5" />
                Build questions
              </>
            )}
          </Button>
        </div>

        {result && (
          <div
            className={`rounded-2xl border p-4 space-y-4 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Result · {result.count}/{result.requestedCount} · {result.status}
              </h3>
              <div className={`flex flex-wrap gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <span className="inline-flex items-center gap-1">
                  <Library className="w-3.5 h-3.5" />
                  Bank {result.stats.extractedUsed}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI {result.stats.generatedUsed}
                </span>
                <span>Dupes removed {result.stats.duplicatesRemoved}</span>
                <span>Sources {result.stats.sourcesRanked}</span>
                {result.stats.avgConfidence != null && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confidence {result.stats.avgConfidence}
                  </span>
                )}
              </div>
            </div>

            {result.generation?.triggered && (
              <p className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                AI generation: {result.generation.reason}
                {result.generation.message ? ` — ${result.generation.message}` : ""}
              </p>
            )}

            <Button onClick={createTestFromResult} disabled={creatingTest || !result.sessionId}>
              {creatingTest ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ClipboardEdit className="w-4 h-4 mr-1.5" />
              )}
              Create practice test from this set
            </Button>

            {!!result.concepts?.length && (
              <div className="flex flex-wrap gap-1.5">
                {result.concepts.map((c) => (
                  <span
                    key={c}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      isDark ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {result.questions.map((q, idx) => (
                <QuestionCard key={idx} q={q} index={idx} isDark={isDark} />
              ))}
            </div>
          </div>
        )}

        {!!recent.length && (
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Recent sessions
            </h3>
            <div className="space-y-2">
              {recent.map((r) => (
                <div
                  key={String(r._id)}
                  className={`flex justify-between text-sm rounded-lg border px-3 py-2 ${
                    isDark ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <span className={isDark ? "text-slate-200" : "text-slate-800"}>
                    {String(r.subject || "—")} · {String(r.topic || "—")}
                  </span>
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}>
                    {String(r.status)} · {String(r.requestedCount)}Q
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function QuestionCard({
  q,
  index,
  isDark,
}: {
  q: QiQuestion;
  index: number;
  isDark: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        isDark ? "border-slate-800" : "border-slate-100"
      }`}
    >
      <div className="flex flex-wrap gap-2 text-[11px] mb-2">
        <span className="font-medium">Q{index + 1}</span>
        <span
          className={
            q.sourceType === "generated"
              ? "text-violet-600"
              : "text-emerald-600"
          }
        >
          {q.sourceType}
        </span>
        <span className={isDark ? "text-slate-500" : "text-slate-400"}>
          {q.difficulty} · {q.pattern || "—"}
          {q.confidence != null ? ` · conf ${q.confidence}` : ""}
          {q.validated ? " · validated" : ""}
        </span>
      </div>
      <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        {q.questionText}
      </p>
      <ul className={`mt-2 space-y-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        {(q.options || []).map((o) => (
          <li key={o.label}>
            <span className="font-medium">{o.label}.</span> {o.text}
            {(o.isCorrect || o.label === q.correctAnswer) && (
              <span className="ml-1 text-emerald-600 text-xs">✓</span>
            )}
          </li>
        ))}
      </ul>
      {q.explanation && (
        <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          {q.explanation}
        </p>
      )}
    </div>
  );
}

export default QuestionIntelligencePage;
