/**
 * The pools Bloom speaks from.
 *
 * Rules for every line here:
 *   · short — a phone is narrow and a person is busy;
 *   · plain — no jargon, no exclamation-mark cheer, no shame;
 *   · honest — never claims more than the record supports;
 *   · varied — each pool has enough options that a daily user won't loop.
 */

import { pick, pickStable, type Daypart } from "./messages";

/* ------------------------------- greetings -------------------------------- */

const GREETING: Record<Daypart, string[]> = {
  night: ["Still up", "Late one", "Quiet hours", "The small hours", "Night owl"],
  morning: ["Good morning", "Morning", "A new day", "Early on", "Fresh start"],
  afternoon: ["Good afternoon", "Afternoon", "Midway", "Halfway through", "Good day"],
  evening: ["Good evening", "Evening", "Winding down", "Day's end", "Settling in"],
};

/** Greeting for a daypart, stable for the whole hour so it doesn't flicker. */
export function greeting(part: Daypart, seed?: string): string {
  return pickStable(GREETING[part], seed ?? `${part}-${new Date().getHours()}`);
}

/* --------------------------------- saves ---------------------------------- */

export const SAVED = [
  "Saved.",
  "Logged.",
  "Noted.",
  "That's in.",
  "Kept.",
  "Down on the record.",
  "Added.",
];

export const SAVED_WARM = [
  "Saved — that's today accounted for.",
  "Logged. The numbers below just moved.",
  "Noted. Everything recalculated.",
  "That's in, and it counts.",
  "Kept. Your record is a little fuller.",
];

export const UNDONE = ["Taken back.", "Undone.", "Put back.", "Reversed.", "As you were."];

export const DELETED = ["Removed.", "Deleted.", "Gone.", "Taken out.", "Cleared."];

/* -------------------------------- empty ----------------------------------- */

export const EMPTY_DAY = [
  "Nothing logged today — yet.",
  "Today is still blank.",
  "A clean page for today.",
  "Nothing down for today so far.",
  "Today hasn't been written on yet.",
];

export const FIRST_ENTRY = [
  "This is where it starts.",
  "One entry is enough to begin.",
  "The first one is the hardest.",
  "Everything below is built from this.",
  "Start here — the rest follows.",
];

/* ------------------------------- encourage -------------------------------- */

export const STREAK_KEPT = [
  "Streak intact.",
  "Kept the run going.",
  "Still going.",
  "Chain unbroken.",
  "That's another day.",
];

export const STREAK_BROKEN = [
  "The run ended — starting again is the whole skill.",
  "A missed day is data, not failure.",
  "Streaks break. The record stays.",
  "One gap doesn't undo the rest.",
  "Back to day one, with everything you learned.",
];

/* --------------------------------- errors --------------------------------- */

export const OFFLINE = [
  "You're offline — this is saved here and will sync when you're back.",
  "No connection. Kept on this device for now.",
  "Offline. Nothing is lost; it uploads when you reconnect.",
  "Saved locally — the account catches up later.",
];

export const RETRY = [
  "That didn't go through. Try again?",
  "Couldn't save that just now.",
  "Something got in the way. One more go?",
  "No luck that time — try again.",
];

/* -------------------------------- loading --------------------------------- */

export const LOADING = [
  "Reading your record…",
  "Gathering the days…",
  "One moment…",
  "Adding it up…",
  "Pulling the numbers…",
];

/* -------------------------------- helpers --------------------------------- */

/** A save confirmation that won't repeat. */
export const saidSaved = (warm = false): string =>
  pick(warm ? "saved-warm" : "saved", warm ? SAVED_WARM : SAVED);

export const saidUndone = (): string => pick("undone", UNDONE);
export const saidDeleted = (): string => pick("deleted", DELETED);
export const saidOffline = (): string => pick("offline", OFFLINE);
export const saidRetry = (): string => pick("retry", RETRY);
export const saidLoading = (): string => pick("loading", LOADING);

/** Stable per day: the same empty-state line all day, a new one tomorrow. */
export const saidEmptyDay = (today: string): string => pickStable(EMPTY_DAY, today);
