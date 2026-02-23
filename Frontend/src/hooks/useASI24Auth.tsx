import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { asi24AuthAPI } from "../services/api";

export type ASI24Student = {
  id: string;
  name: string;
  email: string;
  examType: string;
};

type ASI24AuthContextType = {
  student: ASI24Student | null;
  token: string | null;
  loading: boolean;
  login: (student: ASI24Student, token: string, examSlug: string) => void;
  logout: () => void;
  setStudent: (s: ASI24Student | null) => void;
};

const ASI24AuthContext = createContext<ASI24AuthContextType | undefined>(undefined);

const STORAGE_KEY = "asi24_auth";

export const ASI24AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudentState] = useState<ASI24Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { student: ASI24Student; token: string };
        if (parsed.student && parsed.token) {
          setStudentState(parsed.student);
          setToken(parsed.token);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const setStudent = (s: ASI24Student | null) => {
    setStudentState(s);
    if (!s) setToken(null);
  };

  const login = (nextStudent: ASI24Student, nextToken: string, examSlug: string) => {
    setStudentState(nextStudent);
    setToken(nextToken);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ student: nextStudent, token: nextToken })
    );
    // UPSC: use existing real student dashboard (/home, /performance, etc.)
    if (examSlug === "upsc") {
      navigate("/home", { replace: true });
    } else {
      navigate(`/${examSlug}/dashboard`, { replace: true });
    }
  };

  const logout = () => {
    setStudentState(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate("/", { replace: true });
  };

  return (
    <ASI24AuthContext.Provider
      value={{ student, token, loading, login, logout, setStudent }}
    >
      {children}
    </ASI24AuthContext.Provider>
  );
};

export const useASI24Auth = () => {
  const ctx = useContext(ASI24AuthContext);
  if (!ctx) throw new Error("useASI24Auth must be used within ASI24AuthProvider");
  return ctx;
};
