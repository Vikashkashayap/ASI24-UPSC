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
    <div className="min-h-screen bg-[#020012] bg-gradient-to-b from-[#050015] via-[#020012] to-black text-slate-50 overflow-x-hidden">
      <LandingNavbar />
      <div className="flex items-center justify-center px-3 md:px-4 py-6 md:py-8 min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)]">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="text-base md:text-lg">Welcome back, aspirant</CardTitle>
          <CardDescription className="text-xs md:text-sm mt-1">Sign in to your AI-powered UPSC mentor workspace.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm md:text-base text-slate-200 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 md:px-4 py-2.5 md:py-3 text-base md:text-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 min-h-[44px]"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm md:text-base text-slate-200 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 md:px-4 py-2.5 md:py-3 text-base md:text-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 min-h-[44px]"
                placeholder="Enter your password"
              />
            </div>
            {error && <p className="text-xs md:text-sm text-red-500 py-1">{error}</p>}
            <Button type="submit" className="w-full text-sm md:text-base min-h-[44px]" disabled={loading}>
              {loading ? "Signing you in..." : "Login"}
            </Button>
          </form>
          <p className="mt-4 md:mt-5 text-xs md:text-sm text-slate-400 text-center">
            New here?{" "}
            <Link to="/register" className="text-emerald-300 font-medium hover:underline">
              Create your UPSC lab
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
