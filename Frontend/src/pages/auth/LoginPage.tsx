import { FormEvent, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api, apiBaseURL } from "../../services/api";
import { LandingNavbar } from "../../components/landing/Navbar";

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err).replace(/\+/g, " "));
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      login(res.data.user, res.data.token);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else if (err?.response?.data?.code === "RATE_LIMIT") {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else {
        setError(err?.response?.data?.message || "Unable to login");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-blue-200/30 bg-[#0a1838] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/70 focus:border-[#3b82f6] autofill:shadow-[inset_0_0_0px_1000px_#0a1838] autofill:[-webkit-text-fill-color:#f1f5f9]";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      <LandingNavbar />
      <div className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-blue-400/20 bg-[#07142e] shadow-2xl lg:grid-cols-[1.05fr_1.35fr]">
          <div className="hidden border-r border-blue-400/20 bg-gradient-to-b from-[#0b1f45] to-[#081631] p-8 lg:block">
            <h2 className="mb-4 text-4xl font-extrabold leading-tight">Welcome Back, Aspirant</h2>
            <p className="mb-8 text-sm text-slate-300">
              Sign in to continue your UPSC preparation with AI-powered planning and mentor support.
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li>ΓÇó Personalized Study Plan</li>
              <li>ΓÇó Full Performance Analytics</li>
              <li>ΓÇó Dedicated Mentor</li>
              <li>ΓÇó 30,000+ Practice Questions</li>
            </ul>
          </div>

          <div className="p-5 sm:p-8">
            <h1 className="text-2xl font-bold">Sign In to Your Account</h1>
            <p className="mt-1 text-sm text-slate-300">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-blue-400 hover:underline">
                Sign up here
              </Link>
            </p>

            <div className="mt-6 rounded-xl border border-blue-400/20 bg-[#0b1a3b] p-4 sm:p-5">
              <a
                href={`${apiBaseURL}/api/auth/google`}
                className="relative mb-4 inline-flex w-full items-center justify-center rounded-full border border-white/25 bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937]"
              >
                <span className="absolute left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
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
              </a>
              <div className="mb-4 flex items-center gap-3 text-xs text-slate-300">
                <div className="h-px flex-1 bg-blue-200/25" />
                <span>or sign in with email</span>
                <div className="h-px flex-1 bg-blue-200/25" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Email Address"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Password"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing you in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-5 space-y-2 border-t border-blue-400/20 pt-4 text-center text-xs text-slate-400">
                <p>
                  <span className="font-medium text-slate-300">Free access</span> is created by your mentor/admin.
                </p>
                <p>
                  New aspirant?{" "}
                  <Link to="/pricing" className="font-semibold text-blue-400 hover:underline">
                    View Pro plans &amp; Register
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
