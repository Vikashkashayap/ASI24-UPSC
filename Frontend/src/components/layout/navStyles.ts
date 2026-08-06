import type { LayoutTheme } from "./types";

export const SIDEBAR_EXPANDED_WIDTH = "w-[280px]";
export const SIDEBAR_COLLAPSED_WIDTH = "w-[72px]";
export const HEADER_HEIGHT = "h-[72px]";

export const navLinkClass = ({
  isActive,
  theme,
  collapsed,
  muted,
}: {
  isActive: boolean;
  theme: LayoutTheme;
  collapsed?: boolean;
  muted?: boolean;
}) =>
  `flex items-center ${collapsed ? "justify-center" : "gap-2.5"} ${
    collapsed ? "px-2" : "px-3"
  } py-2 rounded-xl text-[13px] font-medium transition-all duration-150 min-h-[42px] touch-manipulation relative group ${
    theme === "dark"
      ? `hover:bg-white/[0.06] active:bg-white/[0.08] ${
          isActive
            ? "bg-blue-500/15 text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.12)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-blue-400"
            : muted
              ? "text-slate-500 hover:text-slate-300"
              : "text-slate-300"
        }`
      : `hover:bg-slate-100/90 active:bg-slate-200/80 ${
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-blue-600"
            : muted
              ? "text-slate-500 hover:text-slate-700"
              : "text-slate-600"
        }`
  }`;

export const sidebarSectionLabelClass = (theme: LayoutTheme) =>
  `px-3 mb-1.5 mt-4 first:mt-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
    theme === "dark" ? "text-slate-400" : "text-slate-500"
  }`;

export const sidebarNavIconClass = (isActive: boolean, theme: LayoutTheme) =>
  `w-[17px] h-[17px] flex-shrink-0 stroke-[2] transition-colors ${
    isActive
      ? theme === "dark"
        ? "text-blue-300"
        : "text-blue-600"
      : theme === "dark"
        ? "text-slate-400 group-hover:text-slate-200"
        : "text-slate-500 group-hover:text-slate-700"
  }`;

export const sidebarSurfaceClass = (theme: LayoutTheme) =>
  theme === "dark"
    ? "border-slate-800/80 bg-[#0B1220] text-slate-50"
    : "border-gray-200 bg-white text-slate-900";

export const glassHeaderClass = (theme: LayoutTheme) =>
  `relative sticky top-0 z-30 min-h-[72px] flex items-center justify-between gap-3 px-3 md:px-5 lg:px-6 border-b backdrop-blur-xl shrink-0 shadow-sm pt-[env(safe-area-inset-top,0px)] ${
    theme === "dark"
      ? "border-slate-800/80 bg-[#0B1220]/90 shadow-black/20"
      : "border-gray-200/80 bg-white/85 shadow-slate-200/40"
  }`;

export const formatExpiryDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
};
