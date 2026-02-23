import { Link, useParams } from "react-router-dom";
import { useASI24Auth } from "../../hooks/useASI24Auth";
import { useTheme } from "../../hooks/useTheme";
import { getExamLabel, isValidExamSlug } from "../../constants/exams";
import {
  Sparkles,
  FileQuestion,
  BarChart3,
  BookOpen,
  Target,
} from "lucide-react";
import { Navigate } from "react-router-dom";

export function ASI24DashboardPage() {
  const { examSlug } = useParams<{ examSlug: string }>();
  const { student } = useASI24Auth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  if (!student || student.examType !== examSlug) {
    return <Navigate to={`/${examSlug}/login`} replace />;
  }

  const examName = getExamLabel(examSlug);
  const base = `/${examSlug}/dashboard`;

  const quickLinks = [
    { to: `${base}/ai-tests`, icon: Sparkles, label: "AI Question Generator", desc: "Generate custom mock tests" },
    { to: `${base}/mock-tests`, icon: BookOpen, label: "Available Mock Tests", desc: "Full-length & sectional" },
    { to: `${base}/pyq`, icon: FileQuestion, label: "Previous Year Papers", desc: "PYQs with solutions" },
    { to: `${base}/performance`, icon: BarChart3, label: "Performance Analytics", desc: "Scores & weak areas" },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className={`text-2xl font-semibold md:text-3xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Welcome, {student.name}
        </h1>
        <p className={`mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {examName} • Your preparation dashboard
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className={`group rounded-2xl border p-6 transition ${
              isDark
                ? "border-purple-800/40 bg-slate-900/50 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-purple-900/20"
                : "border-slate-200 bg-white shadow-md hover:border-fuchsia-400/60 hover:shadow-lg"
            }`}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-fuchsia-500/20 text-fuchsia-400 group-hover:bg-fuchsia-500/30" : "bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{label}</h3>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</p>
          </Link>
        ))}
      </div>

      <section className={`rounded-2xl border p-6 md:p-8 ${isDark ? "border-purple-800/40 bg-slate-900/40" : "border-slate-200 bg-white shadow-md"}`}>
        <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <Target className={`h-5 w-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} />
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`${base}/ai-tests`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:from-fuchsia-400 hover:to-violet-500 transition"
          >
            <Sparkles className="h-4 w-4" />
            AI Mock Test Generator
          </Link>
          <Link
            to={`${base}/pyq`}
            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition ${
              isDark ? "border-purple-600/50 bg-black/40 text-slate-200 hover:bg-purple-950/50" : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            Previous Year Papers
          </Link>
          <Link
            to={`${base}/performance`}
            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition ${
              isDark ? "border-purple-600/50 bg-black/40 text-slate-200 hover:bg-purple-950/50" : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Performance Analytics
          </Link>
        </div>
      </section>

      <section className={`rounded-2xl border p-6 md:p-8 ${isDark ? "border-purple-800/30 bg-slate-900/30" : "border-slate-200 bg-white shadow-md"}`}>
        <h2 className={`mb-4 text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Available Mock Tests</h2>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Full-length and sectional mocks will appear here. Use the AI Question Generator to create custom tests.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={`${base}/mock-tests`}
            className={`rounded-lg px-4 py-2 text-sm transition ${isDark ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            View mock tests →
          </Link>
        </div>
      </section>
    </div>
  );
}
