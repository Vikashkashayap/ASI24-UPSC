import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "upsc_mentor_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { user: User; token: string };
      setUser(parsed.user);
      setToken(parsed.token);
    }
  }, []);

  const login = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
    navigate("/dashboard", { replace: true });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
