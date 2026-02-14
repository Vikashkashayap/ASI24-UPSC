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
import EvaluationHistoryPage from "./pages/EvaluationHistoryPage";
import { MeetingPage } from "./pages/MeetingPage";
import TestGeneratorPage from "./pages/TestGeneratorPage";
import TestHistoryPage from "./pages/TestHistoryPage";
import TestPage from "./pages/TestPage";
import TestResultPage from "./pages/TestResultPage";
import PrelimsTopperListPage from "./pages/PrelimsTopperListPage";
import PrelimsTopperExamPage from "./pages/PrelimsTopperExamPage";
import PrelimsTopperResultPage from "./pages/PrelimsTopperResultPage";
import PrelimsTopperRankPage from "./pages/PrelimsTopperRankPage";
import ProfilePage from "./pages/ProfilePage";
import { StudentProfilerPage } from "./pages/StudentProfilerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { LandingPage } from "./pages/LandingPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { StudentsListPage } from "./pages/admin/StudentsListPage";
import { StudentDetailPage } from "./pages/admin/StudentDetailPage";
import PrelimsTopperAdminPage from "./pages/admin/PrelimsTopperAdminPage";
import PrelimsTopperAnalyticsPage from "./pages/admin/PrelimsTopperAnalyticsPage";
import { ChangePasswordPage } from "./pages/auth/ChangePasswordPage";
import ComingSoon from "./components/ui/ComingSoon";


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
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
            <Route path="planner" element={<ComingSoon />} />
            {/* <Route path="planner" element={<PlannerPage />} /> */}
            <Route path="mentor" element={<MentorChatPage />} />
            <Route path="copy-evaluation" element={<ComingSoon />} />
            {/* <Route path="copy-evaluation" element={<CopyEvaluationPage />} /> */}
            <Route path="copy-evaluation/:id" element={<CopyEvaluationDetailPage />} />
            <Route path="evaluation-history" element={<EvaluationHistoryPage />} />
            <Route path="meeting" element={<MeetingPage />} />
            <Route path="prelims-test" element={<TestGeneratorPage />} />
            <Route path="prelims-topper" element={<PrelimsTopperListPage />} />
            <Route path="prelims-topper/exam/:testId" element={<PrelimsTopperExamPage />} />
            <Route path="prelims-topper/result/:attemptId" element={<PrelimsTopperResultPage />} />
            <Route path="prelims-topper/rank/:testId" element={<PrelimsTopperRankPage />} />
            <Route path="test-history" element={<TestHistoryPage />} />
            <Route path="test/:id" element={<TestPage />} />
            <Route path="result/:id" element={<TestResultPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="help-support" element={<HelpSupportPage />} />
            <Route path="student-profiler" element={<StudentProfilerPage />} />
          </Route>
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <DashboardLayout />
              </AdminRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="prelims-topper" element={<PrelimsTopperAdminPage />} />
            <Route path="prelims-topper/analytics/:id" element={<PrelimsTopperAnalyticsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
