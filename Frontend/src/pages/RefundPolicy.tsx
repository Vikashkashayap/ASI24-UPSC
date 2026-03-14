import { LandingFooter } from "../components/landing/LandingFooter";
import { useTheme } from "../hooks/useTheme";
import { Link } from "react-router-dom";

/**
 * Refund Policy — MentorsDaily Student Portal
 * Route: /refund-policy
 */
export const RefundPolicyPage = () => {
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
              Refund Policy
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              Effective as of{" "}
              {new Date().toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className={`mt-6 text-sm leading-relaxed md:text-[15px] ${body}`}>
              This Refund Policy applies to paid purchases made on{" "}
              <strong className={sub}>MentorsDaily Student Portal</strong> (
              <strong className={sub}>studentportal.mentorsdaily.com</strong>), operated by{" "}
              <strong className={sub}>MentorsDaily</strong>. By purchasing courses, test series, or
              subscriptions, you acknowledge this policy.
            </p>

            <div className={`mt-10 space-y-9 text-sm leading-relaxed md:text-[15px] ${body}`}>
              <section aria-labelledby="rf-1">
                <h2 id="rf-1" className={`mb-3 text-lg font-semibold ${sub}`}>
                  1. General principle
                </h2>
                <p>
                  All fees are generally non-refundable except where this policy explicitly allows
                  a refund. Refund requests must be sent to{" "}
                  <a
                    href="mailto:hr@mentorsdaily.com"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    hr@mentorsdaily.com
                  </a>{" "}
                  from the email address associated with your account, including your order or
                  transaction details.
                </p>
              </section>

              <section aria-labelledby="rf-2">
                <h2 id="rf-2" className={`mb-3 text-lg font-semibold ${sub}`}>
                  2. Three-day refund window
                </h2>
                <p className="mb-2">
                  A refund may be requested only within <strong className={sub}>3 (three) calendar days</strong>{" "}
                  from the date of successful payment for the relevant product (course,
                  subscription, or test series package), subject to the restrictions below.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>The 3-day period starts on the day payment is confirmed on our system.</li>
                  <li>Requests received after this period will not be eligible for refund under this policy.</li>
                </ul>
              </section>

              <section aria-labelledby="rf-3">
                <h2 id="rf-3" className={`mb-3 text-lg font-semibold ${sub}`}>
                  3. Test series — no refund after access
                </h2>
                <p className="mb-2">
                  <strong className={sub}>No refund will be granted</strong> once you have{" "}
                  <strong className={sub}>accessed</strong> the purchased test series in any
                  material way. &quot;Accessed&quot; includes, without limitation:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Starting, attempting, or viewing any test or paper included in the series.</li>
                  <li>Downloading or opening protected test content where applicable.</li>
                </ul>
                <p className="mt-3">
                  If you have not accessed the test series within the 3-day window, you may still
                  request a refund in line with Section 2 and Section 4.
                </p>
              </section>

              <section aria-labelledby="rf-4">
                <h2 id="rf-4" className={`mb-3 text-lg font-semibold ${sub}`}>
                  4. Processing timeline
                </h2>
                <p>
                  Approved refunds are processed within{" "}
                  <strong className={sub}>7 (seven) working days</strong> from approval. The amount
                  will be credited through the original payment method or as per your bank /
                  payment provider&apos;s timelines, which may add additional days beyond our
                  control.
                </p>
              </section>

              <section aria-labelledby="rf-5">
                <h2 id="rf-5" className={`mb-3 text-lg font-semibold ${sub}`}>
                  5. Non-refundable situations
                </h2>
                <p className="mb-2">Refunds are typically not available when:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>The 3-day window has expired.</li>
                  <li>Test series (or equivalent) has been accessed as described above.</li>
                  <li>A promotional or bundled offer states no refunds.</li>
                  <li>Chargebacks are raised without first contacting support — we encourage resolving issues with us directly.</li>
                </ul>
              </section>

              <section aria-labelledby="rf-6">
                <h2 id="rf-6" className={`mb-3 text-lg font-semibold ${sub}`}>
                  6. Contact
                </h2>
                <p>
                  Refund requests and questions:{" "}
                  <a
                    href="mailto:hr@mentorsdaily.com"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    hr@mentorsdaily.com
                  </a>
                  {" · "}
                  <Link
                    to="/contact-us"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Contact Us
                  </Link>
                  {" · "}
                  <Link
                    to="/terms-conditions"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Terms &amp; Conditions
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
