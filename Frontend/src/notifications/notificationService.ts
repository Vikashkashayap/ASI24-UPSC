/**
 * Push notification architecture for Capacitor.
 * Register when FCM / APNs credentials are configured — no backend changes here.
 */
import { PushNotifications } from "@capacitor/push-notifications";
import { isNativePlatform } from "../native/platform";

export type MdNotification = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
};

const CENTER_KEY = "md.notifications.center";

function loadCenter(): MdNotification[] {
  try {
    const raw = localStorage.getItem(CENTER_KEY);
    return raw ? (JSON.parse(raw) as MdNotification[]) : [];
  } catch {
    return [];
  }
}

function saveCenter(items: MdNotification[]) {
  localStorage.setItem(CENTER_KEY, JSON.stringify(items.slice(0, 100)));
}

export const notificationCenter = {
  list(): MdNotification[] {
    return loadCenter();
  },
  unreadCount(): number {
    return loadCenter().filter((n) => !n.read).length;
  },
  markRead(id: string) {
    const next = loadCenter().map((n) => (n.id === id ? { ...n, read: true } : n));
    saveCenter(next);
  },
  markAllRead() {
    saveCenter(loadCenter().map((n) => ({ ...n, read: true })));
  },
  push(n: Omit<MdNotification, "read" | "createdAt"> & { read?: boolean }) {
    const items = loadCenter();
    items.unshift({
      ...n,
      read: n.read ?? false,
      createdAt: new Date().toISOString(),
    });
    saveCenter(items);
    window.dispatchEvent(new CustomEvent("md:notifications-updated"));
  },
};

export async function registerPushNotifications(): Promise<{ granted: boolean }> {
  if (!isNativePlatform()) return { granted: false };

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return { granted: false };

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    window.dispatchEvent(
      new CustomEvent("md:push-token", { detail: { token: token.value } })
    );
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    notificationCenter.push({
      id: notification.id || `n_${Date.now()}`,
      title: notification.title || "MentorsDaily",
      body: notification.body || "",
      data: (notification.data as Record<string, string>) || undefined,
    });
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data = action.notification.data as Record<string, string> | undefined;
    const path = data?.path || data?.url;
    if (path && typeof path === "string" && path.startsWith("/")) {
      window.dispatchEvent(new CustomEvent("md:deep-link", { detail: { path } }));
    }
  });

  return { granted: true };
}
