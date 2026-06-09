import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Trash2,
  Check,
  UserCheck,
  Search,
  Users,
  Sparkles,
  UserPlus,
  X,
  ChevronRight,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { assignedPracticeAPI, adminAPI } from "../../services/api";
import { GS_SUBJECTS, PRELIM_MOCK_PATTERNS } from "../../constants/testGenerator";
import { SubjectToggle } from "../../components/SubjectToggle";

const GS_ARR = [...GS_SUBJECTS];
const DEFAULT_PATTERNS = PRELIM_MOCK_PATTERNS.map((p) => p.id);

interface AssignedPracticeItem {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  difficulty: string;
  totalQuestions: number;
  status: "generating" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  attemptCount: number;
  isAssigned: boolean;
  startedStudentIds?: string[];
  assignedStudents: { _id: string; name: string; email: string }[];
}

interface StudentRow {
  _id: string;
  name: string;
  email: string;
}

interface GeneratedTestSummary {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  totalQuestions: number;
  difficulty: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function studentInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

export const AssignedPracticeAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Step 1 — generate
  const [subject, setSubject] = useState<string[]>(["Polity"]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [patternsToInclude, setPatternsToInclude] = useState<string[]>(DEFAULT_PATTERNS);
  const [generating, setGenerating] = useState(false);

  // Step 2 — assign
  const [activeTest, setActiveTest] = useState<GeneratedTestSummary | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lockedStudentIds, setLockedStudentIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  // List
  const [list, setList] = useState<AssignedPracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listFilter, setListFilter] = useState<"all" | "unassigned" | "assigned">("all");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadList();
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await adminAPI.getStudents({ page: 1, limit: 10000, mentorPicker: true });
      if (res.data?.success) setStudents(res.data.data.students || []);
    } catch {
      /* non-fatal */
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await assignedPracticeAPI.listAdmin();
      if (res.data.success) setList(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s._id)),
    [students, selectedStudentIds]
  );

  const filteredList = useMemo(() => {
    if (listFilter === "unassigned") return list.filter((i) => i.status === "ready" && !i.isAssigned);
    if (listFilter === "assigned") return list.filter((i) => i.isAssigned);
    return list;
  }, [list, listFilter]);

  const toggleStudent = (id: string) => {
    if (lockedStudentIds.has(id)) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      lockedStudentIds.forEach((id) => next.add(id));
      filteredStudents.forEach((s) => next.add(s._id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set(lockedStudentIds));
  };

  const startAssignFlow = (item: AssignedPracticeItem | GeneratedTestSummary) => {
    setIsEditMode(false);
    setLockedStudentIds(new Set());
    setActiveTest({
      _id: item._id,
      subject: item.subject,
      topic: item.topic,
      title: item.title || `${item.subject} — ${item.topic}`,
      totalQuestions: item.totalQuestions,
      difficulty: item.difficulty,
    });
    setSelectedStudentIds(new Set());
    setStudentSearch("");
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditAssignFlow = (item: AssignedPracticeItem) => {
    const locked = new Set((item.startedStudentIds || []).map(String));
    setIsEditMode(true);
    setLockedStudentIds(locked);
    setActiveTest({
      _id: item._id,
      subject: item.subject,
      topic: item.topic,
      title: item.title || `${item.subject} — ${item.topic}`,
      totalQuestions: item.totalQuestions,
      difficulty: item.difficulty,
    });
    setSelectedStudentIds(new Set(item.assignedStudents.map((s) => String(s._id))));
    setStudentSearch("");
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFlow = () => {
    setActiveTest(null);
    setIsEditMode(false);
    setLockedStudentIds(new Set());
    setSelectedStudentIds(new Set());
    setStudentSearch("");
    setTopic("");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectStr = subject[0] || "";
    const topicStr = topic.trim();
    if (!subjectStr) {
      setError("Select a subject");
      return;
    }
    if (!topicStr || topicStr.length < 2) {
      setError("Enter a topic (minimum 2 characters)");
      return;
    }
    if (patternsToInclude.length === 0) {
      setError("Select at least one question pattern");
      return;
    }
    setError(null);
    setSuccess(null);
    setGenerating(true);
    try {
      const res = await assignedPracticeAPI.generate({
        subject: subjectStr,
        topic: topicStr,
        difficulty,
        ...(patternsToInclude.length > 0 && patternsToInclude.length < DEFAULT_PATTERNS.length
          ? { patternsToInclude }
          : {}),
      });
      if (res.data.success && res.data.data) {
        setSuccess(`50 questions generated for "${topicStr}". Now assign to students below.`);
        startAssignFlow(res.data.data);
        loadList();
      } else {
        setError(res.data.message || "Failed to generate test");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to generate test");
    } finally {
      setGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!activeTest) return;
    if (selectedStudentIds.size === 0) {
      setError("Select at least one student to assign");
      return;
    }
    setError(null);
    setSuccess(null);
    setAssigning(true);
    try {
      const res = await assignedPracticeAPI.assign(activeTest._id, Array.from(selectedStudentIds));
      if (res.data.success) {
        setSuccess(
          isEditMode
            ? res.data.message || `Assignment updated for ${selectedStudentIds.size} student(s).`
            : `Test assigned to ${selectedStudentIds.size} student(s). They will see it under Practice Test.`
        );
        resetFlow();
        loadList();
      } else {
        setError(res.data.message || "Failed to assign test");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to assign test");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await assignedPracticeAPI.delete(id);
      if (res.data.success) {
        setSuccess("Practice test deleted.");
        setDeleteId(null);
        if (activeTest?._id === id) resetFlow();
        loadList();
      } else {
        setError(res.data.message || "Delete failed");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = isDark
    ? "bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
    : "bg-white border-slate-300 text-slate-900";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-1">
      {/* Header */}
      <div className={`rounded-xl border-2 p-4 md:p-6 ${isDark ? "bg-slate-800/50 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
        <h1 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-500" />
          Topic Practice
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Step 1: Generate 50 AI questions · Step 2: Assign to students · They see it under Prelims Test
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
            !activeTest
              ? "bg-blue-600 text-white"
              : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> 1. Generate
        </span>
        <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
            activeTest
              ? "bg-blue-600 text-white"
              : isDark ? "bg-slate-700/50 text-slate-500" : "bg-slate-100 text-slate-400"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> 2. {isEditMode ? "Edit Assignment" : "Assign Students"}
        </span>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-green-950/30 border-green-800 text-green-300" : "bg-green-50 border-green-200 text-green-800"}`}>
          {success}
        </div>
      )}

      {/* Step 1 — Generate */}
      {!activeTest && (
        <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Step 1 — Generate Test
            </CardTitle>
            <CardDescription>Pick subject and topic. AI will create 50 UPSC-style MCQs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Subject
                </label>
                <SubjectToggle
                  options={GS_ARR}
                  selected={subject}
                  onChange={(sel) => setSubject(sel.length ? [sel[sel.length - 1]] : [])}
                  singleSelect
                  disabled={generating}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Fundamental Rights, Ancient History, Climate Change"
                  className={`w-full px-4 py-2.5 rounded-lg border ${inputCls}`}
                  disabled={generating}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "moderate" | "hard")}
                  disabled={generating}
                  className={`px-3 py-2 rounded-lg border text-sm capitalize ${inputCls}`}
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Patterns to include
                </label>
                <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Equal weightage: 50 questions split evenly across selected patterns (all 10 selected = 5 each).
                  Leave all selected for the full UPSC mix, or choose specific patterns.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {PRELIM_MOCK_PATTERNS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patternsToInclude.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setPatternsToInclude((prev) => [...prev, p.id]);
                          else setPatternsToInclude((prev) => prev.filter((id) => id !== p.id));
                        }}
                        disabled={generating}
                        className="rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={generating || !subject[0] || !topic.trim() || patternsToInclude.length === 0} className="w-full sm:w-auto">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Test (50 Questions)
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Assign */}
      {activeTest && (
        <div className="space-y-4">
          {/* Generated test summary */}
          <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${isDark ? "bg-green-950/20 border-green-800/40" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className={`font-semibold ${isDark ? "text-green-200" : "text-green-800"}`}>
                  {activeTest.title}
                </p>
                <p className={`text-sm mt-0.5 ${isDark ? "text-green-300/70" : "text-green-700"}`}>
                  {activeTest.totalQuestions} questions · {activeTest.difficulty} · {activeTest.subject}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={resetFlow} disabled={assigning}>
              Generate New Test
            </Button>
          </div>

          <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Step 2 — {isEditMode ? "Edit Assignment" : "Assign to Students"}
              </CardTitle>
              <CardDescription>
                {isEditMode
                  ? "Add or remove students. Students who already started cannot be removed."
                  : "Search and select students. Only assigned students will see this test on Practice Test."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected chips */}
              {selectedStudents.length > 0 && (
                <div className={`rounded-lg border p-3 ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-blue-50/50 border-blue-200"}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Selected ({selectedStudents.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map((s) => (
                      <span
                        key={s._id}
                        className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-medium ${
                          isDark ? "bg-blue-500/20 text-blue-200 border border-blue-500/30" : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {s.name}
                        {!lockedStudentIds.has(s._id) && (
                          <button
                            type="button"
                            onClick={() => toggleStudent(s._id)}
                            className="p-0.5 rounded-full hover:bg-black/10"
                            aria-label={`Remove ${s.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search + bulk actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm ${inputCls}`}
                    disabled={assigning || studentsLoading}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={selectAllVisible} disabled={assigning || filteredStudents.length === 0}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} disabled={assigning || selectedStudentIds.size === 0}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Student grid */}
              {studentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className={`text-center py-12 rounded-lg border ${isDark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
                  <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {studentSearch ? "No students match your search." : "No students found."}
                  </p>
                </div>
              ) : (
                <div className={`rounded-xl border overflow-hidden ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className={`px-4 py-2.5 text-xs font-medium flex justify-between ${isDark ? "bg-slate-900/60 text-slate-400 border-b border-slate-700" : "bg-slate-50 text-slate-600 border-b border-slate-200"}`}>
                    <span>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</span>
                    <span>{selectedStudentIds.size} selected</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:gap-px sm:bg-slate-200/50 sm:dark:bg-slate-700/50">
                      {filteredStudents.map((s) => {
                        const selected = selectedStudentIds.has(s._id);
                        const locked = lockedStudentIds.has(s._id);
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => toggleStudent(s._id)}
                            disabled={assigning || locked}
                            title={locked ? "This student already started — cannot remove" : undefined}
                            className={`flex items-center gap-3 text-left px-4 py-3 transition-colors w-full ${
                              locked
                                ? isDark ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 cursor-not-allowed" : "bg-amber-50 ring-1 ring-inset ring-amber-300 cursor-not-allowed"
                                : selected
                                ? isDark ? "bg-blue-500/15 ring-1 ring-inset ring-blue-500/40" : "bg-blue-50 ring-1 ring-inset ring-blue-300"
                                : isDark ? "bg-slate-800/80 hover:bg-slate-800" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {studentInitial(s.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium truncate text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                                {s.name}
                                {locked && (
                                  <span className={`ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                                    started
                                  </span>
                                )}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {s.email}
                              </p>
                            </div>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border shrink-0 ${
                                selected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : isDark ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedStudentIds.size === 0}
                className="w-full sm:w-auto"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isEditMode
                  ? `Update Assignment (${selectedStudentIds.size} students)`
                  : `Assign to ${selectedStudentIds.size || ""} Selected Student${selectedStudentIds.size !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>All Practice Tests</CardTitle>
              <CardDescription>Generated tests — assign unassigned ones or review assigned.</CardDescription>
            </div>
            <div className="flex rounded-lg border overflow-hidden text-xs font-medium shrink-0">
              {(["all", "unassigned", "assigned"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setListFilter(f)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    listFilter === f
                      ? "bg-blue-600 text-white"
                      : isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filteredList.length === 0 ? (
            <p className={`text-sm py-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {listFilter === "all" ? "No practice tests yet. Generate one above." : `No ${listFilter} tests.`}
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredList.map((item) => (
                <li
                  key={item._id}
                  className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.title || `${item.subject} — ${item.topic}`}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === "ready"
                              ? "bg-green-500/20 text-green-400"
                              : item.status === "generating"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status === "ready" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.isAssigned
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-orange-500/20 text-orange-400"
                            }`}
                          >
                            {item.isAssigned ? "Assigned" : "Not assigned"}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {item.totalQuestions} Q · {item.difficulty} · {formatDate(item.createdAt)}
                      </p>
                      {item.isAssigned && item.assignedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.assignedStudents.map((s) => (
                            <span
                              key={s._id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"}`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isDark ? "bg-slate-600" : "bg-slate-300"}`}>
                                {studentInitial(s.name)}
                              </span>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.status === "failed" && item.errorMessage && (
                        <p className="text-xs text-red-400 mt-1">{item.errorMessage}</p>
                      )}
                      {item.attemptCount > 0 && (
                        <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                          {item.attemptCount} attempt(s) started
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "ready" && !item.isAssigned && item.attemptCount === 0 && (
                        <Button type="button" variant="default" onClick={() => startAssignFlow(item)}>
                          <UserPlus className="w-4 h-4 mr-1.5" />
                          Assign
                        </Button>
                      )}
                      {item.status === "ready" && item.isAssigned && (
                        <Button type="button" variant="outline" onClick={() => startEditAssignFlow(item)}>
                          <Pencil className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDeleteId(item._id)}
                        disabled={!!deletingId || item.attemptCount > 0}
                        title={item.attemptCount > 0 ? "Cannot delete after students have started" : "Delete"}
                        className={isDark ? "border-red-800 text-red-400 hover:bg-red-950/30" : "border-red-200 text-red-600 hover:bg-red-50"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {deleteId && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? "bg-black/70" : "bg-black/50"}`} onClick={() => setDeleteId(null)}>
          <div
            className={`rounded-xl border p-6 max-w-sm w-full shadow-xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>Delete this practice test?</p>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>This cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={!!deletingId}>Cancel</Button>
              <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(deleteId)} disabled={!!deletingId}>
                {deletingId === deleteId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
