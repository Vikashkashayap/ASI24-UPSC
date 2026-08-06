import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const faqs = [
  {
    q: "Is this APK safe to install?",
    a: "Yes. This is the official MentorsDaily Student Portal Android build, hosted on studentportal.mentorsdaily.com. Install only from this page.",
  },
  {
    q: "Why does Android warn about unknown apps?",
    a: "Side-loaded APKs (outside Play Store) need one-time permission. Enable install from your browser or Files app, then install MentorsDaily.",
  },
  {
    q: "Which Android version do I need?",
    a: "Android 8.0 (Oreo) or newer is required for the best experience.",
  },
  {
    q: "Will my data sync with the website?",
    a: "Yes. Sign in with the same MentorsDaily account — your progress, planner, and analytics stay in sync.",
  },
  {
    q: "How do I get updates?",
    a: "Return to this Download page for the latest APK. Version and changelog update automatically via version.json.",
  },
];

interface DownloadFAQProps {
  dark?: boolean;
}

export function DownloadFAQ({ dark = false }: DownloadFAQProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl border backdrop-blur-md ${
              dark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white/80 shadow-sm"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span
                className={`text-sm font-semibold ${
                  dark ? "text-white" : "text-slate-900"
                }`}
              >
                {item.q}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${
                  isOpen ? "rotate-180" : ""
                } ${dark ? "text-slate-300" : "text-slate-500"}`}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <p
                className={`border-t px-5 py-4 text-sm leading-relaxed ${
                  dark
                    ? "border-white/10 text-slate-300"
                    : "border-slate-100 text-slate-600"
                }`}
              >
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
      <p
        className={`pt-2 text-center text-xs ${
          dark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        By downloading you agree to our{" "}
        <Link to="/privacy" className="text-[#60a5fa] underline-offset-2 hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          to="/terms-conditions"
          className="text-[#60a5fa] underline-offset-2 hover:underline"
        >
          Terms
        </Link>
        .
      </p>
    </div>
  );
}
