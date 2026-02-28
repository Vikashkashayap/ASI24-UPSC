/** Base URL for canonical and OG URLs. Use your production domain. */
export const SITE_URL = "http://studentportal.mentorsdaily.com";

/** Default OG image (absolute URL for social crawlers). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.png`;

export interface PageSEO {
  title: string;
  description: string;
  /** Optional path (e.g. /features). Canonical will be SITE_URL + path. */
  path?: string;
  /** Override OG/Twitter image URL. */
  image?: string;
  /** Keywords for meta keywords (optional). */
  keywords?: string;
}

const defaultSEO: PageSEO = {
  title: "MentorsDaily – Student Portal Dashboard Powered by AI | UPSC Preparation",
  description:
    "MentorsDaily is an AI-powered student portal dashboard for UPSC preparation. One dashboard for answer writing, tests, analytics and mentor support. Built for serious aspirants.",
  path: "/",
  keywords:
    "student portal, student portal dashboard, AI powered dashboard, UPSC preparation, UPSC CSE, answer writing, UPSC mains, current affairs, UPSC mentor, MentorsDaily, civil services exam, AI mentor",
};

/** SEO config per landing route pathname. */
export const LANDING_SEO: Record<string, PageSEO> = {
  "/": defaultSEO,
  "/features": {
    title: "Features – Answer Lab, Analytics, Mentor | MentorsDaily",
    description:
      "Answer Lab for daily writing & feedback, performance analytics, PYQ insights, and 24/7 AI mentor. Everything you need for UPSC preparation in one dashboard.",
    path: "/features",
    keywords: "UPSC answer writing, UPSC analytics, AI mentor, UPSC features, answer lab",
  },
  "/pricing": {
    title: "Pricing – MentorsDaily Plans | UPSC Preparation",
    description:
      "Transparent pricing for MentorsDaily. Aspirant-friendly plans with unlimited practice, analytics, and mentor chat. No hidden charges.",
    path: "/pricing",
    keywords: "MentorsDaily pricing, UPSC preparation cost, UPSC mentor subscription",
  },
  "/compare": {
    title: "Compare – MentorsDaily vs Others | UPSC Prep",
    description:
      "See how MentorsDaily compares: one dashboard for answer writing, tests, analytics and mentor support. Built for serious UPSC aspirants.",
    path: "/compare",
    keywords: "MentorsDaily vs others, UPSC prep comparison, best UPSC platform",
  },
  "/testimonials": {
    title: "Testimonials – What Aspirants Say | MentorsDaily",
    description:
      "Read what UPSC aspirants say about MentorsDaily: answer writing, analytics, and mentor support that helped them prepare better.",
    path: "/testimonials",
    keywords: "MentorsDaily reviews, UPSC aspirant testimonials, UPSC success stories",
  },
  "/about": {
    title: "About MentorsDaily – AI-Powered UPSC Preparation",
    description:
      "Learn about MentorsDaily: our mission to help UPSC aspirants with one dashboard for answer writing, tests, analytics and 24/7 mentor support.",
    path: "/about",
    keywords: "about MentorsDaily, UPSC preparation platform, UPSC mentor",
  },
};

export function getLandingSEO(pathname: string): PageSEO {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return LANDING_SEO[normalized] ?? { ...defaultSEO, path: normalized };
}
