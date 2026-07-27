import React from "react";

export type GenderValue = "" | "Male" | "Female" | "Other";

type GenderAvatarProps = {
  gender?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-8 w-8 md:h-9 md:w-9",
  md: "h-14 w-14",
  lg: "h-16 w-16",
};

const MaleAvatar = () => (
  <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden>
    <circle cx="40" cy="40" r="40" fill="#DBEAFE" />
    <circle cx="40" cy="30" r="14" fill="#FBBF24" />
    <path d="M18 72c2-16 12-26 22-26s20 10 22 26" fill="#2563EB" />
    <circle cx="34" cy="29" r="1.8" fill="#1E293B" />
    <circle cx="46" cy="29" r="1.8" fill="#1E293B" />
    <path d="M35 36c2.5 2.5 7.5 2.5 10 0" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M26 22c4-8 24-8 28 0-6-3-22-3-28 0z" fill="#92400E" />
  </svg>
);

const FemaleAvatar = () => (
  <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden>
    <circle cx="40" cy="40" r="40" fill="#FCE7F3" />
    <path d="M18 24c4-14 40-14 44 0 1 16-6 24-10 26-4-8-20-8-24 0-4-2-11-10-10-26z" fill="#7C2D12" />
    <circle cx="40" cy="31" r="13" fill="#FBBF24" />
    <path d="M20 72c3-15 12-24 20-24s17 9 20 24" fill="#DB2777" />
    <circle cx="34.5" cy="30" r="1.8" fill="#1E293B" />
    <circle cx="45.5" cy="30" r="1.8" fill="#1E293B" />
    <path d="M35 37c2.5 2.2 7.5 2.2 10 0" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>
);

const OtherAvatar = () => (
  <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden>
    <circle cx="40" cy="40" r="40" fill="#E0E7FF" />
    <circle cx="40" cy="30" r="14" fill="#FBBF24" />
    <path d="M18 72c2-16 12-26 22-26s20 10 22 26" fill="#6366F1" />
    <circle cx="34" cy="29" r="1.8" fill="#1E293B" />
    <circle cx="46" cy="29" r="1.8" fill="#1E293B" />
    <path d="M35 36c2.5 2.5 7.5 2.5 10 0" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M26 20c6-6 22-6 28 0-8-1-20-1-28 0z" fill="#4338CA" />
  </svg>
);

/** Circular gender-based avatar; falls back to name initial when gender is unset. */
export const GenderAvatar: React.FC<GenderAvatarProps> = ({
  gender,
  name,
  size = "md",
  className = "",
}) => {
  const normalized = String(gender || "").trim();
  const sizeCls = sizeMap[size];

  if (normalized === "Male") {
    return (
      <div className={`${sizeCls} shrink-0 overflow-hidden rounded-full ${className}`}>
        <MaleAvatar />
      </div>
    );
  }
  if (normalized === "Female") {
    return (
      <div className={`${sizeCls} shrink-0 overflow-hidden rounded-full ${className}`}>
        <FemaleAvatar />
      </div>
    );
  }
  if (normalized === "Other") {
    return (
      <div className={`${sizeCls} shrink-0 overflow-hidden rounded-full ${className}`}>
        <OtherAvatar />
      </div>
    );
  }

  return (
    <div
      className={`${sizeCls} flex shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-600 ${className}`}
    >
      {name?.charAt(0).toUpperCase() || "U"}
    </div>
  );
};
