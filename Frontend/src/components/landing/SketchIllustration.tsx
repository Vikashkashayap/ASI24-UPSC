import { useTheme } from "../../hooks/useTheme";

type SketchType = "pen" | "circle" | "arrow" | "doc" | "chart" | "bulb" | "quote" | "rocket";

const sketchStyles = "stroke-[1.5] opacity-80";

export const SketchIllustration = ({ type, className = "" }: { type: SketchType; className?: string }) => {
  const { theme } = useTheme();
  const stroke = theme === "dark" ? "rgba(167,139,250,0.6)" : "rgba(139,92,246,0.6)";

  const svgs: Record<SketchType, JSX.Element> = {
    pen: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2">
        <path d="M20 60 L35 45 L55 25 L60 20 M35 45 L40 50 L55 35" />
        <path d="M60 20 L55 25 L50 30" />
      </svg>
    ),
    circle: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeDasharray="4 3">
        <circle cx="40" cy="40" r="28" />
        <circle cx="40" cy="40" r="18" />
      </svg>
    ),
    arrow: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2">
        <path d="M15 40 L50 40 M45 35 L50 40 L45 45" />
        <path d="M20 25 L35 40 L20 55" />
      </svg>
    ),
    doc: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2">
        <rect x="20" y="15" width="40" height="50" rx="2" />
        <path d="M28 28 L52 28 M28 36 L48 36 M28 44 L45 44" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2">
        <path d="M20 60 L20 25 L60 25 L60 60 Z" />
        <path d="M30 45 L40 35 L50 48 L60 30" />
      </svg>
    ),
    bulb: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2">
        <path d="M40 15 C25 15 15 30 15 45 C15 55 25 60 40 65 C55 60 65 55 65 45 C65 30 55 15 40 15" />
        <path d="M32 65 L32 72 L48 72 L48 65" />
        <path d="M35 72 L45 72" />
      </svg>
    ),
    quote: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeDasharray="3 2">
        <path d="M20 35 Q25 20 35 25 Q30 40 20 45 Z" />
        <path d="M45 35 Q50 20 60 25 Q55 40 45 45 Z" />
      </svg>
    ),
    rocket: (
      <svg viewBox="0 0 80 80" className={`w-full h-full ${sketchStyles}`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2">
        <path d="M40 15 L45 35 L55 55 L40 65 L25 55 L35 35 Z" />
        <path d="M40 35 L40 65" />
        <path d="M30 70 L40 65 L50 70" />
      </svg>
    ),
  };

  return <div className={`${className}`}>{svgs[type]}</div>;
};
