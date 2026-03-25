import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to load from localStorage before checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Human mentors use the mentor dashboard, not the student shell (except shared pages).
  if (user.role === "mentor") {
    const allowed =
      location.pathname.startsWith("/mentor-dashboard") ||
      location.pathname.startsWith("/result/") ||
      location.pathname.startsWith("/test/") ||
      location.pathname === "/profile" ||
      location.pathname === "/help-support" ||
      location.pathname === "/change-password";
    if (!allowed) {
      return <Navigate to="/mentor-dashboard" replace />;
    }
  }

  // Subscription guard for self-registered users.
  // Admins and admin-created users bypass payment.
  const isStudent = user.role !== "admin" && user.role !== "mentor";
  const isAdminCreated = user.accountType === "admin-created";
  const isActiveSubscription = user.subscriptionStatus === "active";
  // Routes that a new (unpaid) student can still see – they will see banners/CTAs,
  // but premium actions are blocked by the backend.
  const allowedWithoutSubscription = ["/home", "/student-profiler", "/help-support", "/profile"];

  if (
    isStudent &&
    !isAdminCreated &&
    !isActiveSubscription &&
    !allowedWithoutSubscription.includes(location.pathname)
  ) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};
