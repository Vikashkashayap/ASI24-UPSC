import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

export const RegisterPage = () => {
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
      // Store auth but navigate to student profiler first
      const { user, token } = res.data;
      localStorage.setItem("upsc_mentor_auth", JSON.stringify({ user, token }));
      // Navigate to student profiler page for onboarding
      window.location.href = "/student-profiler";
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020012] bg-gradient-to-b from-[#050015] via-[#020012] to-black px-4 py-8 text-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg">Create your UPSC lab</CardTitle>
          <CardDescription className="text-xs md:text-sm">Onboard once, then practice like a topper every day.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1 text-xs md:text-sm">
              <label className="text-slate-200">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
            </div>
            <div className="space-y-1 text-xs md:text-sm">
              <label className="text-slate-200">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
            </div>
            <div className="space-y-1 text-xs md:text-sm">
              <label className="text-slate-200">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
            </div>
            {error && <p className="text-[10px] md:text-xs text-red-500">{error}</p>}
            <Button type="submit" className="w-full text-xs md:text-sm" disabled={loading}>
              {loading ? "Creating workspace..." : "Create account"}
            </Button>
          </form>
          <p className="mt-3 md:mt-4 text-[10px] md:text-xs text-slate-400 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-300 font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
