import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LandingNavbar } from "../components/landing/Navbar";
import { OfferBanner } from "../components/landing/OfferBanner";
import { TopBanner } from "../components/landing/TopBanner";
import { WhatsAppWidget } from "../components/landing/WhatsAppWidget";
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

  // Clear any stuck body/html locks from a previous menu session (e.g. remount)
  useEffect(() => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
  }, []);

  return (
    <>
      <SEO {...seo} />
    <div
      data-landing-scroll
      className={`landing-scroll-root w-full max-w-full h-[100dvh] max-h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y scroll-smooth scrollbar-hide transition-colors ${
      theme === "dark" ? "page-dots-bg-dark text-slate-50" : "page-dots-bg-light text-slate-900"
    }`}>
      {/* Fixed header: offer strip on top, navbar below – padding follows height so no gap when banner is dismissed */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 flex w-full max-w-full flex-col overflow-x-hidden">
        <OfferBanner />
        <LandingNavbar />
      </header>
      <main
        style={headerHeight > 0 ? { paddingTop: `${headerHeight}px` } : undefined}
        className={`w-full min-w-0 max-w-full overflow-x-hidden transition-[padding] duration-200 ${headerHeight > 0 ? "" : "pt-20 md:pt-28"}`}
      >
        {/* <TopBanner /> */}
        <Outlet />
      </main>
      <WhatsAppWidget />
    </div>
    </>
  );
};
