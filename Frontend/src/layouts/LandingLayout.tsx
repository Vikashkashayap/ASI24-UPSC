import { useEffect, useRef, useState } from "react";
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
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateHeight = () => setHeaderHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <SEO {...seo} />
    <div className={`min-h-screen overflow-y-auto scroll-smooth scrollbar-hide transition-colors ${
      theme === "dark" ? "page-dots-bg-dark text-slate-50" : "page-dots-bg-light text-slate-900"
    }`}>
      {/* Fixed header: offer strip on top, navbar below – padding follows height so no gap when banner is dismissed */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <OfferBanner />
        <LandingNavbar />
      </header>
      <main style={headerHeight > 0 ? { paddingTop: `${headerHeight}px` } : undefined} className={`transition-[padding] duration-200 ${headerHeight > 0 ? "" : "pt-24 md:pt-28"}`}>
        <TopBanner />
        <Outlet />
      </main>
    </div>
    </>
  );
};
