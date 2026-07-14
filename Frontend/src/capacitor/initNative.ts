import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Native-only bootstrapping. No-op on website — must stay safe for Vite web builds.
 */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Light icons on dark navy status bar (#0f172a)
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0f172a" });
  } catch (err) {
    console.warn("[capacitor] StatusBar init failed", err);
  }

  try {
    // Resize mode is iOS-only; Android uses resizeOnFullScreen from capacitor.config.ts
    if (Capacitor.getPlatform() === "ios") {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    }
  } catch (err) {
    console.warn("[capacitor] Keyboard init failed", err);
  }

  try {
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (err) {
    console.warn("[capacitor] App backButton listener failed", err);
  }

  try {
    // Hide splash once React has mounted; config also auto-hides as fallback
    await SplashScreen.hide();
  } catch (err) {
    console.warn("[capacitor] SplashScreen hide failed", err);
  }
}
