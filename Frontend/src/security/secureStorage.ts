import { Preferences } from "@capacitor/preferences";
import { isNativePlatform } from "../native/platform";

/**
 * Secure storage facade — Preferences on native (device-scoped), localStorage on web.
 * Ready to swap Preferences → @capacitor-community/secure-storage / EncryptedSharedPreferences
 * without changing call sites. Auth migration is intentional / separate.
 */
const PREFIX = "md.secure.";

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    const k = PREFIX + key;
    if (isNativePlatform()) {
      const { value } = await Preferences.get({ key: k });
      return value;
    }
    return localStorage.getItem(k);
  },

  async set(key: string, value: string): Promise<void> {
    const k = PREFIX + key;
    if (isNativePlatform()) {
      await Preferences.set({ key: k, value });
      return;
    }
    localStorage.setItem(k, value);
  },

  async remove(key: string): Promise<void> {
    const k = PREFIX + key;
    if (isNativePlatform()) {
      await Preferences.remove({ key: k });
      return;
    }
    localStorage.removeItem(k);
  },
};

/** Biometric / App Lock preference flags only — no credential storage. */
export const biometricReady = {
  FLAG_KEY: "biometric_enabled",
  async isEnabled(): Promise<boolean> {
    return (await secureStorage.get(this.FLAG_KEY)) === "1";
  },
  async setEnabled(on: boolean): Promise<void> {
    await secureStorage.set(this.FLAG_KEY, on ? "1" : "0");
  },
};

/**
 * Certificate pinning — architecture stub.
 * Wire OkHttp CertificatePinner in Android when releasing with pinned API hosts.
 */
export const certificatePinningReady = {
  documentedHosts: ["studentportal.mentorsdaily.com"] as const,
  status: "ready_for_native_config" as const,
};
