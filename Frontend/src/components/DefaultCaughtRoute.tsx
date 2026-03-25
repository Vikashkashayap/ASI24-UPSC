import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Wildcard fallback: mentors land on mentor dashboard, everyone else on home. */
export const DefaultCaughtRoute: React.FC = () => {
  const { user } = useAuth();
  const to = user?.role === "mentor" ? "/mentor-dashboard" : "/home";
  return <Navigate to={to} replace />;
};
