import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingLayout } from "./layouts/LandingLayout";
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
import { AdminRoute } from "./components/AdminRoute";
import { MentorRoute } from "./components/MentorRoute";
import { MentorDashboardPage } from "./pages/mentor/MentorDashboardPage";
import { MentorStudentsPage } from "./pages/mentor/MentorStudentsPage";
import { DefaultCaughtRoute } from "./components/DefaultCaughtRoute";
import { LandingPage } from "./pages/LandingPage";
import { FeaturesPage } from "./pages/landing/FeaturesPage";
import { PricingPage } from "./pages/landing/PricingPage";
import { ComparePage } from "./pages/landing/ComparePage";
import { TestimonialsPage } from "./pages/landing/TestimonialsPage";
import { AboutPage } from "./pages/landing/AboutPage";
import { PrivacyPolicyPage } from "./pages/landing/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/landing/TermsOfServicePage";
import { TermsConditionsPage } from "./pages/TermsConditions";
import { RefundPolicyPage } from "./pages/RefundPolicy";
import { DisclaimerPage } from "./pages/Disclaimer";
import { ContactUsPage } from "./pages/ContactUs";
import HelpSupportPage from "./pages/HelpSupportPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { StudentsListPage } from "./pages/admin/StudentsListPage";
import { AdminProStudentsPage } from "./pages/admin/AdminProStudentsPage";
import { StudentDetailPage } from "./pages/admin/StudentDetailPage";
import { PrelimsMockAdminPage } from "./pages/admin/PrelimsMockAdminPage";
import { MockResultsPage } from "./pages/admin/MockResultsPage";
import { StudentPerformancePage } from "./pages/admin/StudentPerformancePage";
import { AdminPricingPage } from "./pages/admin/AdminPricingPage";
import { AdminOfferManagerPage } from "./pages/admin/AdminOfferManagerPage";
import { PrelimsMockPage } from "./pages/prelimsMock/PrelimsMockPage";
import CurrentAffairsPage from "./pages/CurrentAffairsPage";
import CurrentAffairDetailPage from "./pages/CurrentAffairDetailPage";
import AdminCurrentAffairsPage from "./pages/admin/AdminCurrentAffairsPage";
import { AdminMentorsPage } from "./pages/admin/AdminMentorsPage";
import { ChangePasswordPage } from "./pages/auth/ChangePasswordPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import ComingSoon from "./components/ui/ComingSoon";


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Landing: one layout, no refresh on nav – only content (Outlet) changes */}
          <Route path="/" element={<LandingLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="daily-current-affairs" element={<CurrentAffairsPage />} />
            <Route path="daily-current-affairs/:slug" element={<CurrentAffairDetailPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsOfServicePage />} />
            <Route path="terms-conditions" element={<TermsConditionsPage />} />
            <Route path="refund-policy" element={<RefundPolicyPage />} />
            <Route path="disclaimer" element={<DisclaimerPage />} />
            <Route path="contact-us" element={<ContactUsPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
            <Route path="current-affairs" element={<CurrentAffairsPage />} />
            <Route path="current-affairs/:slug" element={<CurrentAffairDetailPage />} />
            <Route
              path="mentor-dashboard"
              element={
                <MentorRoute>
                  <Outlet />
                </MentorRoute>
              }
            >
              <Route index element={<MentorDashboardPage />} />
              <Route path="students" element={<MentorStudentsPage />} />
              <Route path="students/:studentId" element={<StudentDetailPage />} />
            </Route>
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
            <Route path="pro-students" element={<AdminProStudentsPage />} />
            <Route path="prelims-mock" element={<PrelimsMockAdminPage />} />
            <Route path="mock-results/:mockId" element={<MockResultsPage />} />
            <Route path="student-performance/:studentId" element={<StudentPerformancePage />} />
            <Route path="pricing" element={<AdminPricingPage />} />
            <Route path="offer-manager" element={<AdminOfferManagerPage />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="mentors" element={<AdminMentorsPage />} />
            <Route path="current-affairs" element={<AdminCurrentAffairsPage />} />
          </Route>
          <Route path="*" element={<DefaultCaughtRoute />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
