import React from "react";
import {
  LineChart,
  CalendarClock,
  MessageCircle,
  FileText,
  Video,
  ClipboardList,
  User,
  Users,
  History,
  Home,
  HelpCircle,
  BarChart3,
  Target,
  IndianRupee,
  Tag,
  Newspaper,
  BookOpen,
  Database,
  Layers,
  Activity,
  Brain,
  Award,
  CreditCard,
  Library,
  Coins,
} from "lucide-react";
import type { PageTitleInfo } from "./types";

export const getPageTitle = (pathname: string, userRole?: string): PageTitleInfo => {
  const studentRouteMap: Record<string, PageTitleInfo> = {
    "/home": { title: "Home", icon: <Home className="w-5 h-5" /> },
    "/daily-targets": { title: "Daily Targets", icon: <Target className="w-5 h-5" /> },
    "/syllabus": { title: "Syllabus", icon: <BookOpen className="w-5 h-5" /> },
    "/performance": { title: "Performance Dashboard", icon: <BarChart3 className="w-5 h-5" /> },
    "/planner": { title: "Study Planner", icon: <CalendarClock className="w-5 h-5" /> },
    "/mentor": { title: "AI Mentor", icon: <MessageCircle className="w-5 h-5" /> },
    "/copy-evaluation": { title: "Copy Evaluation", icon: <FileText className="w-5 h-5" /> },
    "/prelims-test": { title: "Practice Test", icon: <ClipboardList className="w-5 h-5" /> },
    "/practice-test": { title: "Modular Test", icon: <Layers className="w-5 h-5" /> },
    "/practice-test/history": { title: "Modular Test History", icon: <History className="w-5 h-5" /> },
    "/prelims-mock": { title: "Prelims Test Series", icon: <Award className="w-5 h-5" /> },
    "/current-affairs": { title: "Daily Current Affairs", icon: <Newspaper className="w-5 h-5" /> },
    "/mains-360": { title: "Mains 360", icon: <Library className="w-5 h-5" /> },
    "/module-chapter-history": { title: "Chapter Test History", icon: <History className="w-5 h-5" /> },
    "/meeting": { title: "Live Meeting", icon: <Video className="w-5 h-5" /> },
    "/profile": { title: "Profile", icon: <User className="w-5 h-5" /> },
    "/student-profiler": { title: "Student Profiler", icon: <User className="w-5 h-5" /> },
    "/help-support": { title: "Help & Support", icon: <HelpCircle className="w-5 h-5" /> },
    "/mains-evaluation": { title: "Mains Evaluation", icon: <FileText className="w-5 h-5" /> },
  };

  const mentorRouteMap: Record<string, PageTitleInfo> = {
    "/mentor-dashboard": { title: "Mentor Dashboard", icon: <BarChart3 className="w-5 h-5" /> },
    "/mentor-dashboard/students": { title: "Your Students", icon: <Users className="w-5 h-5" /> },
    "/mentor-dashboard/topic-practice": { title: "Topic Practice", icon: <ClipboardList className="w-5 h-5" /> },
    "/mentor-dashboard/syllabus-targets": { title: "Syllabus Targets", icon: <BookOpen className="w-5 h-5" /> },
    "/profile": { title: "Profile", icon: <User className="w-5 h-5" /> },
    "/help-support": { title: "Help & Support", icon: <HelpCircle className="w-5 h-5" /> },
  };

  const adminRouteMap: Record<string, PageTitleInfo> = {
    "/admin/dashboard": { title: "Admin Dashboard", icon: <BarChart3 className="w-5 h-5" /> },
    "/admin/students": { title: "MD Student", icon: <Users className="w-5 h-5" /> },
    "/admin/mentors": { title: "Mentors", icon: <Users className="w-5 h-5" /> },
    "/admin/prelims-mock": { title: "Prelims Test Series", icon: <Award className="w-5 h-5" /> },
    "/admin/knowledge-base": { title: "Knowledge Base", icon: <Database className="w-5 h-5" /> },
    "/admin/processing": { title: "Processing Engine", icon: <Activity className="w-5 h-5" /> },
    "/admin/intelligence": { title: "Knowledge Intelligence", icon: <Brain className="w-5 h-5" /> },
    "/admin/ai-analytics": { title: "AI Cost Analytics", icon: <Coins className="w-5 h-5" /> },
    "/admin/ai-health": { title: "AI Health Monitor", icon: <Activity className="w-5 h-5" /> },
    "/admin/topic-practice": { title: "Topic Practice", icon: <ClipboardList className="w-5 h-5" /> },
    "/admin/syllabus-targets": { title: "Syllabus Targets", icon: <BookOpen className="w-5 h-5" /> },
    "/admin/pricing": { title: "Manage Pricing Plans", icon: <IndianRupee className="w-5 h-5" /> },
    "/admin/mains-materials": { title: "Mains Materials", icon: <Library className="w-5 h-5" /> },
    "/admin/offer-manager": { title: "Offer Manager", icon: <Tag className="w-5 h-5" /> },
    "/admin/notes-analytics": { title: "Notes Analytics", icon: <BarChart3 className="w-5 h-5" /> },
    "/admin/notes-pricing-plans": { title: "Pricing Plans", icon: <IndianRupee className="w-5 h-5" /> },
    "/admin/notes-payments": { title: "Payments", icon: <CreditCard className="w-5 h-5" /> },
    "/admin/notes-manager": { title: "Registered Notes Users", icon: <Users className="w-5 h-5" /> },
    "/admin/current-affairs": { title: "Current Affairs", icon: <Newspaper className="w-5 h-5" /> },
    "/profile": { title: "Profile", icon: <User className="w-5 h-5" /> },
    "/help-support": { title: "Help & Support", icon: <HelpCircle className="w-5 h-5" /> },
  };

  let routeMap = studentRouteMap;
  if (userRole === "admin") routeMap = adminRouteMap;
  else if (userRole === "mentor") routeMap = mentorRouteMap;

  if (
    userRole === "mentor" &&
    pathname.startsWith("/mentor-dashboard/students/") &&
    pathname !== "/mentor-dashboard/students"
  ) {
    return { title: "Student detail", icon: <User className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/copy-evaluation/")) {
    return { title: "Copy Evaluation Details", icon: <FileText className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/current-affairs/") && pathname !== "/current-affairs") {
    return { title: "Current Affairs", icon: <Newspaper className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/test/")) {
    return { title: "Test", icon: <ClipboardList className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/admin/mock-results/")) {
    return { title: "Mock Results", icon: <Target className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/admin/student-performance/")) {
    return { title: "Student Performance", icon: <Target className="w-5 h-5" /> };
  }
  if (pathname.startsWith("/result/")) {
    return { title: "Test Result", icon: <LineChart className="w-5 h-5" /> };
  }
  return routeMap[pathname] || { title: "Dashboard", icon: <Home className="w-5 h-5" /> };
};
