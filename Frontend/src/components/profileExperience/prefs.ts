/** Local-only prefs for Profile UX — no backend / auth changes */

export type AppearancePrefs = {
  theme: "light" | "dark" | "system";
  accent: string;
  fontSize: "sm" | "md" | "lg";
  radius: "md" | "xl" | "2xl";
  animations: boolean;
  compact: boolean;
};

export type NotifyPrefs = Record<string, boolean>;

export type SecurityPrefs = {
  appLock: boolean;
  pinReady: boolean;
  biometricReady: boolean;
};

export type PersonalizationPrefs = {
  language: "en" | "hi" | "bilingual";
  defaultHome: string;
};

const APPEARANCE_KEY = "md_appearance_prefs";
const NOTIFY_KEY = "md_notify_prefs";
const SECURITY_KEY = "md_security_prefs";
const PERSONAL_KEY = "md_personal_prefs";

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: "light",
  accent: "blue",
  fontSize: "md",
  radius: "xl",
  animations: true,
  compact: false,
};

export const DEFAULT_NOTIFY: NotifyPrefs = {
  currentAffairs: true,
  aiReminder: true,
  dailyTargets: true,
  revision: true,
  copyEvaluation: true,
  practiceTest: true,
  studyPlanner: true,
  examReminder: true,
  leaderboard: false,
  achievements: true,
};

export const DEFAULT_SECURITY: SecurityPrefs = {
  appLock: false,
  pinReady: false,
  biometricReady: false,
};

export const DEFAULT_PERSONAL: PersonalizationPrefs = {
  language: "en",
  defaultHome: "/home",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export const profilePrefs = {
  getAppearance: () => read(APPEARANCE_KEY, DEFAULT_APPEARANCE),
  setAppearance: (v: AppearancePrefs) => write(APPEARANCE_KEY, v),
  getNotify: () => read(NOTIFY_KEY, DEFAULT_NOTIFY),
  setNotify: (v: NotifyPrefs) => write(NOTIFY_KEY, v),
  getSecurity: () => read(SECURITY_KEY, DEFAULT_SECURITY),
  setSecurity: (v: SecurityPrefs) => write(SECURITY_KEY, v),
  getPersonal: () => read(PERSONAL_KEY, DEFAULT_PERSONAL),
  setPersonal: (v: PersonalizationPrefs) => write(PERSONAL_KEY, v),
};

export const NOTIFY_LABELS: { key: string; label: string; hint: string }[] = [
  { key: "currentAffairs", label: "Current Affairs", hint: "Daily AI-curated news" },
  { key: "aiReminder", label: "AI Reminder", hint: "Mentor nudges" },
  { key: "dailyTargets", label: "Daily Targets", hint: "Task reminders" },
  { key: "revision", label: "Revision Reminder", hint: "Due topics" },
  { key: "copyEvaluation", label: "Copy Evaluation", hint: "When AI finishes" },
  { key: "practiceTest", label: "Practice Test", hint: "Assigned / modular tests" },
  { key: "studyPlanner", label: "Study Planner", hint: "Plan & streak" },
  { key: "examReminder", label: "Exam Reminder", hint: "Countdown alerts" },
  { key: "leaderboard", label: "Leaderboard", hint: "Rank updates" },
  { key: "achievements", label: "Achievements", hint: "Badges & XP" },
];

export function scanSyllabusBookmarks(): { title: string; key: string }[] {
  const out: { title: string; key: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("syllabus-bm:")) continue;
      if (localStorage.getItem(key) !== "1") continue;
      out.push({ key, title: key.replace("syllabus-bm:", "") });
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export function estimateCacheMb(): number {
  try {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      bytes += k.length + (localStorage.getItem(k)?.length || 0);
    }
    return Math.round((bytes * 2) / 1024 / 1024 * 10) / 10;
  } catch {
    return 0;
  }
}
