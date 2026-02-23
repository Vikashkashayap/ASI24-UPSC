import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useASI24Auth } from "../hooks/useASI24Auth";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { student, loading: asi24Loading } = useASI24Auth();
  const location = useLocation();

  const isUpscASI24 = student?.examType === "upsc";
  const allowed = !!user || isUpscASI24;

  if (loading || asi24Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
