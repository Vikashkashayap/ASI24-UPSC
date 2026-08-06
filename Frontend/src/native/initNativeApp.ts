import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { getPlatform, isNativePlatform } from "./platform";

let initialized = false;
let backHandlerAttached = false;

/**
 * Boot native chrome: status bar, keyboard, splash hide, pause/resume hooks.
 * Safe to call on web — no-ops when not native.
 */
export async function initNativeApp(): Promise<void> {
  if (initialized || !isNativePlatform()) return;
  initialized = true;

  document.documentElement.classList.add("capacitor-native", `platform-${getPlatform()}`);
  document.body.classList.add("capacitor-native");

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: "#0f1e3d" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* plugin unavailable in some emulators */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {
    /* optional */
  }

  CapApp.addListener("appStateChange", ({ isActive }) => {
    document.documentElement.dataset.appState = isActive ? "active" : "background";
    window.dispatchEvent(
      new CustomEvent("md:app-state", { detail: { isActive } })
    );
  });

  CapApp.addListener("pause", () => {
    window.dispatchEvent(new CustomEvent("md:app-pause"));
  });

  CapApp.addListener("resume", () => {
    window.dispatchEvent(new CustomEvent("md:app-resume"));
  });

  // Hide splash after first paint to avoid white flash
  requestAnimationFrame(() => {
    requestAnimationFrame(async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 280 });
      } catch {
        /* ignore */
      }
    });
  });

  // Soft safety: never leave splash forever
  window.setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }, 4000);

  if (Capacitor.getPlatform() === "android") {
    document.documentElement.style.setProperty("--android-nav-bar", "#0f1e3d");
  }
}

/**
 * Hardware back button: close overlays first, then history back, then exit on root.
 * Call once from a component that has access to navigate helpers.
 */
export function attachAndroidBackButton(handlers: {
  onCloseOverlay?: () => boolean;
  onNavigateBack?: () => boolean;
  canExitApp?: () => boolean;
}): () => void {
  if (!isNativePlatform() || backHandlerAttached) {
    return () => {};
  }
  backHandlerAttached = true;

  const sub = CapApp.addListener("backButton", ({ canGoBack }) => {
    if (handlers.onCloseOverlay?.()) return;
    if (handlers.onNavigateBack?.()) return;
    if (canGoBack) {
      window.history.back();
      return;
    }
    if (handlers.canExitApp?.() !== false) {
      CapApp.exitApp();
    }
  });

  return () => {
    backHandlerAttached = false;
    void sub.then((h) => h.remove());
  };
}
