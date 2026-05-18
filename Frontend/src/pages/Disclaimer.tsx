import { LandingFooter } from "../components/landing/LandingFooter";
import { useTheme } from "../hooks/useTheme";
import { Link } from "react-router-dom";

/**
 * Disclaimer — MentorsDaily Student Portal
 * Route: /disclaimer
 */
export const DisclaimerPage = () => {
  const { theme } = useTheme();
  const muted = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const heading = theme === "dark" ? "text-slate-50" : "text-slate-900";
  const sub = theme === "dark" ? "text-slate-200" : "text-slate-800";
  const body = theme === "dark" ? "text-slate-300" : "text-slate-700";
  const card =
    theme === "dark"
      ? "border-slate-700/80 bg-[#12121a]"
      : "border-slate-200 bg-white";
  const sectionBg =
    theme === "dark" ? "border-slate-800 bg-[#070313]" : "border-slate-200 bg-slate-100";

  return (
    <>
      <section
        className={`min-h-[60vh] border-b py-10 md:py-14 transition-colors ${sectionBg}`}
      >
        <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6">
          <article
            className={`rounded-2xl border p-6 shadow-lg sm:p-8 md:p-10 ${card}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${muted}`}>
              Legal · MentorsDaily
            </p>
            <h1 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-[1.75rem] ${heading}`}>
              Disclaimer
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              Last updated{" "}
              {new Date().toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className={`mt-6 text-sm leading-relaxed md:text-[15px] ${body}`}>
              The information and services on <strong className={sub}>MentorsDaily Student Portal</strong>{" "}
              (<strong className={sub}>studentportal.mentorsdaily.com</strong>), provided by{" "}
              <strong className={sub}>MentorsDaily</strong>, are offered for educational and
              preparatory purposes only. Please read this Disclaimer carefully.
            </p>

            <div className={`mt-10 space-y-9 text-sm leading-relaxed md:text-[15px] ${body}`}>
              <section aria-labelledby="dis-1">
                <h2 id="dis-1" className={`mb-3 text-lg font-semibold ${sub}`}>
                  1. No guarantee of exam results
                </h2>
                <p>
                  Courses, test series, study materials, analytics, AI-assisted features, and any
                  other content on the Platform are designed to support UPSC and related exam
                  preparation. <strong className={sub}>We do not guarantee</strong> selection,
                  ranks, marks, or any specific outcome in UPSC CSE or any other examination. Your
                  results depend on your effort, strategy, and factors outside our control.
                </p>
              </section>

              <section aria-labelledby="dis-2">
                <h2 id="dis-2" className={`mb-3 text-lg font-semibold ${sub}`}>
                  2. Accuracy of content
                </h2>
                <p>
                  We strive to keep content accurate and up to date. However, syllabus changes,
                  official notifications, and legal updates may not be reflected immediately. Always
                  verify critical information from official sources (UPSC, government portals,
                  gazettes). The Platform is not a substitute for official announcements.
                </p>
              </section>

              <section aria-labelledby="dis-3">
                <h2 id="dis-3" className={`mb-3 text-lg font-semibold ${sub}`}>
                  3. Third-party links &amp; services
                </h2>
                <p>
                  The Platform may link to third-party websites or integrate payment and
                  infrastructure providers. We are not responsible for their content, privacy
                  practices, or availability. Use of such services is at your own risk.
                </p>
              </section>

              <section aria-labelledby="dis-4">
                <h2 id="dis-4" className={`mb-3 text-lg font-semibold ${sub}`}>
                  4. Technology &amp; availability
                </h2>
                <p>
                  We aim for reliable uptime but do not warrant uninterrupted or error-free
                  access. Maintenance, outages, or connectivity issues may occur. We are not liable
                  for loss arising from temporary unavailability unless required by applicable law.
                </p>
              </section>

              <section aria-labelledby="dis-5">
                <h2 id="dis-5" className={`mb-3 text-lg font-semibold ${sub}`}>
                  5. Limitation of liability
                </h2>
                <p>
                  To the fullest extent permitted by applicable law, MentorsDaily and its team
                  disclaim liability for any direct, indirect, incidental, or consequential
                  damages arising from use of the Platform, except where liability cannot be
                  excluded by law.
                </p>
              </section>

              <section aria-labelledby="dis-6">
                <h2 id="dis-6" className={`mb-3 text-lg font-semibold ${sub}`}>
                  6. Contact
                </h2>
                <p>
                  For questions:{" "}
                  <a
                    href="mailto:hr@mentorsdaily.com"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    hr@mentorsdaily.com
                  </a>
                  {" · "}
                  <Link
                    to="/terms-conditions"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Terms &amp; Conditions
                  </Link>
                  {" · "}
                  <Link
                    to="/privacy"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </section>
            </div>
          </article>
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
