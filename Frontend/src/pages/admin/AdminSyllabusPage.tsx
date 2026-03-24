import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { adminSyllabusAPI } from "../../services/api";
import { Table, Upload, Loader2, CheckCircle } from "lucide-react";

export default function AdminSyllabusPage() {
  const { theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Array<{ _id: string; label?: string; totalTopicRows?: number; createdAt?: string; isActive?: boolean }>>([]);

  const loadList = useCallback(async () => {
    try {
      const res = await adminSyllabusAPI.list();
      setList((res.data.data as typeof list) || []);
    } catch {
      setList([]);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose an Excel file");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await adminSyllabusAPI.upload(file, label || undefined);
      setMessage(res.data.message || "Uploaded");
      setFile(null);
      await loadList();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-3 md:px-4 py-4">
      <div className="flex items-center gap-3">
        <div className={theme === "dark" ? "bg-teal-500/20 p-2 rounded-lg" : "bg-teal-100 p-2 rounded-lg"}>
          <Table className={theme === "dark" ? "text-teal-400 w-6 h-6" : "text-teal-600 w-6 h-6"} />
        </div>
        <div>
          <h1 className={theme === "dark" ? "text-xl font-bold text-slate-50" : "text-xl font-bold text-slate-900"}>
            UPSC Syllabus (Excel)
          </h1>
          <p className={theme === "dark" ? "text-sm text-slate-400" : "text-sm text-slate-600"}>
            One sheet per subject. First row: <strong>Topic</strong> and optional <strong>Subtopic</strong> columns.
          </p>
        </div>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>Upload workbook</CardTitle>
          <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
            New upload becomes the active syllabus for student plan generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Label (optional)</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Prelims 2026"
                className={theme === "dark" ? "bg-slate-900 border-slate-600" : ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">File (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm w-full"
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {message && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {message}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>Recent uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">No syllabi yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {list.map((s) => (
                <li
                  key={s._id}
                  className={
                    "flex justify-between gap-2 rounded-lg border px-3 py-2 " +
                    (theme === "dark" ? "border-slate-600" : "border-slate-200")
                  }
                >
                  <span className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>
                    {s.label || "Syllabus"}{" "}
                    {s.isActive && (
                      <span className="text-emerald-500 text-xs font-semibold ml-1">ACTIVE</span>
                    )}
                  </span>
                  <span className="text-slate-500 shrink-0">{s.totalTopicRows ?? 0} topics</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
