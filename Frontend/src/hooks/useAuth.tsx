import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export type User = {
  id: string;
  createdAt?: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  attempt?: string;
  targetYear?: string;
  prepStartDate?: string;
  dailyStudyHours?: string;
  educationBackground?: string;
  isEmailVerified?: boolean;
  role?: "student" | "admin" | "agent" | "mentor";
  mustChangePassword?: boolean;
  // Subscription / billing metadata (optional; provided by backend)
  accountType?: "admin-created" | "paid-user";
  subscriptionStatus?: "active" | "inactive";
  subscriptionPlanId?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionPlan?: { name: string; duration: string } | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "upsc_mentor_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { user: User; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
      } catch (error) {
        console.error("Error parsing stored auth:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));

    // Redirect based on user role and password change status
    if (nextUser.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (nextUser.role === "mentor") {
      navigate("/mentor-dashboard", { replace: true });
    } else if (nextUser.mustChangePassword) {
      navigate("/change-password", { replace: true });
    } else {
      // For students, land on Home dashboard first.
      navigate("/home", { replace: true });
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate("/login", { replace: true });
  };

  const refreshUser = async () => {
    const t = token ?? (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return (JSON.parse(stored) as { token: string }).token;
      } catch { /* ignore */ }
      return null;
    })();
    if (!t) return;
    try {
      const res = await authAPI.getMe();
      if (res.data?.user) {
        const nextUser = res.data.user as User;
        setUser(nextUser);
        setToken(t);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: t }));
      }
    } catch {
      // Keep existing user on failure
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
