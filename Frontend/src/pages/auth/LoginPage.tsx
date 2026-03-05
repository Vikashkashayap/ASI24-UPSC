import { FormEvent, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api, apiBaseURL } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
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

    // Prevent multiple submissions
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      login(res.data.user, res.data.token);
    } catch (err: any) {
      // Handle rate limit and other errors
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 overflow-x-hidden">
      <LandingNavbar />
      <div className="flex items-center justify-center px-3 md:px-4 py-6 md:py-8 min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] pt-20 md:pt-24">
        <Card className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl">
          <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-base md:text-lg text-slate-900">Welcome back, aspirant</CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1 text-slate-600">Sign in to your AI-powered MentorsDaily workspace.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <a
                href={`${apiBaseURL}/api/auth/google`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 min-h-[44px] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </a>
              <div className="relative">
                <span className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></span>
                <span className="relative flex justify-center text-xs text-slate-500 bg-white px-2">Or sign in with email</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm md:text-base text-slate-700 block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 md:px-4 py-2.5 md:py-3 text-base md:text-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/70 focus:border-[#2563eb] min-h-[44px]"
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base text-slate-700 block">Password</label>
                  {/* <Link to="/forgot-password" className="text-xs md:text-sm text-[#2563eb] font-medium hover:underline">
                    Forgot password?
                  </Link> */}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 md:px-4 py-2.5 md:py-3 text-base md:text-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/70 focus:border-[#2563eb] min-h-[44px]"
                  placeholder="Enter your password"
                />
              </div>
              {error && <p className="text-xs md:text-sm text-red-500 py-1">{error}</p>}
              <Button type="submit" className="w-full text-sm md:text-base min-h-[44px]" disabled={loading}>
                {loading ? "Signing you in..." : "Login"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-[#2563eb] hover:underline">
                Sign up
              </Link>
            </p>
            <div className="mt-4 md:mt-5 pt-4 border-t border-slate-100 space-y-2 text-center">
              <p className="text-[11px] md:text-xs text-slate-500">
                <span className="font-medium text-slate-700">Free access</span> is created by your mentor/admin.
              </p>
              <p className="text-[11px] md:text-xs text-slate-500">
                New aspirant?{" "}
                <Link to="/pricing" className="font-semibold text-[#2563eb] hover:underline">
                  View Pro plans &amp; Register
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
