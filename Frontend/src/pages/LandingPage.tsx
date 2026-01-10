import { LandingNavbar } from "../components/landing/Navbar";
import { LandingHero } from "../components/landing/Hero";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { RewardsBanner } from "../components/landing/RewardsBanner";
import { IntelligenceVsNoise } from "../components/landing/IntelligenceVsNoise";
import { AboutSection } from "../components/landing/AboutSection";
import { TestimonialsSection } from "../components/landing/Testimonials";
import { LandingFooter } from "../components/landing/LandingFooter";
import { useTheme } from "../hooks/useTheme";

export const LandingPage = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen overflow-y-auto scroll-smooth scrollbar-hide transition-colors ${
      theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-white text-slate-900"
    }`}>
      <LandingNavbar />
      <LandingHero />
      <FeatureGrid />
      <RewardsBanner />
      <IntelligenceVsNoise />
      <AboutSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
};

