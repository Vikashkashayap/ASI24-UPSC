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
    <div className="student-dashboard-page">
      <div className="sd-card sd-syllabus-card" style={{ minHeight: 520 }}>
        <Suspense fallback={<PageLoader />}>
          <SyllabusTargetsPanel
            todayLabel={todayLabel}
            title="Syllabus"
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
