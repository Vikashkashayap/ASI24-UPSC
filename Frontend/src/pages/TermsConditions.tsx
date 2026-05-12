import { LandingFooter } from "../components/landing/LandingFooter";
import { useTheme } from "../hooks/useTheme";
import { Link } from "react-router-dom";

/**
 * Terms & Conditions — MentorsDaily Student Portal
 * Route: /terms-conditions
 */
export const TermsConditionsPage = () => {
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
              Terms &amp; Conditions
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
              These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of{" "}
              <strong className={sub}>MentorsDaily Student Portal</strong> (the &quot;Platform&quot;),
              operated by <strong className={sub}>MentorsDaily</strong> and accessible at{" "}
              <strong className={sub}>studentportal.mentorsdaily.com</strong>. By creating an
              account, enrolling in courses or test series, or otherwise using the Platform, you
              agree to these Terms.
            </p>

            <div className={`mt-10 space-y-9 text-sm leading-relaxed md:text-[15px] ${body}`}>
              <section aria-labelledby="tc-1">
                <h2 id="tc-1" className={`mb-3 text-lg font-semibold ${sub}`}>
                  1. Definitions
                </h2>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className={sub}>Platform</strong> — MentorsDaily Student Portal website and
                    related services.
                  </li>
                  <li>
                    <strong className={sub}>We / Us</strong> — MentorsDaily and its authorised
                    representatives.
                  </li>
                  <li>
                    <strong className={sub}>You / User</strong> — Any person who accesses or uses
                    the Platform.
                  </li>
                  <li>
                    <strong className={sub}>Services</strong> — Courses, test series, study
                    materials, student accounts, and related features offered through the Platform.
                  </li>
                </ul>
              </section>

              <section aria-labelledby="tc-2">
                <h2 id="tc-2" className={`mb-3 text-lg font-semibold ${sub}`}>
                  2. Eligibility &amp; accounts
                </h2>
                <p className="mb-3">
                  You must provide accurate registration information. You are responsible for
                  safeguarding your login credentials and for all activity under your account.
                  You must notify us promptly at{" "}
                  <a
                    href="mailto:hr@mentorsdaily.com"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    hr@mentorsdaily.com
                  </a>{" "}
                  of any unauthorised use.
                </p>
              </section>

              <section aria-labelledby="tc-3">
                <h2 id="tc-3" className={`mb-3 text-lg font-semibold ${sub}`}>
                  3. Services &amp; acceptable use
                </h2>
                <p className="mb-2">
                  The Platform is intended for UPSC and related exam preparation. You agree not
                  to:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Copy, scrape, redistribute, or resell Platform content without permission.</li>
                  <li>Share account access with others or circumvent access controls.</li>
                  <li>Use the Platform for unlawful, harmful, or disruptive purposes.</li>
                  <li>Attempt to probe, attack, or overload our systems.</li>
                </ul>
              </section>

              <section aria-labelledby="tc-4">
                <h2 id="tc-4" className={`mb-3 text-lg font-semibold ${sub}`}>
                  4. Payments &amp; access
                </h2>
                <p>
                  Fees for courses, test series, or subscriptions are displayed at purchase.
                  Payment is processed through secure third-party gateways. Access to paid content
                  is granted in accordance with the product description and these Terms. Our{" "}
                  <Link
                    to="/refund-policy"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Refund Policy
                  </Link>{" "}
                  applies to eligible refunds.
                </p>
              </section>

              <section aria-labelledby="tc-5">
                <h2 id="tc-5" className={`mb-3 text-lg font-semibold ${sub}`}>
                  5. Intellectual property
                </h2>
                <p>
                  All materials on the Platform (including text, graphics, videos, tests, and
                  software) are owned by MentorsDaily or its licensors. You receive a limited,
                  non-transferable licence to use content for personal, non-commercial study
                  during your valid enrolment.
                </p>
              </section>

              <section aria-labelledby="tc-6">
                <h2 id="tc-6" className={`mb-3 text-lg font-semibold ${sub}`}>
                  6. Disclaimers &amp; limitation of liability
                </h2>
                <p className="mb-2">
                  The Platform and Services are provided &quot;as is&quot; to the fullest extent
                  permitted by law. We do not guarantee exam outcomes, ranks, or uninterrupted
                  access. See our{" "}
                  <Link
                    to="/disclaimer"
                    className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Disclaimer
                  </Link>{" "}
                  for further detail.
                </p>
                <p>
                  To the maximum extent permitted by law, MentorsDaily shall not be liable for
                  indirect, incidental, or consequential damages arising from your use of the
                  Platform.
                </p>
              </section>

              <section aria-labelledby="tc-7">
                <h2 id="tc-7" className={`mb-3 text-lg font-semibold ${sub}`}>
                  7. Termination
                </h2>
                <p>
                  We may suspend or terminate access for breach of these Terms or for conduct
                  that harms the Platform or other users. You may stop using the Platform at any
                  time; certain provisions survive termination.
                </p>
              </section>

              <section aria-labelledby="tc-8">
                <h2 id="tc-8" className={`mb-3 text-lg font-semibold ${sub}`}>
                  8. Changes &amp; governing law
                </h2>
                <p className="mb-2">
                  We may update these Terms; material changes will be posted on this page with an
                  updated effective date. Continued use after changes constitutes acceptance where
                  permitted by law.
                </p>
                <p>
                  These Terms are governed by the laws of India. Courts at appropriate
                  jurisdiction in India shall have exclusive jurisdiction, subject to mandatory
                  consumer protections.
                </p>
              </section>

              <section aria-labelledby="tc-9">
                <h2 id="tc-9" className={`mb-3 text-lg font-semibold ${sub}`}>
                  9. Contact
                </h2>
                <p>
                  Questions about these Terms:{" "}
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
