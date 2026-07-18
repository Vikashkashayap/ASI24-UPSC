import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import {
  adminAPI,
  syllabusTargetsAPI,
  type SyllabusCatalogModule,
  type SyllabusCatalogSubject,
  type SyllabusModuleTargetItem,
} from "../../services/api";
import type { SyllabusToTopicPracticeHandoff } from "../../utils/syllabusTopicPracticeHandoff";

interface StudentRow {
  _id: string;
  name: string;
  email: string;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const SyllabusTargetsAdminPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<SyllabusCatalogSubject[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [subjectDetail, setSubjectDetail] = useState<{
    key: string;
    name: string;
    primarySource?: string;
    sourceNote?: string | null;
    duration?: string | null;
    chips?: string[];
  } | null>(null);
  const [modules, setModules] = useState<SyllabusCatalogModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [moduleSearch, setModuleSearch] = useState("");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [list, setList] = useState<SyllabusModuleTargetItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [listPagination, setListPagination] = useState<{
    page: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const surface = isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const text = isDark ? "text-slate-100" : "text-slate-900";
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"
  }`;

  const loadCatalog = useCallback(async () => {
    try {
      const res = await syllabusTargetsAPI.getCatalog();
      if (res.data.success) setSubjects(res.data.data.subjects || []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to load syllabus catalog";
      setError(String(msg));
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const res = await adminAPI.getStudents({ page: 1, limit: 10000, mentorPicker: true });
      if (res.data?.success) {
        setStudents(res.data.data.students || []);
      }
    } catch {
      setError("Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setListLoading(true);
      const res = await syllabusTargetsAPI.listAdmin({ page: listPage, limit: 10, filter: "active" });
      if (res.data.success) {
        setList(res.data.data.targets || []);
        setListPagination(res.data.data.pagination);
      }
    } catch {
      setError("Failed to load assigned targets");
    } finally {
      setListLoading(false);
    }
  }, [listPage]);

  useEffect(() => {
    loadCatalog();
    loadStudents();
  }, [loadCatalog, loadStudents]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!subjectKey) {
      setModules([]);
      setSubjectDetail(null);
      setSelectedModuleIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setModulesLoading(true);
        const res = await syllabusTargetsAPI.getSubjectModules(subjectKey);
        if (!cancelled && res.data.success) {
          setSubjectDetail(res.data.data.subject || null);
          setModules(res.data.data.modules || []);
          setSelectedModuleIds(new Set());
        }
      } catch {
        if (!cancelled) setError("Failed to load modules");
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectKey]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.moduleName.toLowerCase().includes(q) ||
        m.moduleId.toLowerCase().includes(q) ||
        String(m.sequence ?? "").includes(q)
    );
  }, [modules, moduleSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const toggleModule = (id: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllModules = () => {
    setSelectedModuleIds(new Set(filteredModules.map((m) => m.moduleId)));
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(filteredStudents.map((s) => s._id)));
  };

  const handleAssign = async () => {
    setError(null);
    setSuccess(null);
    if (!subjectKey) {
      setError("Select a subject first");
      return;
    }
    if (selectedModuleIds.size === 0) {
      setError("Select at least one module");
      return;
    }
    if (selectedStudentIds.size === 0) {
      setError("Select at least one student");
      return;
    }

    try {
      setAssigning(true);
      const res = await syllabusTargetsAPI.assign({
        subjectKey,
        moduleIds: [...selectedModuleIds],
        studentIds: [...selectedStudentIds],
        dueDate: dueDate || null,
        note: note.trim() || undefined,
      });
      if (res.data.success) {
        setSuccess(res.data.message || "Modules assigned");
        setSelectedModuleIds(new Set());
        setNote("");
        setDueDate("");
        setListPage(1);
        await loadList();
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Assignment failed";
      setError(String(msg));
    } finally {
      setAssigning(false);
    }
  };

  /** Send selected modules → Topic Practice so admin can generate & assign MCQs. */
  const handleAddToTopicPractice = () => {
    setError(null);
    setSuccess(null);
    if (!subjectKey) {
      setError("Select a subject first");
      return;
    }
    if (selectedModuleIds.size === 0) {
      setError("Select at least one module to add to Topic Practice");
      return;
    }

    const selected = modules.filter((m) => selectedModuleIds.has(m.moduleId));
    if (selected.length === 0) {
      setError("Selected modules not found — reload the subject and try again");
      return;
    }

    const subjectName = subjectDetail?.name || selectedSubject?.name || subjectKey;
    const chapterNames = selected.flatMap((m) => {
      const fromChapters = (m.chapters || []).map((c) => String(c.name || "").trim()).filter(Boolean);
      if (fromChapters.length) return fromChapters;
      return (m.topics || []).map((t) => String(t.topicName || "").trim()).filter(Boolean);
    });
    const moduleLabels = selected.map((m) => `${m.moduleId} ${m.moduleName}`.trim());

    // Prefer chapter/topic names for RAG; fall back to module titles if too long / empty
    let topicKeyword = chapterNames.join(" · ");
    if (!topicKeyword || topicKeyword.length > 220) {
      topicKeyword = moduleLabels.join(" · ");
    }

    const testName =
      selected.length === 1
        ? `${subjectName} — ${selected[0].moduleId} ${selected[0].moduleName}`
        : `${subjectName} — ${selected.map((m) => m.moduleId).join(", ")}`;

    const handoff: SyllabusToTopicPracticeHandoff = {
      fromSyllabusTargets: true,
      subjectKey,
      subjectName,
      topicKeyword,
      testName,
      moduleIds: selected.map((m) => m.moduleId),
      moduleLabels,
      chapterNames,
      studentIds: [...selectedStudentIds],
    };

    navigate("/admin/topic-practice", { state: handoff });
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await syllabusTargetsAPI.delete(id);
      setSuccess("Target removed");
      await loadList();
    } catch {
      setError("Failed to delete target");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedSubject = subjects.find((s) => s.key === subjectKey);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-3 md:px-6 pb-8">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold ${text}`}>Syllabus Targets</h1>
        <p className={`mt-1 text-sm ${muted}`}>
          MentorsDaily Foundation Plan (CSE 2028) — subject → module → chapters, with study days. Assign modules to students for their home dashboard.
        </p>
      </div>

      {(error || success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            error
              ? isDark
                ? "border-red-900/50 bg-red-950/40 text-red-200"
                : "border-red-200 bg-red-50 text-red-800"
              : isDark
                ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{error || success}</span>
          <button type="button" onClick={() => { setError(null); setSuccess(null); }} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card className={`border ${surface}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-lg ${text}`}>
            <Target className="w-5 h-5" />
            Assign modules
          </CardTitle>
          <CardDescription>
            Pick a subject → select modules → choose students → assign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${muted}`}>
                Subject
              </label>
              <select
                className={inputClass}
                value={subjectKey}
                onChange={(e) => setSubjectKey(e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} — {s.moduleCount} modules
                    {s.duration ? ` · ${s.duration}` : ""}
                  </option>
                ))}
              </select>
              {selectedSubject?.primarySource && (
                <p className={`mt-1.5 text-xs ${muted}`}>
                  Source: {selectedSubject.primarySource}
                  {selectedSubject.duration ? ` · ${selectedSubject.duration}` : ""}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${muted}`}>
                  Due date (optional)
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${muted}`}>
                  Mentor note
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Finish before Sunday test"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {subjectDetail && (
            <div
              className={`rounded-xl border-l-[5px] border-l-[#1f4e79] border px-5 py-4 ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <h2 className={`text-lg font-semibold ${text}`}>{subjectDetail.name}</h2>
              {subjectDetail.primarySource && (
                <p className={`text-sm mt-1 ${muted}`}>{subjectDetail.primarySource}</p>
              )}
              {subjectDetail.chips && subjectDetail.chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {subjectDetail.chips.map((chip) => {
                    const isGreen = /month|week/i.test(chip);
                    const isGold = /test|flt|×/i.test(chip);
                    return (
                      <span
                        key={chip}
                        className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          isGreen
                            ? isDark
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-[#e9f4ef] text-[#2e7d5b]"
                            : isGold
                              ? isDark
                                ? "bg-amber-950 text-amber-300"
                                : "bg-[#faf4e6] text-[#b98a2e]"
                              : isDark
                                ? "bg-sky-950 text-sky-300"
                                : "bg-[#eaf1f8] text-[#1f4e79]"
                        }`}
                      >
                        {chip}
                      </span>
                    );
                  })}
                </div>
              )}
              {subjectDetail.sourceNote && (
                <div
                  className={`mt-3 text-[12.5px] rounded-lg px-3 py-2 ${
                    isDark ? "bg-amber-950/40 text-amber-200" : "bg-[#faf4e6] text-[#b98a2e]"
                  }`}
                >
                  {subjectDetail.sourceNote}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            {/* Modules — MentorsDaily card layout */}
            <div className={`rounded-xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className={`w-4 h-4 ${muted}`} />
                  <span className={`text-sm font-semibold ${text}`}>
                    Modules {selectedModuleIds.size > 0 ? `(${selectedModuleIds.size} selected)` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={`text-xs ${muted} hover:underline`} onClick={selectAllModules} disabled={!filteredModules.length}>
                    Select all
                  </button>
                  <button type="button" className={`text-xs ${muted} hover:underline`} onClick={() => setSelectedModuleIds(new Set())}>
                    Clear
                  </button>
                </div>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 ${muted}`} />
                  <input
                    className={`${inputClass} pl-8`}
                    placeholder="Search modules…"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    disabled={!subjectKey}
                  />
                </div>
                <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1">
                  {!subjectKey && (
                    <p className={`text-sm px-2 py-6 text-center ${muted}`}>Select a subject to load modules</p>
                  )}
                  {subjectKey && modulesLoading && (
                    <div className={`flex items-center justify-center gap-2 py-8 text-sm ${muted}`}>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading modules…
                    </div>
                  )}
                  {subjectKey && !modulesLoading && filteredModules.length === 0 && (
                    <p className={`text-sm px-2 py-6 text-center ${muted}`}>No modules found</p>
                  )}
                  {filteredModules.map((m) => {
                    const checked = selectedModuleIds.has(m.moduleId);
                    const chapters = m.chapters || m.topics?.map((t) => ({
                      chapter: t.chapter || "",
                      name: t.topicName,
                    })) || [];
                    const duration =
                      m.durationLabel ||
                      (m.estimatedHours != null && m.estimatedDays != null
                        ? `~${m.estimatedHours} h · ${m.estimatedDays} days`
                        : null);
                    return (
                      <div
                        key={m.moduleId}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleModule(m.moduleId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleModule(m.moduleId);
                          }
                        }}
                        className={`rounded-xl border overflow-hidden cursor-pointer transition ${
                          checked
                            ? isDark
                              ? "border-sky-600 ring-2 ring-sky-700/40 bg-slate-950"
                              : "border-sky-400 ring-2 ring-sky-200 bg-white"
                            : isDark
                              ? "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                              : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="px-4 py-3 flex items-start gap-3 flex-wrap">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "bg-sky-600 border-sky-600 text-white"
                                : isDark
                                  ? "border-slate-600"
                                  : "border-slate-300"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#1f4e79] text-white text-xs font-bold px-2 py-1 shrink-0">
                            {m.moduleId}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[14.5px] font-semibold leading-snug ${text}`}>
                              {m.moduleName}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m.chapterRange && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isDark ? "bg-sky-950 text-sky-300" : "bg-[#eaf1f8] text-[#1f4e79]"
                                }`}>
                                  {m.chapterRange}
                                </span>
                              )}
                              {duration && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isDark ? "bg-emerald-950 text-emerald-300" : "bg-[#e9f4ef] text-[#2e7d5b]"
                                }`}>
                                  {duration}
                                </span>
                              )}
                              {(m.testLabel || m.hasModuleTest) && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isDark ? "bg-amber-950 text-amber-300" : "bg-[#faf4e6] text-[#b98a2e]"
                                }`}>
                                  {m.testLabel || "Test: 50 Q"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {chapters.length > 0 && (
                          <div className={`border-t px-4 py-2 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className={muted}>
                                  <th className="text-left font-semibold text-[11px] uppercase tracking-wide py-1.5 w-12">Ch</th>
                                  <th className="text-left font-semibold text-[11px] uppercase tracking-wide py-1.5">Chapter / Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {chapters.map((ch, idx) => (
                                  <tr key={`${m.moduleId}-${ch.chapter || idx}`} className={isDark ? "border-t border-slate-800/80" : "border-t border-slate-100"}>
                                    <td className={`py-1.5 align-top font-medium ${text}`}>{ch.chapter || idx + 1}</td>
                                    <td className={`py-1.5 align-top ${isDark ? "text-slate-300" : "text-slate-700"}`}>{ch.name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {m.focus ? (
                              <div className={`mt-2 mb-1 rounded-lg px-3 py-2 text-[13px] ${
                                isDark ? "bg-slate-900 text-slate-400" : "bg-[#f6f8fa] text-[#5a6a7e]"
                              }`}>
                                <b className={text}>Focus:</b> {m.focus}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Students */}
            <div className={`rounded-xl border h-fit lg:sticky lg:top-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <Users className={`w-4 h-4 ${muted}`} />
                  <span className={`text-sm font-semibold ${text}`}>
                    Students {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={`text-xs ${muted} hover:underline`} onClick={selectAllStudents} disabled={!filteredStudents.length}>
                    Select all
                  </button>
                  <button type="button" className={`text-xs ${muted} hover:underline`} onClick={() => setSelectedStudentIds(new Set())}>
                    Clear
                  </button>
                </div>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 ${muted}`} />
                  <input
                    className={`${inputClass} pl-8`}
                    placeholder="Search students…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[520px] overflow-y-auto space-y-1">
                  {studentsLoading && (
                    <div className={`flex items-center justify-center gap-2 py-8 text-sm ${muted}`}>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
                    </div>
                  )}
                  {!studentsLoading && filteredStudents.length === 0 && (
                    <p className={`text-sm px-2 py-6 text-center ${muted}`}>No students found</p>
                  )}
                  {filteredStudents.map((s) => {
                    const checked = selectedStudentIds.has(s._id);
                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => toggleStudent(s._id)}
                        className={`w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2.5 transition ${
                          checked
                            ? isDark
                              ? "bg-sky-950/50 ring-1 ring-sky-700/60"
                              : "bg-sky-50 ring-1 ring-sky-200"
                            : isDark
                              ? "hover:bg-slate-800/60"
                              : "hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "bg-sky-600 border-sky-600 text-white"
                              : isDark
                                ? "border-slate-600"
                                : "border-slate-300"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${text}`}>{s.name}</span>
                          <span className={`block text-xs truncate ${muted}`}>{s.email}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddToTopicPractice}
              disabled={assigning || selectedModuleIds.size === 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Add to Topic Practice
              {selectedModuleIds.size > 0 ? ` (${selectedModuleIds.size})` : ""}
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={assigning}
              className="gap-2"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Assign to students
            </Button>
          </div>
          {selectedModuleIds.size > 0 && (
            <p className={`text-xs text-right ${muted}`}>
              Topic Practice opens with selected chapter topics prefilled — generate MCQs and send to students there.
              {selectedStudentIds.size > 0
                ? ` ${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? "" : "s"} will be pre-selected.`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={`border ${surface}`}>
        <CardHeader>
          <CardTitle className={`text-lg ${text}`}>Active assignments</CardTitle>
          <CardDescription>
            Modules currently assigned as student home targets
            {listPagination ? ` · ${listPagination.total} total` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className={`flex items-center justify-center gap-2 py-10 text-sm ${muted}`}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : list.length === 0 ? (
            <p className={`text-sm text-center py-10 ${muted}`}>No active syllabus targets yet</p>
          ) : (
            <div className="space-y-2">
              {list.map((item) => (
                <div
                  key={item._id}
                  className={`rounded-xl border px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    isDark ? "border-slate-800" : "border-slate-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${text}`}>
                      <span className={`mr-1.5 text-xs font-bold ${muted}`}>{item.moduleId}</span>
                      {item.subjectName} — {item.moduleName}
                    </div>
                    <div className={`text-xs mt-0.5 ${muted}`}>
                      {item.chapterRange || (item.topicCount ? `${item.topicCount} chapters` : "")}
                      {item.durationLabel
                        ? ` · ${item.durationLabel}`
                        : [
                            item.estimatedDays != null ? ` · ${item.estimatedDays} days` : "",
                            item.estimatedHours != null ? ` · ~${item.estimatedHours}h` : "",
                          ].join("")}
                      {item.assignedCount ? ` · ${item.assignedCount} student${item.assignedCount === 1 ? "" : "s"}` : ""}
                      {item.completedCount > 0 ? ` · ${item.completedCount} done` : ""}
                      {item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ""}
                    </div>
                    {item.note ? <div className={`text-xs mt-1 ${muted}`}>Note: {item.note}</div> : null}
                    {item.assignedStudents?.length > 0 && (
                      <div className={`text-xs mt-1 truncate ${muted}`}>
                        {item.assignedStudents
                          .slice(0, 4)
                          .map((s) => s.name)
                          .join(", ")}
                        {item.assignedStudents.length > 4
                          ? ` +${item.assignedStudents.length - 4} more`
                          : ""}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={deletingId === item._id}
                    onClick={() => handleDelete(item._id)}
                  >
                    {deletingId === item._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {listPagination && listPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!listPagination.hasPrev}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`text-sm ${muted}`}>
                Page {listPagination.page} / {listPagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!listPagination.hasNext}
                onClick={() => setListPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyllabusTargetsAdminPage;
