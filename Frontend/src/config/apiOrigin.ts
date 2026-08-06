import { Capacitor } from "@capacitor/core";

/** Production API host used by the Android/iOS Capacitor shell. */
export const PRODUCTION_API_ORIGIN = "https://studentportal.mentorsdaily.com";

/**
 * Resolve axios/socket origin.
 * - Web prod (nginx): same-origin "" so /api/* hits the site
 * - Capacitor APK: never use relative /api (origin is https://localhost) — hit production
 */
export function resolveApiOrigin(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";
  const isDev = import.meta.env.MODE === "development";
  const isNative = Capacitor.isNativePlatform();

  // Explicit env always wins (Cap builds should set VITE_API_URL)
  if (envUrl) {
    if (envUrl === "/api" || envUrl.endsWith("/api")) {
      if (isNative) return PRODUCTION_API_ORIGIN;
      const stripped = envUrl.replace(/\/api$/i, "").trim();
      return stripped === "" ? "" : stripped;
    }
    return envUrl.replace(/\/api$/i, "").replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
  }

  if (isNative) {
    return PRODUCTION_API_ORIGIN;
  }

  if (isDev) {
    return "http://localhost:5000";
  }

  // Production web: same-origin
  return "";
}

/** Socket.IO server URL (never empty relative). */
export function resolveSocketUrl(): string {
  const origin = resolveApiOrigin();
  if (origin) return origin;
  if (typeof window !== "undefined") return window.location.origin;
  return PRODUCTION_API_ORIGIN;
}
