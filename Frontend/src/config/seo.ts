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
  title: "MentorsDaily – India's AI Student Portal | UPSC Preparation",
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
    title: "Features – Answer Lab, Prelims, Analytics, Mentor | MentorsDaily",
    description:
      "Answer Lab, Performance Analytics, Current Affairs Lab, Concept Simplifier, student dashboard, prelims practice, AI Mentor, study planner, copy evaluation, profiler, live meetings — all in one UPSC student portal.",
    path: "/features",
    keywords:
      "UPSC answer writing, prelims MCQ mock, performance analytics, AI mentor, study planner, current affairs, concept notes, MentorsDaily",
  },
  "/pricing": {
    title: "Plans – MentorsDaily Pro | UPSC Preparation",
    description:
      "Choose your MentorsDaily Pro plan. Aspirant-friendly subscriptions with unlimited practice, analytics, and mentor chat. No hidden charges.",
    path: "/pricing",
    keywords: "MentorsDaily plans, UPSC preparation cost, UPSC mentor subscription",
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
  "/terms-conditions": {
    title: "Terms & Conditions | MentorsDaily",
    description:
      "Terms and conditions for MentorsDaily Student Portal: courses, test series, study materials, accounts and payments at studentportal.mentorsdaily.com.",
    path: "/terms-conditions",
    keywords: "MentorsDaily terms, UPSC portal terms, student portal legal",
  },
  "/refund-policy": {
    title: "Refund Policy | MentorsDaily",
    description:
      "Refund policy for MentorsDaily: 3-day window, test series access rules, 7 working days processing. UPSC preparation.",
    path: "/refund-policy",
    keywords: "MentorsDaily refund, UPSC course refund policy",
  },
  "/disclaimer": {
    title: "Disclaimer | MentorsDaily",
    description:
      "Disclaimer for MentorsDaily: educational use, no exam result guarantee, third-party links. UPSC platform.",
    path: "/disclaimer",
    keywords: "MentorsDaily disclaimer, UPSC prep disclaimer",
  },
  "/contact-us": {
    title: "Contact Us | MentorsDaily",
    description:
      "Contact MentorsDaily: support for courses, test series, accounts. Email hr@mentorsdaily.com.",
    path: "/contact-us",
    keywords: "contact MentorsDaily, student portal support, hr@mentorsdaily.com",
  },
  "/privacy": {
    title: "Privacy Policy | MentorsDaily",
    description:
      "Privacy policy for MentorsDaily at studentportal.mentorsdaily.com. How we collect and protect your data.",
    path: "/privacy",
    keywords: "MentorsDaily privacy policy, student data",
  },
};

export function getLandingSEO(pathname: string): PageSEO {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return LANDING_SEO[normalized] ?? { ...defaultSEO, path: normalized };
}
