import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import logoImg from "../../LOGO/mentorsdaily.png";
import { VedixLabBanner } from "./VedixLabBanner";

export const LandingFooter = () => {
  const { theme } = useTheme();

  return (
    <footer
      className={`relative py-12 text-sm transition-colors ${
        theme === "dark" ? "bg-[#020617] text-slate-400" : "bg-slate-50 text-slate-600"
      }`}
    >
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 md:flex-row md:justify-between">

        {/* LEFT SECTION - logo aligned same as navbar */}
        <div className="space-y-4 md:max-w-xs">

          <Link to="/" className="flex items-center shrink-0 select-none" aria-label="Home">
            <img
              src={logoImg}
              alt="MentorsDaily"
              className="h-9 md:h-10 w-auto object-contain object-left"
            />
          </Link>

          <p
            className={`text-sm leading-relaxed ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            A focused AI workspace for answer writing, analytics and current
            affairs — built for UPSC aspirants who are tired of noise.
          </p>

          <div className="flex gap-3 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} MentorsDaily</span>
            <span>Made with ♥ in India</span>
          </div>
        </div>

        {/* RIGHT GRID LINKS */}
        <div className="grid flex-1 gap-8 text-sm md:grid-cols-3">

          {/* Product */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                theme === "dark"
                  ? "text-slate-300"
                  : "text-slate-700"
              }`}
            >
              Product
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/features" className="hover:text-[#2563eb] transition">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-[#2563eb] transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-[#2563eb] transition">
                  Compare
                </Link>
              </li>
              <li>
                <Link to="/testimonials" className="hover:text-[#2563eb] transition">
                  Testimonials
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                theme === "dark"
                  ? "text-slate-300"
                  : "text-slate-700"
              }`}
            >
              Company
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/about" className="hover:text-[#2563eb] transition">
                  About
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/918766233193?text=${encodeURIComponent(
                    "Hi! I want to know more about MentorsDaily."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#2563eb] transition"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                theme === "dark"
                  ? "text-slate-300"
                  : "text-slate-700"
              }`}
            >
              Legal
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/privacy" className="hover:text-[#2563eb] transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#2563eb] transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Technology partner — Vedix Lab */}
      <div
        className={`mx-auto mt-10 flex max-w-7xl justify-center border-t px-4 pt-8 sm:px-6 ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <VedixLabBanner variant="footer" className="mx-auto" />
      </div>
    </footer>
  );
};