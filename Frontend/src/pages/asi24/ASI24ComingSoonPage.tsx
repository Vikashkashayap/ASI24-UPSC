import { useParams } from "react-router-dom";
import { getExamLabel, isValidExamSlug } from "../../constants/exams";
import { Navigate } from "react-router-dom";
import { Construction } from "lucide-react";

export function ASI24ComingSoonPage() {
  const { examSlug } = useParams<{ examSlug: string }>();

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="rounded-2xl border border-purple-800/40 bg-slate-900/50 p-8 max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-400">
          <Construction className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-slate-50">Coming soon</h2>
        <p className="mt-2 text-sm text-slate-400">
          This section is under development for {getExamLabel(examSlug)}. Check back later.
        </p>
      </div>
    </div>
  );
}
