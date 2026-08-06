import type { ApkVersionInfo } from "../types/download";

/** Fallback if /downloads/version.json is unreachable. Keep in sync with public/downloads/version.json. */
export const DEFAULT_APK_VERSION: ApkVersionInfo = {
  version: "1.0.0",
  size: "10.6 MB",
  releaseDate: "2026-08-06",
  apk: "https://studentportal.mentorsdaily.com/downloads/MD-Student-Portal.apk",
  minimumAndroid: "Android 8+",
  appName: "MentorsDaily Student Portal",
  packageId: "com.mentorsdaily.studentportal",
  changelog: [
    "First Android release of MentorsDaily Student Portal",
    "Answer Lab, Prelims practice, Analytics & AI Mentor",
    "Study planner, Current Affairs & mentor chat",
  ],
  features: [
    "AI-powered Answer Lab & copy evaluation",
    "Prelims mocks & daily practice",
    "Performance analytics dashboard",
    "Study planner & daily targets",
    "Current Affairs Lab",
    "24/7 AI Mentor chat",
    "Live mentor meetings",
  ],
};

export const VERSION_JSON_URL = "/downloads/version.json";
