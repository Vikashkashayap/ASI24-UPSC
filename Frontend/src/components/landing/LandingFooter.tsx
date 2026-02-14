import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import logoImg from "../../LOGO/UPSCRH-LOGO.png";

export const LandingFooter = () => {
  const { theme } = useTheme();

  return (
    <footer
      className={`relative border-t py-12 text-sm transition-colors ${
        theme === "dark"
          ? "border-purple-900 bg-[#020012] text-slate-400"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {/* Ambient Glow (same feel as navbar) */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-fuchsia-800/10 to-purple-900/20 blur-3xl opacity-50 pointer-events-none" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 md:flex-row md:justify-between md:px-6">

        {/* LEFT SECTION */}
        <div className="space-y-4 md:max-w-xs">

          {/* 🔥 Logo + Text Same as Navbar */}
          <Link to="/" className="flex items-center gap-2 select-none">
            <img
              src={logoImg}
              alt="UPSCRH"
              className="h-12 md:h-14 w-auto object-contain"
            />
            <span className="text-xl md:text-2xl font-extrabold tracking-wide leading-none bg-gradient-to-r from-[#f5d0fe] via-[#e879f9] to-[#9333ea] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.9)]">
              UPSCRH
            </span>
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
            <span>© {new Date().getFullYear()} UPSCRH</span>
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
                <Link to="/features" className="hover:text-fuchsia-400 transition">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-fuchsia-400 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-fuchsia-400 transition">
                  Compare
                </Link>
              </li>
              <li>
                <Link to="/testimonials" className="hover:text-fuchsia-400 transition">
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
                <Link to="/about" className="hover:text-fuchsia-400 transition">
                  About
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/916394563575?text=${encodeURIComponent(
                    "Hi! I want to know more about UPSCRH."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-fuchsia-400 transition"
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
                <a href="#privacy" className="hover:text-fuchsia-400 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-fuchsia-400 transition">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};