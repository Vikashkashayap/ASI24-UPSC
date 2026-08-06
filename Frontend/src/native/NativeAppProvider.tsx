import React, { useEffect } from "react";
import { initNativeApp } from "./initNativeApp";
import { useNativeBackButton } from "./useNativeBackButton";
import { useDeepLinks } from "./useDeepLinks";
import { NetworkProvider } from "../offline/NetworkProvider";
import { OfflineBanner } from "../components/system/OfflineBanner";
import { flushOfflineQueue } from "../offline/offlineQueue";

/**
 * Boots Capacitor native shell + network awareness.
 * Wrap near the root (inside Router) so back-button can use navigation.
 */
export function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initNativeApp();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "MD_FLUSH_OFFLINE_QUEUE") {
        void flushOfflineQueue().catch(() => {});
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);

  useNativeBackButton();
  useDeepLinks();

  return (
    <NetworkProvider>
      <OfflineBanner />
      {children}
    </NetworkProvider>
  );
}
