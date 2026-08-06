import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { AppLayout } from "../components/layout";

/**
 * Dashboard shell — thin wrapper so existing routes keep working.
 * All layout chrome lives in `components/layout/*`.
 */
export const DashboardLayout = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();

  return (
    <AppLayout
      theme={theme}
      user={user}
      logout={logout}
      refreshUser={refreshUser}
    />
  );
};
