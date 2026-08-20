import { FormEvent, useState, useEffect } from "react";

import { Link, useSearchParams } from "react-router-dom";

import {
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  Brain,
  BarChart3,
  BookOpen,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { api, apiBaseURL } from "../../services/api";
import { LandingNavbar } from "../../components/landing/Navbar";

export const LoginPage = () => {
  const [searchParams] = useSearchParams();

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");

    if (err) {
      setError(decodeURIComponent(err).replace(/\+/g, " "));
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");

    if (loading) return;

    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      login(res.data.user, res.data.token);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setError(
          "Too many login attempts. Please wait a moment and try again."
        );
      } else if (err?.response?.data?.code === "RATE_LIMIT") {
        setError(
          "Too many login attempts. Please wait a moment and try again."
        );
      } else {
        setError(
          err?.response?.data?.message || "Unable to login"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#020617] text-slate-50">
      {/* =========================================================
          NAVBAR
      ========================================================= */}

      <div className="sticky top-0 z-50">
        <LandingNavbar />
      </div>

      {/* =========================================================
          PAGE
      ========================================================= */}

      <main className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
        {/* Background */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 top-20 h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[140px]" />

          <div className="absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[150px]" />

          <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[100px]" />

          <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* =======================================================
            CONTENT
        ======================================================= */}

        <div className="relative mx-auto flex max-w-6xl items-center px-4 py-8 sm:px-6 sm:py-12 lg:min-h-[calc(100dvh-64px)] lg:py-16">
          <div className="grid w-full overflow-hidden rounded-[28px] border border-blue-400/15 bg-[#07152f]/90 shadow-2xl shadow-blue-950/30 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
            {/* =================================================
                LEFT SIDE
            ================================================= */}

            <div className="relative hidden overflow-hidden border-r border-blue-400/10 bg-gradient-to-br from-[#0b1f45] via-[#081a3a] to-[#06132c] p-8 lg:flex lg:flex-col xl:p-10">
              {/* Glow */}

              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

              <div className="relative">
                {/* Badge */}

                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  MentorsDaily Student Portal
                </div>

                {/* Heading */}

                <h1 className="max-w-md text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">
                  Welcome back,
                  <span className="mt-1 block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    Aspirant.
                  </span>
                </h1>

                <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
                  Continue your UPSC preparation from one focused workspace.
                  Practice, evaluate, analyse and improve without the noise.
                </p>

                {/* Feature list */}

                <div className="mt-8 space-y-3">
                  {[
                    {
                      icon: Brain,
                      title: "AI-powered preparation",
                      text: "Get structured feedback and reasoning.",
                    },
                    {
                      icon: BarChart3,
                      title: "Performance analytics",
                      text: "Understand your strengths and weak areas.",
                    },
                    {
                      icon: BookOpen,
                      title: "Practice workspace",
                      text: "Answers, tests, PYQs and current affairs.",
                    },
                  ].map(({ icon: Icon, title, text }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {title}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {text}
                        </p>
                      </div>

                      <Check className="ml-auto h-4 w-4 shrink-0 text-blue-400" />
                    </div>
                  ))}
                </div>

                {/* Bottom trust */}

                <div className="mt-auto pt-10">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />

                    <span>
                      Your preparation workspace is protected and secure.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <div className="relative bg-[#06132b]/95 p-5 sm:p-7 md:p-9 lg:p-10">
              {/* Mobile badge */}

              <div className="mb-6 lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Student Portal
                </div>
              </div>

              {/* Heading */}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                  Welcome back
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Sign in to your account
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
                  Continue where you left off in your UPSC preparation.
                </p>
              </div>

              {/* Form Card */}

              <div className="mt-7 rounded-2xl border border-blue-400/10 bg-[#081a38]/80 p-4 shadow-xl sm:p-5">
                {/* Google */}

                <a
                  href={`${apiBaseURL}/api/auth/google?from=login`}
                  className="group relative flex h-11 w-full items-center justify-center rounded-xl border border-slate-700/70 bg-[#0a2048] px-4 text-xs font-semibold text-white transition-all hover:border-blue-400/30 hover:bg-[#0d2856] sm:text-sm"
                >
                  <span className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <svg
                      viewBox="0 0 48 48"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.4 0 6.4 1.2 8.8 3.6l6.5-6.5C35.4 2.9 30.1.5 24 .5 14.8.5 6.9 5.8 3 13.6l7.8 6.1C12.7 13.6 17.9 9.5 24 9.5z"
                      />

                      <path
                        fill="#4285F4"
                        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8h12.8c-.3 2-1.5 5-4.1 7.1l7.1 5.5c4.3-3.9 6.7-9.7 6.7-16.5z"
                      />

                      <path
                        fill="#FBBC05"
                        d="M10.8 28.3c-.5-1.3-.8-2.8-.8-4.3s.3-2.9.8-4.3L3 13.6C1.4 16.7.5 20.2.5 24s.9 7.3 2.5 10.4l7.8-6.1z"
                      />

                      <path
                        fill="#34A853"
                        d="M24 47.5c6.1 0 11.2-2 14.9-5.5l-7.1-5.5c-1.9 1.3-4.4 2.1-7.8 2.1-6.1 0-11.3-4.1-13.2-10.1L3 34.4C6.9 42.2 14.8 47.5 24 47.5z"
                      />
                    </svg>
                  </span>

                  Continue with Google

                  <ArrowRight className="absolute right-3 h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-400" />
                </a>

                <p className="mt-2.5 text-center text-[9px] leading-4 text-slate-600">
                  Use Google only if you registered with the same email.
                </p>

                {/* Divider */}

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-800" />

                  <span className="text-[9px] font-medium uppercase tracking-wider text-slate-600">
                    or continue with email
                  </span>

                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                {/* Form */}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}

                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Email address
                    </label>

                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/70 bg-[#071a38] px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 autofill:shadow-[inset_0_0_0px_1000px_#071a38] autofill:[-webkit-text-fill-color:#f1f5f9]"
                      placeholder="you@example.com"
                    />
                  </div>

                  {/* Password */}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                      >
                        Password
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-[10px] font-semibold text-blue-400 transition hover:text-blue-300 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-700/70 bg-[#071a38] px-3.5 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 autofill:shadow-[inset_0_0_0px_1000px_#071a38] autofill:[-webkit-text-fill-color:#f1f5f9]"
                        placeholder="Enter your password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-200"
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}

                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                      <p className="text-xs leading-5 text-red-300">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Submit */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing you in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer info */}

                <div className="mt-5 border-t border-slate-800 pt-4 text-center">
                  <p className="text-[10px] text-slate-600">
                    New to MentorsDaily?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-blue-400 transition hover:text-blue-300 hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>

              {/* Bottom trust */}

              <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500/70" />

                <span>
                  Secure sign-in · Your data stays protected
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};