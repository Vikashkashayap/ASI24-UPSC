import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardEdit,
  RefreshCw,
  Loader2,
  Wand2,
  Users,
  ExternalLink,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { testBuilderAPI, type BuilderTest } from "../../features/testBuilder/api";
import { questionIntelligenceAPI } from "../../features/questionIntelligence/api";
import { knowledgeAPI } from "../../features/knowledge/api";
import { assignedPracticeAPI } from "../../services/api";
import type { KbSubject } from "../../features/knowledge/types";

export const TestBuilderPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [tests, setTests] = useState<BuilderTest[]>([]);
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [subjects, setSubjects] = useState<KbSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionId, setSessionId] = useState("");

  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, list, sess, subs] = await Promise.all([
        testBuilderAPI.dashboard(),
        testBuilderAPI.list({ page: 1 }),
        questionIntelligenceAPI.sessions({ page: 1 }),
        knowledgeAPI.subjects.list(),
      ]);
      setStats(dash.data.data.stats || null);
      setTests(list.data.data.items || dash.data.data.recent || []);
      setSessions(sess.data.data?.items || []);
      setSubjects(subs.data.data || []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load Test Builder";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subjectName = subjects.find((s) => s._id === subject)?.name || subject;

  const onBuildAndCreate = async () => {
    if (!subjectName && !topic && !query.trim()) {
      toast.error("Subject, topic, or query required");
      return;
    }
    setCreating(true);
    try {
      const res = await testBuilderAPI.buildAndCreate({
        subject: subjectName,
        topic,
        query: query.trim() || undefined,
        count,
        title: title.trim() || undefined,
        durationMinutes,
        allowGeneration: true,
      });
      toast.success(`Test ready · ${(res.data.data as { mapped?: number }).mapped || count}Q`);
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Build failed";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const onFromSession = async () => {
    if (!sessionId) {
      toast.error("Select a QI session");
      return;
    }
    setCreating(true);
    try {
      await testBuilderAPI.fromSession({
        sessionId,
        title: title.trim() || undefined,
        durationMinutes,
        maxQuestions: count,
      });
      toast.success("Test created from session");
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Create failed";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const onApprove = async (id: string) => {
    try {
      await assignedPracticeAPI.approve(id);
      toast.success("Approved for students");
      load();
    } catch {
      toast.error("Approve failed");
    }
  };

  return (
    <div
      className={`min-h-full w-full ${
        isDark
          ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-sky-50/40"
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
                isDark ? "bg-sky-500/15 text-sky-300" : "bg-sky-100 text-sky-700"
              }`}
            >
              <ClipboardEdit className="w-5 h-5" />
            </div>
            <div>
              <h1
                className={`text-2xl md:text-3xl font-semibold tracking-tight ${
                  isDark ? "text-slate-50" : "text-slate-900"
                }`}
              >
                Test Builder
              </h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                QI questions → practice test → assign to students (Prelims Test)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/question-intelligence">
              <Button variant="outline">Question AI</Button>
            </Link>
            <Link to="/admin/topic-practice">
              <Button variant="outline">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Assign students
              </Button>
            </Link>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tests built", value: stats?.totalTests },
            { label: "Ready", value: stats?.ready },
            { label: "Questions", value: stats?.totalQuestions },
            { label: "Assigned", value: stats?.assignedTests },
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
                {loading ? "…" : s.value ?? 0}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Build + create test (one shot)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                placeholder="Topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <input
                className={`rounded-lg border px-3 py-2 text-sm sm:col-span-2 ${inputCls}`}
                placeholder="Query (optional)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <input
                className={`rounded-lg border px-3 py-2 text-sm sm:col-span-2 ${inputCls}`}
                placeholder="Test title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                type="number"
                min={1}
                max={50}
                className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 10)}
                title="Question count"
              />
              <input
                type="number"
                min={5}
                max={300}
                className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                title="Duration minutes"
              />
            </div>
            <Button onClick={onBuildAndCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-1.5" />
              )}
              Build questions & create test
            </Button>
          </div>

          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Create from existing QI session
            </h3>
            <select
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={String(s._id)} value={String(s._id)}>
                  {String(s.subject || "—")} · {String(s.topic || "—")} · {String(s.status)} ·{" "}
                  {String((s.stats as { extractedUsed?: number })?.extractedUsed ?? "")}Q+
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={onFromSession} disabled={creating || !sessionId}>
              Create test from session
            </Button>
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              After create, open Topic Practice to assign students — they see it under Prelims Test.
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`px-4 py-3 border-b text-sm font-semibold ${isDark ? "border-slate-800 text-slate-200" : "border-slate-100 text-slate-800"}`}>
            Tests from Test Builder
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs uppercase ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Subject / Topic</th>
                  <th className="px-4 py-3">Q</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!tests.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No tests yet — build one above.
                    </td>
                  </tr>
                )}
                {tests.map((t) => (
                  <tr key={t._id} className="border-t border-inherit">
                    <td className={`px-4 py-3 font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {t.title || "Untitled"}
                      <div className={`text-[11px] font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {t.status}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {t.subject} · {t.topic}
                    </td>
                    <td className="px-4 py-3">{t.totalQuestions}</td>
                    <td className="px-4 py-3">{t.assignedCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onApprove(t._id)}>
                          Approve
                        </Button>
                        <Link to="/admin/topic-practice">
                          <Button variant="outline">
                            Assign <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestBuilderPage;
