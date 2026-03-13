import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";
import { Link } from "react-router-dom";

export const TermsOfServicePage = () => {
  const { theme } = useTheme();
  const muted = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const heading = theme === "dark" ? "text-slate-50" : "text-slate-900";
  const sub = theme === "dark" ? "text-slate-300" : "text-slate-700";

  return (
    <>
      <section
        className={`min-h-[60vh] border-b py-12 md:py-16 transition-colors ${
          theme === "dark" ? "border-slate-800 bg-[#070313]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${muted}`}>
            Legal
          </p>
          <h1 className={`mt-2 text-2xl font-bold tracking-tight md:text-3xl ${heading}`}>
            Terms of Service
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className={`mt-10 space-y-8 text-sm leading-relaxed md:text-[15px] ${muted}`}>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>1. Agreement</h2>
              <p>
                By accessing or using MentorsDaily (&quot;Service&quot;), you agree to these Terms. If you do not agree, do not use the Service.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>2. Use of the Service</h2>
              <p className="mb-2">You agree to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use the Service only for lawful purposes and in line with UPSC / exam preparation use cases we intend.</li>
                <li>Not misuse, scrape, or attempt to disrupt the Service or other users&apos; accounts.</li>
                <li>Keep your login credentials confidential.</li>
              </ul>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>3. Accounts and subscriptions</h2>
              <p>
                Paid features, if any, are subject to the plan you choose. Fees and renewal terms are shown at purchase. We may suspend or terminate access for breach of these Terms or abuse.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>4. Content and AI outputs</h2>
              <p>
                AI-generated feedback and suggestions are aids only — not official exam guidance. You remain responsible for your preparation and answers. Do not rely on the Service as the sole source of truth for syllabus or marks.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>5. Disclaimer</h2>
              <p>
                The Service is provided &quot;as is&quot; to the extent permitted by law. We do not guarantee uninterrupted access or specific outcomes in exams.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>6. Limitation of liability</h2>
              <p>
                To the maximum extent permitted by applicable law, MentorsDaily and its team shall not be liable for indirect or consequential damages arising from your use of the Service.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>7. Changes</h2>
              <p>
                We may modify these Terms. Material changes will be reflected on this page with an updated date. Continued use after changes constitutes acceptance.
              </p>
            </div>
            <div>
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>8. Privacy</h2>
              <p>
                Our collection and use of personal data is described in our{" "}
                <Link to="/privacy" className="text-[#2563eb] underline hover:no-underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
