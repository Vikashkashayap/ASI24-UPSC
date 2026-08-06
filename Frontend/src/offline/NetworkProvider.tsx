import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Network } from "@capacitor/network";
import { isNativePlatform } from "../native/platform";
import { flushOfflineQueue } from "./offlineQueue";

type NetworkContextValue = {
  online: boolean;
  connectionType: string;
};

const NetworkContext = createContext<NetworkContextValue>({
  online: true,
  connectionType: "unknown",
});

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState("unknown");

  useEffect(() => {
    let removeNative: (() => void) | undefined;

    const onOnline = () => {
      setOnline(true);
      void flushOfflineQueue().catch(() => {});
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if (isNativePlatform()) {
      void Network.getStatus().then((s) => {
        setOnline(s.connected);
        setConnectionType(s.connectionType);
      });
      const sub = Network.addListener("networkStatusChange", (s) => {
        setOnline(s.connected);
        setConnectionType(s.connectionType);
        if (s.connected) void flushOfflineQueue().catch(() => {});
      });
      removeNative = () => {
        void sub.then((h) => h.remove());
      };
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      removeNative?.();
    };
  }, []);

  const value = useMemo(
    () => ({ online, connectionType }),
    [online, connectionType]
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}
