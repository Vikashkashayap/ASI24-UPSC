import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";

export const LandingFooter = () => {
  const { theme } = useTheme();
  
  return (
    <footer className={`border-t py-10 text-[11px] transition-colors ${
      theme === "dark"
        ? "border-purple-900 bg-[#020012] text-slate-400"
        : "border-slate-200 bg-white text-slate-600"
    }`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:justify-between md:px-6">
        <div className="space-y-3 md:max-w-xs">
          <div>
            <div className={`text-sm font-semibold tracking-tight ${
              theme === "dark" ? "text-slate-50" : "text-slate-900"
            }`}>
              UPSC<span className={theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"}> Mentor</span>
            </div>
            <p className={`mt-2 text-[11px] ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
              A focused AI workspace for answer writing, analytics and current affairs — built for UPSC aspirants who
              are tired of noise.
            </p>
          </div>
          <div className={`flex gap-2 text-[10px] ${
            theme === "dark" ? "text-slate-500" : "text-slate-500"
          }`}>
            <span>© {new Date().getFullYear()} UPSC Mentor.</span>
            <span>Made with ♥ in India.</span>
          </div>
        </div>

        <div className="grid flex-1 gap-6 text-[11px] md:grid-cols-3">
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>Product</h4>
            <ul className="mt-3 space-y-1">
              <li>
                <Link to="/#features" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
                  Features
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>Company</h4>
            <ul className="mt-3 space-y-1">
              <li>
                <a href="#about" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
                  About
                </a>
              </li>
              <li>
                <a href="#contact" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>Legal</h4>
            <ul className="mt-3 space-y-1">
              <li>
                <a href="#privacy" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className={theme === "dark" ? "hover:text-slate-200" : "hover:text-slate-900"}>
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

