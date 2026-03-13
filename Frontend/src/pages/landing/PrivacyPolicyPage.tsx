import { Mail, MapPin, Phone } from "lucide-react";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";

const sections = [
  {
    title: "1. Information We Collect",
    body:
      "We collect basic details such as name, email, phone, and payment info for registration, along with non-personal data like device type, IP address, and browsing activity.",
  },
  {
    title: "2. How We Use Information",
    body:
      "Your information helps us improve services, process payments, communicate updates, and ensure a safe learning experience. We never sell your personal data.",
  },
  {
    title: "3. Cookies & Tracking",
    body:
      "We use cookies to enhance usability and analyze traffic. You can manage or disable cookies through your browser settings.",
  },
  {
    title: "4. Data Protection",
    body:
      "We apply encryption and secure servers to protect your data. However, no online system can guarantee 100% security.",
  },
  {
    title: "5. Your Rights",
    body:
      "You may access, update, or delete your personal data anytime by contacting us. You can also unsubscribe from marketing emails.",
  },
  {
    title: "6. Third-Party Links",
    body:
      "Our site may include links to external websites. We're not responsible for their content or privacy policies.",
  },
  {
    title: "7. Policy Updates",
    body:
      "We may update this policy periodically. Continued use of our services means you accept the revised version.",
  },
];

export const PrivacyPolicyPage = () => {
  const { theme } = useTheme();
  const muted = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const sub = theme === "dark" ? "text-slate-200" : "text-slate-800";
  const bodyText = theme === "dark" ? "text-slate-300" : "text-slate-700";

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
            <p className={`mt-2 text-sm ${muted}`}>Last Updated: December 2024</p>

            <p className={`mt-6 text-sm leading-relaxed md:text-[15px] ${bodyText}`}>
              Your privacy is important to us. This policy explains how MentorsDaily collects,
              uses, and protects your information.
            </p>

            <div className={`mt-10 space-y-8 text-sm leading-relaxed md:text-[15px] ${bodyText}`}>
              {sections.map(({ title, body }) => (
                <div key={title}>
                  <h2 className={`mb-3 text-base font-semibold ${sub}`}>{title}</h2>
                  <p>{body}</p>
                </div>
              ))}
            </div>

            <div className={`mt-12 border-t pt-8 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
              <h2 className={`mb-5 text-base font-semibold ${sub}`}>Contact Us</h2>
              <ul className="space-y-4 text-sm md:text-[15px]">
                <li className="flex items-start gap-3">
                  <Mail
                    className={`mt-0.5 h-5 w-5 shrink-0 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    aria-hidden
                  />
                  <a
                    href="mailto:contact@mentorsdaily.com"
                    className={`font-medium underline-offset-2 hover:underline ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    contact@mentorsdaily.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone
                    className={`mt-0.5 h-5 w-5 shrink-0 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    aria-hidden
                  />
                  <a
                    href="tel:+918766233193"
                    className={`font-medium underline-offset-2 hover:underline ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    +91 8766233193
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin
                    className={`mt-0.5 h-5 w-5 shrink-0 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    aria-hidden
                  />
                  <span className={bodyText}>
                    B-69, Block B, Sector 2, Noida, UP 201301
                  </span>
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
