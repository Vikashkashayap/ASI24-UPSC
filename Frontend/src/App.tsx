import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { PerformancePage } from "./pages/PerformancePage";
import { PlannerPage } from "./pages/PlannerPage";
import { MentorChatPage } from "./pages/MentorChatPage";
import CopyEvaluationPage from "./pages/CopyEvaluationPage";
import CopyEvaluationDetailPage from "./pages/CopyEvaluationDetailPage";
import { MeetingPage } from "./pages/MeetingPage";
import TestGeneratorPage from "./pages/TestGeneratorPage";
import TestPage from "./pages/TestPage";
import TestResultPage from "./pages/TestResultPage";
import ProfilePage from "./pages/ProfilePage";
import { StudentProfilerPage } from "./pages/StudentProfilerPage";
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
            <Route path="performance" element={<PerformancePage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="mentor" element={<MentorChatPage />} />
            <Route path="copy-evaluation" element={<CopyEvaluationPage />} />
            <Route path="copy-evaluation/:id" element={<CopyEvaluationDetailPage />} />
            <Route path="meeting" element={<MeetingPage />} />
            <Route path="prelims-test" element={<TestGeneratorPage />} />
            <Route path="test/:id" element={<TestPage />} />
            <Route path="result/:id" element={<TestResultPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="student-profiler" element={<StudentProfilerPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/performance" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
