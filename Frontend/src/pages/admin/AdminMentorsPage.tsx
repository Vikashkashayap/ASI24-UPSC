import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { adminAPI, mentorStaffAPI } from "../../services/api";
import { UserCheck, UserPlus, Check } from "lucide-react";

type MentorRow = {
  _id: string;
  name: string;
  email: string;
  assignedStudentCount: number;
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

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        adminAPI.getMentors(),
        adminAPI.getStudents({ page: 1, limit: 100 }),
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

  const sub = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputCls =
    theme === "dark"
      ? "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
          Mentors
        </h1>
        <p className={`mt-1 text-sm ${sub}`}>
          Create mentor logins and assign students from your admin-created roster.
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
                <p className={`text-xs font-medium mb-2 ${sub}`}>Students (admin-created list)</p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700/50 divide-y divide-slate-700/30">
                  {students.length === 0 ? (
                    <p className={`p-4 text-sm ${sub}`}>No students in the free/admin-created list.</p>
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
  );
};
