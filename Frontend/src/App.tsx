import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { PerformanceDashboardPage } from "./pages/PerformanceDashboardPage";
import { PlannerPage } from "./pages/PlannerPage";
import { MentorChatPage } from "./pages/MentorChatPage";
import CopyEvaluationPage from "./pages/CopyEvaluationPage";
import CopyEvaluationDetailPage from "./pages/CopyEvaluationDetailPage";
import SingleQuestionEvaluationPage from "./pages/SingleQuestionEvaluationPage";
import EvaluationHistoryPage from "./pages/EvaluationHistoryPage";
import { MeetingPage } from "./pages/MeetingPage";
import TestGeneratorPage from "./pages/TestGeneratorPage";
import TestHistoryPage from "./pages/TestHistoryPage";
import TestPage from "./pages/TestPage";
import TestResultPage from "./pages/TestResultPage";
import ProfilePage from "./pages/ProfilePage";
import { StudentProfilerPage } from "./pages/StudentProfilerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import CurrentAffairsDashboardPage from "./pages/CurrentAffairsDashboardPage";
import CurrentAffairsDetailPage from "./pages/CurrentAffairsDetailPage";
import ModelDrivenCurrentAffairsPage from "./pages/ModelDrivenCurrentAffairsPage";

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
            <Route path="home" element={<HomePage />} />
            <Route path="performance" element={<PerformanceDashboardPage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="mentor" element={<MentorChatPage />} />
            <Route path="copy-evaluation" element={<CopyEvaluationPage />} />
            <Route path="copy-evaluation/:id" element={<CopyEvaluationDetailPage />} />
            <Route path="evaluation-history" element={<EvaluationHistoryPage />} />
            <Route path="mains-evaluation" element={<SingleQuestionEvaluationPage />} />
            <Route path="meeting" element={<MeetingPage />} />
            <Route path="prelims-test" element={<TestGeneratorPage />} />
            <Route path="test-history" element={<TestHistoryPage />} />
            <Route path="test/:id" element={<TestPage />} />
            <Route path="result/:id" element={<TestResultPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="help-support" element={<HelpSupportPage />} />
            <Route path="student-profiler" element={<StudentProfilerPage />} />
            <Route path="current-affairs" element={<CurrentAffairsDashboardPage />} />
            <Route path="current-affairs/:id" element={<CurrentAffairsDetailPage />} />
            <Route path="model-driven-ca" element={<ModelDrivenCurrentAffairsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
