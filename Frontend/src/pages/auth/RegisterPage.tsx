import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api, apiBaseURL } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

export const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("planId");
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", { name, email, password });
      const { user, token } = res.data;
      // Normalize user shape for frontend (id vs _id)
      const authUser = { ...user, id: user.id || user._id };
      login(authUser, token);
      // If they came from pricing with a plan, send them back to complete payment
      if (planId) {
        window.location.href = `/pricing?planId=${encodeURIComponent(planId)}`;
        return;
      }
      window.location.href = "/student-profiler";
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/70 focus:border-[#2563eb] min-h-[44px] transition-shadow";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020012] bg-gradient-to-b from-[#050015] via-[#020012] to-black px-4 py-8 text-slate-50">
      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xl">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg text-slate-900">Create your UPSC lab</CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-600">Onboard once, then practice like a topper every day.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <a
              href={`${apiBaseURL}/api/auth/google`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 min-h-[44px] transition-colors"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
            <div className="relative">
              <span className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></span>
              <span className="relative flex justify-center text-xs text-slate-500 bg-white px-2">Or register with email</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-700 block">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-700 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-700 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={inputClass}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" className="w-full text-sm min-h-[44px]" disabled={loading}>
              {loading ? "Creating workspace..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-500 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2563eb] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
