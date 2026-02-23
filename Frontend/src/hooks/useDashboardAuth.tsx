import { useAuth, type User } from "./useAuth";
import { useASI24Auth } from "./useASI24Auth";

/**
 * For UPSC, dashboard can be accessed by either:
 * - Original auth (useAuth) → user from /login
 * - ASI24 auth with examType "upsc" → user from /upsc/login
 * This hook returns the effective user and logout for the existing UPSC dashboard.
 */
export function useDashboardUser(): User | null {
  const { user } = useAuth();
  const { student } = useASI24Auth();
  if (user) return user;
  if (student?.examType === "upsc")
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      role: "student",
    };
  return null;
}

export function useDashboardLogout(): () => void {
  const auth = useAuth();
  const asi24 = useASI24Auth();
  return () => {
    if (auth.user) auth.logout();
    else if (asi24.student?.examType === "upsc") asi24.logout();
  };
}

/** Returns { user, logout } for the existing UPSC dashboard (original or ASI24 upsc). */
export function useDashboardAuth(): { user: User | null; logout: () => void } {
  const user = useDashboardUser();
  const logout = useDashboardLogout();
  return { user, logout };
}
