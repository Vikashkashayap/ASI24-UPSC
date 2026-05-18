import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { adminAPI, mentorStaffAPI } from "../../services/api";
import { UserCheck, UserPlus, Check, Users, ChevronDown, KeyRound, Trash2 } from "lucide-react";

type MentorRow = {
  _id: string;
  name: string;
  email: string;
  assignedStudentCount: number;
  assignedStudents: { _id: string; name: string; email: string }[];
};

type StudentRow = {
  _id: string;
  name: string;
  email: string;
};

export const AdminMentorsPage: React.FC = () => {
  const { theme } = useTheme();
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdPw, setCreatedPw] = useState<string | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  /** Which mentor row is expanded in "Current assignments" (accordion). */
  const [openAssignmentMentorId, setOpenAssignmentMentorId] = useState<string | null>(null);
  const [mentorActionId, setMentorActionId] = useState<string | null>(null);
  const [mentorResetPw, setMentorResetPw] = useState<{ mentorName: string; password: string } | null>(
    null
  );

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        adminAPI.getMentors(),
        adminAPI.getStudents({ page: 1, limit: 10000, mentorPicker: true }),
      ]);
      if (mRes.data?.success) {
        setMentors(mRes.data.data.mentors || []);
      }
      if (sRes.data?.success) {
        setStudents(sRes.data.data.students || []);
      }
    } catch {
      setMessage({ type: "err", text: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim()) return;
    setCreating(true);
    setMessage(null);
    setCreatedPw(null);
    try {
      const res = await mentorStaffAPI.createMentor({ name: createName.trim(), email: createEmail.trim() });
      if (res.data?.success) {
        setCreatedPw(res.data.data?.tempPassword || null);
        setCreateName("");
        setCreateEmail("");
        setMessage({ type: "ok", text: "Mentor created. Share the temporary password securely." });
        await load();
      }
    } catch (err: unknown) {
      setMessage({
        type: "err",
        text: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Create failed",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId || selectedStudentIds.size === 0) {
      setMessage({ type: "err", text: "Pick a mentor and at least one student." });
      return;
    }
    setAssigning(true);
    setMessage(null);
    try {
      const res = await mentorStaffAPI.assignStudents({
        mentorUserId: selectedMentorId,
        studentIds: Array.from(selectedStudentIds),
      });
      if (res.data?.success) {
        setMessage({ type: "ok", text: "Students assigned." });
        setSelectedStudentIds(new Set());
        await load();
      }
    } catch (err: unknown) {
      setMessage({
        type: "err",
        text: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Assign failed",
      });
    } finally {
      setAssigning(false);
    }
  };

  const resetMentorPassword = async (m: MentorRow) => {
    setMentorActionId(m._id);
    setMessage(null);
    setMentorResetPw(null);
    try {
      const res = await adminAPI.resetMentorPassword(m._id);
      const pw = res.data?.data?.tempPassword;
      if (res.data?.success && pw) {
        setMentorResetPw({ mentorName: m.name, password: pw });
        setMessage({
          type: "ok",
          text: `Temporary password for ${m.name} is shown in the Current assignments panel. Share it securely.`,
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "err",
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Could not reset password",
      });
    } finally {
      setMentorActionId(null);
    }
  };

  const removeMentor = async (m: MentorRow) => {
    if (
      !window.confirm(
        `Remove mentor "${m.name}"? Their account will be deleted and assigned students will be unlinked from this mentor.`
      )
    ) {
      return;
    }
    setMentorActionId(m._id);
    setMessage(null);
    try {
      const res = await adminAPI.deleteMentor(m._id);
      if (res.data?.success) {
        setMentorResetPw(null);
        if (selectedMentorId === m._id) setSelectedMentorId("");
        if (openAssignmentMentorId === m._id) setOpenAssignmentMentorId(null);
        setMessage({ type: "ok", text: "Mentor account removed." });
        await load();
      }
    } catch (err: unknown) {
      setMessage({
        type: "err",
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Could not remove mentor",
      });
    } finally {
      setMentorActionId(null);
    }
  };

  const sub = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputCls =
    theme === "dark"
      ? "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";

  const borderMuted =
    theme === "dark" ? "border-slate-700/80" : "border-slate-200";

  return (
    <div className="max-w-7xl">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
        <div className="space-y-8 min-w-0">
      <div>
        <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
          Mentors
        </h1>
        <p className={`mt-1 text-sm ${sub}`}>
          Create mentor logins and assign any registered student from the full roster.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create mentor account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createMentor} className="space-y-4 max-w-md">
            <div>
              <label className={`text-xs font-medium ${sub}`}>Name</label>
              <input className={`mt-1 ${inputCls}`} value={createName} onChange={(e) => setCreateName(e.target.value)} required />
            </div>
            <div>
              <label className={`text-xs font-medium ${sub}`}>Email</label>
              <input
                type="email"
                className={`mt-1 ${inputCls}`}
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create mentor"}
            </Button>
            {createdPw && (
              <p className={`text-sm ${theme === "dark" ? "text-amber-200" : "text-amber-800"}`}>
                Temporary password: <code className="font-mono">{createdPw}</code>
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Assign students to mentor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className={`text-sm ${sub}`}>Loading…</p>
          ) : (
            <form onSubmit={assign} className="space-y-4">
              <div className="max-w-md">
                <label className={`text-xs font-medium ${sub}`}>Mentor</label>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  required
                >
                  <option value="">Select mentor…</option>
                  {mentors.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.email}) — {m.assignedStudentCount} students
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className={`text-xs font-medium mb-2 ${sub}`}>All registered students</p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700/50 divide-y divide-slate-700/30">
                  {students.length === 0 ? (
                    <p className={`p-4 text-sm ${sub}`}>No registered students found.</p>
                  ) : (
                    students.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => toggleStudent(s._id)}
                        className={`w-full flex items-center gap-3 text-left px-3 py-2.5 text-sm ${
                          selectedStudentIds.has(s._id)
                            ? theme === "dark"
                              ? "bg-blue-500/15"
                              : "bg-blue-50"
                            : "hover:bg-slate-800/30"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            selectedStudentIds.has(s._id)
                              ? "bg-blue-500 border-blue-500 text-white"
                              : theme === "dark"
                                ? "border-slate-600"
                                : "border-slate-300"
                          }`}
                        >
                          {selectedStudentIds.has(s._id) && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span>
                          <span className="font-medium">{s.name}</span>
                          <span className={`block text-xs ${sub}`}>{s.email}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <Button type="submit" disabled={assigning}>
                {assigning ? "Assigning…" : "Assign selected students"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
        </div>

        <aside className="mt-8 lg:mt-0 lg:sticky lg:top-6 space-y-3">
          <Card className={`${theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <Users className="w-4 h-4 shrink-0" />
                Current assignments
              </CardTitle>
              <p className={`text-xs font-normal ${sub} pt-1`}>
                Expand a row for details. Use the key to reset login password, trash to remove the mentor.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {mentorResetPw && (
                <div
                  className={`mb-3 rounded-lg border px-2.5 py-2 text-xs ${
                    theme === "dark"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
                      : "border-amber-300 bg-amber-50 text-amber-950"
                  }`}
                >
                  <p className="font-medium">New password — {mentorResetPw.mentorName}</p>
                  <code className="mt-1 block font-mono text-[11px] break-all">{mentorResetPw.password}</code>
                </div>
              )}
              {loading ? (
                <p className={`text-sm ${sub}`}>Loading…</p>
              ) : mentors.length === 0 ? (
                <p className={`text-sm ${sub}`}>No mentors yet. Create one above.</p>
              ) : (
                <div className="max-h-[min(70vh,520px)] overflow-y-auto space-y-2 pr-1">
                  {mentors.map((m) => {
                    const open = openAssignmentMentorId === m._id;
                    const count = m.assignedStudentCount ?? m.assignedStudents?.length ?? 0;
                    return (
                      <div
                        key={m._id}
                        className={`rounded-lg border ${borderMuted} overflow-hidden ${theme === "dark" ? "bg-slate-950/40" : "bg-slate-50/80"}`}
                      >
                        <div className="flex items-stretch min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAssignmentMentorId((prev) => (prev === m._id ? null : m._id))
                            }
                            className={`flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                              theme === "dark" ? "hover:bg-slate-800/50" : "hover:bg-slate-100/90"
                            }`}
                            aria-expanded={open}
                          >
                            <span
                              className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                            >
                              {m.name}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs tabular-nums ${sub}`}>
                                {count === 1 ? "1 student" : `${count} students`}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 ${sub} transition-transform duration-200 ${
                                  open ? "rotate-180" : ""
                                }`}
                                aria-hidden
                              />
                            </span>
                          </button>
                          <div
                            className={`flex flex-row items-center gap-0.5 shrink-0 border-l pl-1 pr-1.5 py-1.5 ${
                              theme === "dark" ? "border-slate-700/80" : "border-slate-200"
                            }`}
                          >
                            <button
                              type="button"
                              title="Reset password"
                              disabled={mentorActionId === m._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                resetMentorPassword(m);
                              }}
                              className={`rounded p-1.5 transition-colors disabled:opacity-40 ${
                                theme === "dark"
                                  ? "text-slate-300 hover:bg-slate-700/80 hover:text-white"
                                  : "text-slate-600 hover:bg-slate-200/90"
                              }`}
                            >
                              <KeyRound className="w-4 h-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Remove mentor"
                              disabled={mentorActionId === m._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMentor(m);
                              }}
                              className={`rounded p-1.5 transition-colors disabled:opacity-40 ${
                                theme === "dark"
                                  ? "text-red-400 hover:bg-red-500/15"
                                  : "text-red-600 hover:bg-red-50"
                              }`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                        {open && (
                          <div
                            className={`border-t px-3 pb-3 pt-1 border-slate-200 dark:border-slate-600/50 ${
                              theme === "dark" ? "bg-slate-950/60" : "bg-white/60"
                            }`}
                          >
                            <p className={`text-xs truncate pb-2 ${sub}`}>{m.email}</p>
                            <ul className="space-y-1.5">
                              {(m.assignedStudents?.length ?? 0) === 0 ? (
                                <li className={`text-xs italic ${sub}`}>No students assigned</li>
                              ) : (
                                m.assignedStudents.map((s) => (
                                  <li key={s._id} className="text-xs leading-snug">
                                    <span
                                      className={theme === "dark" ? "text-slate-200" : "text-slate-800"}
                                    >
                                      {s.name}
                                    </span>
                                    <span className={`block truncate ${sub}`}>{s.email}</span>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};
