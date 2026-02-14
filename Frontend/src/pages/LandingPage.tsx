import { LandingLayout } from "../layouts/LandingLayout";
import { LandingHero } from "../components/landing/Hero";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { RewardsBanner } from "../components/landing/RewardsBanner";
import { IntelligenceVsNoise } from "../components/landing/IntelligenceVsNoise";
import { AboutSection } from "../components/landing/AboutSection";
import { TestimonialsSection } from "../components/landing/Testimonials";
import { LandingFooter } from "../components/landing/LandingFooter";

export const LandingPage = () => {
  return (
    <LandingLayout>
      <LandingHero />
      <FeatureGrid />
      <RewardsBanner />
      <IntelligenceVsNoise />
      <AboutSection />
      <TestimonialsSection />
      <LandingFooter />
    </LandingLayout>
  );
};

