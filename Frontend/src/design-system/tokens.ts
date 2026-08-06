/**
 * MentorsDaily design tokens — single source for theme, spacing, type.
 * Navy / sky / gold from MD Student Portal brand identity.
 */
export const mdTokens = {
  color: {
    navy: "#0f1e3d",
    navySoft: "#1a3366",
    blue: "#2563eb",
    blueDark: "#1d4ed8",
    sky: "#38bdf8",
    gold: "#f59e0b",
    white: "#ffffff",
    page: "#f0f9ff",
    pageDark: "#0b1220",
    card: "#ffffff",
    cardDark: "#111827",
    text: "#0f172a",
    textDark: "#f1f5f9",
    muted: "#64748b",
    border: "#e2e8f0",
    borderDark: "#1e293b",
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  type: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  touch: {
    min: 44,
  },
  motion: {
    fast: 150,
    base: 220,
    slow: 320,
  },
} as const;

export type MdTokens = typeof mdTokens;
