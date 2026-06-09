import { Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { MentorRoute } from "./components/MentorRoute";
import { DefaultCaughtRoute } from "./components/DefaultCaughtRoute";
import { PageLoader } from "./components/PageLoader";
import { lazyPage } from "./utils/lazyRoute";

// Auth (small — keep eager for fast login redirect)
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ChangePasswordPage } from "./pages/auth/ChangePasswordPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";

// Shell layouts (~900 lines + nav icons) — separate chunks from the router shell
const LandingLayout = lazyPage(() => import("./layouts/LandingLayout"), "LandingLayout");
const DashboardLayout = lazyPage(() => import("./layouts/DashboardLayout"), "DashboardLayout");

// Landing
const LandingPage = lazyPage(() => import("./pages/LandingPage"), "LandingPage");
const FeaturesPage = lazyPage(() => import("./pages/landing/FeaturesPage"), "FeaturesPage");
const PricingPage = lazyPage(() => import("./pages/landing/PricingPage"), "PricingPage");
const ComparePage = lazyPage(() => import("./pages/landing/ComparePage"), "ComparePage");
const TestimonialsPage = lazyPage(() => import("./pages/landing/TestimonialsPage"), "TestimonialsPage");
const AboutPage = lazyPage(() => import("./pages/landing/AboutPage"), "AboutPage");
const PrivacyPolicyPage = lazyPage(() => import("./pages/landing/PrivacyPolicyPage"), "PrivacyPolicyPage");
const TermsOfServicePage = lazyPage(() => import("./pages/landing/TermsOfServicePage"), "TermsOfServicePage");
const TermsConditionsPage = lazyPage(() => import("./pages/TermsConditions"), "TermsConditionsPage");
const RefundPolicyPage = lazyPage(() => import("./pages/RefundPolicy"), "RefundPolicyPage");
const DisclaimerPage = lazyPage(() => import("./pages/Disclaimer"), "DisclaimerPage");
const ContactUsPage = lazyPage(() => import("./pages/ContactUs"), "ContactUsPage");

// Student dashboard
const HomePage = lazyPage(() => import("./pages/HomePage"), "HomePage");
const PerformanceDashboardPage = lazyPage(
  () => import("./pages/PerformanceDashboardPage"),
  "PerformanceDashboardPage"
);
const PlannerPage = lazyPage(() => import("./pages/PlannerPage"), "PlannerPage");
const MentorChatPage = lazyPage(() => import("./pages/MentorChatPage"), "MentorChatPage");
const CopyEvaluationPage = lazyPage(() => import("./pages/CopyEvaluationPage"));
const CopyEvaluationDetailPage = lazyPage(() => import("./pages/CopyEvaluationDetailPage"));
const EvaluationHistoryPage = lazyPage(() => import("./pages/EvaluationHistoryPage"));
const MeetingPage = lazyPage(() => import("./pages/MeetingPage"), "MeetingPage");
const TestGeneratorPage = lazyPage(() => import("./pages/TestGeneratorPage"));
const PracticeTestPage = lazyPage(() => import("./pages/PracticeTestPage"), "PracticeTestPage");
const PracticeTestHistoryPage = lazyPage(() => import("./pages/PracticeTestHistoryPage"), "PracticeTestHistoryPage");
const TestHistoryPage = lazyPage(() => import("./pages/TestHistoryPage"));
const TestPage = lazyPage(() => import("./pages/TestPage"));
const TestResultPage = lazyPage(() => import("./pages/TestResultPage"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));
const StudentProfilerPage = lazyPage(() => import("./pages/StudentProfilerPage"), "StudentProfilerPage");
const HelpSupportPage = lazyPage(() => import("./pages/HelpSupportPage"));
const PrelimsMockPage = lazyPage(() => import("./pages/prelimsMock/PrelimsMockPage"), "PrelimsMockPage");
const CurrentAffairsPage = lazyPage(() => import("./pages/CurrentAffairsPage"));
const CurrentAffairDetailPage = lazyPage(() => import("./pages/CurrentAffairDetailPage"));

// Mentor
const MentorDashboardPage = lazyPage(
  () => import("./pages/mentor/MentorDashboardPage"),
  "MentorDashboardPage"
);
const MentorStudentsPage = lazyPage(
  () => import("./pages/mentor/MentorStudentsPage"),
  "MentorStudentsPage"
);

// Admin
const AdminDashboardPage = lazyPage(() => import("./pages/admin/AdminDashboardPage"), "AdminDashboardPage");
const AdminProStudentsPage = lazyPage(
  () => import("./pages/admin/AdminProStudentsPage"),
  "AdminProStudentsPage"
);
const PrelimsMockAdminPage = lazyPage(
  () => import("./pages/admin/PrelimsMockAdminPage"),
  "PrelimsMockAdminPage"
);
const AssignedPracticeAdminPage = lazyPage(
  () => import("./pages/admin/AssignedPracticeAdminPage"),
  "AssignedPracticeAdminPage"
);
const MockResultsPage = lazyPage(() => import("./pages/admin/MockResultsPage"), "MockResultsPage");
const StudentPerformancePage = lazyPage(
  () => import("./pages/admin/StudentPerformancePage"),
  "StudentPerformancePage"
);
const AdminPricingPage = lazyPage(() => import("./pages/admin/AdminPricingPage"), "AdminPricingPage");
const AdminOfferManagerPage = lazyPage(
  () => import("./pages/admin/AdminOfferManagerPage"),
  "AdminOfferManagerPage"
);
const StudentsListPage = lazyPage(() => import("./pages/admin/StudentsListPage"), "StudentsListPage");
const StudentDetailPage = lazyPage(() => import("./pages/admin/StudentDetailPage"), "StudentDetailPage");
const AdminMentorsPage = lazyPage(() => import("./pages/admin/AdminMentorsPage"), "AdminMentorsPage");
const AdminCurrentAffairsPage = lazyPage(() => import("./pages/admin/AdminCurrentAffairsPage"));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
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
              <Route path="copy-evaluation" element={<CopyEvaluationPage />} />
              <Route path="copy-evaluation/:id" element={<CopyEvaluationDetailPage />} />
              <Route path="evaluation-history" element={<EvaluationHistoryPage />} />
              <Route path="meeting" element={<MeetingPage />} />
              <Route path="prelims-test" element={<TestGeneratorPage />} />
              <Route path="practice-test" element={<PracticeTestPage />} />
              <Route path="practice-test/history" element={<PracticeTestHistoryPage />} />
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
              <Route path="topic-practice" element={<AssignedPracticeAdminPage />} />
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
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
