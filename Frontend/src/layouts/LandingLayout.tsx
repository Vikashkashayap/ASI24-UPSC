import { Outlet, useLocation } from "react-router-dom";
import { LandingNavbar } from "../components/landing/Navbar";
import { OfferBanner } from "../components/landing/OfferBanner";
import { TopBanner } from "../components/landing/TopBanner";
import { useTheme } from "../hooks/useTheme";
import { SEO } from "../components/SEO";
import { getLandingSEO } from "../config/seo";

export const LandingLayout = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const seo = getLandingSEO(location.pathname);

  return (
    <>
      <SEO {...seo} />
    <div className={`min-h-screen overflow-y-auto scroll-smooth scrollbar-hide transition-colors ${
      theme === "dark" ? "page-dots-bg-dark text-slate-50" : "page-dots-bg-light text-slate-900"
    }`}>
      {/* Fixed header: offer strip on top, navbar below – stays mounted on nav click */}
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <OfferBanner />
        <LandingNavbar />
      </header>
      <main className="pt-24 md:pt-28">
        <TopBanner />
        <Outlet />
      </main>
    </div>
    </>
  );
};
