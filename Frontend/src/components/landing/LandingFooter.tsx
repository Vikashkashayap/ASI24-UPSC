import { Link } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import logoImg from "../../LOGO/mentorsdaily.png";
import { VedixLabBanner } from "./VedixLabBanner";

const productLinks = [
  { label: "Features", to: "/features" },
  { label: "Plans", to: "/pricing" },
  { label: "Compare", to: "/compare" },
  { label: "Testimonials", to: "/testimonials" },
  { label: "Download App", to: "/download" },
];

const companyLinks = [
  { label: "About", to: "/about" },
  {
    label: "UPSC Notes",
    to: "https://notes.mentorsdaily.com/",
    external: true,
  },
  { label: "Current Affairs", to: "/daily-current-affairs" },
];

const legalLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Conditions", to: "/terms-conditions" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Refund Policy", to: "/refund-policy" },
  { label: "Disclaimer", to: "/disclaimer" },
];

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  const whatsappUrl = `https://wa.me/918766233193?text=${encodeURIComponent(
    "Hi! I want to know more about MentorsDaily."
  )}`;

  return (
    <footer className="relative overflow-hidden bg-[#06152f] text-slate-300">
      {/* Background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[320px] w-[320px] rounded-full bg-blue-600/10 blur-[100px]" />

        <div className="absolute -right-32 top-1/3 h-[340px] w-[340px] rounded-full bg-cyan-500/[0.07] blur-[110px]" />

        <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main */}

      <div className="relative mx-auto max-w-7xl px-4 pb-5 pt-8 sm:px-6 sm:pt-9 lg:px-8">
        {/* =====================================================
            CTA
        ====================================================== */}

        <div className="mb-7 rounded-2xl border border-blue-400/10 bg-gradient-to-r from-blue-600/[0.12] via-blue-500/[0.06] to-cyan-400/[0.07] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md shadow-blue-500/20">
                <Sparkles className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-400">
                  Ready to prepare smarter?
                </p>

                <h3 className="mt-0.5 text-sm font-bold text-white sm:text-base">
                  Your UPSC journey starts with clarity.
                </h3>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-4 text-[11px] font-bold text-[#0b1f45] shadow-md transition-all hover:bg-blue-50"
            >
              Talk to us

              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* =====================================================
            FOOTER CONTENT
        ====================================================== */}

        <div className="grid gap-7 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-6">
          {/* Brand */}

          <div className="max-w-sm">
            <Link
              to="/"
              className="inline-flex items-center"
              aria-label="MentorsDaily Home"
            >
              <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-md">
                <img
                  src={logoImg}
                  alt="MentorsDaily"
                  className="h-8 w-auto max-w-[150px] object-contain"
                  decoding="async"
                />
              </div>
            </Link>

            <p className="mt-3 max-w-sm text-xs leading-5 text-slate-400">
              A focused AI workspace for answer writing, analytics,
              current affairs and personalised UPSC preparation.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[8px] font-semibold text-slate-400">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                AI-powered
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[8px] font-semibold text-slate-400">
                <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />
                Built for aspirants
              </div>
            </div>
          </div>

          {/* Product */}

          <div>
            <h4 className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              Product
            </h4>

            <ul className="mt-3 space-y-2">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="group inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-blue-400"
                  >
                    <span>{item.label}</span>

                    <ArrowRight className="h-2.5 w-2.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}

          <div>
            <h4 className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              Company
            </h4>

            <ul className="mt-3 space-y-2">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a
                      href={item.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-blue-400"
                    >
                      <span>{item.label}</span>

                      <ArrowRight className="h-2.5 w-2.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <Link
                      to={item.to}
                      className="group inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-blue-400"
                    >
                      <span>{item.label}</span>

                      <ArrowRight className="h-2.5 w-2.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  )}
                </li>
              ))}

              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-emerald-400"
                >
                  <MessageCircle className="h-2.5 w-2.5" />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}

          <div>
            <h4 className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              Legal
            </h4>

            <ul className="mt-3 space-y-2">
              {legalLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-[11px] text-slate-400 transition-colors hover:text-blue-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-blue-400/15 to-transparent" />

        {/* Technology Partner */}

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Technology Partner
            </p>

            <VedixLabBanner
              variant="footer"
              className="!mx-0"
            />
          </div>

          <div className="text-center sm:text-right">
            <p className="text-[9px] text-slate-500">
              © {currentYear} MentorsDaily
            </p>

            <p className="mt-0.5 text-[9px] text-slate-600">
              Made with ♥ in India
            </p>
          </div>
        </div>

        {/* Bottom */}

        <div className="mt-4 flex flex-col items-center justify-between gap-1.5 border-t border-white/[0.05] pt-3 text-[8px] text-slate-600 sm:flex-row">
          <span>
            MentorsDaily — AI-powered UPSC preparation workspace
          </span>

          <span>Learn · Practice · Improve</span>
        </div>
      </div>
    </footer>
  );
};