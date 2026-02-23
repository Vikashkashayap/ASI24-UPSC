import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { asi24AuthAPI } from "../../services/api";
import { useASI24Auth } from "../../hooks/useASI24Auth";
import { useTheme } from "../../hooks/useTheme";
import { ASI24Navbar } from "../../components/asi24/ASI24Navbar";
import { LandingLayout } from "../../layouts/LandingLayout";
import { getExamLabel, isValidExamSlug } from "../../constants/exams";
import { Navigate } from "react-router-dom";

export function ASI24RegisterPage() {
  const { examSlug } = useParams<{ examSlug: string }>();
  const { login } = useASI24Auth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (loading) return;
    setLoading(true);
    try {
      const res = await asi24AuthAPI.register(examSlug, { name: name.trim(), email: email.trim(), password });
      login(res.data.student, res.data.token, examSlug);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingLayout>
      <ASI24Navbar />
      <main className={`min-h-screen pt-12 md:pt-14 ${isDark ? "asi24-gradient" : "bg-slate-50"}`}>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
          <div className={`rounded-2xl border p-6 shadow-xl md:p-8 ${isDark ? "border-purple-800/50 bg-slate-900/60 shadow-purple-900/20" : "border-slate-200 bg-white shadow-slate-200/50"}`}>
            <h1 className={`mb-1 text-xl font-semibold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              {examSlug === "upsc" ? "Create your UPSC lab" : "Create account"}
            </h1>
            <p className={`mb-6 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {examSlug === "upsc" ? "Onboard once, then practice like a topper every day." : `Register for ${getExamLabel(examSlug)} preparation`}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`mb-1 block text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[44px] ${isDark ? "border-purple-700/50 bg-slate-950/80 text-slate-100 focus:border-fuchsia-500/50" : "border-slate-300 bg-white text-slate-900 focus:border-purple-400"}`}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className={`mb-1 block text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[44px] ${isDark ? "border-purple-700/50 bg-slate-950/80 text-slate-100 focus:border-fuchsia-500/50" : "border-slate-300 bg-white text-slate-900 focus:border-purple-400"}`}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className={`mb-1 block text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-h-[44px] ${isDark ? "border-purple-700/50 bg-slate-950/80 text-slate-100 focus:border-fuchsia-500/50" : "border-slate-300 bg-white text-slate-900 focus:border-purple-400"}`}
                  placeholder="Min 6 characters"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-fuchsia-400 hover:to-violet-500 disabled:opacity-70 min-h-[44px]"
              >
                {loading ? "Creating account..." : "Register"}
              </button>
            </form>
            <p className={`mt-6 text-center text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Already have an account?{" "}
              <Link to={`/${examSlug}/login`} className="font-medium text-fuchsia-500 hover:text-fuchsia-600">
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </LandingLayout>
  );
}
