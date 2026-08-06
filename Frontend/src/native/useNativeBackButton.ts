import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { attachAndroidBackButton } from "./initNativeApp";
import { isNativePlatform } from "./platform";

const ROOT_PATHS = new Set(["/home", "/login", "/", "/admin/dashboard", "/mentor-dashboard"]);

/**
 * Capacitor hardware back: closes drawer via event, else history.back, else exit on root.
 */
export function useNativeBackButton(options?: {
  isOverlayOpen?: boolean;
  onCloseOverlay?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOverlayOpen = options?.isOverlayOpen;
  const onCloseOverlay = options?.onCloseOverlay;

  useEffect(() => {
    if (!isNativePlatform()) return;

    return attachAndroidBackButton({
      onCloseOverlay: () => {
        if (isOverlayOpen && onCloseOverlay) {
          onCloseOverlay();
          return true;
        }
        // Allow MobileDrawer / sheets to handle via custom event
        const ev = new CustomEvent("md:android-back", { cancelable: true });
        const prevented = !window.dispatchEvent(ev) || ev.defaultPrevented;
        return prevented;
      },
      onNavigateBack: () => {
        if (ROOT_PATHS.has(location.pathname)) return false;
        navigate(-1);
        return true;
      },
      canExitApp: () => ROOT_PATHS.has(location.pathname),
    });
  }, [location.pathname, navigate, isOverlayOpen, onCloseOverlay]);
}
