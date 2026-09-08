/**
 * B4 · The browser half of reminders.
 *
 * Permission is asked for only when the person turns reminders on — never on
 * page load. Once granted, the app checks every minute (and whenever it comes
 * back to the foreground) whether anything in `dueReminders` has come due, and
 * shows it through the service worker when there is one (installed iOS PWAs
 * only allow that route) or through the Notification constructor otherwise.
 *
 * The settings live in the synced prefs document, so turning reminders on
 * follows the account; the "already delivered" list is deliberately per device.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHabits } from "@/hooks/useHabits";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import { getPref, PREFS_CHANGED, setPref } from "@/lib/prefs";
import {
  DEFAULT_REMINDERS,
  loadDelivered,
  parseReminderSettings,
  pendingReminders,
  REMINDERS_PREF,
  saveDelivered,
  type Reminder,
  type ReminderSettings,
} from "@/lib/reminders/schedule";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

const readSettings = (): ReminderSettings =>
  getPref<ReminderSettings>(REMINDERS_PREF, parseReminderSettings, DEFAULT_REMINDERS);

const nowTime = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function permissionOf(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

async function show(reminder: Reminder): Promise<void> {
  const options: NotificationOptions = {
    body: reminder.body,
    tag: reminder.key,
    icon: "/bloom/icons/icon-192.png",
    data: { url: reminder.url },
  };
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      /* the worker owns it — the only route that works in an installed iOS PWA */
      if (reg.active) {
        reg.active.postMessage({
          type: "bloom-notify",
          title: reminder.title,
          body: reminder.body,
          tag: reminder.key,
          url: reminder.url,
        });
        return;
      }
      await reg.showNotification(reminder.title, options);
      return;
    }
  }
  new Notification(reminder.title, options);
}

export interface RemindersStore {
  settings: ReminderSettings;
  permission: PermissionState;
  /** Turn the whole thing on — asks for permission first. */
  enable: () => Promise<boolean>;
  disable: () => void;
  set: <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) => void;
  /** What would go out right now — used by the settings preview. */
  preview: Reminder[];
  /** Fire one immediately so the person can see what they look like. */
  test: () => Promise<void>;
}

export function useReminders(): RemindersStore {
  const habitsStore = useHabits();
  const cycle = usePeriodLog();
  const trackers = useTrackers();

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [tick, setTick] = useState(0);
  const delivered = useRef<string[]>([]);

  useEffect(() => {
    const sync = () => setSettings(readSettings());
    sync();
    setPermission(permissionOf());
    delivered.current = loadDelivered();
    window.addEventListener(PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* a minute is plenty — reminders are dated to the minute, not the second */
  useEffect(() => {
    if (!settings.enabled) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    const wake = () => setTick((t) => t + 1);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [settings.enabled]);

  const today = cycle.today;

  const loggedSomethingToday = useMemo(() => {
    const habitToday = habitsStore.logs.some((l) => l.date === today);
    const trackerToday = trackers.days.some((d) => d.date === today);
    const cycleToday = cycle.days.some((d) => d.date === today);
    return habitToday || trackerToday || cycleToday;
  }, [habitsStore.logs, trackers.days, cycle.days, today]);

  const input = useMemo(
    () => ({
      today,
      now: nowTime(),
      settings,
      habits: habitsStore.todayHabits.map((h) => ({ habit: h, done: h.done })),
      cycle: {
        mode: cycle.mode,
        nextStart: cycle.analysis.nextStart,
        daysLate: cycle.analysis.isLate ? cycle.analysis.lateBy : null,
        fertileStart: cycle.analysis.fertileStart,
      },
      loggedSomethingToday,
    }),
    // `tick` is intentionally a dependency: it re-reads the wall clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      today,
      settings,
      habitsStore.todayHabits,
      cycle.mode,
      cycle.analysis,
      loggedSomethingToday,
      tick,
    ],
  );

  const preview = useMemo(() => pendingReminders(input, []), [input]);

  /* deliver */
  useEffect(() => {
    if (!settings.enabled || permission !== "granted") return;
    const due = pendingReminders(input, delivered.current);
    if (due.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const reminder of due) {
        if (cancelled) return;
        try {
          await show(reminder);
          delivered.current = [...delivered.current, reminder.key];
        } catch {
          /* the browser refused this one — try again next tick */
        }
      }
      saveDelivered(delivered.current, input.today);
    })();
    return () => {
      cancelled = true;
    };
  }, [input, settings.enabled, permission]);

  const set = useCallback(
    <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) => {
      const next = { ...readSettings(), [key]: value };
      setPref(REMINDERS_PREF, next);
      setSettings(next);
    },
    [],
  );

  const enable = useCallback(async () => {
    if (permissionOf() === "unsupported") return false;
    let state = permissionOf();
    if (state === "default") {
      state = (await Notification.requestPermission()) as PermissionState;
      setPermission(state);
    }
    if (state !== "granted") return false;
    set("enabled", true);
    return true;
  }, [set]);

  const disable = useCallback(() => set("enabled", false), [set]);

  const test = useCallback(async () => {
    if (permissionOf() !== "granted") return;
    await show({
      key: `test:${Date.now()}`,
      kind: "evening",
      title: "This is what a Bloom reminder looks like",
      body: "You can turn any of these off at any time.",
      at: nowTime(),
      url: "/",
    });
  }, []);

  return { settings, permission, enable, disable, set, preview, test };
}
