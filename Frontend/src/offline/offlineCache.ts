import { Preferences } from "@capacitor/preferences";
import { isNativePlatform } from "../native/platform";
import type { OfflineEnvelope, OfflineKey } from "./types";

/**
 * Cross-platform KV store: Capacitor Preferences on native, localStorage on web.
 * Architecture-ready for swapping Preferences → SecureStorage / encrypted prefs.
 */
async function getRaw(key: string): Promise<string | null> {
  if (isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function setRaw(key: string, value: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

export async function readOfflineCache<T>(key: OfflineKey): Promise<OfflineEnvelope<T> | null> {
  try {
    const raw = await getRaw(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineEnvelope<T>;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      await removeRaw(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeOfflineCache<T>(
  key: OfflineKey,
  data: T,
  ttlMs?: number
): Promise<void> {
  const envelope: OfflineEnvelope<T> = {
    version: 1,
    savedAt: new Date().toISOString(),
    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : undefined,
    data,
  };
  await setRaw(key, JSON.stringify(envelope));
}

export async function clearOfflineCache(key: OfflineKey): Promise<void> {
  await removeRaw(key);
}

export async function clearAllOfflineCaches(keys: OfflineKey[]): Promise<void> {
  await Promise.all(keys.map((k) => removeRaw(k)));
}
