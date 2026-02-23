import { Navigate, useParams } from "react-router-dom";
import { useASI24Auth } from "../../hooks/useASI24Auth";
import { isValidExamSlug } from "../../constants/exams";

export function ProtectedExamRoute({ children }: { children: React.ReactNode }) {
  const { student, loading } = useASI24Auth();
  const { examSlug } = useParams<{ examSlug: string }>();

  if (loading) {
    return (
      <div className="asi24-gradient flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
      </div>
    );
  }

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  if (!student) {
    return <Navigate to={`/${examSlug}/login`} replace />;
  }

  if (student.examType !== examSlug) {
    return <Navigate to={`/${student.examType}/dashboard`} replace />;
  }

  return <>{children}</>;
}
