import { api } from "./api";
import { DEFAULT_APK_VERSION, VERSION_JSON_URL } from "../config/downloadDefaults";
import type { ApkVersionInfo, DownloadAnalyticsPayload } from "../types/download";

function isValidVersion(data: unknown): data is ApkVersionInfo {
  if (!data || typeof data !== "object") return false;
  const v = data as Record<string, unknown>;
  return (
    typeof v.version === "string" &&
    typeof v.size === "string" &&
    typeof v.releaseDate === "string" &&
    typeof v.apk === "string" &&
    typeof v.minimumAndroid === "string" &&
    typeof v.appName === "string" &&
    Array.isArray(v.features)
  );
}

/** Fetches version.json from public/downloads — update that file for future releases. */
export async function fetchApkVersion(): Promise<ApkVersionInfo> {
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return DEFAULT_APK_VERSION;
    const data: unknown = await res.json();
    if (!isValidVersion(data)) return DEFAULT_APK_VERSION;
    return {
      ...DEFAULT_APK_VERSION,
      ...data,
      features: data.features.length ? data.features : DEFAULT_APK_VERSION.features,
    };
  } catch {
    return DEFAULT_APK_VERSION;
  }
}

export async function trackApkDownload(payload: DownloadAnalyticsPayload): Promise<void> {
  try {
    await api.post("/api/download", {
      version: payload.version,
      device: payload.device,
      userAgent: payload.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : ""),
      source: payload.source || "download_page",
    });
  } catch {
    // Analytics must never block the download
  }
}

export function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}
