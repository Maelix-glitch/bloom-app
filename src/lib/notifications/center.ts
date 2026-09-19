/**
 * The Notification Center's memory.
 *
 * Reminders used to fire once and vanish — miss the moment and the nudge was
 * gone forever. This per-device store keeps what Bloom said, so the bell can
 * show a history: every delivered reminder lands here (and, one day, every
 * push the edge function sends can too).
 *
 * Deliberately per-device, like the delivered-keys list: a notification is
 * something this browser showed you, not part of the synced record. Capped,
 * pruned, and event-driven so any open bell updates live.
 */

export type NoticeKind = "habit" | "period" | "fertile" | "evening" | "insight" | "system";

export interface Notice {
  id: string;
  /** ISO timestamp of delivery. */
  at: string;
  kind: NoticeKind;
  title: string;
  body: string;
  /** Where tapping it should land. */
  url: string;
  read: boolean;
}

const KEY = "bloom.notifications.v1";
export const CENTER_CHANGED = "bloom:center-changed";

/** A phone doesn't need more history than this. */
const MAX_NOTICES = 100;

const store = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function listNotices(): Notice[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is Notice =>
        !!n &&
        typeof n === "object" &&
        typeof (n as Notice).id === "string" &&
        typeof (n as Notice).title === "string",
    );
  } catch {
    return [];
  }
}

function save(notices: Notice[]): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(notices.slice(0, MAX_NOTICES)));
  } catch {
    /* full — history is expendable */
  }
  window.dispatchEvent(new Event(CENTER_CHANGED));
}

/** Record a delivered notification. Same key same day replaces, never stacks. */
export function recordNotice(entry: Omit<Notice, "id" | "at" | "read"> & { key?: string }): void {
  const notices = listNotices();
  const id = entry.key ?? `${entry.kind}:${Date.now()}`;
  const next: Notice = {
    id,
    at: new Date().toISOString(),
    kind: entry.kind,
    title: entry.title,
    body: entry.body,
    url: entry.url,
    read: false,
  };
  save([next, ...notices.filter((n) => n.id !== id)]);
}

export function markAllRead(): void {
  const notices = listNotices();
  if (notices.length === 0 || notices.every((n) => n.read)) return;
  save(notices.map((n) => ({ ...n, read: true })));
}

export function clearNotices(): void {
  save([]);
}

export const unreadCount = (notices: readonly Notice[] = listNotices()): number =>
  notices.filter((n) => !n.read).length;
