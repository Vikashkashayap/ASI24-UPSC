import { Suspense, lazy, useMemo } from "react";
import { PageLoader } from "../components/PageLoader";
import { useAuth } from "../hooks/useAuth";
import "./homePage.css";

const SyllabusTargetsPanel = lazy(() =>
  import("../components/SyllabusTargetsPanel").then((m) => ({ default: m.SyllabusTargetsPanel }))
);

export const SyllabusPage = () => {
  const { user } = useAuth();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
    []
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 pb-4">
      <header className="space-y-1 px-0.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Syllabus</h1>
        <p className="text-sm text-slate-500">
          Explore Prelims & Mains topics with modular notes and practice hooks.
        </p>
      </header>

      <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-soft min-h-[520px]">
        <Suspense fallback={<PageLoader />}>
          <SyllabusTargetsPanel
            todayLabel={todayLabel}
            title="Syllabus Explorer"
            studentProfile={{
              targetYear: user?.targetYear,
              prepStartDate: user?.prepStartDate,
              dailyStudyHours: user?.dailyStudyHours,
              educationBackground: user?.educationBackground,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default SyllabusPage;
