import type { ComponentType, ReactNode } from "react";

export type LayoutTheme = "dark" | "light";

export type UserRole = "admin" | "mentor" | "student" | string;

export interface LayoutUser {
  name?: string;
  email?: string;
  gender?: string | null;
  role?: UserRole;
  accountType?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: { name?: string } | null;
  subscriptionEndDate?: string | null;
}

export interface SidebarNavItemConfig {
  to: string;
  title: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  muted?: boolean;
  isActiveMatch?: (pathname: string) => boolean;
}

export interface SidebarSectionConfig {
  id: string;
  label: string;
  items: SidebarNavItemConfig[];
}

export interface BottomNavItemConfig {
  id: string;
  label: string;
  to?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  isActiveMatch?: (pathname: string) => boolean;
}

export interface PageTitleInfo {
  title: string;
  icon: ReactNode;
}
