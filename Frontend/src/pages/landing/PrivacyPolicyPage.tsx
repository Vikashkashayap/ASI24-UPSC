import { Globe, Mail } from "lucide-react";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";

export const PrivacyPolicyPage = () => {
  const { theme } = useTheme();
  const muted = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const sub = theme === "dark" ? "text-slate-200" : "text-slate-800";
  const bodyText = theme === "dark" ? "text-slate-300" : "text-slate-700";
  const listClass = `mt-3 list-disc space-y-2 pl-5 ${bodyText}`;

  return (
    <>
      <section
        className={`min-h-[60vh] border-b py-12 md:py-16 transition-colors ${
          theme === "dark" ? "border-slate-800 bg-[#070313]" : "border-slate-200 bg-slate-100"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <div
            className={`rounded-2xl border p-8 md:p-10 shadow-lg ${
              theme === "dark"
                ? "border-slate-700/80 bg-[#12121a]"
                : "border-slate-200 bg-white"
            }`}
          >
            <h1
              className={`text-2xl font-bold tracking-tight md:text-3xl ${
                theme === "dark" ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              Privacy Policy
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              <strong className={sub}>Effective Date:</strong> March 14, 2025
            </p>

            <div className={`mt-6 space-y-4 text-sm leading-relaxed md:text-[15px] ${bodyText}`}>
              <p>
                Welcome to <strong className={sub}>MentorsDaily Student Portal</strong>, accessible at{" "}
                <strong className={sub}>studentportal.mentorsdaily.com</strong>, a digital learning
                platform operated under <strong className={sub}>MentorsDaily</strong>. We value your
                privacy and are committed to protecting your personal information.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, and protect your information when
                you use our platform.
              </p>
              <p>
                By accessing or using the MentorsDaily Student Portal, you agree to the terms of this Privacy
                Policy.
              </p>
            </div>

            <div className={`mt-10 space-y-10 text-sm leading-relaxed md:text-[15px] ${bodyText}`}>
              {/* 1 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>
                  1. Information We Collect
                </h2>
                <p className="mb-4">
                  When you use our platform, we may collect the following information:
                </p>
                <h3 className={`mb-2 text-sm font-semibold ${sub}`}>Personal Information</h3>
                <ul className={listClass}>
                  <li>Full Name</li>
                  <li>Email Address</li>
                  <li>Phone Number</li>
                  <li>Educational Details</li>
                  <li>Login Credentials</li>
                </ul>
                <h3 className={`mb-2 mt-4 text-sm font-semibold ${sub}`}>Account Information</h3>
                <ul className={listClass}>
                  <li>Profile details</li>
                  <li>Course enrollment data</li>
                  <li>Test series participation</li>
                  <li>Study progress and activity</li>
                </ul>
                <h3 className={`mb-2 mt-4 text-sm font-semibold ${sub}`}>Payment Information</h3>
                <p className="mb-2">
                  If you purchase courses, subscriptions, or test series, payments are processed
                  through secure third-party payment gateways.
                </p>
                <p>
                  We <strong className={sub}>do not store debit or credit card details</strong> on
                  our servers.
                </p>
                <h3 className={`mb-2 mt-4 text-sm font-semibold ${sub}`}>Technical Information</h3>
                <p className="mb-2">We may automatically collect certain technical information such as:</p>
                <ul className={listClass}>
                  <li>IP Address</li>
                  <li>Device type</li>
                  <li>Browser type</li>
                  <li>Operating system</li>
                  <li>Pages visited on the platform</li>
                </ul>
              </section>

              {/* 2 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>
                  2. How We Use Your Information
                </h2>
                <p className="mb-2">The information we collect is used to:</p>
                <ul className={listClass}>
                  <li>Create and manage your student account</li>
                  <li>Provide UPSC preparation courses and test series</li>
                  <li>Process payments and subscriptions</li>
                  <li>Improve our website functionality and services</li>
                  <li>Send important notifications, updates, and announcements</li>
                  <li>Provide customer support and technical assistance</li>
                </ul>
              </section>

              {/* 3 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>3. Data Security</h2>
                <p>
                  MentorsDaily takes appropriate technical and organizational measures to protect
                  your personal information from unauthorized access, misuse, or disclosure.
                </p>
                <p className="mt-3">
                  However, no online platform can guarantee absolute security.
                </p>
              </section>

              {/* 4 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>4. Sharing of Information</h2>
                <p className="mb-2">
                  We do not sell, rent, or trade your personal information to third parties.
                </p>
                <p className="mb-2">Your information may only be shared with:</p>
                <ul className={listClass}>
                  <li>Payment gateway providers</li>
                  <li>Technical service providers</li>
                  <li>Legal authorities when required by law</li>
                </ul>
              </section>

              {/* 5 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>
                  5. Cookies and Tracking Technologies
                </h2>
                <p>
                  Our website may use cookies to enhance user experience and understand user
                  behavior.
                </p>
                <p className="mt-3">
                  Cookies help us improve the performance and usability of the platform.
                </p>
                <p className="mt-3">
                  Users can disable cookies through their browser settings.
                </p>
              </section>

              {/* 6 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>6. Third-Party Links</h2>
                <p>
                  Our platform may contain links to external websites. We are not responsible for the
                  privacy practices of those third-party websites.
                </p>
              </section>

              {/* 7 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>7. User Rights</h2>
                <p className="mb-2">Users have the right to:</p>
                <ul className={listClass}>
                  <li>Access their personal information</li>
                  <li>Update or correct account details</li>
                  <li>Request account deletion</li>
                </ul>
                <p className="mt-3">To exercise these rights, please contact us.</p>
              </section>

              {/* 8 */}
              <section>
                <h2 className={`mb-3 text-base font-semibold ${sub}`}>
                  8. Changes to This Privacy Policy
                </h2>
                <p>We may update this Privacy Policy from time to time.</p>
                <p className="mt-3">
                  Any changes will be posted on this page with an updated effective date.
                </p>
              </section>
            </div>

            <div
              className={`mt-12 border-t pt-8 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}
            >
              <h2 className={`mb-3 text-base font-semibold ${sub}`}>9. Contact Us</h2>
              <p className={`mb-5 text-sm md:text-[15px] ${bodyText}`}>
                If you have any questions regarding this Privacy Policy, please contact us:
              </p>
              <p className={`mb-4 text-sm font-semibold md:text-[15px] ${sub}`}>MentorsDaily</p>
              <ul className="space-y-4 text-sm md:text-[15px]">
                <li className="flex items-start gap-3">
                  <Mail
                    className={`mt-0.5 h-5 w-5 shrink-0 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    aria-hidden
                  />
                  <a
                    href="mailto:hr@mentorsdaily.com"
                    className={`font-medium underline-offset-2 hover:underline ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    hr@mentorsdaily.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Globe
                    className={`mt-0.5 h-5 w-5 shrink-0 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    aria-hidden
                  />
                  <a
                    href="https://studentportal.mentorsdaily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-medium underline-offset-2 hover:underline ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    studentportal.mentorsdaily.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
