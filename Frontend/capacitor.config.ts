import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MentorsDaily — MD Student Portal
 * Capacitor 8 production config (Android first, iOS-ready).
 */
const config: CapacitorConfig = {
  appId: "com.mentorsdaily.studentportal",
  appName: "MD Student Portal",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // Cleartext only for local debug; production uses HTTPS API.
    allowNavigation: [
      "studentportal.mentorsdaily.com",
      "*.mentorsdaily.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#0f1e3d",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f1e3d",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f1e3d",
    webContentsDebuggingEnabled: false,
  },
};

export default config;
