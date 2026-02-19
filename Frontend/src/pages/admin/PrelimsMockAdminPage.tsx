import React, { useState, useEffect } from "react";
import { Calendar, Loader2, Play, Clock, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsMockAPI } from "../../services/api";
import { GS_SUBJECTS } from "../../constants/testGenerator";
import { SubjectToggle } from "../../components/SubjectToggle";

const GS_ARR = [...GS_SUBJECTS];

interface PrelimsMockItem {
  _id: string;
  subject: string;
  title: string;
  scheduledAt: string;
  status: "scheduled" | "generating" | "live" | "ended";
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  liveAt?: string;
  questionCount?: number;
  createdAt: string;
}

function toDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export const PrelimsMockAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const [list, setList] = useState<PrelimsMockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mockMode, setMockMode] = useState<"subject" | "mix" | "pyo" | "csat">("subject");
  const [subject, setSubject] = useState<string[]>(["Polity"]);
  const [yearFrom, setYearFrom] = useState<number>(2018);
  const [yearTo, setYearTo] = useState<number>(2025);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [goLiveId, setGoLiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const PYQ_YEAR_MIN = 2010;
  const PYQ_YEAR_MAX = 2025;
  const yearOptions = Array.from({ length: PYQ_YEAR_MAX - PYQ_YEAR_MIN + 1 }, (_, i) => PYQ_YEAR_MIN + i);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await prelimsMockAPI.listAdmin();
      if (res.data.success) setList(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load Prelims Mocks");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const useMix = mockMode === "mix";
    const usePyo = mockMode === "pyo";
    const useCsat = mockMode === "csat";
    if (!useMix && !usePyo && !useCsat && subject.length === 0) {
      setError("Select at least one subject");
      return;
    }
    if (usePyo && yearFrom > yearTo) {
      setError("From year must be less than or equal to To year");
      return;
    }
    const at = scheduledAt ? new Date(scheduledAt) : null;
    if (!at || isNaN(at.getTime())) {
      setError("Select date and time for the test");
      return;
    }
    if (at <= new Date()) {
      setError("Schedule time must be in the future");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await prelimsMockAPI.createSchedule({
        subject: useCsat ? "CSAT Paper 2" : usePyo ? `PYQ ${yearFrom}-${yearTo}` : useMix ? "Full Length GS Mix" : subject.join(", "),
        scheduledAt: at.toISOString(),
        isMix: useMix,
        isPyo: usePyo,
        isCsat: useCsat,
        ...(usePyo ? { yearFrom, yearTo } : {}),
      });
      if (res.data.success) {
        setSuccess("Mock scheduled. At the scheduled time, questions will auto-generate and the test will go live.");
        setScheduledAt("");
        load();
      } else {
        setError(res.data.message || "Failed to schedule");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoLive = async (id: string) => {
    setError(null);
    setGoLiveId(id);
    try {
      const res = await prelimsMockAPI.goLive(id);
      if (res.data.success) {
        setSuccess("Test is now live. Students will see it under Prelims Mock.");
        load();
      } else {
        setError(res.data.message || "Go live failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Go live failed. Try again.");
    } finally {
      setGoLiveId(null);
    }
  };

  const startEdit = (m: PrelimsMockItem) => {
    setEditingId(m._id);
    setEditScheduledAt(toDatetimeLocal(new Date(m.scheduledAt)));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditScheduledAt("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const at = editScheduledAt ? new Date(editScheduledAt) : null;
    if (!at || isNaN(at.getTime())) {
      setError("Select a valid date and time");
      return;
    }
    if (at <= new Date()) {
      setError("Schedule time must be in the future");
      return;
    }
    setError(null);
    setUpdatingId(editingId);
    try {
      const res = await prelimsMockAPI.updateSchedule(editingId, { scheduledAt: at.toISOString() });
      if (res.data.success) {
        setSuccess("Schedule updated.");
        cancelEdit();
        load();
      } else {
        setError(res.data.message || "Update failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!deleteId) return;
    setError(null);
    setUpdatingId(id);
    try {
      const res = await prelimsMockAPI.delete(id);
      if (res.data.success) {
        setSuccess("Prelims Mock deleted.");
        setDeleteId(null);
        load();
      } else {
        setError(res.data.message || "Delete failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Delete failed");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className={`rounded-xl border-2 p-4 md:p-6 ${theme === "dark" ? "bg-slate-800/50 border-amber-500/20" : "bg-amber-50/50 border-amber-200"}`}>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          Schedule Prelims Mock
        </h2>
        <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Set date and time. At that time, 100 questions will auto-generate and the test will go live for students under &quot;Prelims Mock&quot;.
        </p>
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Mock type
            </label>
            <div className={`flex flex-wrap gap-3 mb-3 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mockMode"
                  checked={mockMode === "subject"}
                  onChange={() => setMockMode("subject")}
                  disabled={submitting}
                  className="rounded border-slate-400 text-amber-600 focus:ring-amber-500"
                />
                <span>Subject-based (select subjects below)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mockMode"
                  checked={mockMode === "mix"}
                  onChange={() => setMockMode("mix")}
                  disabled={submitting}
                  className="rounded border-slate-400 text-amber-600 focus:ring-amber-500"
                />
                <span>Full Length GS Mix (real exam style, all subjects)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mockMode"
                  checked={mockMode === "pyo"}
                  onChange={() => setMockMode("pyo")}
                  disabled={submitting}
                  className="rounded border-slate-400 text-amber-600 focus:ring-amber-500"
                />
                <span>PYQ style (year-based, 2010–2025)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mockMode"
                  checked={mockMode === "csat"}
                  onChange={() => setMockMode("csat")}
                  disabled={submitting}
                  className="rounded border-slate-400 text-amber-600 focus:ring-amber-500"
                />
                <span>CSAT Paper 2 (80 questions)</span>
              </label>
            </div>
            {mockMode === "subject" && (
              <>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Subject
                </label>
                <SubjectToggle options={GS_ARR} selected={subject} onChange={setSubject} disabled={submitting} />
              </>
            )}
            {mockMode === "mix" && (
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                100 questions mixed: Polity, History, Geography, Economy, Environment, Science &amp; Tech, Current Affairs (Gemini 2.0).
              </p>
            )}
            {mockMode === "csat" && (
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                80 questions: Reading Comprehension, Logical Reasoning, Analytical Ability, Basic Numeracy, Data Interpretation. 200 marks, 0.83 negative. 4×20 batches, Gemini 2.0.
              </p>
            )}
            {mockMode === "pyo" && (
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>From year</label>
                  <select
                    value={yearFrom}
                    onChange={(e) => setYearFrom(Number(e.target.value))}
                    disabled={submitting}
                    className={`px-3 py-2 rounded-lg border text-sm ${theme === "dark" ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"}`}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>To year</label>
                  <select
                    value={yearTo}
                    onChange={(e) => setYearTo(Number(e.target.value))}
                    disabled={submitting}
                    className={`px-3 py-2 rounded-lg border text-sm ${theme === "dark" ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"}`}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  100 questions, PYQ-inspired (trends/themes), 20×5 batches, Gemini 2.0.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Date &amp; time (test will go live at this time)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={toDatetimeLocal(new Date())}
              className={`w-full max-w-xs px-4 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"}`}
              disabled={submitting}
            />
          </div>
          <Button type="submit" disabled={submitting || (mockMode === "subject" && subject.length === 0) || (mockMode === "pyo" && yearFrom > yearTo)}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Schedule Mock
          </Button>
        </form>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 ${theme === "dark" ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`rounded-lg border p-4 ${theme === "dark" ? "bg-green-950/30 border-green-800 text-green-300" : "bg-green-50 border-green-200 text-green-800"}`}>
          {success}
        </div>
      )}

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Scheduled &amp; Live Mocks
          </CardTitle>
          <CardDescription>
            Scheduled mocks will auto-go-live at the set time. You can also &quot;Go Live Now&quot; for any scheduled mock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : list.length === 0 ? (
            <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>No Prelims Mocks yet. Schedule one above.</p>
          ) : (
            <>
            <ul className="space-y-3">
              {list.map((m) => (
                <li
                  key={m._id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${theme === "dark" ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.title || m.subject}</div>
                    {editingId === m._id ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <input
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={(e) => setEditScheduledAt(e.target.value)}
                          min={toDatetimeLocal(new Date())}
                          className={`px-3 py-2 rounded-lg border text-sm ${theme === "dark" ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300"}`}
                        />
                        <Button onClick={saveEdit} disabled={!!updatingId}>
                          {updatingId === m._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} disabled={!!updatingId}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className={`flex flex-wrap items-center gap-3 mt-1 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(m.scheduledAt)}
                        </span>
                        <span>{m.totalQuestions} Q · {m.durationMinutes} min</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.status === "live"
                              ? "bg-green-500/20 text-green-400"
                              : m.status === "generating"
                              ? "bg-amber-500/20 text-amber-400"
                              : m.status === "ended"
                              ? "bg-slate-500/20 text-slate-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {m.status}
                        </span>
                        {m.liveAt && <span>Live at: {formatDate(m.liveAt)}</span>}
                      </div>
                    )}
                  </div>
                  {editingId !== m._id && (
                    <div className="flex items-center gap-2">
                      {m.status === "scheduled" && (
                        <Button
                          variant="outline"
                          onClick={() => startEdit(m)}
                          disabled={!!goLiveId || !!updatingId}
                          className={theme === "dark" ? "border-slate-600 text-slate-200" : ""}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {m.status === "scheduled" && (
                        <Button
                          variant="default"
                          onClick={() => handleGoLive(m._id)}
                          disabled={!!goLiveId || !!updatingId}
                          className="bg-amber-600 hover:bg-amber-500"
                        >
                          {goLiveId === m._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Go Live Now
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setDeleteId(m._id)}
                        disabled={!!updatingId}
                        className={theme === "dark" ? "border-red-800 text-red-400 hover:bg-red-950/30" : "border-red-200 text-red-600 hover:bg-red-50"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {deleteId && (
              <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${theme === "dark" ? "bg-black/70" : "bg-black/50"}`} onClick={() => setDeleteId(null)}>
                <div
                  className={`rounded-xl border p-6 max-w-sm w-full shadow-xl ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Delete this Prelims Mock?</p>
                  <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>This cannot be undone. Student attempts will remain in their history.</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setDeleteId(null)} disabled={!!updatingId}>Cancel</Button>
                    <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(deleteId)} disabled={!!updatingId}>
                      {updatingId === deleteId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
