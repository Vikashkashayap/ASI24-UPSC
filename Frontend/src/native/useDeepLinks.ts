import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { isNativePlatform } from "./platform";

/**
 * Deep link / app URL open handler.
 * Expects https://studentportal.mentorsdaily.com/... or custom scheme paths.
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    const go = (raw: string) => {
      try {
        let path = raw;
        if (raw.startsWith("http")) {
          const u = new URL(raw);
          path = u.pathname + u.search + u.hash;
        } else if (raw.includes("://")) {
          const after = raw.split("://")[1] || "";
          path = "/" + after.replace(/^[^/]+/, "").replace(/^\//, "");
          if (!path.startsWith("/")) path = "/" + path;
        }
        if (path.startsWith("/")) navigate(path);
      } catch {
        /* ignore malformed */
      }
    };

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (detail?.path) go(detail.path);
    };
    window.addEventListener("md:deep-link", onCustom);

    if (!isNativePlatform()) {
      return () => window.removeEventListener("md:deep-link", onCustom);
    }

    const sub = CapApp.addListener("appUrlOpen", ({ url }) => go(url));

    return () => {
      window.removeEventListener("md:deep-link", onCustom);
      void sub.then((h) => h.remove());
    };
  }, [navigate]);
}
