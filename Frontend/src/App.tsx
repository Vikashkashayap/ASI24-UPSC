import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WriteAnswerPage } from "./pages/WriteAnswerPage";
import { PerformancePage } from "./pages/PerformancePage";
import { PlannerPage } from "./pages/PlannerPage";
import { MentorChatPage } from "./pages/MentorChatPage";
import { ChatbotPage } from "./pages/ChatbotPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="write" element={<WriteAnswerPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="mentor" element={<MentorChatPage />} />
            <Route path="chatbot" element={<ChatbotPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
