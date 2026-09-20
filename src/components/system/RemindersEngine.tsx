/**
 * RemindersEngine — the delivery half of reminders, mounted once at the root.
 *
 * `useReminders` is two things: the settings store (read by the profile
 * settings and the notification sheet's "Due now") and the delivery loop that
 * fires due reminders through the browser Notification API and records them
 * for the bell. That loop must run from boot on every route — it used to ride
 * along inside the notification sheet, which happened to be mounted (closed)
 * in every header, until the sheet started mounting lazily on first open and
 * deliveries silently stopped everywhere but Profile.
 *
 * So the engine lives here now, explicitly: one instance, always on, renders
 * nothing. The sheet and the settings page keep their own hook instances for
 * readings and controls; overlapping delivery attempts collapse (same
 * Notification tag, same notice key), exactly as the two header sheets did
 * before.
 */
import { useReminders } from "@/hooks/useReminders";

export function RemindersEngine() {
  useReminders();
  return null;
}
