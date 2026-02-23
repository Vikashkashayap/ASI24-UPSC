import { useParams, Link } from "react-router-dom";
import { ASI24Navbar } from "../../components/asi24/ASI24Navbar";
import { LandingLayout } from "../../layouts/LandingLayout";
import {
  getExamLabel,
  EXAM_DESCRIPTIONS,
  isValidExamSlug,
  type ExamSlug,
} from "../../constants/exams";
import { FileQuestion, LayoutGrid, Sparkles, BarChart3 } from "lucide-react";
import { Navigate } from "react-router-dom";

export function ExamLandingPage() {
  const { examSlug } = useParams<{ examSlug: string }>();

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  const title = `${getExamLabel(examSlug)} Exam Preparation Portal`;
  const description = EXAM_DESCRIPTIONS[examSlug as ExamSlug];

  return (
    <LandingLayout>
      <ASI24Navbar />
      <main className="asi24-gradient min-h-screen pt-12 md:pt-14">
        <div className="mx-auto max-w-4xl px-4 py-12 md:py-20 md:px-6">
          <h1 className="mb-4 text-3xl font-semibold text-slate-50 md:text-4xl">
            {title}
          </h1>
          <p className="mb-10 text-slate-300 md:text-lg">
            {description}
          </p>

          <div className="mb-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-purple-800/40 bg-slate-900/50 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-400">
                <FileQuestion className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-100">About the Exam</h3>
              <p className="text-sm text-slate-400">
                Syllabus, pattern, and eligibility — all in one place for {getExamLabel(examSlug)}.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-800/40 bg-slate-900/50 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-100">Exam Structure</h3>
              <p className="text-sm text-slate-400">
                Sections, marks, duration, and negative marking explained.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-800/40 bg-slate-900/50 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-100">What You Get</h3>
              <p className="text-sm text-slate-400">
                AI mock tests, PYQs, analytics, weak area detection, and leaderboard.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-800/40 bg-slate-900/50 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-100">Mock Test Preview</h3>
              <p className="text-sm text-slate-400">
                Try a free sectional test before you register.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 xs:flex-row xs:flex-wrap">
            <Link
              to={`/${examSlug}/register`}
              className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-fuchsia-400 hover:to-violet-400"
            >
              Register for {getExamLabel(examSlug)}
            </Link>
            <Link
              to={`/${examSlug}/login`}
              className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-full border border-purple-500/60 bg-black/40 px-6 text-sm font-medium text-slate-200 transition hover:bg-purple-950/50"
            >
              Login
            </Link>
          </div>
        </div>
      </main>
    </LandingLayout>
  );
}
