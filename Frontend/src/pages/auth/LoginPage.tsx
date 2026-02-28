import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { LandingNavbar } from "../../components/landing/Navbar";

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
                <label className="text-sm md:text-base text-slate-700 block">Password</label>
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
            <div className="mt-4 md:mt-5 space-y-1.5 text-center">
              <p className="text-[11px] md:text-xs text-slate-500">
                <span className="font-medium text-slate-700">Free access</span> is created by your mentor/admin.
              </p>
              <p className="text-[11px] md:text-xs text-slate-500">
                New aspirant and want{" "}
                <span className="font-semibold text-[#2563eb]">MentorsDaily Pro</span>?
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-lg text-[11px] md:text-xs font-semibold bg-gradient-to-r from-purple-600 to-emerald-500 text-white shadow-md hover:opacity-90 transition-opacity"
              >
                View Pro plans &amp; Register
              </Link>
              <p className="text-[11px] md:text-xs text-slate-500 pt-1">
                Prefer direct sign-up?{" "}
                <Link to="/register" className="text-[#2563eb] font-semibold underline-offset-2 hover:underline">
                  Create a new account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
