import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ASI24AuthProvider } from "./hooks/useASI24Auth";
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
import ProfilePage from "./pages/ProfilePage";
import { StudentProfilerPage } from "./pages/StudentProfilerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedExamRoute } from "./components/asi24/ProtectedExamRoute";
import { AdminRoute } from "./components/AdminRoute";
import { ASI24LandingPage } from "./pages/asi24/ASI24LandingPage";
import { ExamLandingPage } from "./pages/asi24/ExamLandingPage";
import { ASI24RegisterPage } from "./pages/asi24/ASI24RegisterPage";
import { ASI24LoginPage } from "./pages/asi24/ASI24LoginPage";
import { ASI24DashboardPage } from "./pages/asi24/ASI24DashboardPage";
import { ASI24PerformanceDashboardPage } from "./pages/asi24/ASI24PerformanceDashboardPage";
import { ASI24ComingSoonPage } from "./pages/asi24/ASI24ComingSoonPage";
import { ASI24ExamLayout } from "./layouts/ASI24ExamLayout";
import { FeaturesPage } from "./pages/landing/FeaturesPage";
import { PricingPage } from "./pages/landing/PricingPage";
import { ComparePage } from "./pages/landing/ComparePage";
import { TestimonialsPage } from "./pages/landing/TestimonialsPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { StudentsListPage } from "./pages/admin/StudentsListPage";
import { StudentDetailPage } from "./pages/admin/StudentDetailPage";
import { PrelimsMockAdminPage } from "./pages/admin/PrelimsMockAdminPage";
import { PrelimsMockPage } from "./pages/prelimsMock/PrelimsMockPage";
import { ChangePasswordPage } from "./pages/auth/ChangePasswordPage";
import ComingSoon from "./components/ui/ComingSoon";


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ASI24AuthProvider>
          <Routes>
            <Route path="/" element={<ASI24LandingPage />} />
            <Route path="/features" element={<Navigate to="/#features" replace />} />
            <Route path="/about" element={<Navigate to="/#about" replace />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/login" element={<Navigate to="/upsc/login" replace />} />
            <Route path="/register" element={<Navigate to="/upsc/register" replace />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            {/* ASI24: Dynamic exam routes */}
            <Route path="/:examSlug" element={<ExamLandingPage />} />
            <Route path="/:examSlug/register" element={<ASI24RegisterPage />} />
            <Route path="/:examSlug/login" element={<ASI24LoginPage />} />
            <Route path="/:examSlug/dashboard" element={<ProtectedExamRoute><ASI24ExamLayout /></ProtectedExamRoute>}>
              <Route index element={<ASI24DashboardPage />} />
              <Route path="performance" element={<ASI24PerformanceDashboardPage />} />
              <Route path="mock-tests" element={<ASI24ComingSoonPage />} />
              <Route path="pyq" element={<ASI24ComingSoonPage />} />
              <Route path="ai-tests" element={<ASI24ComingSoonPage />} />
              <Route path="profile" element={<ASI24ComingSoonPage />} />
              <Route path="help-support" element={<ASI24ComingSoonPage />} />
              <Route path="planner" element={<ASI24ComingSoonPage />} />
              <Route path="mentor" element={<ASI24ComingSoonPage />} />
              <Route path="copy-evaluation" element={<ASI24ComingSoonPage />} />
            </Route>
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
            <Route path="prelims-mock" element={<PrelimsMockPage />} />
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
            <Route path="prelims-mock" element={<PrelimsMockAdminPage />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
          </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ASI24AuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
