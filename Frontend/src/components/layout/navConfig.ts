import {
  Target,
  Library,
  BookOpen,
  BarChart3,
  FileText,
  ClipboardList,
  Layers,
  Award,
  Newspaper,
  CalendarClock,
  MessageCircle,
  User,
  Settings,
  Home,
} from "lucide-react";
import type { BottomNavItemConfig, SidebarSectionConfig } from "./types";

/** Student drawer / sidebar sections — routes unchanged */
export const STUDENT_NAV_SECTIONS: SidebarSectionConfig[] = [
  {
    id: "general",
    label: "General",
    items: [
      { to: "/home", title: "Home", label: "Home", icon: Home, end: true },
      { to: "/daily-targets", title: "Daily Targets", label: "Daily Targets", icon: Target },
      { to: "/mains-360", title: "Mains 360", label: "Mains 360", icon: Library },
      { to: "/syllabus", title: "Syllabus", label: "Syllabus", icon: BookOpen },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { to: "/performance", title: "Performance Dashboard", label: "Performance", icon: BarChart3 },
      {
        to: "/copy-evaluation",
        title: "Copy Evaluation",
        label: "Copy Evaluation",
        icon: FileText,
        isActiveMatch: (path) => path === "/copy-evaluation" || path.startsWith("/copy-evaluation/"),
      },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    items: [
      {
        to: "/prelims-test",
        title: "Practice Test",
        label: "Practice Test",
        icon: ClipboardList,
        isActiveMatch: (path) =>
          path === "/prelims-test" ||
          path.startsWith("/prelims-test/") ||
          path.startsWith("/test/") ||
          path.startsWith("/result/"),
      },
      {
        to: "/practice-test",
        title: "Modular Test — admin assigned",
        label: "Modular Test",
        icon: Layers,
        isActiveMatch: (path) => path === "/practice-test" || path.startsWith("/practice-test/"),
      },
      {
        to: "/prelims-mock",
        title: "Prelims Test Series — scheduled tests",
        label: "Prelims Test Series",
        icon: Award,
      },
    ],
  },
  {
    id: "study",
    label: "Study",
    items: [
      {
        to: "/current-affairs",
        title: "Daily Current Affairs",
        label: "Current Affairs",
        icon: Newspaper,
        isActiveMatch: (path) => path === "/current-affairs" || path.startsWith("/current-affairs/"),
      },
      { to: "/planner", title: "Study Planner", label: "Study Planner", icon: CalendarClock },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { to: "/mentor", title: "AI Mentor", label: "AI Mentor", icon: MessageCircle },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { to: "/profile", title: "Profile", label: "Profile", icon: User },
      { to: "/profile", title: "Settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Mobile bottom navigation — students only; routes unchanged */
export const STUDENT_BOTTOM_NAV: BottomNavItemConfig[] = [
  {
    id: "home",
    label: "Home",
    to: "/home",
    icon: Home,
    isActiveMatch: (path) => path === "/home",
  },
  {
    id: "target",
    label: "Target",
    to: "/daily-targets",
    icon: Target,
    isActiveMatch: (path) => path === "/daily-targets" || path.startsWith("/daily-targets/"),
  },
  {
    id: "practice",
    label: "Practice",
    to: "/prelims-test",
    icon: ClipboardList,
    isActiveMatch: (path) =>
      path === "/prelims-test" ||
      path.startsWith("/prelims-test/") ||
      path.startsWith("/test/") ||
      path.startsWith("/result/") ||
      path === "/practice-test" ||
      path.startsWith("/practice-test/") ||
      path === "/prelims-mock",
  },
  {
    id: "mains",
    label: "Mains 360",
    to: "/mains-360",
    icon: Library,
    isActiveMatch: (path) => path === "/mains-360" || path.startsWith("/mains-360/"),
  },
  {
    id: "copy",
    label: "Copy Eval",
    to: "/copy-evaluation",
    icon: FileText,
    isActiveMatch: (path) =>
      path === "/copy-evaluation" || path.startsWith("/copy-evaluation/"),
  },
];

export const NOTES_EXTERNAL_URL = "https://notes.mentorsdaily.com/";

export const KB_RAG_ROUTES = [
  "/admin/knowledge-base",
  "/admin/processing",
  "/admin/intelligence",
  "/admin/ai-analytics",
  "/admin/ai-health",
] as const;
