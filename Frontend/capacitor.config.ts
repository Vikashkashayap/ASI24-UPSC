import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for MentorsDaily Android wrapping the Vite SPA.
 * webDir must point at Vite's production output. Website deploy is unchanged.
 */
const config: CapacitorConfig = {
  appId: "com.mentorsdaily.studentportal",
  appName: "MentorsDaily",
  webDir: "dist",
  server: {
    // https://localhost origin — required for secure cookies / Web APIs in WebView
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f172a",
  },
  plugins: {
    // Native HTTP bridge — Android WebView can call the production API without Backend CORS changes
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
