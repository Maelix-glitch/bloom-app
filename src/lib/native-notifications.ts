/**
 * M-239 · Native local notifications bridge (Capacitor only).
 *
 * The web reminder engine (src/hooks/useReminders.ts) delivers through the
 * Notification API and the service worker. Inside the bundled app neither
 * route is reliable: the service worker does not run under the capacitor
 * scheme, and iOS webviews never fire web notifications at all. This bridge
 * is the native route to the same job, through @capacitor/local-notifications.
 *
 * Every function here is a strict no-op on web (returns false / does
 * nothing), and the plugin is dynamic-imported so the web bundle never pays
 * for it. Nothing in this module asks for permission on its own: the caller
 * decides when asking is right (Bloom asks only when the person turns
 * reminders on, never on load).
 */

import { isNativePlatform } from "./native-shell";

export interface NativeNotificationInput {
  /** Stable dedupe key from the reminder engine; hashed to the plugin id. */
  key: string;
  title: string;
  body: string;
  /** Where tapping the notification should land, carried as extra data. */
  url?: string;
}

/**
 * The plugin wants a 32-bit integer id; the reminder engine works in string
 * keys ("habit:<id>:<date>" and friends). FNV-1a over the key, folded into
 * the positive int range, is stable across runs and devices, so scheduling
 * the same reminder twice replaces it instead of stacking a duplicate.
 */
export function notificationIdForKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 0x7fffffff;
}

async function loadPlugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

/**
 * Read the native permission state without asking. Resolves null on web
 * and on any failure, so callers can fall back to the web state.
 */
export async function checkNativeNotificationPermission(): Promise<
  "granted" | "denied" | "default" | null
> {
  if (!isNativePlatform()) return null;
  try {
    const status = await (await loadPlugin()).checkPermissions();
    if (status.display === "granted") return "granted";
    if (status.display === "denied") return "denied";
    return "default";
  } catch {
    return null;
  }
}

/**
 * Ask for notification permission on the native side. Resolves true only
 * when the person granted it. On web this is a no-op resolving false; the
 * web engine has its own permission flow.
 */
export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const status = await (await loadPlugin()).requestPermissions();
    return status.display === "granted";
  } catch {
    return false;
  }
}

/** Schedule one local notification for an exact local time. Native only. */
export async function scheduleNativeNotification(
  input: NativeNotificationInput & { at: Date },
): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    await (await loadPlugin()).schedule({
      notifications: [
        {
          id: notificationIdForKey(input.key),
          title: input.title,
          body: input.body,
          schedule: { at: input.at, allowWhileIdle: true },
          extra: input.url ? { url: input.url } : undefined,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Present a notification right now (a second out, so the OS treats it as a
 * scheduled delivery). This is the native equivalent of the web engine's
 * show(): the reminder came due while the app was open.
 */
export async function notifyNowNative(input: NativeNotificationInput): Promise<boolean> {
  return scheduleNativeNotification({ ...input, at: new Date(Date.now() + 1000) });
}

/** Cancel one scheduled notification by its reminder key. Native only. */
export async function cancelNativeNotification(key: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    await (await loadPlugin()).cancel({
      notifications: [{ id: notificationIdForKey(key) }],
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancel everything this app has scheduled. Native only. */
export async function cancelAllNativeNotifications(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const plugin = await loadPlugin();
    const pending = await plugin.getPending();
    if (pending.notifications.length === 0) return true;
    await plugin.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
    return true;
  } catch {
    return false;
  }
}
