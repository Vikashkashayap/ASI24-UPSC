import { Suspense, lazy } from "react";
import { Target } from "lucide-react";
import { StudySkeleton } from "../components/study";
import "./homePage.css";

const AssignedModuleTargets = lazy(() =>
  import("../components/AssignedModuleTargets").then((m) => ({
    default: m.AssignedModuleTargets,
  }))
);

/** Daily Targets — assigned module / chapter targets (moved off Home) */
export default function DailyTargetsPage() {
  return (
    <div className="student-dashboard-page w-full min-w-0 max-w-full space-y-3">
      <header className="relative overflow-hidden rounded-[20px] border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 p-4 text-white shadow-[0_14px_36px_rgba(37,99,235,0.28)] md:p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-md">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight md:text-xl">Daily Targets</h1>
            <p className="mt-0.5 text-sm font-medium text-blue-50/95">
              Finish chapters · Module Final · unlock next — your assigned module targets
            </p>
          </div>
        </div>
      </header>

      <Suspense fallback={<StudySkeleton rows={4} />}>
        <AssignedModuleTargets />
      </Suspense>
    </div>
  );
}
