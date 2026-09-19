/**
 * Web Push — the "app is closed" half of notifications.
 *
 * The in-app scheduler (`useReminders`) can only fire while a Bloom tab is
 * alive. Real push wakes the phone through the service worker: the browser
 * hands us a subscription (endpoint + keys), we store it in
 * `push_subscriptions`, and the `push-send` edge function delivers due
 * reminders to it on a cron.
 *
 * Everything here is best-effort and quiet. Without a VAPID public key in
 * `VITE_VAPID_PUBLIC_KEY`, without Supabase, or signed out, none of this runs
 * and the in-app scheduler simply remains the whole story — exactly as it was
 * before push existed.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined) ?? "";

export type PushSubscribeResult =
  "subscribed" | "unsupported" | "no-key" | "denied" | "no-session" | "failed";

/** True when the build ships a VAPID public key, i.e. push can exist at all. */
export const pushConfigured = (): boolean => VAPID_PUBLIC_KEY.trim().length > 0;

/* The applicationServerKey wants raw bytes from url-safe base64. */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Subscribe this device to Bloom push and store the subscription on the
 * account. Safe to call repeatedly — the upsert is keyed on the endpoint.
 */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (!pushConfigured()) return "no-key";
  if (Notification.permission !== "granted") return "denied";
  if (!hasSupabaseConfig) return "no-session";

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return "no-session";

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return "failed";

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const keys = subscription.toJSON().keys as { p256dh?: string; auth?: string } | undefined;
    if (!keys?.p256dh || !keys?.auth) return "failed";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) return "failed";
    return "subscribed";
  } catch {
    /* push must never be able to break the reminders toggle */
    return "failed";
  }
}

/** Drop the browser subscription and the stored row for this device. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    if (hasSupabaseConfig) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    }
  } catch {
    /* leaving an orphan row is harmless: sends to it 410 and get cleaned */
  }
}
