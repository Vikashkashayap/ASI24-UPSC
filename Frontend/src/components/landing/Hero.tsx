import { useTheme } from "../../hooks/useTheme";
import { Check, FileText } from "lucide-react";

const offerItems = [
  "AI-powered answer writing & evaluation",
  "Daily study targets & progress tracking",
  "Current affairs & syllabus-linked notes",
  "Mains & Prelims practice tests",
  "Performance analytics & feedback",
  "24/7 AI mentor support",
  "Personalized learning paths",
  "PYQ analysis & revision tools",
  "One dashboard for all prep",
];

const stats = [
  { value: "2,500+", label: "Students learning" },
  { value: "1,200+", label: "Answers evaluated" },
  { value: "40+", label: "Topics covered" },
  { value: "24/7", label: "AI support" },
];

export const LandingHero = () => {
  const { theme } = useTheme();

  return (
    <section
      className={`relative overflow-hidden transition-colors ${
        theme === "dark" ? "hero-dots-bg-dark" : "hero-dots-bg-light"
      }`}
    >
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-14 md:pb-16 md:pt-20 text-center">
        {/* Top tagline */}
        <p
          className={`text-sm md:text-base ${
            theme === "dark" ? "text-blue-300/90" : "text-blue-600"
          }`}
        >
          India&apos;s Premier AI-Powered Student Portal
        </p>

        {/* Main heading */}
        <h1
          className={`mt-3 md:mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}
        >
          India&apos;s UPSC Preparation Portal{" "}
          <span className="text-[#2563eb]">Powered by MentorsDaily.</span>
        </h1>

        {/* Description */}
        <p
          className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        >
          MentorsDaily is your AI-powered student portal for UPSC preparation. Get a single dashboard for answer writing, tests, analytics and mentor support — so you stay focused and track progress in one place.
        </p>

        {/* CTAs - all open WhatsApp to +91 87662 33193 */}
        <div className="mt-6 flex flex-col xs:flex-row flex-wrap items-center justify-center gap-3">
          <a
            href={`https://wa.me/918766233193?text=${encodeURIComponent("Hi! I'm interested in MentorsDaily. I'd like to explore courses.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 w-full xs:w-auto rounded-lg bg-[#2563eb] px-6 text-sm font-semibold text-white shadow-md hover:bg-[#1d4ed8] md:px-8 transition-colors min-h-[44px]"
          >
            Explore Courses →
          </a>
          <a
            href={`https://wa.me/918766233193?text=${encodeURIComponent("Hi! I'd like to enquire about MentorsDaily.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 w-full xs:w-auto rounded-lg border-2 border-[#2563eb] bg-white px-5 text-sm font-medium text-[#2563eb] hover:bg-blue-50 md:px-6 transition-colors min-h-[44px]"
          >
            Enquire Now
          </a>
          <a
            href={`https://wa.me/918766233193?text=${encodeURIComponent("Hi! I'd like to book a free consultation for MentorsDaily.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 w-full xs:w-auto rounded-lg border-2 border-[#2563eb] bg-white px-5 text-sm font-medium text-[#2563eb] hover:bg-blue-50 md:px-6 transition-colors min-h-[44px]"
          >
            Book Free Consultation
          </a>
        </div>

        {/* What we offer card */}
        <div
          className={`mx-auto mt-10 max-w-3xl rounded-2xl border p-5 md:p-6 text-left ${
            theme === "dark"
              ? "border-slate-700/60 bg-slate-900/40"
              : "border-slate-200 bg-white/80 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className={`h-5 w-5 ${theme === "dark" ? "text-blue-400" : "text-[#2563eb]"}`} />
            <h2
              className={`text-base font-semibold md:text-lg ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              What we offer:
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {offerItems.map((item) => (
              <div
                key={item}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                  theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"
                }`}
              >
                <Check className={`h-4 w-4 shrink-0 ${theme === "dark" ? "text-blue-400" : "text-[#2563eb]"}`} />
                <span className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className={`rounded-xl border px-4 py-4 ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-900/40"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <p className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-blue-300" : "text-[#2563eb]"}`}>
                {value}
              </p>
              <p className={`mt-0.5 text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
