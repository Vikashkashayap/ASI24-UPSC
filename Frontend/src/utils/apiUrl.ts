import { Capacitor } from "@capacitor/core";

/** Production API host used by the live website and Android app. */
export const PRODUCTION_API_ORIGIN = "https://studentportal.mentorsdaily.com";

/**
 * Resolve Axios baseURL from VITE_API_URL.
 * Web behaviour is unchanged. Native apps never use same-origin "" / relative hosts.
 */
export function resolveApiBaseURL(): string {
  const defaultApiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/api");
  const raw = defaultApiUrl.replace(/\/$/, "");
  const stripped = raw.replace(/\/api$/i, "").trim();

  let baseURL: string;
  if (stripped === "" && raw === "/api") {
    baseURL = ""; // website same-origin → paths stay /api/...
  } else if (stripped === "") {
    baseURL = "http://localhost:5000";
  } else {
    baseURL = stripped;
  }

  if (Capacitor.isNativePlatform() && !/^https?:\/\//i.test(baseURL)) {
    return PRODUCTION_API_ORIGIN;
  }

  return baseURL;
}

/**
 * Socket.IO server origin. Mirrors API resolution; never uses Capacitor WebView origin.
 */
export function resolveSocketURL(): string {
  const base = resolveApiBaseURL();
  if (base !== "") return base;
  if (Capacitor.isNativePlatform()) return PRODUCTION_API_ORIGIN;
  return typeof window !== "undefined" ? window.location.origin : PRODUCTION_API_ORIGIN;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
