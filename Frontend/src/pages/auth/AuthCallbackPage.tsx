import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authAPI } from "../../services/api";

const STORAGE_KEY = "upsc_mentor_auth";

/**
 * Handles OAuth callback (e.g. Google): reads token from URL, fetches user, stores auth, redirects.
 */
export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing token");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Temporarily store token so api interceptor sends it
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: null, token }));
        const res = await authAPI.getMe();
        if (cancelled) return;
        const user = res.data?.user;
        if (!user) {
          setError("Could not load user");
          localStorage.removeItem(STORAGE_KEY);
          setTimeout(() => navigate("/login", { replace: true }), 2000);
          return;
        }
        // Remove token from URL before redirect (login() will redirect to /home or /admin/dashboard)
        window.history.replaceState({}, "", window.location.pathname);
        login(user, token);
      } catch {
        if (!cancelled) {
          setError("Sign-in failed");
          localStorage.removeItem(STORAGE_KEY);
          setTimeout(() => navigate("/login", { replace: true }), 2000);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-50">
      <div className="text-center">
        {error ? (
          <p className="text-red-400">{error}. Redirecting to login...</p>
        ) : (
          <p className="text-slate-300">Signing you in...</p>
        )}
      </div>
    </div>
  );
};
