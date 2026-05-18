import { useTheme } from "../../hooks/useTheme";

/**
 * Technology partner strip — Vedix Lab logo. Use in footer (compact) or standalone.
 */
export const VedixLabBanner = ({
  className = "",
  variant = "footer",
}: {
  className?: string;
  variant?: "footer" | "card";
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const inner = (
    <>
      <span
        className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] ${
          isDark ? "text-slate-500" : "text-slate-500"
        }`}
      >
        Technology partner
      </span>
      <span
        className={`hidden h-8 w-px shrink-0 sm:block ${
          isDark ? "bg-slate-700" : "bg-slate-300"
        }`}
        aria-hidden
      />
      <img
        src="/vedixlab-logo.png"
        alt="VedixLab"
        className={`object-contain object-center transition-transform duration-300 group-hover:scale-[1.03] ${
          variant === "footer"
            ? "h-8 w-auto max-w-[200px] sm:h-9 sm:max-w-[240px]"
            : "h-16 w-auto max-w-[min(90vw,420px)] px-4 sm:h-24 sm:max-w-[min(85vw,520px)] md:h-28 lg:h-32"
        }`}
        width={120}
        height={40}
        loading="lazy"
      />
    </>
  );

  if (variant === "footer") {
    return (
      <a
        href="https://vedixlab.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex w-full max-w-7xl flex-col items-center justify-center gap-3 rounded-xl border px-4 py-4 transition-colors sm:flex-row sm:gap-6 sm:py-3 ${
          isDark
            ? "border-slate-800/80 bg-slate-950/50 hover:border-red-500/25 hover:bg-slate-900/40"
            : "border-slate-200 bg-white/80 hover:border-red-200 hover:bg-slate-50"
        } ${className}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <a
      href="https://vedixlab.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={`group block w-full ${className}`}
    >
      <div
        className="relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 py-6 shadow-md shadow-black/20 transition-all duration-300 hover:border-red-500/30 hover:shadow-lg hover:shadow-black/25 sm:rounded-[1.25rem] sm:flex-row sm:gap-8 sm:py-8 md:py-10"
      >
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-600/80 via-red-500 to-red-600/60"
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Technology partner
        </span>
        <img
          src="/vedixlab-logo.png"
          alt="VedixLab"
          className="h-16 w-auto max-w-[min(90vw,420px)] object-contain px-4 transition-transform duration-300 group-hover:scale-[1.04] sm:h-24 sm:max-w-[min(85vw,520px)] md:h-28 lg:h-32"
          width={60}
          height={60}
          loading="lazy"
        />
      </div>
    </a>
  );
};
