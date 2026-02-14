import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAPI } from "../../services/api";
import { Upload, FileSpreadsheet, Clock, Calendar, AlertCircle, CheckCircle, Trophy } from "lucide-react";

export const PrelimsTopperAdminPage = () => {
  const { theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [negativeMarking, setNegativeMarking] = useState("0.33");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Test title is required");
      return;
    }
    if (!file) {
      setError("Please upload an Excel (.xlsx) file");
      return;
    }
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 1) {
      setError("Duration must be a positive number (minutes)");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start time and end time are required");
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("excel", file);
      formData.append("title", title.trim());
      formData.append("durationMinutes", durationMinutes);
      formData.append("startTime", start.toISOString());
      formData.append("endTime", end.toISOString());
      formData.append("negativeMarking", negativeMarking);

      const res = await prelimsTopperAPI.createExcelTest(formData);
      if (res.data.success) {
        setSuccess(`Test "${res.data.data.title}" created with ${res.data.data.totalQuestions} questions.`);
        setFile(null);
        setTitle("");
        setDurationMinutes("60");
        setStartTime("");
        setEndTime("");
        setNegativeMarking("0.33");
      } else {
        setError(res.data.message || "Failed to create test");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"}`}>
          <Trophy className={`w-8 h-8 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prelims Topper</h1>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Create Excel-based scheduled tests for students
          </p>
        </div>
      </div>

      <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Create Excel Test
          </CardTitle>
          <CardDescription>
            Upload a structured Excel file. Columns: questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Test Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Polity Mock 1"
                className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                disabled={loading}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Excel File (.xlsx) *
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                  disabled={loading}
                />
                {file && (
                  <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {file.name}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration (minutes) *
                </label>
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Negative marking per wrong
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.value)}
                  placeholder="0.33"
                  className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Time *
                </label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  End Time *
                </label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${theme === "dark" ? "bg-red-950/50 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-800"}`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${theme === "dark" ? "bg-green-950/30 border border-green-800 text-green-300" : "bg-green-50 border border-green-200 text-green-800"}`}>
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !file || !title.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2" />
                  Creating Test...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
