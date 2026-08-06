import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MentorsDaily — MD Student Portal
 * Capacitor 8 production config (Android first, iOS-ready).
 *
 * Live shell: the WebView loads the hosted SPA so web deploys appear in the app
 * without rebuilding the APK. Override for local phone testing:
 *   CAP_SERVER_URL=http://192.168.x.x:5173 npm run android:sync
 */
const LIVE_ORIGIN = "https://studentportal.mentorsdaily.com";
const serverUrl = (process.env.CAP_SERVER_URL || LIVE_ORIGIN).replace(/\/$/, "");
const useCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.mentorsdaily.studentportal",
  appName: "MD Student Portal",
  // Still required by Capacitor; offline splash / fallback assets.
  webDir: "dist",
  server: {
    // App opens this URL instead of bundled index.html → web deploy = app update
    url: serverUrl,
    cleartext: useCleartext,
    androidScheme: "https",
    allowNavigation: [
      "studentportal.mentorsdaily.com",
      "*.mentorsdaily.com",
      "localhost",
      "127.0.0.1",
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
    allowMixedContent: useCleartext,
    backgroundColor: "#0f1e3d",
    webContentsDebuggingEnabled: useCleartext,
  },
};

export default config;
